"""Red-flag detection for post-operative messages, in Kannada, Hindi, Tamil and English.

Safety design
- Rules first, always: a deterministic multilingual lexicon runs on every patient
  message, in every channel, whether or not an LLM is configured.
- The LLM (if any) can only ADD or RAISE an alert, never clear one the rules found.
- Biased towards escalation: a false alarm costs a phone call; a miss can cost an eye.
- It never tells the patient what the problem is. It routes them to their doctor.
"""
from __future__ import annotations

import re
from typing import Any

from .. import llm

# category -> (severity, english whole-word/phrase patterns, indic/romanised substrings)
RULES: dict[str, tuple[str, list[str], list[str]]] = {
    "vision_loss": ("urgent",
        [r"can'?t see", r"cannot see", r"can not see", r"vision (is )?(getting )?worse", r"lost (my )?(vision|sight)", r"vision loss", r"went dark", r"everything (is )?dark", r"(sudden(ly)?|very) blur", r"see nothing", r"blind"],
        ["ಕಾಣುತ್ತಿಲ್ಲ", "ಕಾಣಿಸುತ್ತಿಲ್ಲ", "ಕಾಣ್ತಿಲ್ಲ", "ದೃಷ್ಟಿ ಕಡಿಮೆ", "ಕತ್ತಲು ಕವಿ", "ಏನೂ ಕಾಣ", "दिख नहीं", "दिखाई नहीं", "नज़र कम", "नजर कम", "कुछ नहीं दिख", "अंधेरा छा", "தெரியவில்லை", "தெரியல", "பார்வை குறை", "எதுவும் தெரிய", "இருட்டாக", "dikh nahi", "dikhai nahi", "kanta illa", "theriyala"]),
    "severe_pain": ("urgent",
        [r"severe pain", r"(a )?lot of pain", r"very pain", r"unbearable", r"terrible pain", r"pain (is )?(getting|got) worse", r"throbbing", r"worst pain"],
        ["ತುಂಬಾ ನೋವು", "ಅಸಹನೀಯ", "ಜೋರು ನೋವು", "ನೋವು ಹೆಚ್ಚಾ", "बहुत दर्द", "तेज़ दर्द", "तेज दर्द", "असहनीय", "दर्द बढ़", "கடுமையான வலி", "ரொம்ப வலி", "அதிக வலி", "வலி அதிகரி", "bahut dard", "romba vali"]),
    "discharge": ("urgent",
        [r"pus", r"discharge", r"sticky", r"yellow (stuff|fluid|discharge)", r"green (stuff|fluid|discharge)"],
        ["ಕೀವು", "ಪಿಸುರು", "ಹಳದಿ ನೀರು", "मवाद", "पीप", "कीचड़", "पीला पानी", "சீழ்", "பீளை", "மஞ்சள் நீர்"]),
    "retina": ("urgent",
        [r"flash(es|ing)?( of light)?", r"floaters?", r"curtain", r"shadow (over|across|in)", r"black spots?", r"cobweb"],
        ["ಮಿಂಚು", "ಪರದೆ", "ಕಪ್ಪು ಚುಕ್ಕೆ", "चमक", "पर्दा", "काले धब्बे", "काले धागे", "மின்னல்", "திரை போல", "கருப்பு புள்ளி"]),
    "pressure": ("urgent",
        [r"vomit(ing)?", r"nause(a|ous)", r"throwing up"],
        ["ವಾಂತಿ", "उल्टी", "जी मिचला", "வாந்தி", "குமட்டல்"]),
    "injury": ("urgent",
        [r"hit (my|the|in the) eye", r"injur(y|ed)", r"poked", r"fell (down|on)", r"something (went|fell) in"],
        ["ಪೆಟ್ಟು", "ಏಟು", "चोट", "ठोकर", "அடி பட்ட", "காயம்", "குத்தி"]),
    "pain": ("soon",
        [r"pain(ful)?", r"hurts?", r"ache", r"aching"],
        ["ನೋವು", "ನೋಯು", "दर्द", "दुख", "வலி", "dard", "vali", "novu"]),
    "redness": ("soon",
        [r"red(ness)?", r"blood(shot)?"],
        ["ಕೆಂಪು", "ಕೆಂಪಾ", "लाल", "लाली", "சிவப்பு", "சிவந்", "ரத்தம்"]),
    "blur": ("soon",
        [r"blur(ry|red)?", r"hazy", r"cloudy", r"foggy"],
        ["ಮಂಜು", "ಮಸುಕು", "धुंधला", "धुंधल", "மங்கல்", "மங்கலா"]),
    "headache": ("soon",
        [r"headache"],
        ["ತಲೆನೋವು", "ತಲೆ ನೋವು", "सिरदर्द", "सिर दर्द", "தலைவலி", "தலை வலி"]),
}
WORSENING = [r"worse", r"more and more", r"increas", r"sudden", r"suddenly", "ಹೆಚ್ಚಾ", "ಇದ್ದಕ್ಕಿದ್ದಂತೆ", "ಜಾಸ್ತಿ", "बढ़", "अचानक", "ज़्यादा", "ज्यादा", "அதிகரி", "திடீர்", "அதிகமா"]
NEGATION = re.compile(r"\b(no|not|never|without|don'?t have|doesn'?t)\b[^.?!]{0,20}$")
INDIC_NEG = ["ಇಲ್ಲ", "नहीं है", "नहीं हो", "இல்லை"]


