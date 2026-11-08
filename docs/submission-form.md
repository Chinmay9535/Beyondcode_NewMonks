# ZEISS hackathon: form answers

Everything below describes what is built and running in this repository. Claims are checked against the code; numbers come from `python -m app.services.evaluation` and `backend/evals/`.

## Short description of the idea (about 180 words)

Every cataract patient chooses a lens that stays in the eye for life. In India that choice is often made in a short counselling slot, from English brochures, by families who think in Kannada, Hindi or Tamil. Many pick on price, or regret a premium lens that didn't fit how they live.

DrishtiSaathi is a voice-first companion in Kannada, Hindi, Tamil and English. The patient talks about their day ("I thread needles and ride my scooter at night"), and it turns that into activities with distances and hours. Each lens's defocus curve, anchored to published data, then predicts what will be clear, a strain or need glasses, for both eyes, including low-cost blended vision. Patients photograph their own world and see it through each lens, with depth computed on the phone. The surgeon gets an explainable shortlist with per-eye IOL powers and approves it before the patient sees anything. After surgery: a drop schedule, daily check-ins, a home vision test, answers cited from the clinic's own guides, and red-flag alerts to the doctor in seconds.

> Before quoting a national figure (for example annual cataract surgeries in India), confirm it from an official source such as NPCBVI and cite it.

## What makes it different (if the form has a "key features" or "innovation" field)

- **Vision Day Map, both eyes.** Activities × defocus curves → predicted acuity per activity. Plans cover both eyes: monofocal, EDOF, trifocal, or blended vision (one eye set slightly near), which gives near vision at monofocal cost.
- **"Through your own eyes."** Depth Anything V2 runs in the browser; each pixel is blurred by what the lens predicts at that distance, with night halos around real lights. The photo never leaves the phone.
- **Explainable for the surgeon.** The score is additive, so each factor's contribution is exact. Clinical rules (macular disease, glaucoma, prior LASIK and more), SRK/T powers, a toric check, and second-eye refinement from the first eye's real result.
- **Measured safety.** A rule-based multilingual red-flag detector runs on every message. On its first held-out measurement (85 messages, including romanised and code-mixed typing) it caught 97% of emergencies with no false alarms. The AI can raise an alert, never clear one.
- **Home vision test.** Credit-card-calibrated tumbling-E test (distance and near) and an Amsler grid; a two-line drop after surgery raises an urgent alert.
- **Built for older eyes.** Voice in and out, three text sizes, high contrast, and read-aloud on the main cards.
- **Works without AI.** With no API key it runs fully offline on curated rules and text; an LLM, when configured, improves understanding of open-ended speech.

## Tech stack & platform

**Languages:** Python, TypeScript

**Frontend:** Next.js 16 (React 19) with Tailwind CSS 4 and Motion. Patient app (phone-first web app) and surgeon dashboard. Three.js (React Three Fiber) for the landing page.

**Backend:** FastAPI with SQLModel. SQLite by default; any SQLAlchemy database URL (for example PostgreSQL). Docker Compose for the full stack.

**AI / ML:**
- **Language understanding:** pluggable LLM client for Azure OpenAI, any OpenAI-compatible endpoint (including a local Ollama model), or Anthropic. Optional: every feature has an offline path.
- **Offline understanding:** a multilingual lexicon (Kannada, Hindi, Tamil, English, plus romanised forms) that maps speech to activities with distance, detail, night use and hours.
- **Grounded Q&A:** BM25 retrieval plus multilingual keywords over the clinic's own Markdown guides, with curated Kannada/Hindi/Tamil translations per section. Every answer cites its section; uncovered questions are passed to the clinic.
- **Red-flag detection:** compositional multilingual rules (symptom + intensity, clause-scoped negation, stem matching for Indic scripts). The LLM may only raise severity.
- **Lens ranking:** defocus curves (monocular, anchored to published figures for ZEISS AT LARA 829MP and AT LISA tri 839MP) combined across both eyes, an additive explainable score, clinical exclusion rules from `clinic.json`, SRK/T IOL power, toric check.
- **On-device depth:** Depth Anything V2 Small via transformers.js and ONNX Runtime Web in a Web Worker.

**Speech:** browser speech recognition and synthesis (Chrome on Android supports kn-IN, hi-IN, ta-IN). Optional Azure AI Speech neural voices for Kannada, Hindi and Tamil.

**Data & configuration:** clinic-editable files: `clinic.json` (lens catalogue, defocus curves with sources, A-constants, drop protocol, follow-ups, contacts) and Markdown guides. Biometry typed in or imported from a biometer CSV/JSON export (AL, K1, K2, axis, ACD).

**Testing:** 65 backend tests (pytest), a labelled safety and Q&A scorecard with a held-out split (also shown live at `/safety`), and a Playwright end-to-end journey.

**Hardware:** any Android or iOS smartphone for patients; a laptop for the surgeon. No special hardware.

**Security / privacy:** consent before the first question; the patient can delete all their data; photos are processed on the device; surgeon approval before any recommendation reaches the patient; designed with India's DPDP Act 2023 in mind.

**Next steps (not built yet):** WhatsApp reminders, push notifications for drops, Azure speech-to-text for browsers without built-in recognition, a clinic outcomes dashboard, and a native-speaker and clinician review of all Indic text and safety cases.

## Video link
1. Upload to YouTube, set **Visibility: Unlisted**, copy the link.
   Or: Google Drive → Share → General access: **Anyone with the link (Viewer)**.
2. Open the link in an incognito window to check it plays without a sign-in.
3. Length must be 1–3 minutes and cover: Problem, Solution & Expected Impact, Execution. The script is in `docs/video-script.md`.
