/** Compares ways of getting a frame out of the page, so the capture pipeline's
 *  choice stays justified on whatever machine you run it on.
 *    node render/bench.mjs                                                    */
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(resolve(ROOT, 'index.html')).href + '?capture=1');
await page.waitForFunction('typeof window.renderAt === "function"');
await page.evaluate(() => document.fonts.ready);
const el = page.locator('#c');

const time = async (name, fn) => {
  const N = 24, t0 = Date.now();
  for (let i = 0; i < N; i++) { await page.evaluate(t => window.renderAt(t), 30 + i / 30); await fn(); }
  console.log(name.padEnd(28), (N / ((Date.now() - t0) / 1000)).toFixed(2), 'fps');
};

await time('render only', async () => {});
await time('locator screenshot png', () => el.screenshot({ type: 'png' }));
await time('locator screenshot jpeg', () => el.screenshot({ type: 'jpeg', quality: 92 }));
await time('page screenshot jpeg', () => page.screenshot({ type: 'jpeg', quality: 92 }));
await time('canvas toDataURL jpeg .92', () =>
  page.evaluate(() => document.getElementById('c').toDataURL('image/jpeg', 0.92)));
await time('canvas toDataURL png', () =>
  page.evaluate(() => document.getElementById('c').toDataURL('image/png')));
await browser.close();
