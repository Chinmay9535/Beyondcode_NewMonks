"""Pre-surgery intake conversation: learn the patient's day, one topic at a time.

The flow is driven by code (which topic is still open), so the conversation can
never drift. Understanding the patient's words is done by:
- the LLM, when configured (extracts activities, translates for the surgeon), or
- a multilingual keyword lexicon (Kannada, Hindi, Tamil, English, romanised),
  which is also the safety net when the LLM is unavailable.
"""
from __future__ import annotations

import re
from typing import Any

from .. import i18n, llm

TOPICS = ["day", "near", "mid", "night", "glasses", "budget"]

# Activity templates. "kw" entries match as substrings (Indic words take suffixes);
# "en" entries match as whole words.
ACTIVITIES: dict[str, dict[str, Any]] = {
    "needle": {
        "label": {"en": "Threading needles and sewing", "kn": "ಸೂಜಿಗೆ ದಾರ ಪೋಣಿಸುವುದು, ಹೊಲಿಗೆ", "hi": "सुई में धागा डालना, सिलाई", "ta": "ஊசியில் நூல் கோர்ப்பது, தையல்"},
        "distance_cm": 33, "detail": "fine", "hours": 3, "importance": 3,
        "en": ["needle", "needles", "thread", "threading", "sew", "sewing", "stitch", "stitching", "tailor", "tailoring", "embroidery", "darji", "silai", "sui"],
        "kw": ["ಸೂಜಿ", "ದಾರ ಪೋಣಿ", "ಹೊಲಿ", "ಟೈಲರ್", "ದರ್ಜಿ", "सुई", "धागा", "सिलाई", "दर्जी", "कढ़ाई", "ஊசி", "நூல்", "தையல்", "தைக்க", "டெய்லர்"],
    },
    "reading": {
        "label": {"en": "Reading newspaper or books", "kn": "ಪತ್ರಿಕೆ, ಪುಸ್ತಕ ಓದುವುದು", "hi": "अखबार या किताब पढ़ना", "ta": "செய்தித்தாள், புத்தகம் படிப்பது"},
        "distance_cm": 40, "detail": "normal", "hours": 1, "importance": 2,
        "en": ["read", "reading", "newspaper", "newspapers", "book", "books", "magazine", "akhbar", "padh", "padhna"],
        "kw": ["ಓದು", "ಓದುತ್ತ", "ಪತ್ರಿಕೆ", "ಪುಸ್ತಕ", "ಪೇಪರ್", "पढ़", "पढ", "अखबार", "अख़बार", "किताब", "पेपर", "படிப்ப", "படிக்க", "செய்தித்தாள்", "புத்தக", "பேப்பர்"],
    },
    "phone": {
        "label": {"en": "Phone and WhatsApp", "kn": "ಫೋನ್ ಮತ್ತು ವಾಟ್ಸಾಪ್", "hi": "फ़ोन और व्हाट्सएप", "ta": "போன் மற்றும் வாட்ஸ்அப்"},
        "distance_cm": 40, "detail": "normal", "hours": 1.5, "importance": 2,
        "en": ["phone", "mobile", "whatsapp", "youtube", "smartphone", "cellphone"],
        "kw": ["ಫೋನ್", "ಮೊಬೈಲ್", "ವಾಟ್ಸಾಪ್", "फ़ोन", "फोन", "मोबाइल", "व्हाट्सएप", "व्हाट्सऐप", "போன்", "மொபைல்", "வாட்ஸ்அப்"],
    },
    "computer": {
        "label": {"en": "Computer work", "kn": "ಕಂಪ್ಯೂಟರ್ ಕೆಲಸ", "hi": "कंप्यूटर पर काम", "ta": "கணினி வேலை"},
        "distance_cm": 66, "detail": "normal", "hours": 4, "importance": 3,
        "en": ["computer", "laptop", "desktop", "screen", "typing", "software", "office"],
        "kw": ["ಕಂಪ್ಯೂಟರ್", "ಲ್ಯಾಪ್", "ಆಫೀಸ್", "कंप्यूटर", "कम्प्यूटर", "लैपटॉप", "ऑफ़िस", "ऑफिस", "கணினி", "கம்ப்யூட்டர்", "லேப்டாப்", "ஆபீஸ்"],
    },
    "cooking": {
        "label": {"en": "Cooking", "kn": "ಅಡುಗೆ", "hi": "खाना बनाना", "ta": "சமையல்"},
        "distance_cm": 60, "detail": "coarse", "hours": 2, "importance": 2,
        "en": ["cook", "cooking", "kitchen", "khana"],
        "kw": ["ಅಡುಗೆ", "ಅಡಿಗೆ", "खाना बना", "रसोई", "சமை", "சமையல்"],
    },
    "shop": {
        "label": {"en": "Shop counter and accounts", "kn": "ಅಂಗಡಿ ಮತ್ತು ಲೆಕ್ಕ", "hi": "दुकान और हिसाब", "ta": "கடை மற்றும் கணக்கு"},
        "distance_cm": 50, "detail": "normal", "hours": 4, "importance": 3,
        "en": ["shop", "shopkeeper", "store", "accounts", "billing", "ledger", "cashier", "dukaan", "dukan", "hisab"],
        "kw": ["ಅಂಗಡಿ", "ಲೆಕ್ಕ", "दुकान", "हिसाब", "கடை ", "கடையில்", "கடைக்கு", "கணக்கு"],
    },
    "tv": {
        "label": {"en": "Watching TV", "kn": "ಟಿವಿ ನೋಡುವುದು", "hi": "टीवी देखना", "ta": "டிவி பார்ப்பது"},
        "distance_cm": 300, "detail": "coarse", "hours": 2, "importance": 1,
        "en": ["tv", "television", "serial", "serials", "movie", "movies", "cricket match"],
        "kw": ["ಟಿವಿ", "ಟೀವಿ", "ಧಾರಾವಾಹಿ", "टीवी", "सीरियल", "டிவி", "டீவி", "சீரியல்"],
    },
    "farming": {
        "label": {"en": "Field work", "kn": "ಹೊಲದ ಕೆಲಸ", "hi": "खेत का काम", "ta": "வயல் வேலை"},
        "distance_cm": 600, "detail": "coarse", "hours": 6, "importance": 3,
        "en": ["farm", "farmer", "farming", "field", "fields", "crops", "kheti"],
        "kw": ["ಹೊಲದ", "ಹೊಲಕ್ಕೆ", "ಗದ್ದೆ", "ಕೃಷಿ", "ರೈತ", "खेत", "किसान", "வயல்", "விவசாய"],
    },
    "walking": {
        "label": {"en": "Walking and going out", "kn": "ನಡಿಗೆ, ಹೊರಗೆ ಹೋಗುವುದು", "hi": "टहलना और बाहर जाना", "ta": "நடைப்பயிற்சி, வெளியே செல்வது"},
        "distance_cm": 600, "detail": "coarse", "hours": 1, "importance": 2,
        "en": ["walk", "walking", "temple", "market", "garden", "gardening"],
        "kw": ["ನಡಿಗೆ", "ವಾಕ್", "ದೇವಸ್ಥಾನ", "ಮಾರುಕಟ್ಟೆ", "टहल", "मंदिर", "बाज़ार", "बाजार", "நடை", "கோவில்", "கோயில்", "சந்தை"],
    },
    "night_drive": {
        "label": {"en": "Driving or riding at night", "kn": "ರಾತ್ರಿ ವಾಹನ ಚಾಲನೆ", "hi": "रात में गाड़ी चलाना", "ta": "இரவில் வாகனம் ஓட்டுதல்"},
        "distance_cm": 600, "detail": "normal", "night": True, "hours": 1, "importance": 3,
        "en": [], "kw": [],
    },
    "day_drive": {
        "label": {"en": "Driving or riding in the day", "kn": "ಹಗಲು ವಾಹನ ಚಾಲನೆ", "hi": "दिन में गाड़ी चलाना", "ta": "பகலில் வாகனம் ஓட்டுதல்"},
        "distance_cm": 600, "detail": "normal", "hours": 1, "importance": 3,
        "en": [], "kw": [],
    },
}

