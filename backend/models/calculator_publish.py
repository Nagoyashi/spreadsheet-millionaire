"""
models/calculator_publish.py
----------------------------
Data-access for the calculator_publish table — the runtime source of truth for
which calculators are live on the public /app.

The admin portal toggles these rows; the public site reads them at request time,
so publishing/unpublishing happens without a redeploy. The frontend registry
still owns calculator *metadata* (name, icon, category); only the published
*state* lives here. See DECISIONS.md § "Runtime publish state — DB-backed,
admin-toggleable".

No ORM — plain parameterised SQL, same posture as the other models. This table
is global (not user-scoped), so there is no user_id filter to apply; writes are
gated at the route layer by admin_required (hard rule #8: UI / route / DB).
"""

from db import get_db


def list_all() -> list[dict]:
    """Every publish row, ordered by calc_type. Shape:
    [{calc_type, published, updated_at, updated_by}, ...]."""
    conn = get_db()
    rows = conn.execute(
        "SELECT calc_type, published, updated_at, updated_by "
        "FROM calculator_publish ORDER BY calc_type"
    ).fetchall()
    return [dict(r) for r in rows]


def published_types() -> list[str]:
    """Just the calc_type strings that are currently published — what the public
    /app needs to know. A short, cacheable list."""
    conn = get_db()
    rows = conn.execute(
        "SELECT calc_type FROM calculator_publish WHERE published = true "
        "ORDER BY calc_type"
    ).fetchall()
    return [r["calc_type"] for r in rows]


def set_published(calc_type: str, published: bool, admin_user_id: int) -> dict | None:
    """Flip one calculator's published flag, stamping who changed it and when.

    Scoped to a single known calc_type (the row must already exist — db_init
    seeds one per VALID_CALC_TYPES). Returns the updated row, or None if the
    calc_type is unknown (the route turns that into a 404)."""
    conn = get_db()
    row = conn.execute(
        "UPDATE calculator_publish "
        "SET published = %s, updated_at = now(), updated_by = %s "
        "WHERE calc_type = %s "
        "RETURNING calc_type, published, updated_at, updated_by",
        (bool(published), admin_user_id, calc_type),
    ).fetchone()
    conn.commit()
    return dict(row) if row else None
