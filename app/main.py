"""DORMANT FastAPI app factory (ADR-0057). Activate only on an ADR-0002 trigger."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from . import __version__
from .config import Settings, origins
from .routers import content


def create_app() -> FastAPI:
    settings = Settings()
    app = FastAPI(title="PhaseFlow (dormant API)", version=__version__)
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins(settings) or ["*"],
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    app.include_router(content.router)

    @app.get("/health")
    @app.get("/healthz")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