VEHICLE_EN = ["drive", "driving", "drives", "ride", "riding", "rides", "scooter", "bike", "motorbike", "car", "auto", "rickshaw", "truck", "lorry", "driver", "gaadi", "gadi"]
VEHICLE_KW = ["ಸ್ಕೂಟರ್", "ಬೈಕ್", "ಕಾರು", "ಓಡಿಸ", "ಗಾಡಿ", "ವಾಹನ", "ಚಾಲಕ", "ಆಟೋ", "ಲಾರಿ", "गाड़ी", "गाडी", "स्कूटर", "बाइक", "कार ", "कार चला", "ऑटो", "रिक्शा", "चलाता", "चलाती", "सवारी", "ड्राइव", "ड्राइवर", "ट्रक", "ஸ்கூட்டர்", "பைக்", "கார்", "ஆட்டோ", "ஓட்ட", "வண்டி", "வாகன", "டிரைவர்", "லாரி"]
NIGHT_EN = ["night", "nights", "dark", "evening", "evenings", "late", "raat"]
NIGHT_KW = ["ರಾತ್ರಿ", "ಸಂಜೆ", "ಕತ್ತಲ", "रात", "शाम", "अंधेर", "இரவு", "மாலை", "இருட்"]

NEGATION_EN = ["no", "not", "don't", "dont", "never", "nothing", "nahi", "nahin", "illa", "illai"]
NEGATION_KW = ["ಇಲ್ಲ", "ಬೇಡ", "नहीं", "नही", "இல்லை", "வேண்டாம்"]

