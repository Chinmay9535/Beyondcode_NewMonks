"""Runtime settings, read from environment variables or backend/.env."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    database_url: str = f"sqlite:///{BASE_DIR / 'drishtisaathi.db'}"
    cors_origins: str = "http://localhost:3000"

    # Staff login for the surgeon dashboard. Change this outside demos.
    surgeon_pin: str = "2468"
    secret_key: str = "change-me-in-production"

    # LLM provider: "none" (offline rules + templates), "azure", "openai" (any
    # OpenAI-compatible endpoint, e.g. Ollama at http://localhost:11434/v1) or "anthropic".
    llm_provider: str = "none"
    llm_model: str = ""
    llm_timeout_s: float = 30.0

    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_deployment: str = ""
    azure_openai_api_version: str = "2024-10-21"

    openai_base_url: str = "https://api.openai.com/v1"
    openai_api_key: str = ""

    anthropic_api_key: str = ""

    # Optional neural text-to-speech for Indian languages (Azure AI Speech).
    azure_speech_key: str = ""
    azure_speech_region: str = ""

    seed_demo_data: bool = True
    clinic_timezone: str = "Asia/Kolkata"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def local_now():
    """Clinic wall-clock time (naive), used for drop schedules."""
    from datetime import datetime
    from zoneinfo import ZoneInfo

    return datetime.now(ZoneInfo(get_settings().clinic_timezone)).replace(tzinfo=None)
