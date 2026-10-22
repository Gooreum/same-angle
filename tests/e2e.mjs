// Original implementation, MIT. Playwright is used only for development tests.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = createRequire(process.env.PW_ROOT ? process.env.PW_ROOT + '/' : import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function setup() {
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
    browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', ...(process.env.FAKE_VIDEO ? [`--use-file-for-fake-video-capture=${resolve(process.env.FAKE_VIDEO)}`] : [])] });
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
  if (slice !== '1') throw new Error(`Slice ${slice} is not implemented in this build.`);
  const env = await setup();
  try { await slice1(env); } finally { await env.close(); }
}
