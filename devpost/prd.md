---
doc: prd
status: approved
---

# Same Angle — Product Requirements

A phone-browser camera app for renters: it overlays each move-in photo on the live camera at move-out so every before/after pair is taken from the same angle, then turns the pairs into a printable evidence report.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
1. The renter opens the link on their phone. First screen: a home with no rooms yet and one clear action, "Add a room". A one-line promise explains the app: "Shoot move-out photos from the exact same angle as move-in."
2. They add a room ("Living room") and are in **Move-in** mode. They tap "Add spot", the camera opens, they take a photo of a wall. The photo is saved with date and time and gets a short label ("Wall by window"). They add a second spot.
3. Weeks or months later (in the demo: right away), they switch the home to **Move-out** mode. Each spot now shows its move-in thumbnail and a "Retake" state.
4. They open a spot. The live camera fills the screen with the move-in photo on top at about 50% opacity — the ghost. A match meter shows how closely the live view lines up with the ghost.
5. They move the phone. When the match passes the threshold and holds for a moment, the frame turns green, the phone vibrates (where supported), and the photo is captured automatically. A manual shutter is always available.
6. They see the pair side by side ("Before · Oct 1, 2026 9:14" / "After · Oct 23, 2026 18:02") with the match score, and can keep it or retake.
7. When spots are done, they open **Report**: a clean page with the home name, dates, and each room's before/after pairs with timestamps and match scores. "Save as PDF" opens the print dialog.
Success = a report where every pair visibly shows the same patch of wall from the same angle.

## Screens and Layout
- **Home** — home name, mode switch (Move-in / Move-out), list of rooms with progress ("2 of 3 spots retaken"), "Add a room", "Report".
- **Room** — list of spots as cards: label, move-in thumbnail, move-out thumbnail or "Not retaken yet". "Add spot" in move-in mode.
- **Camera (move-in)** — full-screen live camera, shutter, label field after capture.
- **Camera (move-out, ghost)** — full-screen live camera, ghost overlay, opacity slider, match meter, frame that turns green, manual shutter, flip between ghost and live-only.
- **Pair review** — before/after side by side (stacked on narrow phones), Keep / Retake.
- **Report** — print-ready page; on screen it has a "Save as PDF" button and a back link.
Navigation: Home → Room → Camera → Pair review → Room; Home → Report.

## Look and Feel
- A calm, trustworthy tool: think of a good banking or document-scanner app rather than a social camera.
- Dark camera screens (so the ghost and the green frame read clearly) and light, paper-like list and report screens.
- One accent color reserved for "matched" (green); neutral grays elsewhere; warning amber for "low light / low match".
- Large touch targets, one-handed use, short plain copy ("Line it up", "Matched", "Saved on this phone only").
- The report should look like a document you could hand to a landlord: dates, room headings, captions, no decoration.
- Avoid: generic AI-gradient styling, emoji-heavy UI, dashboards.
- Visual mock-ups and final styling are designed by Codex from this direction (learner's decision).

## Features and Behavior

### Rooms and spots
- Create, rename and delete rooms and spots. A spot holds one move-in photo and at most one move-out photo.
- Every photo stores capture date and time, which is printed on the photo in the report.
- As a renter, I want to label each spot so that the report says what each pair shows.
  - [ ] A new spot gets a default label ("Spot 1") that can be edited.
  - [ ] Deleting a spot asks for confirmation inside the app (no browser dialog).

### Ghost capture (the kernel)
- In move-out mode the move-in photo is drawn over the live camera at adjustable opacity (default 50%).
- A match score from 0 to 100 compares the live frame with the move-in photo several times per second and is shown as a meter.
- When the score stays above the match threshold for about half a second, the frame turns green and the photo is taken automatically.
- As a renter, I want the app to tell me when I'm lined up so that my after photo really matches.
  - [ ] Moving the camera away lowers the score; lining up raises it.
  - [ ] Auto-capture fires once per attempt, not repeatedly.
  - [ ] Manual shutter works at any score; the report shows the score either way.

### Report
- Lists every room and spot with before/after photos, timestamps and match score; spots without an after photo are marked "Not retaken".
- "Save as PDF" uses the browser's print dialog with a print layout (one or two pairs per page).

### Try without a camera
- If camera permission is denied or there is no camera, each capture screen offers "Upload a photo" instead.
- A "Try with a sample home" button on the empty Home screen loads a sample room with move-in photos, so someone opening the link on a laptop can try the ghost capture with a webcam or uploaded photo.

## States and Boundaries
- **First use** — empty home, "Add a room" and "Try with a sample home".
- **Camera permission denied** — explanation plus "Upload a photo" fallback.
- **Low light / no match** — meter stays amber with the hint "Too dark or too different — use the manual shutter".
- **Spot without move-in photo** — cannot enter ghost capture; shows "No move-in photo for this spot" and offers a normal capture.
- **Persistence** — rooms, spots and photos are kept in this browser on this phone until deleted. Nothing is uploaded. The UI says "Saved on this phone only".
- **Reset** — "Delete this home" clears everything after an in-app confirmation.

## Product Decisions
- Ghost overlay at capture time instead of side-by-side afterwards — this is what makes the pairs comparable and what nobody else does (`scope.md > The Unique Kernel`).
- Browser app, no install, no account — judges and renters can open a link; home photos stay private (`scope.md > Explicitly Cut`).
- A simple image-difference score, not AI damage detection — honest about what it proves.
- Codex designs and implements; Claude Code plans, reviews screenshots and commits (learner's working split).

## What We're Building
Home, rooms, spots, move-in capture with timestamp, move-out ghost capture with opacity, match meter and auto-shutter, pair review, printable report, upload fallback, sample home, local persistence.

## Deferred From the POC
- Sharing the report by link — needs hosting of private photos.
- Accounts and sync between phones — needs a backend.
- Drawing arrows or notes on photos — nice, but not needed to prove the kernel.

## Possible Later Enhancements
- Tamper-evident report (hash of each photo printed in the report).
- Lining up by feature points instead of pixel difference, for better matching in different light.

## Non-Goals
- Judging whether damage happened — the app shows evidence, people decide.
- Legal advice about deposits.

## Open Questions
- Match threshold value — set during the build from real test photos (can wait for build).
