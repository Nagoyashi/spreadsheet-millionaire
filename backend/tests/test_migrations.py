"""
Migration-system tests (#184) — the db_init.py contract.

The "migration system" is deliberately boring: idempotent DDL (CREATE IF NOT
EXISTS + additive ADD COLUMN IF NOT EXISTS + drop-and-recreate CHECKs + ON
CONFLICT DO NOTHING seeds), re-run on every deploy via gunicorn's migrate-on-
boot. These tests pin the behaviors that carry money/data weight:

  1. re-running init_db on a current schema is a no-op that loses nothing;
  2. init_db migrates an OLDER schema forward (re-adds dropped/renamed-era
     columns with their defaults backfilled) — the actual "migration" path;
  3. CHECK constraints are rebuilt from the Python source of truth, so a stale
     DB-side allowed-set never wins over calc_types/user_tiers;
  4. publish-state seeding backfills missing rows but NEVER resets an admin's
     live toggle (migrate-on-boot runs every deploy — a reset would silently
     unpublish the site).

DB-backed (skipped without TEST_DATABASE_URL; hard-fail in CI, #183).
"""

import os

import psycopg
import pytest

import db_init

_TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", "").strip()


def _exec(sql, params=None):
    with psycopg.connect(_TEST_DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            if cur.description:
                return cur.fetchall()
        conn.commit()
    return None


def _column_exists(table: str, column: str) -> bool:
    rows = _exec(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = %s AND column_name = %s",
        (table, column),
    )
    return bool(rows)


def test_init_db_is_idempotent_and_preserves_data(db, client, get_csrf_token):
    # Seed real data through the app.
    token = get_csrf_token(client)
    resp = client.post(
        "/api/auth/register",
        headers={"X-CSRF-Token": token},
        json={"email": "migrate@example.com", "password": "Testpass123"},
    )
    assert resp.status_code == 201

    # Re-run the migration on the current schema — must not raise, must not lose.
    db_init.init_db()
    db_init.init_db()
    rows = _exec("SELECT COUNT(*) FROM users WHERE email = 'migrate@example.com'")
    assert rows[0][0] == 1


def test_init_db_migrates_an_older_schema_forward(db):
    """Simulate a pre-upgrade database by dropping the columns later releases
    added (users.last_login_at from v0.12, ie_transactions recurrence from
    post-v0.11) — init_db must re-add them with their defaults."""
    _exec("ALTER TABLE users DROP COLUMN IF EXISTS last_login_at")
    _exec("ALTER TABLE ie_transactions DROP COLUMN IF EXISTS recurrence_unit CASCADE")
    assert not _column_exists("users", "last_login_at")
    assert not _column_exists("ie_transactions", "recurrence_unit")

    db_init.init_db()

    assert _column_exists("users", "last_login_at")
    assert _column_exists("ie_transactions", "recurrence_unit")
    # The additive column carries its documented default for pre-existing rows.
    rows = _exec(
        "SELECT column_default FROM information_schema.columns "
        "WHERE table_name = 'ie_transactions' AND column_name = 'recurrence_unit'"
    )
    assert "none" in rows[0][0]


def test_check_constraints_rebuild_from_python_source(db):
    """A stale DB-side CHECK (e.g. hand-edited, or from an older release with a
    smaller allowed set) must lose to the Python source on the next boot."""
    # Replace the tier CHECK with a stale one that only allows 'free'.
    _exec("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tier_check")
    _exec("ALTER TABLE users ADD CONSTRAINT users_tier_check CHECK (tier IN ('free'))")

    with pytest.raises(psycopg.errors.CheckViolation):
        _exec(
            "INSERT INTO users (email, password_hash, tier) VALUES (%s, %s, 'pro')",
            ("stale-check@example.com", "x" * 60),
        )

    db_init.init_db()  # rebuilds the CHECK from USER_TIERS

    _exec(
        "INSERT INTO users (email, password_hash, tier) VALUES (%s, %s, 'pro')",
        ("rebuilt-check@example.com", "x" * 60),
    )  # no raise — 'pro' is in USER_TIERS again

    # ...and values outside the source list still fail (the CHECK is real).
    with pytest.raises(psycopg.errors.CheckViolation):
        _exec(
            "INSERT INTO users (email, password_hash, tier) VALUES (%s, %s, 'platinum')",
            ("invalid-tier@example.com", "x" * 60),
        )


def test_publish_seeding_backfills_but_never_resets_toggles(db):
    """Migrate-on-boot runs every deploy. It must backfill publish rows for
    newly-added types, but a re-run must NEVER reset an admin's live toggle —
    that would silently unpublish (or re-publish) the site on deploy."""
    # conftest's TRUNCATE users CASCADE empties calculator_publish (updated_by
    # FK), so seed it first — this run also proves seeding-from-empty.
    db_init.init_db()

    # Flip a default-published calculator off, as an admin would.
    _exec("UPDATE calculator_publish SET published = false WHERE calc_type = 'fire'")
    # Delete another row entirely, simulating a type added after this DB was made.
    _exec("DELETE FROM calculator_publish WHERE calc_type = 'compound'")

    db_init.init_db()

    rows = dict(_exec("SELECT calc_type, published FROM calculator_publish"))
    assert rows["fire"] is False       # admin toggle survived the re-run
    assert rows["compound"] is True    # missing row backfilled to its default
