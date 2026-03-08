from fastapi import APIRouter
from .models import EvaluateRequest, EvaluateResponse
from .service import openrouter_gemini_evaluate

router = APIRouter()
@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_endpoint(request: EvaluateRequest):
    """AI 批改接口，接收图片URLs列表和提示，返回 markdown 结果"""
    content = await openrouter_gemini_evaluate(
        request.image_urls,
        request.prompt
    )
    return EvaluateResponse(content=content)
