"""
routes/admin.py
---------------
The /api/admin/* surface — founder/admin-only. Every route is gated by
admin_required (401 with no session, 404 for a normal logged-in user, so the
portal stays invisible to non-admins). Mutations are CSRF-protected and
rate-limited, the same posture as the rest of the write surface.

Phase 12 — Admin Control Center. This module ships the Overview screen's data:
the calculator catalog + publish toggles. Users (tier/suspend + audit log) and
Analytics (GA4 proxy) land in later phases of the same cycle.
"""

from flask import Blueprint, request, jsonify, session

from app import limiter
from calc_types import VALID_CALC_TYPES
from models import calculator_publish
from utils.auth_helpers import admin_required, csrf_protect

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@bp.route("/calculators", methods=["GET"])
@admin_required
def list_calculators():
    """
    Publish state for every calculator, for the Overview table.

    Returns the runtime publish rows; the frontend merges these with the
    registry's metadata (name / icon / category / descriptor) by calc_type.
    `visits_30d` is null until GA4 analytics is wired (a later phase) — the UI
    renders a `—` placeholder, per the design spec.
    GET — read-only, no CSRF.
    """
    rows = calculator_publish.list_all()
    for row in rows:
        row["visits_30d"] = None
    return jsonify({"calculators": rows}), 200


@bp.route("/calculators/<calc_type>", methods=["PATCH"])
@admin_required
@csrf_protect
@limiter.limit("60 per minute")
def set_calculator_published(calc_type):
    """
    Publish / unpublish one calculator. Body: { "published": <bool> }.

    Flips the DB flag the public /app reads at runtime, so it takes effect
    without a redeploy. Validates calc_type against VALID_CALC_TYPES (unknown →
    404) and requires a real boolean (anything else → 400). Stamps updated_by
    with the acting admin.
    """
    if calc_type not in VALID_CALC_TYPES:
        return jsonify({"error": "Unknown calculator."}), 404

    body = request.get_json(silent=True) or {}
    published = body.get("published")
    if not isinstance(published, bool):
        return jsonify({"error": "Field 'published' must be a boolean."}), 400

    row = calculator_publish.set_published(calc_type, published, session["user_id"])
    if row is None:
        # calc_type is valid but unseeded — shouldn't happen (db_init seeds all),
        # but never 500 on it.
        return jsonify({"error": "Unknown calculator."}), 404

    return jsonify({"calculator": row}), 200
