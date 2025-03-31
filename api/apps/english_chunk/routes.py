from fastapi import APIRouter, HTTPException
from .models import ChunkRequest, ChunkResponse, Chunk, Scenario
from .service import generate_chunks
from core.logger import logger

router = APIRouter()

@router.post("/generate", response_model=ChunkResponse)
async def generate_chunks_endpoint(request: ChunkRequest):
    try:
        result = await generate_chunks(request.topic, request.num_chunks)
        chunks = [Chunk(**chunk) for chunk in result["chunks"]]
        scenario = Scenario(**result["scenario"])
        return ChunkResponse(chunks=chunks, scenario=scenario)
    except Exception as e:
        logger.error(f"Error in generate_chunks_endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 