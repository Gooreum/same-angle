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
    const autoEnv = await setup(fixture('shift3'));
    try {
      const autoContext = await autoEnv.browser.newContext({ viewport: { width, height }, permissions: ['camera'] });
      const capturePage = await autoContext.newPage();
      await capturePage.goto(autoEnv.url);
      await restore(capturePage, state);
      // Capture the real green frame immediately, before the automatic shutter fires.
      await openMoveOut(capturePage, state);
      assert.ok(await capturePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'capture-out-matched: no horizontal overflow');
      await capturePage.waitForSelector('.viewfinder.matched');
      await capturePage.screenshot({ path: `${shots}capture-out-matched-${width}.png`, fullPage: true, animations: 'disabled' });
      await capturePage.getByRole('heading', { name: 'Review your pair', exact: true }).waitFor();
      await shot(capturePage, 'pair-review', width);
      await capturePage.getByRole('button', { name: 'Keep pair', exact: true }).click();
      await capturePage.getByRole('heading', { name: 'Wall by window', exact: true }).waitFor();
      const autoCapture = await snapshot(capturePage);
      // Retake from the shifted fake camera and keep its real manual score.
      const shifted = await setup(fixture('shift3'));
      let manualCapture;
      try {
        const shiftedContext = await shifted.browser.newContext({ viewport: { width, height }, permissions: ['camera'] });
        const manualPage = await shiftedContext.newPage();
        await manualPage.goto(shifted.url);
        await restore(manualPage, state);
        await watchAttempt(manualPage);
        await openMoveOut(manualPage, state);
        await manualPage.waitForFunction(() => window.attempt.scores.length > 0);
        assert.ok((await manualPage.evaluate(() => window.attempt.scores)).length, 'Manual screenshot capture has a measured match score');
        await manualPage.getByRole('button', { name: 'Take photo', exact: true }).click();
        await manualPage.getByRole('heading', { name: 'Review your pair', exact: true }).waitFor();
        await manualPage.getByRole('button', { name: 'Keep pair', exact: true }).click();
        await manualPage.getByRole('heading', { name: 'Wall by window', exact: true }).waitFor();
        manualCapture = await snapshot(manualPage);
        assert.equal(manualCapture.spots[0].outAuto, false, 'Manual capture retains its real method');
        await shiftedContext.close();
      } finally { await shifted.close(); }
      const report = await sampleReportState(autoCapture, manualCapture);
      await restore(capturePage, report);
      await capturePage.goto(`${autoEnv.url}/#/pair/${report.spots[1].id}`);
      await capturePage.getByRole('heading', { name: 'Review your pair', exact: true }).waitFor();
      await shot(capturePage, 'pair-review', width);
      await capturePage.goto(`${autoEnv.url}/#/report`);
      await capturePage.locator('.report-pair').first().waitFor();
      await shot(capturePage, 'report', width);
      await autoContext.close();
    } finally { await autoEnv.close(); }
    await page.evaluate(async () => { const store = await import('/js/store.js'); if (!await store.deleteHome()) throw new Error('Could not reset screenshot home'); });
    await page.goto(`${aligned.url}/#/`);
    // The home hash may already be active, so reload to render the cleared store.
    await page.reload();
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
