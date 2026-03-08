from fastapi import APIRouter
from .models import ChunkRequest, ChunkResponse, Chunk, Scenario
from .service import generate_chunks

router = APIRouter()

@router.post("/generate", response_model=ChunkResponse)
async def generate_chunks_endpoint(request: ChunkRequest):
    result = await generate_chunks(request.topic, request.num_chunks)
    chunks = [Chunk(**chunk) for chunk in result["chunks"]]
    scenario = Scenario(**result["scenario"])
    return ChunkResponse(chunks=chunks, scenario=scenario)
 