def _find(text: str, en: list[str], kw: list[str]) -> list[str]:
    hits = []
    for pat in en:
        for m in re.finditer(r"(?<![a-z])" + pat + r"(?![a-z])", text):
            if not NEGATION.search(text[: m.start()]):
                hits.append(m.group(0))
                break
    for w in kw:
        i = text.find(w.lower())
        if i >= 0:
            tail = text[i + len(w): i + len(w) + 8]
            if not any(n in tail for n in INDIC_NEG) or any(n in w for n in ("नहीं", "illa", "ಇಲ್ಲ", "இல்லை")):
                hits.append(w)
    return hits


def detect_rules(text: str) -> dict[str, Any]:
    s = " " + text.lower() + " "
    found: dict[str, list[str]] = {}
    for cat, (_, en, kw) in RULES.items():
        h = _find(s, en, kw)
        if h:
            found[cat] = h
    worsening = any((re.search(p, s) if p.isascii() else p in s) for p in WORSENING)
    sevs = ["urgent" if (c in ("pain", "redness", "blur") and worsening) else RULES[c][0] for c in found]
    severity = "urgent" if "urgent" in sevs else ("soon" if sevs else None)
    if "pain" in found and "redness" in found:
        severity = "urgent"
    order = ["vision_loss", "retina", "discharge", "pressure", "injury", "severe_pain", "pain", "redness", "blur", "headache"]
    cats = sorted(found, key=order.index)
    return {"flag": bool(found), "severity": severity, "categories": cats, "matched": [w for c in cats for w in found[c]], "worsening": worsening, "source": "rules"}


LLM_SYSTEM = """You triage messages from patients recovering from cataract surgery.
Decide if the message describes a symptom that the clinic must know about.
urgent: vision getting worse, severe or increasing pain, increasing redness with pain, discharge/pus, flashes/floaters/curtain, vomiting with eye pain, eye injury.
soon: mild pain, redness, blurring, headache or anything else the doctor should review today.
none: questions or normal recovery talk.
Return JSON: {"severity":"urgent|soon|none","category":"short snake_case","patient_en":"English translation"}"""

RANK = {None: 0, "none": 0, "soon": 1, "urgent": 2}


def detect(text: str, *, use_llm: bool = True) -> dict[str, Any]:
    result = detect_rules(text)
    if use_llm and llm.enabled():
        try:
            data = llm.complete_json(LLM_SYSTEM, text, max_tokens=200)
            sev = data.get("severity")
            result["patient_en"] = data.get("patient_en")
            if RANK.get(sev, 0) > RANK.get(result["severity"], 0):
                result.update(flag=True, severity=sev, source="llm")
                if data.get("category"):
                    result["categories"] = [str(data["category"])[:40]] + result["categories"]
        except llm.LLMUnavailable:
            pass
    return result


def checkin(pain: int, vision: str, redness: str, day: int | None) -> dict[str, Any]:
    """Daily recovery check-in (tap answers). pain 0-3; vision better|same|worse; redness none|same|more."""
    cats, severity = [], None
    if vision == "worse":
        cats.append("vision_loss"); severity = "urgent"
    if pain >= 3:
        cats.append("severe_pain"); severity = "urgent"
    elif pain == 2:
        cats.append("pain"); severity = severity or "soon"
    if redness == "more":
        cats.append("redness")
        severity = "urgent" if pain >= 2 else (severity or "soon")
    if vision == "same" and day is not None and day >= 7 and severity is None:
        cats.append("slow_recovery"); severity = "soon"
    return {"flag": bool(cats), "severity": severity, "categories": cats}
