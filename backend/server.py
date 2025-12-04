from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx
import base64
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ===== Models =====

class RoleConfig(BaseModel):
    model: Optional[str] = None
    enabled: bool = True

class Message(BaseModel):
    role: str
    content: str
    model: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    models: List[str] = []
    roles: Optional[Dict[str, Any]] = None
    api_key: str
    conversation_history: Optional[List[Message]] = []
    screenshot_base64: Optional[str] = None

class ModelResponse(BaseModel):
    model: str
    content: str
    image_url: Optional[str] = None  # For designer-generated images
    metadata: Optional[Dict[str, Any]] = {}

class ChatResponse(BaseModel):
    responses: List[ModelResponse]

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    files: Dict[str, str]
    messages: List[Dict[str, Any]] = []
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ===== OpenRouter =====

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Image generation models
IMAGE_GEN_MODELS = [
    'google/gemini-2.5-flash-preview-image-generation',
    'google/gemini-2.0-flash-exp:free',
    'google/gemini-2.5-flash-image-preview',
]

def get_name(model: str) -> str:
    name = model.split('/')[-1]
    names = {
        'claude-3.5-sonnet': 'Claude Sonnet',
        'claude-3-haiku': 'Claude Haiku',
        'gpt-4o': 'GPT-4o',
        'gpt-4o-mini': 'GPT-4o Mini',
        'gemini-2.0-flash-exp:free': 'Gemini Flash',
        'gemini-2.5-flash-preview-image-generation': 'Nano Banana',
    }
    return names.get(name, name[:20])

async def call_model(model: str, messages: List[Dict], api_key: str, max_tokens: int = 4000) -> Dict:
    """Call a text model via OpenRouter."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://codeagent.app",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=120.0) as http:
        response = await http.post(
            OPENROUTER_API_URL,
            headers=headers,
            json={"model": model, "messages": messages, "max_tokens": max_tokens}
        )
        response.raise_for_status()
        data = response.json()
        return {
            "model": model,
            "content": data["choices"][0]["message"]["content"],
            "metadata": {"usage": data.get("usage", {})}
        }

async def generate_design_image(model: str, prompt: str, api_key: str) -> Dict:
    """
    Generate a design image using OpenRouter's image generation models.
    Returns the image URL or base64 data.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://codeagent.app",
        "Content-Type": "application/json"
    }
    
    # Design-specific prompt
    design_prompt = f"""Create a clean, modern UI/UX design mockup for: {prompt}

Style: Clean web design, modern interface, professional look.
Show: The complete UI layout as it would appear in a browser.
Format: Flat design, clear elements, readable text."""
    
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": design_prompt}],
        "modalities": ["image", "text"],  # Enable image generation
        "max_tokens": 1000
    }
    
    logger.info(f"[Designer] Generating image with {model}...")
    
    async with httpx.AsyncClient(timeout=180.0) as http:
        response = await http.post(
            OPENROUTER_API_URL,
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        data = response.json()
        
        # Parse response - may contain image URL or inline image
        content = data["choices"][0]["message"]["content"]
        image_url = None
        
        # Check if content contains image parts
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict):
                    if part.get("type") == "image_url":
                        image_url = part.get("image_url", {}).get("url")
                    elif part.get("type") == "image":
                        # Base64 image
                        image_url = f"data:image/png;base64,{part.get('data', '')}"
        elif isinstance(content, str):
            # Check for markdown image or URL
            url_match = re.search(r'!\[.*?\]\((https?://[^)]+)\)', content)
            if url_match:
                image_url = url_match.group(1)
            # Check for inline base64
            base64_match = re.search(r'data:image/[^;]+;base64,([A-Za-z0-9+/=]+)', content)
            if base64_match:
                image_url = base64_match.group(0)
        
        # Also check for 'inline_data' in response structure
        message = data["choices"][0]["message"]
        if "parts" in message:
            for part in message["parts"]:
                if "inline_data" in part:
                    mime = part["inline_data"].get("mime_type", "image/png")
                    b64 = part["inline_data"].get("data", "")
                    image_url = f"data:{mime};base64,{b64}"
        
        text_content = content if isinstance(content, str) else "Design generated"
        
        return {
            "model": model,
            "content": text_content,
            "image_url": image_url,
            "metadata": {"phase": "designer", "has_image": image_url is not None}
        }

