"""DrishtiSaathi API."""
from __future__ import annotations

import html
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
        "tts": bool(s.azure_speech_key and s.azure_speech_region),
        "curves": lenses.curves(),
        "conditions": lenses.CONDITIONS,
        "languages": {"kn": "ಕನ್ನಡ", "hi": "हिन्दी", "ta": "தமிழ்", "en": "English"},
    }


VOICES = {"kn": ("kn-IN", "kn-IN-SapnaNeural"), "hi": ("hi-IN", "hi-IN-SwaraNeural"), "ta": ("ta-IN", "ta-IN-PallaviNeural"), "en": ("en-IN", "en-IN-NeerjaNeural")}


class Speak(BaseModel):
    text: str = Field(min_length=1, max_length=1500)
    lang: str = "en"


@app.post("/api/tts")
def tts(body: Speak):
    """Neural speech for Indian languages via Azure AI Speech. 204 when not configured
    (the browser then falls back to its built-in voices)."""
    s = get_settings()
    if not (s.azure_speech_key and s.azure_speech_region):
        return Response(status_code=204)
    locale, voice = VOICES.get(body.lang, VOICES["en"])
    ssml = f"<speak version='1.0' xml:lang='{locale}'><voice name='{voice}'><prosody rate='-8%'>{html.escape(body.text)}</prosody></voice></speak>"
    try:
        r = httpx.post(
            f"https://{s.azure_speech_region}.tts.speech.microsoft.com/cognitiveservices/v1",
            headers={"Ocp-Apim-Subscription-Key": s.azure_speech_key, "Content-Type": "application/ssml+xml",
                     "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3", "User-Agent": "drishtisaathi"},
            content=ssml.encode(), timeout=20,
        )
        r.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Speech service error: {e}") from e
    return Response(content=r.content, media_type="audio/mpeg")
