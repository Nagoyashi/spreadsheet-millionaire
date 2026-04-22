"""
db_init.py
----------
Run once (or any time) to create / migrate the database.
All statements use IF NOT EXISTS so re-running is always safe.

Usage:
    python db_init.py
"""

import sqlite3
import os
from config import Config


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(Config.DB_PATH)
    conn.row_factory = sqlite3.Row          # rows behave like dicts
    conn.execute("PRAGMA journal_mode=WAL")  # better concurrent read performance
    conn.execute("PRAGMA foreign_keys=ON")   # enforce FK constraints
    return conn


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

    # Fast lookup by email on every login
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    """)

    # ------------------------------------------------------------------ #
    # saved_calculators
    # ------------------------------------------------------------------ #
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS saved_calculators (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            name       TEXT    NOT NULL,
            calc_type  TEXT    NOT NULL CHECK(calc_type IN ('fire', 'compound', 'sankey')),
            data       TEXT    NOT NULL,           -- JSON blob of all calculator inputs
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # Speed up "fetch all saved calcs for this user" queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_saved_calculators_user_id
        ON saved_calculators(user_id)
    """)

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
