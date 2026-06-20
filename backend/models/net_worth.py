"""
models/net_worth.py
-------------------
Data-access layer for the Net Worth tracker's nw_* tables.

Two things differ from models/calculator.py (which stores an opaque JSONB blob):

  1. These are normalised tables with typed columns, so a single generic
     user-scoped CRUD helper (NetWorthTable) serves all four resource tables.
     Table and column identifiers are composed with psycopg.sql.Identifier from
     server-side allow-lists (the `columns` tuples below) — NEVER from request
     input — so there is no injection surface even though identifiers can't be
     bound as %s params (hard rule #7).

  2. NUMERIC columns come back from psycopg as Decimal and DATE/TIMESTAMPTZ as
     date/datetime. _row_to_dict normalises those to JSON-friendly float / ISO
     strings so the API returns clean numbers and yyyy-mm-dd dates.

Every query is filtered by user_id — the IDOR boundary (hard rule #6).
"""

from datetime import date, datetime
from decimal import Decimal

from psycopg import sql

from db import get_db


def _jsonify_value(v):
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return v


def _row_to_dict(row: dict) -> dict:
    return {k: _jsonify_value(v) for k, v in row.items()}


class NetWorthTable:
    """Generic user-scoped CRUD for one nw_* table."""

    def __init__(self, table: str, columns: tuple[str, ...]):
        self.table = table
        self.columns = columns  # user-writable columns (insert + update allow-list)

    def _id(self) -> sql.Identifier:
        return sql.Identifier(self.table)

    def list_for_user(self, user_id: int) -> list[dict]:
        conn = get_db()
        rows = conn.execute(
            sql.SQL(
                "SELECT * FROM {} WHERE user_id = %s ORDER BY created_at DESC"
            ).format(self._id()),
            (user_id,),
        ).fetchall()
        return [_row_to_dict(r) for r in rows]

    def get(self, row_id: int, user_id: int) -> dict | None:
        """Fetch by id AND user_id — prevents cross-user access."""
        conn = get_db()
        row = conn.execute(
            sql.SQL("SELECT * FROM {} WHERE id = %s AND user_id = %s").format(self._id()),
            (row_id, user_id),
        ).fetchone()
        return _row_to_dict(row) if row else None

    def create(self, user_id: int, data: dict) -> dict:
        cols = [c for c in self.columns if c in data]
        insert_cols = ["user_id", *cols]
        values = [user_id, *(data[c] for c in cols)]

        conn = get_db()
        row = conn.execute(
            sql.SQL("INSERT INTO {} ({}) VALUES ({}) RETURNING id").format(
                self._id(),
                sql.SQL(", ").join(sql.Identifier(c) for c in insert_cols),
                sql.SQL(", ").join(sql.Placeholder() for _ in insert_cols),
            ),
            values,
        ).fetchone()
        conn.commit()
        return self.get(row["id"], user_id)

    def update(self, row_id: int, user_id: int, data: dict) -> dict | None:
        """Partial update — only the provided allow-listed columns are written.
        Returns None if the row doesn't exist or belongs to another user."""
        existing = self.get(row_id, user_id)
        if not existing:
            return None

        cols = [c for c in self.columns if c in data]
        if not cols:
            return existing  # nothing to change

        conn = get_db()
        conn.execute(
            sql.SQL("UPDATE {} SET {} WHERE id = %s AND user_id = %s").format(
                self._id(),
                sql.SQL(", ").join(
                    sql.SQL("{} = {}").format(sql.Identifier(c), sql.Placeholder())
                    for c in cols
                ),
            ),
            [*(data[c] for c in cols), row_id, user_id],
        )
        conn.commit()
        return self.get(row_id, user_id)

    def delete(self, row_id: int, user_id: int) -> bool:
        """True if a row was deleted, False if not found / wrong user."""
        conn = get_db()
        cursor = conn.execute(
            sql.SQL("DELETE FROM {} WHERE id = %s AND user_id = %s").format(self._id()),
            (row_id, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0


# ---------------------------------------------------------------------------- #
# Resource tables — column tuples are the insert/update allow-list (server-side,
# never user input). 'custom' assets surface as Collectibles in the UI.
# ---------------------------------------------------------------------------- #
ASSETS = NetWorthTable(
    "nw_assets",
    ("asset_type", "name", "current_value", "cost_basis", "notes"),
)
LIABILITIES = NetWorthTable(
    "nw_liabilities",
    ("liability_type", "name", "current_balance", "interest_rate",
     "minimum_payment", "due_date", "notes"),
)
INVESTMENTS = NetWorthTable(
    "nw_investment_holdings",
    ("ticker", "quantity", "cost_basis", "current_value", "asset_class",
     "region", "purchase_date", "notes"),
)
REAL_ESTATE = NetWorthTable(
    "nw_real_estate",
    ("property_name", "property_type", "current_value", "purchase_price",
     "purchase_date", "mortgage_balance", "mortgage_interest_rate",
     "mortgage_payment", "mortgage_term_years", "monthly_rent", "address", "notes"),
)

# Liquid = these asset_types; the rest ('custom') are collectibles.
_LIQUID_ASSET_TYPES = ("cash", "brokerage", "crypto", "pension")


# ---------------------------------------------------------------------------- #
# Summary — SQL-aggregated totals + breakdown, the IDOR-scoped read the
# dashboard renders. Mortgages roll up from real estate into total liabilities.
# ---------------------------------------------------------------------------- #
def get_summary(user_id: int) -> dict:
    conn = get_db()

    asset_rows = conn.execute(
        """
        SELECT asset_type,
               COALESCE(SUM(current_value), 0) AS total,
               COALESCE(SUM(cost_basis), 0)    AS cost_basis,
               COUNT(*)                        AS count
        FROM nw_assets
        WHERE user_id = %s
        GROUP BY asset_type
        """,
        (user_id,),
    ).fetchall()

    inv = conn.execute(
        """
        SELECT COALESCE(SUM(CASE WHEN current_value > 0
                                 THEN current_value
                                 ELSE quantity * cost_basis END), 0) AS total,
               COALESCE(SUM(quantity * cost_basis), 0)               AS cost_basis,
               COUNT(*)                                              AS count
        FROM nw_investment_holdings
        WHERE user_id = %s
        """,
        (user_id,),
    ).fetchone()

    re = conn.execute(
        """
        SELECT COALESCE(SUM(current_value), 0)    AS total,
               COALESCE(SUM(purchase_price), 0)   AS cost_basis,
               COALESCE(SUM(mortgage_balance), 0) AS mortgages,
               COUNT(*)                           AS count
        FROM nw_real_estate
        WHERE user_id = %s
        """,
        (user_id,),
    ).fetchone()

    li = conn.execute(
        """
        SELECT COALESCE(SUM(current_balance), 0) AS total,
               COUNT(*)                          AS count
        FROM nw_liabilities
        WHERE user_id = %s
        """,
        (user_id,),
    ).fetchone()

    # Asset rollups by category
    assets_by_type = {r["asset_type"]: float(r["total"]) for r in asset_rows}
    liquid_total = sum(
        float(r["total"]) for r in asset_rows if r["asset_type"] in _LIQUID_ASSET_TYPES
    )
    liquid_count = sum(
        int(r["count"]) for r in asset_rows if r["asset_type"] in _LIQUID_ASSET_TYPES
    )
    collectibles_total = sum(
        float(r["total"]) for r in asset_rows if r["asset_type"] == "custom"
    )
    collectibles_count = sum(
        int(r["count"]) for r in asset_rows if r["asset_type"] == "custom"
    )
    assets_cost_basis = sum(float(r["cost_basis"]) for r in asset_rows)

    investments_total = float(inv["total"])
    real_estate_total = float(re["total"])
    mortgages_total = float(re["mortgages"])

    total_assets = liquid_total + collectibles_total + investments_total + real_estate_total
    total_liabilities = float(li["total"]) + mortgages_total
    net_worth = total_assets - total_liabilities

    total_cost_basis = (
        assets_cost_basis + float(inv["cost_basis"]) + float(re["cost_basis"])
    )
    lifetime_gain = total_assets - total_cost_basis

    return {
        "net_worth": net_worth,
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "total_cost_basis": total_cost_basis,
        "lifetime_gain": lifetime_gain,
        "categories": {
            "liquid_assets": {"total": liquid_total, "count": liquid_count},
            "investments": {"total": investments_total, "count": int(inv["count"])},
            "real_estate": {"total": real_estate_total, "count": int(re["count"])},
            "collectibles": {"total": collectibles_total, "count": collectibles_count},
            "liabilities": {
                "total": total_liabilities,
                "count": int(li["count"]) + (1 if mortgages_total > 0 else 0),
            },
        },
        "assets_by_type": assets_by_type,
    }


# ---------------------------------------------------------------------------- #
# Snapshots — append-only point-in-time history. Totals are computed server-side
# from the current summary, so a snapshot is self-contained.
# ---------------------------------------------------------------------------- #
def list_snapshots(user_id: int) -> list[dict]:
    conn = get_db()
    rows = conn.execute(
        """
        SELECT * FROM nw_snapshots
        WHERE user_id = %s
        ORDER BY snapshot_date ASC, id ASC
        """,
        (user_id,),
    ).fetchall()
    return [_row_to_dict(r) for r in rows]


def create_snapshot(user_id: int, snapshot_date, notes: str | None) -> dict:
    """Capture the user's current net worth as a dated snapshot."""
    summary = get_summary(user_id)

    conn = get_db()
    row = conn.execute(
        """
        INSERT INTO nw_snapshots
            (user_id, snapshot_date, total_assets, total_liabilities, net_worth, notes)
        VALUES (%s, COALESCE(%s, CURRENT_DATE), %s, %s, %s, %s)
        RETURNING id
        """,
        (
            user_id,
            snapshot_date,
            summary["total_assets"],
            summary["total_liabilities"],
            summary["net_worth"],
            notes,
        ),
    ).fetchone()
    conn.commit()

    created = conn.execute(
        "SELECT * FROM nw_snapshots WHERE id = %s AND user_id = %s",
        (row["id"], user_id),
    ).fetchone()
    return _row_to_dict(created)
