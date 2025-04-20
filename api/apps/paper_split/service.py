import os
import requests
from core.config import get_settings
from agents.openrouter_agent import openrouter_generate
from agents.xai_agent import xai_chat

settings = get_settings()
OPENROUTER_API_KEY = settings.OPENROUTER_API_KEY
API_URL = "https://openrouter.ai/api/v1/chat/completions"


def openrouter_gemini_evaluate(image_urls: list[str], prompt: str) -> str:
    """
    调用OpenRouter AI的Gemini模型进行图片+文本批改，支持多张图片输入，返回AI回复的markdown内容。

    Args:
        image_urls (List[str]): 图片URL或base64字符串列表（支持纯base64或data URI或HTTP URL）
        prompt (str): 文本提示语

    Returns:
        str: AI回复的内容（markdown格式）
    """
    # Delegate to the shared OpenRouter agent
    # return openrouter_generate(prompt=prompt, image_urls=image_urls)
    return xai_chat(model="grok-2-vision-latest", prompt=prompt, image_urls=image_urls)
# 示例用法
# if __name__ == "__main__":
#     base64_str = "..."
#     prompt = "请批改以下题目："
#     result = openrouter_gemini_evaluate(base64_str, prompt)
#     print(result) 