async def call_vision_model(model: str, prompt: str, image_url: str, api_key: str) -> Dict:
    """Call a vision model with an image (URL or base64)."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://codeagent.app",
        "Content-Type": "application/json"
    }
    
    # Build message with image
    content = [
        {"type": "text", "text": prompt}
    ]
    
    if image_url.startswith("data:"):
        content.append({"type": "image_url", "image_url": {"url": image_url}})
    else:
        content.append({"type": "image_url", "image_url": {"url": image_url}})
    
    messages = [{"role": "user", "content": content}]
    
    async with httpx.AsyncClient(timeout=120.0) as http:
        response = await http.post(
            OPENROUTER_API_URL,
            headers=headers,
            json={"model": model, "messages": messages, "max_tokens": 4000}
        )
        response.raise_for_status()
        data = response.json()
        return {
            "model": model,
            "content": data["choices"][0]["message"]["content"],
            "metadata": {"usage": data.get("usage", {})}
        }

# ===== Prompts =====

PLANNER_PROMPT = """You are a senior software architect. Create a brief, clear plan for the task.

Respond with:
1. What we're building (1 sentence)
2. HTML structure needed
3. CSS approach (layout, colors, animations)
4. JavaScript logic required

Keep it to 5-8 bullet points max. Be specific and actionable."""

CODER_WITH_DESIGN_PROMPT = """You are an expert frontend developer. You have a DESIGN IMAGE to follow.

CRITICAL: Replicate the design EXACTLY as shown in the image!
- Match colors precisely
- Match layout and spacing
- Match fonts and sizes
- Match all visual elements

Code format:
```index.html
<complete HTML>
```
```style.css
<complete CSS>
```
```script.js
<complete JS>
```

Make it pixel-perfect to the design!"""

CODER_PROMPT = """You are an expert frontend developer. Create WORKING, PIXEL-PERFECT code.

RULES:
1. Use PROPER CSS positioning (flexbox/grid for layouts)
2. For clocks: transform-origin: bottom center; position: absolute;
3. Always set explicit width/height

Code format:
```index.html
<complete HTML>
```
```style.css
<complete CSS>
```
```script.js
<complete JS>
```"""

EYES_PROMPT = """You are a visual QA expert. Compare the screenshot with what was requested.

Check:
1. LAYOUT: Are elements properly aligned?
2. OVERLAP: Any elements overlapping incorrectly?
3. COLORS: Do colors match the design?
4. SPACING: Is spacing correct?

Respond with:
- "✅ Looks good!" if matches design
- "👁️ Issues found:" + specific problems"""

DEBUGGER_PROMPT = """You are a code reviewer. Check for:
1. CSS BUGS: Wrong positioning, missing properties
2. JS BUGS: Logic errors, wrong calculations
3. HTML BUGS: Missing elements, wrong structure

