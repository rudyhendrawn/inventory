import logging
import json
import sys
import asyncio
from fastapi import Request
from typing import Any, Dict
from core.config import settings

class JSONFormatter(logging.Formatter):
    """Custom logging formatter to output logs in JSON format."""

    def format(self, record: logging.LogRecord) -> str:
        # Create base log entry
        log_entry = {
            "timestamp": self.formatTime(record, self.default_time_format),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Add extra fields from record
        item_records = [
            'name', 'msg', 'args', 'levelname', 'levelno', 'pathname',
                'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
                'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                'thread', 'threadName', 'processName', 'process', 'message'
        ] 
        for key, value in record.__dict__.items():
            if key not in item_records:
                log_entry[key] = value
        
        return json.dumps(log_entry, default=str)
    
def configure_logging() -> None:
    """Configure structured logging with JSON output."""

    # Create logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    # Console handler with JSON formatter
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JSONFormatter())
    logger.addHandler(console_handler)

    # Set specific levels for noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)

def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the specified name."""
    return logging.getLogger(name)

# Request context helpers
def add_request_context(logger: logging.Logger, method_name: str, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Add request context to log entries."""
    try:
        loop = asyncio.get_running_loop()
        request = getattr(loop, '_current_request', None)
        if request:
            event_dict.update({
                "request_id": getattr(request.state, 'request_id', 'unknown'),
                "user_id": getattr(request.state, 'user_id', None),
                "method": request.method,
                "url": str(request.url),
                "client_host": getattr(request.client, 'host', 'unknown') if request.client else 'unknown',
            })
    except RuntimeError:
        # No running event loop
        pass

    return event_dict
