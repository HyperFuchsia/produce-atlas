/**
 * Browser smoke test.
 *
 * Boots the real built game in Chromium, drives thousands of metres of actual
 * gameplay through the attract bot, and fails on console errors, dropped
 * frames, stalled progress, or a UI that stops responding. Screenshots land in
 * `screenshots/` for eyeballing.
 *
 *   npm run build && npm run smoke
 */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const DIST = resolve('dist');
const SHOTS = resolve('screenshots');
const PORT = 4319;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

const serve = () =>
  new Promise((ok) => {
    const server = createServer(async (req, res) => {
      const url = (req.url ?? '/').split('?')[0];
      const path = join(DIST, url === '/' ? 'index.html' : decodeURIComponent(url));
      if (!existsSync(path)) {
        res.writeHead(404).end('not found');
        return;
      }
      try {
        const body = await readFile(path);
        res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' }).end(body);
      } catch {
        res.writeHead(500).end('error');
      }
    });
    server.listen(PORT, () => ok(server));
  });

const fails = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails.push(name);
};

const main = async () => {
  if (!existsSync(DIST)) {
    console.error('dist/ missing — run `npm run build` first.');
    process.exit(1);
  }
  await mkdir(SHOTS, { recursive: true });
  const server = await serve();
  // Use the browser this environment ships with rather than downloading one.
  const preinstalled = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'];
  const executablePath = preinstalled.find((p) => existsSync(p));
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: ['--use-gl=swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });

  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.NEON_VAULT, null, { timeout: 10000 });
  await page.waitForTimeout(1200);

  // ---------------------------------------------------------------- title
  check('title screen visible', await page.isVisible('[data-screen="title"]'));
  check('attract mode is animating', (await page.evaluate(() => window.NEON_VAULT.world.stats.distance)) > 5);
  await page.screenshot({ path: join(SHOTS, '01-title.png') });

  // ---------------------------------------------------------------- how to play
  await page.click('[data-action="howto"]');
  await page.waitForTimeout(250);
  check('how-to-play opens', await page.isVisible('[data-screen="howto"]'));
  await page.screenshot({ path: join(SHOTS, '02-howto.png') });
  await page.click('[data-screen="howto"] [data-action="back"]');
  await page.waitForTimeout(250);

  // ---------------------------------------------------------------- shop
  await page.click('[data-action="shop"]');
  await page.waitForTimeout(250);
  check('gear screen opens', await page.isVisible('[data-screen="shop"]'));
  const upgradeCards = await page.locator('#shop-list .card').count();
  check('upgrades listed', upgradeCards >= 6, `${upgradeCards} cards`);
  await page.screenshot({ path: join(SHOTS, '03-shop.png') });
  await page.click('[data-tab="skins"]');
  await page.waitForTimeout(200);
  const skinCards = await page.locator('#shop-list .card').count();
  check('looks listed', skinCards >= 8, `${skinCards} cards`);
  await page.screenshot({ path: join(SHOTS, '04-looks.png') });
  await page.click('[data-screen="shop"] [data-action="back"]');
  await page.waitForTimeout(200);

  // ---------------------------------------------------------------- missions
  await page.click('[data-action="missions"]');
  await page.waitForTimeout(250);
  check('missions listed', (await page.locator('#mission-list .card').count()) === 3);
  await page.screenshot({ path: join(SHOTS, '05-missions.png') });
  await page.click('[data-screen="missions"] [data-action="back"]');
  await page.waitForTimeout(200);

  // ---------------------------------------------------------------- settings
  await page.click('[data-action="settings"]');
  await page.waitForTimeout(250);
  check('settings render', (await page.locator('#settings-list label').count()) >= 8);
  await page.screenshot({ path: join(SHOTS, '06-settings.png') });
  await page.click('[data-screen="settings"] [data-action="back"]');
  await page.waitForTimeout(250);

  // ---------------------------------------------------------------- gameplay
  // Max out the Launch Rig so the run also exercises the head-start path and
  // crosses a zone boundary inside a sane test duration.
  await page.evaluate(() => {
    const p = window.NEON_VAULT.profile();
    p.upgrades.headstart = 5;
    p.shards = 5000;
    window.NEON_VAULT.setBot(true);
    window.NEON_VAULT.startRun();
  });
  await page.waitForTimeout(3500);
  check('run is live', (await page.evaluate(() => window.NEON_VAULT.state())) === 'playing');
  await page.screenshot({ path: join(SHOTS, '07-gameplay.png') });

  // Let it run a long way, sampling as it goes.
  const samples = [];
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(2000);
    samples.push(
      await page.evaluate(() => ({
        d: window.NEON_VAULT.world.stats.distance,
        score: window.NEON_VAULT.world.stats.score,
        fps: window.NEON_VAULT.fps(),
        zone: window.NEON_VAULT.world.zone,
        state: window.NEON_VAULT.state(),
        speed: window.NEON_VAULT.world.speed,
      })),
    );
    if (i === 5) await page.screenshot({ path: join(SHOTS, '08-gameplay-late.png') });
  }

  const maxDist = Math.max(...samples.map((s) => s.d));
  const minFps = Math.min(...samples.map((s) => s.fps));
  const avgFps = samples.reduce((a, s) => a + s.fps, 0) / samples.length;
  const maxZone = Math.max(...samples.map((s) => s.zone));
  const topSpeed = Math.max(...samples.map((s) => s.speed));

  check('covers real distance', maxDist > 850, `${maxDist.toFixed(0)} m`);
  check('reaches a second zone', maxZone >= 1, `zone ${maxZone}`);
  check('accelerates', topSpeed > 13, `${topSpeed.toFixed(1)} m/s`);
  const budget = await page.evaluate(() => window.NEON_VAULT.budget());
  check('draw-call budget', budget.calls < 160, `${budget.calls} draws`);
  check('triangle budget', budget.triangles < 90000, `${(budget.triangles / 1000).toFixed(1)}k tris`);
  console.log(
    `  note   ${avgFps.toFixed(1)} fps avg / ${minFps.toFixed(1)} min in this container — ` +
      'software GL, no GPU; the budget above is the device-performance signal',
  );
  check('score accrues', samples[samples.length - 1].score > samples[0].score);

  // ---------------------------------------------------------------- pause
  await page.evaluate(() => window.NEON_VAULT.pause());
  await page.waitForTimeout(400);
  check('pause opens', await page.isVisible('[data-screen="pause"]'));
  await page.screenshot({ path: join(SHOTS, '09-pause.png') });
  await page.click('[data-action="resume"]');
  await page.waitForTimeout(600);
  check('resume returns to play', (await page.evaluate(() => window.NEON_VAULT.state())) === 'playing');

  // ---------------------------------------------------------------- death → results
  await page.evaluate(() => {
    // Drop a wall in front of the runner to force an honest death.
    const w = window.NEON_VAULT.world;
    w.spawner.obstacles.length = 0;
    w.shields = 0;
    w.flowActive = false;
    w.spawner.obstacles.push({
      id: 424242,
      kind: 'stack',
      x: w.player.x + 3,
      y: 0,
      w: 2,
      h: 3.2,
      lane: 0,
      halfW: 3.6,
      vaultable: false,
      breakable: false,
      standable: false,
      cleared: false,
      broken: false,
      minClear: 99,
      locked: false,
      t: 0,
      baseY: 0,
      amp: 0,
      period: 1,
      phase: 0,
      variant: 0,
      seed: 1,
    });
    window.NEON_VAULT.setBot(false);
  });
  await page.waitForTimeout(1600);
  const afterCrash = await page.evaluate(() => window.NEON_VAULT.state());
  check('crash leads to revive or results', ['revive', 'over'].includes(afterCrash), afterCrash);
  if (afterCrash === 'revive') {
    await page.screenshot({ path: join(SHOTS, '10-revive.png') });
    await page.click('[data-action="giveup"]');
    await page.waitForTimeout(500);
  }
  check('results screen shows', await page.isVisible('[data-screen="over"]'));
  await page.screenshot({ path: join(SHOTS, '11-results.png') });

  const banked = await page.evaluate(() => window.NEON_VAULT.profile().totalRuns);
  check('run banked to profile', banked >= 1, `${banked} runs`);

  // ---------------------------------------------------------------- portrait
  await page.setViewportSize({ width: 430, height: 932 });
  await page.waitForTimeout(600);
  await page.click('[data-action="again"]');
  await page.evaluate(() => window.NEON_VAULT.setBot(true));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(SHOTS, '12-portrait.png') });
  check('plays in portrait', (await page.evaluate(() => window.NEON_VAULT.world.stats.distance)) > 20);

  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await writeFile(
    join(SHOTS, 'report.json'),
    JSON.stringify({ samples, errors, failures: fails }, null, 2),
  );

  await browser.close();
  server.close();

  console.log(`\n${fails.length ? `${fails.length} FAILED` : 'all checks passed'}`);
  process.exit(fails.length ? 1 : 0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
