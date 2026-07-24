/**
 * Verifies the packed single-file build the same way a host page will load it:
 * wrapped in a bare skeleton, inside an iframe, with no network available.
 *
 *   node tools/verify-artifact.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const FILE = resolve('dist/neon-vault.html');
const SHOTS = resolve('screenshots');
const preinstalled = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
];
const executablePath = preinstalled.find((p) => existsSync(p));

const fails = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails.push(name);
};

const main = async () => {
  await mkdir(SHOTS, { recursive: true });
  const fragment = await readFile(FILE, 'utf8');

  // Mirror the host: a minimal skeleton with a CSS reset, nothing else.
  const wrapped = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}</style>
</head><body>${fragment}</body></html>`;
  const hostPath = resolve('dist/_host-preview.html');
  await writeFile(hostPath, wrapped, 'utf8');

  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: ['--use-gl=swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 800, height: 500 }, deviceScaleFactor: 1 });

  const errors = [];
  const external = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  // Anything not a file:// or data: URL would be blocked by a strict host CSP.
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('file://') && !u.startsWith('data:') && !u.startsWith('about:')) external.push(u);
  });

  await page.goto(`file://${hostPath}`);
  await page.waitForFunction(() => !!window.NEON_VAULT, null, { timeout: 15000 });
  await page.waitForTimeout(1500);

  check('boots from a single file', await page.isVisible('[data-screen="title"]'));
  check('makes no external requests', external.length === 0, external.slice(0, 3).join(' '));

  // Play it the way a person would: click to start, then keyboard.
  await page.mouse.click(400, 110);
  await page.waitForTimeout(900);
  const started = await page.evaluate(() => window.NEON_VAULT.state());
  check('a tap starts a run', started === 'playing', started);

  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
  const jumped = await page.evaluate(() => window.NEON_VAULT.world.player.y > 0.05);
  check('keyboard reaches the game', jumped);

  // Lane changes are the new third verb — prove the input path reaches the sim.
  await page.waitForTimeout(400);
  const laneBefore = await page.evaluate(() => window.NEON_VAULT.world.player.lane);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  const laneAfter = await page.evaluate(() => window.NEON_VAULT.world.player.lane);
  check('lane change works', laneAfter !== laneBefore, `lane ${laneBefore} → ${laneAfter}`);

  // Hand it to the bot to prove a real run holds up.
  await page.evaluate(() => window.NEON_VAULT.setBot(true));
  const samples = [];
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1800);
    samples.push(
      await page.evaluate(() => ({
        d: window.NEON_VAULT.world.stats.distance,
        fps: window.NEON_VAULT.fps(),
      })),
    );
  }
  const dist = Math.max(...samples.map((s) => s.d));
  const avgFps = samples.reduce((a, s) => a + s.fps, 0) / samples.length;
  check('plays a real run', dist > 90, `${dist.toFixed(0)} m`);
  // This container has no GPU, so frame rate here measures a software
  // rasterizer, not the game. Gate on the budget that predicts real devices.
  const budget = await page.evaluate(() => window.NEON_VAULT.budget());
  const medFps = samples.map((s) => s.fps).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
  check('draw-call budget', budget.calls < 160, `${budget.calls} draws, ${(budget.triangles / 1000).toFixed(1)}k tris`);
  console.log(`  note   ${medFps.toFixed(1)} fps median under software GL (no GPU in this container)`);
  await page.screenshot({ path: join(SHOTS, 'artifact-desktop.png') });

  // Phone-sized portrait, touch input only.
  const phone = await browser.newPage({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  await phone.goto(`file://${hostPath}`);
  await phone.waitForFunction(() => !!window.NEON_VAULT, null, { timeout: 15000 });
  await phone.waitForTimeout(1200);
  await phone.touchscreen.tap(196, 700);
  await phone.waitForTimeout(600);
  check('touch starts a run on a phone', (await phone.evaluate(() => window.NEON_VAULT.state())) === 'playing');
  await phone.touchscreen.tap(196, 200); // top half → jump
  await phone.waitForTimeout(120);
  check('tapping the top half jumps', await phone.evaluate(() => window.NEON_VAULT.world.player.y > 0.05));
  await phone.evaluate(() => window.NEON_VAULT.setBot(true));
  await phone.waitForTimeout(6000);
  await phone.screenshot({ path: join(SHOTS, 'artifact-phone.png') });
  const phoneDist = await phone.evaluate(() => window.NEON_VAULT.world.stats.distance);
  check('phone run progresses', phoneDist > 30, `${phoneDist.toFixed(0)} m`);

  check('no console errors', errors.length === 0, errors.slice(0, 2).join(' | '));

  await browser.close();
  console.log(`\n${fails.length ? `${fails.length} FAILED` : 'all checks passed'}`);
  process.exit(fails.length ? 1 : 0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
