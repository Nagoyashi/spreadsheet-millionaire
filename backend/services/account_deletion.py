"""
services/account_deletion.py
----------------------------
The single account-deletion path (#179) — hard delete with an explicit,
verified cascade across every user-scoped table.

Why a service when the schema already has ON DELETE CASCADE everywhere: the
cascade is *implicit* — nothing owned the enumeration, nothing verified it, and
a future table added without the FK clause would silently orphan financial rows.
This module makes the contract explicit:

  USER_SCOPED_TABLES        — the authoritative registry of tables holding user
                              rows (mirrors db_init.py; #180 export, #182 admin
                              deletion/export, and the #186 cascade test all
                              derive from THIS list, never their own).
  delete_account(user_id)   — counts rows per table (the erasure report), deletes
                              the user row, then VERIFIES every table is empty
                              for that user before committing. Any surviving row
                              → rollback + CascadeIntegrityError: we fail the
                              deletion loudly rather than half-delete.
  verify_cascade_coverage() — schema-drift guard: asks information_schema for
                              every FK referencing users(id) and reports any
                              CASCADE table missing from the registry (or a
                              registry table missing the CASCADE clause).

Deliberately retained after deletion (both GDPR-clean, no PII in their rows):
  admin_audit_log            — admin/target FKs are ON DELETE SET NULL; detail
                               payloads carry tier/flag values, never emails.
  calculator_publish         — config table; updated_by is ON DELETE SET NULL.

Sessions: the caller clears the current session; any *other* live session dies
on its next request because the user row is gone (get_current_user → None → 401,
handled by the client's central 401 logout).

GDPR note (privacy page § "Your rights and choices"): the log line emitted here
carries the numeric user id and row counts only — never the email.
"""

import logging

from db import get_db

logger = logging.getLogger("app.account")

# The authoritative list of user-scoped tables (all FK user_id → users.id with
# ON DELETE CASCADE in db_init.py). ADDING A USER-SCOPED TABLE? Add it here in
# the same PR — verify_cascade_coverage() (and the #186 test) will fail loudly
# if this list and the live schema ever disagree.
USER_SCOPED_TABLES = (
    "saved_calculators",
    "password_reset_tokens",
    "nw_assets",
    "nw_liabilities",
    "nw_investment_holdings",
    "nw_real_estate",
    "nw_snapshots",
    "ie_transactions",
)


class CascadeIntegrityError(Exception):
    """Raised when rows survive the user-row delete — the cascade is broken
    (a table lost its ON DELETE CASCADE). The transaction is rolled back, so
    the account is NOT half-deleted; the 500 this causes is the correct,
    loud failure mode."""


def delete_account(user_id: int) -> dict | None:
    """
    Permanently delete a user and every row they own. Returns the erasure
    report {"user_id": ..., "deleted": {table: rowcount, ...}} or None when no
    such user exists. Single transaction: count → delete → verify → commit.
    """
    conn = get_db()

    # Row counts first — this is the erasure report (and what #182's admin
    # surface will show). Table names come from the fixed registry above, never
    # from input, so the interpolation is not an injection surface.
    counts = {}
    for table in USER_SCOPED_TABLES:
        row = conn.execute(
            f"SELECT COUNT(*) AS n FROM {table} WHERE user_id = %s", (user_id,)  # noqa: S608 — fixed identifier
        ).fetchone()
        counts[table] = row["n"]

    cursor = conn.execute("DELETE FROM users WHERE id = %s", (user_id,))
    if cursor.rowcount == 0:
        conn.rollback()
        return None

    # Belt and braces: the FKs should have cascaded everything. If any row
    # survived, the schema has drifted — abort rather than commit a half-wipe.
    survivors = []
    for table in USER_SCOPED_TABLES:
        row = conn.execute(
            f"SELECT COUNT(*) AS n FROM {table} WHERE user_id = %s", (user_id,)  # noqa: S608 — fixed identifier
        ).fetchone()
        if row["n"]:
            survivors.append(f"{table} ({row['n']} rows)")
    if survivors:
        conn.rollback()
        raise CascadeIntegrityError(
            "Account deletion aborted — rows survived the cascade: "
            + ", ".join(survivors)
            + ". A user-scoped table is missing ON DELETE CASCADE."
        )

    conn.commit()
    logger.info(
        "account deleted",
        extra={"user_id": user_id, "deleted": counts},
    )
    return {"user_id": user_id, "deleted": counts}


def verify_cascade_coverage() -> list[str]:
    """
    Schema-drift guard. Compares the live schema's user-FK tables against
    USER_SCOPED_TABLES and returns a list of human-readable problems (empty =
    healthy). Two failure directions:
      - a table cascades from users(id) but isn't in the registry → deletion
        works but export/report/tests don't know the table exists;
      - a registry table's FK isn't CASCADE (or is missing) → deletion would
        orphan rows (delete_account would then abort at runtime).
    """
    conn = get_db()
    rows = conn.execute(
        """
        SELECT tc.table_name, rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc
          ON rc.constraint_name = tc.constraint_name
         AND rc.constraint_schema = tc.constraint_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.constraint_schema = tc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'users'
          AND ccu.column_name = 'id'
        """
    ).fetchall()

    # Deliberate non-cascade referencers (see module doc).
    retained = {"admin_audit_log", "calculator_publish"}

    problems = []
    cascading = set()
    for r in rows:
        table, rule = r["table_name"], r["delete_rule"]
        if rule == "CASCADE":
            cascading.add(table)
            if table not in USER_SCOPED_TABLES:
                problems.append(
                    f"'{table}' cascades from users(id) but is missing from "
                    "USER_SCOPED_TABLES — add it to the registry."
                )
        elif table not in retained:
            problems.append(
                f"'{table}' references users(id) with ON DELETE {rule} and is not "
                "a known retained table — decide: CASCADE it or add it to the "
                "retained set."
            )
    for table in USER_SCOPED_TABLES:
        if table not in cascading:
            problems.append(
                f"'{table}' is in USER_SCOPED_TABLES but has no ON DELETE CASCADE "
                "FK to users(id) — deletion would orphan its rows."
            )
    return problems
