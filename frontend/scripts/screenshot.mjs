// Headless visual check. Captures the public (guest) experience and the
// authenticated screens at desktop + mobile widths.
//
// Usage: node scripts/screenshot.mjs  (dev server must be running on :3000)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = 'scripts/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

// 1x1 PNG to satisfy the KYC upload during the happy-path capture.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`saved ${OUT}/${name}.png`);
}

async function waitForBoard(page) {
  await page
    .waitForFunction(() => !document.body.innerText.includes('Loading World Cup'), { timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(500);
}

async function loginViaGoogle(page) {
  // Mock auth is in-memory, so we must NOT reload (goto) after this point —
  // clicking Google navigates client-side back to the app while staying signed in.
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.getByText('Continue with Google').click().catch(() => {});
  await page.waitForTimeout(900);
}

async function navAndShot(page, linkName, file) {
  await page.getByRole('link', { name: linkName }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, file);
}

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport });

  // 1) Public guest home
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await waitForBoard(page);
  await shot(page, `home-guest-${name}`);

  // 2) Login screen (desktop captures the two-pane hero)
  if (name === 'desktop') {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await shot(page, 'login');
  }

  // 3) Authenticated experience (stay in the SPA — no reload after login)
  await loginViaGoogle(page);
  await waitForBoard(page);
  await shot(page, `home-${name}`);
  await navAndShot(page, /wallet/i, `wallet-${name}`);
  // Open the currency drawer and switch to USD to prove conversion.
  await page.locator('button[aria-label="Display currency"]').first().click().catch(() => {});
  await page.waitForTimeout(300);
  await shot(page, `currency-drawer-${name}`);
  await page.getByText('US Dollar').click().catch(() => {});
  await page.waitForTimeout(500);
  await shot(page, `wallet-usd-${name}`);
  // reset to TZS
  await page.locator('button[aria-label="Display currency"]').first().click().catch(() => {});
  await page.waitForTimeout(300);
  await page.getByText('Tanzanian Shilling').click().catch(() => {});
  await page.waitForTimeout(300);
  await navAndShot(page, /profile/i, `profile-${name}`);
  await navAndShot(page, /my bets/i, `bets-${name}`);

  await page.close();
}

// Happy path (desktop): login -> add selection -> KYC -> place bet -> success.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await loginViaGoogle(page);
  await waitForBoard(page);

  await page.getByRole('button', { name: /home/i }).first().click().catch(() => {});
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /verify to bet/i }).first().click().catch(() => {});
  await page.waitForTimeout(600);

  const fileInput = page.locator('input[type="file"]');
  if (await fileInput.count()) {
    await fileInput.setInputFiles({ name: 'id.png', mimeType: 'image/png', buffer: PNG_1PX });
    await page.getByRole('button', { name: /submit for verification/i }).click().catch(() => {});
  }
  await page.waitForTimeout(2600);
  await waitForBoard(page);

  await page.getByRole('button', { name: /home/i }).first().click().catch(() => {});
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /place bet/i }).first().click().catch(() => {});
  await page.waitForTimeout(900);
  await shot(page, 'bet-success');
  await page.close();
}

await browser.close();
console.log('done');
