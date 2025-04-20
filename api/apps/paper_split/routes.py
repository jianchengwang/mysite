from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from .models import EvaluateRequest, EvaluateResponse
from .service import openrouter_gemini_evaluate

router = APIRouter()
@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_endpoint(request: EvaluateRequest):
    """AI 批改接口，接收图片URLs列表和提示，返回 markdown 结果"""
    try:
        content = await run_in_threadpool(
            openrouter_gemini_evaluate,
            request.image_urls,
            request.prompt
        )
        return EvaluateResponse(content=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))