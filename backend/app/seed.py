"""Demo patients at different stages of the journey. Runs once, on an empty database.

Conversations are replayed through the real intake engine and red-flag detector,
so the demo data is exactly what the product would have produced.
"""
from __future__ import annotations

from datetime import timedelta

from sqlmodel import Session, select

from . import i18n
from .config import local_now
from .core import add_message, clinic, raise_alert, recompute
from .db import engine
from .models import Biometry, Dose, Patient, VisionTest, now
from .services import intake, rag, recovery, redflag

DEMO = [
    {
        "patient": dict(id="RAMESH", name="Ramesh Kumar", age=62, sex="M", city="Mysuru", occupation="Tailor", language="kn", eye="right", phone="+91 90000 00001"),
        "biometry": dict(axial_length=23.42, k1=43.50, k2=44.00, k2_axis=92, acd=3.08, wtw=11.9, source="IOLMaster export (sample)"),
        "fellow_biometry": dict(axial_length=23.38, k1=43.62, k2=44.12, k2_axis=88, acd=3.10, wtw=11.8, source="IOLMaster export (sample)"),
        "script": None,  # fresh: used for the live demo
    },
    {
        "patient": dict(id="LAKSHMI", name="Lakshmi Iyer", age=58, sex="F", city="Chennai", occupation="Retired bank officer", language="ta", eye="left", phone="+91 90000 00002", dominant_eye="left"),
        "biometry": dict(axial_length=24.10, k1=42.75, k2=44.25, k2_axis=85, acd=3.21, wtw=12.0, source="IOLMaster export (sample)"),
        "fellow_biometry": dict(axial_length=24.02, k1=42.90, k2=44.10, k2_axis=95, acd=3.18, wtw=12.0, source="IOLMaster export (sample)"),
        # topic -> (what the patient said, tapped option)
        "script": {
            "day": ("நான் ஓய்வு பெற்றவள். தினமும் காலையில் செய்தித்தாள் படிக்கிறேன், மாலையில் டிவி பார்க்கிறேன்.", None),
            "near": ("பேரனுக்கு வீட்டுப்பாடம் சொல்லிக் கொடுக்கிறேன், மொபைலில் வாட்ஸ்அப் 2 மணி நேரம்.", None),
            "mid": ("லேப்டாப்பில் 3 மணி நேரம் வேலை செய்கிறேன்", None),
            "night": ("", "never"),
            "glasses": ("", "very"),
            "budget": ("", "all"),
        },
    },
    {
        "patient": dict(id="KAMALA", name="Kamala Devi", age=71, sex="F", city="Mandya", occupation="Homemaker", language="kn", eye="right", phone="+91 90000 00003",
                        conditions=["macular_disease"]),
        "biometry": dict(axial_length=22.85, k1=44.25, k2=44.75, k2_axis=95, acd=2.85, wtw=11.6, source="IOLMaster export (sample)"),
        "fellow_biometry": dict(axial_length=22.91, k1=44.10, k2=44.60, k2_axis=90, acd=2.88, wtw=11.6, source="IOLMaster export (sample)"),
        "script": {
            "day": ("ನಾನು ಗೃಹಿಣಿ. ಬೆಳಿಗ್ಗೆ ಅಡುಗೆ ಮಾಡುತ್ತೇನೆ, ಸಂಜೆ ದೇವಸ್ಥಾನಕ್ಕೆ ಹೋಗುತ್ತೇನೆ.", None),
            "near": ("ಭಜನೆ ಪುಸ್ತಕ ಓದುತ್ತೇನೆ, ದಿನಕ್ಕೆ 1 ಗಂಟೆ", None),
            "night": ("", "never"),
            "glasses": ("", "dont_mind"),
            "budget": ("", "low"),
        },
        "amsler_preop": [44, 45, 54],
    },
    {
        "patient": dict(id="ABDUL", name="Abdul Rahim", age=66, sex="M", city="Bengaluru", occupation="Auto-rickshaw driver", language="hi", eye="right", phone="+91 90000 00004", dominant_eye="right",
                        conditions=["glaucoma"]),
        "biometry": dict(axial_length=23.95, k1=43.00, k2=43.50, k2_axis=178, acd=3.15, wtw=11.8, source="IOLMaster export (sample)"),
        "fellow_biometry": dict(axial_length=23.88, k1=43.12, k2=43.62, k2_axis=2, acd=3.12, wtw=11.8, source="IOLMaster export (sample)"),
        "script": {
            "day": ("मैं ऑटो चलाता हूँ, दिन भर। रात को भी सवारी लेता हूँ।", None),
            "near": ("फ़ोन पर थोड़ा व्हाट्सएप देखता हूँ", None),
            "mid": ("नहीं, ऐसा कुछ नहीं", None),
            "night": ("", "often"),
            "glasses": ("", "dont_mind"),
            "budget": ("", "low"),
        },
        "vision": [("right", "distance", 0.6, -5), ("left", "distance", 0.5, -5), ("right", "distance", 0.3, 1), ("right", "distance", 0.2, 3)],
        "approve": ("monofocal", "Glaucoma and long hours of night driving: monofocal for distance, reading glasses for the phone."),
        "surgery_days_ago": 3,
        "recovery": ["क्या मैं नमाज़ पढ़ सकता हूँ?", "आँख लाल है और दर्द बढ़ रहा है"],
    },
]


