"""Red-flag detection for post-operative messages: Kannada, Hindi, Tamil, English and
romanised/code-mixed typing ("aankh lal hai", "kannu tumba novu").

Safety design
- Rules first, always: a deterministic lexicon runs on every patient message, in every
  channel, whether or not an LLM is configured. Its accuracy is measured by the safety
  scorecard (services/evaluation.py, cases in backend/evals/).
- The LLM (if any) can only ADD or RAISE an alert, never clear one the rules found.
- Biased towards escalation: a false alarm costs a phone call; a miss can cost an eye.
- It never tells the patient what the problem is. It routes them to their doctor.

How matching works (rather than listing whole sentences)
- Indic terms match by stem (textnorm.stem), so suffixes do not break them.
- Severity is compositional: a symptom + an intensity/worsening word -> urgent;
  pain + redness -> urgent; some symptoms are urgent on their own.
- "Cannot see" is detected as a seeing-verb with a negation, per language grammar.
- Negation ("no pain", "ನೋವು ಇಲ್ಲ", "दर्द नहीं", "வலி இல்லை") is checked within the clause.
"""
from __future__ import annotations

import re
from typing import Any

from .. import llm
from ..textnorm import clause_after, clause_before, contains, norm

# term lists: English/romanised entries are regexes on word boundaries; Indic entries match by stem.
SYMPTOMS: dict[str, dict[str, Any]] = {
    "vision_loss": {"severity": "urgent", "inherent_negation": True, "terms": [
        r"can'?t see", r"cannot see", r"can not see", r"unable to see", r"not able to see(?! clearly| properly| well)", r"see nothing",
        r"(went|gone|going|everything is|everything) dark", r"lost (my )?(vision|sight)", r"vision loss", r"blind\w*", r"black(ed)? out",
        r"vision (is |has )?(getting |become |gone |got )?(worse|down|reduced|decreased)", r"(decrease|drop|reduction|fall|loss) (in|of) (my )?(vision|sight)",
        r"worse vision", r"vision dropped",
        "ದೃಷ್ಟಿ ಕಡಿಮೆ", "ಏನೂ ಕಾಣ", "ಕತ್ತಲು ಕವಿ", "ಎಲ್ಲಾ ಕತ್ತಲು", "ದೃಷ್ಟಿ ಹೋಗಿದೆ",
        "नज़र कम", "नजर कम", "दिखना कम", "कम दिख", "कम दिखाई", "ಕಡಿಮೆ ಕಾಣ", "குறைவா தெரி", "குறைவாக தெரி", r"kam dikh\w*", r"see less", r"seeing less", "रोशनी कम", "रोशनी चली", "अंधेरा छा", "कुछ नहीं दिख", "दिखना बंद", "दिखाई देना बंद",
        "பார்வை குறை", "எதுவும் தெரிய", "ஒன்றும் தெரிய", "ஒன்னும் தெரிய", "இருட்டாக", "பார்வை போய்",
        r"nazar kam", r"dikhna band", r"onnum theriyala", r"kaanthilla", r"kanthilla", r"kaanisthilla", r"kaanstilla", r"kanstilla", r"kanta illa",
    ]},
    "retina": {"severity": "urgent", "terms": [
        r"flash(es|ing)?( of light)?", r"floaters?", r"curtain", r"shadow (over|across|in|on)", r"(black|dark) (spots?|dots?)", r"cobwebs?",
        "ಮಿಂಚು", "ಪರದೆ", "ಕಪ್ಪು ಚುಕ್ಕೆ", "चमक", "पर्दा", "परदा", "काले धब्बे", "काला धब्बा", "काले धागे", "काले बिंदु",
        "மின்னல்", "திரை போல", "திரை மாதிரி", "திரை வந்த", "கருப்பு புள்ளி", r"chamak", r"parda", r"minchu", r"minnal",
    ]},
    "discharge": {"severity": "urgent", "terms": [
        r"pus\w*", r"discharge", r"sticky", r"(yellow|green)(ish)? (stuff|fluid|discharge|water|liquid)",
        "ಕೀವು", "ಪಿಸುರು", "ಹಳದಿ ನೀರು", "मवाद", "पीप", "कीचड़", "पीला पानी", "சீழ்", "பீளை", "மஞ்சள் நீர்",
        r"peep", r"kivu", r"keevu", r"seezh", r"seel", r"peela paani",
    ]},
    "pressure": {"severity": "urgent", "terms": [
        r"vomit\w*", r"nause\w*", r"throw(ing)? up", r"threw up", r"feel(ing)? sick",
        "ವಾಂತಿ", "उल्टी", "उलटी", "जी मिचला", "मतली", "வாந்தி", "குமட்டல்", r"ulti", r"vanti", r"vaanti", r"vaandhi",
    ]},
    "injury": {"severity": "urgent", "terms": [
        r"hit (my|the|in the|on the|near)", r"\w+ hit my eye", r"injur\w*", r"poked", r"fell\b", r"struck", r"bumped",
        r"something (went|fell|got) in",
        "ಪೆಟ್ಟು", "ಏಟು", "ಕೆಳಗೆ ಬಿದ್ದ", "चोट", "ठोकर", "गिर गया", "गिर गई", "गिर पड़", "அடிபட்ட", "அடி பட்ட", "காயம்", "குத்தி", "கீழே விழு",
        r"chot", r"pettu",
    ]},
    "unclear_vision": {"severity": "soon", "inherent_negation": True, "terms": [
        r"(can'?t|cannot|can not|not able to|unable to|could ?n'?t) see (clearly|properly|well|clear)",
        r"(not|isn'?t) (seeing )?clear(ly)?",
    ]},
    "pain": {"severity": "soon", "terms": [
        r"pain\w*", r"hurts?", r"hurting", r"ach(e|es|ing)", r"sore", r"throbb\w*",
        "ನೋವು", "ನೋಯು", "दर्द", "दुख रही", "दुख रहा", "दुखती", "வலி", "வலிக்",
        r"dard", r"novu", r"novvu", r"vali", r"valikk\w*", r"valikudhu",
    ]},
    "redness": {"severity": "soon", "terms": [
        r"red(ness)?", r"bloodshot", r"blood(?! (pressure|sugar|test|report))",
        "ಕೆಂಪು", "लाल", "लाली", "लालिमा", "சிவப்பு", "சிவந்", "ரத்தம்",
        r"lal", r"laal", r"kempu", r"kempa\w*", r"sivappu", r"sivappa\w*", r"sivandhu",
    ]},
    "blur": {"severity": "soon", "terms": [
        r"blur\w*", r"hazy", r"cloudy", r"foggy", r"misty",
        "ಮಂಜು", "ಮಸುಕು", "ಮಬ್ಬು", "धुंधला", "धुंधली", "धुंधल", "மங்கல்", "மங்கலா", "தெளிவா தெரிய",
        r"dhundhla", r"dhundla", r"dhundhli", r"manju", r"mangala",
    ]},
    "headache": {"severity": "soon", "terms": [
        r"headache", "ತಲೆನೋವು", "ತಲೆ ನೋವು", "सिरदर्द", "सिर दर्द", "सिर में दर्द", "தலைவலி", "தலை வலி", r"sar ?dard", r"tale ?novu", r"thalai ?vali",
    ]},
}

