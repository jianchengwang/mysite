import traceback

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger as loguru_logger

from apps.mp.routes import router as mp_router
from core.config import get_settings
from core.logger import setup_logging

# Set up logging
setup_logging()

# Get settings
settings = get_settings()

# Create the FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    debug=settings.DEBUG
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    loguru_logger.error(f"Unhandled exception: {str(exc)}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "message": str(exc) if settings.DEBUG else None},
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有源访问，方便开发
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    mp_router,
    prefix=f"{settings.API_V1_STR}/mp",
    tags=["mp"]
)

@app.on_event("startup")
async def startup_event():
    loguru_logger.info("Starting up application")
    loguru_logger.info(f"Debug mode: {settings.DEBUG}")
    loguru_logger.info(f"API Version: {settings.API_V1_STR}")
    loguru_logger.info("Available routers: mp")

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
    return {"message": "WeChat draft API is running"}
