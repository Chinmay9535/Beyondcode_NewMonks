# DrishtiSaathi: context for Claude Code

ZEISS hackathon, stream *AI-Powered Digital Experiences*. Team from BMSIT&M, Bengaluru. The team gave creative freedom: the pitch in `pitch/` and `docs/` is context, not a spec.

## What the product is

A voice-first assistant for cataract patients (Kannada, Hindi, Tamil, English) plus a surgeon dashboard.
1. **Intake** (`backend/app/services/intake.py`): the conversation is topic-driven by code (day → near → mid → night → glasses → budget). Topics already covered are skipped. Patient words become *activities* (distance_cm, detail, night, hours, importance) via the LLM, or offline via a multilingual lexicon (substring match for Indic words, whole-word match for English).
2. **Ranking** (`services/lenses.py`): per-activity predicted logMAR from each lens's defocus curve gives the "Vision Day Map". The score is additive, so contributions are exact Shapley values vs. the average lens. Clinical rules come from `clinic.json`, plus a toric check and SRK/T IOL power.
3. **Q&A** (`services/rag.py`): BM25 plus multilingual keywords over `backend/knowledge/*.md`. Sections carry `> kn:/hi:/ta:` curated translations. Every answer cites; "not found" creates an info alert.
4. **Red flags** (`services/redflag.py`): rules run on every patient message. The LLM may only raise severity. Daily check-in rules live here too.
5. **Recovery** (`services/recovery.py`): dose schedule from `clinic.json`, using naive clinic-local times (`config.local_now`).

The patient never sees a ranking until the surgeon approves (`Recommendation.status == "approved"`).

## Run / test

- `./scripts/dev.sh`: API on :8000, web on :3000 (Next rewrites `/api/*` to `BACKEND_URL`).
- `cd backend && .venv/bin/python -m pytest -q`: 42 tests, isolated DB, offline mode.
- `cd web && npx tsc --noEmit && npx next build`.
- `node scripts/e2e-smoke.cjs [shotdir]`: Playwright journey (needs a fresh DB: delete `backend/drishtisaathi.db` and restart the API).
- Demo codes: RAMESH (fresh), LAKSHMI, KAMALA, ABDUL. Staff PIN 2468. Seeds go through the real intake engine (`app/seed.py`, scripts keyed by topic).

## Conventions and gotchas

- SQLModel ≥0.0.48 maps `datetime` to a tz-aware type. Our columns are declared `sa_type=DateTime` (naive): UTC for events, clinic-local for doses. API serialises event times with a `Z` suffix (`core.iso`).
- Lexicon additions: check for substring collisions (e.g. ಹೊಲ inside ಹೊಲಿಗೆ, कार inside सरकार, படி inside இப்படி) and add a test in `tests/test_engine.py`.
- React effects must not return values: Chromium's `scrollIntoView()` now returns a Promise, so always use braces.
- Indic text: never apply letter-spacing or uppercase (globals.css neutralises it under `:lang(kn|hi|ta)`). Set `lang` on elements holding patient-language text.
- `next start` renames itself `next-server`; kill that when restarting.
- Patient UI strings: `web/lib/i18n.ts`. Assistant phrases: `backend/app/i18n.py`. All Indic text still needs a native-speaker review.
- Design tokens are in `web/app/globals.css` (dark default, light theme, accent #FF6F37, sky #7DD3FC).

## Pitch materials

`pitch/site` is the presentation website (Vite + React Bits / Magic UI components, which must not be edited; see the licences there). `docs/` holds the submission answers and video script.

## Open ideas

WhatsApp Business channel; Azure Speech STT for browsers without Web Speech; per-clinic admin UI for `clinic.json`; real published defocus curves; push notifications for drop reminders (PWA); pgvector embeddings when the knowledge base grows.
