import hashlib
import xml.etree.ElementTree as ET
import requests
import time
from core.config import get_settings
from wechatpy.crypto import WeChatCrypto
from wechatpy import parse_message
from wechatpy.replies import TextReply
from wechatpy.utils import check_signature
from wechatpy import WeChatClient
from apps.xai.service import chat_service, image_service
import logging

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
        reply = None # 初始化 reply

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