"""
Structured request logging — the observable half of a request (#175).

Two pieces, both wired from create_app():

  configure_logging()          — installs ONE stdout handler on the root logger,
                                 formatted as JSON in production and a readable
                                 line in development. Idempotent: calling it again
                                 (every create_app() in the test suite does) is a
                                 no-op after the first.

  install_request_logging(app) — before/after_request hooks that stamp each
                                 request with a request id, time it, and emit one
                                 structured line per request (method, path,
                                 status, duration). The id also rides on the
                                 response as X-Request-ID and onto the Sentry
                                 scope, so a log line, a support report, and a
                                 Sentry event for the same request all correlate.

Privacy (invariant 8): a request line carries method, path (no query string),
status, and duration — deliberately NOT the client IP, the user id, the request
body, or headers. We want to know which endpoints are slow or erroring, not who
called them; that keeps the access log free of personal data by construction.
The /api/health liveness probe and /api/health/ready readiness probe are polled
every few minutes by Render, the keepalive pinger, and the external uptime
monitor, so their *successful* hits are skipped to keep the log signal; a failing
readiness probe still logs (see `_SKIP_LOG_PATHS`).
"""

import json
import logging
import sys
import time
import uuid
from datetime import datetime, timezone

import sentry_sdk
from flask import g, request

from config import Config

# The logger every request line is emitted on. Propagates to the root logger,
# where configure_logging() attaches the single stdout handler.
request_logger = logging.getLogger("app.request")

# Attributes the stdlib puts on every LogRecord. Anything on a record that is NOT
# in this set is treated as a caller-supplied `extra` field and serialised into
# the JSON payload — that's how the request fields (method, path, …) get through.
_STANDARD_LOGRECORD_ATTRS = {
    "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
    "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
    "created", "msecs", "relativeCreated", "thread", "threadName",
    "processName", "process", "taskName", "message", "asctime",
}

# Health/readiness probes are polled constantly; logging every successful poll
# would drown the signal. A *failing* probe (4xx/5xx) is the signal we want, so
# the skip below only suppresses successful (<400) hits on these paths. See doc.
_SKIP_LOG_PATHS = {"/api/health", "/api/health/ready"}

# Marker so configure_logging() only installs the handler once per process.
_HANDLER_MARKER = "_sm_structured_handler"


class JsonFormatter(logging.Formatter):
    """One JSON object per line: base fields + any caller `extra` + exception."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key not in _STANDARD_LOGRECORD_ATTRS and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        # default=str so a stray non-serialisable extra degrades to its repr
        # instead of crashing the logging call.
        return json.dumps(payload, default=str)


def _already_configured() -> bool:
    return any(
        getattr(h, _HANDLER_MARKER, False) for h in logging.getLogger().handlers
    )


def configure_logging() -> None:
    """Install the single stdout handler on the root logger. Idempotent."""
    if _already_configured():
        return

    handler = logging.StreamHandler(sys.stdout)
    setattr(handler, _HANDLER_MARKER, True)

    if Config.LOG_FORMAT == "json":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)-7s %(name)s: %(message)s")
        )

    root = logging.getLogger()
    root.setLevel(Config.LOG_LEVEL)
    root.addHandler(handler)

    # The dev server's werkzeug logger prints its own per-request line; silence it
    # so our structured line is the single source of truth (prod uses gunicorn,
    # where this logger is quiet anyway).
    logging.getLogger("werkzeug").setLevel(logging.WARNING)


def _level_for_status(status: int) -> int:
    """5xx → ERROR, 4xx → WARNING, everything else → INFO."""
    if status >= 500:
        return logging.ERROR
    if status >= 400:
        return logging.WARNING
    return logging.INFO


def install_request_logging(app) -> None:
    """Register the per-request id + timing + structured log hooks."""

    @app.before_request
    def _start_request():
        # Honour an upstream-supplied id (a proxy may set X-Request-ID) so a
        # single request keeps one id across hops; otherwise mint a short one.
        g.request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        g.request_start = time.perf_counter()
        # Tag the Sentry scope so an error event carries the same id as the log
        # line. Safe no-op when Sentry has no active client (no SENTRY_DSN).
        sentry_sdk.set_tag("request_id", g.request_id)

    @app.after_request
    def _log_request(response):
        request_id = getattr(g, "request_id", None)
        # Always expose the id so clients/support can quote it on any request.
        if request_id:
            response.headers["X-Request-ID"] = request_id

        # Suppress the constant successful health/readiness polls, but always log
        # a failing probe (>=400) — that's the outage signal worth keeping.
        if request.path in _SKIP_LOG_PATHS and response.status_code < 400:
            return response

        start = getattr(g, "request_start", None)
        duration_ms = (
            round((time.perf_counter() - start) * 1000, 2) if start else None
        )
        request_logger.log(
            _level_for_status(response.status_code),
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response
