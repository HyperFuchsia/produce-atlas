// Headless screenshot helper.
//   node tools/shot.mjs <url-path> <out.png> [waitMs] [keys...]
// Keys are sent as a comma list like "ArrowDown:8,KeyZ:1" (code:repeat).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join, resolve } from 'path';

const ROOT = resolve(process.argv[2] ?? '.', '..');
const page_path = process.argv[2] || '/tools/artcheck.html';
const out = process.argv[3] || 'shot.png';
const waitMs = parseInt(process.argv[4] || '900', 10);
const keySpec = process.argv[5] || '';
const selector = process.argv[6] || null;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.png': 'image/png', '.json': 'application/json',
};

const root = process.cwd();
const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = join(root, url === '/' ? '/index.html' : url);
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack || ''}`));

await page.goto(`http://127.0.0.1:${port}${page_path}`, { waitUntil: 'load' });
await page.waitForTimeout(400);

if (keySpec) {
  for (const part of keySpec.split(',')) {
    if (!part) continue;
    const [code, n = '1'] = part.split(':');
    if (code.startsWith('wait')) {
      await page.waitForTimeout(parseInt(n, 10));
      continue;
    }
    for (let i = 0; i < parseInt(n, 10); i++) {
      await page.keyboard.press(code);
      await page.waitForTimeout(70);
    }
  }
}
await page.waitForTimeout(waitMs);

const target = selector ? await page.$(selector) : page;
await target.screenshot({ path: out, ...(selector ? {} : { fullPage: true }) });
console.log(logs.join('\n') || '(no console output)');
await browser.close();
server.close();
