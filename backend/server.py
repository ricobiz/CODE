from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
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
import json
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
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===== Models =====

class Message(BaseModel):
    role: str
    content: str
    model: Optional[str] = None  # Which model sent this message

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

# ===== OpenRouter Integration =====

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

def get_model_short_name(model: str) -> str:
    """Get a short friendly name for a model."""
    name = model.split('/')[-1]
    short_names = {
        'claude-3.5-sonnet': 'Claude Sonnet',
        'claude-3-haiku': 'Claude Haiku', 
        'claude-haiku-4.5': 'Claude Haiku',
        'gpt-4o': 'GPT-4o',
        'gpt-4o-mini': 'GPT-4o Mini',
        'gpt-4-turbo': 'GPT-4 Turbo',
        'gemini-pro-1.5': 'Gemini Pro',
        'gemini-flash-1.5': 'Gemini Flash',
        'gemma-3-12b-it:free': 'Gemma 3',
    }
    return short_names.get(name, name[:25])

async def call_openrouter_model(
    model: str,
    messages: List[Dict[str, str]],
    api_key: str,
    max_tokens: int = 4000,
    timeout: float = 120.0
) -> Dict[str, Any]:
    """
    Call a single model via OpenRouter API
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://codeagent.app",
        "X-Title": "CodeAgent",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens
    }
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as http_client:
            response = await http_client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "model": model,
                "content": data["choices"][0]["message"]["content"],
                "metadata": {
                    "usage": data.get("usage", {}),
                    "finish_reason": data["choices"][0].get("finish_reason")
                }
            }
    except httpx.HTTPStatusError as e:
        logger.error(f"OpenRouter API error for model {model}: {e.response.text}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"OpenRouter API error: {e.response.text}"
        )
    except Exception as e:
        logger.error(f"Error calling model {model}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error calling model {model}: {str(e)}"
        )

# ===== API Routes =====

@api_router.get("/")
async def root():
    return {"message": "CodeAgent API - Multi-Model AI Coding Platform"}

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Unified chat endpoint.
    - 1 model: Simple code generation
    - 2+ models: Collaborative flow (discuss -> plan -> code -> review)
    """
    if not request.api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    
    if not request.models:
        raise HTTPException(status_code=400, detail="At least one model must be selected")
    
    # Build conversation history with model labels
    def format_history(history: List[Message]) -> List[Dict]:
        formatted = []
        for msg in history:
            if msg.role == 'user':
                formatted.append({"role": "user", "content": msg.content})
            elif msg.role == 'assistant' and msg.model:
                # Label which model said what
                model_name = get_model_short_name(msg.model)
                formatted.append({
                    "role": "assistant", 
                    "content": f"[{model_name}]: {msg.content}"
                })
            else:
                formatted.append({"role": msg.role, "content": msg.content})
        return formatted
    
    history = format_history(request.conversation_history)
    
    # === SINGLE MODEL MODE ===
    if len(request.models) == 1:
        model = request.models[0]
        model_name = get_model_short_name(model)
        
        system_prompt = f"""You are {model_name}, an expert web developer AI.
Your job is to CREATE working code for what the user asks.

RULES:
1. ALWAYS generate actual code, not just describe it
2. Use code blocks with filenames:
```index.html
<HTML code>
```
```style.css  
<CSS code>
```
```script.js
<JavaScript code>
```
3. Create complete, working implementations
4. Keep explanations minimal - focus on code
5. The code will be automatically applied to a live preview"""

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": request.message})
        
        try:
            result = await call_openrouter_model(
                model=model,
                messages=messages,
                api_key=request.api_key
            )
            return ChatResponse(responses=[ModelResponse(**result)])
        except Exception as e:
            return ChatResponse(responses=[ModelResponse(
                model=model,
                content=f"❌ Error: {str(e)}",
                metadata={"error": str(e)}
            )])
    
    # === MULTI-MODEL COLLABORATIVE MODE ===
    model1 = request.models[0]
    model2 = request.models[1] if len(request.models) > 1 else request.models[0]
    name1 = get_model_short_name(model1)
    name2 = get_model_short_name(model2)
    
    responses = []
    
    # Check if this is the START of a new task or CONTINUATION
    is_new_task = len(request.conversation_history) == 0
    
    if is_new_task:
        # === PHASE 1: DISCUSSION & PLANNING ===
        # Model 1 proposes approach
        system1 = f"""You are {name1}, Lead Developer in a team with {name2}.
You're collaborating to build what the user requests.

Current phase: PLANNING
Your role: Propose the technical approach.

Respond with:
1. Brief analysis of the task (1-2 sentences)
2. Proposed tech approach (HTML/CSS/JS structure)
3. Key features to implement

Keep it concise (5-8 sentences max). {name2} will review your plan."""

        messages1 = [
            {"role": "system", "content": system1},
            {"role": "user", "content": request.message}
        ]
        
        try:
            result1 = await call_openrouter_model(
                model=model1,
                messages=messages1,
                api_key=request.api_key,
                max_tokens=800
            )
            responses.append(ModelResponse(
                model=model1,
                content=result1['content'],
                metadata={"phase": "planning", "role": "architect"}
            ))
        except Exception as e:
            responses.append(ModelResponse(
                model=model1,
                content=f"❌ {name1} error: {str(e)}",
                metadata={"error": str(e)}
            ))
            return ChatResponse(responses=responses)
        
        # Model 2 reviews and agrees
        system2 = f"""You are {name2}, Senior Reviewer in a team with {name1}.

{name1} proposed this plan:
\"{result1['content']}\"

Your role: Briefly review and confirm.
Respond with:
1. Agreement or ONE key improvement (1-2 sentences)
2. Say "Let's build it!" or similar to signal you're ready

Keep it very short (2-3 sentences max)."""

        messages2 = [
            {"role": "system", "content": system2},
            {"role": "user", "content": request.message}
        ]
        
        try:
            result2 = await call_openrouter_model(
                model=model2,
                messages=messages2,
                api_key=request.api_key,
                max_tokens=400
            )
            responses.append(ModelResponse(
                model=model2,
                content=result2['content'],
                metadata={"phase": "planning", "role": "reviewer"}
            ))
        except Exception as e:
            responses.append(ModelResponse(
                model=model2,
                content=f"❌ {name2} error: {str(e)}",
                metadata={"error": str(e)}
            ))
            return ChatResponse(responses=responses)
        
        # === PHASE 2: IMPLEMENTATION ===
        # Model 1 writes the code
        system_code = f"""You are {name1}, Lead Developer.
You discussed the plan with {name2} and agreed on the approach.

Now IMPLEMENT the complete solution for: {request.message}

IMPORTANT - Use this EXACT format:
```index.html
<complete HTML>
```
```style.css
<complete CSS>
```
```script.js
<complete JavaScript>
```

Create fully working, visually appealing code. Include all necessary files."""

        messages_code = [
            {"role": "system", "content": system_code},
            {"role": "assistant", "content": f"Plan: {result1['content']}\n\nReview: {result2['content']}"},
            {"role": "user", "content": f"Now write the complete code for: {request.message}"}
        ]
        
        try:
            result_code = await call_openrouter_model(
                model=model1,
                messages=messages_code,
                api_key=request.api_key,
                max_tokens=4000
            )
            responses.append(ModelResponse(
                model=model1,
                content=result_code['content'],
                metadata={"phase": "implementation", "role": "coder"}
            ))
        except Exception as e:
            responses.append(ModelResponse(
                model=model1,
                content=f"❌ Code generation error: {str(e)}",
                metadata={"error": str(e)}
            ))
            return ChatResponse(responses=responses)
        
        # === PHASE 3: REVIEW ===
        # Model 2 does quick review
        system_review = f"""You are {name2}, Code Reviewer.
{name1} wrote this code:

{result_code['content'][:2000]}...

Quickly check:
1. Does it look complete?
2. Any obvious bugs?

Respond briefly (2-3 sentences):
- If good: "✅ Code looks good! [brief comment]"
- If issues: "⚠️ Found issue: [what's wrong]" """

        messages_review = [
            {"role": "system", "content": system_review},
            {"role": "user", "content": "Review this code"}
        ]
        
        try:
            result_review = await call_openrouter_model(
                model=model2,
                messages=messages_review,
                api_key=request.api_key,
                max_tokens=300
            )
            responses.append(ModelResponse(
                model=model2,
                content=result_review['content'],
                metadata={"phase": "review", "role": "reviewer"}
            ))
        except Exception as e:
            responses.append(ModelResponse(
                model=model2,
                content=f"✅ Code submitted (review skipped)",
                metadata={"error": str(e)}
            ))
    
    else:
        # === CONTINUATION - respond to follow-up ===
        # Both models can respond to user's follow-up
        system_cont = f"""You are part of a development team ({name1} and {name2}).
The user has a follow-up request or question.

If they want changes to code, provide updated code in the same format:
```filename.ext
<code>
```

If they have questions, answer helpfully."""
        
        messages_cont = [{"role": "system", "content": system_cont}]
        messages_cont.extend(history)
        messages_cont.append({"role": "user", "content": request.message})
        
        # Model 1 responds to follow-up
        try:
            result_cont = await call_openrouter_model(
                model=model1,
                messages=messages_cont,
                api_key=request.api_key,
                max_tokens=4000
            )
            responses.append(ModelResponse(**result_cont))
        except Exception as e:
            responses.append(ModelResponse(
                model=model1,
                content=f"❌ Error: {str(e)}",
                metadata={"error": str(e)}
            ))
    
    return ChatResponse(responses=responses)


