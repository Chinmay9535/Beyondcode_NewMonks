"""End-to-end API journeys against a fresh, seeded database (offline mode)."""


def test_staff_requires_login(client):
    assert client.get("/api/staff/patients").status_code == 401
    assert client.post("/api/staff/login", json={"pin": "0000"}).status_code == 401


def test_seeded_dashboard_puts_urgent_patient_first(client, staff):
    rows = client.get("/api/staff/patients", headers=staff).json()
    assert rows[0]["id"] == "ABDUL" and rows[0]["urgent_alerts"] == 1
    assert {r["id"]: r["stage"] for r in rows} == {"RAMESH": "intake", "LAKSHMI": "review", "KAMALA": "review", "ABDUL": "post_op"}


def test_full_patient_journey(client, staff):
    pid = client.post("/api/staff/patients", headers=staff, json={
        "name": "Test Patient", "language": "en", "eye": "left",
        "biometry": {"axial_length": 23.6, "k1": 43.25, "k2": 43.75, "k2_axis": 90},
    }).json()["id"]

    # Consent is required before the assistant talks.
    assert client.post(f"/api/p/{pid}/intake/start").status_code == 403
    client.post(f"/api/p/{pid}/consent")
    start = client.post(f"/api/p/{pid}/intake/start").json()
    assert start["messages"][0]["meta"]["topic"] == "day"

    r = client.post(f"/api/p/{pid}/intake", json={"text": "I'm a tailor, I sew all day and ride my scooter at night"}).json()
    while not r["done"]:
        topic = r["patient"]["intake"]["topic"]
        body = {"choice": {"glasses": "very", "budget": "balanced", "night": "often"}[topic]} if topic in ("glasses", "budget", "night") else {"text": "no"}
        r = client.post(f"/api/p/{pid}/intake", json=body).json()
    assert r["patient"]["stage"] == "review"
    assert client.post(f"/api/p/{pid}/intake", json={"text": "hi"}).status_code == 409

    # The patient does not see a shortlist until the surgeon approves.
    assert client.get(f"/api/p/{pid}").json()["plan"] is None
    detail = client.get(f"/api/staff/patients/{pid}", headers=staff).json()
    opts = detail["recommendation"]["options"]
    assert opts[0]["iol_power_d"] is not None and opts[0]["day_map"]

    client.post(f"/api/staff/patients/{pid}/approve", headers=staff, json={"lens_key": opts[0]["key"], "note": "Discussed halos."})
    plan = client.get(f"/api/p/{pid}").json()["plan"]
    assert plan["lens"]["key"] == opts[0]["key"] and plan["note"] == "Discussed halos."

    # Surgery date -> drop schedule -> post-op stage.
    client.patch(f"/api/staff/patients/{pid}", headers=staff, json={"surgery_date": "2026-01-10"})
    me = client.get(f"/api/p/{pid}").json()
    assert me["stage"] == "post_op" and me["recovery"]["follow_ups"][0]["date"] == "2026-01-11"

    # Questions: grounded answer with a citation; a red flag raises an urgent alert.
    a = client.post(f"/api/p/{pid}/ask", json={"text": "When can I wash my hair?"}).json()["messages"][-1]
    assert a["meta"]["citations"][0]["id"].endswith("#bathing")
    msgs = client.post(f"/api/p/{pid}/ask", json={"text": "Sudden pain and my vision is getting worse"}).json()["messages"]
    assert msgs[-1]["meta"]["kind"] == "safety" and msgs[-1]["meta"]["severity"] == "urgent"
    alerts = client.get("/api/staff/alerts", headers=staff).json()
    mine = [x for x in alerts if x["patient_id"] == pid]
    assert mine and mine[0]["severity"] == "urgent"
    client.post(f"/api/staff/alerts/{mine[0]['id']}/ack", headers=staff, json={"note": "Called, coming in."})

    # Unknown question -> honest "not found" + question routed to staff.
    nf = client.post(f"/api/p/{pid}/ask", json={"text": "Can I drink alcohol?"}).json()["messages"][-1]
    assert nf["meta"]["found"] is False and nf["meta"]["alert_id"]

    # Daily check-in.
    ck = client.post(f"/api/p/{pid}/checkin", json={"pain": 0, "vision": "better", "redness": "none"}).json()
    assert ck["flag"] is False

    # Right to erasure.
    assert client.delete(f"/api/p/{pid}").json()["erased"]
    assert client.get(f"/api/p/{pid}").status_code == 404


def test_biometry_import_and_dose_marking(client, staff):
    csv = open("samples/iolmaster-export-sample.csv", "rb").read()
    d = client.post("/api/staff/patients/KAMALA/biometry/import", headers=staff, files={"file": ("export.csv", csv, "text/csv")}).json()
    assert d["biometry"]["axial_length"] == 23.42 and d["biometry"]["k2_axis"] == 92

    rec = client.get("/api/p/ABDUL/recovery").json()
    dose = rec["today"][0]
    after = client.post(f"/api/p/ABDUL/doses/{dose['id']}", json={"taken": True}).json()
    assert next(x for x in after["today"] if x["id"] == dose["id"])["status"] == "taken"


def test_meta(client):
    m = client.get("/api/meta").json()
    assert m["ai"] == "offline" and set(m["curves"]) == {"monofocal", "edof", "trifocal"}
