"""Shared helpers used by both routers: auth, serialisation, and the actions that
create alerts and recommendations (so seed data goes through the same code)."""
from __future__ import annotations

import hashlib
import hmac
from datetime import datetime
from typing import Any

from fastapi import Depends, Header, HTTPException
from sqlmodel import Session, select

from .config import get_settings
from .db import get_session
from .models import Alert, Biometry, Message, Patient, Recommendation, now
from .services import lenses


# ----------------------------------------------------------------------------- auth

def staff_token() -> str:
    s = get_settings()
    return hmac.new(s.secret_key.encode(), f"staff:{s.surgeon_pin}".encode(), hashlib.sha256).hexdigest()


def require_staff(authorization: str = Header(default="")) -> None:
    token = authorization.removeprefix("Bearer ").strip()
    if not token or not hmac.compare_digest(token, staff_token()):
        raise HTTPException(401, "Staff login required")


def get_patient(code: str, session: Session = Depends(get_session)) -> Patient:
    p = session.get(Patient, code.strip().upper())
    if not p:
        raise HTTPException(404, "Patient not found")
    return p


# ----------------------------------------------------------------------------- serialisation

def iso(dt: datetime | None) -> str | None:
    # DB timestamps are naive UTC; mark them so browsers convert to local time.
    return dt.isoformat(timespec="seconds") + "Z" if dt else None


def msg_out(m: Message) -> dict[str, Any]:
    return {"id": m.id, "channel": m.channel, "role": m.role, "text": m.text, "text_en": m.text_en, "lang": m.lang, "meta": m.meta or {}, "created_at": iso(m.created_at)}


def alert_out(a: Alert, patient: Patient | None = None) -> dict[str, Any]:
    d = {"id": a.id, "patient_id": a.patient_id, "severity": a.severity, "category": a.category, "text": a.text, "text_en": a.text_en,
         "matched": a.matched, "status": a.status, "note": a.note, "created_at": iso(a.created_at), "acknowledged_at": iso(a.acknowledged_at)}
    if patient:
        d["patient_name"] = patient.name
        d["patient_language"] = patient.language
    return d


def biometry_out(b: Biometry | None) -> dict[str, Any] | None:
    if not b:
        return None
    return {"axial_length": b.axial_length, "k1": b.k1, "k2": b.k2, "k2_axis": b.k2_axis, "acd": b.acd, "wtw": b.wtw,
            "lens_thickness": b.lens_thickness, "eye": b.eye, "source": b.source, "created_at": iso(b.created_at)}


def rec_out(r: Recommendation | None) -> dict[str, Any] | None:
    if not r:
        return None
    return {"id": r.id, "status": r.status, "approved_lens": r.approved_lens, "surgeon_note": r.surgeon_note,
            "approved_at": iso(r.approved_at), "created_at": iso(r.created_at), **r.result}


# ----------------------------------------------------------------------------- queries

def latest_biometry(session: Session, p: Patient) -> Biometry | None:
    rows = session.exec(select(Biometry).where(Biometry.patient_id == p.id).order_by(Biometry.created_at.desc(), Biometry.id.desc())).all()
    return next((b for b in rows if b.eye == p.eye), rows[0] if rows else None)


def latest_rec(session: Session, p: Patient) -> Recommendation | None:
    return session.exec(select(Recommendation).where(Recommendation.patient_id == p.id).order_by(Recommendation.id.desc())).first()


# ----------------------------------------------------------------------------- actions

def recompute(session: Session, p: Patient) -> Recommendation:
    """Re-rank lenses. Keeps an existing approval unless the surgeon re-opens it."""
    b = biometry_out(latest_biometry(session, p))
    result = lenses.rank(p.profile, b, p.conditions or [])
    prev = latest_rec(session, p)
    if prev and prev.status == "approved":
        prev.result = result
        session.add(prev)
        return prev
    r = Recommendation(patient_id=p.id, result=result)
    session.add(r)
    return r


def raise_alert(session: Session, p: Patient, detection: dict[str, Any], text: str, text_en: str | None = None) -> Alert:
    a = Alert(patient_id=p.id, severity=detection["severity"] or "soon", category=(detection.get("categories") or ["other"])[0],
              text=text, text_en=text_en or detection.get("patient_en"), matched=detection.get("matched", []))
    session.add(a)
    session.flush()
    return a


def add_message(session: Session, p: Patient, channel: str, role: str, text: str, text_en: str | None = None, **meta) -> Message:
    m = Message(patient_id=p.id, channel=channel, role=role, text=text, text_en=text_en, lang=p.language, meta=meta, created_at=now())
    session.add(m)
    session.flush()
    return m


def clinic() -> dict[str, Any]:
    return lenses.clinic_config()["clinic"]
