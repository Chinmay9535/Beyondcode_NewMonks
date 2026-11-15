"""LLM provider config and rate-limit fallback (no network)."""
import httpx
import pytest

from app import llm
from app.config import get_settings
from app.services import redflag


@pytest.fixture
def gemini(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "llm_provider", "gemini")
    monkeypatch.setattr(s, "gemini_api_key", "g")
    monkeypatch.setattr(s, "llm_model", "")
    llm._cooldown["until"] = 0.0
    yield s
    llm._cooldown["until"] = 0.0


def test_gemini_defaults(gemini, monkeypatch, client):
    sent = []

    def fake_post(self, url, headers=None, json=None, **_):
        sent.append((url, headers, json))
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"ok": 1}'}}]}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    assert llm.enabled() and llm.provider_label() == "gemini-3.5-flash-lite"
    assert llm.complete_json("sys", "hi") == {"ok": 1}
    url, headers, body = sent[0]
    assert url == "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    assert headers["Authorization"] == "Bearer g" and body["model"] == "gemini-3.5-flash-lite"
    assert body["response_format"] == {"type": "json_object"}
    assert client.get("/api/meta").json()["ai"] == "gemini-3.5-flash-lite"


def test_rate_limit_pauses_llm_and_rules_still_work(gemini, monkeypatch):
    calls = []

    def limited(self, url, **_):
        calls.append(url)
        return httpx.Response(429, json={"error": "quota"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.Client, "post", limited)
    with pytest.raises(llm.LLMUnavailable):
        llm.complete("sys", "hi")
    assert llm.cooling_down()
    r = redflag.detect("aankh mein bahut dard aur dhundhla dikh raha hai")
    assert r["severity"] == "urgent" and r["source"] == "rules"     # safety never depends on the LLM
    assert len(calls) == 1                                           # no request spent while cooling down


def _triage(monkeypatch, reply):
    monkeypatch.setattr(httpx.Client, "post", lambda self, url, **_: httpx.Response(
        200, json={"choices": [{"message": {"content": reply}}]}, request=httpx.Request("POST", url)))


def test_llm_raise_needs_symptom_words_from_the_message(gemini, monkeypatch):
    text = "ನಾನು ಟೈಲರ್. ಸೂಜಿಗೆ ದಾರ ಪೋಣಿಸಬೇಕು, ರಾತ್ರಿ ಸ್ಕೂಟರ್ ಓಡಿಸುತ್ತೇನೆ."
    _triage(monkeypatch, '{"severity":"soon","category":"night_vision","symptom_words":"","patient_en":"x"}')
    assert redflag.detect(text)["flag"] is False                       # no quoted symptom -> no alert
    _triage(monkeypatch, '{"severity":"soon","category":"pain","symptom_words":"ಕಣ್ಣು ನೋವು","patient_en":"x"}')
    assert redflag.detect(text)["flag"] is False                       # quote not in the message -> no alert

    text = "there is a shadow creeping in from the side of my vision"
    _triage(monkeypatch, '{"severity":"urgent","category":"retina","symptom_words":"shadow creeping in","patient_en":"x"}')
    r = redflag.detect(text)
    assert r["severity"] == "urgent" and r["source"] == "llm" and r["categories"][0] == "retina"


def test_llm_never_lowers_a_rule_alert(gemini, monkeypatch):
    _triage(monkeypatch, '{"severity":"none","category":"ok","symptom_words":"","patient_en":"x"}')
    r = redflag.detect("I can't see anything from my operated eye")
    assert r["severity"] == "urgent" and r["source"] == "rules"
