# Same Angle

A private before/after photo record for renters. Add rooms and spots, capture or upload a photo, label it, and keep its capture date and time in this browser.

## Run

From this directory, run `python3 -m http.server 8080` and open `http://localhost:8080`. There is no build step or runtime dependency. Deploy the directory as a static site, such as GitHub Pages. Camera access needs HTTPS or localhost. ES modules require HTTP serving rather than opening `index.html` as a file.

## Current build: slices 1–2

- Add, rename, and delete rooms and spots, with in-app deletion confirmation.
- Capture a move-in photo with the rear camera, or choose an image file.
- Review, label, and save a JPEG with its capture date and time.
- Restore rooms, photos, and timestamps from IndexedDB after a reload.
- Retain the session photo and offer a save retry if storage fails.

Photos stay on this phone only. There are no accounts, uploads, analytics, fonts, or external runtime requests. Browser storage can be cleared by the browser or user. An uploaded photo is timestamped when selected; this is not an assertion about its original capture time.

Switch to Move-out on Home, open a spot, and line up its 50% ghost over the live camera. Adjust opacity or hide the guide. The gradient correlation meter runs at 8 Hz. A score of at least 70 held for 500 ms turns the frame green, optionally vibrates, and takes one automatic photo. The manual shutter works at any score. Review the pair and keep it or retake; keeping saves the score, capture method, and timestamp. Uploads are marked Manual. Matching compares image structure; it does not detect damage or verify evidence authenticity.

Printable reports and the sample-home loader remain in slices 3 and 4. The three local sample photos are included early for slice 2 fixtures.

## Files

`js/app.js` handles hash navigation and screens. `js/store.js` owns IndexedDB and the session fallback. `js/camera.js` owns camera lifecycle, canvas capture, and upload decoding. `js/match.js` computes gradient zero-mean normalized cross-correlation at 64×48 and runs the threshold hold. `css/app.css` contains tokens and responsive styles.

## Verification

Syntax: `node --check js/app.js`, `node --check js/store.js`, `node --check js/camera.js`, `node --check js/match.js`, `node --check tests/e2e.mjs`, and `node --check tests/shot.mjs`.

With Playwright available, run `PW_ROOT=/path/to/playwright/project node tests/e2e.mjs 1`. The test serves the app with Node HTTP on an automatic port and uses Chromium's fake camera. It checks capture, persistence, upload fallback, and in-app deletion cancellation. `node tests/shot.mjs` saves screenshots of the implemented screens at 390×844 and 1280×800 in `_shots/`. For slice 2, run `bash tests/make-fixtures.sh` (requires ffmpeg), then `PW_ROOT=/path/to/playwright/project node tests/e2e.mjs 2`. The three 640×480, 15 fps, five-second Y4M files are ignored by Git. Same, 10% shifted, and different camera feeds each launch a separate browser. The test prints measured scores and checks auto-capture, a single draft, manual capture, pair retention, and reload persistence. `tests/shot.mjs` also captures ghost, low-match, matched, and pair review screens. These browser tests are supplied for the reviewing agent to run; they have not been executed during this build. Real iPhone Safari and Android Chrome camera behavior still needs a device check.

## Sample assets

`img/sample/wall-window.jpg`, `kitchen.jpg`, and `floor-corner.jpg` are generated photographs, 1280×960 JPEG, opaque. Created with the built-in imagegen tool. Prompts: an empty apartment wall with a window and small baseboard scuff; an empty white kitchen with a gray counter and small stain; and an oak floor corner with a small scratch. All prompts requested realistic natural daylight, no people, text, brands, logos, or watermarks. The fixtures use wall-window for same/shift and kitchen for other. These are illustrative samples, not a real inspection record.

## Credits and license

Original app code: MIT, see `LICENSE`. Inline home, plus, arrow-left, chevron-right, camera, lock, and ellipsis icons are adapted from [Lucide](https://lucide.dev), [ISC license](https://github.com/lucide-icons/lucide/blob/main/LICENSE):

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
