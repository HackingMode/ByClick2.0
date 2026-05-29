from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/marketplace_angola"
    SECRET_KEY: str = "sua-chave-secreta-mude-isto"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    class Config:
        env_file = BASE_DIR / ".env"


settings = Settings()
