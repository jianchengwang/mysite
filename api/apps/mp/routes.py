from fastapi import APIRouter, Request, Query, Response
from .service import handle_wechat_message, check_wechat_signature
from wechatpy.exceptions import InvalidSignatureException

router = APIRouter()

@router.get('/wechat')
def wechat_verify(signature: str = Query(...), timestamp: str = Query(...), nonce: str = Query(...), echostr: str = Query(...)):
    """微信服务器验证接口"""
    if check_wechat_signature(signature, timestamp, nonce):
      return Response(content=echostr)
    else:
      return Response(content="Invalid signature", status_code=400)

@router.post('/wechat')
async def wechat_message(request: Request, encrypt_type: str = Query(None), msg_signature: str = Query(None), timestamp: str = Query(None), nonce: str = Query(None)):
    """接收微信公众号消息，支持明文和加密模式"""
    body = await request.body()
    response_xml = handle_wechat_message(
        body,
        msg_signature=msg_signature,
        timestamp=timestamp,
        nonce=nonce,
        encrypt_type=encrypt_type
    )
    return Response(content=response_xml, media_type="application/xml") 