# "vision ... reduced" with words in between ("பார்வை திடீரென்று குறைந்தது", "नज़र धीरे-धीरे कम हो रही").
VISION_WORDS = ["vision", "sight", "eyesight", "ದೃಷ್ಟಿ", "ನೋಟ", "नज़र", "नजर", "दृष्टि", "रोशनी", "பார்வை", r"nazar", r"drishti", r"paarvai", r"parvai"]
REDUCED_WORDS = [r"reduc\w*", r"decreas\w*", r"dropp?\w*", r"worse\w*", r"down", r"gone", r"lost",
                 "ಕಡಿಮೆ", "ಹೋಗ", "कम", "घट", "चली", "குறை", "போய", r"kam", r"kammi", r"korai", r"kurai"]


IMPROVING = [r"better", r"improv\w*", r"clearer", r"less blur\w*", r"good", "ಉತ್ತಮ", "ಸುಧಾರ", "ಚೆನ್ನಾಗಿ", "बेहतर", "सुधार", "अच्छी", "पहले से साफ", "நன்றா", "நல்லா", "மேம்பட", r"accha", r"chennagi", r"nalla"]


def _vision_reduced(text: str) -> str | None:
    for v in VISION_WORDS:
        i = contains(text, v)
        if i < 0:
            continue
        clause = clause_after(text, i, len(v), limit=40)
        window = " " + clause + " "
        if any(contains(window, w) >= 0 for w in IMPROVING):
            continue  # "vision is better / less blurry than yesterday"
        if any(contains(window, r) >= 0 for r in REDUCED_WORDS):
            return (text[i:i + len(v)] + " … " + clause.strip())[:60]
    return None


