import warnings

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_SECRET_KEYS = frozenset({
    "change-me-in-production-32chars!!",
    "changeme-use-openssl-rand-hex-32",
})


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql+asyncpg://knowhub:knowhub_secret@localhost:5432/knowhub"
    SECRET_KEY: str = "change-me-in-production-32chars!!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        if v in _INSECURE_SECRET_KEYS or len(v) < 32:
            warnings.warn(
                "SECRET_KEY fraca ou padrão detectada. "
                "Defina um valor forte em .env antes de expor a aplicação.",
                stacklevel=2,
            )
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
