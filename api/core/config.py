from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # Application
    APP_NAME: str = Field(default="")
    APP_VERSION: str = Field(default="")
    DEBUG: bool = Field(default=False)

    # Database
    DB_HOST: str = Field(default="")
    DB_PORT: int = Field(default=3306)
    DB_NAME: str = Field(default="")
    DB_USER: str = Field(default="")
    DB_PASSWORD: str = Field(default="")
    DB_POOL_MIN: int = Field(default=5)
    DB_POOL_MAX: int = Field(default=20)

    # Azure AD / OIDC
    OIDC_TENANT_ID: str = Field(default="")
    OIDC_AUDIENCE: str = Field(default="")
    OIDC_ISSUER: str = Field(default="")
    OIDC_JWKS_URL: str = Field(default="")

    CORS_ORIGINS: list[str] = Field(default_factory=list)

    # File Upload
    UPLOAD_DIR: str = Field(default="")
    MAX_UPLOAD_SIZE: int = Field(default=0)

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
