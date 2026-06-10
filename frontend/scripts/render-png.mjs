// Rasterize the Raphbet badge (public/favicon.svg) into PNGs for places that
// don't accept SVG (e.g. Didit white-label logo upload). Transparent background.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pub = path.resolve('public');
const svg = readFileSync(path.join(pub, 'favicon.svg'), 'utf8');

const targets = [
  { name: 'logo.png', size: 512 },     // high-res logo for uploads
  { name: 'logo-192.png', size: 192 }, // PWA / medium
  { name: 'favicon.png', size: 64 },   // favicon PNG
];

const browser = await chromium.launch();
for (const { name, size } of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const sized = svg
    .replace(/width="\d+"/, `width="${size}"`)
    .replace(/height="\d+"/, `height="${size}"`);
  await page.setContent(
    `<!doctype html><html><head><style>*{margin:0;padding:0}html,body{background:transparent}</style></head><body>${sized}</body></html>`,
    { waitUntil: 'networkidle' }
  );
  const el = await page.$('svg');
  await el.screenshot({ path: path.join(pub, name), omitBackground: true });
  await page.close();
  console.log('wrote public/' + name + '  (' + size + 'x' + size + ')');
}
await browser.close();
