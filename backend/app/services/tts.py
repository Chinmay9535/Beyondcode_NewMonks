"""Text-to-speech for the patient's language.

Providers, tried in this order (each one that is configured; on failure the next is tried):
  0. Local GPU (LOCAL_TTS_URL): AI4Bharat Indic Parler-TTS served by tts-local/server.py on the
     clinic's or developer's own machine. Free, offline, private.
  1. Azure AI Speech neural voices: the best free cloud option. The free (F0) tier includes 0.5 million
     neural characters a month, and Azure for Students needs no credit card. Female voices:
     Sapna (Kannada), Swara (Hindi), Pallavi (Tamil), Neerja (Indian English); override with AZURE_VOICES.
  2. Sarvam AI Bulbul (paid, optional): built for Indian languages.
  3. None: the endpoint answers 204 and the browser uses its most natural voice (in Microsoft Edge
     these are the same Microsoft neural voices, free and with no key).

Audio is cached in memory by (provider, language, text): replaying a message is instant
and does not spend API credits.
"""
from __future__ import annotations

import base64
import html
from collections import OrderedDict

import httpx

from ..config import get_settings

LOCALE = {"kn": "kn-IN", "hi": "hi-IN", "ta": "ta-IN", "en": "en-IN"}

# (model, speaker). Female, calm and conversational, the same persona where the catalogue allows.
# Bulbul v4 Flash has no female Tamil persona yet, so Tamil uses v3's top-rated female voice.
SARVAM_VOICES: dict[str, tuple[str, str]] = {
    "kn": ("bulbul:v4-flash", "chaitra_kn_conversation"),
    "hi": ("bulbul:v4-flash", "aparna_hi_customer"),
    "en": ("bulbul:v4-flash", "aparna_en_companion"),
    "ta": ("bulbul:v3", "ishita"),
}
AZURE_VOICES = {"kn": "kn-IN-SapnaNeural", "hi": "hi-IN-SwaraNeural", "ta": "ta-IN-PallaviNeural", "en": "en-IN-NeerjaNeural"}

_cache: OrderedDict[tuple[str, str, str], tuple[bytes, str]] = OrderedDict()
_CACHE_MAX = 300


class TTSError(Exception):
    pass


def providers() -> list[str]:
    s = get_settings()
    out = []
    if s.local_tts_url:
        out.append("local")
    if s.azure_speech_key and s.azure_speech_region:
        out.append("azure")
    if s.sarvam_api_key:
        out.append("sarvam")
    return out


def provider() -> str:
    """The preferred configured provider ("none" if there is none)."""
    p = providers()
    return p[0] if p else "none"


def azure_voices() -> dict[str, str]:
    """Default voices, with optional overrides like AZURE_VOICES="hi=hi-IN-MadhurNeural,ta=ta-IN-ValluvarNeural"."""
    voices = dict(AZURE_VOICES)
    for part in filter(None, (p.strip() for p in get_settings().azure_voices.split(","))):
        lang, _, name = part.partition("=")
        if lang.strip() in LOCALE and name.strip().endswith("Neural"):
            voices[lang.strip()] = name.strip()
    return voices


def sarvam_voices() -> dict[str, tuple[str, str]]:
    """Default voices, with optional overrides like SARVAM_VOICES="ta=bulbul:v3/kavitha,kn=bulbul:v4-flash/suchitra_kn_narration"."""
    voices = dict(SARVAM_VOICES)
    for part in filter(None, (p.strip() for p in get_settings().sarvam_voices.split(","))):
        lang, _, spec = part.partition("=")
        model, _, speaker = spec.partition("/")
        if lang.strip() in LOCALE and model and speaker:
            voices[lang.strip()] = (model.strip(), speaker.strip())
    return voices


def synthesize(text: str, lang: str) -> tuple[bytes, str] | None:
    """Returns (audio bytes, media type), or None when no provider is configured.
    Tries each configured provider in order; raises TTSError only if all of them fail."""
    chain = providers()
    if not chain:
        return None
    lang = lang if lang in LOCALE else "en"
    errors = []
    for p in chain:
        key = (p, lang, text)
        if key in _cache:
            _cache.move_to_end(key)
            return _cache[key]
        try:
            out = {"local": _local, "azure": _azure, "sarvam": _sarvam}[p](text, lang)
        except TTSError as e:
            errors.append(str(e))
            continue
        _cache[key] = out
        if len(_cache) > _CACHE_MAX:
            _cache.popitem(last=False)
        return out
    raise TTSError("; ".join(errors))


def _local(text: str, lang: str) -> tuple[bytes, str]:
    url = get_settings().local_tts_url.rstrip("/") + "/tts"
    try:
        r = httpx.post(url, json={"text": text, "lang": lang}, timeout=120)
        r.raise_for_status()
    except httpx.HTTPError as e:
        raise TTSError(f"Local TTS failed ({url}): {e}") from e
    return r.content, r.headers.get("content-type", "audio/wav").split(";")[0]


def _sarvam(text: str, lang: str) -> tuple[bytes, str]:
    s = get_settings()
    model, speaker = sarvam_voices()[lang]
    body = {
        "text": text[:2500],
        "language_code": LOCALE[lang],
        "model": model,
        "speaker": speaker,
        "pace": s.tts_pace,          # a touch slower than default: our listeners are older
        "speech_sample_rate": 24000,
    }
    if model != "bulbul:v3":
        body["enable_preprocessing"] = True  # reads numbers, times and dates naturally
    try:
        r = httpx.post("https://api.sarvam.ai/text-to-speech", json=body,
                       headers={"api-subscription-key": s.sarvam_api_key}, timeout=30)
        r.raise_for_status()
        audios = r.json().get("audios") or []
    except (httpx.HTTPError, ValueError) as e:
        detail = e.response.text[:200] if isinstance(e, httpx.HTTPStatusError) else str(e)
        raise TTSError(f"Sarvam TTS failed: {detail}") from e
    if not audios:
        raise TTSError("Sarvam TTS returned no audio")
    return base64.b64decode("".join(audios)), "audio/wav"


def _azure(text: str, lang: str) -> tuple[bytes, str]:
    s = get_settings()
    rate = f"{round((s.tts_pace - 1) * 100):+d}%"
    ssml = (f"<speak version='1.0' xml:lang='{LOCALE[lang]}'><voice name='{azure_voices()[lang]}'>"
            f"<prosody rate='{rate}'>{html.escape(text)}</prosody></voice></speak>")
    try:
        r = httpx.post(
            f"https://{s.azure_speech_region}.tts.speech.microsoft.com/cognitiveservices/v1",
            headers={"Ocp-Apim-Subscription-Key": s.azure_speech_key, "Content-Type": "application/ssml+xml",
                     "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3", "User-Agent": "drishtisaathi"},
            content=ssml.encode(), timeout=20,
        )
        r.raise_for_status()
    except httpx.HTTPError as e:
        detail = f"{e.response.status_code} {e.response.text[:200]}" if isinstance(e, httpx.HTTPStatusError) else str(e)
        raise TTSError(f"Azure TTS failed: {detail}") from e
    return r.content, "audio/mpeg"
