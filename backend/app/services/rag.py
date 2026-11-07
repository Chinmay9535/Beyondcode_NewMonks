"""Grounded Q&A over the clinic's own guides (backend/knowledge/*.md).

Retrieval: BM25 over the English text, plus multilingual keyword hits (substring
match, so Kannada/Tamil suffixes still match). With an LLM configured, the query
is first rewritten into English search terms and the answer is composed only from
the retrieved sections; without one, the section's curated translation is used.
Either way every answer carries citations, and "not found" is an honest answer.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

from .. import i18n, llm
from ..config import BASE_DIR
from ..textnorm import stem

STOP = set("a an the and or of to in on for is are be can i my me you your it this that with at from do does did when what how should will after before".split())
SPLIT = re.compile(r"[\s,.!?;:()\"'।|/\-–—]+")


@dataclass
class Section:
    id: str
    title: str
    source: str
    body: str
    keywords: list[str]
    local: dict[str, str] = field(default_factory=dict)

    @property
    def tokens(self) -> list[str]:
        return tokenize(self.title + " " + self.body + " " + " ".join(k for k in self.keywords if k.isascii()))


def tokenize(text: str) -> list[str]:
    out = []
    for w in SPLIT.split(text.lower()):
        if w and w.isascii() and w not in STOP and len(w) > 1:
            out.append(w[:-1] if len(w) > 4 and w.endswith("s") else w)
    return out


def parse(md: str, doc_id: str) -> list[Section]:
    source, sections, cur = doc_id, [], None
    for line in md.splitlines():
        if line.startswith("source:"):
            source = line.split(":", 1)[1].strip()
        elif line.startswith("## "):
            m = re.match(r"##\s+(.*?)\s*\{#([\w-]+)\}\s*$", line)
            title, sid = (m.group(1), m.group(2)) if m else (line[3:].strip(), f"s{len(sections)}")
            cur = Section(id=f"{doc_id}#{sid}", title=title, source=source, body="", keywords=[])
            sections.append(cur)
        elif cur is None:
            continue
        elif line.startswith("keywords:"):
            cur.keywords = [k.strip().lower() for k in line.split(":", 1)[1].split(",") if k.strip()]
        elif re.match(r">\s*(kn|hi|ta):", line):
            lang, text = line.lstrip("> ").split(":", 1)
            cur.local[lang.strip()] = text.strip()
        elif line.strip():
            cur.body += (" " if cur.body else "") + line.strip()
    return sections


@lru_cache
def index() -> dict[str, Any]:
    sections: list[Section] = []
    for f in sorted((BASE_DIR / "knowledge").glob("*.md")):
        sections += parse(f.read_text(encoding="utf-8"), f.stem)
    docs = [s.tokens for s in sections]
    df = Counter(t for d in docs for t in set(d))
    avgdl = sum(len(d) for d in docs) / max(1, len(docs))
    return {"sections": sections, "docs": [Counter(d) for d in docs], "lens": [len(d) for d in docs], "df": df, "N": len(docs), "avgdl": avgdl}


def search(query: str, extra_terms: str = "", k: int = 3) -> list[tuple[Section, float]]:
    ix = index()
    q = tokenize(query + " " + extra_terms)
    ql = " " + query.lower() + " "
    scored = []
    for i, s in enumerate(ix["sections"]):
        tf, dl = ix["docs"][i], ix["lens"][i]
        bm = 0.0
        for t in set(q):
            if t in tf:
                idf = math.log(1 + (ix["N"] - ix["df"][t] + 0.5) / (ix["df"][t] + 0.5))
                bm += idf * tf[t] * 2.2 / (tf[t] + 1.2 * (0.25 + 0.75 * dl / ix["avgdl"]))
        kw = 0.0
        for word in s.keywords:
            if word.isascii():
                if re.search(r"(?<![a-z])" + re.escape(word) + r"(?![a-z])", ql):
                    kw += 1.5 + 0.5 * word.count(" ")
            elif stem(word) in ql:
                # Indic keywords match by stem (suffixes); longer phrases are more specific.
                kw += 2.0 + min(len(word), 12) / 12
        score = bm + kw
        if score > 0:
            scored.append((s, round(score, 3)))
    scored.sort(key=lambda x: -x[1])
    return scored[:k]


MIN_SCORE = 2.0

ANSWER_SYSTEM = """You are DrishtiSaathi, an assistant for a cataract clinic's patients.
Answer the patient's question using ONLY the clinic excerpts provided. Rules:
- Reply in {lang_name}, in 1 to 3 short, warm, plain sentences a 65-year-old can follow when read aloud.
- Never diagnose, never change or add medicines or doses, never contradict the excerpts.
- If the excerpts do not answer the question, set "answerable" to false.
Return JSON: {{"answerable":bool,"answer":"in {lang_name}","answer_en":"English version","used":["excerpt ids you relied on"]}}"""


def citation(s: Section) -> dict[str, str]:
    return {"id": s.id, "title": s.title, "source": s.source}


def answer(question: str, lang: str) -> dict[str, Any]:
    """Returns {found, text, text_en, citations, mode}."""
    from .intake import LANG_NAMES

    extra = ""
    if llm.enabled() and lang != "en":
        try:
            extra = llm.complete(
                "Translate the patient's question about eye surgery recovery into short English search keywords. Output keywords only.",
                question, max_tokens=60,
            )
        except llm.LLMUnavailable:
            extra = ""
    hits = search(question, extra)
    hits = [h for h in hits if h[1] >= MIN_SCORE]
    if not hits:
        return {"found": False, "text": i18n.t("not_found", lang), "text_en": i18n.t("not_found", "en"), "citations": [], "mode": "none"}

    if llm.enabled():
        excerpts = "\n\n".join(f"[{s.id}] {s.title}\n{s.body}" for s, _ in hits)
        try:
            data = llm.complete_json(
                ANSWER_SYSTEM.format(lang_name=LANG_NAMES.get(lang, "English")),
                f"Clinic excerpts:\n{excerpts}\n\nPatient question: {question}",
            )
            used = [s for s, _ in hits if s.id in (data.get("used") or [])]
            if data.get("answerable") and data.get("answer") and used:
                return {"found": True, "text": data["answer"], "text_en": data.get("answer_en") or data["answer"],
                        "citations": [citation(s) for s in used], "mode": "llm"}
            if data.get("answerable") is False:
                return {"found": False, "text": i18n.t("not_found", lang), "text_en": i18n.t("not_found", "en"), "citations": [], "mode": "llm"}
        except llm.LLMUnavailable:
            pass

    top = hits[0][0]
    text = top.local.get(lang) if lang != "en" else None
    return {"found": True, "text": text or top.body, "text_en": top.body, "citations": [citation(top)], "mode": "curated"}
