"""
Structured request logging (#175) — DB-free.

Exercises the before/after_request hooks and the JSON formatter through the real
create_app() factory (the `client` fixture). No database needed: a 404 and the
health probe are enough to prove the log line, the request-id header, the
status→level mapping, and the health-path skip.
"""

import json
import logging


def test_request_id_header_on_every_response(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.headers.get("X-Request-ID")


def test_request_is_logged_with_structured_fields(client, caplog):
    with caplog.at_level(logging.INFO, logger="app.request"):
        resp = client.get("/api/does-not-exist")

    assert resp.status_code == 404
    records = [r for r in caplog.records if r.name == "app.request"]
    assert len(records) == 1
    rec = records[0]
    assert rec.method == "GET"
    assert rec.path == "/api/does-not-exist"
    assert rec.status == 404
    assert rec.levelno == logging.WARNING  # 4xx → WARNING
    assert isinstance(rec.duration_ms, float)
    assert rec.request_id


def test_health_is_not_logged_but_still_gets_an_id(client, caplog):
    with caplog.at_level(logging.INFO, logger="app.request"):
        resp = client.get("/api/health")

    assert resp.headers.get("X-Request-ID")  # id is still stamped…
    assert [r for r in caplog.records if r.name == "app.request"] == []  # …not logged


def test_incoming_request_id_is_honoured(client, caplog):
    with caplog.at_level(logging.INFO, logger="app.request"):
        resp = client.get("/api/does-not-exist", headers={"X-Request-ID": "abc123"})

    assert resp.headers.get("X-Request-ID") == "abc123"
    rec = next(r for r in caplog.records if r.name == "app.request")
    assert rec.request_id == "abc123"


def test_level_for_status_mapping():
    from logging_config import _level_for_status

    assert _level_for_status(200) == logging.INFO
    assert _level_for_status(302) == logging.INFO
    assert _level_for_status(404) == logging.WARNING
    assert _level_for_status(429) == logging.WARNING
    assert _level_for_status(500) == logging.ERROR
    assert _level_for_status(503) == logging.ERROR


def test_json_formatter_serialises_extras():
    from logging_config import JsonFormatter

    formatter = JsonFormatter()
    record = logging.LogRecord(
        name="app.request",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="request",
        args=(),
        exc_info=None,
    )
    record.method = "GET"
    record.path = "/api/health"
    record.status = 200

    out = json.loads(formatter.format(record))
    assert out["level"] == "INFO"
    assert out["logger"] == "app.request"
    assert out["message"] == "request"
    assert out["method"] == "GET"
    assert out["path"] == "/api/health"
    assert out["status"] == 200
    assert "timestamp" in out
