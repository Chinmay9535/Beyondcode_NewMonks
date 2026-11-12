# Video script (about 2:55): a walkthrough of the real app

The judges want **Problem, Solution & Expected Impact, Execution** in 1–3 minutes. Everything shown here is the working product, not mock-ups.

## Before recording

- Fresh demo data: stop the API, delete `backend/drishtisaathi.db`, start again (`./scripts/dev.sh`).
- Two windows side by side:
  - **Phone view:** Chrome DevTools device toolbar (Pixel 7). Or a real Android phone on the same Wi-Fi, opening `http://<laptop-ip>:3000`, which is best for the voice and camera parts.
  - **Laptop view:** 1440×900 for the landing page, the surgeon dashboard and `/safety`.
- Open **My lens → Your own photo** once beforehand while online, so the depth model (~27 MB) is cached.
- Staff PIN: `2468`. Record at 1080p. Add captions for the Kannada and Hindi lines.
- Do one silent run first. If you're over 3:00, trim scene 6 first, then scene 4.

---

**1 · Hook (0:00–0:15) · laptop, landing page, top of the page**
Let the pillars rise, then start scrolling slowly.
> "Hi, we're team New Monks from BMSIT&M. This is DrishtiSaathi, a companion for cataract patients, built for the ZEISS Hackathon's AI-Powered Digital Experiences track."

**2 · The problem (0:15–0:35) · keep scrolling through the five chapters**
> "Every cataract patient chooses a lens that stays in their eye for life. Here, that choice often happens in a few rushed minutes, from an English brochure, in a language the family doesn't speak at home. So people pick on price, or regret what they paid for. And after surgery, clinics drown in repeat calls while real warning signs wait."

**3 · Talk, in your language (0:35–1:00) · phone, `/p/RAMESH`**
Tap agree, then the mic, and say (or paste):
*"ನಾನು ಟೈಲರ್. ಸೂಜಿಗೆ ದಾರ ಪೋಣಿಸಬೇಕು, ರಾತ್ರಿ ಸ್ಕೂಟರ್ ಓಡಿಸುತ್ತೇನೆ."*
> "Ramesh is a tailor in Mysuru. He tells it, in Kannada, that he threads needles and rides his scooter at night. It understands both, skips the questions he has already answered, and builds his day: what he looks at, how close, and for how many hours."

Answer the last two questions with the chips so the summary card appears.

**4 · The surgeon decides (1:00–1:30) · laptop, `/staff` → Kamala**
Sign in, open **Kamala**. Point at the top option, the "why" bars, the both-eyes chart, then open **Curve sources**.
> "The surgeon sees a shortlist with reasons. Kamala has macular disease and a tight budget. So the trifocal is excluded, and blended vision ranks first: one eye set slightly near, which gives reading vision at monofocal cost. Every score breaks down into exact contributions, with per-eye lens powers, and the lens curves cite published data. Nothing reaches the patient until the surgeon approves."

Go to **Ramesh** and press **Approve**.

**5 · See it before you choose (1:30–1:55) · phone, Ramesh → My lens**
Scroll to **Your own photo**, take or choose a photo of something nearby, swipe between lenses, then switch to **Night**.
> "Now Ramesh sees his own world through each lens. The phone measures the depth in his photo, on the device, and blurs every pixel by what that lens would do at that distance. At night he sees the halos around his real street lights. No brochure can show this."

**6 · Recovery, measured (1:55–2:20) · phone, `/p/ABDUL`**
Tap **Aa** and pick the biggest text, then tap the speaker on **Today's drops**. Open **Eye test**, show the first letter screen, then cut to the laptop dashboard with Abdul's urgent alert.
> "After surgery, Abdul gets his drop schedule in Hindi, with big text and read-aloud for older eyes. He can check his own vision at home with a calibrated test. If his vision drops two lines, or he types a warning sign, his surgeon gets an urgent alert within seconds."

**7 · Safety you can check (2:20–2:35) · laptop, `/safety`**
Type a message such as *"aankh mein bahut dard aur dhundhla dikh raha hai"* and show the result.
> "Every message passes a red-flag check that works without AI, in four languages, even in romanised and mixed typing. On its first held-out test it caught 97% of emergencies with no false alarms. The AI can raise an alert, never clear one."

**8 · Impact and execution (2:35–2:55) · laptop, landing page dive, or the README**
> "The impact: patients choose by how they live, not by price. Surgeons review a ready shortlist instead of repeating the same explanation. Clinics get fewer repeat calls, and warning signs reach a doctor right away. It's built and running today: a FastAPI and Next.js app with 65 tests, a published safety scorecard, and it works fully offline without an AI key, so a clinic can start on day one. Next: WhatsApp reminders and a clinician review of every language."

**9 · Close (2:55–3:00)**
> "DrishtiSaathi: see the choice clearly, before you see the world clearly again. Thank you."

---

## If something fails on camera

- **Voice doesn't start:** type the Kannada line instead. It's the same pipeline.
- **The photo simulator is slow:** use the **Street scene** tab next to it.
- **No urgent alert for Abdul:** the seeded data already has one; open `/staff/ABDUL`.
