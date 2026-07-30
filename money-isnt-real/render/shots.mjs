/** Grabs still frames at given timestamps for eyeballing composition.
 *    node render/shots.mjs 3 9 18 30 ...   → render/_shots/t3.png …        */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OUTDIR = process.env.SHOT_DIR || resolve(HERE, '_shots');

const times = process.argv.slice(2).map(Number);
mkdirSync(OUTDIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(pathToFileURL(resolve(ROOT, 'index.html')).href + '?capture=1');
await page.waitForFunction('typeof window.renderAt === "function"');
await page.evaluate(() => document.fonts.ready);

for (const t of times) {
  await page.evaluate(tt => window.renderAt(tt), t);
  await page.locator('#c').screenshot({ path: resolve(OUTDIR, `t${t}.png`) });
}
await browser.close();
if (errs.length) { console.error('PAGE ERRORS:\n' + [...new Set(errs)].join('\n')); process.exit(1); }
console.log('ok ->', OUTDIR);
