"""Patient-facing API. A patient is identified by their private access code (shared by the clinic)."""
from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, delete, select

from .. import i18n
from ..config import local_now
from ..core import add_message, alert_out, clinic, get_patient, latest_rec, msg_out, raise_alert, recompute
from ..db import get_session
from ..models import Alert, Biometry, Dose, Message, Patient, Recommendation, VisionTest, now
from ..services import intake, lenses, rag, recovery, redflag, visiontest

router = APIRouter(prefix="/api/p", tags=["patient"])


def patient_view(p: Patient, session: Session) -> dict:
    c = clinic()
    view = {
        "id": p.id, "name": p.name, "language": p.language, "stage": p.stage, "eye": p.eye,
        "consented": p.consent_at is not None, "clinic": c,
        "activities": lenses.normalise_activities(p.profile) if p.profile.get("activities") else [],
        "local_labels": {a["id"]: a.get("label_local") for a in p.profile.get("activities", [])},
        "intake": None, "plan": None, "recovery": None,
    }
    if p.stage == "intake":
        topic = p.profile.get("current_topic")
        view["intake"] = {"topic": topic, "options": i18n.options(topic, p.language) if topic else [], "started": bool(topic)}
    rec = latest_rec(session, p)
    if rec and rec.status == "approved":
        opts = rec.result.get("options", [])
        chosen = next((o for o in opts if o["key"] == rec.approved_lens), None)
        view["plan"] = {
            "lens": chosen,
            "compare": [o for o in opts if not o["excluded"]],
            "activities": rec.result.get("activities", []),
            "note": rec.surgeon_note,
            "approved_at": rec.approved_at.isoformat() if rec.approved_at else None,
        }
    if p.surgery_date:
        view["recovery"] = recovery.summary(p, session, p.language)
    return view


@router.get("/{code}")
def get_me(p: Patient = Depends(get_patient), session: Session = Depends(get_session)):
    return patient_view(p, session)


class Prefs(BaseModel):
    language: Literal["kn", "hi", "ta", "en"]


@router.patch("/{code}")
def update_me(body: Prefs, p: Patient = Depends(get_patient), session: Session = Depends(get_session)):
    p.language = body.language
    session.add(p)
    session.commit()
    return patient_view(p, session)


@router.post("/{code}/consent")
def consent(p: Patient = Depends(get_patient), session: Session = Depends(get_session)):
    p.consent_at = now()
    session.add(p)
    session.commit()
    return {"ok": True}


@router.delete("/{code}")
def erase_me(p: Patient = Depends(get_patient), session: Session = Depends(get_session)):
    """Right to erasure (DPDP Act 2023): removes every record about this patient."""
    erase(session, p.id)
    session.commit()
    return {"erased": True}


def erase(session: Session, pid: str) -> None:
    for model in (Message, Alert, Dose, Recommendation, Biometry, VisionTest):
        session.exec(delete(model).where(model.patient_id == pid))
    session.exec(delete(Patient).where(Patient.id == pid))


@router.get("/{code}/messages")
def messages(channel: str = "intake", p: Patient = Depends(get_patient), session: Session = Depends(get_session)):
    rows = session.exec(select(Message).where(Message.patient_id == p.id, Message.channel == channel).order_by(Message.id)).all()
    return [msg_out(m) for m in rows]


def _require_consent(p: Patient) -> None:
    if p.consent_at is None:
        raise HTTPException(403, "Consent required before the conversation starts")


@router.post("/{code}/intake/start")
def intake_start(p: Patient = Depends(get_patient), session: Session = Depends(get_session)):
    _require_consent(p)
    if p.stage == "intake" and not p.profile.get("current_topic"):
        q = intake.question("day", p.language, p.name.split()[0])
        p.profile = {**p.profile, "current_topic": "day"}
        session.add(p)
        add_message(session, p, "intake", "assistant", q["text"], q["text_en"], topic="day", options=q["options"])
        session.commit()
    return {"patient": patient_view(p, session), "messages": messages("intake", p, session)}


class Say(BaseModel):
    text: str = Field(default="", max_length=2000)
    choice: Optional[str] = None


def _check_red_flags(session: Session, p: Patient, channel: str, text: str) -> list:
    """Runs on every patient message. Returns the safety message(s) to show, if any."""
    det = redflag.detect(text)
    if not det["flag"]:
        return []
    alert = raise_alert(session, p, det, text)
    c = clinic()
    key = "redflag_urgent" if det["severity"] == "urgent" else "redflag_soon"
    kw = dict(doctor=c["surgeon"], emergency=c["emergency_number"], phone=c["phone"])
    m = add_message(session, p, channel, "assistant", i18n.t(key, p.language, **kw), i18n.t(key, "en", **kw),
                    kind="safety", severity=det["severity"], alert_id=alert.id)
    return [m]


