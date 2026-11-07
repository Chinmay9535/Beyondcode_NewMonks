"""Database tables (SQLModel). SQLite by default; any SQLAlchemy URL (e.g. Postgres/Supabase) works."""
from __future__ import annotations

import secrets
from datetime import date, datetime, timezone
from typing import Any, Optional

from sqlalchemy import JSON, Column, DateTime
from sqlmodel import Field, SQLModel

LANGS = ("kn", "hi", "ta", "en")


def now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_code() -> str:
    # Unambiguous characters; doubles as the patient's private access code.
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(8))


class Patient(SQLModel, table=True):
    id: str = Field(default_factory=new_code, primary_key=True)
    name: str
    age: Optional[int] = None
    sex: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    occupation: Optional[str] = None
    language: str = "kn"
    eye: str = "right"  # eye being operated: right | left
    # Ocular conditions relevant to lens choice, e.g. ["macular_disease", "dry_eye"].
    conditions: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    # intake -> review -> approved -> post_op
    stage: str = "intake"
    # Lifestyle profile built during the intake conversation (see services/intake.py).
    profile: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    consent_at: Optional[datetime] = Field(default=None, sa_type=DateTime)
    surgery_date: Optional[date] = None
    created_at: datetime = Field(default_factory=now, sa_type=DateTime)


class Biometry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    patient_id: str = Field(foreign_key="patient.id", index=True)
    eye: str = "right"
    axial_length: float  # mm
    k1: float  # flat keratometry, D
    k2: float  # steep keratometry, D
    k2_axis: Optional[int] = None  # steep axis, degrees
    acd: Optional[float] = None  # anterior chamber depth, mm
    wtw: Optional[float] = None  # white-to-white, mm
    lens_thickness: Optional[float] = None
    source: str = "manual"
    created_at: datetime = Field(default_factory=now, sa_type=DateTime)


class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    patient_id: str = Field(foreign_key="patient.id", index=True)
    channel: str = "intake"  # intake | recovery
    role: str  # patient | assistant
    text: str
    text_en: Optional[str] = None
    lang: str = "en"
    meta: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=now, sa_type=DateTime)


class Recommendation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    patient_id: str = Field(foreign_key="patient.id", index=True)
    result: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    status: str = "pending"  # pending | approved
    approved_lens: Optional[str] = None
    surgeon_note: Optional[str] = None
    approved_at: Optional[datetime] = Field(default=None, sa_type=DateTime)
    created_at: datetime = Field(default_factory=now, sa_type=DateTime)


class Alert(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    patient_id: str = Field(foreign_key="patient.id", index=True)
    severity: str  # urgent | soon | info
    category: str
    text: str  # the patient's own words
    text_en: Optional[str] = None
    matched: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    status: str = "open"  # open | acknowledged
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=now, sa_type=DateTime)
    acknowledged_at: Optional[datetime] = Field(default=None, sa_type=DateTime)


class Dose(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    patient_id: str = Field(foreign_key="patient.id", index=True)
    drug: str
    drug_key: str
    due_at: datetime = Field(index=True, sa_type=DateTime)  # clinic local time, naive
    taken_at: Optional[datetime] = Field(default=None, sa_type=DateTime)
