from fastapi import APIRouter, Depends

from .models import SaveWechatDraftRequest, SaveWechatDraftResponse
from .service import save_wechat_draft
from core.security import require_backend_key

router = APIRouter()

@router.post('/draft', response_model=SaveWechatDraftResponse, dependencies=[Depends(require_backend_key)])
async def create_wechat_draft(payload: SaveWechatDraftRequest):
    """保存公众号图文到草稿箱"""
    return await save_wechat_draft(payload)
