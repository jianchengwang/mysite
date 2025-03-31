import google.generativeai as genai
from core.config import get_settings
from core.logger import logger
from typing import List, Dict

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

def get_topic_details(topic: str) -> Dict:
    """获取主题详细信息，包括场景描述和示例情境"""
    topics = {
        "daily_routines": {
            "name": "Daily Routines",
            "description": "Morning to night activities",
            "scenarios": ["Morning preparation", "Commuting", "Work/Study", "Evening relaxation"],
        },
        "work_life": {
            "name": "Work Life",
            "description": "Office and professional situations",
            "scenarios": ["Team meetings", "Project discussions", "Client interactions", "Office communication"],
        },
        "socializing": {
            "name": "Socializing",
            "description": "Social interactions and gatherings",
            "scenarios": ["Meeting friends", "Party conversations", "Restaurant dining", "Social events"],
        },
        "travel": {
            "name": "Travel",
            "description": "Travel and tourism situations",
            "scenarios": ["Airport/Flight", "Hotel check-in", "Sightseeing", "Local transportation"],
        },
        "shopping": {
            "name": "Shopping",
            "description": "Shopping and consumer interactions",
            "scenarios": ["Retail shopping", "Online shopping", "Price negotiation", "Customer service"],
        },
        "dining": {
            "name": "Dining",
            "description": "Restaurant and food-related situations",
            "scenarios": ["Ordering food", "Making reservations", "Discussing food preferences", "Cooking"],
        },
        "health": {
            "name": "Health & Wellness",
            "description": "Health and medical situations",
            "scenarios": ["Doctor visits", "Fitness activities", "Wellness routines", "Medical emergencies"],
        },
        "education": {
            "name": "Education",
            "description": "Learning and academic situations",
            "scenarios": ["Classroom interactions", "Group study", "Teacher-student communication", "Academic discussions"],
        },
        "entertainment": {
            "name": "Entertainment",
            "description": "Leisure and entertainment activities",
            "scenarios": ["Movies/Theater", "Music events", "Sports activities", "Hobbies"],
        },
        "technology": {
            "name": "Technology",
            "description": "Tech-related situations",
            "scenarios": ["Using devices", "Tech support", "Digital services", "Online activities"],
        }
    }
    return topics.get(topic, topics["daily_routines"])

def generate_prompt(topic: str, num_chunks: int) -> str:
    topic_info = get_topic_details(topic)
    
    logger.debug(f"Generating prompt for topic: {topic_info['name']}, num_chunks: {num_chunks}")
    
    return f"""As a language learning expert, please help generate {num_chunks} useful English chunks related to the topic of {topic_info['name']} ({topic_info['description']}).

For each chunk:
1. Provide a common and practical phrase or expression
2. Give 2 example sentences showing natural usage
3. Ensure the examples are connected to create a coherent scenario

Then, create a natural conversation between Sarah and Mark that uses all the chunks. The conversation should:
1. Be natural and casual
2. Alternate between Sarah and Mark (Sarah speaks first)
3. Use each chunk at least once
4. Be about {topic_info['name']}
5. Not use any speech tags (like "said", "replied", etc.)
6. Each line should be a complete thought ending with a period, question mark, or exclamation mark

Please format the response as a JSON object with the following structure:
{{
    "chunks": [
        {{
            "phrase": "the chunk phrase",
            "examples": [
                "first example sentence",
                "second example sentence"
            ]
        }}
    ],
    "scenario": {{
        "title": "title of the scenario",
        "context": "Brief context about Sarah and Mark's conversation",
        "content": [
            "Sarah: First line of dialogue.",
            "Mark: Response to Sarah.",
            "Sarah: Another line of dialogue.",
            "Mark: Final response."
        ]
    }}
}}

Make sure most of the chunks are practical, commonly used in everyday English conversation, and the dialogue demonstrates natural usage of these chunks in context."""

async def generate_chunks(topic: str, num_chunks: int) -> Dict:
    try:
        logger.info(f"Generating chunks for topic: {topic}, num_chunks: {num_chunks}")
        prompt = generate_prompt(topic, num_chunks)
        logger.debug(f"Generated prompt: {prompt}")
        
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.8,
            "top_k": 40,
            "max_output_tokens": 2048,
        }
        
        response = model.generate_content(
            prompt,
            generation_config=generation_config,
        )
        
        logger.debug(f"Raw response from Gemini: {response.text}")
        
        # Parse the response text as JSON
        import json
        try:
            # 清理响应文本
            text = response.text.strip()
            if text.startswith('```json'):
                text = text[7:]
            if text.endswith('```'):
                text = text[:-3]
            text = text.strip()
            
            result = json.loads(text)
            
            # 处理对话内容
            if isinstance(result.get('scenario', {}).get('content'), list):
                # 如果内容是列表，转换为字符串
                dialogue_lines = result['scenario']['content']
                # 移除说话者标签，只保留对话内容
                cleaned_lines = []
                for line in dialogue_lines:
                    if ': ' in line:
                        _, content = line.split(': ', 1)
                        cleaned_lines.append(content)
                result['scenario']['content'] = ' '.join(cleaned_lines)
            
            logger.info(f"Successfully generated {len(result['chunks'])} chunks with scenario")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse response as JSON: {str(e)}")
            logger.error(f"Cleaned response text: {text}")
            raise Exception("Failed to generate valid JSON response")
        
    except Exception as e:
        logger.error(f"Error generating chunks: {str(e)}", exc_info=True)
        raise Exception(f"Failed to generate chunks: {str(e)}") 