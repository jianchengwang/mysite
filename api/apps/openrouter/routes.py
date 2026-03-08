from fastapi import APIRouter
from typing import List
from .models import ChatRequest, ChatResponse, ImageGenRequest, ImageGenResponse
from .service import chat_service, image_service

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """OpenRouter chat endpoint."""
    message = await chat_service(
        request.prompt,
        request.model,
        request.image_urls
    )
    return ChatResponse(message=message)

@router.post("/images/generations", response_model=List[ImageGenResponse])
async def images_generation_endpoint(request: ImageGenRequest):
    """Generate images from prompt using OpenRouter."""
    results = await image_service(
        request.prompt,
        request.model,
        request.n,
        request.size,
        request.response_format
    )
    return results
