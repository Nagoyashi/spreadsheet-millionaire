import os
import sys
from datetime import timedelta

import redis
from dotenv import load_dotenv

load_dotenv()

# Warnings collected at import time, emitted once by app.py at startup.
# Config must not print noise on import — it's imported by scripts and tests too.
STARTUP_WARNINGS: list[str] = []

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


# ── Database URL validation ───────────────────────────────────────────────────
# Postgres-only (Neon). Fail loudly at startup if DATABASE_URL is missing or not
# a Postgres URL — there is no SQLite fallback. Neon requires TLS, so sslmode is
# forced on if the connection string doesn't already carry it.
_database_url = os.getenv("DATABASE_URL", "").strip()

if not _database_url or not _database_url.startswith("postgres"):
    print(
        "\n[ERROR] DATABASE_URL is missing or is not a Postgres connection string.\n"
        "This app runs on Postgres (Neon) only — there is no SQLite fallback.\n"
        "Set DATABASE_URL in backend/.env to your Neon pooled connection string\n"
        "(it must start with 'postgres').\n",
        file=sys.stderr,
    )
    sys.exit(1)


def _ensure_sslmode(url: str) -> str:
    """Neon mandates TLS. Append sslmode=require if the URL lacks an sslmode."""
    if "sslmode=" in url:
        return url
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}sslmode=require"


_database_url = _ensure_sslmode(_database_url)


# ── Redis (sessions + rate limiting) ──────────────────────────────────────────
# Sessions and rate limiting move to Redis (Upstash) so they hold across multiple
# gunicorn workers. In production REDIS_URL is mandatory — the app exits without
# it. In development it's optional: if set we use it (full prod parity); if unset
# we fall back to filesystem sessions + in-memory rate limiting, with one warning,
# so a fresh checkout still runs with zero infrastructure.
_flask_env     = os.getenv("FLASK_ENV", "production")
_is_production = _flask_env == "production"
_redis_url     = os.getenv("REDIS_URL", "").strip()

if _is_production and not _redis_url:
    print(
        "\n[ERROR] REDIS_URL is missing but FLASK_ENV=production.\n"
        "Production sessions and rate limiting require Redis (Upstash) so they\n"
        "hold across multiple workers. Set REDIS_URL in backend/.env (rediss://).\n",
        file=sys.stderr,
    )
    sys.exit(1)

_use_redis = bool(_redis_url)

if not _use_redis:
    STARTUP_WARNINGS.append(
        "REDIS_URL not set — falling back to filesystem sessions and in-memory "
        "rate limiting. Development only: neither survives multiple workers."
    )


# ── Transactional email (Resend) ──────────────────────────────────────────────
# Best-effort this phase: a missing key disables sending (dev AND prod) rather
# than failing startup — nothing depends on email for availability yet (that
# changes when password reset lands). The send logic and key wiring live in
# services/email.py; here we only surface the startup warning.
if not os.getenv("RESEND_API_KEY", "").strip():
    STARTUP_WARNINGS.append(
        "RESEND_API_KEY not set — transactional email is disabled. Registration "
        "still succeeds; the welcome email is skipped."
    )


# ── Public frontend origin (reset links) ──────────────────────────────────────
# Used to build password-reset links: {APP_BASE_URL}/reset-password/{token}.
# Defaults to the Vite dev origin; in production it must be the real frontend
# domain or reset emails will point at localhost. Warn (don't exit) if it's
# left at the dev default in production — email is best-effort, not boot-critical.
_app_base_url = os.getenv("APP_BASE_URL", "http://localhost:5173").strip().rstrip("/")

if _is_production and "localhost" in _app_base_url:
    STARTUP_WARNINGS.append(
        "APP_BASE_URL is unset or points at localhost while FLASK_ENV=production "
        "— password-reset links will be wrong. Set it to the public frontend origin."
    )


class Config:
    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY = _secret_key

    # ── Database (Postgres / Neon) ────────────────────────────────────────────
    # Validated above at import time. Points at Neon's pooled (PgBouncer)
    # endpoint — connection pooling happens there, not in-process.
    DATABASE_URL = _database_url

    # ── Sessions ──────────────────────────────────────────────────────────────
    SESSION_PERMANENT          = True
    PERMANENT_SESSION_LIFETIME = timedelta(days=30)  # sessions expire after 30 days
    SESSION_USE_SIGNER         = True
    SESSION_COOKIE_HTTPONLY    = True
    SESSION_COOKIE_SAMESITE    = "Lax"
    # Read from env so dev uses False (HTTP) and prod uses True (HTTPS)
    SESSION_COOKIE_SECURE      = os.getenv("SESSION_COOKIE_SECURE", "False").lower() == "true"

    if _use_redis:
        # Upstash URLs are rediss:// — redis.from_url negotiates TLS automatically,
        # no extra flags needed. One shared client serves every worker.
        SESSION_TYPE  = "redis"
        SESSION_REDIS = redis.from_url(_redis_url)
    else:
        SESSION_TYPE           = "filesystem"
        SESSION_FILE_DIR       = os.path.join(BASE_DIR, "flask_session")
        SESSION_FILE_THRESHOLD = 500

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Read from env — comma-separated list of allowed origins.
    # Never falls back to wildcard.
    _raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    CORS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
    CORS_SUPPORTS_CREDENTIALS = True

    # ── Rate limiting ─────────────────────────────────────────────────────────
    # Redis when available so limits actually hold across workers; in-memory
    # otherwise (dev fallback only — limits are per-process and reset on restart).
    RATELIMIT_STORAGE_URI = (
        _redis_url if _use_redis
        else os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    )
    RATELIMIT_HEADERS_ENABLED = True  # sends X-RateLimit-* headers to clients

    # ── Public frontend origin (reset links) ─────────────────────────────────
    APP_BASE_URL = _app_base_url

    # ── Environment ───────────────────────────────────────────────────────────
    FLASK_ENV   = _flask_env
    FLASK_DEBUG = _flask_env == "development"
