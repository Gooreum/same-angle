# Same Angle

A private move-in photo record for renters. Add rooms and spots, capture or upload a photo, label it, and keep its capture date and time in this browser.

## Run

From this directory, run `python3 -m http.server 8080` and open `http://localhost:8080`. There is no build step or runtime dependency. Deploy the directory as a static site, such as GitHub Pages. Camera access needs HTTPS or localhost. ES modules require HTTP serving rather than opening `index.html` as a file.

## Current build: slice 1

- Add, rename, and delete rooms and spots, with in-app deletion confirmation.
- Capture a move-in photo with the rear camera, or choose an image file.
- Review, label, and save a JPEG with its capture date and time.
- Restore rooms, photos, and timestamps from IndexedDB after a reload.
- Retain the session photo and offer a save retry if storage fails.

Photos stay on this phone only. There are no accounts, uploads, analytics, fonts, or external runtime requests. Browser storage can be cleared by the browser or user. An uploaded photo is timestamped when selected; this is not an assertion about its original capture time.

Move-out matching, pair review, printable reports, and sample-home photos are reserved for the next checklist slices. This build does not implement them.

## Files

`js/app.js` handles hash navigation and screens. `js/store.js` owns IndexedDB and the session fallback. `js/camera.js` owns camera lifecycle, canvas capture, and upload decoding. `css/app.css` contains tokens and responsive styles.

## Verification

Syntax: `node --check js/app.js`, `node --check js/store.js`, `node --check js/camera.js`, `node --check tests/e2e.mjs`, and `node --check tests/shot.mjs`.

With Playwright available, run `PW_ROOT=/path/to/playwright/project node tests/e2e.mjs 1`. The test serves the app with Node HTTP on an automatic port and uses Chromium's fake camera. It checks capture, persistence, upload fallback, and in-app deletion cancellation. `node tests/shot.mjs` saves screenshots of the slice 1 screens at 390×844 and 1280×800 in `_shots/`. These browser tests are supplied for the reviewing agent to run; they have not been executed during this build. Real iPhone Safari and Android Chrome camera behavior still needs a device check.

## Credits and license

Original app code: MIT, see `LICENSE`. Inline home, plus, arrow-left, chevron-right, camera, lock, and ellipsis icons are adapted from [Lucide](https://lucide.dev), [ISC license](https://github.com/lucide-icons/lucide/blob/main/LICENSE):

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
