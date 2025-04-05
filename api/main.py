from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from core.config import get_settings
from core.logger import setup_logging, logger
from apps.english_chunk.routes import router as english_chunk_router
from apps.live2d.routes import router as live2d_router
from loguru import logger as loguru_logger
import sys

# Configure logging
loguru_logger.remove()  # Remove default handler
loguru_logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO"
)

# Set up logging
setup_logging()

# Get settings
settings = get_settings()

# Create the FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    debug=settings.DEBUG
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有源访问，方便开发
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    english_chunk_router,
    prefix=f"{settings.API_V1_STR}/english-chunk",
    tags=["english-chunk"]
)

app.include_router(
    live2d_router, 
    prefix=settings.API_V1_STR,
    tags=["live2d"]
)

@app.on_event("startup")
async def startup_event():
    loguru_logger.info("Starting up application")
    loguru_logger.info(f"Debug mode: {settings.DEBUG}")
    loguru_logger.info(f"API Version: {settings.API_V1_STR}")
    loguru_logger.info(f"Available routers: english_chunk, live2d")

@app.on_event("shutdown")
async def shutdown_event():
    loguru_logger.info("Shutting down application")

# Health check endpoint
@app.get("/health")
async def health_check():
    loguru_logger.info("Health check requested")
    return {"status": "healthy"}

@app.get("/")
def read_root():
    return {"message": "Welcome to the API"} 