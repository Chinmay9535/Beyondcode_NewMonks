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


# Standard 6-metre Snellen lines used in Indian clinics, with their logMAR values.
SNELLEN_LINES = [("6/4", -0.18), ("6/5", -0.08), ("6/6", 0.0), ("6/7.5", 0.1), ("6/9", 0.18), ("6/12", 0.3), ("6/15", 0.4),
                 ("6/18", 0.48), ("6/24", 0.6), ("6/36", 0.78), ("6/60", 1.0)]


def snellen(logmar: float) -> str:
    """Nearest standard Snellen line (6/x), as written in Indian clinics."""
    if logmar > 1.05:
        return "<6/60"
    return min(SNELLEN_LINES, key=lambda s: abs(s[1] - logmar))[0]


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


EYES = ("right", "left")
OTHER = {"right": "left", "left": "right"}
ABBR = {"right": "OD", "left": "OS"}


def binocular(a: float, b: float) -> float:
    """Binocular acuity from two monocular logMARs: the better eye, plus a summation bonus
    (~0.04 logMAR) that fades as the eyes differ (as in monovision)."""
    return round(min(a, b) - 0.04 * max(0.0, 1 - abs(a - b) / 0.3), 3)


def eye_logmar(fam: dict[str, Any], target: float, distance_cm: float, residual_cyl: float = 0.0) -> float:
    # An eye left at refraction `target` (e.g. -1.25 D) is in focus at vergence = target,
    # so its defocus curve shifts by the target.
    return round(interp(fam["defocus_curve"], vergence(distance_cm) - target) + 0.15 * residual_cyl, 3)


def _astig(b: dict[str, Any] | None, rules: dict[str, Any]) -> dict[str, Any]:
    a: dict[str, Any] = {"cyl": None, "axis": None, "toric": False, "borderline": False}
    if b:
        cyl = round(abs(b["k2"] - b["k1"]), 2)
        a.update(cyl=cyl, axis=b.get("k2_axis"), toric=cyl >= rules["toric_threshold_d"])
        a["borderline"] = not a["toric"] and cyl >= rules["toric_consider_d"]
        if a["toric"]:
            # Rough corneal-to-IOL-plane ratio; a toric calculator (with posterior cornea) decides the model.
            a["iol_cyl_estimate"] = round_power(cyl * 1.46)
    a["residual"] = a["cyl"] if (a["cyl"] and not a["toric"] and a["borderline"]) else 0.0
    return a


def _plans(cfg: dict[str, Any], primary: str, dominant: str, fellow_status: str, fellow: dict[str, Any]) -> list[dict[str, Any]]:
    """Candidate plans. Each eye gets {family, target, fixed}. Fixed = already operated (or natural)."""
    plans = []
    non_dom = OTHER[dominant]
    if fellow_status == "planned":
        for st in cfg["strategies"]:
            plans.append({"key": st["key"], "name": st["name"], "blended": bool(st.get("blended")), "eyes": {
                dominant: {"family": st["families"][0], "target": st["targets"][0], "fixed": False},
                non_dom: {"family": st["families"][1], "target": st["targets"][1], "fixed": False}}})
        return plans
    # One eye to plan; the fellow eye is fixed.
    fel_eye = OTHER[primary]
    if fellow_status == "operated":
        fam = fellow.get("family") or "monofocal"
        fel_target = fellow.get("actual_se", fellow.get("target", 0.0)) or 0.0
    else:  # natural lens, not planned: behaves like a distance-corrected presbyopic eye
        fam, fel_target = "monofocal", 0.0
    fixed = {"family": fam, "target": float(fel_target), "fixed": True, "natural": fellow_status == "natural"}
    prefix = "Second eye: " if fellow_status == "operated" else ""
    seen = set()
    for st in cfg["strategies"]:
        famp = st["families"][0]
        # Blended options only make sense if the fellow eye sees well at distance.
        if st.get("blended"):
            if abs(fixed["target"]) > 0.75:
                continue
            tgt = st["targets"][1]
        else:
            tgt = 0.0
        if (famp, tgt) in seen:
            continue
        seen.add((famp, tgt))
        nm = cfg["lens_families"][famp]["name"] + (" set for near (blended with the other eye)" if tgt else " for distance")
        plans.append({"key": f"{st['key']}_single", "name": prefix + nm, "blended": tgt != 0, "eyes": {
            primary: {"family": famp, "target": tgt, "fixed": False}, fel_eye: fixed}})
    return plans


