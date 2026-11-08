"""Text-to-speech provider selection, voice choice, request shape and caching (no network)."""
import base64

import httpx
import pytest

from app.config import get_settings
from app.services import tts


@pytest.fixture
def settings(monkeypatch):
    s = get_settings()
    for k, v in {"sarvam_api_key": "", "sarvam_voices": "", "azure_speech_key": "", "azure_speech_region": "", "azure_voices": "", "local_tts_url": ""}.items():
        monkeypatch.setattr(s, k, v)
    tts._cache.clear()
    return s


def test_no_provider_means_browser_voices(settings, client):
    assert tts.provider() == "none"
    assert tts.synthesize("ನಮಸ್ಕಾರ", "kn") is None
    assert client.post("/api/tts", json={"text": "hello", "lang": "en"}).status_code == 204
    assert client.get("/api/meta").json()["tts"] is False


def test_free_azure_preferred_over_paid_sarvam(settings, monkeypatch):
    monkeypatch.setattr(settings, "sarvam_api_key", "s")
    assert tts.provider() == "sarvam"
    monkeypatch.setattr(settings, "azure_speech_key", "a"); monkeypatch.setattr(settings, "azure_speech_region", "centralindia")
    assert tts.provider() == "azure"


def test_azure_request_and_voice_override(settings, monkeypatch):
    monkeypatch.setattr(settings, "azure_speech_key", "k"); monkeypatch.setattr(settings, "azure_speech_region", "centralindia")
    monkeypatch.setattr(settings, "azure_voices", "hi=hi-IN-MadhurNeural, ta=not-a-voice")
    sent = []

    def fake_post(url, headers=None, content=None, timeout=None, **_):
        sent.append((url, headers, content.decode()))
        return httpx.Response(200, content=b"ID3mp3", request=httpx.Request("POST", url))

    monkeypatch.setattr(tts.httpx, "post", fake_post)
    assert tts.synthesize("नमस्ते <b>&", "hi") == (b"ID3mp3", "audio/mpeg")
    url, headers, ssml = sent[0]
    assert url == "https://centralindia.tts.speech.microsoft.com/cognitiveservices/v1" and headers["Ocp-Apim-Subscription-Key"] == "k"
    assert "hi-IN-MadhurNeural" in ssml and "&lt;b&gt;&amp;" in ssml and "rate='-8%'" in ssml
    tts.synthesize("வணக்கம்", "ta")
    assert "ta-IN-PallaviNeural" in sent[1][2]                     # invalid override ignored


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


def test_local_gpu_first_then_falls_back(settings, monkeypatch):
    monkeypatch.setattr(settings, "local_tts_url", "http://127.0.0.1:8010/")
    monkeypatch.setattr(settings, "azure_speech_key", "k"); monkeypatch.setattr(settings, "azure_speech_region", "centralindia")
    assert tts.providers() == ["local", "azure"]
    calls = []

    def ok(url, json=None, **_):
        calls.append((url, json))
        return httpx.Response(200, content=b"RIFFlocal", headers={"content-type": "audio/wav"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(tts.httpx, "post", ok)
    assert tts.synthesize("ನಮಸ್ಕಾರ", "kn") == (b"RIFFlocal", "audio/wav")
    assert calls[0] == ("http://127.0.0.1:8010/tts", {"text": "ನಮಸ್ಕಾರ", "lang": "kn"})

    def local_down(url, **kw):
        if "8010" in url:
            raise httpx.ConnectError("refused", request=httpx.Request("POST", url))
        return httpx.Response(200, content=b"ID3azure", request=httpx.Request("POST", url))

    monkeypatch.setattr(tts.httpx, "post", local_down)
    assert tts.synthesize("नमस्ते", "hi") == (b"ID3azure", "audio/mpeg")     # local down -> Azure


def test_all_providers_failing_is_502(settings, monkeypatch, client):
    monkeypatch.setattr(settings, "local_tts_url", "http://127.0.0.1:9")

    def down(url, **_):
        raise httpx.ConnectError("refused", request=httpx.Request("POST", url))

    monkeypatch.setattr(tts.httpx, "post", down)
    r = client.post("/api/tts", json={"text": "hello", "lang": "en"})
    assert r.status_code == 502 and "Local TTS failed" in r.json()["detail"]
