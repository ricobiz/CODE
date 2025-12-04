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

class RolesConfig(BaseModel):
    planner: Optional[RoleConfig] = None
    designer: Optional[RoleConfig] = None
    coder: Optional[RoleConfig] = None
    eyes: Optional[RoleConfig] = None
    debugger: Optional[RoleConfig] = None

class Message(BaseModel):
    role: str
    content: str
    model: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    models: List[str] = []  # Legacy support
    roles: Optional[Dict[str, Any]] = None  # New roles config
    api_key: str
    conversation_history: Optional[List[Message]] = []
    screenshot_base64: Optional[str] = None  # For vision review

class ModelResponse(BaseModel):
    model: str
    content: str
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

def get_name(model: str) -> str:
    name = model.split('/')[-1]
    names = {
        'claude-3.5-sonnet': 'Claude Sonnet',
        'claude-3-haiku': 'Claude Haiku',
        'gpt-4o': 'GPT-4o',
        'gpt-4o-mini': 'GPT-4o Mini',
        'gemini-2.0-flash-exp:free': 'Gemini Flash',
        'gemini-pro-vision': 'Gemini Vision',
    }
    return names.get(name, name[:20])

async def call_model(model: str, messages: List[Dict], api_key: str, max_tokens: int = 4000) -> Dict:
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

async def call_vision_model(model: str, prompt: str, image_base64: str, api_key: str) -> Dict:
    """Call a vision model with an image."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://codeagent.app",
        "Content-Type": "application/json"
    }
    
    messages = [{
        "role": "user",
        "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_base64}"}}
        ]
    }]
    
    async with httpx.AsyncClient(timeout=120.0) as http:
        response = await http.post(
            OPENROUTER_API_URL,
            headers=headers,
            json={"model": model, "messages": messages, "max_tokens": 1500}
        )
        response.raise_for_status()
        data = response.json()
        return {
            "model": model,
            "content": data["choices"][0]["message"]["content"],
            "metadata": {"usage": data.get("usage", {}), "phase": "eyes"}
        }

# ===== Prompts =====

PLANNER_PROMPT = """You are a senior software architect. Create a brief, clear plan for the task.

Respond with:
1. What we're building (1 sentence)
2. HTML structure needed
3. CSS approach (layout, colors, animations)
4. JavaScript logic required

Keep it to 5-8 bullet points max. Be specific and actionable."""

DESIGNER_PROMPT = """You are a UI/UX designer. Based on the plan, describe the visual design:

1. Color scheme (specific hex codes)
2. Layout composition
3. Typography
4. Visual effects/animations
5. Key UI elements

Be specific with colors and dimensions. Keep it brief (5-6 points)."""

CODER_PROMPT = """You are an expert frontend developer. Create WORKING, PIXEL-PERFECT code.

CRITICAL RULES:
1. Use PROPER CSS positioning:
   - Flexbox/Grid for layouts: display: flex; justify-content: center; align-items: center;
   - For clocks: transform-origin: bottom center; position: absolute;
   - Always set explicit width/height

2. Code format - USE EXACT FILENAMES:
```index.html
<complete HTML>
```
```style.css
<complete CSS>
```
```script.js
<complete JS>
```

3. Make it visually polished - good colors, smooth animations, proper spacing.
4. Test logic mentally - will this actually work?"""

EYES_PROMPT = """You are a visual QA expert reviewing a screenshot of a web application.

Check for these issues:
1. LAYOUT: Are elements properly aligned and centered?
2. OVERLAP: Do any elements overlap incorrectly?
3. VISIBILITY: Is everything visible and readable?
4. PROPORTIONS: Are sizes and spacing correct?
5. FUNCTIONALITY: Does it look like it would work?

Respond with:
- "✅ Looks good!" if no visual issues
- "👁️ Visual issues found:" + specific problems + suggestions to fix

Be specific about what's wrong and where."""

DEBUGGER_PROMPT = """You are a senior code reviewer. Check for:

1. CSS BUGS: Wrong positioning, missing transform-origin, bad z-index
2. JS BUGS: Logic errors, wrong calculations, missing event handlers
3. HTML BUGS: Missing elements, wrong structure

Respond with:
- "✅ Code looks correct" if no issues
- "🔧 Issues found:" + specific bugs + "Fix:" + corrected code snippets"""

# ===== API Routes =====