# Negated seeing, per language grammar: Kannada/Tamil fuse the negation into the verb.
NEG_SEEING = [
    re.compile(r"ಕಾಣ\S*ಲ್ಲ|ಕಾಣಿಸ\S*ಲ್ಲ"),
    re.compile(r"தெரி(யல|யலை|யல்ல|யவில்லை|யாது|வில்லை)"),
    re.compile(r"(दिख|दिखाई|दिखता|दिखती)\S*\s+(नहीं|नही|बंद)|(नहीं|नही)\s+(दिख|दिखाई)"),
    re.compile(r"(dikh|dikhai|dikhta|dikhti)\w*\s+(nahi|nahin|band)|nahi\s+dikh"),
    re.compile(r"theriya(la|lai|villai)"),
]
SEE_QUALIFIER = re.compile(r"(clearly|properly|well|clear|ಸರಿಯಾಗಿ|ಸ್ಪಷ್ಟ|साफ़|साफ|ठीक से|தெளிவா|சரியா|saaf|sariyaagi|theliva)")

INTENSITY = [
    r"very", r"severe\w*", r"(a )?lot", r"terrible", r"unbearable", r"worst", r"badly", r"extreme\w*", r"intense",
    r"can'?t (bear|tolerate|stand)", r"too much",
    "ತುಂಬಾ", "ಜೋರು", "ಜಾಸ್ತಿ", "ಅಸಹನೀಯ", "ತಡೆಯಲಾಗ", "ಸಹಿಸಲಾಗ",
    "बहुत", "तेज़", "तेज", "असहनीय", "बर्दाश्त नहीं", "सहन नहीं",
    "ரொம்ப", "அதிக", "கடுமை", "தாங்க முடிய", "தாங்க முடியல",
    r"bahut", r"bohot", r"tez", r"zyada", r"jyada", r"tumba", r"thumba", r"jaasti", r"jasti", r"romba", r"adhigam", r"tanga mudiyala",
]
WORSENING = [
    r"worse\w*", r"worsen\w*", r"increas\w*", r"more and more", r"sudden\w*", r"day by day", r"getting bad",
    "ಹೆಚ್ಚಾ", "ಜಾಸ್ತಿ ಆಗ", "ಇದ್ದಕ್ಕಿದ್ದಂತೆ", "ದಿನೇ ದಿನೇ", "बढ़", "बढ", "अचानक", "ज़्यादा हो", "ज्यादा हो",
    "அதிகமா", "அதிகரி", "திடீர்", "நாளுக்கு நாள்", r"achanak", r"suddenly", r"badh", r"jaasti aag\w*", r"adhigamaa?\w*",
]
NEG_AFTER = ["ಇಲ್ಲ", "नहीं", "नही", "இல்லை", "இல்ல", r"illa", r"illai", r"nahi", r"nahin", r"nai"]
NEG_BEFORE = re.compile(r"(?<![a-z])(no|not|never|without|don'?t have|doesn'?t|didn'?t|any|less|no longer|not as)(?![a-z])|कोई|बिना|कम ")


