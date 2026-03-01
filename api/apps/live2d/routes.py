from fastapi import APIRouter, HTTPException
from .models import ChatRequest, ChatResponse
from .service import chat

router = APIRouter()
@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Live2D 聊天接口"""
    response = await chat(request)
    return response
 