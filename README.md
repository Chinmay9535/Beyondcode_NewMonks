# DrishtiSaathi

**A voice-first, multilingual companion for cataract patients in India.** It helps them choose the right lens for the life they actually live, and stays with them through recovery. Built for the ZEISS hackathon (AI-Powered Digital Experiences).

- **Talks in Kannada, Hindi, Tamil or English.** The patient speaks or taps; the assistant learns their day hour by hour ("I thread needles all day and ride my scooter at night").
- **Vision Day Map.** Each activity has a working distance and a level of detail. Each lens has a defocus curve. Putting them together predicts, per lens, which parts of the patient's day will be clear, a strain, or need glasses: "with this lens, 6 of your 8 daily hours are clear without glasses".
- **Explainable shortlist for the surgeon.** It uses exact additive contributions, clinical rules (macular disease, glaucoma, dry eye, prior LASIK, …), a toric check from keratometry and an SRK/T IOL power estimate. The surgeon edits, approves and adds a note; nothing reaches the patient before that.
- **Simulator driven by optics.** Blur and halos come from the same defocus curves, at the patient's own working distance. A live camera mode lets them look at their own sewing table or newspaper.
- **Recovery.** Drop schedule and adherence from the clinic protocol, a 3-tap daily check-in, and answers only from the clinic's own guides, with citations. When the guides don't cover a question, it says so and passes the question to the clinic.
- **Safety first.** Every message passes a rule-based multilingual red-flag detector (vision loss, severe pain, discharge, flashes/curtain, vomiting with pain, injury). Warning signs go straight to the surgeon's alert queue, and the patient gets call buttons. The AI can only raise an alert, never clear one.
- **Works with or without AI.** Plug in Azure OpenAI, any OpenAI-compatible endpoint (incl. Ollama) or Anthropic for open-ended understanding. Without a key, it runs fully offline on curated, multilingual rules and text, so the demo never breaks.
- **DPDP Act 2023 aware.** Consent before the first question, the patient can delete all their data, and role-separated access.

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
2. Open `/staff/RAMESH`. Show the Day Map, the "why" bars and the defocus chart with his needlework at −3 D, then approve with a note.
3. Back on the phone, open My lens. Show the approved lens, his day, the simulator and the WhatsApp share.
4. Open `/p/ABDUL`, then Ask: "अचानक बहुत दर्द और कुछ नहीं दिख रहा". An urgent alert appears on the dashboard within seconds.

### Configuration

Copy `backend/.env.example` to `backend/.env`. Everything is optional. Key settings:

| Variable | Purpose |
|---|---|
| `LLM_PROVIDER` | `none` (default, offline), `azure`, `openai` (any compatible endpoint), `anthropic` |
| `AZURE_OPENAI_*` / `OPENAI_*` / `ANTHROPIC_API_KEY`, `LLM_MODEL` | Provider credentials |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Neural Kannada/Hindi/Tamil voices. Without it, the browser's own voices are used |
| `SURGEON_PIN`, `SECRET_KEY` | Staff login |
| `DATABASE_URL` | SQLite by default; any SQLAlchemy URL (Postgres/Supabase) |

Clinic-specific content is plain files a clinic can edit:
- `backend/clinic.json`: lens catalogue, defocus curves, A-constants, drop protocol, follow-ups, contacts
- `backend/knowledge/*.md`: post-op and lens guides with Kannada/Hindi/Tamil versions (what the Q&A answers from)

## Tests

```bash
cd backend && .venv/bin/python -m pytest -q
```

The backend has 42 tests: SRK/T, ranking, multilingual extraction, red flags, retrieval, and full API journeys.

```bash
node scripts/e2e-smoke.cjs
```

That's the browser smoke test. It needs Playwright, both servers running and a fresh database.

## Layout

```
backend/   FastAPI · SQLModel · intake engine, lens ranking, RAG, red flags, recovery
web/       Next.js 16 · Tailwind v4 · patient app (/p/CODE) and surgeon dashboard (/staff)
pitch/     the hackathon presentation site (Vite) and prebuilt files
docs/      submission form answers and video script
```

## Important limits

This is decision support, not a medical device. The defocus curves, A-constants and clinic guides are illustrative samples, so replace them with the clinic's validated data. The Kannada, Hindi and Tamil text needs a native-speaker and clinical review before real patients use it.
