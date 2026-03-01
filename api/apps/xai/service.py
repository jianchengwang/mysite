from typing import List, Dict, Any, Optional
from agents.xai_agent import xai_chat, xai_image_generate


async def chat_service(
    prompt: str,
    image_urls: Optional[List[str]] = None
) -> str:
    """Handle chat requests via XAI agent"""
    if image_urls:
        return await xai_chat(
            prompt=prompt,
            image_urls=image_urls,
            detail='high',
            model='grok-2-vision-latest'
        )
    else:
        return await xai_chat(
            prompt=prompt,
            model='grok-3-mini-fast-beta'
        )


async def image_service(
    prompt: str,
    model: str,
    n: int,
    response_format: str,
    user: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Handle image generation requests via XAI agent"""
    return await xai_image_generate(
        prompt=prompt,
        model=model,
        n=n,
        response_format=response_format,
        user=user
    )
 