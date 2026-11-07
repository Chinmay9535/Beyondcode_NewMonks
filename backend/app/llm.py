"""Thin, provider-agnostic LLM client.

Every feature works without an LLM (provider "none"): intake uses scripted
questions and keyword extraction, Q&A answers with the clinic's curated text.
When a provider is configured, the LLM is used for language understanding and
phrasing only. Safety decisions (red flags, lens rules) stay in code.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

from .config import get_settings

log = logging.getLogger(__name__)


class LLMUnavailable(Exception):
    pass


def enabled() -> bool:
    s = get_settings()
    if s.llm_provider == "azure":
        return bool(s.azure_openai_endpoint and s.azure_openai_api_key and s.azure_openai_deployment)
    if s.llm_provider == "openai":
        return bool(s.openai_base_url and s.llm_model)
    if s.llm_provider == "anthropic":
        return bool(s.anthropic_api_key)
    return False


def provider_label() -> str:
    s = get_settings()
    if not enabled():
        return "offline"
    if s.llm_provider == "azure":
        return f"azure:{s.azure_openai_deployment}"
    if s.llm_provider == "anthropic":
        return f"anthropic:{s.llm_model or 'claude-opus-5-5'}"
    return f"openai-compatible:{s.llm_model}"


def complete(system: str, user: str, *, json_mode: bool = False, max_tokens: int = 800) -> str:
    """Single-turn completion. Raises LLMUnavailable on any failure so callers can fall back."""
    if not enabled():
        raise LLMUnavailable("no provider configured")
    s = get_settings()
    try:
        with httpx.Client(timeout=s.llm_timeout_s) as client:
            if s.llm_provider == "anthropic":
                sys_prompt = system + ("\nRespond with a single JSON object and nothing else." if json_mode else "")
                r = client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={"x-api-key": s.anthropic_api_key, "anthropic-version": "2023-06-01"},
                    json={
                        "model": s.llm_model or "claude-opus-5-5",
                        "max_tokens": max_tokens,
                        "system": sys_prompt,
                        "messages": [{"role": "user", "content": user}],
                    },
                )
                r.raise_for_status()
                return "".join(b.get("text", "") for b in r.json()["content"] if b.get("type") == "text")

            body: dict[str, Any] = {
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                "max_tokens": max_tokens,
                "temperature": 0.2,
            }
            if json_mode:
                body["response_format"] = {"type": "json_object"}
            if s.llm_provider == "azure":
                url = (
                    f"{s.azure_openai_endpoint.rstrip('/')}/openai/deployments/"
                    f"{s.azure_openai_deployment}/chat/completions?api-version={s.azure_openai_api_version}"
                )
                headers = {"api-key": s.azure_openai_api_key}
            else:
                url = f"{s.openai_base_url.rstrip('/')}/chat/completions"
                headers = {"Authorization": f"Bearer {s.openai_api_key or 'none'}"}
                body["model"] = s.llm_model
            r = client.post(url, headers=headers, json=body)
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"] or ""
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as e:
        log.warning("LLM call failed: %s", e)
        raise LLMUnavailable(str(e)) from e


def complete_json(system: str, user: str, **kw) -> dict:
    text = complete(system, user, json_mode=True, **kw)
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise LLMUnavailable("no JSON in response")
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError as e:
        raise LLMUnavailable(f"bad JSON: {e}") from e
