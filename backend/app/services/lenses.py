"""Lens shortlist engine: the patient's day + biometry + clinical rules -> ranked, explained options.

How it works
- The intake conversation produces a list of daily *activities*, each with a
  working distance, how fine the detail is, whether it happens at night, hours
  per day and importance ("threading needles, 33 cm, fine, 6 h, very important").
- Each lens family has a defocus curve (logMAR acuity vs. vergence). The working
  distance gives the vergence, the curve gives predicted acuity, and that gives a
  per-activity verdict: clear / some strain / needs glasses. Night activities are
  discounted by the lens's halo tendency. This is the "Vision Day Map".
- The score is additive over activities (plus cost), so each activity's
  contribution is exact: the Shapley values of a linear model relative to the
  average lens. No black box.
- Clinical rules (conditions, astigmatism) are explicit and listed in the output.
- Output is decision support only. Every shortlist must be approved by the surgeon.
"""
from __future__ import annotations

import json
import math
from datetime import datetime
from functools import lru_cache
from typing import Any

from ..config import BASE_DIR

# Acuity an activity needs (logMAR): fine = needle/fine print, normal = newspaper/phone, coarse = cooking/TV.
DETAIL_LOGMAR = {"fine": 0.1, "normal": 0.2, "coarse": 0.3}
FAR_CM = 600

DEFAULT_ACTIVITIES = [
    {"id": "distance", "label": "Seeing faces, walking, TV", "distance_cm": FAR_CM, "detail": "normal", "night": False, "hours": 4, "importance": 2},
    {"id": "reading", "label": "Reading and phone", "distance_cm": 40, "detail": "normal", "night": False, "hours": 1, "importance": 2},
]

CONDITIONS = {
    "macular_disease": "Macular disease (AMD, ERM, macular oedema)",
    "glaucoma": "Glaucoma",
    "diabetic_retinopathy": "Diabetic retinopathy",
    "dry_eye": "Dry eye / ocular surface disease",
    "prior_refractive_surgery": "Previous LASIK / PRK / RK",
    "amblyopia": "Amblyopia (lazy eye)",
}


@lru_cache
def clinic_config() -> dict[str, Any]:
    return json.loads((BASE_DIR / "clinic.json").read_text(encoding="utf-8"))


# --------------------------------------------------------------------------- IOL power


def srkt(axial_length: float, k_avg: float, a_constant: float, target: float = 0.0) -> float:
    """SRK/T formula (Retzlaff, Sanders & Kraff 1990). Returns IOL power in dioptres.

    target is the desired post-op refraction (0 = emmetropia). Illustrative: real
    planning uses the biometer's optimised constants and newer formulas for short,
    long or post-refractive eyes.
    """
    L, K, A = axial_length, k_avg, a_constant
    na, v, ncm1 = 1.336, 12.0, 0.333
    r = 337.5 / K
    lcor = L if L <= 24.2 else -3.446 + 1.716 * L - 0.0237 * L * L
    cw = -5.41 + 0.58412 * lcor + 0.098 * K
    disc = r * r - cw * cw / 4.0
    h = r - math.sqrt(max(disc, 0.0))
    offset = (0.62467 * A - 68.747) - 3.336
    c1 = h + offset
    lopt = L + (0.65696 - 0.02029 * L)
    num = 1000 * na * (na * r - ncm1 * lopt - 0.001 * target * (v * (na * r - ncm1 * lopt) + lopt * r))
    den = (lopt - c1) * (na * r - ncm1 * c1 - 0.001 * target * (v * (na * r - ncm1 * c1) + c1 * r))
    return num / den


def round_power(p: float) -> float:
    return round(p * 2) / 2


def biometry_notes(b: dict[str, Any] | None, conditions: list[str]) -> list[dict[str, str]]:
    notes: list[dict[str, str]] = []
    if not b:
        return [{"level": "caution", "text": "No biometry on file yet. Upload IOLMaster data before planning."}]
    al = b["axial_length"]
    if al < 22.0:
        notes.append({"level": "caution", "text": f"Short eye (AL {al:.2f} mm): SRK/T is less accurate; prefer Barrett Universal II, Hill-RBF or Haigis."})
    elif al > 26.0:
        notes.append({"level": "caution", "text": f"Long eye (AL {al:.2f} mm): consider Barrett or a Wang-Koch adjusted formula."})
    k = (b["k1"] + b["k2"]) / 2
    if k < 40.0 or k > 47.5:
        notes.append({"level": "caution", "text": f"Unusual mean K ({k:.2f} D): double-check keratometry."})
    if b.get("acd") is not None and b["acd"] < 2.5:
        notes.append({"level": "caution", "text": f"Shallow anterior chamber (ACD {b['acd']:.2f} mm)."})
    if "prior_refractive_surgery" in conditions:
        notes.append({"level": "caution", "text": "Post-refractive cornea: standard K readings overestimate power; use Barrett True-K or similar."})
    if "dry_eye" in conditions:
        notes.append({"level": "caution", "text": "Dry eye can distort keratometry and toric axis. Treat and re-measure before final planning."})
    return notes


