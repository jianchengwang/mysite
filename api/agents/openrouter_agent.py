import httpx
from core.config import get_settings
from core.logger import logger
from typing import Optional, List, Dict, Any

# Initialize settings and check API key
settings = get_settings()
if not settings.OPENROUTER_API_KEY:
    logger.error("OPENROUTER_API_KEY environment variable is not set")
    raise ValueError("OPENROUTER_API_KEY environment variable is not set")

OPENROUTER_API_KEY = settings.OPENROUTER_API_KEY
API_URL = "https://openrouter.ai/api/v1/chat/completions"


async def openrouter_generate(
    prompt: str,
    image_urls: Optional[List[str]] = None,
    model_name: str = "google/gemini-2.0-flash-exp:free",
) -> str:
    """
    Generate a chat completion via OpenRouter asynchronously, optionally including an image.

    Args:
        prompt: The text prompt.
        image_urls: List of URLs or base64 strings for image content.
        model_name: Model identifier for the request.

    Returns:
        The text content of the first message from the assistant.
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    content: List[Dict[str, Any]] = []
    # add text prompt
    content.append({"type": "text", "text": prompt})
    # add images if provided
    if image_urls:
        for img in image_urls:
            if img.startswith("http"):
                url = img
            elif img.startswith("data:"):
                url = img
            else:
                url = f"data:image/png;base64,{img}"
            content.append({
                "type": "image_url",
                "image_url": {"url": url}
            })
    body: Dict[str, Any] = {
        "model": model_name,
        "messages": [
            {"role": "user", "content": content}
        ]
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(API_URL, headers=headers, json=body, timeout=60.0)
            response.raise_for_status()
            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                logger.warning("OpenRouter returned no choices")
                return ""
            message = choices[0].get("message", {})
            return message.get("content", "") or ""
    except Exception as e:
        logger.error(f"OpenRouter call failed: {e}", exc_info=True)
        raise 


async def openrouter_image_generate(
    prompt: str,
    model: str = "black-forest-labs/flux-schnell",
    n: int = 1,
    size: str = "1024x1024",
    response_format: str = "url",
    user: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Generate images using OpenRouter chat completion endpoint (as recommended for image models).
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Most image models on OpenRouter use the chat completions endpoint
    body: Dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }
    # Some models might need specific parameters for size, but let's keep it simple first
    # and extract the URL from the response.

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(API_URL, headers=headers, json=body, timeout=120.0)
            response.raise_for_status()
            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                return []
            
            content = choices[0].get("message", {}).get("content", "")
            # Extract URL from content (often in markdown ![image](url) or just url)
            import re
            urls = re.findall(r'https?://\S+', content)
            if urls:
                # Remove trailing ) from markdown
                clean_url = urls[0].split(')')[0].split('\"')[0].split('\'')[0]
                return [{"url": clean_url}]
            
            # If no URL found in content, check if there's a 'data' field (some providers might use it)
            if "data" in data:
                return data["data"]
                
            return []
    except Exception as e:
        logger.error(f"OpenRouter image generation failed: {e}", exc_info=True)
        raise
 