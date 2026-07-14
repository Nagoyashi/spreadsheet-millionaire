"""
models/income_expense.py
------------------------
Data-access for the Income & Expense tracker's ie_transactions table.

One normalised stream of income/expense rows (sign carried by `type`, amount > 0)
+ a SQL-aggregated summary (monthly + yearly income-vs-expense and by-category).
Every query filters user_id — the IDOR boundary (hard rule #6). NUMERIC comes
back as Decimal and DATE as date; _row_to_dict normalises to float / ISO.
"""

import re
from datetime import date, datetime
from decimal import Decimal

from db import get_db
from income_expense_types import DEFAULT_CATEGORIES

# Insert/update allow-list (server-side, never request input).
_COLUMNS = (
    "type",
    "category",
    "amount",
    "occurred_on",
    "note",
    "recurrence_unit",
    "recurrence_interval",
)


def _jsonify_value(v):
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return v


def _row_to_dict(row: dict) -> dict:
    return {k: _jsonify_value(v) for k, v in row.items()}


def list_for_user(user_id: int, year: int | None = None, month: int | None = None) -> list[dict]:
    """Transactions for a user, newest first, optionally filtered by year/month."""
    clauses = ["user_id = %s"]
    params: list = [user_id]
    if year is not None:
        clauses.append("EXTRACT(YEAR FROM occurred_on) = %s")
        params.append(year)
    if month is not None:
        clauses.append("EXTRACT(MONTH FROM occurred_on) = %s")
        params.append(month)

    conn = get_db()
    rows = conn.execute(
        f"SELECT * FROM ie_transactions WHERE {' AND '.join(clauses)} "
        "ORDER BY occurred_on DESC, id DESC",
        params,
    ).fetchall()
    return [_row_to_dict(r) for r in rows]


def get(txn_id: int, user_id: int) -> dict | None:
    """Fetch by id AND user_id — prevents cross-user access."""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM ie_transactions WHERE id = %s AND user_id = %s",
        (txn_id, user_id),
    ).fetchone()
    return _row_to_dict(row) if row else None


def create(user_id: int, data: dict) -> dict:
    cols = [c for c in _COLUMNS if c in data]
    insert_cols = ["user_id", *cols]
    placeholders = ", ".join(["%s"] * len(insert_cols))
    values = [user_id, *(data[c] for c in cols)]

    conn = get_db()
    row = conn.execute(
        f"INSERT INTO ie_transactions ({', '.join(insert_cols)}) "
        f"VALUES ({placeholders}) RETURNING id",
        values,
    ).fetchone()
    conn.commit()
    return get(row["id"], user_id)


def update(txn_id: int, user_id: int, data: dict) -> dict | None:
    """Partial update of the provided allow-listed columns. None if not found / wrong user."""
    existing = get(txn_id, user_id)
    if not existing:
        return None
    cols = [c for c in _COLUMNS if c in data]
    if not cols:
        return existing

    assignments = ", ".join(f"{c} = %s" for c in cols)
    conn = get_db()
    conn.execute(
        f"UPDATE ie_transactions SET {assignments} WHERE id = %s AND user_id = %s",
        [*(data[c] for c in cols), txn_id, user_id],
    )
    conn.commit()
    return get(txn_id, user_id)


def delete(txn_id: int, user_id: int) -> bool:
    conn = get_db()
    cursor = conn.execute(
        "DELETE FROM ie_transactions WHERE id = %s AND user_id = %s",
        (txn_id, user_id),
    )
    conn.commit()
    return cursor.rowcount > 0


# Note: the column allow-list above is composed of server-side constants, never
# request keys, so the f-string column interpolation has no injection surface
# (values are always bound as %s). This mirrors the net_worth model's rationale.


# --------------------------------------------------------------------------- #
# Categories — user-scoped, customizable (v0.15.1). Archive is a soft delete;
# re-adding a case-insensitively matching name restores the archived row rather
# than duplicating it. See DECISIONS.md § "Income & Expense Tracker".
# --------------------------------------------------------------------------- #
def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "category"


def ensure_categories_seeded(user_id: int) -> None:
    """First touch of the categories surface seeds the defaults (both types).
    Keys equal the pre-v0.15.1 curated slugs, so historical transaction rows
    resolve against a seeded category. Idempotent — a user with ANY category
    row is left alone."""
    conn = get_db()
    row = conn.execute(
        "SELECT 1 FROM ie_categories WHERE user_id = %s LIMIT 1", (user_id,)
    ).fetchone()
    if row:
        return
    for cat_type, defaults in DEFAULT_CATEGORIES.items():
        for key, name in defaults:
            conn.execute(
                "INSERT INTO ie_categories (user_id, type, key, name) "
                "VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
                (user_id, cat_type, key, name),
            )
    conn.commit()


def list_categories(user_id: int) -> list[dict]:
    """All of a user's categories (active + archived), seed order then creation
    order. Seeds the defaults on first touch."""
    ensure_categories_seeded(user_id)
    conn = get_db()
    rows = conn.execute(
        "SELECT id, type, key, name, archived FROM ie_categories "
        "WHERE user_id = %s ORDER BY id",
        (user_id,),
    ).fetchall()
    return [_row_to_dict(r) for r in rows]


def create_category(user_id: int, cat_type: str, name: str) -> tuple[dict | None, str]:
    """Create a category, or restore the archived one whose name matches
    case-insensitively (duplicate-avoidance). Returns (row, outcome) where
    outcome is 'created' | 'restored' | 'conflict' (row is the existing active
    duplicate for 'conflict')."""
    ensure_categories_seeded(user_id)
    name = name.strip()
    conn = get_db()
    existing = conn.execute(
        "SELECT id, type, key, name, archived FROM ie_categories "
        "WHERE user_id = %s AND type = %s AND lower(name) = lower(%s)",
        (user_id, cat_type, name),
    ).fetchone()
    if existing:
        if existing["archived"]:
            conn.execute(
                "UPDATE ie_categories SET archived = FALSE "
                "WHERE id = %s AND user_id = %s",
                (existing["id"], user_id),
            )
            conn.commit()
            return get_category(existing["id"], user_id), "restored"
        return _row_to_dict(existing), "conflict"

    # Immutable key: slug of the name, suffixed until unique per (user, type) —
    # archived rows included, since a key on old transaction rows must never be
    # reused for a different category.
    base = _slugify(name)
    taken = {
        r["key"]
        for r in conn.execute(
            "SELECT key FROM ie_categories WHERE user_id = %s AND type = %s",
            (user_id, cat_type),
        ).fetchall()
    }
    key = base
    suffix = 2
    while key in taken:
        key = f"{base}-{suffix}"
        suffix += 1

    row = conn.execute(
        "INSERT INTO ie_categories (user_id, type, key, name) "
        "VALUES (%s, %s, %s, %s) RETURNING id",
        (user_id, cat_type, key, name),
    ).fetchone()
    conn.commit()
    return get_category(row["id"], user_id), "created"


def get_category(cat_id: int, user_id: int) -> dict | None:
    conn = get_db()
    row = conn.execute(
        "SELECT id, type, key, name, archived FROM ie_categories "
        "WHERE id = %s AND user_id = %s",
        (cat_id, user_id),
    ).fetchone()
    return _row_to_dict(row) if row else None


def set_category_archived(cat_id: int, user_id: int, archived: bool) -> dict | None:
    """Soft delete / restore. None if not found / wrong user."""
    conn = get_db()
    cursor = conn.execute(
        "UPDATE ie_categories SET archived = %s WHERE id = %s AND user_id = %s",
        (archived, cat_id, user_id),
    )
    conn.commit()
    return get_category(cat_id, user_id) if cursor.rowcount else None


def active_category_keys(user_id: int, cat_type: str) -> set[str]:
    """The user's active category keys for one type — the write-time validity
    set for transactions and grid cells (seeds defaults on first touch)."""
    ensure_categories_seeded(user_id)
    conn = get_db()
    rows = conn.execute(
        "SELECT key FROM ie_categories "
        "WHERE user_id = %s AND type = %s AND archived = FALSE",
        (user_id, cat_type),
    ).fetchall()
    return {r["key"] for r in rows}


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    """[start, end) date bounds for one calendar month."""
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end


def get_month(user_id: int, year: int, month: int) -> dict:
    """The monthly grid's state for one month: the aggregate ('monthly') cells,
    plus read-only per-(type, category) sums of the individually-entered
    ('manual') rows so the UI can show what's already tracked.

    Buckets by month RANGE, not the exact first-of-month date, so a monthly row
    whose date was edited through the transactions API still shows in its month;
    duplicate rows per cell (only reachable via such edits) are summed here and
    collapsed by the next replace_month. See DECISIONS.md § "Income & Expense
    Tracker" (Monthly grid bulk entry).
    """
    start, end = _month_bounds(year, month)
    conn = get_db()
    rows = conn.execute(
        """
        SELECT source, type, category, SUM(amount) AS amount
        FROM ie_transactions
        WHERE user_id = %s AND occurred_on >= %s AND occurred_on < %s
        GROUP BY source, type, category
        """,
        (user_id, start, end),
    ).fetchall()

    cells = []
    manual_sums = {"income": {}, "expense": {}}
    for r in rows:
        if r["source"] == "monthly":
            cells.append(
                {"type": r["type"], "category": r["category"], "amount": float(r["amount"])}
            )
        else:
            manual_sums[r["type"]][r["category"]] = (
                manual_sums[r["type"]].get(r["category"], 0.0) + float(r["amount"])
            )
    return {"year": year, "month": month, "cells": cells, "manual_sums": manual_sums}


def replace_month(user_id: int, year: int, month: int, cells: list[dict]) -> dict:
    """Replace one month's aggregate ('monthly') rows wholesale: delete the
    bucket, insert the submitted cells at the first of the month, commit once
    (delete + inserts are a single transaction). A cell absent from the payload
    is cleared — no upsert bookkeeping. Manual rows are untouched.

    The wholesale delete is scoped to the user's ACTIVE categories — aggregate
    rows for archived categories are preserved (the grid renders them read-only;
    restore the category to edit them). The route validates every submitted
    cell against the active sets before calling this.
    """
    start, end = _month_bounds(year, month)
    conn = get_db()
    for cat_type in ("income", "expense"):
        keys = active_category_keys(user_id, cat_type)
        if keys:
            conn.execute(
                """
                DELETE FROM ie_transactions
                WHERE user_id = %s AND source = 'monthly' AND type = %s
                  AND category = ANY(%s)
                  AND occurred_on >= %s AND occurred_on < %s
                """,
                (user_id, cat_type, list(keys), start, end),
            )
    for cell in cells:
        conn.execute(
            """
            INSERT INTO ie_transactions (user_id, type, category, amount, occurred_on, source)
            VALUES (%s, %s, %s, %s, %s, 'monthly')
            """,
            (user_id, cell["type"], cell["category"], cell["amount"], start),
        )
    conn.commit()
    return get_month(user_id, year, month)


def get_summary(user_id: int, year: int | None = None) -> dict:
    """Monthly + yearly income-vs-expense and by-category totals for one year,
    plus the list of years that have data (for a year selector)."""
    conn = get_db()

    # Default to the current calendar year when unspecified (server-side).
    if year is None:
        year = conn.execute("SELECT EXTRACT(YEAR FROM CURRENT_DATE)::int AS y").fetchone()["y"]

    by_type_month = conn.execute(
        """
        SELECT EXTRACT(MONTH FROM occurred_on)::int AS month,
               type,
               SUM(amount) AS total
        FROM ie_transactions
        WHERE user_id = %s AND EXTRACT(YEAR FROM occurred_on) = %s
        GROUP BY month, type
        """,
        (user_id, year),
    ).fetchall()

    by_category_rows = conn.execute(
        """
        SELECT type, category, SUM(amount) AS total
        FROM ie_transactions
        WHERE user_id = %s AND EXTRACT(YEAR FROM occurred_on) = %s
        GROUP BY type, category
        """,
        (user_id, year),
    ).fetchall()

    years = conn.execute(
        """
        SELECT DISTINCT EXTRACT(YEAR FROM occurred_on)::int AS y
        FROM ie_transactions
        WHERE user_id = %s
        ORDER BY y DESC
        """,
        (user_id,),
    ).fetchall()

    # 12-month income/expense series.
    by_month = [{"month": m, "income": 0.0, "expense": 0.0} for m in range(1, 13)]
    for r in by_type_month:
        by_month[r["month"] - 1][r["type"]] = float(r["total"])

    income_total = sum(m["income"] for m in by_month)
    expense_total = sum(m["expense"] for m in by_month)

    by_category = {"income": {}, "expense": {}}
    for r in by_category_rows:
        by_category[r["type"]][r["category"]] = float(r["total"])

    return {
        "year": year,
        "totals": {
            "income": income_total,
            "expense": expense_total,
            "net": income_total - expense_total,
        },
        "by_month": by_month,
        "by_category": by_category,
        "available_years": [r["y"] for r in years],
    }
