# DrishtiSaathi

**A voice-first, multilingual companion for cataract patients in India.** It helps them choose the right lens for the life they actually live, and stays with them through recovery. Built for the ZEISS hackathon (AI-Powered Digital Experiences).

- **Talks in Kannada, Hindi, Tamil or English.** The patient speaks or taps; the assistant learns their day hour by hour ("I thread needles all day and ride my scooter at night").
- **Vision Day Map, planned for both eyes.** Each activity has a working distance and a level of detail; each lens has a defocus curve. Combining them predicts, activity by activity, what will be clear, a strain or need glasses. Plans cover **both eyes**: monofocal, EDOF or trifocal in both, or **blended vision** (one eye set slightly for near). Blended vision gives near vision at monofocal cost, which matters most for cost-sensitive patients.
- **"Through your own eyes."** The patient photographs their own sewing table, newspaper or street. A depth model running **on the phone** (Depth Anything V2) measures distances in the photo, and each pixel is blurred by what that lens predicts at that distance. Night mode shows the halos around their actual street lights. The photo never leaves the device.
- **Explainable shortlist for the surgeon.** Every score is broken into exact contributions, and clinical rules are applied (macular disease, glaucoma, dry eye, prior LASIK, …). It gives per-eye SRK/T powers and toric checks. After the first eye, its **real result re-plans the second eye** (50% prediction-error adjustment). The surgeon edits, approves and adds a note; nothing reaches the patient before that.
- **Home vision test.** A card-calibrated tumbling-E test (distance with a helper, as in Peek Acuity, and near), plus an Amsler grid. Recovery is **measured**, not guessed. A 2-line drop raises an urgent alert, and distortion on the grid before surgery tells the surgeon to check the macula before a multifocal lens.
- **Recovery.** Drop schedule and adherence, a 3-tap daily check-in, and answers only from the clinic's own guides, with citations. When the guides don't cover a question, it says so and passes it to the clinic.
- **Measured safety.** Every message passes a rule-based multilingual red-flag detector. It is scored on 175 labelled messages, including romanised and code-mixed typing, with a held-out test set written before tuning. The **[/safety](http://localhost:3000/safety)** page shows the numbers and lets anyone try a message. The AI can only raise an alert, never clear one, and the build fails if any emergency in the set is missed.
- **Built for older eyes.** Voice in and out, an **Aa** menu with three text sizes, high contrast and light/dark, and read-aloud buttons on the main cards. The calibrated eye test is unaffected by text size.
- **Works with or without AI.** Azure OpenAI, any OpenAI-compatible endpoint (incl. Ollama) or Anthropic for open-ended understanding. Without a key, it runs fully offline on curated rules and text, so the demo never breaks.
- **DPDP Act 2023 aware.** Consent before the first question, deletion of all data, on-device photo processing.

## Run it

Needs Python 3.11+ and Node 20+.

```bash
./scripts/dev.sh
```

Open http://localhost:3000. The API docs are at http://localhost:8000/docs.

Or with Docker:

```bash
docker compose up --build
```

<details><summary>Manual setup</summary>

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt pytest
.venv/bin/uvicorn app.main:app --reload --port 8000
```

```bash
cd web
npm install
npm run dev
```
</details>

### Demo accounts (seeded on first start)

| Code | Who | Shows |
|---|---|---|
| `RAMESH` | Tailor, Mysuru, ಕನ್ನಡ | Fresh patient: consent → voice conversation → Day Map |
| `LAKSHMI` | Retired, Chennai, தமிழ் | 1.5 D astigmatism → toric options, waiting for review |
| `KAMALA` | Homemaker, Mandya, ಕನ್ನಡ | Macular disease → trifocal excluded |
| `ABDUL` | Auto driver, Bengaluru, हिन्दी | Glaucoma, monofocal approved, day 3 after surgery, urgent alert |

Surgeon dashboard: http://localhost:3000/staff, PIN `2468`. To reset the demo, delete `backend/drishtisaathi.db` and restart.

**Demo script (3 min):**
1. Open `/p/RAMESH` on a phone and answer in Kannada: "ನಾನು ಟೈಲರ್. ಸೂಜಿಗೆ ದಾರ ಪೋಣಿಸಬೇಕು, ರಾತ್ರಿ ಸ್ಕೂಟರ್ ಓಡಿಸುತ್ತೇನೆ." The assistant skips the questions he already answered.
2. Open `/staff/KAMALA`: cost-sensitive, with macular disease. **Blended vision** ranks first and the trifocal is excluded. Show the per-eye plan, the "why" bars and the both-eyes defocus chart.
3. Approve a plan for Ramesh, then on his phone open **My lens → Your own photo** and photograph something nearby. Swipe between lenses and switch to Night to see halos.
4. Open `/p/ABDUL` → **Eye test**. His trend is on the surgeon page; a bad result raises an urgent alert. Then on `/staff/ABDUL` enter "-0.50" in **Plan second eye**.
5. Open `/safety` and type a message in any language.

### Configuration

Copy `backend/.env.example` to `backend/.env`. Everything is optional. Key settings:

| Variable | Purpose |
|---|---|
| `LLM_PROVIDER` | `none` (default, offline), `azure`, `openai` (any compatible endpoint), `anthropic` |
| `AZURE_OPENAI_*` / `OPENAI_*` / `ANTHROPIC_API_KEY`, `LLM_MODEL` | Provider credentials |
| `SARVAM_API_KEY` | Natural Kannada/Hindi/Tamil/Indian-English voices from Sarvam AI Bulbul (recommended; [get a key](https://dashboard.sarvam.ai)). Optional `SARVAM_VOICES`, `TTS_PACE` |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Alternative: Azure neural voices. With neither key, the browser's most natural voice is used |
| `SURGEON_PIN`, `SECRET_KEY` | Staff login |
| `DATABASE_URL` | SQLite by default; any SQLAlchemy URL (Postgres/Supabase) |

Clinic-specific content is plain files a clinic can edit:
- `backend/clinic.json`: lens catalogue, defocus curves (each with its published `sources`, shown to the surgeon), A-constants, drop protocol, follow-ups, contacts
- `backend/knowledge/*.md`: post-op and lens guides with Kannada/Hindi/Tamil versions (what the Q&A answers from)
- `backend/evals/*.json`: the labelled safety and Q&A cases behind the scorecard

**Photo simulator offline:** the depth model (~27 MB) is downloaded by the browser on first use and then cached. For a venue without internet, run `./scripts/fetch-depth-model.sh` once to serve it from `web/public/models/`. The ONNX runtime still comes from cdn.jsdelivr.net on first load, so open the simulator once while online.

## Tests

```bash
cd backend && .venv/bin/python -m pytest -q
```

The backend has 65 tests: SRK/T, binocular ranking, second-eye refinement, multilingual extraction, red-flag regressions, the safety floor, retrieval, vision tests, migrations and full API journeys.

```bash
cd backend && .venv/bin/python -m app.services.evaluation --errors
```

That prints the safety scorecard in the terminal.

```bash
node scripts/e2e-smoke.cjs
```

That's the browser smoke test: intake, approval, Q&A alerts, safety page, eye test, second eye. It needs Playwright, both servers running and a fresh database.

## Layout

```
backend/   FastAPI · SQLModel · intake engine, lens ranking, RAG, red flags, recovery
web/       Next.js 16 · Tailwind v4 · patient app (/p/CODE) and surgeon dashboard (/staff)
pitch/     the hackathon presentation site (Vite) and prebuilt files
docs/      submission form answers and video script
```

## Credits

- UI components: [Magic UI](https://magicui.design) NumberTicker and BorderBeam (MIT) in `web/components/magicui/`, and [React Bits](https://reactbits.dev) SpotlightCard (MIT + Commons Clause) in `web/components/reactbits/`, copied unmodified with their licences. The landing page and pitch site credit their own components in `pitch/`.

## Important limits

This is decision support, not a medical device. The home vision test is a screening aid, not a clinical exam, and has not been validated against clinic charts. The safety cases were written by the build team and need a native-speaker and clinician review; a fresh held-out set written by others is the honest next measurement. The defocus curves are anchored to published summary figures (see `sources` in `clinic.json`) but are not full published tables; the A-constants and clinic guides are illustrative samples. Replace all of them with the clinic's validated data. The Kannada, Hindi and Tamil text needs a native-speaker and clinical review before real patients use it.
