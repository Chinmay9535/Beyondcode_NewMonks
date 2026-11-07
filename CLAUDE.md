# DrishtiSaathi: ZEISS hackathon pitch

Context for Claude Code. Read this before changing anything.

## The project

- **Event:** ZEISS hackathon. Stream: *AI-Powered Digital Experiences* (conversational AI, personalized recommendations, intelligent search, customer support automation).
- **Team:** BMSIT&M, Bengaluru (team name is typed in on the site; see "Editable fields").
- **Idea:** DrishtiSaathi ("vision companion"). A voice-first, multilingual AI assistant for cataract patients in India:
  - **Before surgery:** talks to the patient in Kannada, Hindi or Tamil about daily life (reading, night driving, screens, hobbies). Combines that with eye measurements (IOLMaster-style biometry) and ranks intraocular lens (IOL) types into a shortlist. The surgeon approves the final choice.
  - **Vision preview:** simulated "how you will see" comparison for each lens type.
  - **After surgery:** eye-drop reminders, answers grounded only in the clinic's own post-op protocols (RAG with citations), and red-flag symptoms sent straight to the doctor.
  - **Safety lines we keep everywhere:** never diagnoses, surgeon in the loop, every answer cites a clinic source, DPDP Act 2023 aware.
- **Submission needs** (Microsoft Form): a 150–200 word idea description, a tech-stack list, and a public link to a 1–3 minute video covering Problem, Solution & Expected Impact, and Execution. Drafts of all three are in `docs/`.

## What's in this folder

```
CLAUDE.md                 this file
README.md                 human quick start
docs/submission-form.md   final form answers (description, tech stack)
docs/video-script.md      narration timed to the 11 site scenes
prebuilt/drishtisaathi-site.html     current build, single self-contained file
prebuilt/drishtisaathi-v1-vanilla.html  older hand-written GSAP version (reference only)
site/                     source of the current site (Vite + React 19 + Tailwind v4)
```

## The site (`site/`)

A presenter website the team screen-records for the video, with their webcam overlaid in the bottom-right corner.

```bash
cd site
npm install
npm run dev      # http://localhost:5173
npm run build    # writes dist/index.html, a single file with all JS/CSS inlined (vite-plugin-singlefile)
```

### Stack
Vite 5, React 19, Tailwind CSS v4 (`@tailwindcss/vite`), GSAP + ScrollTrigger, Lenis smooth scroll, motion (framer-motion v12), ogl (WebGL). `@/` resolves to `src/`.

### File map
- `src/App.tsx`: every scene, the presenter controls (`Presenter`), the bento visuals, the AnimatedBeam architecture diagram (`Arch`), the defocus chart (`Defocus`) and the phone chat (`Phone`).
- `src/Simulator.tsx`: the vision simulator. It draws a night street plus a near "medicine card" on canvas, then applies per-lens CSS filters and halo layers, with a drag-to-compare slider. The lens modes and their text rows are in `MODES`.
- `src/index.css`: design tokens (`:root`), presenter chrome (camera guide, HUD, dots), simulator and chart styles.
- `src/rb/`: React Bits components (reactbits.dev), copied **verbatim** from github.com/DavidHDev/react-bits. License: MIT + Commons Clause (`LICENSE-react-bits.md`). Fine to use in this site; don't sell or redistribute the components themselves.
- `src/magicui/`: Magic UI components (magicui.design), copied **verbatim** from github.com/magicuidesign/magicui. MIT (`LICENSE-magic-ui.md`).
- `src/lib/utils.ts`: the `cn()` helper Magic UI expects.

**Rule:** don't edit files in `src/rb/` or `src/magicui/`. Customise them through props or wrapper markup in `App.tsx`. The user explicitly wanted real copy-paste components from these libraries, not hand-written look-alikes. To add another one, copy it verbatim from the library repo or site into the same folder.

### Scenes (in order) and the components used