def _negated(text: str, start: int, length: int) -> bool:
    after = clause_after(text, start, length)
    if any(contains(" " + after + " ", n) >= 0 for n in NEG_AFTER):
        return True
    return bool(NEG_BEFORE.search(clause_before(text, start)))


def _any(text: str, terms: list[str]) -> bool:
    return any(contains(text, t) >= 0 for t in terms)


def _find(text: str, cat: str) -> list[str]:
    spec = SYMPTOMS[cat]
    hits = []
    for term in spec["terms"]:
        i = contains(text, term)
        if i < 0:
            continue
        m = re.match(r"(?<![a-z])" + term, text[i:]) if not any(ord(c) > 0x08FF for c in term) else None
        length = m.end() if m else len(term)
        if spec.get("inherent_negation") or not _negated(text, i, length):
            hits.append(text[i:i + length].strip())
    return hits


def detect_rules(text: str) -> dict[str, Any]:
    s = norm(text)
    found: dict[str, list[str]] = {}
    for cat in SYMPTOMS:
        h = _find(s, cat)
        if h:
            found[cat] = h
    for rx in NEG_SEEING:
        m = rx.search(s)
        if m:
            tail = s[m.end(): m.end() + 14]
            if SEE_QUALIFIER.search(tail) or SEE_QUALIFIER.search(s[max(0, m.start() - 14): m.start()]):
                found.setdefault("blur", []).append(m.group(0))  # "can't see clearly": blur, not loss
            else:
                found.setdefault("vision_loss", []).append(m.group(0))
            break
    vr = _vision_reduced(s)
    if vr and "vision_loss" not in found:
        found["vision_loss"] = [vr]
    if "unclear_vision" in found:
        found.setdefault("blur", []).extend(found.pop("unclear_vision"))
    if "vision_loss" in found:
        found.pop("blur", None)
    if "headache" in found and "pain" in found:
        rest = s
        for h in found["headache"]:
            rest = rest.replace(h, " ")
        if not _find(rest, "pain"):
            found.pop("pain")  # the only pain mentioned is the headache

    intense = _any(s, INTENSITY)
    worsening = _any(s, WORSENING)
    severity = None
    sevs = []
    for cat in found:
        sev = SYMPTOMS[cat]["severity"]
        if cat == "pain" and (intense or worsening):
            sev = "urgent"
        if cat in ("redness", "blur") and worsening:
            sev = "urgent"
        sevs.append(sev)
    if sevs:
        severity = "urgent" if "urgent" in sevs else "soon"
    if "pain" in found and "redness" in found:
        severity = "urgent"
    order = ["vision_loss", "retina", "discharge", "pressure", "injury", "pain", "redness", "blur", "unclear_vision", "headache"]
    cats = sorted(found, key=order.index)
    return {"flag": bool(found), "severity": severity, "categories": cats, "matched": [w for c in cats for w in found[c]],
            "worsening": worsening, "intense": intense, "source": "rules"}


LLM_SYSTEM = """You triage messages from patients recovering from cataract surgery.
Decide if the message describes a symptom that the clinic must know about.
urgent: vision getting worse, severe or increasing pain, increasing redness with pain, discharge/pus, flashes/floaters/curtain, vomiting with eye pain, eye injury.
soon: mild pain, redness, blurring, headache or anything else the doctor should review today.
none: questions or normal recovery talk (watering, mild itching, grittiness, light sensitivity, halos).
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
