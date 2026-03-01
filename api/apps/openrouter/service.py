from typing import List, Dict, Any, Optional
from agents.openrouter_agent import openrouter_generate, openrouter_image_generate

async def chat_service(
    prompt: str,
    model: str,
    image_urls: Optional[List[str]] = None
) -> str:
    """Handle chat requests via OpenRouter agent"""
    return await openrouter_generate(
        prompt=prompt,
        image_urls=image_urls,
        model_name=model
    )

async def image_service(
    prompt: str,
    model: str,
    n: int,
    size: str,
    response_format: str,
    user: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Handle image generation requests via OpenRouter agent"""
    return await openrouter_image_generate(
        prompt=prompt,
        model=model,
        n=n,
        size=size,
        response_format=response_format,
        user=user
    )
