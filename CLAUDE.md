# DrishtiSaathi: context for Claude Code

ZEISS hackathon, stream *AI-Powered Digital Experiences*. Team from BMSIT&M, Bengaluru. The team gave creative freedom: the pitch in `pitch/` and `docs/` is context, not a spec.

## What the product is

A voice-first assistant for cataract patients (Kannada, Hindi, Tamil, English) plus a surgeon dashboard.
1. **Intake** (`backend/app/services/intake.py`): the conversation is topic-driven by code (day → near → mid → night → glasses → budget). Topics already covered are skipped. Patient words become *activities* (distance_cm, detail, night, hours, importance) via the LLM, or offline via a multilingual lexicon (substring match for Indic words, whole-word match for English).
2. **Ranking** (`services/lenses.py`): per-activity predicted logMAR from each lens's defocus curve (monocular, anchored to the published figures in each family's `sources`) gives the "Vision Day Map". The score is additive, so contributions are exact Shapley values vs. the average lens. Clinical rules come from `clinic.json`, plus a toric check and SRK/T IOL power.
3. **Q&A** (`services/rag.py`): BM25 plus multilingual keywords over `backend/knowledge/*.md`. Sections carry `> kn:/hi:/ta:` curated translations. Every answer cites; "not found" creates an info alert.
4. **Red flags** (`services/redflag.py`): rules run on every patient message. The LLM may only raise severity. Daily check-in rules live here too.
5. **Recovery** (`services/recovery.py`): dose schedule from `clinic.json`, using naive clinic-local times (`config.local_now`).
6. **Both eyes** (`lenses.rank`): plans are strategies from `clinic.json` (`families`/`targets` = [dominant, non-dominant]). Each eye's curve is shifted by its target; `binocular()` combines the eyes (better eye + summation fading with difference). Fellow eye: `planned` | `operated` (fixed, with `actual_se`, triggering the 50% second-eye refinement) | `natural`. Endpoint `/staff/patients/{id}/second-eye`.
7. **Vision tests** (`services/visiontest.py`, `web/lib/vision.ts`, `components/VisionTest.tsx`): card calibration (85.6 mm), tumbling E sized from logMAR and distance, staircase (pass 3 before 2 wrong), Amsler grid. Post-op 2-line drop → urgent alert; Amsler distortion pre-op → macula note, post-op → soon.
8. **Photo simulator** (`public/depth-worker.js`, `lib/depthsim.ts`, `components/DepthSimulator.tsx`): Depth Anything V2 Small via transformers.js 4.3.1 from jsdelivr in a module worker. Inverse depth is affine in dioptres, so nearest/farthest anchors map pixels to vergence; per-pixel blend of a box-blur pyramid; halos only on compact lights.
9. **Safety scorecard** (`services/evaluation.py`, `backend/evals/`, `/safety`): rules scored without an LLM. Never tune on the `test` split; if a test case fails, record it in `history`, move it to dev, then fix.

The patient never sees a ranking until the surgeon approves (`Recommendation.status == "approved"`).

## Run / test

- `./scripts/dev.sh`: API on :8000, web on :3000 (Next rewrites `/api/*` to `BACKEND_URL`).
- `cd backend && .venv/bin/python -m pytest -q`: 65 tests, isolated DB, offline mode. `python -m app.services.evaluation --errors` prints the safety scorecard.
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
- New DB columns: `db._add_missing_columns()` adds them to existing SQLite files on startup (forward-only).
- Red-flag rules: Indic terms match by stem (`textnorm.stem`); prefer composition (symptom + intensity) over listing sentences; add regressions to `test_red_flag_regressions`.
- Playwright in this sandbox needs `proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' }` to reach the model CDN.
- Snellen values are shown as the nearest standard line (`lenses.snellen`, `lib/vision.ts`).
- Landing hero: a pinned scroll story (`lib/story.ts`, section `#story`) drives `components/three/PillarField.tsx`, one pillar-field shape per chapter (lens, focus rings, two lenses, eye, then a camera dive into city blocks), then slow waves. Bodies and top caps are separate instanced meshes so only tops glow.
- Design tokens are in `web/app/globals.css` (dark default, light theme, high contrast via `data-contrast="high"`, accent #2F7BFF, sky #7DD3FC).
- Screens follow "summary first, details on demand": the surgeon patient page is tabbed (Overview · Lens plan · Eyes · Recovery · Conversation); plan details expand per row. Shared pieces live in `web/components/kit.tsx` (`Stat` tiles, `PillTabs`, `KV`, `CardTitle`); `.stat-accent` is the highlighted tile, `.card-solid` the calm card.
- Third-party UI: `web/components/magicui/` (Magic UI, MIT: NumberTicker, BorderBeam) and `web/components/reactbits/` (React Bits SpotlightCard, MIT + Commons Clause). Copy them unmodified with their licences; Magic UI imports `cn` from `web/lib/utils.ts`; `.jsx` files get a `.d.ts` beside them.
- Voices (`backend/app/services/tts.py`): Sarvam Bulbul first (`SARVAM_API_KEY`; v4 Flash personas chaitra_kn_conversation / aparna_hi_customer / aparna_en_companion, Tamil on v3 `ishita` since v4 has no female Tamil voice), then Azure, else 204 and the browser's best voice (`lib/speech.ts` `bestVoice`). Audio is cached in memory per (provider, lang, text). Bulbul needs native script, not romanised text.
- Font sizes are `rem` (`text-[0.9375rem]`), never px: the patient text-size option (`components/Readability.tsx`) scales the root font size. Anything that must keep a physical size (the calibrated eye test) uses px in inline styles.

## Pitch materials

`pitch/site` is the presentation website (Vite + React Bits / Magic UI components, which must not be edited; see the licences there). `docs/` holds the submission answers and video script.

## Open ideas

WhatsApp Business channel; Azure Speech STT for browsers without Web Speech; per-clinic admin UI for `clinic.json`; real published defocus curves; push notifications for drop reminders (PWA); camera-based viewing-distance check for the near test (MediaPipe iris); outcome-based A-constant optimisation per surgeon; native-speaker held-out safety set.
