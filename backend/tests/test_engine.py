"""Unit tests for the clinical logic: IOL power, ranking, intake understanding, red flags, retrieval."""
import pytest

from app.services import intake, lenses, rag, redflag

RAMESH_BIO = {"axial_length": 23.42, "k1": 43.50, "k2": 44.00, "k2_axis": 92}
TAILOR = {
    "activities": [
        {"id": "needle", "label": "Threading needles", "distance_cm": 33, "detail": "fine", "hours": 6, "importance": 3},
        {"id": "night_drive", "label": "Scooter at night", "distance_cm": 600, "detail": "normal", "night": True, "hours": 1, "importance": 3},
    ],
    "glasses_free": 2, "budget": 1,
}


# ----------------------------------------------------------------------------- IOL power

def test_srkt_matches_srk2_ballpark():
    # SRK II for the same eye: 118.4 - 2.5*23.42 - 0.9*43.75 = 20.5 D
    assert lenses.srkt(23.42, 43.75, 118.4) == pytest.approx(20.5, abs=0.3)


def test_srkt_behaves_physically():
    base = lenses.srkt(23.5, 43.5, 118.4)
    assert lenses.srkt(25.0, 43.5, 118.4) < base  # longer eye -> weaker lens
    assert lenses.srkt(23.5, 45.0, 118.4) < base  # steeper cornea -> weaker lens
    assert lenses.srkt(23.5, 43.5, 118.9) > base  # higher A-constant -> stronger lens
    assert lenses.srkt(23.5, 43.5, 118.4, target=-0.5) > base  # myopic target -> stronger lens


# ----------------------------------------------------------------------------- ranking

def test_contributions_are_exactly_additive():
    r = lenses.rank(TAILOR, RAMESH_BIO, [])
    for o in r["options"]:
        total = o["baseline"] + sum(c["value"] for c in o["contributions"]) + sum(a["value"] for a in o["adjustments"])
        assert total == pytest.approx(o["score"], abs=2e-3)


def test_needlework_favours_trifocal_and_reports_day_map():
    r = lenses.rank(TAILOR, RAMESH_BIO, [])
    assert r["options"][0]["family"] == "trifocal"
    mono = next(o for o in r["options"] if o["family"] == "monofocal")
    needle = next(row for row in mono["day_map"] if row["activity"] == "needle")
    assert needle["status"] == "glasses"
    tri = r["options"][0]
    assert any(row["halos"] for row in tri["day_map"])


def test_distance_and_night_life_favours_monofocal():
    driver = {"activities": [
        {"id": "day_drive", "label": "Driving", "distance_cm": 600, "hours": 7, "importance": 3},
        {"id": "night_drive", "label": "Night driving", "distance_cm": 600, "night": True, "hours": 3, "importance": 3},
    ], "glasses_free": 0.5, "budget": 3}
    assert lenses.rank(driver, RAMESH_BIO, [])["options"][0]["family"] == "monofocal"


def test_macular_disease_excludes_trifocal():
    r = lenses.rank(TAILOR, RAMESH_BIO, ["macular_disease"])
    tri = next(o for o in r["options"] if o["family"] == "trifocal")
    assert tri["excluded"] and r["options"][-1] is tri


def test_astigmatism_triggers_toric():
    r = lenses.rank(TAILOR, {**RAMESH_BIO, "k1": 42.5, "k2": 44.0}, [])
    assert r["astigmatism"]["toric"] and all(o["toric"] for o in r["options"])
    assert lenses.rank(TAILOR, RAMESH_BIO, [])["astigmatism"]["toric"] is False


def test_biometry_warnings():
    notes = lenses.biometry_notes({"axial_length": 21.2, "k1": 44, "k2": 44.5}, ["prior_refractive_surgery"])
    text = " ".join(n["text"] for n in notes)
    assert "Short eye" in text and "Post-refractive" in text


# ----------------------------------------------------------------------------- intake

def test_kannada_tailor_sentence_extracts_needle_and_night_riding():
    ext = intake.extract_offline("ನಾನು ಟೈಲರ್. ಸೂಜಿಗೆ ದಾರ ಪೋಣಿಸಬೇಕು, ರಾತ್ರಿ ಸ್ಕೂಟರ್ ಓಡಿಸುತ್ತೇನೆ.", "day", "kn")
    ids = {a["id"] for a in ext["activities"]}
    assert {"needle", "night_drive"} <= ids


