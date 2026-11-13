from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    DATABASE_URL: str
    CORS_ORIGINS: list[str] = ["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:3000", "http://127.0.0.1:3000"]
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    BASE_URL: str = "http://localhost:8000"

    # SMTP Config
    SMTP_SERVER: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: Optional[str] = None

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret(cls, value):
        if len(value) < 32 or value in {"sua-chave-secreta-mude-isto", "CHANGE_ME"}:
            raise ValueError("SECRET_KEY must be a random secret with at least 32 characters")
        return value

    class Config:
        env_file = BASE_DIR / ".env"


settings = Settings()