ALL_DAY_EN = ["all day", "whole day", "full day", "entire day"]
ALL_DAY_KW = ["ದಿನವಿಡೀ", "ಇಡೀ ದಿನ", "ದಿನಪೂರ್ತಿ", "ದಿನ ಪೂರ್ತಿ", "पूरा दिन", "पूरे दिन", "दिन भर", "दिनभर", "நாள் முழுவதும்", "நாள் முழுக்க", "முழு நாள்"]
SOMETIMES_EN = ["sometimes", "occasionally", "rarely", "once in a while"]
SOMETIMES_KW = ["ಕೆಲವೊಮ್ಮೆ", "ಆಗಾಗ", "कभी-कभी", "कभी कभी", "சில நேரம்", "எப்போதாவது", "kabhi"]
HOURS_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(?:hours?|hrs?|h\b|ಗಂಟೆ|घंटे|घंटा|மணி|ghante|ganta)", re.I)

OCCUPATIONS = {
    "tailor": (["tailor", "darji"], ["ಟೈಲರ್", "ದರ್ಜಿ", "दर्जी", "टेलर", "டெய்லர்", "தையல்காரர்"], {"needle": 6}),
    "driver": (["driver", "auto driver", "cab driver"], ["ಚಾಲಕ", "ಡ್ರೈವರ್", "ಆಟೋ ಓಡಿಸ", "ड्राइवर", "ऑटो चला", "टैक्सी चला", "டிரைவர்", "ஓட்டுநர்", "ஆட்டோ ஓட்ட"], {"day_drive": 6}),
    "office": (["software", "office", "engineer", "clerk", "accountant", "bank"], ["ಆಫೀಸ್", "ಇಂಜಿನಿಯರ್", "ಬ್ಯಾಂಕ್", "ऑफिस", "ऑफ़िस", "इंजीनियर", "बैंक", "ஆபீஸ்", "இன்ஜினியர்", "வங்கி"], {"computer": 6}),
    "farmer": (["farmer"], ["ರೈತ", "किसान", "விவசாயி"], {"farming": 6}),
    "shopkeeper": (["shopkeeper", "merchant", "business"], ["ಅಂಗಡಿ", "ವ್ಯಾಪಾರ", "दुकानदार", "व्यापार", "கடை", "வியாபார"], {"shop": 6}),
    "homemaker": (["homemaker", "housewife", "home maker"], ["ಗೃಹಿಣಿ", "ಮನೆಕೆಲಸ", "गृहिणी", "घर का काम", "இல்லத்தரசி", "வீட்டு வேலை"], {"cooking": 3}),
    "teacher": (["teacher", "professor", "lecturer"], ["ಶಿಕ್ಷಕ", "ಮೇಷ್ಟ್ರು", "शिक्षक", "टीचर", "ஆசிரியர்"], {"reading": 3}),
}