def seed() -> None:
    with Session(engine) as s:
        if s.exec(select(Patient)).first():
            return
        c = clinic()
        for d in DEMO:
            p = Patient(**d["patient"])
            s.add(p)
            s.flush()
            s.add(Biometry(patient_id=p.id, eye=p.eye, **d["biometry"]))
            if d.get("fellow_biometry"):
                s.add(Biometry(patient_id=p.id, eye="left" if p.eye == "right" else "right", **d["fellow_biometry"]))
            if not d["script"]:
                continue
            p.consent_at = now()
            first = p.name.split()[0]
            q = intake.question("day", p.language, first)
            add_message(s, p, "intake", "assistant", q["text"], q["text_en"], topic="day", options=q["options"])
            profile = {"current_topic": "day"}
            while (topic := profile.get("current_topic")):
                text, choice = d["script"].get(topic, ("", None))
                if not text and not choice:
                    text = "-"
                said = text or i18n.option_label(topic, choice, p.language)
                res = intake.step(profile, said, p.language, first, c["surgeon"], choice, use_llm=False)
                profile = res["profile"]
                add_message(s, p, "intake", "patient", said, res.get("patient_en"), choice=choice, topic=topic,
                            extracted=[a["label"] for a in res["extracted"].get("activities", [])])
                r = res["reply"]
                add_message(s, p, "intake", "assistant", r["text"], r["text_en"], topic=r["topic"], options=r["options"])
            p.profile = profile
            p.stage = "review"
            s.add(p)
            s.flush()
            rec = recompute(s, p)
            if d.get("approve"):
                fam, note = d["approve"]
                rec.status, rec.surgeon_note, rec.approved_at = "approved", note, now()
                rec.approved_lens = next(o["key"] for o in rec.result["options"] if o["family"] == fam and o["strategy"] != "blended")
                s.add(rec)
                p.stage = "approved"
            if d.get("surgery_days_ago") is not None:
                p.surgery_date = local_now().date() - timedelta(days=d["surgery_days_ago"])
                p.stage = "post_op"
                s.add(p)
                recovery.build_schedule(p, s)
                s.flush()
                cutoff = local_now()
                for i, dose in enumerate(s.exec(select(Dose).where(Dose.patient_id == p.id, Dose.due_at <= cutoff)).all()):
                    if i not in (5, 9):  # two missed doses, to show adherence tracking
                        dose.taken_at = dose.due_at + timedelta(minutes=7)
                        s.add(dose)
            for eye, kind, lm, day in d.get("vision", []):
                s.add(VisionTest(patient_id=p.id, eye=eye, kind=kind, distance_cm=200, logmar=lm, day=None if day < 0 else day,
                                 created_at=now() - timedelta(days=(3 - day) if day >= 0 else 8), meta={"seed": True}))
            if d.get("amsler_preop"):
                s.add(VisionTest(patient_id=p.id, eye=p.eye, kind="amsler", amsler_abnormal=True, amsler_cells=d["amsler_preop"], meta={"seed": True}))
            for text in d.get("recovery", []):
                add_message(s, p, "recovery", "patient", text)
                det = redflag.detect(text, use_llm=False)
                if det["flag"]:
                    a = raise_alert(s, p, det, text, "My eye is red and the pain is increasing")
                    key = "redflag_" + det["severity"]
                    kw = dict(doctor=c["surgeon"], emergency=c["emergency_number"], phone=c["phone"])
                    add_message(s, p, "recovery", "assistant", i18n.t(key, p.language, **kw), i18n.t(key, "en", **kw), kind="safety", severity=det["severity"], alert_id=a.id)
                else:
                    ans = rag.answer(text, p.language)
                    add_message(s, p, "recovery", "assistant", ans["text"], ans["text_en"], kind="answer", citations=ans["citations"], found=ans["found"], mode="curated")
        s.commit()
