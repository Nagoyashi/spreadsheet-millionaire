"""
services/data_export.py
-----------------------
"Download my data" (#180) — assembles a complete, machine-readable JSON export
of everything we store for one user. The GDPR Article 15/20 counterpart to the
Article 17 deletion service (services/account_deletion.py).

The table list is DERIVED from account_deletion.USER_SCOPED_TABLES — the single
authoritative registry of user-scoped tables (single-source rule). If a new
table joins the registry, it appears in exports automatically; there is no
second list to forget.

Secret columns are stripped, not the rows that hold them: the user should see
*that* we hold a reset-token record (it's data about them) but never the hash
material itself. Same for their own password hash — it's a credential, not
exportable personal data.

Value normalisation follows the house pattern (models/net_worth._jsonify_value):
NUMERIC → float, DATE/TIMESTAMPTZ → ISO strings, so the export is plain JSON.

format_version starts at 1 — if the export shape ever changes, bump it so a
support conversation about an old file can identify what it's looking at.
"""

from datetime import date, datetime, timezone
from decimal import Decimal

from db import get_db
from services.account_deletion import USER_SCOPED_TABLES

FORMAT_VERSION = 1

# Columns that never leave the server, per table. Secrets/credentials only —
# everything else in a user-scoped row is the user's data and is exported.
_EXCLUDED_COLUMNS = {
    "users": {"password_hash"},
    "password_reset_tokens": {"token_hash"},
}


def _jsonify_value(v):
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return v


def _clean_row(table: str, row: dict) -> dict:
    excluded = _EXCLUDED_COLUMNS.get(table, set())
    return {k: _jsonify_value(v) for k, v in row.items() if k not in excluded}


def export_account(user_id: int) -> dict | None:
    """
    Return the full export payload for a user, or None when no such user
    exists. Read-only — one SELECT per table, all user_id-scoped (hard rule #6).
    """
    conn = get_db()

    account_row = conn.execute(
        "SELECT * FROM users WHERE id = %s", (user_id,)
    ).fetchone()
    if account_row is None:
        return None

    data = {}
    for table in USER_SCOPED_TABLES:
        # Fixed identifiers from the registry — never request input (rule #7).
        rows = conn.execute(
            f"SELECT * FROM {table} WHERE user_id = %s ORDER BY id",  # noqa: S608 — fixed identifier
            (user_id,),
        ).fetchall()
        data[table] = [_clean_row(table, r) for r in rows]

    return {
        "format_version": FORMAT_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "account": _clean_row("users", account_row),
        "data": data,
    }
