import logging
import sys
from pathlib import Path
from loguru import logger
import json
from datetime import datetime

# 创建日志目录
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

# 配置日志格式
def formatter(record):
    """自定义日志格式"""
    # Format the time directly from the record
    time_str = record["time"].strftime("%Y-%m-%d %H:%M:%S.%f%z")
    
    # 构建基本日志数据
    log_data = {
        "timestamp": time_str,
        "level": record["level"].name,
        "message": record["message"],
        "module": record["module"],
        "function": record["function"],
        "line": record["line"]
    }
    
    # 添加额外信息（如果有）
    if record["extra"]:
        log_data["extra"] = {k: str(v) for k, v in record["extra"].items()}
    
    # 添加异常信息（如果有）
    if record["exception"]:
        log_data["exception"] = str(record["exception"])
    
    return json.dumps(log_data, ensure_ascii=False)

# 配置日志输出
logger.remove()  # 移除默认的处理器

# 添加控制台输出
logger.add(
    sys.stdout,
    format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {message}",
    level="INFO",
    enqueue=True,
    diagnose=True,
)

# 添加文件输出
logger.add(
    LOG_DIR / "api_{time}.log",
    format=formatter,
    level="DEBUG",
    rotation="1 day",  # 每天轮换一次日志文件
    retention="30 days",  # 保留30天的日志
    enqueue=True,
    diagnose=True,
    encoding="utf-8",
    serialize=False  # 禁用序列化，因为我们使用自定义formatter
)

# 创建一个拦截器来捕获FastAPI的日志
class InterceptHandler(logging.Handler):
    def emit(self, record):
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )

# 配置FastAPI的日志
def setup_logging():
    # 移除所有的handlers
    logging.root.handlers = []
    
    # 设置日志级别
    logging.root.setLevel(logging.INFO)
    
    # 添加我们的拦截器
    logging.root.addHandler(InterceptHandler())
    
    # 设置uvicorn和fastapi的日志
    for name in ("uvicorn.access", "uvicorn.error", "fastapi"):
        logging_logger = logging.getLogger(name)
        logging_logger.handlers = []
        logging_logger.addHandler(InterceptHandler()) 