| # | id | Scene | Components |
|---|----|-------|-----------|
| 1 | intro | Hero | EvilEye (bg), ShinyText, BlurText, RotatingText |
| 2 | problem | Problem statement | ScrollReveal (scrubbed by scroll) |
| 3 | gaps | Where it breaks | SpotlightCard ×4, BlurText |
| 4 | lenses | Four lens types | CardSwap (lens cards), custom `Defocus` SVG chart |
| 5 | solution | Meet DrishtiSaathi | Magic UI Iphone + AnimatedList (Kannada chat), CurvedLoop (languages) |
| 6 | features | One assistant, four jobs | MagicBento with custom visuals |
| 7 | simulator | See before you choose | custom `Simulator` |
| 8 | impact | Expected impact | table + BlurText |
| 9 | build | Architecture | Magic UI AnimatedBeam |
| 10 | roadmap | Build plan | cards + Magic UI BorderBeam |
| 11 | close | Thank you | LightRays (bg), GradientText |

Global: ClickSpark (sparks on click), Magic UI ScrollProgress (top bar).

### Presenter controls (keep these working)
→ / Space / PageDown: next stop. ← / PageUp: previous. A "stop" is each scene's top, plus an extra stop at the bottom of any scene taller than the viewport. C: toggle the dashed camera guide circle. V: move the guide (right → centre → left; the HUD moves out of its way). H: hide HUD and dots. F: fullscreen. Home: back to top. The arrow keys on the simulator slider are captured by the slider, not the page.

### Editable fields
Team name (`data-edit="team"`, shown in scenes 1 and 11) and member names (`data-edit="members"`) are `contentEditable` and saved to `localStorage` keys `ds-team` / `ds-members`. The camera guide position is saved as `ds-cam`.

### Design rules
- Black stage, accent `#FF6F37` (matches EvilEye), cool secondary `#7DD3FC`, warning `#FB7185`.
- Fonts (Google Fonts, linked in `index.html`): Geist (UI), Geist Mono (labels), Instrument Serif italic (accent words), Noto Sans Kannada / Devanagari / Tamil / Telugu / Malayalam / Bengali for Indic scripts.
- Scenes are `min-height: 100vh` with extra bottom padding (`--cam`) so nothing important sits under the webcam in the bottom-right.
- Target recording size: 1920×1080, Chrome, fullscreen.
- Copy rules: plain, specific sentences. No invented statistics. Impact is labelled "expected". The only hard stat used is "Cataract is the leading cause of blindness in India" (National Blindness & Visual Impairment Survey 2015–19). The simulator and defocus curves are labelled illustrative.

## Known issues / next steps
1. **Features bento (scene 6):** the two 1×1 cards ("Intelligent search", "Support automation") are cramped at 1600×900. Options: raise `rowHeight`, or switch to `columns={3}` with different spans.
2. **Impact table (scene 8)** is taller than a 900px viewport and runs under the HUD. A second stop already exists; consider tightening row padding.
3. **Phone chat (scene 5):** the last shortlist card can clip at the bottom of the screen on short viewports. Reduce bubble padding or the phone height (`min(640px,66vh)`).
4. The Kannada lines were written without a native-speaker check. Have a teammate confirm them.
5. **Public hosting:** to share the site outside claude.ai, deploy `site/` to Vercel or Netlify (framework: Vite, build `npm run build`, output `dist`), or put `dist/index.html` on GitHub Pages.
6. **Optional:** record the video straight from the site with OBS (browser capture + webcam source, cropped to a circle).

## Earlier version
`prebuilt/drishtisaathi-v1-vanilla.html` is the first hand-written version (vanilla JS + GSAP from a CDN; open it in a browser). The user rejected it as looking "AI generated", which is why v2 uses library components. Keep it only for reference; v2 is the source of truth. The v1 ideas that carried over: the camera safe zone, keyboard stepping, the vision simulator and the defocus chart.
