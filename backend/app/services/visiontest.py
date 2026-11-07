"""Home vision checks: interpretation and alerts.

Acuity is measured with a card-calibrated tumbling-E test (see web/components/VisionTest.tsx):
distance at 2 m with a helper (as in Peek Acuity), near at 40 cm. Scoring is a
coarse-then-fine staircase; a level passes at 3 correct before 2 wrong (~5% chance by
guessing). The Amsler grid screens for distortion of central vision.

Rules
- After surgery, a drop of >= 0.2 logMAR (2 lines) versus the eye's previous post-op
  result -> urgent alert (sudden vision loss must be seen the same day).
- Amsler distortion after surgery -> "soon" alert (possible macular oedema).
- Amsler distortion before surgery -> surgeon note: check the macula (e.g. OCT) before a
  multifocal lens.
- Post-op results are compared with the acuity the approved plan predicts for that eye.
"""
from __future__ import annotations

from datetime import date
from typing import Any

from ..config import local_now
from ..models import Patient, VisionTest
from .lenses import clinic_config, eye_logmar, snellen

DROP_URGENT = 0.2


def operated_day(p: Patient, eye: str, today: date | None = None) -> int | None:
    """Days since surgery on this eye, or None if not (yet) operated."""
    today = today or local_now().date()
    if p.surgery_date and eye == p.eye and p.stage == "post_op":
        return (today - p.surgery_date).days
    fel = p.fellow or {}
    if (p.fellow_status or "") == "operated" and fel.get("eye") == eye and fel.get("date"):
        return (today - date.fromisoformat(fel["date"])).days
    return None


def predicted(p: Patient, eye: str, approved: dict[str, Any] | None, distance_cm: float) -> float | None:
    if not approved or not approved.get("eyes"):
        return None
    e = approved["eyes"].get(eye)
    if not e:
        return None
    fam = clinic_config()["lens_families"].get(e["family"])
    return eye_logmar(fam, e.get("target", 0.0), distance_cm) if fam else None


def interpret(p: Patient, t: VisionTest, history: list[VisionTest], approved: dict[str, Any] | None) -> dict[str, Any]:
    out: dict[str, Any] = {"alert": None, "notes": []}
    post = t.day is not None and t.day >= 0
    if t.kind in ("distance", "near") and t.logmar is not None:
        out["snellen"] = snellen(t.logmar)
        same = [h for h in history if h.eye == t.eye and h.kind == t.kind and h.logmar is not None and h.id != t.id]
        if post:
            prev_post = [h for h in same if h.day is not None and h.day >= 0]
            if prev_post:
                prev = prev_post[-1]
                drop = round(t.logmar - prev.logmar, 2)
                out["change_lines"] = round(-drop * 10, 1)
                if drop >= DROP_URGENT:
                    out["alert"] = {"severity": "urgent", "category": "vision_drop",
                                    "text": f"{t.eye} eye {t.kind} vision dropped from {snellen(prev.logmar)} to {snellen(t.logmar)} ({drop * 10:.0f} lines) on day {t.day}"}
            pred = predicted(p, t.eye, approved, t.distance_cm or (200 if t.kind == "distance" else 40))
            if pred is not None:
                out["predicted_logmar"] = pred
                out["predicted_snellen"] = snellen(pred)
                out["vs_predicted_lines"] = round((pred - t.logmar) * 10, 1)
        pre = [h for h in same if h.day is None or h.day < 0]
        if pre:
            out["baseline_snellen"] = snellen(pre[0].logmar)
            out["vs_baseline_lines"] = round((pre[0].logmar - t.logmar) * 10, 1)
    if t.kind == "amsler" and t.amsler_abnormal:
        if post:
            out["alert"] = {"severity": "soon", "category": "amsler_distortion",
                            "text": f"{t.eye} eye: wavy or missing lines on the Amsler grid on day {t.day} ({len(t.amsler_cells)} areas marked)"}
        else:
            out["notes"].append("Amsler distortion before surgery: check the macula (e.g. OCT) before choosing a multifocal lens.")
            out["alert"] = {"severity": "info", "category": "amsler_preop",
                            "text": f"{t.eye} eye: Amsler grid distortion before surgery. Check the macula before a multifocal lens."}
    return out
