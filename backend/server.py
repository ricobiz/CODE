from fastapi import FastAPI, APIRouter, HTTPException
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

async def call_openrouter_model(
    model: str,
    messages: List[Dict[str, str]],
    api_key: str
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
        "messages": messages
    }
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
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
    Send a message to multiple AI models and get their responses.
    Models collaborate by seeing each other's responses in subsequent calls.
    """
    if not request.api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    
    if not request.models:
        raise HTTPException(status_code=400, detail="At least one model must be selected")
    
    # Prepare conversation history
    messages = [
        {"role": msg.role, "content": msg.content}
        for msg in request.conversation_history
    ]
    messages.append({"role": "user", "content": request.message})
    
    # Call all selected models
    responses = []
    
    for model in request.models:
        try:
            result = await call_openrouter_model(
                model=model,
                messages=messages,
                api_key=request.api_key
            )
            responses.append(ModelResponse(**result))
            
            # For multi-model collaboration, add this model's response to context
            # for the next model to see
            if len(request.models) > 1:
                messages.append({
                    "role": "assistant",
                    "content": f"[Response from {model}]: {result['content']}"
                })
        except Exception as e:
            logger.error(f"Failed to get response from {model}: {str(e)}")
            # Continue with other models even if one fails
            responses.append(ModelResponse(
                model=model,
                content=f"Error: Failed to get response from {model}",
                metadata={"error": str(e)}
            ))
    
    return ChatResponse(responses=responses)

@api_router.get("/models")
async def get_models(x_api_key: str = None):
    """
    Get list of available models from OpenRouter
    """
    if not x_api_key:
        # Return popular models without API call
        return {
            "models": [
                {"id": "anthropic/claude-3.5-sonnet", "name": "Claude 3.5 Sonnet"},
                {"id": "openai/gpt-4-turbo", "name": "GPT-4 Turbo"},
                {"id": "openai/gpt-4o", "name": "GPT-4o"},
                {"id": "google/gemini-pro-1.5", "name": "Gemini Pro 1.5"},
            ]
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
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
        
        # Upsert: update if exists, insert if not
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
        
        # Convert ISO string timestamps back to datetime objects
        for project in projects:
            if isinstance(project.get('timestamp'), str):
                project['timestamp'] = datetime.fromisoformat(project['timestamp'])
        
        return projects
    except Exception as e:
        logger.error(f"Error fetching projects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching projects: {str(e)}")

@api_router.post("/execute")
async def execute_code(code: str, language: str):
    """
    Execute code (placeholder for future implementation)
    """
    return {
        "status": "success",
        "message": "Code execution not yet implemented",
        "output": ""
    }

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