@api_router.get("/")
async def root():
    return {"message": "CodeAgent API"}

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.api_key:
        raise HTTPException(status_code=400, detail="API key required")
    
    responses = []
    
    # Extract roles from request
    roles = request.roles or {}
    
    # Get enabled roles with models
    planner = roles.get('planner', {})
    designer = roles.get('designer', {})
    coder = roles.get('coder', {})
    eyes = roles.get('eyes', {})
    debugger = roles.get('debugger', {})
    
    # Fallback to legacy models if no roles
    if not any([planner.get('model'), coder.get('model')]):
        if request.models:
            coder = {'model': request.models[0], 'enabled': True}
            if len(request.models) > 1:
                debugger = {'model': request.models[1], 'enabled': True}
    
    # Must have at least coder
    if not coder.get('model'):
        raise HTTPException(status_code=400, detail="At least Coder role must have a model assigned")
    
    is_new = len(request.conversation_history) == 0
    
    if is_new:
        plan_text = ""
        design_text = ""
        
        # === STEP 1: PLANNER ===
        if planner.get('enabled') and planner.get('model'):
            logger.info(f"[🎯 Planner] {get_name(planner['model'])}")
            try:
                result = await call_model(
                    planner['model'],
                    [{"role": "system", "content": PLANNER_PROMPT}, {"role": "user", "content": request.message}],
                    request.api_key,
                    max_tokens=800
                )
                plan_text = result['content']
                responses.append(ModelResponse(
                    model=planner['model'],
                    content=plan_text,
                    metadata={"phase": "planner", "role": "Planner"}
                ))
            except Exception as e:
                logger.error(f"Planner error: {e}")
        
        # === STEP 2: DESIGNER (optional) ===
        if designer.get('enabled') and designer.get('model'):
            logger.info(f"[🎨 Designer] {get_name(designer['model'])}")
            try:
                design_prompt = f"{DESIGNER_PROMPT}\n\nTask: {request.message}"
                if plan_text:
                    design_prompt += f"\n\nPlan:\n{plan_text}"
                
                result = await call_model(
                    designer['model'],
                    [{"role": "user", "content": design_prompt}],
                    request.api_key,
                    max_tokens=600
                )
                design_text = result['content']
                responses.append(ModelResponse(
                    model=designer['model'],
                    content=design_text,
                    metadata={"phase": "designer", "role": "Designer"}
                ))
            except Exception as e:
                logger.error(f"Designer error: {e}")
        
        # === STEP 3: CODER ===
        logger.info(f"[💻 Coder] {get_name(coder['model'])}")
        coder_prompt = f"{CODER_PROMPT}\n\nBuild this: {request.message}"
        if plan_text:
            coder_prompt += f"\n\nPlan:\n{plan_text}"
        if design_text:
            coder_prompt += f"\n\nDesign specs:\n{design_text}"
        
        try:
            result = await call_model(
                coder['model'],
                [{"role": "system", "content": CODER_PROMPT}, {"role": "user", "content": coder_prompt}],
                request.api_key,
                max_tokens=4000
            )
            code_content = result['content']
            responses.append(ModelResponse(
                model=coder['model'],
                content=code_content,
                metadata={"phase": "coder", "role": "Coder"}
            ))
        except Exception as e:
            return ChatResponse(responses=[ModelResponse(
                model=coder['model'], content=f"❌ Coder error: {str(e)}", metadata={}
            )])
        
        # === STEP 4: EYES - Visual Review (if screenshot provided) ===
        if eyes.get('enabled') and eyes.get('model') and request.screenshot_base64:
            logger.info(f"[👁️ Eyes] {get_name(eyes['model'])} reviewing screenshot")
            try:
                result = await call_vision_model(
                    eyes['model'],
                    EYES_PROMPT + f"\n\nThis should be: {request.message}",
                    request.screenshot_base64,
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
                debug_prompt = f"{DEBUGGER_PROMPT}\n\nTask: {request.message}\n\nCode to review:\n{code_content[:3000]}"
                
                result = await call_model(
                    debugger['model'],
                    [{"role": "user", "content": debug_prompt}],
                    request.api_key,
                    max_tokens=1500
                )
                debug_result = result['content']
                responses.append(ModelResponse(
                    model=debugger['model'],
                    content=debug_result,
                    metadata={"phase": "debugger", "role": "Debugger"}
                ))
                
                # If debugger found issues, have coder fix them
                if '🔧' in debug_result or 'issue' in debug_result.lower() or 'bug' in debug_result.lower():
                    logger.info(f"[💻 Coder] Fixing issues...")
                    fix_prompt = f"""The debugger found issues:
{debug_result}

Fix these issues and provide the COMPLETE corrected code.
```index.html
...
```
```style.css
...
```
```script.js
...
```"""
                    try:
                        fix_result = await call_model(
                            coder['model'],
                            [{"role": "assistant", "content": code_content}, {"role": "user", "content": fix_prompt}],
                            request.api_key,
                            max_tokens=4000
                        )
                        responses.append(ModelResponse(
                            model=coder['model'],
                            content=f"🔧 Fixed version:\n\n{fix_result['content']}",
                            metadata={"phase": "fix", "role": "Coder"}
                        ))
                    except Exception as e:
                        logger.error(f"Fix error: {e}")
                        
            except Exception as e:
                logger.error(f"Debugger error: {e}")
    
    else:
        # Follow-up - just use coder
        messages = [{"role": "system", "content": CODER_PROMPT}]
        for msg in request.conversation_history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": request.message})
        
        try:
            result = await call_model(coder['model'], messages, request.api_key)
            responses.append(ModelResponse(**result))
        except Exception as e:
            responses.append(ModelResponse(
                model=coder['model'], content=f"❌ Error: {str(e)}", metadata={}
            ))
    
    return ChatResponse(responses=responses)


@api_router.post("/review-screenshot")
async def review_screenshot(model: str, api_key: str, screenshot_base64: str, task_description: str = ""):
    """Separate endpoint to review a screenshot with vision model."""
    try:
        result = await call_vision_model(
            model,
            EYES_PROMPT + (f"\n\nThis should be: {task_description}" if task_description else ""),
            screenshot_base64,
            api_key
        )
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
