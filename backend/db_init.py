"""
db_init.py
----------
Creates and migrates the Postgres (Neon) database schema.
Idempotent — re-running is always safe and a no-op on an up-to-date schema.

Usage:
    python db_init.py

Notes:
    - Postgres-native types: identity PKs (GENERATED ALWAYS AS IDENTITY),
      TIMESTAMPTZ timestamps, and a JSONB `data` column on saved_calculators.
      JSONB (over TEXT) lets Postgres validate/query the stored shape and lets
      psycopg round-trip Python dicts directly — no manual json.dumps/loads.
    - The calc_type CHECK constraint is named and rebuilt via DROP ... IF EXISTS
      + ADD on every run. Unlike SQLite (which can't ALTER a CHECK and needed a
      full table rebuild), Postgres swaps the constraint in place — so adding a
      calc type later is still just `python db_init.py`.
    - The constraint's allowed-values list is composed with psycopg.sql (Literal
      composition), never f-string concatenation — DDL can't take %s bind params,
      and sql.Literal is the injection-safe equivalent.
    - This script runs OUTSIDE a Flask app context, so it opens its own
      connection directly rather than using db.get_db().
"""

import psycopg
from psycopg import sql

from config import Config
from calc_types import VALID_CALC_TYPES


_CONSTRAINT_NAME = "saved_calculators_calc_type_check"

# CHECK expression:  calc_type IN ('fire', 'compound', ...)
# Built with sql.Literal so the type values can never be an injection vector.
_CALC_TYPE_CHECK = sql.SQL("calc_type IN ({})").format(
    sql.SQL(", ").join(sql.Literal(t) for t in VALID_CALC_TYPES)
)


def init_db() -> None:
    with psycopg.connect(Config.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # ---------------------------------------------------------------- #
            # users
            #   email is stored lowercased by the model layer, so a plain UNIQUE
            #   is effectively case-insensitive (mirrors the old COLLATE NOCASE).
            # ---------------------------------------------------------------- #
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    email         TEXT        NOT NULL UNIQUE,
                    password_hash TEXT        NOT NULL,
                    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
                )
            """)

            # ---------------------------------------------------------------- #
            # saved_calculators
            #   data is JSONB; user_id cascades on user deletion.
            #   The CHECK constraint is added separately (below) so it can be
            #   rebuilt idempotently when VALID_CALC_TYPES changes.
            # ---------------------------------------------------------------- #
            cur.execute("""
                CREATE TABLE IF NOT EXISTS saved_calculators (
                    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name       TEXT        NOT NULL,
                    calc_type  TEXT        NOT NULL,
                    data       JSONB       NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_saved_calculators_user_id
                ON saved_calculators(user_id)
            """)

            # ---------------------------------------------------------------- #
            # password_reset_tokens
            #   Only the SHA-256 hex digest of the reset token is stored — the
            #   raw token exists solely in the emailed link, so a DB leak yields
            #   no usable reset links. user_id cascades on user deletion.
            #   used_at is nullable: NULL = unused, a timestamp = consumed
            #   (single-use). expires_at enforces the 60-minute lifetime; the
            #   UNIQUE on token_hash also serves the by-hash lookup, and the
            #   user_id index serves invalidate-all-for-user.
            # ---------------------------------------------------------------- #
            cur.execute("""
                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    token_hash TEXT        NOT NULL UNIQUE,
                    expires_at TIMESTAMPTZ NOT NULL,
                    used_at    TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
                ON password_reset_tokens(user_id)
            """)

            # ---------------------------------------------------------------- #
            # calc_type CHECK — drop-and-recreate so the allowed set always
            # matches VALID_CALC_TYPES. Idempotent and ALTER-in-place (no table
            # rebuild, unlike the old SQLite migration hack).
            # ---------------------------------------------------------------- #
            cur.execute(
                sql.SQL(
                    "ALTER TABLE saved_calculators DROP CONSTRAINT IF EXISTS {}"
                ).format(sql.Identifier(_CONSTRAINT_NAME))
            )
            cur.execute(
                sql.SQL(
                    "ALTER TABLE saved_calculators ADD CONSTRAINT {} CHECK ({})"
                ).format(sql.Identifier(_CONSTRAINT_NAME), _CALC_TYPE_CHECK)
            )

            # ---------------------------------------------------------------- #
            # updated_at maintenance — BEFORE UPDATE trigger sets the column.
            # CREATE OR REPLACE FUNCTION + DROP/CREATE TRIGGER are both idempotent.
            # ---------------------------------------------------------------- #
            cur.execute("""
                CREATE OR REPLACE FUNCTION set_updated_at()
                RETURNS trigger AS $$
                BEGIN
                    NEW.updated_at = now();
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql
            """)

            cur.execute("""
                DROP TRIGGER IF EXISTS trg_saved_calculators_updated_at
                ON saved_calculators
            """)
            cur.execute("""
                CREATE TRIGGER trg_saved_calculators_updated_at
                BEFORE UPDATE ON saved_calculators
                FOR EACH ROW
                EXECUTE FUNCTION set_updated_at()
            """)

        conn.commit()

    print("Database schema initialised (Postgres).")


if __name__ == "__main__":
    init_db()
