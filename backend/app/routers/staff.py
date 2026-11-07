"""Surgeon / clinic-staff API."""
from __future__ import annotations

import csv
import io
import json
import re
from datetime import date
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..config import get_settings
from ..core import (alert_out, biometry_for, biometry_out, iso, latest_biometry, latest_rec, msg_out, rec_out, recompute,
                    require_staff, staff_token)
from ..db import get_session
from ..models import Alert, Biometry, Message, Patient, now
from ..services import lenses, recovery
from .patient import erase, vision_history

router = APIRouter(prefix="/api/staff", tags=["staff"])
auth = [Depends(require_staff)]


class Login(BaseModel):
    pin: str


@router.post("/login")
def login(body: Login):
    if body.pin.strip() != get_settings().surgeon_pin:
        raise HTTPException(401, "Wrong PIN")
    return {"token": staff_token()}


def _get(session: Session, pid: str) -> Patient:
    p = session.get(Patient, pid)
    if not p:
        raise HTTPException(404, "Patient not found")
    return p


@router.get("/patients", dependencies=auth)
def list_patients(session: Session = Depends(get_session)):
    patients = session.exec(select(Patient).order_by(Patient.created_at.desc())).all()
    alerts = session.exec(select(Alert).where(Alert.status == "open")).all()
    out = []
    for p in patients:
        mine = [a for a in alerts if a.patient_id == p.id]
        rec = latest_rec(session, p)
        top = None
        if rec:
            opts = rec.result.get("options", [])
            top = next((o for o in opts if o["key"] == rec.approved_lens), None) if rec.status == "approved" else (opts[0] if opts else None)
        rv = recovery.summary(p, session, "en") if p.surgery_date else None
        out.append({
            "id": p.id, "name": p.name, "age": p.age, "sex": p.sex, "city": p.city, "occupation": p.occupation,
            "language": p.language, "eye": p.eye, "stage": p.stage, "surgery_date": p.surgery_date.isoformat() if p.surgery_date else None,
            "open_alerts": len(mine), "urgent_alerts": sum(1 for a in mine if a.severity == "urgent"),
            "lens": {"name": top["name"], "score": top["score"], "approved": rec.status == "approved"} if top else None,
            "adherence": rv["adherence"] if rv else None, "day": rv["day"] if rv else None,
            "created_at": iso(p.created_at),
        })
    out.sort(key=lambda x: (-x["urgent_alerts"], -x["open_alerts"]))
    return out


class BiometryIn(BaseModel):
    eye: Optional[Literal["right", "left"]] = None
    axial_length: float = Field(gt=15, lt=40)
    k1: float = Field(gt=30, lt=60)
    k2: float = Field(gt=30, lt=60)
    k2_axis: Optional[int] = Field(default=None, ge=0, le=180)
    acd: Optional[float] = Field(default=None, gt=1, lt=6)
    wtw: Optional[float] = Field(default=None, gt=8, lt=16)
    lens_thickness: Optional[float] = None
    source: str = "manual"


class PatientIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    age: Optional[int] = Field(default=None, ge=1, le=120)
    sex: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    occupation: Optional[str] = None
    language: Literal["kn", "hi", "ta", "en"] = "kn"
    eye: Literal["right", "left"] = "right"
    conditions: list[str] = []
    biometry: Optional[BiometryIn] = None


@router.post("/patients", dependencies=auth)
def create_patient(body: PatientIn, session: Session = Depends(get_session)):
    data = body.model_dump(exclude={"biometry"})
    data["conditions"] = [c for c in body.conditions if c in lenses.CONDITIONS]
    p = Patient(**data)
    session.add(p)
    session.flush()
    if body.biometry:
        session.add(Biometry(patient_id=p.id, eye=body.biometry.eye or p.eye, **body.biometry.model_dump(exclude={"eye"})))
    session.commit()
    return {"id": p.id}


@router.get("/patients/{pid}", dependencies=auth)
def patient_detail(pid: str, session: Session = Depends(get_session)):
    p = _get(session, pid)
    msgs = session.exec(select(Message).where(Message.patient_id == p.id).order_by(Message.id)).all()
    alerts = session.exec(select(Alert).where(Alert.patient_id == p.id).order_by(Alert.id.desc())).all()
    return {
        "patient": {
            "id": p.id, "name": p.name, "age": p.age, "sex": p.sex, "phone": p.phone, "city": p.city, "occupation": p.occupation or p.profile.get("occupation"),
            "language": p.language, "eye": p.eye, "stage": p.stage, "conditions": p.conditions, "consent_at": iso(p.consent_at),
            "dominant_eye": p.dominant_eye, "fellow_status": p.fellow_status or "planned", "fellow": p.fellow or {},
            "surgery_date": p.surgery_date.isoformat() if p.surgery_date else None, "created_at": iso(p.created_at),
            "profile": {k: v for k, v in p.profile.items() if k not in ("asked", "current_topic")},
        },
        "biometry": biometry_out(latest_biometry(session, p)),
        "biometry_by_eye": {e: biometry_out(biometry_for(session, p, e)) for e in ("right", "left")},
        "recommendation": rec_out(latest_rec(session, p)),
        "messages": [msg_out(m) for m in msgs],
        "alerts": [alert_out(a) for a in alerts],
        "recovery": recovery.summary(p, session, "en") if p.surgery_date else None,
        "vision_tests": vision_history(session, p),
    }