Respond with:
- "✅ Code correct" if no issues
- "🔧 Issues:" + bugs + "Fix:" + corrected code"""

# ===== API Routes =====

@api_router.get("/")
async def root():
    return {"message": "CodeAgent API with Image Generation"}

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.api_key:
        raise HTTPException(status_code=400, detail="API key required")
    
    responses = []
    roles = request.roles or {}
    
    planner = roles.get('planner', {})
    designer = roles.get('designer', {})
    coder = roles.get('coder', {})
    eyes = roles.get('eyes', {})
    debugger = roles.get('debugger', {})
    
    # Fallback to legacy models
    if not coder.get('model') and request.models:
        coder = {'model': request.models[0], 'enabled': True}
        if len(request.models) > 1:
            debugger = {'model': request.models[1], 'enabled': True}
    
    if not coder.get('model'):
        raise HTTPException(status_code=400, detail="Coder role must have a model")
    
    is_new = len(request.conversation_history) == 0
    design_image_url = None
    
    if is_new:
        plan_text = ""
        
        # === STEP 1: PLANNER ===
        if planner.get('enabled') and planner.get('model'):
            logger.info(f"[🎯 Planner] {get_name(planner['model'])}")
            try:
                result = await call_model(
                    planner['model'],
                    [{"role": "system", "content": PLANNER_PROMPT}, {"role": "user", "content": request.message}],
                    request.api_key, max_tokens=800
                )
                plan_text = result['content']
                responses.append(ModelResponse(
                    model=planner['model'],
                    content=plan_text,
                    metadata={"phase": "planner", "role": "Planner"}
                ))
            except Exception as e:
                logger.error(f"Planner error: {e}")
        
        # === STEP 2: DESIGNER (Image Generation) ===
        if designer.get('enabled') and designer.get('model'):
            logger.info(f"[🎨 Designer] {get_name(designer['model'])} - generating image...")
            try:
                result = await generate_design_image(
                    designer['model'],
                    request.message,
                    request.api_key
                )
                design_image_url = result.get('image_url')
                
                responses.append(ModelResponse(
                    model=designer['model'],
                    content=result['content'] + ("\n\n🖼️ Design image generated!" if design_image_url else ""),
                    image_url=design_image_url,
                    metadata={"phase": "designer", "role": "Designer", "has_image": bool(design_image_url)}
                ))
                
                if design_image_url:
                    logger.info(f"[🎨 Designer] Image generated successfully!")
                else:
                    logger.warning(f"[🎨 Designer] No image in response")
                    
            except Exception as e:
                logger.error(f"Designer error: {e}")
                responses.append(ModelResponse(
                    model=designer['model'],
                    content=f"⚠️ Could not generate design image: {str(e)[:100]}",
                    metadata={"phase": "designer", "error": str(e)}
                ))
        
        # === STEP 3: CODER ===
        logger.info(f"[💻 Coder] {get_name(coder['model'])}")
        
        if design_image_url:
            # Coder can SEE the design image!
            logger.info(f"[💻 Coder] Using design image as reference...")
            try:
                coder_prompt = f"{CODER_WITH_DESIGN_PROMPT}\n\nBuild this: {request.message}"
                if plan_text:
                    coder_prompt += f"\n\nPlan:\n{plan_text}"
                
                result = await call_vision_model(
                    coder['model'],
                    coder_prompt,
                    design_image_url,
                    request.api_key
                )
                code_content = result['content']
                responses.append(ModelResponse(
                    model=coder['model'],
                    content=code_content,
                    metadata={"phase": "coder", "role": "Coder", "used_design": True}
                ))
            except Exception as e:
                logger.error(f"Coder with vision error: {e}, falling back to text")
                # Fallback to text-only
                result = await call_model(
                    coder['model'],
                    [{"role": "system", "content": CODER_PROMPT}, {"role": "user", "content": request.message}],
                    request.api_key, max_tokens=4000
                )
                code_content = result['content']
                responses.append(ModelResponse(
                    model=coder['model'],
                    content=code_content,
                    metadata={"phase": "coder", "role": "Coder"}
                ))
        else:
            # No design image - text only
            coder_prompt = f"{CODER_PROMPT}\n\nBuild this: {request.message}"
            if plan_text:
                coder_prompt += f"\n\nPlan:\n{plan_text}"
            
            try:
                result = await call_model(
                    coder['model'],
                    [{"role": "system", "content": CODER_PROMPT}, {"role": "user", "content": coder_prompt}],
                    request.api_key, max_tokens=4000
                )
                code_content = result['content']
                responses.append(ModelResponse(
                    model=coder['model'],
                    content=code_content,
                    metadata={"phase": "coder", "role": "Coder"}
                ))
            except Exception as e:
                return ChatResponse(responses=[ModelResponse(
                    model=coder['model'], content=f"❌ Error: {str(e)}", metadata={}
                )])
        
        # === STEP 4: EYES (Visual Review) ===
        if eyes.get('enabled') and eyes.get('model') and request.screenshot_base64:
            logger.info(f"[👁️ Eyes] {get_name(eyes['model'])} reviewing...")
            try:
                eyes_prompt = EYES_PROMPT + f"\n\nThis should be: {request.message}"
                if design_image_url:
                    eyes_prompt += "\n\nCompare with the original design image."
                
                result = await call_vision_model(
                    eyes['model'],
                    eyes_prompt,
                    f"data:image/png;base64,{request.screenshot_base64}",
                    request.api_key
                )
                responses.append(ModelResponse(
                    model=eyes['model'],
                    content=result['content'],
                    metadata={"phase": "eyes", "role": "Eyes"}
                ))
            except Exception as e:
                logger.error(f"Eyes error: {e}")
        
        # === STEP 5: DEBUGGER ===
        if debugger.get('enabled') and debugger.get('model'):
            logger.info(f"[🔧 Debugger] {get_name(debugger['model'])}")
            try:
                debug_prompt = f"{DEBUGGER_PROMPT}\n\nTask: {request.message}\n\nCode:\n{code_content[:3000]}"
                
                result = await call_model(
                    debugger['model'],
                    [{"role": "user", "content": debug_prompt}],
                    request.api_key, max_tokens=1500
                )
                debug_result = result['content']
                responses.append(ModelResponse(
                    model=debugger['model'],
                    content=debug_result,
                    metadata={"phase": "debugger", "role": "Debugger"}
                ))
                
                # Fix if issues found
                if '🔧' in debug_result or 'issue' in debug_result.lower():
                    logger.info(f"[💻 Coder] Fixing issues...")
                    fix_prompt = f"Fix these issues:\n{debug_result}\n\nProvide COMPLETE corrected code."
                    try:
                        fix_result = await call_model(
                            coder['model'],
                            [{"role": "assistant", "content": code_content}, {"role": "user", "content": fix_prompt}],
                            request.api_key, max_tokens=4000
                        )
                        responses.append(ModelResponse(
                            model=coder['model'],
                            content=f"🔧 Fixed:\n\n{fix_result['content']}",
                            metadata={"phase": "fix", "role": "Coder"}
                        ))
                    except Exception as e:
                        logger.error(f"Fix error: {e}")
                        
            except Exception as e:
                logger.error(f"Debugger error: {e}")
    
    else:
        # Follow-up
        messages = [{"role": "system", "content": CODER_PROMPT}]
        for msg in request.conversation_history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": request.message})
        
        try:
            result = await call_model(coder['model'], messages, request.api_key)
            responses.append(ModelResponse(**result))
        except Exception as e:
            responses.append(ModelResponse(model=coder['model'], content=f"❌ Error: {str(e)}", metadata={}))
    
    return ChatResponse(responses=responses)


@api_router.post("/generate-design")
async def generate_design(prompt: str, model: str, api_key: str):
    """Standalone endpoint to generate a design image."""
    try:
        result = await generate_design_image(model, prompt, api_key)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/ping-model")
async def ping_model(model: str, api_key: str):
    try:
        result = await call_model(model, [{"role": "user", "content": "Say OK"}], api_key, max_tokens=10)
        return {"status": "working", "model": model}
    except Exception as e:
        return {"status": "unavailable", "model": model, "error": str(e)[:100]}

@api_router.get("/models")
async def get_models(x_api_key: str = None):
    if not x_api_key:
        return {"data": []}
    try:
        async with httpx.AsyncClient(timeout=30.0) as http:
            resp = await http.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {x_api_key}"}
            )
            return resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/projects", response_model=Project)
async def save_project(project: Project):
    doc = project.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.projects.update_one({"name": project.name}, {"$set": doc}, upsert=True)
    return project

@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    for p in projects:
        if isinstance(p.get('timestamp'), str):
            p['timestamp'] = datetime.fromisoformat(p['timestamp'])
    return projects

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
