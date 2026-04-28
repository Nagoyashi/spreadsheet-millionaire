"""
db_init.py
----------
Creates and migrates the database schema.
All CREATE statements use IF NOT EXISTS so re-running is always safe.

Usage:
    python db_init.py

Migration strategy:
    SQLite does not support ALTER TABLE ... MODIFY COLUMN or dropping constraints.
    To update the calc_type CHECK constraint we use the standard SQLite migration
    pattern: create new table → copy data → drop old → rename new.
    The migration is idempotent — it checks the current constraint before running.
"""

import sqlite3
import os
from config import Config

# Keep this list in sync with VALID_CALC_TYPES in schemas/calculator_schema.py
VALID_CALC_TYPES = (
    'fire', 'compound', 'sankey',
    'investment_fee', 'inflation', 'dividend',
    'withdrawal', 'debt_payoff', 'mortgage',
    'coast_fire', 'emergency_fund', 'barista_fire',
)

# The CHECK expression as it will appear in CREATE TABLE
_CALC_TYPE_CHECK = "calc_type IN ({})".format(
    ", ".join(f"'{t}'" for t in VALID_CALC_TYPES)
)


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(Config.DB_PATH)
    conn.row_factory = sqlite3.Row          # rows behave like dicts
    conn.execute("PRAGMA journal_mode=WAL")  # better concurrent read performance
    conn.execute("PRAGMA foreign_keys=ON")   # enforce FK constraints
    return conn


def _current_table_sql(conn: sqlite3.Connection, table: str) -> str:
    """Returns the CREATE TABLE SQL for an existing table, or empty string."""
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
        (table,),
    ).fetchone()
    return row["sql"] if row else ""


def init_db() -> None:
    conn = get_connection()
    cursor = conn.cursor()

    # ------------------------------------------------------------------ #
    # users
    # ------------------------------------------------------------------ #
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT    NOT NULL,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    """)

    # ------------------------------------------------------------------ #
    # saved_calculators — create fresh if it doesn't exist
    # ------------------------------------------------------------------ #
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS saved_calculators (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            name       TEXT    NOT NULL,
            calc_type  TEXT    NOT NULL CHECK({_CALC_TYPE_CHECK}),
            data       TEXT    NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_saved_calculators_user_id
        ON saved_calculators(user_id)
    """)

    # ------------------------------------------------------------------ #
    # Migration: update calc_type CHECK constraint if stale
    # SQLite can't ALTER a constraint — must recreate the table.
    # Safe to run repeatedly — checks first, skips if already current.
    # ------------------------------------------------------------------ #
    existing_sql = _current_table_sql(conn, "saved_calculators")

    # If the current table definition is missing any valid type, migrate it
    needs_migration = any(t not in existing_sql for t in VALID_CALC_TYPES)

    if needs_migration:
        print("Migrating saved_calculators: updating calc_type CHECK constraint...")
        cursor.executescript(f"""
            PRAGMA foreign_keys=OFF;

            CREATE TABLE saved_calculators_new (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL,
                name       TEXT    NOT NULL,
                calc_type  TEXT    NOT NULL CHECK({_CALC_TYPE_CHECK}),
                data       TEXT    NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            INSERT INTO saved_calculators_new
                (id, user_id, name, calc_type, data, created_at, updated_at)
            SELECT
                id, user_id, name, calc_type, data, created_at, updated_at
            FROM saved_calculators
            WHERE calc_type IN ({', '.join(f"'{t}'" for t in VALID_CALC_TYPES)});

            DROP TABLE saved_calculators;

            ALTER TABLE saved_calculators_new RENAME TO saved_calculators;

            CREATE INDEX IF NOT EXISTS idx_saved_calculators_user_id
            ON saved_calculators(user_id);

            PRAGMA foreign_keys=ON;
        """)
        print("Migration complete.")

    # ------------------------------------------------------------------ #
    # Trigger: keep updated_at fresh automatically
    # ------------------------------------------------------------------ #
    cursor.execute("""
        CREATE TRIGGER IF NOT EXISTS trg_saved_calculators_updated_at
        AFTER UPDATE ON saved_calculators
        FOR EACH ROW
        BEGIN
            UPDATE saved_calculators
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.id;
        END
    """)

    conn.commit()
    conn.close()
    print(f"Database initialised at: {Config.DB_PATH}")


if __name__ == "__main__":
    init_db()
