import os
import sys
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# ── Secret key validation ─────────────────────────────────────────────────────
# Fail loudly at startup if the secret key is missing or still a placeholder.
# A weak secret key means session cookies can be forged.
_secret_key = os.getenv("FLASK_SECRET_KEY", "")
_PLACEHOLDER = "replace-this-with-output-of-secrets-token-hex-32"

if not _secret_key or _secret_key == _PLACEHOLDER or len(_secret_key) < 32:
    print(
        "\n[ERROR] FLASK_SECRET_KEY is missing, too short, or still set to the placeholder.\n"
        "Generate one with:  python -c \"import secrets; print(secrets.token_hex(32))\"\n"
        "Then set it in backend/.env\n",
        file=sys.stderr,
    )
    sys.exit(1)


class Config:
    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY = _secret_key

    # ── Database ──────────────────────────────────────────────────────────────
    DB_PATH = os.path.join(BASE_DIR, os.getenv("DATABASE_PATH", "fintrackr.db"))

    # ── Sessions ──────────────────────────────────────────────────────────────
    SESSION_TYPE              = "filesystem"
    SESSION_FILE_DIR          = os.path.join(BASE_DIR, "flask_session")
    SESSION_FILE_THRESHOLD    = 500
    SESSION_PERMANENT         = True
    PERMANENT_SESSION_LIFETIME = timedelta(days=30)  # sessions expire after 30 days
    SESSION_USE_SIGNER        = True
    SESSION_COOKIE_HTTPONLY   = True
    SESSION_COOKIE_SAMESITE   = "Lax"
    # Read from env so dev uses False (HTTP) and prod uses True (HTTPS)
    SESSION_COOKIE_SECURE     = os.getenv("SESSION_COOKIE_SECURE", "False").lower() == "true"

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Read from env — comma-separated list of allowed origins.
    # Never falls back to wildcard.
    _raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    CORS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
    CORS_SUPPORTS_CREDENTIALS = True

    # ── Rate limiting ─────────────────────────────────────────────────────────
    # Uses in-memory storage by default (fine for single-process dev/prod).
    # Swap to Redis URI for multi-process deployments: "redis://localhost:6379"
    RATELIMIT_STORAGE_URI     = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_HEADERS_ENABLED = True  # sends X-RateLimit-* headers to clients

    # ── Environment ───────────────────────────────────────────────────────────
    FLASK_ENV   = os.getenv("FLASK_ENV", "production")
    FLASK_DEBUG = FLASK_ENV == "development"
