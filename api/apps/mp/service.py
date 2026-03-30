import base64
import binascii
import mimetypes
import re
from typing import Optional, Tuple

import httpx
from fastapi import HTTPException

from apps.mp.models import SaveWechatDraftRequest, SaveWechatDraftResponse
IMAGE_TAG_PATTERN = re.compile(r'(<img\b[^>]*?\bsrc=["\'])([^"\']+)(["\'][^>]*>)', re.IGNORECASE)
DATA_URL_PATTERN = re.compile(r'^data:(?P<mime>[\w/+.-]+);base64,(?P<data>.+)$', re.IGNORECASE)
WECHAT_CONTENT_IMAGE_PATTERN = re.compile(r'^https://mmbiz\.qpic\.cn/', re.IGNORECASE)


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
