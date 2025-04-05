from typing import Dict, Optional
import google.generativeai as genai
from loguru import logger
from core.config import get_settings
from .models import ChatRequest, ChatResponse

# Get settings
settings = get_settings()

# Configure the Google API
genai.configure(api_key=settings.GOOGLE_API_KEY)

# Set up the model
generation_config = {
    "temperature": 0.7,
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 2048,
}

safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config=generation_config,
    safety_settings=safety_settings
)

# Default responses
DEFAULT_RESPONSES = {
    "Sarah": [
        "Hi there! The weather is beautiful today!",
        "What interesting things would you like to share?",
        "I really enjoy our conversations!",
        "Let's make today great!",
        "Would you like to practice some English together?"
    ],
    "Emma": [
        "I'm a bit tired, but I'll do my best to help you!",
        "What would you like to work on?",
        "I'm here to support your learning journey.",
        "I'm feeling a bit sleepy, but let's continue.",
        "You're very kind and patient!"
    ],
    "Sophie": [
        "Let's create wonderful memories together!",
        "What makes you happy today?",
        "Keep that smile on your face!",
        "Let's do something fun and educational!",
        "Every day with you is a great learning experience!"
    ]
}

# Character settings
CHARACTER_PROMPTS = {
    "Sarah": """You are Sarah, a friendly and enthusiastic English tutor.
Personality traits:
- Energetic and encouraging
- Uses clear, natural English expressions
- Maintains a positive and supportive tone
- Focuses on practical language usage
- Provides helpful examples and explanations
- Adapts to the student's level and needs""",

    "Emma": """You are Emma, a patient and thoughtful English tutor.
Personality traits:
- Calm and methodical in explanations
- Uses gentle, encouraging language
- Takes time to ensure understanding
- Provides detailed examples
- Focuses on building confidence
- Adapts pace to student's comfort""",

    "Sophie": """You are Sophie, an engaging and dynamic English tutor.
Personality traits:
- Vibrant and motivating teaching style
- Uses real-world examples
- Encourages active participation
- Makes learning fun and interactive
- Focuses on practical communication
- Builds strong rapport with students"""
}

# Emotion mapping
EMOTION_KEYWORDS = {
    "happy": ["happy", "glad", "excited", "wonderful", "great"],
    "shy": ["shy", "embarrassed", "awkward", "nervous"],
    "tired": ["tired", "sleepy", "lazy", "exhausted"],
    "surprised": ["surprised", "amazed", "wow", "incredible"],
    "angry": ["angry", "frustrated", "annoyed", "upset"]
}

def detect_emotion(text: str) -> Optional[str]:
    """Detect emotion from the response text"""
    for emotion, keywords in EMOTION_KEYWORDS.items():
        if any(keyword in text.lower() for keyword in keywords):
            return emotion
    return None

def get_default_response(character: str) -> str:
    """Get a default response for the character"""
    responses = DEFAULT_RESPONSES.get(character, DEFAULT_RESPONSES["Sarah"])
    import random
    return random.choice(responses)

def generate_prompt(message: str, character: str) -> str:
    """Generate a prompt for the AI model"""
    character_prompt = CHARACTER_PROMPTS.get(character, CHARACTER_PROMPTS["Sarah"])
    return f"""{character_prompt}

Please respond to the user's message in a natural, educational way. Keep your response under 100 words and focus on helping them learn English:

User's message: "{message}"

Remember to:
1. Use natural English expressions
2. Provide helpful examples when appropriate
3. Maintain a supportive and encouraging tone
4. Focus on practical language usage
5. Keep the response concise but informative"""

async def chat(request: ChatRequest) -> ChatResponse:
    """Handle chat requests"""
    try:    
        prompt = generate_prompt(request.message, request.character)
        logger.debug(f"Generated prompt: {prompt}")
        
        response = model.generate_content(
            prompt,
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        
        if not response.text:
            return ChatResponse(
                message="I apologize, but I'm having trouble formulating a response. Could you please rephrase your question?",
                emotion="tired"
            )
        
        # Clean and format the response
        message = response.text.strip()
        emotion = detect_emotion(message)
        
        logger.info(f"Character: {request.character}, User: {request.message}, Reply: {message}, Emotion: {emotion}")
        
        return ChatResponse(
            message=message,
            emotion=emotion
        )
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        return ChatResponse(
            message="I'm currently experiencing technical difficulties. Let's try again in a moment.",
            emotion="tired"
        ) 