import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from core.logging import get_logger

logger = get_logger(__name__)

class LoggingMiddleware (BaseHTTPMiddleware):
    """Middleware to log incoming requests and outgoing responses."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Extract user ID if available (from auth middleware)
        user_id = getattr(request.state, 'user_id', None)

        # Log request
        start_time = time.time()
        logger.info(
            "Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "user_id": user_id,
                "client_ip": getattr(request.client, 'host', 'unknown') if request.client else 'unknown',
                "header": dict(request.headers)
            }
        )

        try:
            # Process request
            response = await call_next(request)

            # Calculate processing time
            process_time = time.time() - start_time

            # Log response
            logger.info(
                "Request completed",
                extra={
                    "request_id": request_id,
                    "status_code": response.status_code,
                    "process_time": process_time,
                    "response_headers": dict(response.headers),
                }
            )

            # Add request ID to response headers for debugging
            response.headers["X-Request-ID"] = request_id

            return response
        except Exception as e:
            # Log exception
            process_time = time.time() - start_time
            logger.error(
                "Request failed",
                extra={
                    "request_id": request_id,
                    "error": str(e),
                    "process_time": f"{process_time:.3f}s",
                },
                exc_info=True
            )
            raise

class AuthContextMiddleware (BaseHTTPMiddleware):
    """Middleware to extract user context from auth dependecies"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # This will be populated by auth dependencies, if any
        return await call_next(request)
