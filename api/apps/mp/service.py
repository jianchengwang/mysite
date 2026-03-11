import base64
import binascii
import logging
import mimetypes
import re
import time
from typing import Optional, Tuple
from fastapi import HTTPException
import httpx
from wechatpy import WeChatClient, parse_message
from wechatpy.crypto import WeChatCrypto
from wechatpy.replies import TextReply
from wechatpy.utils import check_signature

from apps.mp.models import SaveWechatDraftRequest, SaveWechatDraftResponse
from apps.xai.service import chat_service, image_service
from core.config import get_settings

# 你的公众号Token（需与微信公众平台设置一致）
settings = get_settings()
MP_APPID = settings.MP_APPID
MP_APPSECRET = settings.MP_APPSECRET
MP_TOKEN = settings.MP_TOKEN
MP_ENCODING_AES_KEY = settings.MP_ENCODING_AES_KEY
_access_token = None
_access_token_expires_at = 0
crypto = None
if MP_TOKEN and MP_ENCODING_AES_KEY and MP_APPID:
    crypto = WeChatCrypto(MP_TOKEN, MP_ENCODING_AES_KEY, MP_APPID)

client = None
if MP_APPID and MP_APPSECRET:
    client = WeChatClient(MP_APPID, MP_APPSECRET)

xai_cache = {}
CACHE_TTL = 120  # 120秒
IMAGE_TAG_PATTERN = re.compile(r'(<img\b[^>]*?\bsrc=["\'])([^"\']+)(["\'][^>]*>)', re.IGNORECASE)
DATA_URL_PATTERN = re.compile(r'^data:(?P<mime>[\w/+.-]+);base64,(?P<data>.+)$', re.IGNORECASE)
WECHAT_CONTENT_IMAGE_PATTERN = re.compile(r'^https://mmbiz\.qpic\.cn/', re.IGNORECASE)


def get_msg_key(msg):
    # 用FromUserName+MsgId唯一标识一条消息
    return f"{msg.source}:{getattr(msg, 'id', getattr(msg, 'msg_id', ''))}"


def check_wechat_signature(signature: str, timestamp: str, nonce: str) -> bool:
    """用wechatpy校验微信签名"""
    try:
        check_signature(MP_TOKEN, signature, timestamp, nonce)
        return True
    except Exception as e:
        print(f"微信签名验证失败: {e}")
        return False


def handle_wechat_message(body: bytes, msg_signature: str = None, timestamp: str = None, nonce: str = None, encrypt_type: str = None) -> str:
    """
    处理微信消息，支持明文和加密模式，使用wechatpy消息对象优雅处理。
    """
    try:
        # 解密（如有加密）
        if encrypt_type == 'aes' and crypto and msg_signature and timestamp and nonce:
            xml = crypto.decrypt_message(body, msg_signature, timestamp, nonce)
        else:
            xml = body

        # 解析消息对象
        msg = parse_message(xml)
        reply = None  # 初始化 reply

        if msg.type == 'text':
            key = get_msg_key(msg)
            now = time.time()
            # 清理过期缓存
            expired_keys = [k for k, v in xai_cache.items() if now - v['ts'] > CACHE_TTL]
            for k in expired_keys:
                del xai_cache[k]
            if key in xai_cache:
                reply_content = xai_cache[key]['data']
                logging.info(f"命中XAI缓存: {key}")
            else:
                content = msg.content.strip()
                logging.info(f"处理文本消息: {content}")
                if content.lower().startswith('img '):
                    prompt = content[4:].strip() or 'A cat'
                    logging.info(f"调用XAI图片生成, prompt: {prompt}")
                    try:
                        images = image_service(prompt, model='grok-2-image', n=1, response_format='url')
                        logging.info(f"XAI图片生成原始返回: {images}")
                        if images and isinstance(images, list) and images[0].get('url'):
                            reply_content = f"图片生成成功：{images[0]['url']}"
                        else:
                            reply_content = "图片生成失败，请稍后再试。"
                    except Exception as e:
                        logging.exception(f"XAI图片生成异常: {e}")
                        reply_content = f"图片生成异常：{e}"
                else:
                    logging.info(f"调用XAI文本生成, prompt: {content}")
                    try:
                        ai_reply = chat_service(content)
                        reply_content = ai_reply if ai_reply else "抱歉，AI没有返回内容。"
                    except Exception as e:
                        logging.exception(f"XAI文本生成异常: {e}")
                        reply_content = f"AI生成异常：{e}"
                xai_cache[key] = {'data': reply_content, 'ts': now}
            reply = TextReply(content=reply_content, message=msg)
        elif msg.type == 'image':
            logging.info("处理图片消息")
            reply = TextReply(content="收到你的图片啦！", message=msg)
        else:
            logging.info(f"处理其他类型消息: {msg.type}")
            reply = TextReply(content="暂不支持该类型消息", message=msg)

        if reply:
            reply_xml = reply.render()
            # 加密回复（如有加密）
            if encrypt_type == 'aes' and crypto and msg_signature and timestamp and nonce:
                encrypted_xml = crypto.encrypt_message(reply_xml, nonce, timestamp)
                return encrypted_xml
            return reply_xml
        else:
            logging.warning("未能生成有效回复对象(reply)")
            return ""

    except Exception as e:
        logging.exception(f"微信消息处理异常: {e}")
        return ""


