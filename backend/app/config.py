from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Darukaa.Earth Platform"
    API_V1_STR: str = "/api/v1"

    # Database (PostgreSQL with PostGIS)
    # Default to asyncpg url format
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/darukaa"

    # JWT Authentication
    JWT_SECRET: str = "darukaa-super-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for demo convenience

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )


settings = Settings()
