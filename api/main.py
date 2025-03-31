from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from core.config import get_settings
from core.logger import setup_logging, logger
from apps.english_chunk.routes import router as english_chunk_router
from apps.live2d.routes import router as live2d_router

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
    logger.info("Starting up application")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"API Version: {settings.API_V1_STR}")
    logger.info(f"Available routers: english_chunk, live2d")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down application")

# Health check endpoint
@app.get("/health")
async def health_check():
    logger.info("Health check requested")
    return {"status": "healthy"}

@app.get("/")
def read_root():
    return {"message": "Welcome to the API"} 