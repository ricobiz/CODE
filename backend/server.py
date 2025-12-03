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

from consensus_engine import ConsensusEngine

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

# Store active consensus sessions
active_sessions = {}

# ===== Models =====

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    models: List[str]
    api_key: str
    conversation_history: Optional[List[Message]] = []
    consensus_mode: Optional[bool] = False

class ModelResponse(BaseModel):
    model: str
    content: str
    metadata: Optional[Dict[str, Any]] = {}

class ChatResponse(BaseModel):
    responses: List[ModelResponse]
    consensus_data: Optional[Dict[str, Any]] = None

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    files: Dict[str, str]
    messages: List[Dict[str, Any]] = []
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ===== OpenRouter Integration =====

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

async def call_openrouter_model(
    model: str,
    messages: List[Dict[str, str]],
    api_key: str,
    max_tokens: int = 4000
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
        async with httpx.AsyncClient(timeout=180.0) as http_client:
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
async def chat(request: ChatRequest, background_tasks: BackgroundTasks):
    """
    Send a message to multiple AI models.
    If consensus_mode=True, runs full consensus flow in background.
    """
    if not request.api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    
    if not request.models:
        raise HTTPException(status_code=400, detail="At least one model must be selected")
    
    # Consensus mode - full multi-phase flow
    if request.consensus_mode and len(request.models) >= 2:
        session_id = str(uuid.uuid4())
        
        # Quick ping check before starting
        logger.info(f"Consensus mode: Checking models {request.models}")
        
        # Create consensus engine
        engine = ConsensusEngine(
            models=request.models,
            api_key=request.api_key,
            openrouter_caller=call_openrouter_model
        )
        
        # Store session
        active_sessions[session_id] = {
            'engine': engine,
            'status': 'running',
            'started_at': datetime.utcnow()
        }
        
        # Run consensus flow in background
        background_tasks.add_task(
            run_consensus_background,
            session_id,
            engine,
            request.message,
            [msg.dict() for msg in request.conversation_history]
        )
        
        model_names = [m.split('/')[-1] for m in request.models]
        
        return ChatResponse(
            responses=[ModelResponse(
                model="system",
                content=f"🚀 Consensus mode activated!\n\n👥 Team: {model_names[0]} & {model_names[1]}\n📋 Starting planning phase...",
                metadata={"session_id": session_id}
            )],
            consensus_data={
                "session_id": session_id,
                "mode": "consensus",
                "phase": "planning"
            }
        )
    
    # Regular mode - each model responds independently (group chat style)
    messages = [
        {"role": msg.role, "content": msg.content}
        for msg in request.conversation_history
    ]
    messages.append({"role": "user", "content": request.message})
    
    # Add system message for group chat context
    if len(request.models) > 1:
        model_names = [m.split('/')[-1] for m in request.models]
        system_msg = {
            "role": "system",
            "content": f"You are in a group chat with: USER and other AI agents ({', '.join(model_names)}). Respond naturally and helpfully to the user's request."
        }
        messages.insert(0, system_msg)
    
    responses = []
    
    # Call all models in parallel (not sequential) for group chat feel
    for idx, model in enumerate(request.models):
        try:
            # Each model gets the same context (no seeing other model responses yet)
            model_messages = messages.copy()
            
            result = await call_openrouter_model(
                model=model,
                messages=model_messages,
                api_key=request.api_key
            )
            responses.append(ModelResponse(**result))
            
        except Exception as e:
            logger.error(f"Failed to get response from {model}: {str(e)}")
            responses.append(ModelResponse(
                model=model,
                content=f"❌ Error: This model is currently unavailable. Try another model or check your API key.",
                metadata={"error": str(e)}
            ))
    
    return ChatResponse(responses=responses)

async def run_consensus_background(session_id: str, engine: ConsensusEngine, task: str, history: List[Dict]):
    """
    Run consensus flow in background.
    """
    try:
        result = await engine.run_consensus_flow(task, history)
        
        # Update session
        active_sessions[session_id]['status'] = 'completed'
        active_sessions[session_id]['result'] = result
        active_sessions[session_id]['completed_at'] = datetime.utcnow()
        
        logger.info(f"Consensus session {session_id} completed")
        
    except Exception as e:
        logger.error(f"Consensus session {session_id} failed: {str(e)}")
        active_sessions[session_id]['status'] = 'failed'
        active_sessions[session_id]['error'] = str(e)

@api_router.get("/consensus/{session_id}")
async def get_consensus_status(session_id: str):
    """
    Get status of consensus session.
    """
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[session_id]
    engine = session['engine']
    
    return {
        'session_id': session_id,
        'status': session['status'],
        'phase': engine.current_phase,
        'consensus_messages': engine.consensus_messages,
        'plan': engine.project_plan,
        'files': engine.files_generated,
        'started_at': session['started_at'].isoformat(),
        'completed_at': session.get('completed_at', '').isoformat() if session.get('completed_at') else None
    }


@api_router.post("/ping-model")
async def ping_model(model: str, api_key: str):
    """
    Ping a model to check if it's working.
    Returns: working, limited, or unavailable
    """
    try:
        test_message = [{"role": "user", "content": "Respond with 'OK' if you can read this."}]
        
        result = await call_openrouter_model(
            model=model,
            messages=test_message,
            api_key=api_key,
            max_tokens=10
        )
        
        # Check response
        content = result['content'].strip().upper()
        if 'OK' in content or len(content) > 0:
            return {
                "status": "working",
                "model": model,
                "response": result['content']
            }
        else:
            return {
                "status": "limited",
                "model": model,
                "response": result['content']
            }
            
    except Exception as e:
        error_msg = str(e)
        
        # Check if model is unavailable or just rate limited
        if 'rate' in error_msg.lower() or 'limit' in error_msg.lower():
            return {
                "status": "limited",
                "model": model,
                "error": "Rate limited or quota exceeded"
            }
        else:
            return {
                "status": "unavailable",
                "model": model,
                "error": error_msg
            }

@api_router.get("/models")
async def get_models(x_api_key: str = None):
    """
    Proxy request to OpenRouter to get list of available models.
    """
    if not x_api_key:
        return {
            "data": [],
            "message": "API key required to fetch models"
        }
    
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