# --------------------------------------------------------------------------- optics


def interp(curve: list[list[float]], x: float) -> float:
    pts = sorted(curve, key=lambda p: -p[0])  # +0.5 ... -4.0
    if x >= pts[0][0]:
        return pts[0][1]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x1 <= x <= x0:
            return y0 + (y1 - y0) * (x0 - x) / (x0 - x1)
    return pts[-1][1]


def vergence(distance_cm: float) -> float:
    return -100.0 / max(distance_cm, 10.0)


def predicted_logmar(family: dict[str, Any], distance_cm: float, residual_cyl: float = 0.0) -> float:
    # Uncorrected astigmatism blurs every distance; roughly half the cylinder acts as defocus.
    return round(interp(family["defocus_curve"], vergence(distance_cm)) + 0.5 * residual_cyl * 0.3, 3)


def verdict(logmar: float, detail: str) -> tuple[str, float]:
    need = DETAIL_LOGMAR.get(detail, 0.2)
    if logmar <= need:
        return "clear", 1.0
    u = max(0.0, 1.0 - (logmar - need) / 0.3)
    return ("strain" if logmar <= need + 0.12 else "glasses"), u


def snellen(logmar: float) -> str:
    """6/x notation, as used in Indian clinics."""
    return f"6/{round(6 * 10 ** logmar, 1):g}"


# --------------------------------------------------------------------------- ranking


def _level(v: Any, default: float) -> float:
    return float(min(3, max(0, v))) if isinstance(v, (int, float)) else default


def normalise_activities(profile: dict[str, Any]) -> list[dict[str, Any]]:
    acts = [a for a in (profile or {}).get("activities", []) if isinstance(a, dict)]
    out = []
    for i, a in enumerate(acts or DEFAULT_ACTIVITIES):
        out.append({
            "id": a.get("id") or f"a{i}",
            "label": a.get("label") or "Activity",
            "distance_cm": float(a.get("distance_cm") or FAR_CM),
            "detail": a.get("detail") if a.get("detail") in DETAIL_LOGMAR else "normal",
            "night": bool(a.get("night")),
            "hours": float(min(16, max(0.25, a.get("hours") or 1))),
            "importance": float(min(3, max(1, a.get("importance") or 2))),
            "quote": a.get("quote"),
        })
    return out