def get_wechat_access_token(force_refresh: bool = False) -> str:
    """用wechatpy自动管理access_token，force_refresh时强制刷新"""
    if not client:
        raise Exception("WeChatClient未初始化")
    if force_refresh:
        client.fetch_access_token()
    return client.access_token


def _resolve_access_token(access_token: Optional[str]) -> str:
    resolved_access_token = (access_token or "").strip()
    if not resolved_access_token:
        raise HTTPException(status_code=400, detail="Missing WeChat access_token.")
    return resolved_access_token


async def _download_image_bytes(image_ref: str) -> Tuple[bytes, str, str]:
    if not image_ref:
        raise HTTPException(status_code=400, detail="Image source is empty.")

    data_url_match = DATA_URL_PATTERN.match(image_ref)
    if data_url_match:
        mime_type = data_url_match.group("mime") or "image/png"
        try:
            image_bytes = base64.b64decode(data_url_match.group("data"), validate=True)
        except binascii.Error as exc:
            raise HTTPException(status_code=400, detail="Invalid base64 image data.") from exc

        extension = mimetypes.guess_extension(mime_type) or ".png"
        return image_bytes, mime_type, f"image{extension}"

    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as http_client:
        response = await http_client.get(image_ref)

    if response.status_code >= 400:
        raise HTTPException(status_code=400, detail=f"Failed to download image: {image_ref}")

    mime_type = response.headers.get("content-type", "image/png").split(";")[0]
    extension = mimetypes.guess_extension(mime_type) or ".png"
    return response.content, mime_type, f"image{extension}"


async def _upload_content_image(access_token: str, image_ref: str) -> str:
    image_bytes, mime_type, filename = await _download_image_bytes(image_ref)

    async with httpx.AsyncClient(timeout=60.0) as http_client:
        response = await http_client.post(
            "https://api.weixin.qq.com/cgi-bin/media/uploadimg",
            params={"access_token": access_token},
            files={"media": (filename, image_bytes, mime_type)}
        )

    data = response.json()
    if response.status_code >= 400 or data.get("errcode"):
        raise HTTPException(status_code=400, detail=data.get("errmsg") or "Failed to upload WeChat content image.")

    url = data.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="WeChat content image URL missing in response.")

    return url


async def _upload_thumb_material(access_token: str, image_ref: str) -> str:
    image_bytes, mime_type, filename = await _download_image_bytes(image_ref)

    async with httpx.AsyncClient(timeout=60.0) as http_client:
        response = await http_client.post(
            "https://api.weixin.qq.com/cgi-bin/material/add_material",
            params={"access_token": access_token, "type": "thumb"},
            files={"media": (filename, image_bytes, mime_type)}
        )

    data = response.json()
    if response.status_code >= 400 or data.get("errcode"):
        raise HTTPException(status_code=400, detail=data.get("errmsg") or "Failed to upload WeChat draft cover.")

    media_id = data.get("media_id")
    if not media_id:
        raise HTTPException(status_code=400, detail="WeChat cover media_id missing in response.")

    return media_id


def _extract_first_image_source(html: str) -> Optional[str]:
    match = IMAGE_TAG_PATTERN.search(html or "")
    if not match:
        return None
    return match.group(2)


async def _replace_inline_images(access_token: str, html: str) -> str:
    if not html:
        return html

    replacements: dict[str, str] = {}

    for match in IMAGE_TAG_PATTERN.finditer(html):
        src = match.group(2)
        if src in replacements or WECHAT_CONTENT_IMAGE_PATTERN.match(src):
            continue
        replacements[src] = await _upload_content_image(access_token, src)

    return IMAGE_TAG_PATTERN.sub(
        lambda match: f"{match.group(1)}{replacements.get(match.group(2), match.group(2))}{match.group(3)}",
        html
    )


async def save_wechat_draft(payload: SaveWechatDraftRequest) -> SaveWechatDraftResponse:
    access_token = _resolve_access_token(payload.access_token)
    processed_content = await _replace_inline_images(access_token, payload.content)

    cover_source = payload.cover_image_data_url or payload.cover_image_url or _extract_first_image_source(payload.content)
    if not cover_source:
        raise HTTPException(status_code=400, detail="A cover image is required. Upload one or include an image in the article.")

    thumb_media_id = await _upload_thumb_material(access_token, cover_source)

    article = {
        "title": payload.title,
        "author": payload.author,
        "digest": payload.digest,
        "content": processed_content,
        "content_source_url": payload.content_source_url,
        "thumb_media_id": thumb_media_id,
        "show_cover_pic": payload.show_cover_pic,
        "need_open_comment": payload.need_open_comment,
        "only_fans_can_comment": payload.only_fans_can_comment
    }

    async with httpx.AsyncClient(timeout=60.0) as http_client:
        response = await http_client.post(
            "https://api.weixin.qq.com/cgi-bin/draft/add",
            params={"access_token": access_token},
            json={"articles": [article]}
        )

    data = response.json()
    if response.status_code >= 400 or data.get("errcode"):
        raise HTTPException(status_code=400, detail=data.get("errmsg") or "Failed to save WeChat draft.")

    media_id = data.get("media_id")
    if not media_id:
        raise HTTPException(status_code=400, detail="WeChat draft media_id missing in response.")

    return SaveWechatDraftResponse(media_id=media_id, article_count=1)
