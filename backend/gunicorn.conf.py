"""
gunicorn.conf.py
----------------
Gunicorn auto-loads this file when it is run from the directory that contains it
(Render's backend service uses root dir `backend/`, so no `-c` flag or
start-command change is needed — see docs/DEPLOYMENT.md § 2).

Its one job: run the idempotent schema migration (`db_init.init_db`) ONCE in the
master process, before any worker is forked and before a single request is
served. This is what makes production self-migrating.

Why here, and not in `create_app()`:
  - `app:create_app()` is imported by the DB-free unit tests with a dummy,
    unconnectable DATABASE_URL. Migrating inside the factory would make every
    such test try to open a real connection and fail. The `on_starting` hook
    only fires under gunicorn (production / prod-style local), never in tests.
  - Running in the master (pre-fork) means the migration happens exactly once
    per boot, so the workers never race. `init_db()` additionally takes a
    Postgres advisory lock, which covers the multi-instance case (two Render
    instances booting at once).

Failure policy: if the migration raises, the exception propagates and gunicorn
aborts startup. That is deliberate — a deploy whose schema migration failed must
fail loudly and refuse to serve, not boot on a half-migrated database. Render
shows the failed deploy; the previous version keeps serving.

The dev runner (`python -m app`) migrates via app.py's `__main__` block, so both
entry points keep the schema current.
"""


def on_starting(server):
    """Migrate the schema once, in the master, before workers fork."""
    # Imported lazily so loading this config file never depends on app import
    # succeeding — and so any import error surfaces at boot with a clear log line.
    from db_init import init_db

    server.log.info("[boot] running idempotent schema migration (db_init)…")
    try:
        init_db()
    except Exception:
        server.log.exception(
            "[boot] schema migration FAILED — aborting startup so a stale or "
            "half-migrated database never serves requests."
        )
        raise
    server.log.info("[boot] schema migration complete.")
