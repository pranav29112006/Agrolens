"""AgroLens API: leaf diagnosis, treatment advice and local weather for the mobile app.

Run from the backend folder:  uvicorn app.main:app --reload --port 8000
"""

import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.advisory.assistant import Assistant
from app.advisory.gemini import Gemini
from app.advisory.knowledge import KnowledgeBase
from app.advisory.writer import AdviceWriter
from app.config import get_settings
from app.routes import diagnose, health, library, weather
from app.supabase import SupabaseClient
from app.vision.classifier import LeafClassifier

logger = logging.getLogger("agrolens")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    async with httpx.AsyncClient(timeout=15) as http:
        app.state.http = http
        app.state.supabase = SupabaseClient(settings, http)
        app.state.classifier = LeafClassifier.load(settings.classifier_path)
        if app.state.classifier is None:
            logger.warning("No model at %s; /diagnose will return 503 until one is exported.", settings.classifier_path)
        app.state.knowledge = KnowledgeBase.load(settings.kb_dir)
        gemini = Gemini(http, settings.gemini_api_key, settings.gemini_models)
        app.state.writer = AdviceWriter(gemini)
        app.state.assistant = Assistant(gemini, app.state.knowledge)
        logger.info(
            "Knowledge base: %d diseases; Gemini %s",
            len(app.state.knowledge.labels),
            settings.gemini_models[0] if gemini.enabled else "off (no GEMINI_API_KEY)",
        )
        yield


app = FastAPI(title="AgroLens API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router)
app.include_router(weather.router)
app.include_router(diagnose.router)
app.include_router(library.router)
