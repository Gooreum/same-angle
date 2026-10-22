// Original implementation, MIT. Screenshots cover only implemented slice 1 screens.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setup, addRoom, openCamera } from './e2e.mjs';
const shots = fileURLToPath(new URL('../_shots/', import.meta.url));
await mkdir(shots, { recursive: true });
const env = await setup();
try {
  for (const [width, height] of [[390, 844], [1280, 800]]) {
    const context = await env.browser.newContext({ viewport: { width, height }, permissions: ['camera'] });
    const page = await context.newPage();
    const shot = async name => {
      await page.evaluate(() => Promise.all(Array.from(document.images, image => image.decode().catch(() => {}))));
      await page.screenshot({ path: `${shots}${name}-${width}.png`, fullPage: true });
    };
    await page.goto(env.url);
    await page.getByRole('heading', { name: 'My home', exact: true }).waitFor();
    await shot('home-empty');
    await addRoom(page);
    await shot('room-empty');
    await openCamera(page);
    await shot('capture-in');
    await page.getByRole('button', { name: 'Take photo', exact: true }).click();
    await page.getByRole('heading', { name: 'Name this spot', exact: true }).waitFor();
    await shot('capture-in-review');
    await page.getByLabel('Spot label', { exact: true }).fill('Wall by window');
    await page.getByRole('button', { name: 'Save move-in photo', exact: true }).click();
    await page.getByRole('heading', { name: 'Wall by window', exact: true }).waitFor();
    await shot('room');
    await page.getByRole('link', { name: 'Back', exact: true }).click();
    await page.getByRole('heading', { name: 'My home', exact: true }).waitFor();
    await shot('home-list');
    await context.close();
  }
} finally { await env.close(); }
