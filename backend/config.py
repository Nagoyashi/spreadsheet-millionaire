import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # ------------------------------------------------------------------ #
    # Security
    # ------------------------------------------------------------------ #
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-fallback-key-change-me")

    # ------------------------------------------------------------------ #
    # Database
    # ------------------------------------------------------------------ #
    DB_PATH = os.path.join(BASE_DIR, "fintrackr.db")

    # ------------------------------------------------------------------ #
    # Flask-Session  (server-side sessions stored in SQLite)
    # ------------------------------------------------------------------ #
    SESSION_TYPE = "sqlalchemy"
    SESSION_SQLALCHEMY_TABLE = "flask_sessions"
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True          # signs the session cookie for tamper detection
    SESSION_COOKIE_HTTPONLY = True     # JS cannot read the cookie
    SESSION_COOKIE_SAMESITE = "Lax"   # CSRF protection
    SESSION_COOKIE_SECURE = False      # set True in production (HTTPS only)

    # ------------------------------------------------------------------ #
    # CORS
    # ------------------------------------------------------------------ #
    CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
    CORS_SUPPORTS_CREDENTIALS = True   # required for cross-origin session cookies
