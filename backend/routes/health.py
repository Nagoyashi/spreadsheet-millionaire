import logging

from flask import Blueprint, jsonify

from app import limiter
from db import get_db

bp = Blueprint("health", __name__)

logger = logging.getLogger("app.health")


@bp.route("/api/health", methods=["GET"])
@limiter.exempt
def health():
    """
    Liveness probe — answers "is the process up", nothing more.

    Hit by Render's health checks and an external keepalive pinger every few
    minutes, so it is exempt from rate limiting. Deliberately dumb: no auth,
    no CSRF, no DB or Redis round-trip — a dependency being down must not make
    the process look dead and trigger a needless restart. Deep dependency health
    lives on /api/health/ready instead.
    """
    return jsonify({"status": "ok"}), 200


@bp.route("/api/health/ready", methods=["GET"])
@limiter.exempt
def ready():
    """
    Readiness probe — answers "can the app actually serve", i.e. is its critical
    dependency (Postgres) reachable.

    Unlike /api/health (kept deliberately dumb so a dependency blip never trips
    Render's restart logic), this is the endpoint an *external* uptime monitor
    polls and alerts on: a process that is up but cannot reach the database is
    degraded, not healthy. Returns 200 with {"db": "ok"} when a trivial SELECT 1
    succeeds, else 503 with {"db": "down"}.

    Redis is intentionally excluded: sessions fall back to the filesystem and the
    rate limiter to in-memory when Upstash is down, so an unreachable Redis is a
    soft degradation, not an outage — flagging it here would cause false alarms.

    Rate-limit exempt for the same reason as /api/health: it is polled constantly.
    """
    try:
        with get_db().cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
    except Exception:
        # A DB-down blip caught only by the monitor (between real traffic) would
        # otherwise be invisible; log the cause with a traceback. The generic
        # request line the middleware emits records only the 503 status.
        logger.exception("readiness check failed: database unreachable")
        return jsonify({"status": "degraded", "checks": {"db": "down"}}), 503
    return jsonify({"status": "ok", "checks": {"db": "ok"}}), 200
