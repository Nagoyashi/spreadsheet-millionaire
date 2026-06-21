"""
routes/income_expense.py
------------------------
/api/income-expense/* — the Income & Expense tracker API.

Transactions CRUD (list filterable by ?year=&month=) + a SQL-aggregated
/summary. Every route @login_required; writes are CSRF-protected and
rate-limited. The user_id IDOR boundary lives in the model — every query filters
by user_id (hard rule #6).
"""

from flask import Blueprint, request, jsonify, session
from marshmallow import ValidationError

from models import income_expense as ie
from schemas.income_expense_schema import TransactionSchema
from utils.auth_helpers import login_required, csrf_protect
from app import limiter

bp = Blueprint("income_expense", __name__, url_prefix="/api/income-expense")

_WRITE_LIMIT = "120 per hour; 30 per minute"
_schema = TransactionSchema()


def _int_arg(name: str) -> int | None:
    """Parse an optional positive-int query arg; ignore anything non-numeric."""
    raw = request.args.get(name)
    if raw is None:
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


@bp.route("/transactions", methods=["GET"])
@login_required
def list_transactions():
    items = ie.list_for_user(session["user_id"], year=_int_arg("year"), month=_int_arg("month"))
    return jsonify({"items": items}), 200


@bp.route("/transactions", methods=["POST"])
@login_required
@csrf_protect
@limiter.limit(_WRITE_LIMIT)
def create_transaction():
    try:
        payload = _schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    return jsonify({"item": ie.create(session["user_id"], payload)}), 201


@bp.route("/transactions/<int:txn_id>", methods=["PUT"])
@login_required
@csrf_protect
@limiter.limit(_WRITE_LIMIT)
def update_transaction(txn_id: int):
    try:
        payload = _schema.load(request.get_json(silent=True) or {}, partial=True)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    if not payload:
        return jsonify({"error": "Nothing to update."}), 400
    item = ie.update(txn_id, session["user_id"], payload)
    if not item:
        return jsonify({"error": "Not found."}), 404
    return jsonify({"item": item}), 200


@bp.route("/transactions/<int:txn_id>", methods=["DELETE"])
@login_required
@csrf_protect
@limiter.limit(_WRITE_LIMIT)
def delete_transaction(txn_id: int):
    if not ie.delete(txn_id, session["user_id"]):
        return jsonify({"error": "Not found."}), 404
    return "", 204


@bp.route("/summary", methods=["GET"])
@login_required
def get_summary():
    return jsonify(ie.get_summary(session["user_id"], year=_int_arg("year"))), 200
