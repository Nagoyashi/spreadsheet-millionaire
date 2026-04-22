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

    # Flask-Session  (server-side sessions stored on filesystem)
    SESSION_TYPE = "filesystem"
    SESSION_FILE_DIR = os.path.join(BASE_DIR, "flask_session")
    SESSION_FILE_THRESHOLD = 500
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False

    # ------------------------------------------------------------------ #
    # CORS
    # ------------------------------------------------------------------ #
    CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
    CORS_SUPPORTS_CREDENTIALS = True   # required for cross-origin session cookies
