"""Small, dependency-free text helpers for Kannada, Hindi, Tamil and English matching."""
from __future__ import annotations

import re
import unicodedata

CLAUSE_BREAK = re.compile(r"[,.;:!?।\n]| but | lekin | aadre | aanaal |लेकिन|ಆದರೆ|ஆனால்")


def norm(text: str) -> str:
    return " " + re.sub(r"\s+", " ", unicodedata.normalize("NFC", text).lower()).strip() + " "


def is_indic(word: str) -> bool:
    return any(ord(ch) > 0x08FF for ch in word)


def stem(word: str) -> str:
    """Strips an inflectable ending so ನೋವು matches ನೋವಾಗುತ್ತಿದೆ, ಕೆಂಪು matches ಕೆಂಪಾಗಿದೆ,
    சிவப்பு matches சிவப்பா, வட்டம் matches வட்டங்கள். Kannada and Tamil inflect by
    suffixing, usually replacing the final vowel sign. Keeps at least three code points
    so short words do not become ambiguous (வலி stays வலி, so it never matches வலது)."""
    if not is_indic(word) or " " in word:
        return word
    w = word
    ended_with_virama = False
    while w and unicodedata.category(w[-1]).startswith("M"):
        ended_with_virama = ended_with_virama or unicodedata.name(w[-1], "").endswith("VIRAMA")
        w = w[:-1]
    # A final pure consonant (e.g. Tamil ம் in வட்டம்) is replaced in inflected forms (வட்டங்கள்).
    if ended_with_virama and len(w) - 1 >= 4:
        w = w[:-1]
    return w if len(w) >= 3 else word


def contains(text: str, term: str) -> int:
    """Index of term in normalised text, or -1. English/romanised terms are regexes matched
    on word boundaries; Indic terms match as stems (substring)."""
    if is_indic(term):
        t = stem(term)
        return text.find(t)
    m = re.search(r"(?<![a-z])" + term + r"(?![a-z])", text)
    return m.start() if m else -1


def clause_after(text: str, start: int, length: int, limit: int = 18) -> str:
    rest = text[start + length: start + length + limit]
    m = CLAUSE_BREAK.search(rest)
    return rest[: m.start()] if m else rest


def clause_before(text: str, start: int, limit: int = 28) -> str:
    before = text[max(0, start - limit): start]
    parts = CLAUSE_BREAK.split(before)
    return parts[-1] if parts else before
