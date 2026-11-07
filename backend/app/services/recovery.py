"""Post-op drop schedule and adherence, generated from the clinic's protocol in clinic.json."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Any

from sqlmodel import Session, delete, select

from ..models import Dose, Patient
from ..config import local_now
from .lenses import clinic_config

MISSED_AFTER = timedelta(minutes=90)


def build_schedule(patient: Patient, session: Session) -> int:
    """(Re)create the patient's dose list. Drops start the day after surgery."""
    session.exec(delete(Dose).where(Dose.patient_id == patient.id))
    if not patient.surgery_date:
        return 0
    n = 0
    for drug in clinic_config()["drops"]:
        day = patient.surgery_date + timedelta(days=1)
        for phase in drug["phases"]:
            for _ in range(phase["days"]):
                for hhmm in phase["times"]:
                    h, m = map(int, hhmm.split(":"))
                    session.add(Dose(patient_id=patient.id, drug=drug["name"]["en"], drug_key=drug["key"], due_at=datetime.combine(day, time(h, m))))
                    n += 1
                day += timedelta(days=1)
    return n


def drug_names(lang: str) -> dict[str, str]:
    return {d["key"]: d["name"].get(lang, d["name"]["en"]) for d in clinic_config()["drops"]}


def status(d: Dose, now: datetime) -> str:
    if d.taken_at:
        return "taken"
    if d.due_at > now:
        return "upcoming"
    return "missed" if now - d.due_at > MISSED_AFTER else "due"


def summary(patient: Patient, session: Session, lang: str, now: datetime | None = None) -> dict[str, Any]:
    now = now or local_now()
    names = drug_names(lang)
    doses = session.exec(select(Dose).where(Dose.patient_id == patient.id).order_by(Dose.due_at)).all()
    today = [d for d in doses if d.due_at.date() == now.date()]
    past = [d for d in doses if d.due_at <= now]
    taken = sum(1 for d in past if d.taken_at)
    day = (now.date() - patient.surgery_date).days if patient.surgery_date else None
    follow = []
    if patient.surgery_date:
        for f in clinic_config()["follow_ups"]:
            when = patient.surgery_date + timedelta(days=f["day"])
            follow.append({"day": f["day"], "label": f["label"], "date": when.isoformat(), "past": when < now.date()})
    last = doses[-1].due_at.date() if doses else None
    return {
        "day": day,
        "surgery_date": patient.surgery_date.isoformat() if patient.surgery_date else None,
        "today": [{"id": d.id, "drug": names.get(d.drug_key, d.drug), "drug_key": d.drug_key, "due_at": d.due_at.isoformat(timespec="minutes"),
                   "taken_at": d.taken_at.isoformat(timespec="minutes") if d.taken_at else None, "status": status(d, now)} for d in today],
        "adherence": {"taken": taken, "due_so_far": len(past), "pct": round(100 * taken / len(past)) if past else None,
                      "missed": sum(1 for d in past if status(d, now) == "missed")},
        "follow_ups": follow,
        "course_ends": last.isoformat() if last else None,
        "drugs": [{"key": k, "name": v} for k, v in names.items()],
    }


def day_of(patient: Patient, today: date | None = None) -> int | None:
    if not patient.surgery_date:
        return None
    return ((today or local_now().date()) - patient.surgery_date).days
