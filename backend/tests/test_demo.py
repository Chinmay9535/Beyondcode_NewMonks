"""Hosted public demo: each visitor gets a fresh copy of Ramesh."""
from app.config import get_settings


def test_fresh_ramesh_only_in_public_demo(client, monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "public_demo", False)
    assert client.post("/api/demo/ramesh").status_code == 404
    monkeypatch.setattr(s, "public_demo", True)
    monkeypatch.setattr(s, "demo_copies_max", 3)
    assert client.get("/api/meta").json()["public_demo"] is True

    codes = [client.post("/api/demo/ramesh").json()["code"] for _ in range(4)]
    assert all(c.startswith("RAMESH") and len(c) == 10 for c in codes) and len(set(codes)) == 4
    p = client.get(f"/api/p/{codes[-1]}").json()
    assert p["name"] == "Ramesh Kumar" and p["stage"] == "intake"
    assert client.get(f"/api/p/{codes[0]}").status_code == 404        # oldest copy cleaned up
    assert client.get("/api/p/RAMESH").status_code == 200              # the original is never removed

    client.post(f"/api/p/{codes[-1]}/consent")
    assert client.post(f"/api/p/{codes[-1]}/intake/start").status_code == 200
