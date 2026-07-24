/**
 * Dev utility: serve dist/ and screenshot the game at a chosen moment.
 *
 *   node tools/shoot.mjs <out.png> [width] [height] [waitMs] [portrait?]
 *
 * Runs the attract bot so the frames show real gameplay rather than a title card.
 */
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const DIST = resolve('dist');
const [, , out = 'screenshots/shot.png', w = '1200', h = '700', wait = '3000', mode = 'play'] = process.argv;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webmanifest': 'application/json',
};

const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  const p = join(DIST, url === '/' ? 'index.html' : decodeURIComponent(url));
  if (!existsSync(p)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' }).end(await readFile(p));
});
await new Promise((ok) => server.listen(4322, ok));
await mkdir(resolve('screenshots'), { recursive: true });

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

await page.goto('http://localhost:4322/');
await page.waitForFunction(() => !!window.NEON_VAULT, null, { timeout: 20000 });
await page.waitForTimeout(1200);

if (mode !== 'title') {
  await page.evaluate(() => {
    // Keep the frame rate honest for capture: the governor would otherwise
    // shed effects in this software-rendered container.
    window.NEON_VAULT.profile().settings.quality = 'high';
    window.NEON_VAULT.profile().upgrades.headstart = 3;
    window.NEON_VAULT.setBot(true);
    window.NEON_VAULT.startRun();
  });
}
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
const b = await page.evaluate(() => ({ fps: window.NEON_VAULT.fps(), ...window.NEON_VAULT.budget() }));
console.log(`wrote ${out} — ${b.calls} draws, ${(b.triangles / 1000).toFixed(1)}k tris, ${b.fps.toFixed(0)} fps (software GL)`);

await browser.close();
server.close();
