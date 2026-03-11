from pydantic import BaseModel, Field

class SaveWechatDraftRequest(BaseModel):
    access_token: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, max_length=64)
    author: str = Field(default="", max_length=64)
    digest: str = Field(default="", max_length=120)
    content: str = Field(..., min_length=1)
    content_source_url: str = Field(default="")
    cover_image_data_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    need_open_comment: int = Field(default=0, ge=0, le=1)
    only_fans_can_comment: int = Field(default=0, ge=0, le=1)
    show_cover_pic: int = Field(default=1, ge=0, le=1)


class SaveWechatDraftResponse(BaseModel):
    media_id: str
    article_count: int = 1
