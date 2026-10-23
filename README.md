# Same Angle

Shoot move-out photos from the same angle as move-in, then save a dated before/after report. Photos stay in this browser on this phone.

Demo: https://gooreum.github.io/same-angle/

## The problem

In a 2013 Rent.com survey of 1,000 US renters, 26% said they had lost a security deposit. [Source: Fox Business](https://www.foxbusiness.com/features/how-renters-can-make-sure-to-get-their-deposit-back).

When a renter and landlord disagree about a mark on a wall, photos from different angles can make it hard to compare the same spot.

## The solution

Same Angle overlays the move-in photo at 50% opacity over the live move-out camera. Adjust the ghost, line up the view, and hold steady: a match score of at least 50 for 500 ms turns the frame green and triggers one automatic capture. The manual shutter works at any score. The report groups before/after pairs by room, with timestamps, match scores, and Auto-matched or Manual labels.

There are no accounts, cloud uploads, analytics, external fonts, or external runtime services. Choosing “Upload a photo” reads a local image file; it sends nothing to a server. Matching compares image structure; it does not detect damage.

## Try it in 30 seconds

1. On the empty Home screen, choose **Try with a sample home**. It loads Living room (Wall by window, Floor corner) and Kitchen (Counter & sink), with move-in dates 30 days earlier.
2. Open Living room and choose **Retake**. Allow the camera, line up the ghost, or use **Upload a photo** if the camera is unavailable.
3. Choose **Keep pair**, go back Home, open **Report**, and choose **Save as PDF**. Select Save as PDF in the browser print options.

For your own record, start with **Add a room** in Move-in mode and photograph each spot. Switch to Move-out when you return. Rename rooms and spots with their options menu. **Delete this home** asks for confirmation inside the app.

## Architecture

Plain HTML, CSS, and JavaScript ES modules; no framework, bundler, or runtime dependencies.

| File | Responsibility |
| --- | --- |
| `index.html` | Entry page, app container, dialog, and toast. |
| `js/app.js` | Hash routes, screens, capture reviews, confirmations, and navigation. |
| `js/store.js` | IndexedDB records and photo blobs, session fallback, sample loading, and home deletion. |
| `js/camera.js` | Rear-camera lifecycle, canvas JPEG capture, and local image decoding. |
| `js/match.js` | 64×48 gradient correlation at 8 Hz, threshold 50, and 500 ms hold. |
| `js/report.js` | Escaped report markup, dated photo pairs, scores, methods, and missing-photo states. |
| `css/app.css` | Design tokens, phone layout, 480 px desktop column, and accessible controls. |
| `css/print.css` | A4 report, two pairs per page, and protection against splitting a pair. |
| `img/sample/` | Three bundled sample JPEGs. |
| `tests/e2e.mjs` | Node HTTP test server and Playwright checks for slices 1–4. |
| `tests/make-fixtures.sh` | FFmpeg generation of five deterministic fake-camera streams. |
| `tests/shot.mjs` | Screenshots of primary screens and edge states at 390×844 and 1280×800. |
| `devpost/` | Approved product scope, requirements, technical spec, and build checklist. |
| `LICENSE` | MIT license for original app code. |

## Run and test

Serve this directory over HTTP; opening the HTML as a local file does not support its modules. Camera access requires HTTPS or localhost.

```sh
python3 -m http.server 8080
# Open http://localhost:8080
```

Deploy this directory as a static site (for example, GitHub Pages); there is no build step.

Syntax checks:

```sh
for file in js/*.js tests/*.mjs; do node --check "$file" || exit; done
```

Install Playwright and Chromium in your development environment. Set `PW_ROOT` to that project's directory if Playwright is not installed locally. FFmpeg is required to generate the ignored Y4M fixtures.

```sh
bash tests/make-fixtures.sh
PW_ROOT=/path/to/playwright/project node tests/e2e.mjs 1
PW_ROOT=/path/to/playwright/project node tests/e2e.mjs 2
PW_ROOT=/path/to/playwright/project node tests/e2e.mjs 3
PW_ROOT=/path/to/playwright/project node tests/e2e.mjs 4
PW_ROOT=/path/to/playwright/project node tests/e2e.mjs all
PW_ROOT=/path/to/playwright/project node tests/shot.mjs
```

The test server uses Node's built-in HTTP module on an automatic port. Slice 1 checks camera capture, reload persistence, editing, upload, and saving after a storage failure. Slice 2 prints same/3%/5%/10%/different match scores and asserts one automatic capture for same and 3%, and no automatic capture for 5%, 10%, and different scenes. Slice 3 checks report content, print invocation, and a two-page PDF for three pairs. Slice 4 checks the camera-denied upload journey through a report, sample dates and persistence, low-match manual capture, normal capture without a move-in photo, and deletion/cancellation.

`all` runs slices 1, 2, 3, and 4 in order. Screenshots and `report.pdf` go in `_shots/`. Browser checks and screenshots are prepared for the reviewing agent to execute; they were not run in this slice's implementation pass.

## Limitations

- Pixel comparison can score low when lighting changes greatly, even at the same angle. Use the amber guidance and manual shutter.
- Threshold 50 is based on fixture measurements (same 100, 3% shift 55, 5% shift 40, 10% shift 32, different 0). Real-phone threshold fine-tuning and iPhone Safari/Android Chrome device checks remain pending.
- Records live in one browser only. Clearing browser data, switching browsers or phones, or private browsing can remove access. There is no cloud backup.
- If saving fails, the app says “Couldn't save on this phone” and keeps photos in the session for retry. Reloading before a successful retry can lose unsaved data.
- Upload timestamps record when the image was selected, not its original capture time. Photos and timestamps are not tamper-evident.
- PDF output uses the browser print dialog. Paper settings and browser behavior can affect pagination.
- The app needs its static files available to open; there is no service worker for a fresh offline launch. Once loaded, camera capture, local storage, and reporting need no network. The sample loader needs access to its bundled JPEGs.

## Built with

Devpost Learn skill pack, Claude Code, and Codex. Browser APIs provide camera access, Canvas, IndexedDB, optional vibration, and printing.

## Sample assets

`img/sample/wall-window.jpg`, `floor-corner.jpg`, and `kitchen.jpg` are existing imagegen-created illustrative photographs: 1280×960 JPEG, opaque, with no people, text, logos, or brands. They show an empty wall and window with a baseboard scuff, a floor corner with a scratch, and a counter with a small stain. They are sample scenes, not a real inspection record.

## License

Original app code: MIT, see `LICENSE`. Inline home, plus, arrow-left, chevron-right, camera, lock, and ellipsis icons are adapted from [Lucide](https://lucide.dev), [ISC license](https://github.com/lucide-icons/lucide/blob/main/LICENSE):

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