def rank(profile: dict[str, Any], biometry: dict[str, Any] | None, conditions: list[str], *, primary: str = "right",
         dominant: str | None = None, fellow_status: str = "planned", fellow: dict[str, Any] | None = None) -> dict[str, Any]:
    """Rank lens plans for the patient's day.

    biometry: either {"right": {...}|None, "left": {...}|None} or a single eye's dict (treated as `primary`).
    fellow_status: "planned" (both eyes need surgery), "operated" (fellow already has an IOL; pass
    fellow={"family", "actual_se", "predicted_se"}) or "natural" (fellow eye not for surgery).
    """
    cfg = clinic_config()
    rules = cfg["rules"]
    families: dict[str, Any] = cfg["lens_families"]
    profile = profile or {}
    fellow = fellow or {}
    acts = normalise_activities(profile)
    glasses_free = _level(profile.get("glasses_free"), 2)
    budget = _level(profile.get("budget"), 1)
    bio = biometry if (biometry and set(biometry) <= set(EYES)) else {primary: biometry, OTHER[primary]: None}
    dom = dominant if dominant in EYES else primary
    astig = {e: _astig(bio.get(e), rules) for e in EYES}

    # Second-eye refinement: adjust the planned eye's target by half the fellow eye's prediction error.
    refinement = None
    if fellow_status == "operated" and fellow.get("actual_se") is not None and fellow.get("predicted_se") is not None:
        pe = round(float(fellow["actual_se"]) - float(fellow["predicted_se"]), 2)
        adj = round(-rules["second_eye_adjustment"] * pe, 2)
        refinement = {"prediction_error": pe, "target_adjustment": adj,
                      "text": f"First eye ended at {float(fellow['actual_se']):+.2f} D vs. predicted {float(fellow['predicted_se']):+.2f} D "
                              f"(error {pe:+.2f} D). Second-eye power is calculated for a target shifted by {adj:+.2f} D "
                              f"(half the first-eye error, as in Covert 2010 and Jivrajka 2012)."}

    floor = (3 - glasses_free) / 3 * 0.5
    beta = 0.04 + 0.08 * budget
    W = sum(a["hours"] * a["importance"] for a in acts)
    plans = _plans(cfg, primary, dom, fellow_status, fellow)

    per = []
    for pl in plans:
        rows = []
        halo = max(families[e["family"]]["halo"] for e in pl["eyes"].values())
        for a in acts:
            lm = {e: eye_logmar(families[pl["eyes"][e]["family"]], pl["eyes"][e]["target"], a["distance_cm"], astig[e]["residual"] if not pl["eyes"][e]["fixed"] else 0.0) for e in EYES}
            b = binocular(lm["right"], lm["left"])
            status, u = verdict(b, a["detail"])
            halos = a["night"] and halo >= 0.2
            if a["night"]:
                u *= 1 - 0.5 * halo
            u = max(u, floor) if status == "glasses" else u
            rows.append({"activity": a["id"], "logmar": b, "snellen": snellen(b), "od": lm["right"], "os": lm["left"],
                         "status": status, "halos": halos, "utility": round(u, 3)})
        planned = [e for e in pl["eyes"].values() if not e["fixed"]]
        aff = sum(families[e["family"]]["affordability"] for e in planned) / len(planned)
        if any(astig[eye]["toric"] for eye, e in pl["eyes"].items() if not e["fixed"]):
            aff -= 0.1
        per.append({"rows": rows, "aff": aff, "halo": halo})

    n = len(plans)
    avg_u = [sum(p["rows"][i]["utility"] for p in per) / n for i in range(len(acts))]
    avg_aff = sum(p["aff"] for p in per) / n
    baseline = (1 - beta) * sum(a["hours"] * a["importance"] * avg_u[i] for i, a in enumerate(acts)) / W + beta * avg_aff

    options = []
    for pl, pp in zip(plans, per):
        rows, aff = pp["rows"], pp["aff"]
        contributions = []
        for i, a in enumerate(acts):
            c = (1 - beta) * a["hours"] * a["importance"] * (rows[i]["utility"] - avg_u[i]) / W
            contributions.append({"factor": a["id"], "label": a["label"], "value": round(c, 4), "status": rows[i]["status"], "halos": rows[i]["halos"]})
        contributions.append({"factor": "cost", "label": "Cost", "value": round(beta * (aff - avg_aff), 4), "status": None, "halos": False})
        score = baseline + sum(c["value"] for c in contributions)
        flags: list[dict[str, str]] = []
        adjustments: list[dict[str, Any]] = []
        excluded = False
        used = {e["family"] for e in pl["eyes"].values() if not e["fixed"]}
        for cond in conditions:
            worst = None
            for famk in used:
                rule = families[famk].get("condition_rules", {}).get(cond)
                if rule and (rule.get("exclude") or worst is None or (not worst.get("exclude") and rule["penalty"] < worst["penalty"])):
                    worst = rule if not (worst and worst.get("exclude")) else worst
            if not worst:
                continue
            if worst.get("exclude"):
                excluded = True
                flags.append({"level": "contraindicated", "text": worst["reason"]})
            else:
                score += worst["penalty"]
                adjustments.append({"value": worst["penalty"], "reason": worst["reason"]})
                flags.append({"level": "caution", "text": worst["reason"]})
        targets = [e["target"] for e in pl["eyes"].values()]
        aniso = round(abs(targets[0] - targets[1]), 2)
        if aniso >= 0.75:
            score -= rules["monovision_penalty"]
            adjustments.append({"value": -rules["monovision_penalty"], "reason": f"Eyes set {aniso:.2f} D apart: slightly less depth perception, needs adaptation"})
            flags.append({"level": "caution", "text": f"Eyes set {aniso:.2f} D apart. Confirm eye dominance and consider a contact-lens trial before committing."})
            if any(a["night"] and a["importance"] >= 3 for a in acts):
                score -= rules["monovision_night_penalty"]
                adjustments.append({"value": -rules["monovision_night_penalty"], "reason": "Important night driving: monovision lowers night contrast and depth cues"})
        if dominant not in EYES and pl["blended"]:
            flags.append({"level": "info", "text": "Eye dominance not recorded: assumed the operated eye is dominant."})
        if any(r["halos"] for r in rows):
            flags.append({"level": "info", "text": "Night activities: halos and glare around lights are more noticeable with this design."})
        for eye in EYES:
            if astig[eye]["residual"] and not pl["eyes"][eye]["fixed"]:
                flags.append({"level": "info", "text": f"{ABBR[eye]}: borderline astigmatism ({astig[eye]['cyl']} D) left uncorrected; consider toric."})

        eyes_out = {}
        for eye in EYES:
            e = pl["eyes"][eye]
            fam = families[e["family"]]
            toric = astig[eye]["toric"] and not e["fixed"]
            out = {"family": e["family"], "name": fam["name"] + (" toric" if toric else ""), "target": e["target"],
                   "fixed": e["fixed"], "toric": toric, "a_constant": fam["a_constant"], "iol_power_d": None, "refined": False}
            if e.get("natural"):
                out["name"] = "Natural lens (not for surgery)"
            elif e["fixed"]:
                out["name"] = f"{fam['name']} (already implanted)"
            b = bio.get(eye)
            if b and not e["fixed"]:
                tgt = e["target"] + (refinement["target_adjustment"] if refinement and eye == primary else 0.0)
                out["iol_power_d"] = round_power(srkt(b["axial_length"], (b["k1"] + b["k2"]) / 2, fam["a_constant"], tgt))
                out["refined"] = bool(refinement and eye == primary)
                out["power_target"] = round(tgt, 2)
            out["example_models"] = fam.get("example_models_toric" if toric else "example_models", "")
            eyes_out[eye] = out

        curve = []
        for i in range(19):
            v = round(0.5 - 0.25 * i, 2)
            m = [round(interp(families[pl["eyes"][e]["family"]]["defocus_curve"], v - pl["eyes"][e]["target"]), 3) for e in EYES]
            curve.append([v, binocular(m[0], m[1])])

        hours_total = sum(a["hours"] for a in acts)
        hours_clear = sum(a["hours"] for a, r in zip(acts, rows) if r["status"] == "clear")
        main = eyes_out[primary]
        cost = sum(families[e["family"]]["cost_tier"] + (1 if eyes_out[eye]["toric"] else 0) for eye, e in pl["eyes"].items() if not e["fixed"])
        glasses = sorted({families[e["family"]]["glasses_after"] for e in pl["eyes"].values() if not e["fixed"]})
        options.append({
            "key": pl["key"], "name": pl["name"], "strategy": "blended" if pl["blended"] else "bilateral" if fellow_status == "planned" else "single",
            "family": main["family"], "toric": any(eyes_out[e]["toric"] for e in EYES),
            "eyes": eyes_out, "anisometropia_d": aniso,
            "score": round(max(0.0, min(1.0, score)), 3), "baseline": round(baseline, 4),
            "contributions": sorted(contributions, key=lambda c: -abs(c["value"])),
            "adjustments": adjustments, "flags": flags, "excluded": excluded,
            "day_map": rows, "hours_clear": round(hours_clear, 2), "hours_total": round(hours_total, 2),
            "halo": pp["halo"], "binocular_curve": curve,
            "cost_tier": cost, "glasses_after": "; ".join(glasses),
            "example_models": " · ".join(sorted({eyes_out[e]["example_models"] for e in EYES if not eyes_out[e]["fixed"]})),
            "curve_sources": list(dict.fromkeys(s for e in pl["eyes"].values() for s in families[e["family"]].get("sources", []))),
            "a_constant": main["a_constant"], "iol_power_d": main["iol_power_d"],
        })

    options.sort(key=lambda o: (o["excluded"], -o["score"]))
    notes = []
    for eye in EYES:
        if bio.get(eye) or eye == primary:
            notes += [{**nt, "text": f"{ABBR[eye]}: {nt['text']}"} for nt in biometry_notes(bio.get(eye), conditions if eye == primary else [])]
    return {
        "options": options,
        "activities": acts,
        "preferences": {"glasses_free": glasses_free, "budget": budget},
        "primary_eye": primary, "dominant_eye": dominant if dominant in EYES else None,
        "fellow_status": fellow_status, "fellow": fellow or None, "refinement": refinement,
        "astigmatism": astig[primary], "astigmatism_by_eye": astig,
        "biometry_notes": notes,
        "conditions": conditions,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "disclaimer": "Decision support for the surgeon, not a diagnosis. Acuity predictions use illustrative defocus curves and a simple binocular model; IOL powers use SRK/T with example A-constants and must be confirmed on the biometer.",
    }


def curves() -> dict[str, Any]:
    """Defocus curves and halo levels for the web simulator and charts."""
    return {k: {"name": f["name"], "curve": f["defocus_curve"], "halo": f["halo"]} for k, f in clinic_config()["lens_families"].items()}
