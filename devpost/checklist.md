---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. You can add a room and a spot and take a timestamped move-in photo**
  Becomes usable: Open the app, add a room, add a spot, take a photo with the camera (or upload one), and see it saved with date and time after a reload.
  Why now: Proves the whole path — page, router, camera, storage — that every later slice builds on.
  PRD ref: `prd.md > The Core Journey` (steps 1-2), `prd.md > Rooms and spots`
  Spec ref: `spec.md > App shell and router`, `spec.md > Store`, `spec.md > Camera`, `spec.md > File Structure`
  Build: Scaffold index.html, css, js modules; Home and Room screens; move-in capture with upload fallback; IndexedDB persistence.
  Verify (mechanical): Playwright with a fake camera adds a room and spot, captures, reloads, and finds the photo and timestamp.
  Learner check: Open on a phone, add "Living room", take one photo, reload, and see it still there.
  Commit: `Add rooms, spots and timestamped move-in capture`

- [x] **2. The move-in photo ghosts over the camera and auto-captures when lined up**
  Becomes usable: In move-out mode, opening a spot shows the move-in photo over the live camera with an opacity slider and match meter; lining up turns the frame green and takes the photo once.
  Why now: This is the kernel; it must work early.
  PRD ref: `prd.md > Ghost capture (the kernel)`, `prd.md > The Core Journey` (steps 3-6)
  Spec ref: `spec.md > Ghost capture and match`
  Build: Mode switch, move-out capture screen, match.js score loop, threshold hold, auto + manual shutter, pair review.
  Verify (mechanical): Fake camera fed the same image scores high and auto-captures; a different image stays low and does not auto-capture. Record scores in Revisions.
  Learner check: Retake a spot on a phone and watch the frame go green.
  Commit: `Add ghost overlay, match meter and auto-capture`

- [x] **3. A printable before/after report**
  Becomes usable: The Report screen lists every pair with timestamps and scores and prints cleanly to PDF.
  Why now: Turns captures into the evidence the renter actually needs.
  PRD ref: `prd.md > Report`
  Spec ref: `spec.md > Report`
  Build: report.js, print.css, "Save as PDF".
  Verify (mechanical): Playwright renders the report and prints it to PDF; PDF has one page per one or two pairs.
  Learner check: Open the report and save it as PDF.
  Commit: `Add printable before/after report`

- [x] **4. Edge states and the sample home**
  Becomes usable: Camera denied → upload; low match hint; spot with no move-in photo; delete home; "Try with a sample home".
  Why now: Lets a judge on a laptop try it and keeps real use from dead-ending.
  PRD ref: `prd.md > States and Boundaries`, `prd.md > Try without a camera`
  Spec ref: `spec.md > Important Failure Modes`
  Build: Sample photos in img/sample, sample loader, error and empty states, in-app confirmations.
  Verify (mechanical): Playwright with camera permission denied completes the journey by upload; sample home loads.
  Learner check: Open on a laptop, load the sample home, retake one spot.
  Commit: `Add sample home and camera fallbacks`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 2, screenshots of the ghost screen reviewed
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence:
Route and stops:
Edit outcome:
Reflection:
Activity mode: reference route only (source-based app map); learner's real-phone try-out still pending

## Revisions

- Final feedback 3: removed the exact-angle promise from Home. Screenshot review/report pairs now use separate same/shift3 fake-camera captures and retain app-computed scores, capture methods and actual timestamps; screenshot Date values stay fixed at the actual capture-time clock while matching timers advance. Added assertions for distinct JPEGs, measured scores, non-future timestamps and the updated Home copy. Verified with `node tests/e2e.mjs all` and `node tests/shot.mjs` (both pass). No new features or routes.

- Final feedback 2: preserved the missing move-in photo explanation when move-out capture falls back to upload, while keeping the existing fallback copy for spots with a move-in photo. Updated slice 4 assertions to check the settled camera-unavailable copy in both cases. JavaScript syntax and HTML closing structure were checked; browser regression execution remains with the reviewing agent. No routes or function names changed, so the app map remains unchanged.

- Slice 1 implementation complete: added the app shell, room/spot editing, camera/upload move-in capture, timestamped IndexedDB storage, and session photo retention with save retry. Verified with `node tests/e2e.mjs 1` (Chromium fake camera: capture, reload keeps photo and timestamp, rename, delete-cancel, upload fallback, save retry) and screenshots at 390 px and 1280 px; real-phone check still pending. Tests use Chromium's built-in fake camera for slice 1; generated sample photos and image-based Y4M fixtures remain in slices 4 and 2 respectively.

- Slice 2 implementation complete: added mode switching, adjustable ghost and live-only view, 64×48 gradient correlation at 8 Hz, threshold 70 held for 500 ms, one-shot automatic capture with green frame and optional vibration, manual capture, and keep/retake pair review. Fixed singular spot counts, the empty-home three-step explanation, and the duplicate home title. Generated the three sample JPEGs early for deterministic image-based fixtures; sample loading remains in slice 4. Added same/10%-shift/other fake-camera tests and screenshot cases. Verified with `node tests/e2e.mjs 2` (passed). Measured scores (same / 10% shift / other): 100 / 32 / 0, so threshold 70 separates lined-up from off; finer shifts and real-phone threshold tuning still to check.

- Slice 3 implementation complete: added the Report route, room/spot photo pairs with individual timestamps, capture dates, match scores and capture methods, Not retaken states, the local-only footer, and Save as PDF via window.print(). Print layout uses one complete pair per A4 page. Fixed toast dismissal on navigation and matched-state instructions. Added 3% and 5% shifted camera fixtures and five-score logging without changing threshold 70. Added slice 3 report/PDF pagination checks and report screenshots at both widths. Verified with `node tests/e2e.mjs 3` (passed; 3 pairs → 3-page PDF). Fine-shift scores (same / 3% / 5% / 10% / other): 100 / 55 / 40 / 32 / 0 — threshold 70 needs better than ~2% alignment, too strict for a handheld phone.


- Slice 4 implementation complete: added an empty-home sample loader (Living room: Wall by window and Floor corner; Kitchen: Counter & sink) with bundled photos dated 30 calendar days before loading, and in-app Delete this home confirmation/reset. Preserved camera-denied uploads through pair review and report, low-match guidance/manual shutter, and normal capture without a move-in photo; added slice 4 assertions, sequential all-slices execution, and sample-home/camera-denied/delete-confirm screenshots at both widths. Report cards no longer repeat room names; print layout targets two unsplit pairs per A4 page (three pairs → two pages). Screenshot report/review data uses distinct local scenes and ordinary labels. Completed the English README. This build checked JavaScript syntax and HTML closing structure only; browser tests, PDF pagination, screenshots, and real-phone checks remain for the reviewing agent.

- Threshold 70 → 50, based on the review measurements: same=100, shift3=55, shift5=40, shift10=32, other=0. Slice 2 now asserts automatic capture at 3% shift and no automatic capture at 5% shift. Verified with `node tests/e2e.mjs all` (slices 1–4 passed; report PDF 3 pairs → 2 pages).

- Final polish: camera-unavailable screens now hide live capture controls and offer a primary Upload a photo action, retaining a full-opacity move-in preview when available. Compacted empty-home guidance to keep the sample action directly below Add a room on the first 390×844 screen; restored the exact survey wording in README. Added devpost/app-map.html as a source-based reference route through capture, matching, pair review, and IndexedDB, with threshold-tuning evidence and the source baseline. JavaScript syntax, HTML closing structure, and map paths/symbols were checked statically; browser layout, interactions, and final map review remain for the reviewing agent. No final-review or app-map completion boxes were checked.
