import os
from openai import OpenAI, BadRequestError
from core.config import get_settings
from core.logger import logger
from typing import List, Dict, Any, Optional
import openai

# Initialize settings
settings = get_settings()
XAI_API_KEY = settings.XAI_API_KEY
XAI_BASE_URL = getattr(settings, 'XAI_BASE_URL', 'https://api.x.ai/v1')

if not XAI_API_KEY:
    logger.error("XAI_API_KEY environment variable is not set")
    raise ValueError("XAI_API_KEY environment variable is not set")

# Create OpenAI client for grok
client = OpenAI(
    api_key=XAI_API_KEY,
    base_url=XAI_BASE_URL
)


def xai_chat(
    messages: Optional[List[Dict[str, Any]]] = None,
    prompt: Optional[str] = None,
    image_urls: Optional[List[str]] = None,
    detail: str = 'high',
    model: str = 'grok-3-mini-beta',
) -> str:
    """
    Send chat messages to the Grok model via XAI API, supporting optional image and text.

    Args:
        messages: Existing list of message dicts (optional).
        prompt: Text prompt to send if messages not provided.
        image_urls: List of URLs or base64 strings of images to include.
        detail: Detail level for image_url content.
        model: Model identifier for the XAI API.

    Returns:
        The assistant's response content.
    """
    # Build messages if not provided
    if messages is None:
        if not prompt and not image_urls:
            raise ValueError('Either messages, prompt, or image_urls must be provided')
        content: List[Dict[str, Any]] = []
        # add images only if model supports vision (e.g., contains 'vision')
        if image_urls:
            if 'vision' in model:
                for img in image_urls:
                    # detect URL vs base64
                    if img.startswith('http'):
                        url = img
                    elif img.startswith('data:'):
                        url = img
                    else:
                        url = f'data:image/png;base64,{img}'
                    content.append({
                        'type': 'image_url',
                        'image_url': {
                            'url': url,
                            'detail': detail
                        }
                    })
            else:
                logger.warning(f"Model '{model}' does not support image input; ignoring image_urls.")
        # add text prompt if provided
        if prompt:
            content.append({'type': 'text', 'text': prompt})
        messages = [{'role': 'user', 'content': content}]
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=messages
        )
        # Extract content from the first choice
        choice = completion.choices[0]
        # New OpenAI client returns .message.content
        if hasattr(choice, 'message'):
            return choice.message.content
        # Fallback to .text for older responses
        return getattr(choice, 'text', '')
    except BadRequestError as e:
        logger.error(f"XAI API returned 400 Bad Request.")
        # Try to log more details from the error object
        logger.error(f"Error details: Status Code={e.status_code}, Response Body={e.body}")
        # The raw response might be helpful
        if hasattr(e, 'response') and e.response:
             try:
                 logger.error(f"Raw HTTP Response: {e.response.text}")
             except Exception:
                 logger.error("Could not decode raw HTTP response body.")
        raise # Re-raise the specific error
    # --- End Specific Error Handling ---
    except openai.AuthenticationError as e:
         logger.error(f"XAI Authentication Error: Check your API Key. Details: {e}")
         raise
    except openai.RateLimitError as e:
         logger.error(f"XAI Rate Limit Exceeded. Details: {e}")
         raise
    except openai.APIConnectionError as e:
        logger.error(f"Failed to connect to XAI API at {XAI_BASE_URL}. Details: {e}")
        raise
    except Exception as e:
        logger.error(f"An unexpected error occurred during XAI chat request: {e}", exc_info=True)
        raise

def xai_image_generate(
    prompt: str,
    model: str = 'grok-2-image',
    n: int = 1,
    response_format: str = 'url',
    user: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Generate images using XAI API's image generation endpoint.

    Args:
        prompt: The text prompt describing the desired image.
        model: The image generation model, e.g., 'dall-e-3'.
        n: Number of images to generate.
        response_format: Format of the response ('url' or 'b64_json').
        user: Optional user identifier for the image generation.

    Returns:
        A list of generated image URLs or base64 strings.
    """
    try:
        # Call the image generations API endpoint
        params: Dict[str, Any] = {
            'model': model,
            'prompt': prompt,
            'n': n,
            'response_format': response_format,
        }
        if user:
            params['user'] = user
        response = client.images.generate(**params)
        # Extract data entries: url and revised_prompt
        results: List[Dict[str, Any]] = []
        for item in getattr(response, 'data', []):
            entry: Dict[str, Any] = {}
            # revised prompt always included
            if hasattr(item, 'revised_prompt'):
                entry['revised_prompt'] = item.revised_prompt
            # include image content based on response_format
            if response_format == 'url' and hasattr(item, 'url'):
                entry['url'] = item.url
            elif response_format == 'b64_json' and hasattr(item, 'b64_json'):
                entry['b64_json'] = item.b64_json
            else:
                # fallback: include both if present
                if hasattr(item, 'url'):
                    entry['url'] = item.url
                if hasattr(item, 'b64_json'):
                    entry['b64_json'] = item.b64_json
            results.append(entry)
        return results
    except Exception as e:
        logger.error(f"XAI image generation failed: {e}", exc_info=True)
        raise