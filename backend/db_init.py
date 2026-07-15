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
from publishable import PUBLISHABLE_TYPES, DEFAULT_PUBLISHED_PUBLISHABLE
from user_tiers import USER_TIERS, DEFAULT_TIER
from net_worth_types import (
    ASSET_TYPES,
    LIABILITY_TYPES,
    ASSET_CLASSES,
    PROPERTY_TYPES,
)
from income_expense_types import (
    TRANSACTION_TYPES,
    RECURRENCE_UNITS,
    TRANSACTION_SOURCES,
    CATEGORY_NAME_MAX,
)


# A fixed, app-specific key for the Postgres session advisory lock that
# serialises init_db() across concurrent callers. When the app migrates on boot
# (gunicorn.conf.py § on_starting), two workers/instances can call init_db() at
# once; the lock makes the second wait for the first's idempotent DDL to commit
# instead of racing on the same ALTER/CREATE. Any stable bigint works — it only
# has to be unique within this database's advisory-lock namespace.
_MIGRATION_LOCK_KEY = 0x5350_4D31  # "SPM1"


_CONSTRAINT_NAME = "saved_calculators_calc_type_check"

# CHECK expression:  calc_type IN ('fire', 'compound', ...)
# Built with sql.Literal so the type values can never be an injection vector.
_CALC_TYPE_CHECK = sql.SQL("calc_type IN ({})").format(
    sql.SQL(", ").join(sql.Literal(t) for t in VALID_CALC_TYPES)
)


def _in_check(column: str, values) -> sql.Composed:
    """Build an injection-safe `column IN ('a', 'b', ...)` CHECK expression.

    Values come from net_worth_types.py and are composed with sql.Literal —
    DDL can't take %s bind params, and sql.Literal is the injection-safe
    equivalent (same approach as _CALC_TYPE_CHECK).
    """
    return sql.SQL("{} IN ({})").format(
        sql.Identifier(column),
        sql.SQL(", ").join(sql.Literal(v) for v in values),
    )


def _rebuild_check(cur, table: str, constraint: str, check_expr: sql.Composed) -> None:
    """Drop-and-recreate a named CHECK so the allowed set always matches the
    Python source. Idempotent and ALTER-in-place — no table rebuild."""
    cur.execute(
        sql.SQL("ALTER TABLE {} DROP CONSTRAINT IF EXISTS {}").format(
            sql.Identifier(table), sql.Identifier(constraint)
        )
    )
    cur.execute(
        sql.SQL("ALTER TABLE {} ADD CONSTRAINT {} CHECK ({})").format(
            sql.Identifier(table), sql.Identifier(constraint), check_expr
        )
    )


def _attach_updated_at_trigger(cur, table: str) -> None:
    """Attach the shared set_updated_at() BEFORE UPDATE trigger to a table.
    Assumes set_updated_at() already exists. Idempotent (DROP IF EXISTS + CREATE)."""
    trigger = f"trg_{table}_updated_at"
    cur.execute(
        sql.SQL("DROP TRIGGER IF EXISTS {} ON {}").format(
            sql.Identifier(trigger), sql.Identifier(table)
        )
    )
    cur.execute(
        sql.SQL(
            "CREATE TRIGGER {} BEFORE UPDATE ON {} "
            "FOR EACH ROW EXECUTE FUNCTION set_updated_at()"
        ).format(sql.Identifier(trigger), sql.Identifier(table))
    )


