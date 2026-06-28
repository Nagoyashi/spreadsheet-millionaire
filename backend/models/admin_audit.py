"""
models/admin_audit.py
---------------------
Append-only audit trail for privileged admin actions (tier changes, suspend/
reinstate). Write-only for now — a future phase can surface "this account's
history" via the target_user_id index. No ORM; parameterised SQL.

`detail` is JSONB (psycopg adapts a dict via Jsonb) so the before/after of a
change is queryable later, e.g. {"from": "free", "to": "pro"}.
"""

from psycopg.types.json import Jsonb

from db import get_db


def record(admin_user_id: int, action: str, target_user_id: int, detail: dict | None = None) -> None:
    """Append one audit entry. Committed by the caller's transaction is NOT
    assumed — this commits its own write so the trail persists even if a later
    step in the request fails."""
    conn = get_db()
    conn.execute(
        "INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, detail) "
        "VALUES (%s, %s, %s, %s)",
        (admin_user_id, action, target_user_id, Jsonb(detail or {})),
    )
    conn.commit()
