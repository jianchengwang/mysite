from pydantic import BaseModel
from typing import List

class ChunkRequest(BaseModel):
    num_chunks: int
    topic: str

class Chunk(BaseModel):
    phrase: str
    examples: List[str]

class Scenario(BaseModel):
    title: str
    context: str
    content: str

class ChunkResponse(BaseModel):
    chunks: List[Chunk]
    scenario: Scenario 