/**
 * Dev utility: screenshot any page from the running vite dev server.
 *   node tools/shoot.mjs <path> <out.png> [width] [height] [waitMs]
 */
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const [, , path = '/', out = 'screenshots/shot.png', w = '1600', h = '900', wait = '900'] = process.argv;

const preinstalled = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
];
const executablePath = preinstalled.find((p) => existsSync(p));

const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  args: ['--use-gl=swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('PAGE ERROR:', String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') console.error('CONSOLE:', m.text());
});
await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
await browser.close();
console.log('wrote', out);
