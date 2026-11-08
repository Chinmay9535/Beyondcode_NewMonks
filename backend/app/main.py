"""DrishtiSaathi API."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import llm
from .config import get_settings
from .db import init_db
from .routers import patient, staff
from .services import lenses
from .services import tts as tts_service

logging.basicConfig(level=logging.INFO)
logging.getLogger("httpx").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if get_settings().seed_demo_data:
        from .seed import seed

        seed()
    yield


app = FastAPI(title="DrishtiSaathi API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(patient.router)
app.include_router(staff.router)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/meta")
def meta():
    s = get_settings()
    return {
        "clinic": lenses.clinic_config()["clinic"],
        "ai": llm.provider_label(),
        "tts": tts_service.provider() != "none",
        "tts_provider": tts_service.provider(),
        "curves": lenses.curves(),
        "conditions": lenses.CONDITIONS,
        "languages": {"kn": "ಕನ್ನಡ", "hi": "हिन्दी", "ta": "தமிழ்", "en": "English"},
    }


@app.get("/api/safety")
def safety():
    """Live safety scorecard (rules only; see services/evaluation.py)."""
    from .services.evaluation import scorecard

    return scorecard()


class TryText(BaseModel):
    text: str = Field(min_length=1, max_length=500)


@app.post("/api/safety/try")
def safety_try(body: TryText):
    """Triage one message with the rules, without storing anything."""
    from .services.redflag import detect_rules

    return detect_rules(body.text)




class Speak(BaseModel):
    text: str = Field(min_length=1, max_length=1500)
    lang: str = "en"


@app.post("/api/tts")
def tts(body: Speak):
    """Natural speech in the patient's language (Sarvam Bulbul, else Azure). 204 when no
    provider is configured; the browser then uses its own best voice."""
    try:
        out = tts_service.synthesize(body.text, body.lang)
    except tts_service.TTSError as e:
        raise HTTPException(502, str(e)) from e
    if out is None:
        return Response(status_code=204)
    audio, media = out
    return Response(content=audio, media_type=media, headers={"Cache-Control": "private, max-age=86400"})
