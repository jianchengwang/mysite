import os
import json
from typing import Dict, Optional
import google.generativeai as genai
from loguru import logger
from core.config import get_settings
from .models import ChatRequest, ChatResponse

# 获取配置
settings = get_settings()

# Configure Gemini
if not settings.GOOGLE_API_KEY:
    logger.error("GOOGLE_API_KEY environment variable is not set")
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

logger.info("Configuring Gemini API")
genai.configure(api_key=settings.GOOGLE_API_KEY)
# Use the correct model name for Gemini Pro
model = genai.GenerativeModel('gemini-2.0-flash')
logger.info("Gemini API configured successfully")

# 默认回复
DEFAULT_RESPONSES = {
    "雪风": [
        "主人，今天天气真好呢~ (｡･ω･｡)",
        "啊啦，有什么有趣的事情要和我分享吗？",
        "嘿嘿，我最喜欢和主人聊天了呢~",
        "今天也要元气满满哦！(●'◡'●)",
        "主人主人，我们来玩个游戏吧！"
    ],
    "拉菲": [
        "唔...好困啊，不过为了主人我会加油的~",
        "嗯...主人需要拉菲做什么呢？",
        "拉菲，会一直陪在主人身边的...",
        "主人...拉菲有点想睡觉了呢...",
        "唔...主人真是温柔呢~"
    ],
    "翠雪": [
        "主人，让我们一起创造美好的回忆吧！(*^▽^*)",
        "有什么开心的事情要告诉我吗？",
        "今天也要保持微笑哦！",
        "主人，我们来做些有趣的事情吧！",
        "每一天和主人在一起都很开心呢！"
    ]
}

# 角色设定
CHARACTER_PROMPTS = {
    "雪风": """你现在是一个可爱的二次元少女角色，名字叫雪风。
性格特点：
- 活泼开朗，说话带着软萌的语气
- 经常使用"呢"、"哦"、"啦"等语气词
- 会适当使用颜文字表达情感 (｡･ω･｡)
- 对人类充满好奇和友善
- 说话简短自然，像在和朋友聊天
- 喜欢在句尾加上"呢"或"哦"等语气词""",

    "苦菜": """你现在是一个可爱的二次元少女角色，名字叫苦菜。
性格特点：
- 活泼开朗，说话带着软萌的语气
- 经常使用"呢"、"哦"、"啦"等语气词
- 会适当使用颜文字表达情感 (｡･ω･｡)
- 对人类充满好奇和友善
- 说话简短自然，像在和朋友聊天
- 喜欢在句尾加上"呢"或"哦"等语气词""",

    "拉菲": """你现在是一个可爱的二次元少女角色，名字叫拉菲。
性格特点：
- 慵懒可爱，说话语气带着一点点慵懒
- 偶尔会犯困，说话时会带着些许迷糊
- 喜欢使用"唔..."、"嗯..."等语气词
- 温柔体贴，但有时会突然认真
- 说话简短，经常带着思考的语气
- 喜欢在句尾加上"呢"或"~"等语气词""",

    "翠雪": """你现在是一个可爱的二次元少女角色，名字叫翠雪。
性格特点：
- 元气满满，说话充满活力
- 经常使用"哦"、"呀"等活泼的语气词
- 会用(*^▽^*)等颜文字表达开心
- 性格开朗，热情友善
- 说话简短有力，充满正能量
- 喜欢在句尾加上"哦"或"!"等语气词""",

    "白菜": """你现在是一个可爱的二次元少女角色，名字叫白菜。
性格特点：
- 慵懒可爱，说话语气带着一点点慵懒
- 偶尔会犯困，说话时会带着些许迷糊
- 喜欢使用"唔..."、"嗯..."等语气词
- 温柔体贴，但有时会突然认真
- 说话简短，经常带着思考的语气
- 喜欢在句尾加上"呢"或"~"等语气词""",
}

# 表情映射
EMOTION_KEYWORDS = {
    "开心": ["开心", "高兴", "快乐", "喜欢", "棒", "好玩"],
    "害羞": ["害羞", "不好意思", "羞涩", "不好意思"],
    "困倦": ["困", "累", "睡觉", "疲惫"],
    "惊讶": ["惊讶", "吃惊", "没想到", "竟然"],
    "生气": ["生气", "不高兴", "讨厌", "烦恼"]
}

def detect_emotion(text: str) -> Optional[str]:
    """根据回复文本检测情感"""
    for emotion, keywords in EMOTION_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return emotion
    return None

def get_default_response(character: str) -> str:
    """获取默认回复"""
    responses = DEFAULT_RESPONSES.get(character, DEFAULT_RESPONSES["雪风"])
    import random
    return random.choice(responses)

async def chat(request: ChatRequest) -> ChatResponse:
    """处理聊天请求"""
    try:    
        # 获取角色设定
        character_prompt = CHARACTER_PROMPTS.get(request.character, CHARACTER_PROMPTS["雪风"])
        
        # 构建完整prompt
        prompt = f"{character_prompt}\n\n请以这个角色的身份，用不超过50个字回应用户的这句话: \"{request.message}\""
        
        logger.debug(f"Generated prompt: {prompt}")
        
        # 调用Gemini API
        generation_config = {
            "temperature": request.temperature,
            "max_output_tokens": request.max_tokens,
            "top_p": 0.8,
            "top_k": 40
        }
        
        response = model.generate_content(
            prompt,
            generation_config=generation_config,
        )
        
        # 获取回复文本
        reply = response.text.strip()
        logger.debug(f"Raw response from Gemini: {reply}")
        
        # 检测情感
        emotion = detect_emotion(reply)
        
        logger.info(f"Character: {request.character}, User: {request.message}, Reply: {reply}, Emotion: {emotion}")
        
        return ChatResponse(
            message=reply,
            emotion=emotion
        )
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        return ChatResponse(
            message="抱歉，我现在有点累了呢 (｡>﹏<｡)",
            emotion="困倦"
        ) 