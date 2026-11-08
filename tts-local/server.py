"""Local text-to-speech server: AI4Bharat Indic Parler-TTS on your own GPU. Free, offline, private.

Run it next to the DrishtiSaathi backend and set LOCAL_TTS_URL=http://localhost:8010 in backend/.env.
The backend then sends read-aloud requests here first.

    POST /tts   {"text": "...", "lang": "kn" | "hi" | "ta" | "en"}  ->  audio/wav
    GET  /health

Model: ai4bharat/indic-parler-tts (Apache 2.0). It is "gated: auto" on Hugging Face: open the model
page once, click "Agree", and log in with a free token (see README.md). Voices are chosen by a
plain-language description naming one of the model's speakers.

Set TTS_FAKE=1 to run without torch or the model (a short tone instead of speech), for testing.
"""
from __future__ import annotations

import io
import os
import re
import threading
import time
import wave

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field

MODEL_ID = os.getenv("PARLER_MODEL", "ai4bharat/indic-parler-tts")

# Female, warm voices from the model card's recommended speakers. Override with e.g. SPEAKER_KN=Suresh.
SPEAKERS = {
    "kn": os.getenv("SPEAKER_KN", "Anu"),
    "hi": os.getenv("SPEAKER_HI", "Divya"),
    "ta": os.getenv("SPEAKER_TA", "Jaya"),
    "en": os.getenv("SPEAKER_EN", "Mary"),
}
STYLE = os.getenv(
    "SPEAKER_STYLE",
    "{name} speaks slowly in a calm, warm, moderate-pitched voice, with a clear and friendly tone. "
    "The recording is very high quality with no background noise.",
)
FAKE = os.getenv("TTS_FAKE") == "1"


class Speak(BaseModel):
    text: str = Field(min_length=1, max_length=2500)
    lang: str = "en"


class Engine:
    """Loads the model once; generation is serialised (one GPU)."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.ready = False
        self.device = "fake"
        self.rate = 24000
        if FAKE:
            self.ready = True
            return
        import torch
        from parler_tts import ParlerTTSForConditionalGeneration
        from transformers import AutoTokenizer

        self.torch = torch
        if torch.cuda.is_available():
            self.device = "cuda:0"
            self.dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        else:
            self.device, self.dtype = "cpu", torch.float32
            print("WARNING: no CUDA GPU found; running on CPU will be slow.")
        t = time.time()
        self.model = ParlerTTSForConditionalGeneration.from_pretrained(MODEL_ID, torch_dtype=self.dtype).to(self.device)
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        self.desc_tokenizer = AutoTokenizer.from_pretrained(self.model.config.text_encoder._name_or_path)
        self.rate = self.model.config.sampling_rate
        self._descs: dict[str, object] = {}
        print(f"Loaded {MODEL_ID} on {self.device} ({self.dtype}) in {time.time() - t:.0f}s")
        self.ready = True
        self.speak("ನಮಸ್ಕಾರ", "kn")  # warm-up so the first real request is fast

    def _desc(self, lang: str):
        if lang not in self._descs:
            text = STYLE.format(name=SPEAKERS.get(lang, SPEAKERS["en"]))
            self._descs[lang] = self.desc_tokenizer(text, return_tensors="pt").to(self.device)
        return self._descs[lang]

    def speak(self, text: str, lang: str) -> bytes:
        if FAKE:
            return _tone(0.4, self.rate)
        import numpy as np

        desc = self._desc(lang)
        pieces = []
        with self.lock, self.torch.inference_mode():
            for chunk in chunks(text):
                prompt = self.tokenizer(chunk, return_tensors="pt").to(self.device)
                self.torch.manual_seed(7)  # same voice every time
                out = self.model.generate(
                    input_ids=desc.input_ids, attention_mask=desc.attention_mask,
                    prompt_input_ids=prompt.input_ids, prompt_attention_mask=prompt.attention_mask,
                )
                pieces.append(out.to(self.torch.float32).cpu().numpy().squeeze())
                pieces.append(np.zeros(int(self.rate * 0.18), dtype=np.float32))  # short pause between chunks
        return _wav(np.concatenate(pieces), self.rate)


def chunks(text: str, max_words: int = 25) -> list[str]:
    """Split into sentence groups of up to ~25 words (longer prompts degrade Parler output)."""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?।॥])\s+|\n+", text) if s.strip()]
    out, cur = [], ""
    for s in sentences:
        cand = f"{cur} {s}".strip()
        if cur and len(cand.split()) > max_words:
            out.append(cur)
            cur = s
        else:
            cur = cand
    if cur:
        out.append(cur)
    return out or [text]


def _wav(samples, rate: int) -> bytes:
    import numpy as np

    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2").tobytes()
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    return buf.getvalue()


def _tone(seconds: float, rate: int) -> bytes:
    import math
    import struct

    n = int(seconds * rate)
    data = b"".join(struct.pack("<h", int(8000 * math.sin(2 * math.pi * 440 * i / rate))) for i in range(n))
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(data)
    return buf.getvalue()


app = FastAPI(title="DrishtiSaathi local TTS (Indic Parler-TTS)")
engine: Engine | None = None


@app.on_event("startup")
def _load() -> None:
    global engine
    engine = Engine()


@app.get("/health")
def health():
    return {"ready": bool(engine and engine.ready), "device": engine.device if engine else None, "model": MODEL_ID, "speakers": SPEAKERS}


@app.post("/tts")
def tts(body: Speak):
    if not engine or not engine.ready:
        raise HTTPException(503, "Model is still loading")
    lang = body.lang if body.lang in SPEAKERS else "en"
    t = time.time()
    audio = engine.speak(body.text, lang)
    print(f"[{lang}] {len(body.text)} chars in {time.time() - t:.1f}s")
    return Response(content=audio, media_type="audio/wav")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "8010")))
