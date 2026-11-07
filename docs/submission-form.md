# ZEISS hackathon: form answers

## Short description of the idea (180 words)

India performs millions of cataract surgeries every year, and each patient faces an irreversible decision: which intraocular lens (IOL) will stay in their eye for life. Monofocal, toric, EDOF or trifocal — the choice decides whether a 60-year-old tailor in Mysuru can thread a needle without glasses. Yet it is made in a rushed counselling slot, through English brochures and jargon, by families who think in Kannada, Hindi or Tamil. Many default to the cheapest option or regret an expensive one, and after surgery clinics are flooded with repetitive calls about drops, pain and precautions.

DrishtiSaathi is a voice-first, multilingual AI assistant that turns this journey into a guided digital experience. Before surgery, it conversationally learns the patient's daily visual needs — reading, night driving, screens, hobbies — combines them with biometry from devices like the ZEISS IOLMaster, and generates a personalised, surgeon-approved lens shortlist with simulated "how you will see" previews. After surgery, it automates support: eye-drop reminders, answers grounded in the clinic's own protocols, and instant escalation of red-flag symptoms to the doctor. Patients choose with confidence; surgeons save counselling time.

> Optional: if you have a verified figure, replace "millions" with it (about 8 million a year per NPCBVI; confirm the source first).

## Tech stack & platform

**Languages:** Python, TypeScript, SQL

**Frontend:** Next.js (React) PWA for patients and a surgeon dashboard; Tailwind CSS; WhatsApp Business Cloud API

**Backend:** FastAPI (Python), REST + WebSocket, Docker

**AI / ML:**
- LLM: Azure OpenAI (GPT-4o); Llama 3 via Ollama as an offline fallback
- RAG: LangChain / LangGraph, Azure AI Search or ChromaDB, multilingual embeddings
- Speech: Azure AI Speech (STT + TTS in Kannada, Hindi, Tamil, English); AI4Bharat IndicWhisper / Bhashini as an alternative
- Lens recommendation: scikit-learn / XGBoost scoring plus clinical rules, SHAP for explanations
- Red-flag detection: fine-tuned multilingual classifier (IndicBERT / mBERT)

**Vision simulation:** Python with OpenCV and NumPy; WebGL / Three.js in the browser

**Data:** Supabase (PostgreSQL, pgvector, auth); HL7 FHIR-style JSON for patient records; mock IOLMaster biometry (CSV/JSON)

**Scheduling & notifications:** Celery + Redis; Azure Communication Services (SMS)

**Cloud & DevOps:** Microsoft Azure (Container Apps / App Service, Blob Storage, Key Vault); GitHub Actions; Langfuse for LLM monitoring

**Hardware:** Android or iOS smartphone, laptop for the surgeon dashboard. No special hardware; biometry is simulated from IOLMaster-format samples.

**Security / compliance:** role-based access, encryption at rest and in transit, designed in line with India's DPDP Act 2023, surgeon approves every recommendation.

If there's a word limit, drop Llama/Ollama, Celery/Redis and Langfuse first.

## Video link
1. Upload to YouTube, set **Visibility: Unlisted**, copy the link.
   Or: Google Drive → Share → General access: **Anyone with the link (Viewer)**.
2. Open the link in an incognito window to check it plays without a sign-in.
3. Length must be 1–3 minutes and cover: Problem, Solution & Expected Impact, Execution.
