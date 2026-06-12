import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from flask_session import Session
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
from werkzeug.middleware.proxy_fix import ProxyFix

import db
from config import Config, STARTUP_WARNINGS
from db_init import init_db

# ── Rate limiter — shared instance imported by route files ────────────────────
# get_remote_address uses X-Forwarded-For when behind a proxy (Railway, Render etc.)
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=Config.RATELIMIT_STORAGE_URI,
    default_limits=[],          # no default limit — set per-route explicitly
)


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    # ── Proxy awareness ───────────────────────────────────────────────────────
    # Render (and the Vite dev proxy) terminate TLS and forward requests with
    # X-Forwarded-* headers. Without this, Flask sees the inbound hop as plain
    # HTTP — request.is_secure lies and Talisman's HTTPS redirect loops. Trust
    # exactly one proxy hop for the client IP, scheme, and host. Applied
    # unconditionally: harmless behind the dev proxy (one hop there too).
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # ── Startup warnings (Redis fallback, email disabled, …) ──────────────────
    for warning in STARTUP_WARNINGS:
        print(f"[WARN] {warning}", file=sys.stderr)

    # ── Per-request Postgres connection (psycopg) ─────────────────────────────
    db.init_app(app)

    # ── Server-side sessions — Redis (Upstash) or filesystem dev fallback ─────
    if Config.SESSION_TYPE == "filesystem":
        os.makedirs(Config.SESSION_FILE_DIR, exist_ok=True)
    Session(app)

    # ── Rate limiter ──────────────────────────────────────────────────────────
    limiter.init_app(app)

    # ── Security headers via Flask-Talisman ───────────────────────────────────
    # Disabled in development (HTTP) to avoid HTTPS redirect loops.
    # In production, force_https=True redirects all HTTP to HTTPS.
    is_production = Config.FLASK_ENV == "production"
    Talisman(
        app,
        force_https=is_production,
        strict_transport_security=is_production,
        content_security_policy=False,  # CSP managed separately if needed
        referrer_policy="strict-origin-when-cross-origin",
        frame_options="DENY",           # X-Frame-Options: DENY (clickjacking)
        x_content_type_options=True,    # X-Content-Type-Options: nosniff
    )

    # ── CORS — must allow credentials for session cookies ─────────────────────
    CORS(
        app,
        origins=Config.CORS_ORIGINS,
        supports_credentials=Config.CORS_SUPPORTS_CREDENTIALS,
    )

    # ── Blueprints ────────────────────────────────────────────────────────────
    from routes.auth        import bp as auth_bp
    from routes.calculators import bp as calculators_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(calculators_bp)

    # ── Global error handlers ─────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "Resource not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(_):
        return jsonify({"error": "Method not allowed."}), 405

    @app.errorhandler(429)
    def too_many_requests(_):
        return jsonify({"error": "Too many requests. Please slow down."}), 429

    @app.errorhandler(500)
    def internal_error(_):
        return jsonify({"error": "Internal server error."}), 500

    return app


# ── Bootstrap ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=Config.FLASK_DEBUG)
