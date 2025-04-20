from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ChatRequest(BaseModel):
    prompt: str
    image_urls: Optional[List[str]] = None

class ChatResponse(BaseModel):
    message: str

class ImageGenRequest(BaseModel):
    prompt: str
    model: Optional[str] = 'grok-2-image'
    n: Optional[int] = 1
    response_format: Optional[str] = 'b64_json'
    user: Optional[str] = None

class ImageGenResponse(BaseModel):
    url: Optional[str] = None
    b64_json: Optional[str] = None
    revised_prompt: Optional[str] = None