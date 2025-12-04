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
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ===== Models =====

class Message(BaseModel):
    role: str
    content: str
    model: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    models: List[str]
    api_key: str
    conversation_history: Optional[List[Message]] = []

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

def get_short_name(model: str) -> str:
    name = model.split('/')[-1]
    names = {
        'claude-3.5-sonnet': 'Claude Sonnet',
        'claude-3-haiku': 'Claude Haiku', 
        'claude-haiku-4.5': 'Claude Haiku',
        'gpt-4o': 'GPT-4o',
        'gpt-4o-mini': 'GPT-4o Mini',
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

# ===== Качественные промпты =====

CODE_EXPERT_PROMPT = """You are an expert frontend developer. Create WORKING, VISUALLY CORRECT code.

CRITICAL RULES:
1. Always use PROPER CSS positioning:
   - Use flexbox or grid for centering: display: flex; justify-content: center; align-items: center;
   - For clocks: hands MUST use transform-origin: bottom center; and position: absolute;
   - Always set explicit width/height on positioned elements

2. For ANALOG CLOCKS specifically:
   - Clock face: position: relative; border-radius: 50%;
   - Hands: position: absolute; left: 50%; transform-origin: bottom center;
   - Hour hand: shorter, wider
   - Minute hand: longer, thinner  
   - Second hand: longest, thinnest, red
   - Use transform: translateX(-50%) rotate(Xdeg) for rotation

3. Code format - USE EXACT FILENAMES:
```index.html
<complete HTML>
```
```style.css
<complete CSS>
```
```script.js
<complete JS>
```

4. Test your logic mentally before writing - will this actually work?"""

REVIEWER_PROMPT = """You are a senior code reviewer. Check the code for these SPECIFIC issues:

1. CSS POSITIONING BUGS:
   - Are elements properly centered? (check for display:flex + justify/align)
   - For clocks: is transform-origin set correctly on hands?
   - Are width/height explicitly set?

2. JAVASCRIPT LOGIC:
   - Are angles calculated correctly? (hours: 30° per hour, minutes: 6° per minute)
   - Is setInterval used for animation?
   - Are DOM elements selected correctly?

3. VISUAL CORRECTNESS:
   - Will elements overlap incorrectly?
   - Are z-index values logical?

Respond with:
- "✅ Code looks correct" if no issues found
- "⚠️ Found issues:" + specific problems + "Here's the fix:" + corrected code"""

# ===== API Routes =====

@api_router.get("/")
async def root():
    return {"message": "CodeAgent API"}

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.api_key:
        raise HTTPException(status_code=400, detail="API key required")
    if not request.models:
        raise HTTPException(status_code=400, detail="Select at least one model")
    
    responses = []
    
    # === 1 MODEL: Simple generation ===
    if len(request.models) == 1:
        model = request.models[0]
        name = get_short_name(model)
        
        messages = [
            {"role": "system", "content": CODE_EXPERT_PROMPT},
            {"role": "user", "content": request.message}
        ]
        
        # Add history
        for msg in request.conversation_history:
            if msg.role == 'user':
                messages.append({"role": "user", "content": msg.content})
            elif msg.role == 'assistant':
                messages.append({"role": "assistant", "content": msg.content})
        
        messages.append({"role": "user", "content": request.message})
        
        try:
            result = await call_model(model, messages, request.api_key)
            return ChatResponse(responses=[ModelResponse(**result)])
        except Exception as e:
            return ChatResponse(responses=[ModelResponse(
                model=model, content=f"❌ Error: {str(e)}", metadata={}
            )])
    
    # === 2+ MODELS: Collaboration ===
    model1, model2 = request.models[0], request.models[1]
    name1, name2 = get_short_name(model1), get_short_name(model2)
    
    is_new = len(request.conversation_history) == 0
    
    if is_new:
        # STEP 1: Model 1 creates code
        logger.info(f"[Collab] {name1} generating code...")
        
        messages1 = [
            {"role": "system", "content": CODE_EXPERT_PROMPT},
            {"role": "user", "content": request.message}
        ]
        
        try:
            result1 = await call_model(model1, messages1, request.api_key, max_tokens=4000)
            responses.append(ModelResponse(
                model=model1,
                content=result1['content'],
                metadata={"phase": "code", "role": "developer"}
            ))
        except Exception as e:
            return ChatResponse(responses=[ModelResponse(
                model=model1, content=f"❌ {name1} error: {str(e)}", metadata={}
            )])
        
        # STEP 2: Model 2 reviews
        logger.info(f"[Collab] {name2} reviewing...")
        
        review_prompt = f"""{REVIEWER_PROMPT}

User asked for: {request.message}

{name1} wrote this code:
{result1['content']}

Review it now."""
        
        messages2 = [
            {"role": "system", "content": "You are a code reviewer."},
            {"role": "user", "content": review_prompt}
        ]
        
        try:
            result2 = await call_model(model2, messages2, request.api_key, max_tokens=2000)
            responses.append(ModelResponse(
                model=model2,
                content=result2['content'],
                metadata={"phase": "review", "role": "reviewer"}
            ))
            
            # STEP 3: If issues found, Model 1 fixes
            review_text = result2['content'].lower()
            if '⚠️' in result2['content'] or 'issue' in review_text or 'bug' in review_text or 'problem' in review_text:
                logger.info(f"[Collab] {name1} fixing issues...")
                
                fix_prompt = f"""{name2} found issues in your code:
{result2['content']}

Fix these issues and provide the COMPLETE corrected code.
Use the same format:
```index.html
...
```
```style.css
...
```
```script.js
...
```"""
                
                messages_fix = [
                    {"role": "system", "content": CODE_EXPERT_PROMPT},
                    {"role": "assistant", "content": result1['content']},
                    {"role": "user", "content": fix_prompt}
                ]
                
                try:
                    result_fix = await call_model(model1, messages_fix, request.api_key, max_tokens=4000)
                    responses.append(ModelResponse(
                        model=model1,
                        content=f"🔧 Fixed version:\n\n{result_fix['content']}",
                        metadata={"phase": "fix", "role": "developer"}
                    ))
                except Exception as e:
                    logger.error(f"Fix error: {e}")
                    
        except Exception as e:
            responses.append(ModelResponse(
                model=model2, content=f"✅ Code submitted (review skipped)", metadata={}
            ))
    
    else:
        # Follow-up message - just respond
        messages = [
            {"role": "system", "content": CODE_EXPERT_PROMPT}
        ]
        for msg in request.conversation_history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": request.message})
        
        try:
            result = await call_model(model1, messages, request.api_key)
            responses.append(ModelResponse(**result))
        except Exception as e:
            responses.append(ModelResponse(
                model=model1, content=f"❌ Error: {str(e)}", metadata={}
            ))
    
    return ChatResponse(responses=responses)


@api_router.post("/ping-model")
async def ping_model(model: str, api_key: str):
    try:
        result = await call_model(
            model, [{"role": "user", "content": "Say OK"}], 
            api_key, max_tokens=10
        )
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
