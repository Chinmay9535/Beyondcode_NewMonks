"""Text-to-speech provider selection, voice choice, request shape and caching (no network)."""
import base64

import httpx
import pytest

from app.config import get_settings
from app.services import tts


@pytest.fixture
def settings(monkeypatch):
    s = get_settings()
    for k, v in {"sarvam_api_key": "", "sarvam_voices": "", "azure_speech_key": "", "azure_speech_region": ""}.items():
        monkeypatch.setattr(s, k, v)
    tts._cache.clear()
    return s


def test_no_provider_means_browser_voices(settings, client):
    assert tts.provider() == "none"
    assert tts.synthesize("ನಮಸ್ಕಾರ", "kn") is None
    assert client.post("/api/tts", json={"text": "hello", "lang": "en"}).status_code == 204
    assert client.get("/api/meta").json()["tts"] is False


def test_sarvam_preferred_over_azure(settings, monkeypatch):
    monkeypatch.setattr(settings, "azure_speech_key", "a"); monkeypatch.setattr(settings, "azure_speech_region", "centralindia")
    assert tts.provider() == "azure"
    monkeypatch.setattr(settings, "sarvam_api_key", "s")
    assert tts.provider() == "sarvam"


def test_voice_overrides(settings, monkeypatch):
    assert tts.sarvam_voices()["kn"] == ("bulbul:v4-flash", "chaitra_kn_conversation")
    monkeypatch.setattr(settings, "sarvam_voices", "ta=bulbul:v3/kavitha, xx=bad/voice, kn=broken")
    v = tts.sarvam_voices()
    assert v["ta"] == ("bulbul:v3", "kavitha")
    assert v["kn"] == ("bulbul:v4-flash", "chaitra_kn_conversation")   # malformed override ignored
    assert "xx" not in v


def test_sarvam_request_and_cache(settings, monkeypatch):
    monkeypatch.setattr(settings, "sarvam_api_key", "secret")
    calls = []

    def fake_post(url, json=None, headers=None, timeout=None, **_):
        calls.append((url, json, headers))
        return httpx.Response(200, json={"request_id": "x", "audios": [base64.b64encode(b"RIFFwav").decode()]}, request=httpx.Request("POST", url))

    monkeypatch.setattr(tts.httpx, "post", fake_post)
    audio, media = tts.synthesize("ಡ್ರಾಪ್ಸ್ ಹಾಕುವ ಸಮಯ", "kn")
    assert (audio, media) == (b"RIFFwav", "audio/wav")
    url, body, headers = calls[0]
    assert url == "https://api.sarvam.ai/text-to-speech" and headers == {"api-subscription-key": "secret"}
    assert body["language_code"] == "kn-IN" and body["speaker"] == "chaitra_kn_conversation" and body["model"] == "bulbul:v4-flash"
    assert 0.5 <= body["pace"] <= 2.0 and body["enable_preprocessing"] is True

    tts.synthesize("ಡ್ರಾಪ್ಸ್ ಹಾಕುವ ಸಮಯ", "kn")
    assert len(calls) == 1                                   # served from cache

    tts.synthesize("வணக்கம்", "ta")
    assert calls[1][1]["model"] == "bulbul:v3" and "enable_preprocessing" not in calls[1][1]


def test_sarvam_error_becomes_502(settings, monkeypatch, client):
    monkeypatch.setattr(settings, "sarvam_api_key", "bad")

    def fake_post(url, **_):
        return httpx.Response(403, json={"error": {"message": "invalid key"}}, request=httpx.Request("POST", url))

    monkeypatch.setattr(tts.httpx, "post", fake_post)
    r = client.post("/api/tts", json={"text": "hello", "lang": "en"})
    assert r.status_code == 502 and "invalid key" in r.json()["detail"]