@router.post("/{code}/intake")
def intake_say(body: Say, p: Patient = Depends(get_patient), session: Session = Depends(get_session)):
    _require_consent(p)
    if p.stage != "intake":
        raise HTTPException(409, "The conversation is already complete")
    topic = p.profile.get("current_topic") or "day"
    text = body.text.strip() or (i18n.option_label(topic, body.choice, p.language) if body.choice else "") or ""
    if not text:
        raise HTTPException(422, "Say something or pick an option")

    pm = add_message(session, p, "intake", "patient", text, choice=body.choice, topic=topic)
    out = [pm]
    out += _check_red_flags(session, p, "intake", text)

    res = intake.step(dict(p.profile), text, p.language, p.name.split()[0], clinic()["surgeon"], body.choice)
    pm.text_en = res.get("patient_en") or (text if p.language == "en" else None)
    pm.meta = {**pm.meta, "extracted": [a["label"] for a in res["extracted"].get("activities", [])], "mode": res["mode"]}
    session.add(pm)
    p.profile = res["profile"]
    r = res["reply"]
    out.append(add_message(session, p, "intake", "assistant", r["text"], r["text_en"], topic=r["topic"], options=r["options"]))
    if res["done"]:
        p.stage = "review"
        recompute(session, p)
    session.add(p)
    session.commit()
    return {"messages": [msg_out(m) for m in out], "done": res["done"], "patient": patient_view(p, session)}


@router.post("/{code}/ask")
def ask(body: Say, p: Patient = Depends(get_patient), session: Session = Depends(get_session)):
    """Questions any time (before or after surgery): red-flag check first, then grounded answers."""
    _require_consent(p)
    text = body.text.strip()
    if not text:
        raise HTTPException(422, "Empty question")
    out = [add_message(session, p, "recovery", "patient", text)]
    safety = _check_red_flags(session, p, "recovery", text)
    out += safety
    urgent = any(m.meta.get("severity") == "urgent" for m in safety)
    if not urgent:
        ans = rag.answer(text, p.language)
        if not ans["found"] and not safety:
            a = Alert(patient_id=p.id, severity="info", category="question", text=text)
            session.add(a)
            session.flush()
            ans["alert_id"] = a.id
        out.append(add_message(session, p, "recovery", "assistant", ans["text"], ans["text_en"], kind="answer",
                               citations=ans["citations"], found=ans["found"], mode=ans["mode"], alert_id=ans.get("alert_id")))
    session.commit()
    return {"messages": [msg_out(m) for m in out]}


class CheckIn(BaseModel):
    pain: int = Field(ge=0, le=3)
    vision: Literal["better", "same", "worse"]
    redness: Literal["none", "same", "more"]


@router.post("/{code}/checkin")
def daily_checkin(body: CheckIn, p: Patient = Depends(get_patient), session: Session = Depends(get_session)):
    _require_consent(p)
    day = recovery.day_of(p)
    det = redflag.checkin(body.pain, body.vision, body.redness, day)
    summary = f"Check-in day {day}: pain {body.pain}/3, vision {body.vision}, redness {body.redness}"
    out = [add_message(session, p, "recovery", "patient", summary, summary, kind="checkin", day=day, **body.model_dump())]
    if det["flag"]:
        alert = raise_alert(session, p, det, summary, summary)
        c = clinic()
        key = "redflag_urgent" if det["severity"] == "urgent" else "redflag_soon"
        kw = dict(doctor=c["surgeon"], emergency=c["emergency_number"], phone=c["phone"])
        out.append(add_message(session, p, "recovery", "assistant", i18n.t(key, p.language, **kw), i18n.t(key, "en", **kw),
                               kind="safety", severity=det["severity"], alert_id=alert.id))
    else:
        out.append(add_message(session, p, "recovery", "assistant", i18n.t("checkin_ok", p.language), i18n.t("checkin_ok", "en"), kind="checkin_ok"))
    session.commit()
    return {"messages": [msg_out(m) for m in out], "flag": det["flag"], "severity": det["severity"]}


class Taken(BaseModel):
    taken: bool = True


