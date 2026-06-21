"""
routes/net_worth.py
-------------------
/api/net-worth/* — the Net Worth tracker API.

Four CRUD resources (assets, liabilities, investments, real-estate) backed by
the generic NetWorthTable, plus a SQL-aggregated /summary and append-only
/snapshots. Every route is @login_required; writes are CSRF-protected and
rate-limited. The user_id IDOR boundary lives in the model layer — every query
filters by user_id (hard rule #6).

CRUD routes are registered by a small helper (_register_crud) so all four
resources share exactly one correct wiring of decorators, validation, and the
{"item"}/{"items"} response envelope — no 16 copy-pasted handlers to drift.
"""

from flask import Blueprint, request, jsonify, session
from marshmallow import ValidationError

from models import net_worth as nw
from schemas.net_worth_schema import (
    AssetSchema,
    LiabilitySchema,
    InvestmentSchema,
    RealEstateSchema,
    SnapshotSchema,
)
from utils.auth_helpers import login_required, csrf_protect
from app import limiter

bp = Blueprint("net_worth", __name__, url_prefix="/api/net-worth")

# Writes are modest-frequency form submissions; cap abuse without hurting UX.
_WRITE_LIMIT = "120 per hour; 30 per minute"


def _register_crud(path: str, table: nw.NetWorthTable, schema_cls) -> None:
    """Register GET(list) / POST / PUT / DELETE for one resource table."""
    schema = schema_cls()

    @login_required
    def _list():
        return jsonify({"items": table.list_for_user(session["user_id"])}), 200

    @login_required
    @csrf_protect
    def _create():
        try:
            payload = schema.load(request.get_json(silent=True) or {})
        except ValidationError as err:
            return jsonify({"errors": err.messages}), 422
        item = table.create(session["user_id"], payload)
        return jsonify({"item": item}), 201

    @login_required
    @csrf_protect
    def _update(item_id: int):
        try:
            payload = schema.load(request.get_json(silent=True) or {}, partial=True)
        except ValidationError as err:
            return jsonify({"errors": err.messages}), 422
        if not payload:
            return jsonify({"error": "Nothing to update."}), 400
        item = table.update(item_id, session["user_id"], payload)
        if not item:
            return jsonify({"error": "Not found."}), 404
        return jsonify({"item": item}), 200

    @login_required
    @csrf_protect
    def _delete(item_id: int):
        if not table.delete(item_id, session["user_id"]):
            return jsonify({"error": "Not found."}), 404
        return "", 204

    # Rate-limit the mutating views; reads are unthrottled like /calculators.
    create_view = limiter.limit(_WRITE_LIMIT)(_create)
    update_view = limiter.limit(_WRITE_LIMIT)(_update)
    delete_view = limiter.limit(_WRITE_LIMIT)(_delete)

    bp.add_url_rule(f"/{path}", endpoint=f"list_{path}", view_func=_list, methods=["GET"])
    bp.add_url_rule(f"/{path}", endpoint=f"create_{path}", view_func=create_view, methods=["POST"])
    bp.add_url_rule(f"/{path}/<int:item_id>", endpoint=f"update_{path}", view_func=update_view, methods=["PUT"])
    bp.add_url_rule(f"/{path}/<int:item_id>", endpoint=f"delete_{path}", view_func=delete_view, methods=["DELETE"])


_register_crud("assets", nw.ASSETS, AssetSchema)
_register_crud("liabilities", nw.LIABILITIES, LiabilitySchema)
_register_crud("investments", nw.INVESTMENTS, InvestmentSchema)
_register_crud("real-estate", nw.REAL_ESTATE, RealEstateSchema)


# ---------------------------------------------------------------------------- #
# Summary — the aggregated read the dashboard renders.
# ---------------------------------------------------------------------------- #
@bp.route("/summary", methods=["GET"])
@login_required
def get_summary():
    return jsonify(nw.get_summary(session["user_id"])), 200


# ---------------------------------------------------------------------------- #
# Snapshots — point-in-time history.
# ---------------------------------------------------------------------------- #
_snapshot_schema = SnapshotSchema()


@bp.route("/snapshots", methods=["GET"])
@login_required
def list_snapshots():
    return jsonify({"items": nw.list_snapshots(session["user_id"])}), 200


@bp.route("/snapshots", methods=["POST"])
@login_required
@csrf_protect
@limiter.limit(_WRITE_LIMIT)
def create_snapshot():
    try:
        payload = _snapshot_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    snapshot = nw.create_snapshot(
        session["user_id"], payload.get("snapshot_date"), payload.get("notes")
    )
    return jsonify({"item": snapshot}), 201