def _norm(text: str) -> str:
    return " " + re.sub(r"\s+", " ", text.lower()).strip() + " "


def _has_en(text: str, words: list[str]) -> bool:
    return any(re.search(r"(?<![a-z])" + re.escape(w) + r"(?![a-z])", text) for w in words)


def _has_kw(text: str, words: list[str]) -> bool:
    return any(w.lower() in text for w in words)


def _hit(text: str, en: list[str], kw: list[str]) -> bool:
    return _has_en(text, en) or _has_kw(text, kw)


def make_activity(key: str, lang: str, **over) -> dict[str, Any]:
    tpl = ACTIVITIES[key]
    a = {
        "id": key, "label": tpl["label"]["en"], "label_local": tpl["label"].get(lang, tpl["label"]["en"]),
        "distance_cm": tpl["distance_cm"], "detail": tpl["detail"], "night": tpl.get("night", False),
        "hours": tpl["hours"], "importance": tpl["importance"],
    }
    a.update({k: v for k, v in over.items() if v is not None})
    return a


def extract_offline(text: str, topic: str, lang: str, choice: str | None = None) -> dict[str, Any]:
    """Keyword-based understanding. Returns {activities, glasses_free?, budget?, occupation?, negative}."""
    s = _norm(text)
    out: dict[str, Any] = {"activities": [], "negative": False}
    negative = _hit(s, NEGATION_EN, NEGATION_KW)

    # Fixed-scale topics: quick-reply chip value, or words.
    if topic == "glasses":
        v = choice
        if not v:
            if _hit(s, ["no glasses", "without glasses", "don't want glasses", "free of glasses", "glasses free"], ["ಕನ್ನಡಕ ಬೇಡ", "ಕನ್ನಡಕ ಇಲ್ಲದೆ", "चश्मा नहीं", "चश्मे के बिना", "बिना चश्मे", "கண்ணாடி வேண்டாம்", "கண்ணாடி இல்லாமல்"]):
                v = "very"
            elif _hit(s, ["don't mind", "dont mind", "no problem", "fine with glasses", "okay with glasses"], ["ಪರವಾಗಿಲ್ಲ", "ಅಡ್ಡಿಯಿಲ್ಲ", "चलेगा", "कोई बात नहीं", "दिक्कत नहीं", "பரவாயில்லை"]):
                v = "dont_mind"
            elif _hit(s, ["yes", "very", "definitely", "important", "haan"], ["ಹೌದು", "ತುಂಬಾ", "हाँ", "हां", "बहुत", "ஆம்", "மிக"]):
                v = "very"
            elif negative:
                v = "dont_mind"
            else:
                v = "somewhat"
        out["glasses_free"] = {"very": 3, "somewhat": 2, "dont_mind": 0.5}.get(v, 2)
        if choice:
            return out
    if topic == "budget":
        v = choice or ("low" if _hit(s, ["low", "cheap", "less", "kam"], ["ಕಡಿಮೆ", "कम", "सस्ता", "குறைந்த", "மலிவு"]) else "all" if _hit(s, ["all", "every", "best"], ["ಎಲ್ಲಾ", "सभी", "सब", "எல்லா"]) else "balanced")
        out["budget"] = {"all": 0.5, "balanced": 1.5, "low": 3}.get(v, 1.5)
        if choice:
            return out

    hours = None
    m = HOURS_RE.search(text)
    if m:
        hours = float(m.group(1).replace(",", "."))
    elif _hit(s, ALL_DAY_EN, ALL_DAY_KW):
        hours = 7.0
    elif _hit(s, SOMETIMES_EN, SOMETIMES_KW):
        hours = 0.5

    # Occupation sets sensible default hours for its main activity.
    occ_hours: dict[str, float] = {}
    for occ, (en, kw, acts) in OCCUPATIONS.items():
        if _hit(s, en, kw):
            out["occupation"] = occ
            occ_hours.update(acts)

    found: list[str] = []
    for key, tpl in ACTIVITIES.items():
        if tpl["en"] or tpl["kw"]:
            if _hit(s, tpl["en"], tpl["kw"]) or key in occ_hours:
                found.append(key)
    vehicle = _hit(s, VEHICLE_EN, VEHICLE_KW)
    night = _hit(s, NIGHT_EN, NIGHT_KW)
    if topic == "night":
        if choice in ("often", "sometimes") or (vehicle and not negative) or (not choice and not negative and _hit(s, ["yes", "haan"], ["ಹೌದು", "ಹೂಂ", "हाँ", "हां", "ஆம்", "ஆமா"])):
            found.append("night_drive")
            occ_hours["night_drive"] = 0.5 if choice == "sometimes" else 1.5
    elif vehicle:
        found.append("night_drive" if night else "day_drive")
        if night and "day_drive" in occ_hours:
            found.append("day_drive")

    for key in dict.fromkeys(found):
        h = occ_hours.get(key)
        if hours is not None and len(found) == 1:
            h = hours
        out["activities"].append(make_activity(key, lang, hours=h))
    out["negative"] = negative and not out["activities"]
    return out