@router.post("/{code}/doses/{dose_id}")
def mark_dose(dose_id: int, body: Taken, p: Patient = Depends(get_patient), session: Session = Depends(get_session)):
    d = session.get(Dose, dose_id)
    if not d or d.patient_id != p.id:
        raise HTTPException(404, "Dose not found")
    d.taken_at = local_now() if body.taken else None
    session.add(d)
    session.commit()
    return recovery.summary(p, session, p.language)


@router.get("/{code}/recovery")
def get_recovery(p: Patient = Depends(get_patient), session: Session = Depends(get_session)):
    if not p.surgery_date:
        raise HTTPException(404, "No surgery date yet")
    return recovery.summary(p, session, p.language)



class VisionIn(BaseModel):
    eye: Literal["right", "left"]
    kind: Literal["distance", "near", "amsler"]
    distance_cm: Optional[float] = Field(default=None, gt=10, le=700)
    logmar: Optional[float] = Field(default=None, ge=-0.3, le=1.3)
    amsler_cells: list[int] = Field(default_factory=list, max_length=100)
    px_per_mm: Optional[float] = Field(default=None, gt=1, lt=40)
    trials: Optional[list[dict]] = Field(default=None, max_length=80)
    helper: Optional[bool] = None


def vision_out(t: VisionTest, info: dict | None = None) -> dict:
    from ..core import iso
    return {"id": t.id, "eye": t.eye, "kind": t.kind, "distance_cm": t.distance_cm, "logmar": t.logmar,
            "snellen": lenses.snellen(t.logmar) if t.logmar is not None else None,
            "amsler_abnormal": t.amsler_abnormal, "amsler_cells": t.amsler_cells, "day": t.day,
            "created_at": iso(t.created_at), **(info or {})}


def vision_history(session: Session, p: Patient) -> list[dict]:
    rows = session.exec(select(VisionTest).where(VisionTest.patient_id == p.id).order_by(VisionTest.id)).all()
    rec = latest_rec(session, p)
    approved = next((o for o in rec.result.get("options", []) if o["key"] == rec.approved_lens), None) if rec and rec.status == "approved" else None
    out = []
    for i, t in enumerate(rows):
        info = visiontest.interpret(p, t, rows[:i], approved)
        info.pop("alert", None)
        out.append(vision_out(t, info))
    return out


@router.get("/{code}/vision-tests")
def list_vision(p: Patient = Depends(get_patient), session: Session = Depends(get_session)):
    return vision_history(session, p)


@router.post("/{code}/vision-tests")
def add_vision(body: VisionIn, p: Patient = Depends(get_patient), session: Session = Depends(get_session)):
    _require_consent(p)
    if body.kind != "amsler" and body.logmar is None:
        raise HTTPException(422, "logmar is required for an acuity test")
    history = session.exec(select(VisionTest).where(VisionTest.patient_id == p.id).order_by(VisionTest.id)).all()
    t = VisionTest(patient_id=p.id, eye=body.eye, kind=body.kind, distance_cm=body.distance_cm or (200 if body.kind == "distance" else 40),
                   logmar=body.logmar, amsler_abnormal=(len(body.amsler_cells) > 0) if body.kind == "amsler" else None,
                   amsler_cells=body.amsler_cells, day=visiontest.operated_day(p, body.eye),
                   meta={"px_per_mm": body.px_per_mm, "trials": body.trials, "helper": body.helper})
    session.add(t)
    session.flush()
    rec = latest_rec(session, p)
    approved = next((o for o in rec.result.get("options", []) if o["key"] == rec.approved_lens), None) if rec and rec.status == "approved" else None
    info = visiontest.interpret(p, t, history, approved)
    msgs = []
    al = info.pop("alert", None)
    c = clinic()
    if al:
        a = Alert(patient_id=p.id, severity=al["severity"], category=al["category"], text=al["text"], text_en=al["text"])
        session.add(a)
        session.flush()
        info["alert_id"] = a.id
        if al["severity"] in ("urgent", "soon"):
            key = "redflag_" + al["severity"]
            kw = dict(doctor=c["surgeon"], emergency=c["emergency_number"], phone=c["phone"])
            msgs.append(add_message(session, p, "recovery", "assistant", i18n.t(key, p.language, **kw), i18n.t(key, "en", **kw),
                                    kind="safety", severity=al["severity"], alert_id=a.id))
    session.commit()
    return {"test": vision_out(t, info), "saved": i18n.t("vision_saved", p.language), "messages": [msg_out(m) for m in msgs]}