class Activity(BaseModel):
    id: str
    label: str
    label_local: Optional[str] = None
    distance_cm: float = Field(gt=10, le=1000)
    detail: Literal["fine", "normal", "coarse"] = "normal"
    night: bool = False
    hours: float = Field(gt=0, le=16)
    importance: float = Field(ge=1, le=3)
    quote: Optional[str] = None


class PatientPatch(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    occupation: Optional[str] = None
    language: Optional[Literal["kn", "hi", "ta", "en"]] = None
    eye: Optional[Literal["right", "left"]] = None
    dominant_eye: Optional[Literal["right", "left", "unknown"]] = None
    fellow_status: Optional[Literal["planned", "operated", "natural"]] = None
    conditions: Optional[list[str]] = None
    surgery_date: Optional[date] = None
    clear_surgery_date: bool = False
    activities: Optional[list[Activity]] = None
    glasses_free: Optional[float] = Field(default=None, ge=0, le=3)
    budget: Optional[float] = Field(default=None, ge=0, le=3)


@router.patch("/patients/{pid}", dependencies=auth)
def update_patient(pid: str, body: PatientPatch, session: Session = Depends(get_session)):
    p = _get(session, pid)
    rerank = False
    for f in ("name", "age", "phone", "city", "occupation", "language"):
        v = getattr(body, f)
        if v is not None:
            setattr(p, f, v)
    if body.eye and body.eye != p.eye:
        p.eye, rerank = body.eye, True
    if body.dominant_eye:
        p.dominant_eye, rerank = (None if body.dominant_eye == "unknown" else body.dominant_eye), True
    if body.fellow_status and body.fellow_status != (p.fellow_status or "planned"):
        p.fellow_status, rerank = body.fellow_status, True
    if body.conditions is not None:
        p.conditions, rerank = [c for c in body.conditions if c in lenses.CONDITIONS], True
    prof = dict(p.profile)
    if body.activities is not None:
        prof["activities"] = [a.model_dump() for a in body.activities]
        rerank = True
    for f in ("glasses_free", "budget"):
        if getattr(body, f) is not None:
            prof[f], rerank = getattr(body, f), True
    p.profile = prof
    if body.surgery_date or body.clear_surgery_date:
        p.surgery_date = None if body.clear_surgery_date else body.surgery_date
        recovery.build_schedule(p, session)
        if p.surgery_date and p.stage == "approved":
            p.stage = "post_op"
        elif not p.surgery_date and p.stage == "post_op":
            p.stage = "approved"
    session.add(p)
    if rerank and p.stage != "intake":
        recompute(session, p)
    session.commit()
    return patient_detail(pid, session)


@router.post("/patients/{pid}/biometry", dependencies=auth)
def add_biometry(pid: str, body: BiometryIn, session: Session = Depends(get_session)):
    p = _get(session, pid)
    data = body.model_dump()
    eye = data.pop("eye") or p.eye
    session.add(Biometry(patient_id=p.id, eye=eye, **data))
    session.flush()
    if p.stage != "intake":
        recompute(session, p)
    session.commit()
    return patient_detail(pid, session)


def parse_biometer_export(raw: bytes) -> dict[str, dict[str, Any]]:
    """Reads a biometer export (CSV with headers like 'Eye', 'AL [mm]', 'K1 [D]', 'K2 axis', or JSON).
    Returns {"right": {...}, "left": {...}} for the eyes present. Rows without an eye column
    are treated as the right eye."""
    text = raw.decode("utf-8-sig", errors="replace")
    rows: list[dict[str, Any]]
    if text.lstrip().startswith(("{", "[")):
        data = json.loads(text)
        rows = data if isinstance(data, list) else data.get("eyes") or [data]
    else:
        rows = list(csv.DictReader(io.StringIO(text)))

    def norm(h: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", h.lower().split("[")[0])

    out: dict[str, dict[str, Any]] = {}
    for row in rows:
        n = {norm(k): v for k, v in row.items() if k}

        def f(*keys):
            for k in keys:
                if n.get(k) not in (None, ""):
                    return float(str(n[k]).replace(",", "."))
            return None
        side = str(n.get("eye", "od")).strip().lower()
        eye = "left" if side in ("os", "left", "l") else "right"
        r = {"axial_length": f("al", "axiallength"), "k1": f("k1"), "k2": f("k2"), "k2_axis": f("k2axis"),
             "acd": f("acd"), "wtw": f("wtw"), "lens_thickness": f("lt", "lensthickness")}
        if None in (r["axial_length"], r["k1"], r["k2"]):
            continue
        if r["k2_axis"] is not None:
            r["k2_axis"] = int(r["k2_axis"])
        out[eye] = r
    if not out:
        raise HTTPException(422, "Could not find AL, K1 and K2 in the file")
    return out


@router.post("/patients/{pid}/biometry/import", dependencies=auth)
async def import_biometry(pid: str, file: UploadFile = File(...), session: Session = Depends(get_session)):
    p = _get(session, pid)
    for eye, data in parse_biometer_export(await file.read()).items():
        session.add(Biometry(patient_id=p.id, eye=eye, **BiometryIn(**data).model_dump(exclude={"eye", "source"}), source=f"import: {file.filename}"))
    session.flush()
    if p.stage != "intake":
        recompute(session, p)
    session.commit()
    return patient_detail(pid, session)


class Outcome(BaseModel):
    actual_se: float = Field(ge=-10, le=10)  # post-op spherical equivalent of the operated eye, D


@router.post("/patients/{pid}/second-eye", dependencies=auth)
def plan_second_eye(pid: str, body: Outcome, session: Session = Depends(get_session)):
    """Record the operated eye's real outcome, then plan the fellow eye around it."""
    p = _get(session, pid)
    rec = latest_rec(session, p)
    if not rec or rec.status != "approved":
        raise HTTPException(409, "Approve and operate the first eye before planning the second")
    opt = next((o for o in rec.result.get("options", []) if o["key"] == rec.approved_lens), None)
    first = (opt or {}).get("eyes", {}).get(p.eye, {})
    p.fellow = {"family": first.get("family", (opt or {}).get("family", "monofocal")), "actual_se": body.actual_se,
                "predicted_se": first.get("power_target", first.get("target", 0.0)), "iol_power_d": first.get("iol_power_d"),
                "lens": first.get("name"), "eye": p.eye, "date": p.surgery_date.isoformat() if p.surgery_date else None}
    p.fellow_status = "operated"
    p.eye = "left" if p.eye == "right" else "right"
    p.stage = "review"
    session.add(p)
    recompute(session, p, fresh=True)
    session.commit()
    return patient_detail(pid, session)


@router.post("/patients/{pid}/recommend", dependencies=auth)
def rerank(pid: str, session: Session = Depends(get_session)):
    p = _get(session, pid)
    recompute(session, p)
    if p.stage == "intake":
        p.stage = "review"
        session.add(p)
    session.commit()
    return patient_detail(pid, session)


class Approve(BaseModel):
    lens_key: str
    note: Optional[str] = Field(default=None, max_length=1000)


@router.post("/patients/{pid}/approve", dependencies=auth)
def approve(pid: str, body: Approve, session: Session = Depends(get_session)):
    p = _get(session, pid)
    rec = latest_rec(session, p) or recompute(session, p)
    keys = {o["key"]: o for o in rec.result.get("options", [])}
    if body.lens_key not in keys:
        raise HTTPException(422, "Unknown lens option")
    rec.status, rec.approved_lens, rec.surgeon_note, rec.approved_at = "approved", body.lens_key, body.note, now()
    session.add(rec)
    p.stage = "post_op" if p.surgery_date else "approved"
    session.add(p)
    session.commit()
    return patient_detail(pid, session)


@router.post("/patients/{pid}/reopen", dependencies=auth)
def reopen(pid: str, session: Session = Depends(get_session)):
    """Withdraw an approval so the shortlist can be revised."""
    p = _get(session, pid)
    rec = latest_rec(session, p)
    if rec and rec.status == "approved":
        rec.status, rec.approved_at = "pending", None
        session.add(rec)
    p.stage = "review"
    session.add(p)
    session.commit()
    return patient_detail(pid, session)


@router.delete("/patients/{pid}", dependencies=auth)
def delete_patient(pid: str, session: Session = Depends(get_session)):
    _get(session, pid)
    erase(session, pid)
    session.commit()
    return {"deleted": True}


@router.get("/alerts", dependencies=auth)
def list_alerts(status: str = "open", session: Session = Depends(get_session)):
    q = select(Alert).order_by(Alert.id.desc())
    if status != "all":
        q = q.where(Alert.status == status)
    alerts = session.exec(q).all()
    names = {p.id: p for p in session.exec(select(Patient)).all()}
    rank = {"urgent": 0, "soon": 1, "info": 2}
    alerts = sorted(alerts, key=lambda a: (rank.get(a.severity, 3), -a.id))
    return [alert_out(a, names.get(a.patient_id)) for a in alerts]


class Ack(BaseModel):
    note: Optional[str] = Field(default=None, max_length=1000)


@router.post("/alerts/{aid}/ack", dependencies=auth)
def ack_alert(aid: int, body: Ack, session: Session = Depends(get_session)):
    a = session.get(Alert, aid)
    if not a:
        raise HTTPException(404, "Alert not found")
    a.status, a.note, a.acknowledged_at = "acknowledged", body.note, now()
    session.add(a)
    session.commit()
    return alert_out(a)
