"""Safety scorecard: measures red-flag triage and grounded Q&A against labelled cases.

Cases live in backend/evals/. Each set has a 'dev' split (used while improving the
rules) and a held-out 'test' split (only ever reported). The rules are scored
without the LLM, because they are the safety floor that must hold even when no
AI provider is configured.

Run from the command line:  python -m app.services.evaluation
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from functools import lru_cache
from typing import Any

from ..config import BASE_DIR
from . import rag, redflag

LEVEL = {"none": 0, "soon": 1, "urgent": 2}


def _load(name: str) -> list[dict[str, Any]]:
    return json.loads((BASE_DIR / "evals" / name).read_text(encoding="utf-8"))["cases"]


def _pct(a: int, b: int) -> float | None:
    return round(100 * a / b, 1) if b else None


def score_redflags(cases: list[dict[str, Any]]) -> dict[str, Any]:
    rows = []
    for c in cases:
        pred = redflag.detect_rules(c["text"])["severity"] or "none"
        rows.append({**c, "pred": pred})
    urgent = [r for r in rows if r["label"] == "urgent"]
    flagged = [r for r in rows if r["label"] != "none"]
    benign = [r for r in rows if r["label"] == "none"]
    confusion = Counter((r["label"], r["pred"]) for r in rows)
    by_lang: dict[str, dict[str, Any]] = {}
    for lang in sorted({r["lang"] for r in rows}):
        lr = [r for r in rows if r["lang"] == lang]
        lu = [r for r in lr if r["label"] == "urgent"]
        by_lang[lang] = {"n": len(lr), "urgent_recall": _pct(sum(r["pred"] == "urgent" for r in lu), len(lu)),
                         "exact": _pct(sum(r["pred"] == r["label"] for r in lr), len(lr))}
    return {
        "n": len(rows),
        # The number that matters most: emergencies recognised as emergencies.
        "urgent_recall": _pct(sum(r["pred"] == "urgent" for r in urgent), len(urgent)),
        # Emergencies the system did not flag at all (the dangerous failure).
        "urgent_missed": sum(r["pred"] == "none" for r in urgent),
        "any_flag_recall": _pct(sum(r["pred"] != "none" for r in flagged), len(flagged)),
        "false_alarm_rate": _pct(sum(r["pred"] != "none" for r in benign), len(benign)),
        "exact": _pct(sum(r["pred"] == r["label"] for r in rows), len(rows)),
        "confusion": {f"{a}->{b}": n for (a, b), n in sorted(confusion.items())},
        "by_lang": by_lang,
        "errors": [{"id": r["id"], "lang": r["lang"], "text": r["text"], "label": r["label"], "pred": r["pred"],
                    "under_triage": LEVEL[r["pred"]] < LEVEL[r["label"]]} for r in rows if r["pred"] != r["label"]],
    }


def score_qa(cases: list[dict[str, Any]]) -> dict[str, Any]:
    rows = []
    for c in cases:
        hits = [h for h in rag.search(c["text"]) if h[1] >= rag.MIN_SCORE]
        got = hits[0][0].id if hits else None
        rows.append({**c, "got": got})
    inscope = [r for r in rows if r["expected"]]
    outscope = [r for r in rows if not r["expected"]]
    by_lang = defaultdict(lambda: [0, 0])
    for r in rows:
        by_lang[r["lang"]][0] += r["got"] == r["expected"]
        by_lang[r["lang"]][1] += 1
    return {
        "n": len(rows),
        "top1": _pct(sum(r["got"] == r["expected"] for r in inscope), len(inscope)),
        "abstain_correct": _pct(sum(r["got"] is None for r in outscope), len(outscope)),
        "by_lang": {k: _pct(a, b) for k, (a, b) in sorted(by_lang.items())},
        "errors": [{"id": r["id"], "lang": r["lang"], "text": r["text"], "expected": r["expected"], "got": r["got"]} for r in rows if r["got"] != r["expected"]],
    }


@lru_cache
def scorecard() -> dict[str, Any]:
    rf, qa = _load("redflag_cases.json"), _load("qa_cases.json")
    history = json.loads((BASE_DIR / "evals" / "redflag_cases.json").read_text(encoding="utf-8")).get("history", [])
    return {
        "history": history,
        "counts": {"redflag": len(rf), "qa": len(qa), "languages": sorted({c["lang"] for c in rf})},
        "method": "Rules scored without any LLM (the safety floor). 'dev' cases were used while improving the rules; 'test' cases are held out and were never used for tuning. Cases are written by the build team and still need native-speaker and clinician review.",
        "redflag": {s: score_redflags([c for c in rf if c["split"] == s]) for s in ("dev", "test")},
        "qa": {s: score_qa([c for c in qa if c["split"] == s]) for s in ("dev", "test")},
    }


if __name__ == "__main__":  # pragma: no cover
    import sys

    sc = scorecard()
    show = "--errors" in sys.argv
    for split in ("dev", "test"):
        r, q = sc["redflag"][split], sc["qa"][split]
        print(f"[{split}] red flags n={r['n']}: urgent recall {r['urgent_recall']}%, urgent missed {r['urgent_missed']}, "
              f"any-flag recall {r['any_flag_recall']}%, false alarms {r['false_alarm_rate']}%, exact {r['exact']}%")
        print(f"        by language: {r['by_lang']}")
        print(f"[{split}] Q&A n={q['n']}: top-1 {q['top1']}%, correct abstain {q['abstain_correct']}%, by lang {q['by_lang']}")
        if show and split == "dev":
            for e in r["errors"]:
                print("   RF", e["label"], "->", e["pred"], "|", e["text"])
            for e in q["errors"]:
                print("   QA", e["expected"], "->", e["got"], "|", e["text"])
