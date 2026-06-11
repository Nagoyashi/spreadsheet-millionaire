"""
db.py
-----
Per-request Postgres (psycopg 3) connection handling.

One connection is opened per request, stored on Flask's `g`, and closed on
teardown. There is deliberately NO in-process connection pool: DATABASE_URL
points at Neon's pooled (PgBouncer) endpoint, which does the pooling for us.
Keeping a pool here on top of that would just fight PgBouncer.

`row_factory=dict_row` so models receive rows as plain dicts (mirroring the
`sqlite3.Row`-as-dict access the models relied on before the migration).

Standalone scripts that run outside an app context (notably `db_init.py`) open
their own connection directly — they do not use `get_db()`.
"""

import psycopg
from psycopg.rows import dict_row
from flask import g

from config import Config


def get_db() -> psycopg.Connection:
    """
    Return the connection for the current request, opening one if needed.

    Stored on `g` so every call within a single request reuses the same
    connection. Closed automatically by `close_db` on app-context teardown.
    """
    if "db" not in g:
        g.db = psycopg.connect(Config.DATABASE_URL, row_factory=dict_row)
    return g.db


def close_db(exc: BaseException | None = None) -> None:
    """Close and discard the request connection if one was opened."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_app(app) -> None:
    """Register the teardown hook on the Flask app."""
    app.teardown_appcontext(close_db)
