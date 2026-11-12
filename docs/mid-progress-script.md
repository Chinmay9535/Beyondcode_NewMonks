# Mid-progress presentation: DrishtiSaathi (about 5 minutes + Q&A)

Format: talk + live demo. Three speakers (**A** problem & vision, **B** patient demo, **C** surgeon side & tech); one person can do all of it.
Everything shown is the working app. Numbers here match the repository on 12 Nov 2026.

## Before you start (10 minutes earlier)

- Fresh demo data: stop the API, delete `backend\drishtisaathi.db`, start backend and web again.
- Voice: start `tts-local\server.py` and check http://127.0.0.1:8010/health. **If it isn't working, use Microsoft Edge** for the demo (it has natural Kannada/Hindi voices built in), or present with sound off.
- Tabs ready: landing page `http://localhost:3000` · phone view of `/p/RAMESH` (Chrome DevTools, Pixel 7) · `/staff` signed in (PIN 2468) · `/safety`.
- Open **My lens → Your own photo** once while online, so the depth model is cached. Have one photo ready (a newspaper or sewing table).
- Mute notifications. Zoom the browser to 110–125% for the room.

---

## 1 · Hook (0:00–0:30) · A · landing page, scroll slowly

> "Imagine you're sixty-two, a tailor in Mysuru, and your doctor says you need cataract surgery. You have to choose a lens that stays in your eye for the rest of your life. Monofocal, EDOF, trifocal, toric. The brochure is in English. The counselling slot is ten minutes. Most people just pick on price, and some regret it for years."

> "We're team [name] from BMSIT&M. This is **DrishtiSaathi**, a companion for the cataract journey, built for the AI-Powered Digital Experiences stream."

## 2 · What we're solving (0:30–1:00) · A · keep scrolling the five chapters

> "Three gaps. One: the lens choice is made without knowing how the patient actually lives. Two: patients can't picture what each lens will do for them. Three: after surgery, clinics are flooded with repeat calls about drops and pain, while real warning signs wait in the queue."

> "DrishtiSaathi talks to the patient in Kannada, Hindi, Tamil or English, turns their day into a lens plan the surgeon approves, shows them their own world through each lens, and stays with them through recovery."

## 3 · Demo: the patient talks (1:00–1:50) · B · phone view, `/p/RAMESH`

Tap **agree**, then the mic (or type) in Kannada:
*"ನಾನು ಟೈಲರ್. ಸೂಜಿಗೆ ದಾರ ಪೋಣಿಸಬೇಕು, ರಾತ್ರಿ ಸ್ಕೂಟರ್ ಓಡಿಸುತ್ತೇನೆ."*

> "Ramesh says he's a tailor who threads needles and rides his scooter at night. The assistant understands both, near work and night driving, and skips the questions he's already answered. Every answer becomes an activity: how close, how much detail, how many hours, day or night."

Answer the remaining questions with the chips until the summary card appears.

> "It also reads everything aloud in his language and has big-text and high-contrast modes. Our users are older and have cataracts, so that matters."

## 4 · Demo: the surgeon decides (1:50–2:50) · C · laptop, `/staff`

Show the dashboard for two seconds, then open **Kamala**.

> "The surgeon sees a summary first. Kamala has macular disease and is cost-sensitive. So the trifocal is excluded, and **blended vision** ranks first: one eye set slightly for near, which gives reading vision at monofocal cost."

Point at the stat tiles, then the **reasons** chips, then open **Lens plan** and expand one row.

> "Every score breaks down into exact reasons. Here, cost helps and the gap between the eyes costs a little. We compute per-eye lens power with SRK/T and check for astigmatism. The lens curves are anchored to published figures for ZEISS AT LARA and AT LISA tri, and the sources are shown right here."

Go to **Ramesh**, press **Approve**.

> "Nothing reaches the patient until the surgeon approves. This is decision support, not a diagnosis."

## 5 · Demo: see it before you choose (2:50–3:30) · B · phone, Ramesh → **My lens**

Scroll to **Your own photo**, pick the photo, swipe between lenses, switch to **Night**.

> "Now Ramesh sees his own world through each lens. A depth model runs on the phone, measures how far everything in his photo is, and blurs each pixel by what that lens would do at that distance. At night he sees halos around real lights. The photo never leaves his phone."

## 6 · Demo: recovery and safety (3:30–4:10) · C · `/p/ABDUL`, then `/staff/ABDUL`, then `/safety`

> "Abdul is three days after surgery. His app shows the next drop, today's progress and a home vision test calibrated with a credit card. If his vision drops two lines, his surgeon gets an urgent alert."

Switch to `/staff/ABDUL` and show the urgent alert. Then on `/safety` type: *"aankh mein bahut dard aur dhundhla dikh raha hai"*

> "Every patient message passes a red-flag check that works without AI, in four languages, including romanised and mixed typing. On its first held-out test of 85 messages it caught 97% of emergencies with no false alarms. And the AI can raise an alert but never clear one."

## 7 · Progress so far and what's next (4:10–4:50) · A

> "Where we are at mid-point: the full patient and surgeon journey works end to end. We have 74 automated tests, a safety and Q&A scorecard on 235 labelled cases, and a browser test of the whole journey. It runs fully offline without any AI key, and the voices can run on an open-source Indian-language model on a laptop GPU, free and private."

> "Next: a native-speaker and clinician review of every Kannada, Hindi and Tamil line and every safety case; a fresh held-out safety set written by people outside our team; drop reminders on WhatsApp; and a clinic outcomes page showing how close predicted vision is to the real result."

## 8 · Close (4:50–5:00) · A

> "DrishtiSaathi: so every patient sees the choice clearly, before they see the world clearly again. Thank you, happy to take questions."

---

## Likely questions (short answers)

**Is this a medical device? Is it safe?**
It's decision support for the surgeon, not a diagnosis. The surgeon approves every plan before the patient sees it. Safety alerts use rules we measure on held-out cases, and the AI can only raise an alert, never clear one.

**Where does the AI actually come in?**
Understanding free speech in four languages (with an LLM when available, a multilingual lexicon offline), the on-device depth model for the photo simulator, the voices, and grounded answers from the clinic's own guides with citations. The lens ranking itself is a transparent model, so every score can be explained.

**How accurate are the lens predictions?**
The curves pass through published figures for ZEISS lenses, but they are not full published tables yet; the clinic should load its validated data. After the first eye, the real result refines the second eye's plan by half the prediction error, as in published second-eye studies.

**Why should we trust 97%?**
Because we measured it on a held-out set written before tuning and published the misses. We also say its limit: our team wrote the cases, so a set written by native speakers and clinicians is our next step.

**What about privacy (DPDP Act)?**
Consent comes before the first question; the patient can delete all their data; photos are processed on the phone; and voices can run locally on clinic hardware.

**Does it need internet or paid AI?**
No. Everything works offline on rules and curated text. An LLM or cloud voice only improves it when available.

**What does a clinic need to adopt it?**
A laptop for the dashboard, the patient's phone, and the clinic's own lens list, drop protocol and guides, which are plain editable files.

**Why these four languages?**
Our pilot region is Karnataka and its neighbours. Adding a language means adding phrases and guide translations, not changing the engine.

## If the demo breaks

- Voice silent → keep going; say "it also reads aloud" and move on.
- Photo simulator slow → use the **Street scene** tab.
- Anything else → refresh; the seeded patients (Ramesh, Kamala, Lakshmi, Abdul) are always there after a restart.
