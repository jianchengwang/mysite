import google.generativeai as genai
import time
from core.config import get_settings
from core.logger import logger
from typing import Optional, List, Dict, Any

# Initialize settings and configure Google API key
settings = get_settings()
if not settings.GOOGLE_API_KEY:
    logger.error("GOOGLE_API_KEY environment variable is not set")
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

genai.configure(api_key=settings.GOOGLE_API_KEY)
# Removed import-time logging to avoid handler initialization issues


def genai_generate(
    prompt: str,
    model_name: str = 'gemini-2.0-flash',
    generation_config: Optional[Dict[str, Any]] = None,
    safety_settings: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """
    Generate content using Google Gemini models.

    Args:
        prompt: The input prompt string.
        model_name: The Gemini model to use.
        generation_config: Configuration for temperature, top_p, etc.
        safety_settings: Optional safety settings list.

    Returns:
        The generated text response.
    """
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            # instantiate with provided configs
            model = genai.GenerativeModel(
                model_name=model_name,
                generation_config=generation_config or {},
                safety_settings=safety_settings or []
            )
            response = model.generate_content(
                prompt,
                generation_config=generation_config or {},
                safety_settings=safety_settings or []
            )
            return response.text or ""
        except Exception as e:
            msg = str(e)
            # retry on deadline exceeded, HTTP 503/504 or model overloaded
            if any(keyword in msg for keyword in ["Deadline Exceeded", "503", "504", "overloaded"]):
                logger.warning(f"GenAI call attempt {attempt}/{max_retries} failed: {msg}, retrying...")
                if attempt < max_retries:
                    time.sleep(2 ** attempt)
                    continue
            logger.error(f"GenAI call failed: {msg}", exc_info=True)
            raise 