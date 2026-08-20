from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[ROOT / ".env", ROOT / "backend" / ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    anthropic_api_key: str
    claude_model: str = "claude-sonnet-4-6"
    max_tokens: int = 800

    embed_model: str = "jhgan/ko-sroberta-multitask"
    database_url: str = "postgresql+psycopg://kogo:math1106@localhost:5433/lecture"

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()