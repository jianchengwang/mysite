from pydantic import BaseModel
from typing import List, Optional

class ChatRequest(BaseModel):
    prompt: str
    image_urls: Optional[List[str]] = None
    model: str = "google/gemini-2.0-flash-exp:free"

class ChatResponse(BaseModel):
    message: str

class ImageGenRequest(BaseModel):
    prompt: str
    model: str = "black-forest-labs/flux-schnell"
    n: int = 1
    size: str = "1024x1024"
    response_format: str = "url"

class ImageGenResponse(BaseModel):
    url: Optional[str] = None
    b64_json: Optional[str] = None
    revised_prompt: Optional[str] = None
