from pydantic import BaseModel, Field
from typing import Optional

class ChatRequest(BaseModel):
    message: str
    character: str = "雪风"
    temperature: float = Field(0.7, ge=0.1, le=1.0)
    max_tokens: int = Field(100, ge=10, le=500)

class ChatResponse(BaseModel):
    message: str
    emotion: Optional[str] = None  # 可用于触发Live2D模型的表情变化 