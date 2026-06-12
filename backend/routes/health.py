from flask import Blueprint, jsonify

from app import limiter

bp = Blueprint("health", __name__)


@bp.route("/api/health", methods=["GET"])
@limiter.exempt
def health():
    """
    Liveness probe — answers "is the process up", nothing more.

    Hit by Render's health checks and an external keepalive pinger every few
    minutes, so it is exempt from rate limiting. Deliberately dumb: no auth,
    no CSRF, no DB or Redis round-trip — a dependency being down must not make
    the process look dead and trigger a needless restart.
    """
    return jsonify({"status": "ok"}), 200
