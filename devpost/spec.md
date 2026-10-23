---
doc: spec
status: approved
---

# Same Angle — Technical Spec

## How This Works, In Plain Language
Same Angle is a small website that runs entirely in the phone's browser.
- The **page** shows the screens (home, room, camera, pair review, report).
- The **camera** comes from the browser's built-in camera access. A canvas grabs still frames from it.
- The **ghost** is just the move-in photo drawn on top of the live camera with transparency.
- The **match meter** shrinks the live frame and the move-in photo to a tiny grayscale picture (64×48) and measures how similar the two are, several times a second. Similar enough for half a second → take the photo.
- The **storage** is the browser's own database (IndexedDB) on the phone. Nothing is sent anywhere.
- The **report** is a normal web page with a print layout, so "Save as PDF" is the browser's print dialog.
No server, no account, no build step: that keeps photos of someone's home private and lets anyone open the link.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. Open link → `index.html` loads `js/app.js` → `store.js` reads the home from IndexedDB → empty Home screen.
2. Add room / add spot → `store.js` saves records → Camera (move-in) → `camera.js` starts the rear camera → shutter → canvas frame → JPEG blob + timestamp saved to the spot.
3. Switch to Move-out → home `mode` saved → Room screen shows spots needing a retake.
4. Open spot → Camera (move-out) → `camera.js` live video + `<img>` ghost on top → `match.js` compares frames ~8 times a second → meter updates.
5. Score ≥ threshold for 500 ms → auto-capture once → after-photo blob + timestamp + score saved → Pair review.
6. Report → `report.js` renders every pair with timestamps and scores → `window.print()` with print CSS.

## Stack
- Plain HTML, CSS and JavaScript ES modules. No framework or bundler. Rationale: a handful of screens, and the app must open from GitHub Pages with no build.
- Browser APIs: `navigator.mediaDevices.getUserMedia` (MDN: https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia), Canvas 2D, IndexedDB, `navigator.vibrate` where supported, `window.print`.
- Icons: inline SVG from Lucide (ISC license, credited in README).
- Font: system UI font stack (no download needed).
- Tests: Playwright (Chromium) driving the app with a fake camera stream; run from `tests/`.
- Still unverified: iOS Safari and Android Chrome camera behaviour on a real phone (needs HTTPS — GitHub Pages provides it).

## Where It Runs and How Someone Tries It
- Runtime: any modern phone or desktop browser. Camera needs HTTPS or `localhost`.
- Local: `python3 -m http.server 8080` in the repo root, then open `http://localhost:8080`.
- Public: GitHub Pages from the `main` branch root of the public repo.
- Demo recording: real phone, real room, screen recording of the full journey.

## Look and Feel
From `prd.md > Look and Feel`. Calm, trustworthy, document-like. Dark camera screens, light paper-like list and report screens. Neutral grays plus one green that only means "matched", amber for "low match". Large touch targets (≥44 px), one-handed layout, short plain copy. Report styled as a plain inspection document. Codex owns the visual design within this direction.

## Components

### App shell and router (`js/app.js`)
Hash routes: `#/`, `#/room/:id`, `#/capture/:spotId/in`, `#/capture/:spotId/out`, `#/pair/:spotId`, `#/report`. Renders screens, handles back navigation and `pageshow`.
PRD ref: `prd.md > Screens and Layout`.

### Store (`js/store.js`)
IndexedDB wrapper: one `home` record, `rooms`, `spots`, and photo blobs. Also `loadSample()` and `deleteHome()`.
PRD ref: `prd.md > States and Boundaries`.

### Camera (`js/camera.js`)
Starts/stops the rear camera (`facingMode: environment`), grabs frames to canvas, encodes JPEG, handles permission errors and offers the upload fallback.
PRD ref: `prd.md > Try without a camera`.

### Ghost capture and match (`js/match.js`)
`score(liveCanvas, ghostImage) → 0..100`: draw both to 64×48, convert to grayscale, compute zero-mean normalized cross-correlation on gradient magnitude (less sensitive to lighting), map to 0–100. A loop at ~8 fps updates the meter; `THRESHOLD` (50, lowered from 70 after fixture measurements — see `checklist.md > Revisions`) held 500 ms triggers one capture.
PRD ref: `prd.md > Ghost capture (the kernel)`.

### Report (`js/report.js`, `css/print.css`)
Renders rooms → spots → before/after with timestamps and score; print CSS hides UI chrome and keeps pairs on one page.
PRD ref: `prd.md > Report`.

## Data Model
- `home`: `{ id, name, mode: 'in'|'out', createdAt }`
- `room`: `{ id, homeId, name, order }`
- `spot`: `{ id, roomId, label, order, inPhotoId, inAt, outPhotoId, outAt, outScore, outAuto }`
- `photo`: `{ id, blob (image/jpeg), width, height }`
All live in IndexedDB in this browser. Updated on each save; reloaded on every screen open, so leaving and coming back shows the same state.

## File Structure
```
same-angle/
├── index.html          # app entry
├── css/app.css         # screens
├── css/print.css       # report print layout
├── js/app.js           # router + screens
├── js/store.js         # IndexedDB
├── js/camera.js        # camera + upload fallback
├── js/match.js         # ghost match score
├── js/report.js        # report rendering
├── img/sample/         # sample-home move-in photos (generated, no people/logos)
├── tests/e2e.mjs       # Playwright journey test with fake camera
├── devpost/            # Devpost learning workspace
├── README.md
└── LICENSE             # MIT
```

## External Services and Dependencies
None at runtime. GitHub Pages for hosting (free). Playwright for tests only (dev).

## Important Failure Modes
- **Camera blocked or missing** → message plus "Upload a photo".
- **Dark room or very different scene, score never reaches threshold** → amber meter, hint, manual shutter.
- **Storage full or private browsing wipes data** → error toast "Couldn't save on this phone", photo kept on screen so the user can retry.

## What Was Simplified and Why
- **Pixel-similarity score** instead of feature-point alignment — enough to tell "lined up" from "not", runs on any phone. The fuller version would use feature matching (e.g. ORB) to also suggest which way to move.
- **Print to PDF** instead of generating a PDF file — the browser already does it well.
- **One home per browser** instead of multiple homes/accounts — the POC proves one move.

## Decisions and Open Issues
- Codex designs and implements each slice from this spec; Claude Code verifies with Playwright screenshots and commits (learner's working split).
- Uncertainty: will a 64×48 gradient score separate "lined up" from "slightly off" in real rooms? Investigation in slice 2: fake-camera test with the same image (expect high), shifted image (expect lower), different image (expect low); record numbers in Revisions.
- Open: final `THRESHOLD` value.
