"""
pooling_check.py
----------------
Neon pooled-connection check under load (#187) — a standalone script (like
db_init.py) that hammers a DATABASE_URL with the app's exact connection
pattern: connect → SELECT 1 → close, once per simulated request, from many
workers at once.

Why this shape: the app deliberately has NO in-process pool (db.py) — every
request opens one psycopg connection and closes it on teardown, and Neon's
PgBouncer endpoint does the pooling. That design is only sound if the POOLED
endpoint actually absorbs a connect-per-request burst. This script proves it
(or catches the classic failure: pointing DATABASE_URL at the DIRECT endpoint,
which exhausts real Postgres connections under load).

Usage (run from backend/, venv active):

    python pooling_check.py --url "$DATABASE_URL" [--workers 20] [--duration 15]

Reads --url, else CHECK_DATABASE_URL, else DATABASE_URL from the environment.
NEVER defaults to anything — you must point it somewhere deliberately.

Pass criteria printed at the end:
  - 0 errors, and
  - p95 connect+query latency comfortably under a request budget (~250 ms
    against Neon from the same region; higher from a laptop is expected).
Exit code: 0 on zero errors, 1 otherwise — usable from a shell check.

A warning is printed when the URL's host doesn't look like a pooled endpoint
(Neon pooled hosts carry a "-pooler" suffix) — the most common misconfig.
"""

import argparse
import os
import statistics
import sys
import threading
import time
from collections import Counter
from urllib.parse import urlparse

import psycopg


def _worker(url: str, deadline: float, latencies: list, errors: Counter, lock: threading.Lock):
    while time.monotonic() < deadline:
        t0 = time.monotonic()
        try:
            with psycopg.connect(url, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    cur.fetchone()
            elapsed_ms = (time.monotonic() - t0) * 1000
            with lock:
                latencies.append(elapsed_ms)
        except Exception as e:  # noqa: BLE001 — we want every failure mode counted
            with lock:
                errors[f"{type(e).__name__}: {str(e).strip().splitlines()[0][:120]}"] += 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Connect-per-request load check (#187)")
    parser.add_argument("--url", default=os.getenv("CHECK_DATABASE_URL") or os.getenv("DATABASE_URL"))
    parser.add_argument("--workers", type=int, default=20)
    parser.add_argument("--duration", type=int, default=15, help="seconds")
    args = parser.parse_args()

    if not args.url:
        print("No URL: pass --url or set CHECK_DATABASE_URL / DATABASE_URL.", file=sys.stderr)
        return 2

    host = urlparse(args.url).hostname or ""
    if "neon.tech" in host and "-pooler" not in host:
        print(f"⚠  {host} does not look like Neon's POOLED endpoint (no '-pooler' suffix).")
        print("   The app's connect-per-request design assumes PgBouncer — this check")
        print("   would measure the DIRECT endpoint and may exhaust real connections.\n")

    print(f"→ {args.workers} workers × {args.duration}s of connect → SELECT 1 → close against {host}")

    latencies: list = []
    errors: Counter = Counter()
    lock = threading.Lock()
    deadline = time.monotonic() + args.duration
    threads = [
        threading.Thread(target=_worker, args=(args.url, deadline, latencies, errors, lock), daemon=True)
        for _ in range(args.workers)
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    total = len(latencies) + sum(errors.values())
    print(f"\nrequests:  {total} total · {len(latencies)} ok · {sum(errors.values())} failed")
    if latencies:
        latencies.sort()
        p50 = statistics.median(latencies)
        p95 = latencies[int(len(latencies) * 0.95) - 1]
        print(f"latency:   p50 {p50:.1f} ms · p95 {p95:.1f} ms · max {latencies[-1]:.1f} ms")
        print(f"throughput: {len(latencies) / args.duration:.1f} req/s sustained")
    for msg, n in errors.most_common():
        print(f"  ✗ {n}× {msg}")

    if errors:
        print("\nFAIL — errors under load. If they mention connection limits, the URL is")
        print("likely the direct (non-pooled) endpoint; use the '-pooler' string.")
        return 1
    print("\nPASS — the endpoint absorbed the connect-per-request burst with zero errors.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
