---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [ ] **1. You can add a room and a spot and take a timestamped move-in photo**
  Becomes usable: Open the app, add a room, add a spot, take a photo with the camera (or upload one), and see it saved with date and time after a reload.
  Why now: Proves the whole path — page, router, camera, storage — that every later slice builds on.
  PRD ref: `prd.md > The Core Journey` (steps 1-2), `prd.md > Rooms and spots`
  Spec ref: `spec.md > App shell and router`, `spec.md > Store`, `spec.md > Camera`, `spec.md > File Structure`
  Build: Scaffold index.html, css, js modules; Home and Room screens; move-in capture with upload fallback; IndexedDB persistence.
  Verify (mechanical): Playwright with a fake camera adds a room and spot, captures, reloads, and finds the photo and timestamp.
  Learner check: Open on a phone, add "Living room", take one photo, reload, and see it still there.
  Commit: `Add rooms, spots and timestamped move-in capture`

- [ ] **2. The move-in photo ghosts over the camera and auto-captures when lined up**
  Becomes usable: In move-out mode, opening a spot shows the move-in photo over the live camera with an opacity slider and match meter; lining up turns the frame green and takes the photo once.
  Why now: This is the kernel; it must work early.
  PRD ref: `prd.md > Ghost capture (the kernel)`, `prd.md > The Core Journey` (steps 3-6)
  Spec ref: `spec.md > Ghost capture and match`
  Build: Mode switch, move-out capture screen, match.js score loop, threshold hold, auto + manual shutter, pair review.
  Verify (mechanical): Fake camera fed the same image scores high and auto-captures; a different image stays low and does not auto-capture. Record scores in Revisions.
  Learner check: Retake a spot on a phone and watch the frame go green.
  Commit: `Add ghost overlay, match meter and auto-capture`

- [ ] **3. A printable before/after report**
  Becomes usable: The Report screen lists every pair with timestamps and scores and prints cleanly to PDF.
  Why now: Turns captures into the evidence the renter actually needs.
  PRD ref: `prd.md > Report`
  Spec ref: `spec.md > Report`
  Build: report.js, print.css, "Save as PDF".
  Verify (mechanical): Playwright renders the report and prints it to PDF; PDF has one page per one or two pairs.
  Learner check: Open the report and save it as PDF.
  Commit: `Add printable before/after report`

- [ ] **4. Edge states and the sample home**
  Becomes usable: Camera denied → upload; low match hint; spot with no move-in photo; delete home; "Try with a sample home".
  Why now: Lets a judge on a laptop try it and keeps real use from dead-ending.
  PRD ref: `prd.md > States and Boundaries`, `prd.md > Try without a camera`
  Spec ref: `spec.md > Important Failure Modes`
  Build: Sample photos in img/sample, sample loader, error and empty states, in-app confirmations.
  Verify (mechanical): Playwright with camera permission denied completes the journey by upload; sample home loads.
  Learner check: Open on a laptop, load the sample home, retake one spot.
  Commit: `Add sample home and camera fallbacks`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2, screenshots of the ghost screen reviewed
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence:
Route and stops:
Edit outcome:
Reflection:
Activity mode:

## Revisions
