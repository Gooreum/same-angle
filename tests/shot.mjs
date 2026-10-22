// Original implementation, MIT. Capture only screens implemented through slice 2.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setup, fixture, addRoom, openCamera, snapshot, restore, openMoveOut, watchAttempt } from './e2e.mjs';
const shots = fileURLToPath(new URL('../_shots/', import.meta.url));
await mkdir(shots, { recursive: true });
const states = new Map();
const sizes = [[390, 844], [1280, 800]];
async function shot(page, name, width) {
  await page.evaluate(() => Promise.all(Array.from(document.images, image => image.decode().catch(() => {}))));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: no horizontal overflow`);
  await page.screenshot({ path: `${shots}${name}-${width}.png`, fullPage: true, animations: 'disabled' });
}
const aligned = await setup(fixture('same'));
try {
  for (const [width, height] of sizes) {
    const context = await aligned.browser.newContext({ viewport: { width, height }, permissions: ['camera'] });
    const page = await context.newPage();
    await page.goto(aligned.url);
    await page.getByRole('heading', { name: 'My home', exact: true }).waitFor();
    await shot(page, 'home-empty', width);
    await addRoom(page);
    await shot(page, 'room-empty', width);
    await openCamera(page);
    await shot(page, 'capture-in', width);
    await page.getByRole('button', { name: 'Take photo', exact: true }).click();
    await page.getByRole('heading', { name: 'Name this spot', exact: true }).waitFor();
    await shot(page, 'capture-in-review', width);
    await page.getByLabel('Spot label', { exact: true }).fill('Wall by window');
    await page.getByRole('button', { name: 'Save move-in photo', exact: true }).click();
    await page.getByRole('heading', { name: 'Wall by window', exact: true }).waitFor();
    await shot(page, 'room', width);
    const state = await snapshot(page);
    states.set(width, state);
    await page.getByRole('link', { name: 'Back', exact: true }).click();
    await page.getByRole('heading', { name: 'My home', exact: true }).waitFor();
    await shot(page, 'home-list', width);
    // Freeze timers after the camera starts, then advance the real matching loop.
    // This preserves the brief green state without injecting a match score.
    await page.clock.install();
    await openMoveOut(page, state);
    await page.clock.pauseAt(new Date(Date.now() + 100));
    for (let elapsed = 0; elapsed < 3000 && !await page.locator('.viewfinder.matched').count(); elapsed += 50) {
      await page.clock.runFor(50);
    }
    assert.equal(await page.locator('.viewfinder.matched').count(), 1, 'Real matching produced a green frame');
    await shot(page, 'capture-out-matched', width);
    await page.clock.runFor(400);
    await page.getByRole('heading', { name: 'Review your pair', exact: true }).waitFor();
    await shot(page, 'pair-review', width);
    await context.close();
  }
} finally { await aligned.close(); }
const different = await setup(fixture('other'));
try {
  for (const [width, height] of sizes) {
    const context = await different.browser.newContext({ viewport: { width, height }, permissions: ['camera'] });
    const page = await context.newPage();
    await page.goto(different.url);
    const state = states.get(width);
    await restore(page, state);
    await watchAttempt(page);
    await openMoveOut(page, state);
    await page.waitForFunction(() => window.attempt.scores.length >= 4);
    assert.ok(Number(await page.locator('#match-score').getAttribute('data-score')) < 70, 'Different scene stays below the match threshold');
    await shot(page, 'capture-out', width);
    await context.close();
  }
} finally { await different.close(); }
console.log('Captured slice 1–2 screens at 390 px and 1280 px. Report screenshots start in slice 3.');