def rank(profile: dict[str, Any], biometry: dict[str, Any] | None, conditions: list[str]) -> dict[str, Any]:
    cfg = clinic_config()
    families: dict[str, Any] = cfg["lens_families"]
    profile = profile or {}
    acts = normalise_activities(profile)
    glasses_free = _level(profile.get("glasses_free"), 2)  # 3 = strongly wants to avoid glasses
    budget = _level(profile.get("budget"), 1)  # 3 = cost matters a lot

    # Astigmatism
    astig: dict[str, Any] = {"cyl": None, "axis": None, "toric": False, "borderline": False}
    if biometry:
        cyl = round(abs(biometry["k2"] - biometry["k1"]), 2)
        astig.update(cyl=cyl, axis=biometry.get("k2_axis"))
        astig["toric"] = cyl >= cfg["rules"]["toric_threshold_d"]
        astig["borderline"] = not astig["toric"] and cyl >= cfg["rules"]["toric_consider_d"]
        if astig["toric"]:
            # Rough corneal-to-IOL-plane ratio; a toric calculator (with posterior cornea) decides the model.
            astig["iol_cyl_estimate"] = round_power(cyl * 1.46)
    residual = (astig["cyl"] or 0.0) if not astig["toric"] else 0.0

    # Not minding glasses softens the cost of "needs glasses" for an activity.
    floor = (3 - glasses_free) / 3 * 0.5
    beta = 0.04 + 0.08 * budget  # weight of affordability in the final score
    W = sum(a["hours"] * a["importance"] for a in acts)

    per: dict[str, dict[str, Any]] = {}
    for key, fam in families.items():
        rows = []
        for a in acts:
            lm = predicted_logmar(fam, a["distance_cm"], residual)
            status, u = verdict(lm, a["detail"])
            halos = a["night"] and fam["halo"] >= 0.2
            if a["night"]:
                u *= 1 - 0.5 * fam["halo"]
            u = max(u, floor) if status == "glasses" else u
            rows.append({"activity": a["id"], "logmar": lm, "snellen": snellen(lm), "status": status, "halos": halos, "utility": round(u, 3)})
        aff = fam["affordability"] - (0.1 if astig["toric"] else 0)
        per[key] = {"rows": rows, "aff": aff}

    n = len(families)
    avg_u = [sum(per[k]["rows"][i]["utility"] for k in families) / n for i in range(len(acts))]
    avg_aff = sum(per[k]["aff"] for k in families) / n
    baseline = (1 - beta) * sum(a["hours"] * a["importance"] * avg_u[i] for i, a in enumerate(acts)) / W + beta * avg_aff

    options = []
    for key, fam in families.items():
        rows, aff = per[key]["rows"], per[key]["aff"]
        contributions = []
        for i, a in enumerate(acts):
            c = (1 - beta) * a["hours"] * a["importance"] * (rows[i]["utility"] - avg_u[i]) / W
            contributions.append({"factor": a["id"], "label": a["label"], "value": round(c, 4), "status": rows[i]["status"], "halos": rows[i]["halos"]})
        contributions.append({"factor": "cost", "label": "Cost", "value": round(beta * (aff - avg_aff), 4), "status": None, "halos": False})
        score = baseline + sum(c["value"] for c in contributions)

        flags: list[dict[str, str]] = []
        adjustments: list[dict[str, Any]] = []
        excluded = False
        for cond in conditions:
            rule = fam.get("condition_rules", {}).get(cond)
            if not rule:
                continue
            if rule.get("exclude"):
                excluded = True
                flags.append({"level": "contraindicated", "text": rule["reason"]})
            else:
                score += rule["penalty"]
                adjustments.append({"value": rule["penalty"], "reason": rule["reason"]})
                flags.append({"level": "caution", "text": rule["reason"]})
        if any(r["halos"] for r in rows):
            flags.append({"level": "info", "text": "Night activities: halos and glare around lights are more noticeable with this design."})
        if residual >= 0.75:
            flags.append({"level": "info", "text": f"Borderline astigmatism ({astig['cyl']} D) left uncorrected: surgeon may consider a toric version."})

        power = None
        if biometry:
            k_avg = (biometry["k1"] + biometry["k2"]) / 2
            power = round_power(srkt(biometry["axial_length"], k_avg, fam["a_constant"], cfg["rules"]["target_refraction_d"]))

        hours_total = sum(a["hours"] for a in acts)
        hours_clear = sum(a["hours"] for a, r in zip(acts, rows) if r["status"] == "clear")
        toric = astig["toric"]
        options.append({
            "key": key + ("_toric" if toric else ""),
            "family": key,
            "name": fam["name"] + (" toric" if toric else ""),
            "toric": toric,
            "score": round(max(0.0, min(1.0, score)), 3),
            "baseline": round(baseline, 4),
            "contributions": sorted(contributions, key=lambda c: -abs(c["value"])),
            "adjustments": adjustments,
            "flags": flags,
            "excluded": excluded,
            "day_map": rows,
            "hours_clear": round(hours_clear, 2),
            "hours_total": round(hours_total, 2),
            "halo": fam["halo"],
            "cost_tier": fam["cost_tier"] + (1 if toric else 0),
            "glasses_after": fam["glasses_after"],
            "example_models": fam.get("example_models_toric" if toric else "example_models", ""),
            "a_constant": fam["a_constant"],
            "iol_power_d": power,
        })

    options.sort(key=lambda o: (o["excluded"], -o["score"]))
    return {
        "options": options,
        "activities": acts,
        "preferences": {"glasses_free": glasses_free, "budget": budget},
        "astigmatism": astig,
        "biometry_notes": biometry_notes(biometry, conditions),
        "conditions": conditions,
        "target_refraction_d": cfg["rules"]["target_refraction_d"],
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "disclaimer": "Decision support for the surgeon, not a diagnosis. Acuity predictions use illustrative defocus curves; IOL powers use SRK/T with example A-constants and must be confirmed on the biometer.",
    }


def curves() -> dict[str, Any]:
    """Defocus curves and halo levels for the web simulator and charts."""
    return {k: {"name": f["name"], "curve": f["defocus_curve"], "halo": f["halo"]} for k, f in clinic_config()["lens_families"].items()}
