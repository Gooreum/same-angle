// Original implementation, MIT. Capture the complete app and its edge states.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setup, fixture, addRoom, openCamera, snapshot, restore, openMoveOut, watchAttempt, sampleReportState, denyCamera } from './e2e.mjs';
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
    await page.getByRole('button', { name: 'Keep pair', exact: true }).click();
    await page.getByRole('heading', { name: 'Wall by window', exact: true }).waitFor();
    const report = await sampleReportState(await snapshot(page));
    await restore(page, report);
    await page.goto(`${aligned.url}/#/pair/${report.spots[1].id}`);
    await page.getByRole('heading', { name: 'Review your pair', exact: true }).waitFor();
    await shot(page, 'pair-review', width);
    await page.goto(`${aligned.url}/#/report`);
    await page.locator('.report-pair').first().waitFor();
    await shot(page, 'report', width);
    await page.evaluate(async () => { const store = await import('/js/store.js'); if (!await store.deleteHome()) throw new Error('Could not reset screenshot home'); });
    await page.goto(`${aligned.url}/#/`);
    await page.getByRole('button', { name: 'Try with a sample home', exact: true }).click();
    await page.getByRole('heading', { name: 'Sample home', exact: true }).waitFor();
    await shot(page, 'sample-home', width);
    await page.getByRole('button', { name: 'Delete this home', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await shot(page, 'delete-confirm', width);
    await context.close();

    const denied = await aligned.browser.newContext({ viewport: { width, height } });
    await denyCamera(denied);
    const blocked = await denied.newPage();
    await blocked.goto(aligned.url);
    await blocked.getByRole('button', { name: 'Try with a sample home', exact: true }).click();
    await blocked.getByRole('heading', { name: 'Sample home', exact: true }).waitFor();
    const sample = await snapshot(blocked);
    const wall = sample.spots.find(spot => spot.label === 'Wall by window');
    await blocked.goto(`${aligned.url}/#/capture/${wall.id}/out`);
    await blocked.getByText('Camera unavailable', { exact: true }).waitFor();
    await shot(blocked, 'camera-denied', width);
    await denied.close();
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
    assert.ok(Number(await page.locator('#match-score').getAttribute('data-score')) < 50, 'Different scene stays below the match threshold');
    await shot(page, 'capture-out', width);
    await context.close();
  }
} finally { await different.close(); }
console.log('Captured slice 1–4 screens, including sample home, camera denied, deletion, and report, at 390 px and 1280 px.');