@pytest.mark.parametrize("text,lang,expected", [
    ("मैं ऑटो चलाता हूँ, रात को भी", "hi", "night_drive"),
    ("தினமும் செய்தித்தாள் படிக்கிறேன்", "ta", "reading"),
    ("I work on a laptop all day", "en", "computer"),
    ("ಸಂಜೆ ಟಿವಿ ನೋಡುತ್ತೇನೆ", "kn", "tv"),
])
def test_multilingual_activity_extraction(text, lang, expected):
    assert expected in {a["id"] for a in intake.extract_offline(text, "day", lang)["activities"]}


@pytest.mark.parametrize("text,lang", [("ಹೊಲಿಗೆ ಕೆಲಸ", "kn"), ("सरकारी नौकरी", "hi"), ("இப்படி தான்", "ta")])
def test_lexicon_collisions_do_not_fire(text, lang):
    ids = {a["id"] for a in intake.extract_offline(text, "day", lang)["activities"]}
    assert "farming" not in ids and "day_drive" not in ids and "reading" not in ids


def test_hours_are_parsed():
    ext = intake.extract_offline("ದಿನಕ್ಕೆ 2 ಗಂಟೆ ಫೋನ್ ನೋಡುತ್ತೇನೆ", "near", "kn")
    assert ext["activities"][0]["hours"] == 2.0


def test_glasses_phrases():
    assert intake.extract_offline("ಕನ್ನಡಕ ಇಲ್ಲದೆ ಇರಬೇಕು", "glasses", "kn")["glasses_free"] == 3
    assert intake.extract_offline("चश्मा चलेगा", "glasses", "hi")["glasses_free"] == 0.5


def test_flow_skips_topics_already_answered_and_finishes():
    p = {"current_topic": "day"}
    r = intake.step(p, "I'm a tailor, I thread needles all day and ride my scooter at night", "en", "Ramesh", "Dr", use_llm=False)
    assert r["profile"]["current_topic"] == "mid"  # near and night already covered
    for choice_topic in ("mid", "glasses", "budget"):
        topic = r["profile"]["current_topic"]
        assert topic == choice_topic
        r = intake.step(r["profile"], "no", "en", "Ramesh", "Dr", choice={"glasses": "very", "budget": "balanced"}.get(topic), use_llm=False)
    assert r["done"] and r["profile"]["current_topic"] is None


# ----------------------------------------------------------------------------- red flags

@pytest.mark.parametrize("text,severity", [
    ("ಕಣ್ಣು ತುಂಬಾ ನೋವು, ಏನೂ ಕಾಣುತ್ತಿಲ್ಲ", "urgent"),
    ("आँख लाल है और दर्द बढ़ रहा है", "urgent"),
    ("I see flashes of light and a curtain", "urgent"),
    ("அதிகமாக மங்கலா தெரியுது", "urgent"),
    ("my eye is red", "soon"),
    ("கண் வலி", "soon"),
    ("I have no pain, when can I bathe?", None),
    ("ನೋವು ಇಲ್ಲ, ಸ್ನಾನ ಯಾವಾಗ?", None),
    ("मुझे दर्द नहीं है", None),
    ("Ready to read the newspaper?", None),
])
def test_red_flags(text, severity):
    assert redflag.detect_rules(text)["severity"] == severity


def test_checkin_rules():
    assert redflag.checkin(0, "worse", "none", 2)["severity"] == "urgent"
    assert redflag.checkin(2, "better", "more", 2)["severity"] == "urgent"
    assert redflag.checkin(1, "better", "none", 2)["flag"] is False
    assert redflag.checkin(0, "same", "none", 8)["severity"] == "soon"


# ----------------------------------------------------------------------------- retrieval

@pytest.mark.parametrize("q,lang,section", [
    ("ಸ್ನಾನ ಯಾವಾಗ ಮಾಡಬಹುದು?", "kn", "bathing"),
    ("क्या मैं टीवी देख सकता हूँ?", "hi", "screens"),
    ("கண்மை போடலாமா?", "ta", "kajal"),
    ("When can I pray namaz again?", "en", "bending"),
    ("What is an EDOF lens?", "en", "edof"),
])
def test_retrieval_finds_the_right_section(q, lang, section):
    a = rag.answer(q, lang)
    assert a["found"] and a["citations"][0]["id"].endswith("#" + section)
    if lang != "en":
        assert a["text"] != a["text_en"]  # answered in the patient's language


def test_out_of_scope_question_is_not_guessed():
    assert rag.answer("Can I drink alcohol?", "en")["found"] is False


def test_every_section_has_all_translations():
    for s in rag.index()["sections"]:
        assert set(s.local) == {"kn", "hi", "ta"}, s.id