def init_db() -> None:
    with psycopg.connect(Config.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # ---------------------------------------------------------------- #
            # Serialise concurrent migrations. pg_advisory_xact_lock blocks until
            # the lock is free and auto-releases at COMMIT/ROLLBACK, so two boot
            # workers (or instances) run the idempotent DDL one-at-a-time instead
            # of racing on the same ALTER/CREATE. Held for the whole transaction.
            # ---------------------------------------------------------------- #
            cur.execute("SELECT pg_advisory_xact_lock(%s)", (_MIGRATION_LOCK_KEY,))

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

            # is_admin gates the /admin portal (Phase 12 — Admin Control Center).
            # Additive, idempotent; defaults false so every existing and new
            # account is a normal user until explicitly promoted. The admin gate
            # (utils/auth_helpers.admin_required) reads this column — there is no
            # second source of truth for "who is an admin".
            cur.execute("""
                ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false
            """)

            # is_superadmin is the top role: only a superadmin can grant/revoke the
            # admin role from the portal (admins can't make other admins). A
            # superadmin is implicitly an admin (the gate treats it as one). Set
            # manually (User.set_superadmin) to bootstrap — there is no UI to grant
            # superadmin. See DECISIONS.md § "Superadmin role".
            cur.execute("""
                ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false
            """)

            # Account tier (freemium) + suspension + last-login — managed from the
            # admin Users screen (Phase 12). All additive/idempotent. tier defaults
            # to 'free' (beta: everyone free, billing off); the tier CHECK is
            # rebuilt below from user_tiers.USER_TIERS. suspended blocks login.
            # last_login_at is stamped on each successful login (nullable until the
            # account's first post-migration login).
            cur.execute(
                sql.SQL(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT {}"
                ).format(sql.Literal(DEFAULT_TIER))
            )
            cur.execute("""
                ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false
            """)
            cur.execute("""
                ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ
            """)
            _rebuild_check(cur, "users", "users_tier_check", _in_check("tier", USER_TIERS))

            # Invariant: a superadmin is always an admin. Enforced at the DB layer
            # so no code path (including the manual set_admin lever) can leave a
            # superadmin with is_admin=false — which would diverge the column from
            # the model's computed is_admin. See DECISIONS.md § "Superadmin role".
            _rebuild_check(
                cur, "users", "users_superadmin_implies_admin",
                sql.SQL("(NOT is_superadmin OR is_admin)"),
            )

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
            # calculator_publish — runtime publish state, one row per calc type.
            #   The admin portal toggles `published` here and the public /app
            #   reads it at runtime, so a calculator can be published/unpublished
            #   without a redeploy. This is the DB source of truth that replaces
            #   the build-time `published` constant in the frontend registry (the
            #   registry still owns metadata — name/icon/category). calc_type is
            #   the PK; updated_by references the admin who last flipped it (kept
            #   even if that admin is later deleted, hence ON DELETE SET NULL).
            #   See DECISIONS.md § "Runtime publish state — DB-backed, admin-
            #   toggleable". The table is SEEDED below from
            #   DEFAULT_PUBLISHED_PUBLISHABLE (publishable.py).
            # ---------------------------------------------------------------- #
            cur.execute("""
                CREATE TABLE IF NOT EXISTS calculator_publish (
                    calc_type  TEXT        PRIMARY KEY,
                    published  BOOLEAN     NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_by BIGINT      REFERENCES users(id) ON DELETE SET NULL
                )
            """)

            # Seed one row per publishable type — everything defaults published
            # now that the build-in-public rollout is complete (v0.15.3).
            # ON CONFLICT DO NOTHING makes this idempotent and — crucially —
            # non-destructive: a later run never resets an admin's live toggle,
            # it only backfills rows for newly-added calc types.
            for _calc_type in PUBLISHABLE_TYPES:
                cur.execute(
                    "INSERT INTO calculator_publish (calc_type, published) "
                    "VALUES (%s, %s) ON CONFLICT (calc_type) DO NOTHING",
                    (_calc_type, _calc_type in DEFAULT_PUBLISHED_PUBLISHABLE),
                )

            # ---------------------------------------------------------------- #
            # admin_audit_log — append-only record of privileged admin actions
            #   (tier changes, suspend/reinstate). Who did what, to whom, when,
            #   with a JSONB detail (e.g. {"from": "free", "to": "pro"}). Both
            #   user FKs are ON DELETE SET NULL so the log survives account
            #   deletion (the audit trail outlives the row it described). Indexed
            #   by target user for "show this account's history" later.
            # ---------------------------------------------------------------- #
            cur.execute("""
                CREATE TABLE IF NOT EXISTS admin_audit_log (
                    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    admin_user_id  BIGINT      REFERENCES users(id) ON DELETE SET NULL,
                    action         TEXT        NOT NULL,
                    target_user_id BIGINT      REFERENCES users(id) ON DELETE SET NULL,
                    detail         JSONB       NOT NULL DEFAULT '{}'::jsonb,
                    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target
                ON admin_audit_log(target_user_id)
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

            # ================================================================ #
            # Net Worth tracker — normalised nw_* tables.
            #   See DECISIONS.md § "Net Worth Tracker". Money is NUMERIC(14,2)
            #   (never float); rates NUMERIC(6,3); investment quantity
            #   NUMERIC(20,8) for fractional crypto. Every table is user-scoped
            #   (user_id FK ON DELETE CASCADE + an index); type enums come from
            #   net_worth_types.py and are enforced by named CHECK constraints
            #   rebuilt below. updated_at is maintained by the shared trigger.
            # ================================================================ #

            # ---- nw_assets (liquid assets + 'custom' collectibles) ---------- #
            cur.execute("""
                CREATE TABLE IF NOT EXISTS nw_assets (
                    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    user_id       BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    asset_type    TEXT          NOT NULL,
                    name          TEXT          NOT NULL,
                    current_value NUMERIC(14,2) NOT NULL CHECK (current_value >= 0),
                    cost_basis    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cost_basis >= 0),
                    notes         TEXT,
                    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
                    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_nw_assets_user_id
                ON nw_assets(user_id)
            """)

            # ---- nw_liabilities (non-mortgage debts) ------------------------ #
            cur.execute("""
                CREATE TABLE IF NOT EXISTS nw_liabilities (
                    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    user_id         BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    liability_type  TEXT          NOT NULL,
                    name            TEXT          NOT NULL,
                    current_balance NUMERIC(14,2) NOT NULL CHECK (current_balance >= 0),
                    interest_rate   NUMERIC(6,3)  NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
                    minimum_payment NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (minimum_payment >= 0),
                    due_date        DATE,
                    notes           TEXT,
                    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
                    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_nw_liabilities_user_id
                ON nw_liabilities(user_id)
            """)

            # ---- nw_investment_holdings ------------------------------------- #
            cur.execute("""
                CREATE TABLE IF NOT EXISTS nw_investment_holdings (
                    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    user_id       BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    ticker        TEXT          NOT NULL,
                    quantity      NUMERIC(20,8) NOT NULL CHECK (quantity > 0),
                    cost_basis    NUMERIC(14,2) NOT NULL CHECK (cost_basis >= 0),
                    current_value NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
                    asset_class   TEXT          NOT NULL,
                    region        TEXT,
                    purchase_date DATE,
                    notes         TEXT,
                    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
                    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_nw_investment_holdings_user_id
                ON nw_investment_holdings(user_id)
            """)

            # ---- nw_real_estate (mortgages roll up to liabilities in /summary) #
            cur.execute("""
                CREATE TABLE IF NOT EXISTS nw_real_estate (
                    id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    user_id                BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    property_name          TEXT          NOT NULL,
                    property_type          TEXT          NOT NULL,
                    current_value          NUMERIC(14,2) NOT NULL CHECK (current_value >= 0),
                    purchase_price         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
                    purchase_date          DATE,
                    mortgage_balance       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (mortgage_balance >= 0),
                    mortgage_interest_rate NUMERIC(6,3)  NOT NULL DEFAULT 0 CHECK (mortgage_interest_rate >= 0),
                    mortgage_payment       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (mortgage_payment >= 0),
                    mortgage_term_years    INTEGER       CHECK (mortgage_term_years IS NULL OR mortgage_term_years >= 0),
                    monthly_rent           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monthly_rent >= 0),
                    address                TEXT,
                    notes                  TEXT,
                    created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
                    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_nw_real_estate_user_id
                ON nw_real_estate(user_id)
            """)

            # ---- nw_snapshots (point-in-time history; no updated_at) --------- #
            cur.execute("""
                CREATE TABLE IF NOT EXISTS nw_snapshots (
                    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    user_id           BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    snapshot_date     DATE          NOT NULL,
                    total_assets      NUMERIC(14,2) NOT NULL,
                    total_liabilities NUMERIC(14,2) NOT NULL,
                    net_worth         NUMERIC(14,2) NOT NULL,
                    notes             TEXT,
                    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_nw_snapshots_user_id
                ON nw_snapshots(user_id)
            """)

            # ---- type-enum CHECK constraints (rebuilt from net_worth_types) -- #
            _rebuild_check(
                cur, "nw_assets", "nw_assets_asset_type_check",
                _in_check("asset_type", ASSET_TYPES),
            )
            _rebuild_check(
                cur, "nw_liabilities", "nw_liabilities_liability_type_check",
                _in_check("liability_type", LIABILITY_TYPES),
            )
            _rebuild_check(
                cur, "nw_investment_holdings", "nw_investment_holdings_asset_class_check",
                _in_check("asset_class", ASSET_CLASSES),
            )
            _rebuild_check(
                cur, "nw_real_estate", "nw_real_estate_property_type_check",
                _in_check("property_type", PROPERTY_TYPES),
            )

            # ---- updated_at triggers (snapshots are append-only, excluded) --- #
            for _table in (
                "nw_assets",
                "nw_liabilities",
                "nw_investment_holdings",
                "nw_real_estate",
            ):
                _attach_updated_at_trigger(cur, _table)

            # ================================================================ #
            # Income & Expense tracker — one normalised ie_transactions stream.
            #   See DECISIONS.md § "Income & Expense Tracker". Sign is carried by
            #   `type` (amount > 0). `category` CHECK accepts the income∪expense
            #   union; the schema validates per-type. User-scoped (FK + indexes);
            #   the (user_id, occurred_on) index serves the month/year filters
            #   and the summary aggregation.
            # ================================================================ #
            cur.execute("""
                CREATE TABLE IF NOT EXISTS ie_transactions (
                    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    user_id     BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    type        TEXT          NOT NULL,
                    category    TEXT          NOT NULL,
                    amount      NUMERIC(14,2) NOT NULL CHECK (amount > 0),
                    occurred_on DATE          NOT NULL,
                    note        TEXT,
                    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
                    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_ie_transactions_user_id
                ON ie_transactions(user_id)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_ie_transactions_user_date
                ON ie_transactions(user_id, occurred_on)
            """)

            # Recurrence (added after v0.11.0). A transaction can repeat every N
            # units; existing rows default to a one-off ('none', 1). Additive,
            # idempotent ALTERs — the normalised-table migration path (DDL in
            # db_init), NOT a client blob version bump (hard rule #5 is scoped to
            # opaque blobs). Forecast occurrences are derived on the client at read
            # time and never written here.
            cur.execute("""
                ALTER TABLE ie_transactions
                    ADD COLUMN IF NOT EXISTS recurrence_unit TEXT NOT NULL DEFAULT 'none'
            """)
            cur.execute("""
                ALTER TABLE ie_transactions
                    ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER NOT NULL DEFAULT 1
            """)

            # Row provenance (added in the v0.15.0 monthly-grid cycle). 'manual' =
            # the per-transaction write path; 'monthly' = an aggregate grid row
            # (one per type+category+month, occurred_on = first of month).
            # Server-set per write path, never request input; existing rows are
            # 'manual' by definition. See DECISIONS.md § "Income & Expense
            # Tracker" (Monthly grid bulk entry).
            cur.execute("""
                ALTER TABLE ie_transactions
                    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
            """)
            # Integrity guard: at most one monthly aggregate row per
            # user+type+category+date. The month PUT's delete-then-insert makes
            # duplicates impossible on the normal path; this backstops date
            # edits made through the transactions API.
            cur.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_ie_transactions_monthly_cell
                ON ie_transactions(user_id, type, category, occurred_on)
                WHERE source = 'monthly'
            """)

            _rebuild_check(
                cur, "ie_transactions", "ie_transactions_type_check",
                _in_check("type", TRANSACTION_TYPES),
            )
            _rebuild_check(
                cur, "ie_transactions", "ie_transactions_source_check",
                _in_check("source", TRANSACTION_SOURCES),
            )
            # Categories are user-scoped since v0.15.1 (ie_categories below), so
            # the old curated-union CHECK is rebuilt into a plain length bound —
            # per-user validity is enforced at the model layer at write time.
            _rebuild_check(
                cur, "ie_transactions", "ie_transactions_category_check",
                sql.SQL("char_length(category) BETWEEN 1 AND {}").format(
                    sql.Literal(CATEGORY_NAME_MAX)
                ),
            )
            _rebuild_check(
                cur, "ie_transactions", "ie_transactions_recurrence_unit_check",
                _in_check("recurrence_unit", RECURRENCE_UNITS),
            )
            _rebuild_check(
                cur, "ie_transactions", "ie_transactions_recurrence_interval_check",
                sql.SQL("recurrence_interval >= 1"),
            )
            _attach_updated_at_trigger(cur, "ie_transactions")

            # User-scoped I&E categories (v0.15.1). Users add / archive /
            # restore their own categories per type; defaults are lazily seeded
            # per user from income_expense_types.DEFAULT_CATEGORIES with keys
            # equal to the pre-v0.15.1 curated slugs, so historical
            # ie_transactions.category values resolve. `key` is an immutable
            # per-(user, type) slug stored on transactions; `name` is display
            # only. Archive is a soft delete — history keeps aggregating, and
            # re-adding a matching name restores the row instead of duplicating
            # it (unique index on lower(name)). See DECISIONS.md § "Income &
            # Expense Tracker" (Custom categories).
            cur.execute("""
                CREATE TABLE IF NOT EXISTS ie_categories (
                    id         BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    user_id    BIGINT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    type       TEXT    NOT NULL,
                    key        TEXT    NOT NULL,
                    name       TEXT    NOT NULL,
                    archived   BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    UNIQUE (user_id, type, key)
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_ie_categories_user_id
                ON ie_categories(user_id)
            """)
            # Duplicate-avoidance: one row per name (case-insensitive) per
            # user+type, archived or not — re-adding an archived name restores it.
            cur.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_ie_categories_user_type_name
                ON ie_categories(user_id, type, lower(name))
            """)
            _rebuild_check(
                cur, "ie_categories", "ie_categories_type_check",
                _in_check("type", TRANSACTION_TYPES),
            )
            _rebuild_check(
                cur, "ie_categories", "ie_categories_key_check",
                sql.SQL("char_length(key) BETWEEN 1 AND {}").format(
                    sql.Literal(CATEGORY_NAME_MAX)
                ),
            )
            _rebuild_check(
                cur, "ie_categories", "ie_categories_name_check",
                sql.SQL("char_length(name) BETWEEN 1 AND {}").format(
                    sql.Literal(CATEGORY_NAME_MAX)
                ),
            )
            # Drag-and-drop ordering (v0.15.2): user-controlled sort position,
            # per (user, type). Existing rows default 0 and keep their id order
            # (list_categories orders by position, id); new/seeded rows get
            # explicit ordinals.
            cur.execute("""
                ALTER TABLE ie_categories
                    ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0
            """)
            _attach_updated_at_trigger(cur, "ie_categories")

        conn.commit()

    print("Database schema initialised (Postgres).")


if __name__ == "__main__":
    init_db()
