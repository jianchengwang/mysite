from pydantic import BaseModel
from typing import List


class EvaluateRequest(BaseModel):
    """AI 批改请求模型"""
    image_urls: List[str]  # 图片URL或Base64字符串列表（可为HTTP URL、data URI或纯base64）
    prompt: str        # AI 批改的提示语


class EvaluateResponse(BaseModel):
    """AI 批改响应模型"""
    content: str      # AI 返回的批改结果（Markdown 格式） 