LLM_SYSTEM = """You help an eye clinic understand a cataract patient's daily visual tasks.
The patient answers in {lang_name}. Current question topic: {topic}.
Extract ONLY what the patient said. Return JSON:
{{"activities":[{{"id":"short_snake_case","label":"English label","label_local":"label in {lang_name}",
"distance_cm":number (33 needle/fine work, 40 reading/phone, 50-70 computer/cooking/counter, 300 TV, 600 driving/outdoors),
"detail":"fine|normal|coarse","night":bool,"hours":number per day,"importance":1-3,"quote":"patient's words"}}],
"glasses_free":null or 0-3 (3 = strongly wants no glasses),"budget":null or 0-3 (3 = cost matters a lot),
"occupation":null or string,"patient_en":"English translation of the patient's message",
"ack_local":"one short warm sentence in {lang_name} reflecting back what you understood (no medical advice, no lens advice, no question)",
"ack_en":"same sentence in English"}}
Use these ids when they fit: needle, reading, phone, computer, cooking, shop, tv, farming, walking, night_drive, day_drive."""

LANG_NAMES = {"kn": "Kannada", "hi": "Hindi", "ta": "Tamil", "en": "English"}


def extract_llm(text: str, topic: str, lang: str, choice: str | None) -> dict[str, Any]:
    user = f"Patient said: {text}" + (f"\n(Tapped option: {choice})" if choice else "")
    data = llm.complete_json(LLM_SYSTEM.format(lang_name=LANG_NAMES.get(lang, "English"), topic=topic), user)
    acts = []
    for a in data.get("activities") or []:
        if isinstance(a, dict) and a.get("label"):
            acts.append({
                "id": str(a.get("id") or "activity")[:40], "label": str(a["label"])[:80],
                "label_local": str(a.get("label_local") or a["label"])[:80],
                "distance_cm": float(a.get("distance_cm") or 600), "detail": a.get("detail") if a.get("detail") in ("fine", "normal", "coarse") else "normal",
                "night": bool(a.get("night")), "hours": float(a.get("hours") or 1), "importance": float(a.get("importance") or 2),
                "quote": a.get("quote"),
            })
    out: dict[str, Any] = {"activities": acts, "negative": not acts, "patient_en": data.get("patient_en"),
                           "ack_local": data.get("ack_local"), "ack_en": data.get("ack_en"), "occupation": data.get("occupation")}
    for k in ("glasses_free", "budget"):
        if isinstance(data.get(k), (int, float)):
            out[k] = float(data[k])
    return out


