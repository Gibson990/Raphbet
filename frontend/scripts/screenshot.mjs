// Headless visual check: drives login -> KYC -> home and captures screenshots
// at desktop and mobile widths. Used to verify UI changes during development.
//
// Usage: node scripts/screenshot.mjs  (dev server must be running on :3000)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = 'scripts/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`saved ${OUT}/${name}.png`);
}

// 1x1 transparent PNG used to satisfy the KYC file upload during screenshots.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

async function gotoHome(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // Log in via the Google button (mock auth).
  const google = page.getByText('Continue with Google');
  if (await google.isVisible().catch(() => false)) {
    await google.click();
  }
  // Complete KYC if the screen appears: upload a dummy file then submit.
  await page.waitForTimeout(600);
  const fileInput = page.locator('input[type="file"]');
  if (await fileInput.count()) {
    await fileInput.setInputFiles({ name: 'id.png', mimeType: 'image/png', buffer: PNG_1PX });
    await page.getByRole('button', { name: /submit for verification/i }).click().catch(() => {});
  }
  await page.waitForTimeout(2600); // KYC simulates a 2s verification delay
  // Wait for the match board to finish loading (loading text disappears).
  await page
    .waitForFunction(() => !document.body.innerText.includes('Loading World Cup'), { timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(500);
}

async function navAndShot(page, linkName, file) {
  // Navigate in-app (mock auth is in-memory, so a full reload would log us out).
  await page.getByRole('link', { name: linkName }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, file);
}

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport });
  if (name === 'desktop') {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, 'login');
  }
  await gotoHome(page);
  await shot(page, `home-${name}`);
  await navAndShot(page, /wallet/i, `wallet-${name}`);
  await navAndShot(page, /profile/i, `profile-${name}`);
  await navAndShot(page, /my bets/i, `bets-${name}`);
  await page.close();
}

await browser.close();
console.log('done');
