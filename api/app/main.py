from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers import auth, users_route, units_route, test_auth
from app.middleware import LoggingMiddleware, AuthContextMiddleware
from db.pool import init_pool, close_pool
from core.logging import configure_logging
from core.config import settings
import uvicorn


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Configure logging
    configure_logging()

    # Startup: Initialize DB pool
    init_pool()
    yield

    # Shutdown: Close DB pool
    close_pool()

app = FastAPI(title="Inventory API", version="1.0.0", lifespan=lifespan)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        *settings.CORS_ORIGINS,
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# CORS middleware (restrict to LAN only)
app.middleware("http")(LoggingMiddleware)
app.middleware("http")(AuthContextMiddleware)

app.include_router(auth.router)
app.include_router(users_route.router)
# app.include_router(items_route.router)
app.include_router(units_route.router)

if settings.DEBUG:
    app.include_router(test_auth.router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )