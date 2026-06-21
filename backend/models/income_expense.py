"""
models/income_expense.py
------------------------
Data-access for the Income & Expense tracker's ie_transactions table.

One normalised stream of income/expense rows (sign carried by `type`, amount > 0)
+ a SQL-aggregated summary (monthly + yearly income-vs-expense and by-category).
Every query filters user_id — the IDOR boundary (hard rule #6). NUMERIC comes
back as Decimal and DATE as date; _row_to_dict normalises to float / ISO.
"""

from datetime import date, datetime
from decimal import Decimal

from db import get_db

# Insert/update allow-list (server-side, never request input).
_COLUMNS = ("type", "category", "amount", "occurred_on", "note")


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