def merge(profile: dict[str, Any], ext: dict[str, Any], quote: str) -> dict[str, Any]:
    p = dict(profile or {})
    acts = {a["id"]: a for a in p.get("activities", [])}
    for a in ext.get("activities", []):
        a = dict(a)
        a.setdefault("quote", quote)
        if a["id"] in acts:
            prev = acts[a["id"]]
            prev["hours"] = max(prev.get("hours", 0), a.get("hours", 0))
            prev["importance"] = max(prev.get("importance", 0), a.get("importance", 0))
        else:
            acts[a["id"]] = a
    p["activities"] = list(acts.values())
    for k in ("glasses_free", "budget", "occupation"):
        if ext.get(k) is not None:
            p[k] = ext[k]
    return p


def covered(profile: dict[str, Any]) -> set[str]:
    done = set(profile.get("asked", []))
    for a in profile.get("activities", []):
        d = a.get("distance_cm", 600)
        if d <= 45:
            done.add("near")
        elif d <= 100:
            done.add("mid")
        if a.get("night"):
            done.add("night")
    if profile.get("glasses_free") is not None:
        done.add("glasses")
    if profile.get("budget") is not None:
        done.add("budget")
    return done


def next_topic(profile: dict[str, Any]) -> str | None:
    c = covered(profile)
    return next((t for t in TOPICS if t not in c), None)


def question(topic: str, lang: str, name: str) -> dict[str, Any]:
    return {
        "topic": topic,
        "text": i18n.t("q_" + topic, lang, name=name),
        "text_en": i18n.t("q_" + topic, "en", name=name),
        "options": i18n.options(topic, lang),
    }


def step(profile: dict[str, Any], text: str, lang: str, name: str, doctor: str, choice: str | None = None, use_llm: bool = True) -> dict[str, Any]:
    """Process one patient answer. Returns the updated profile and the assistant's reply."""
    topic = profile.get("current_topic") or next_topic(profile) or "day"
    ext = None
    mode = "offline"
    if use_llm and llm.enabled() and not choice:
        try:
            ext = extract_llm(text, topic, lang, choice)
            mode = "llm"
        except llm.LLMUnavailable:
            ext = None
    if ext is None:
        ext = extract_offline(text, topic, lang, choice)

    profile = merge(profile, ext, text)
    profile["asked"] = sorted(set(profile.get("asked", [])) | {topic})

    if ext.get("ack_local"):
        ack, ack_en = ext["ack_local"], ext.get("ack_en") or ext["ack_local"]
    elif ext["activities"]:
        ack = i18n.t("heard", lang, items=", ".join(a.get("label_local") or a["label"] for a in ext["activities"]))
        ack_en = i18n.t("heard", "en", items=", ".join(a["label"] for a in ext["activities"]))
    else:
        ack, ack_en = i18n.t("thanks", lang), i18n.t("thanks", "en")

    nxt = next_topic(profile)
    profile["current_topic"] = nxt
    if nxt is None:
        if not ext["activities"] and not ext.get("ack_local"):
            ack = ack_en = ""  # the closing message already thanks the patient
        reply = {"topic": None, "text": (ack + " " + i18n.t("done", lang, name=name, doctor=doctor)).strip(),
                 "text_en": (ack_en + " " + i18n.t("done", "en", name=name, doctor=doctor)).strip(), "options": []}
    else:
        q = question(nxt, lang, name)
        reply = {**q, "text": ack + " " + q["text"], "text_en": ack_en + " " + q["text_en"]}
    return {"profile": profile, "reply": reply, "done": nxt is None, "patient_en": ext.get("patient_en"), "mode": mode, "extracted": ext}
