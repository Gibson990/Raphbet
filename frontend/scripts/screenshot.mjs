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
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.getByText('Continue with Google').click().catch(() => {});
  await page.waitForTimeout(700);
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

  // 3) Authenticated experience
  await loginViaGoogle(page);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await waitForBoard(page);
  await shot(page, `home-${name}`);
  await navAndShot(page, /wallet/i, `wallet-${name}`);
  await navAndShot(page, /profile/i, `profile-${name}`);
  await navAndShot(page, /my bets/i, `bets-${name}`);

  await page.close();
}

await browser.close();
console.log('done');
