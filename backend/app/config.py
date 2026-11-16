from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    supabase_url: str
    # Public key; every database call is made with the signed-in user's token,
    # so row level security still decides what each farmer can touch.
    supabase_anon_key: str

    # Stage 1: the exported CNN. A sibling `<name>.json` describes its classes and preprocessing.
    classifier_path: Path = BACKEND_DIR / "models" / "agrolens.onnx"
    # Below this confidence the farmer is sent to an expert instead of getting a guess.
    confidence_threshold: float = 0.6
    max_upload_mb: int = 8

    # Stage 2: the folder of per-crop disease guidance (see app/advisory/knowledge.py).
    kb_dir: Path = BACKEND_DIR / "kb"
    # Rewrites that guidance in the farmer's language (see app/advisory/writer.py).
    # Without a key the guidance is returned as written, in English.
    gemini_api_key: str | None = None
    # Tried in order: free-tier models are often busy, and each has its own quota.
    gemini_models: list[str] = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"]

    # Origins allowed to call the API from a browser (the Expo web build during development).
    allowed_origins: list[str] = ["http://localhost:8081"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