@api_router.post("/ping-model")
async def ping_model(model: str, api_key: str):
    """
    Ping a model to check if it's working.
    """
    try:
        test_message = [{"role": "user", "content": "Say OK"}]
        
        result = await call_openrouter_model(
            model=model,
            messages=test_message,
            api_key=api_key,
            max_tokens=10,
            timeout=30.0
        )
        
        return {
            "status": "working",
            "model": model,
            "response": result['content'][:50]
        }
            
    except Exception as e:
        return {
            "status": "unavailable",
            "model": model,
            "error": str(e)[:100]
        }

@api_router.get("/models")
async def get_models(x_api_key: str = None):
    """
    Get list of available models from OpenRouter.
    """
    if not x_api_key:
        return {"data": [], "message": "API key required"}
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {x_api_key}"}
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error fetching models: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching models: {str(e)}")

@api_router.post("/projects", response_model=Project)
async def save_project(project: Project):
    """
    Save a project to MongoDB
    """
    try:
        doc = project.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        
        await db.projects.update_one(
            {"name": project.name},
            {"$set": doc},
            upsert=True
        )
        
        return project
    except Exception as e:
        logger.error(f"Error saving project: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving project: {str(e)}")

@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    """
    Get all projects from MongoDB
    """
    try:
        projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
        
        for project in projects:
            if isinstance(project.get('timestamp'), str):
                project['timestamp'] = datetime.fromisoformat(project['timestamp'])
        
        return projects
    except Exception as e:
        logger.error(f"Error fetching projects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching projects: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
