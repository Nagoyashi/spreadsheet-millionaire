"""
Saved-calculator write bounds (#20): MAX_CONTENT_LENGTH (413), the `data` field
cap (422), and that a rejected save stores no row. DB-backed.
"""


def test_oversized_data_field_rejected_no_row(auth_client, get_csrf_token):
    """`data` over the 64 KB field cap → 422, and nothing is stored."""
    client, _ = auth_client
    token = get_csrf_token(client)
    resp = client.post(
        "/api/calculators",
        headers={"X-CSRF-Token": token},
        json={"name": "big", "calc_type": "fire", "data": {"x": "a" * (70 * 1024)}},
    )
    assert resp.status_code == 422
    assert client.get("/api/calculators").get_json()["calculators"] == []


def test_deeply_nested_data_rejected(auth_client, get_csrf_token):
    """Pathologically nested `data` → 422."""
    client, _ = auth_client
    token = get_csrf_token(client)
    node = {}
    cur = node
    for _ in range(40):  # deeper than MAX_DATA_DEPTH
        cur["n"] = {}
        cur = cur["n"]
    resp = client.post(
        "/api/calculators",
        headers={"X-CSRF-Token": token},
        json={"name": "deep", "calc_type": "fire", "data": node},
    )
    assert resp.status_code == 422


def test_oversized_body_rejected_413(auth_client, get_csrf_token):
    """A body beyond MAX_CONTENT_LENGTH is rejected (413) before parsing."""
    client, _ = auth_client
    token = get_csrf_token(client)
    resp = client.post(
        "/api/calculators",
        headers={"X-CSRF-Token": token, "Content-Type": "application/json"},
        data='{"name":"x","calc_type":"fire","data":{"x":"' + ("a" * (300 * 1024)) + '"}}',
    )
    assert resp.status_code == 413
    assert client.get("/api/calculators").get_json()["calculators"] == []


def test_normal_save_still_ok(auth_client, get_csrf_token):
    client, _ = auth_client
    token = get_csrf_token(client)
    resp = client.post(
        "/api/calculators",
        headers={"X-CSRF-Token": token},
        json={"name": "ok", "calc_type": "fire", "data": {"version": 1, "amount": 1000}},
    )
    assert resp.status_code == 201
    assert len(client.get("/api/calculators").get_json()["calculators"]) == 1
