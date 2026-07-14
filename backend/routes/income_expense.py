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
from schemas.income_expense_schema import (
    TransactionSchema,
    MonthGridSchema,
    CategorySchema,
    CategoryArchiveSchema,
)
from utils.auth_helpers import login_required, csrf_protect
from app import limiter

bp = Blueprint("income_expense", __name__, url_prefix="/api/income-expense")

_WRITE_LIMIT = "120 per hour; 30 per minute"
_schema = TransactionSchema()
_grid_schema = MonthGridSchema()
_category_schema = CategorySchema()
_category_archive_schema = CategoryArchiveSchema()


def _category_error(cat_type: str, category: str):
    """422 body for a category that isn't in the user's active set — schemas
    can't see per-user categories, so the routes check at the model layer."""
    return (
        jsonify(
            {"errors": {"category": [f"Unknown or archived {cat_type} category '{category}'."]}}
        ),
        422,
    )

# Sane calendar bounds for the monthly-grid URL params (int converter already
# rejects non-numeric; this rejects nonsense like month 13 or year 10000).
_YEAR_RANGE = range(1900, 2101)
_MONTH_RANGE = range(1, 13)


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
    if payload["category"] not in ie.active_category_keys(session["user_id"], payload["type"]):
        return _category_error(payload["type"], payload["category"])
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
    # A type or category change must land on an ACTIVE (type, category) pair —
    # merge with the stored row so a partial body is judged as its result. An
    # edit that touches neither keeps a legacy/archived category untouched.
    if "type" in payload or "category" in payload:
        existing = ie.get(txn_id, session["user_id"])
        if not existing:
            return jsonify({"error": "Not found."}), 404
        cat_type = payload.get("type", existing["type"])
        category = payload.get("category", existing["category"])
        if category not in ie.active_category_keys(session["user_id"], cat_type):
            return _category_error(cat_type, category)
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


# --------------------------------------------------------------------------- #
# Monthly grid (bulk month entry) — see DECISIONS.md § "Income & Expense
# Tracker" (Monthly grid bulk entry). GET returns the month's aggregate cells +
# read-only manual sums; PUT replaces the month's 'monthly' rows wholesale.
# --------------------------------------------------------------------------- #
def _valid_year_month(year: int, month: int) -> bool:
    return year in _YEAR_RANGE and month in _MONTH_RANGE


@bp.route("/months/<int:year>/<int:month>", methods=["GET"])
@login_required
def get_month(year: int, month: int):
    if not _valid_year_month(year, month):
        return jsonify({"error": "Invalid year/month."}), 422
    return jsonify(ie.get_month(session["user_id"], year, month)), 200


@bp.route("/months/<int:year>/<int:month>", methods=["PUT"])
@login_required
@csrf_protect
@limiter.limit(_WRITE_LIMIT)
def put_month(year: int, month: int):
    if not _valid_year_month(year, month):
        return jsonify({"error": "Invalid year/month."}), 422
    try:
        payload = _grid_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    active = {t: ie.active_category_keys(session["user_id"], t) for t in ("income", "expense")}
    for cell in payload["cells"]:
        if cell["category"] not in active[cell["type"]]:
            return _category_error(cell["type"], cell["category"])
    return jsonify(ie.replace_month(session["user_id"], year, month, payload["cells"])), 200


# --------------------------------------------------------------------------- #
# Categories — user-scoped, customizable (v0.15.1). Archive is a soft delete
# (history keeps aggregating); POSTing a name that matches an archived category
# restores it instead of duplicating. See DECISIONS.md § "Income & Expense
# Tracker" (Custom categories).
# --------------------------------------------------------------------------- #
@bp.route("/categories", methods=["GET"])
@login_required
def list_categories():
    return jsonify({"items": ie.list_categories(session["user_id"])}), 200


@bp.route("/categories", methods=["POST"])
@login_required
@csrf_protect
@limiter.limit(_WRITE_LIMIT)
def create_category():
    try:
        payload = _category_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    item, outcome = ie.create_category(session["user_id"], payload["type"], payload["name"])
    if outcome == "conflict":
        return jsonify({"error": f"Category '{item['name']}' already exists.", "item": item}), 409
    return jsonify({"item": item, "restored": outcome == "restored"}), (
        200 if outcome == "restored" else 201
    )


@bp.route("/categories/<int:cat_id>", methods=["PATCH"])
@login_required
@csrf_protect
@limiter.limit(_WRITE_LIMIT)
def patch_category(cat_id: int):
    try:
        payload = _category_archive_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422
    item = ie.set_category_archived(cat_id, session["user_id"], payload["archived"])
    if not item:
        return jsonify({"error": "Not found."}), 404
    return jsonify({"item": item}), 200
