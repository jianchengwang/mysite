from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from typing import List
from .models import ChatRequest, ChatResponse, ImageGenRequest, ImageGenResponse
from .service import chat_service, image_service

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """XAI chat endpoint: send message and optional images."""
    try:
        message = await run_in_threadpool(
            chat_service,
            request.prompt,
            request.image_urls
        )
        return ChatResponse(message=message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/images/generations", response_model=List[ImageGenResponse])
async def images_generation_endpoint(request: ImageGenRequest):
    """Generate images from prompt and return data list."""
    try:
        results = await run_in_threadpool(
            image_service,
            request.prompt,
            request.model,
            request.n,
            request.response_format,
            request.user
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 