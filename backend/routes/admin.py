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
from user_tiers import USER_TIERS
from models import calculator_publish, admin_audit
from models.user import User
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


# ---------------------------------------------------------------------------- #
# Users — list / search / filter, tier control, suspend/reinstate (audit-logged)
# ---------------------------------------------------------------------------- #
@bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    """
    Accounts for the Users table. Optional ?search= (email/name, case-insensitive)
    and ?tier=free|pro|elite filters, pushed into SQL. Also returns per-tier
    counts for the filter chips. GET — read-only, no CSRF.
    """
    search = request.args.get("search", "").strip() or None
    tier = request.args.get("tier", "").strip().lower() or None
    if tier and tier not in USER_TIERS:
        return jsonify({"error": "Unknown tier."}), 400

    users = User.list_for_admin(search=search, tier=tier)
    return jsonify({
        "users": [u.to_admin_dict() for u in users],
        "tier_counts": User.tier_counts(),
    }), 200


@bp.route("/users/<int:user_id>", methods=["PATCH"])
@admin_required
@csrf_protect
@limiter.limit("60 per minute")
def update_user(user_id):
    """
    Set a user's tier and/or suspend/reinstate them. Body may carry `tier`
    (free|pro|elite) and/or `suspended` (bool); at least one is required. Each
    change is audit-logged with its before/after. An admin cannot suspend their
    own account (lockout guard).
    """
    body = request.get_json(silent=True) or {}
    has_tier = "tier" in body
    has_suspended = "suspended" in body
    if not has_tier and not has_suspended:
        return jsonify({"error": "Provide 'tier' and/or 'suspended'."}), 400

    if has_tier and body["tier"] not in USER_TIERS:
        return jsonify({"error": "Field 'tier' must be one of: " + ", ".join(USER_TIERS)}), 400
    if has_suspended and not isinstance(body["suspended"], bool):
        return jsonify({"error": "Field 'suspended' must be a boolean."}), 400

    target = User.get_by_id(user_id)
    if target is None:
        return jsonify({"error": "User not found."}), 404

    admin_id = session["user_id"]
    if has_suspended and user_id == admin_id and body["suspended"]:
        return jsonify({"error": "You can't suspend your own admin account."}), 400

    updated = target
    if has_tier and body["tier"] != target.tier:
        updated = User.set_tier(user_id, body["tier"])
        admin_audit.record(
            admin_id, "set_tier", user_id, {"from": target.tier, "to": body["tier"]}
        )
    if has_suspended and bool(body["suspended"]) != target.suspended:
        updated = User.set_suspended(user_id, body["suspended"])
        admin_audit.record(
            admin_id,
            "suspend" if body["suspended"] else "reinstate",
            user_id,
            {"suspended": bool(body["suspended"])},
        )

    return jsonify({"user": updated.to_admin_dict()}), 200
