---
doc: scope
status: approved
---

# Same Angle

A phone camera that overlays your move-in photo and tells you when your move-out photo lines up with it, giving you before/after proof for your deposit.

## The Unique Kernel
When you take the move-out photo, the move-in photo of the same spot floats as a semi-transparent "ghost" over the live camera. You line the ghost up, the frame turns green, and the shutter fires. A live match score tells you when the view lines up and takes the photo itself, so the before/after pair is matched at the moment of capture, not lined up by eye or later.

## Who It's For
A renter moving out of an apartment, phone in hand, walking room to room on the last day. The landlord says a scuff on the wall "wasn't there before." Today they scroll through move-in photos taken at random angles and distances, and none of them shows the same patch of wall clearly enough to settle it.

## The Core Loop
1. Move-in day: pick a room, take a photo of each spot that matters (wall, floor, appliance). Each photo is stamped with date and time.
2. Move-out day: open the same spot. The move-in photo appears as a ghost over the camera. Move the phone until they line up; a match meter fills and the frame turns green; the shutter fires (or tap it yourself).
3. Repeat for every spot, then open the report: each spot shown as a before/after pair, ready to print or save as PDF.

## Inspiration & Identity
Feels like a calm, trustworthy tool, not a toy: a clean camera viewfinder, a clear progress list of rooms, and a report that looks like something you could hand to a landlord or a deposit scheme. Plain, reassuring copy ("Line it up", "Matched").

## Why This Matters to the Learner
Losing part of a deposit is common and stressful. In a 2013 Rent.com survey of 1,000 US renters, 26% said they had lost a security deposit (via Fox Business). Most deposit apps put photos side by side afterwards. One iOS app, Deposit Shield (https://www.appharbour.com/depositshield/), also shows a faint ghost of the move-in photo, but leaves judging the alignment to your eye. Same Angle adds a live match score that takes the photo itself when you line up, prints that score in the report, and runs free in any phone browser.

## What "Working" Looks Like
On a phone browser: add a room, capture two move-in photos, switch to move-out, see the move-in photo ghosted over the live camera, line it up until the frame turns green and the photo is taken, then open the report and see both pairs side by side with timestamps.
The "oh, that's cool" beat: the ghost snapping into place and the frame going green.

## The POC Boundary
- Rooms and spots, move-in capture with timestamp
- Move-out capture with ghost overlay, opacity control, match meter, auto-shutter when matched, manual shutter
- Before/after report, printable to PDF
- Photos stay on the device (browser storage), no account, no server
- Fallback: upload a photo file when the camera is unavailable

## Later
- Sharing a report link with the landlord
- Damage notes and arrows drawn on the photo
- Multi-person inspections (landlord and tenant on separate phones)

## Explicitly Cut
- Accounts and cloud sync — not needed to prove the kernel, and photos of a home are private.
- AI damage detection — would claim more than a simple image comparison can prove.
- Native app — a phone browser can already use the camera, and judges can open a link.
