// Original implementation, MIT. Playwright is used only for development tests.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = createRequire(process.env.PW_ROOT ? process.env.PW_ROOT + '/' : import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const fixture = name => resolve(root, 'tests', 'fixtures', `${name}.y4m`);
export async function setup(fakeVideo = process.env.FAKE_VIDEO) {
  const server = createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
      if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
      const bytes = await readFile(file);
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' }[extname(file)] || 'application/octet-stream';
      response.writeHead(200, { 'Content-Type': mime }); response.end(bytes);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    if (fakeVideo) await readFile(resolve(fakeVideo));
    browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', ...(fakeVideo ? [`--use-file-for-fake-video-capture=${resolve(fakeVideo)}`] : [])] });
  } catch (error) { server.close(); throw error; }
  return { browser, url: `http://127.0.0.1:${server.address().port}`, close: async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); } };
}
export async function addRoom(page) {
  await page.getByRole('button', { name: 'Add a room', exact: true }).click();
  await page.getByLabel('Room name', { exact: true }).fill('Living room');
  await page.getByRole('button', { name: 'Add room', exact: true }).click();
  await page.getByRole('heading', { name: 'Living room', exact: true }).waitFor();
}
export async function openCamera(page) {
  await page.getByRole('button', { name: 'Add spot', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2 && !document.querySelector('.shutter')?.disabled);
}
export async function takePhoto(page, label = 'Wall by window') {
  await page.getByRole('button', { name: 'Take photo', exact: true }).click();
  await page.getByLabel('Spot label', { exact: true }).fill(label);
  await page.getByRole('button', { name: 'Save move-in photo', exact: true }).click();
  await page.getByRole('heading', { name: label, exact: true }).waitFor();
}
// Transfer the actual camera JPEG and records between isolated fake-video browsers.
export async function snapshot(page) {
  return page.evaluate(async () => {
    const request = indexedDB.open('same-angle', 1);
    const db = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const records = await Promise.all(['home', 'rooms', 'spots', 'photos'].map(name => new Promise((resolve, reject) => {
      const request = db.transaction(name).objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    })));
    db.close();
    const state = { home: records[0][0], rooms: records[1], spots: records[2], photos: records[3] };
    return { ...state, photos: await Promise.all(state.photos.map(async photo => ({ ...photo, blob: Array.from(new Uint8Array(await photo.blob.arrayBuffer())) }))) };
  });
}
export async function restore(page, state) {
  await page.evaluate(async state => {
    const store = await import('/js/store.js');
    Object.assign(store.current(), state, { photos: state.photos.map(photo => ({ ...photo, blob: new Blob([new Uint8Array(photo.blob)], { type: 'image/jpeg' }) })) });
    if (!await store.save()) throw new Error('Unable to restore camera-captured test state');
  }, state);
  await page.reload();
}
export async function openMoveOut(page, state) {
  await page.goto(`${new URL(page.url()).origin}/#/`);
  await page.getByRole('button', { name: 'Move-out', exact: true }).click();
  await page.goto(`${new URL(page.url()).origin}/#/capture/${state.spots[0].id}/out`);
  await page.locator('.ghost-photo').waitFor();
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2 && !document.querySelector('.shutter')?.disabled);
}
export async function watchAttempt(page) {
  await page.evaluate(() => {
    window.attempt = { scores: [], reviews: 0, matched: false };
    let reviewing = false;
    const observer = new MutationObserver(records => {
      const score = document.querySelector('#match-score')?.dataset.score;
      if (records.some(record => record.target.id === 'match-score' && record.attributeName === 'data-score') && score !== undefined && Number.isFinite(Number(score))) window.attempt.scores.push(Number(score));
      if (document.querySelector('.viewfinder.matched')) window.attempt.matched = true;
      const next = [...document.querySelectorAll('h1,h2')].some(node => node.textContent === 'Review your pair');
      if (next && !reviewing) window.attempt.reviews++;
      reviewing = next;
    });
    observer.observe(document.querySelector('#app'), { subtree: true, childList: true, attributes: true, characterData: true });
  });
}
export async function observedScore(page) {
  const scores = await page.evaluate(() => window.attempt.scores);
  assert.ok(scores.length, 'A real match score was observed');
  assert.ok(scores.every(value => value >= 0 && value <= 100), 'Scores are finite and within 0–100');
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}
export async function slice2() {
  let baseline;
  const scores = {};
  for (const name of ['same', 'shift3', 'shift5', 'shift', 'other']) {
    const env = await setup(fixture(name));
    try {
      const context = await env.browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'] });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(env.url);
      if (name === 'same') {
        await addRoom(page);
        await openCamera(page);
        await takePhoto(page);
        baseline = await snapshot(page);
        assert.equal(baseline.photos.length, 1, 'Move-in uses an actual camera capture');
      } else await restore(page, baseline);
      await watchAttempt(page);
      await openMoveOut(page, baseline);
      assert.equal(await page.locator('#ghost-opacity').inputValue(), '50', 'Ghost starts at 50%');
      if (name === 'same') {
        await page.getByRole('heading', { name: 'Review your pair', exact: true }).waitFor();
        scores.same = await observedScore(page);
        assert.ok(scores.same >= 70, 'Identical camera view scores above the match threshold');
        const attempt = await page.evaluate(() => window.attempt);
        assert.ok(attempt.matched, 'Matched frame became green before automatic capture');
        await page.waitForTimeout(1200);
        assert.equal(await page.evaluate(() => window.attempt.reviews), 1, 'Automatic capture occurs only once');
        assert.equal((await snapshot(page)).photos.length, 1, 'Draft is not saved before Keep pair');
        await page.getByRole('button', { name: 'Keep pair', exact: true }).click();
        await page.getByRole('heading', { name: 'Wall by window', exact: true }).waitFor();
        await page.reload();
        await page.getByRole('heading', { name: 'Wall by window', exact: true }).waitFor();
        const kept = await snapshot(page);
        assert.equal(kept.photos.length, 2);
        assert.ok(kept.spots[0].outPhotoId && Number.isFinite(Date.parse(kept.spots[0].outAt)));
        assert.equal(kept.spots[0].outAuto, true);
        assert.ok(kept.spots[0].outScore >= 70);
      } else if (name.startsWith('shift')) {
        await page.waitForFunction(() => window.attempt.scores.length >= 4);
        scores[name === 'shift' ? 'shift10' : name] = await observedScore(page);
      } else {
        await page.locator('#ghost-opacity').fill('25');
        await page.locator('#ghost-opacity').dispatchEvent('input');
        assert.equal(await page.locator('.ghost-photo').evaluate(node => Number(getComputedStyle(node).opacity)), 0.25);
        await page.getByRole('button', { name: 'Hide ghost', exact: true }).click();
        assert.equal(await page.locator('.ghost-photo').evaluate(node => node.hidden || getComputedStyle(node).display === 'none' || Number(getComputedStyle(node).opacity) === 0), true);
        await page.getByRole('button', { name: 'Show ghost', exact: true }).click();
        await page.waitForTimeout(1800);
        scores.other = await observedScore(page);
        assert.equal(await page.evaluate(() => window.attempt.reviews), 0, 'Different scene does not auto-capture');
        assert.ok(scores.other < 70, 'Different scene remains below the match threshold');
        await page.getByRole('button', { name: 'Take photo', exact: true }).click();
        await page.getByRole('heading', { name: 'Review your pair', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Retake photo', exact: true }).click();
        await page.locator('#match-score').waitFor();
        await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2 && !document.querySelector('.shutter')?.disabled);
        assert.equal((await snapshot(page)).spots[0].outPhotoId, null, 'Retake discards the unsaved draft');
        await page.getByRole('button', { name: 'Take photo', exact: true }).click();
        await page.getByRole('heading', { name: 'Review your pair', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Keep pair', exact: true }).click();
        await page.getByRole('heading', { name: 'Wall by window', exact: true }).waitFor();
        await page.reload();
        await page.getByRole('heading', { name: 'Wall by window', exact: true }).waitFor();
        const kept = await snapshot(page);
        assert.equal(kept.spots[0].outAuto, false);
        assert.ok(kept.spots[0].outPhotoId && Number.isFinite(kept.spots[0].outScore));
      }
      assert.deepEqual(errors, [], `${name}: no browser errors`);
      await context.close();
    } finally { await env.close(); }
  }
  console.log(`Measured match scores (0–100): same=${scores.same}, shift3=${scores.shift3}, shift5=${scores.shift5}, shift10=${scores.shift10}, other=${scores.other}`);
  assert.ok(scores.same > scores.shift10 && scores.same > scores.other, 'Aligned camera view scores higher than shifted and different views');
  console.log('Slice 2: camera ghost, opacity, live-only, green frame, single auto-capture, manual capture, Keep/Retake, and persistence passed.');
}
// Reuse camera-captured JPEGs to exercise the three report states deterministically.
export function reportState(captured) {
  const state = structuredClone(captured);
  const first = state.spots[0];
  state.home.name = 'My home';
  first.inAt = '2026-10-01T09:14:00.000Z';
  first.outAt = '2026-10-23T18:02:00.000Z';
  const manual = { ...first, id: 'report-manual', label: 'Floor corner', order: 1, outScore: 32, outAuto: false };
  const room = { id: 'report-kitchen', homeId: state.home.id, name: 'Kitchen', order: 1 };
  const pending = { ...first, id: 'report-pending', roomId: room.id, label: 'Counter <edge> & sink', order: 0, outPhotoId: null, outAt: null, outScore: null, outAuto: false };
  state.rooms.push(room);
  state.spots.push(manual, pending);
  return state;
}
export async function slice3() {
  const env = await setup(fixture('same'));
  try {
    const context = await env.browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'], timezoneId: 'UTC' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => assert.ok(request.url().startsWith(env.url) || /^(blob:|data:)/.test(request.url()), 'Report makes no external requests'));
    await page.goto(env.url);
    await page.getByRole('link', { name: 'Report', exact: true }).click();
    await page.getByRole('heading', { name: 'No rooms recorded yet', exact: true }).waitFor();
    await page.getByRole('link', { name: 'Back', exact: true }).click();
    await addRoom(page);
    await openCamera(page);
    await takePhoto(page);
    const baseline = await snapshot(page);
    await watchAttempt(page);
    await openMoveOut(page, baseline);
    assert.equal(await page.locator('#toast.visible').count(), 0, 'Move-in toast closes on route change');
    await page.getByRole('heading', { name: 'Review your pair', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Keep pair', exact: true }).click();
    await page.getByRole('heading', { name: 'Wall by window', exact: true }).waitFor();
    await page.getByText('Move-out photo saved', { exact: true }).waitFor();
    await restore(page, reportState(await snapshot(page)));
    await page.goto(`${env.url}/#/`);
    await page.getByRole('link', { name: 'Report', exact: true }).click();
    await page.locator('.report-pair').first().waitFor();
    assert.equal(await page.locator('.report-pair').count(), 3);
    assert.equal(await page.locator('.report-room').count(), 2);
    assert.equal(await page.locator('.report-photos img').count(), 5);
    await page.evaluate(() => Promise.all([...document.querySelectorAll('.report-photos img')].map(image => image.decode())));
    assert.match(await page.locator('.report-pair').first().innerText(), /Before · Oct 1, 2026, 9:14 AM/);
    assert.match(await page.locator('.report-pair').first().innerText(), /After · Oct 23, 2026, 6:02 PM/);
    assert.match(await page.locator('.report-pair').first().innerText(), /\d+% match · Auto-matched/);
    assert.match(await page.locator('.report-pair').nth(1).innerText(), /32% match · Manual/);
    assert.match(await page.locator('.report-pair').nth(2).innerText(), /Not retaken/);
    await page.getByRole('heading', { name: 'Counter <edge> & sink', exact: true }).waitFor();
    assert.match(await page.locator('.report-footer').innerText(), /Saved on this phone only\. Generated by Same Angle on .+\./);
    assert.doesNotMatch(await page.locator('.report-document').innerText(), /undefined|NaN|\[object Object\]/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Report fits a phone');
    await page.evaluate(() => { window.printCalls = 0; window.print = () => window.printCalls++; });
    await page.getByRole('button', { name: 'Save as PDF', exact: true }).click();
    await page.waitForFunction(() => window.printCalls === 1);
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.appbar').isVisible(), false, 'Print hides navigation');
    assert.equal(await page.locator('.report-actions').isVisible(), false, 'Print hides controls');
    const shots = resolve(root, '_shots');
    await mkdir(shots, { recursive: true });
    const pdf = await page.pdf({ path: resolve(shots, 'report.pdf'), preferCSSPageSize: true, printBackground: true });
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
    console.log(`Report PDF: ${pages} pages for 3 pairs (_shots/report.pdf)`);
    assert.equal(pages, 3, 'Print uses one complete pair per page');
    await page.emulateMedia({ media: 'screen' });
    await page.reload();
    await page.locator('.report-pair').first().waitFor();
    assert.equal(await page.locator('.report-pair').count(), 3, 'Report reload preserves stored pairs');
    assert.deepEqual(errors, [], 'Report has no browser errors');
    await context.close();
    console.log('Slice 3: empty report, dates, scores, capture methods, not-retaken spots, local privacy footer, print action, PDF pagination, and reload passed.');
  } finally { await env.close(); }
}
async function slice1(env) {
  const context = await env.browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'] });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => assert.ok(request.url().startsWith(env.url) || /^(blob:|data:)/.test(request.url()), 'No external requests'));
  await page.goto(env.url);
  await addRoom(page);
  await openCamera(page);
  await takePhoto(page);
  const timestamp = await page.locator('.spot-card time').getAttribute('datetime');
  assert.ok(Number.isFinite(Date.parse(timestamp)), 'Capture has a timestamp');
  await page.reload();
  await page.getByRole('heading', { name: 'Wall by window', exact: true }).waitFor();
  assert.equal(await page.locator('.spot-card time').getAttribute('datetime'), timestamp);
  await page.waitForFunction(() => { const image = document.querySelector('.spot-photo'); return image?.complete && image.naturalWidth > 0; });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
  await page.getByRole('button', { name: 'Options for Wall by window', exact: true }).click();
  await page.getByRole('button', { name: 'Delete spot', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await page.locator('.spot-card').count(), 1, 'Cancelled deletion preserves photo');
  await page.getByRole('button', { name: 'Options for Wall by window', exact: true }).click();
  await page.getByRole('button', { name: 'Rename spot', exact: true }).click();
  await page.getByLabel('Spot label', { exact: true }).fill('Window wall');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('heading', { name: 'Window wall', exact: true }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: 'Window wall', exact: true }).waitFor();
  const blob = await page.locator('.spot-photo').evaluate(async image => Array.from(new Uint8Array(await (await fetch(image.src)).arrayBuffer())));
  await context.close();

  const denied = await env.browser.newContext({ viewport: { width: 390, height: 844 } });
  await denied.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) } });
  });
  const fallback = await denied.newPage();
  await fallback.goto(env.url);
  await addRoom(fallback);
  await fallback.getByRole('button', { name: 'Add spot', exact: true }).click();
  await fallback.getByText('Camera unavailable', { exact: true }).waitFor();
  await fallback.locator('#upload-photo').setInputFiles({ name: 'wall.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(blob) });
  await fallback.getByLabel('Spot label', { exact: true }).fill('Uploaded wall');
  // Force one storage failure: the review must remain available for retry.
  await fallback.evaluate(async () => {
    const request = indexedDB.open('same-angle', 1);
    const db = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = reject; });
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args) {
      if (args[1] === 'readwrite') { IDBDatabase.prototype.transaction = original; throw new Error('Test storage failure'); }
      return original.apply(this, args);
    };
    db.close();
  });
  await fallback.getByRole('button', { name: 'Save move-in photo', exact: true }).click();
  await fallback.getByRole('button', { name: 'Retry saving photo', exact: true }).waitFor();
  assert.equal(await fallback.locator('.review-photo').count(), 1, 'Failed save retains photo');
  await fallback.getByRole('button', { name: 'Retry saving photo', exact: true }).click();
  await fallback.getByRole('heading', { name: 'Uploaded wall', exact: true }).waitFor();
  await fallback.reload();
  await fallback.getByRole('heading', { name: 'Uploaded wall', exact: true }).waitFor();
  assert.deepEqual(errors, [], 'No browser errors');
  await denied.close();
  console.log('Slice 1: camera, timestamp persistence, rename, deletion cancellation, upload fallback, and save retry passed.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const slice = process.argv[2] || '1';
  if (slice === '3') await slice3();
  else if (slice === '2') await slice2();
  else if (slice === '1') {
    const env = await setup();
    try { await slice1(env); } finally { await env.close(); }
  } else throw new Error(`Slice ${slice} is not implemented in this build.`);
}
