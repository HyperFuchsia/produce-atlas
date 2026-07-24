/**
 * Visual QA: forces specific gameplay moments in the real game and captures
 * them, so poses and effects can be judged in situ rather than by luck.
 *
 *   npm run dev   (in another shell)
 *   node tools/beauty.mjs
 */
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const SHOTS = resolve('screenshots');
const preinstalled = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
];
const executablePath = preinstalled.find((p) => existsSync(p));

const OBSTACLE = (kind, x, y, w, h, extra = {}) => ({
  id: Math.floor(Math.random() * 1e6),
  kind,
  x,
  y,
  w,
  h,
  vaultable: false,
  breakable: false,
  standable: false,
  cleared: false,
  broken: false,
  minClear: 99,
  locked: false,
  t: 0,
  baseY: y,
  amp: 0,
  period: 2,
  phase: 0,
  variant: 0,
  seed: 3,
  ...extra,
});

const main = async () => {
  await mkdir(SHOTS, { recursive: true });
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: ['--use-gl=swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1024, height: 576 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.error('PAGE ERROR:', String(e)));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.NEON_VAULT);
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    window.NEON_VAULT.setBot(true);
    window.NEON_VAULT.startRun();
  });
  await page.waitForTimeout(1500);

  /** Clear the track, drop one prop ahead, and shoot the frame where `state` hits. */
  const moment = async (name, makeObstacle, state, lead = 7) => {
    await page.evaluate(
      ([mk, l]) => {
        const w = window.NEON_VAULT.world;
        w.spawner.obstacles.length = 0;
        w.spawner.gaps.length = 0;
        const o = eval(`(${mk})`)(w.player.x + l);
        w.spawner.obstacles.push(o);
      },
      [makeObstacle, lead],
    );
    await page
      .waitForFunction((s) => window.NEON_VAULT.world.player.state === s, state, { timeout: 4000 })
      .catch(() => console.warn(`  (never reached ${state})`));
    await page.screenshot({ path: join(SHOTS, `pose-${name}.png`) });
    console.log('shot', name);
  };

  const O = OBSTACLE.toString();

  // A vault is what a *late* jump becomes, so the bot — which always jumps
  // early and sails clean over — can never produce one. Drive it by hand.
  await page.evaluate(() => window.NEON_VAULT.setBot(false));
  await page.evaluate(
    ([mk]) => {
      const w = window.NEON_VAULT.world;
      w.spawner.obstacles.length = 0;
      w.spawner.gaps.length = 0;
      w.spawner.obstacles.push(eval(`(${mk})`)(w.player.x + 12));
    },
    [`(x) => { const O = ${O}; return O('barrier', x, 0, 1.0, 1.25, { vaultable: true }); }`],
  );
  // Wait until the barrier is ~0.12 s away, then jump: too late to clear it,
  // exactly right to catch the lip.
  await page.waitForFunction(
    () => {
      const w = window.NEON_VAULT.world;
      const o = w.spawner.obstacles[0];
      return o && (o.x - w.player.x) / w.speed < 0.12;
    },
    null,
    { timeout: 5000 },
  );
  await page.keyboard.down('Space');
  await page
    .waitForFunction(() => window.NEON_VAULT.world.player.state === 'vault', null, { timeout: 2000 })
    .catch(() => console.warn('  (never reached vault)'));
  await page.screenshot({ path: join(SHOTS, 'pose-vault.png') });
  await page.keyboard.up('Space');
  console.log('shot vault');
  await page.evaluate(() => window.NEON_VAULT.setBot(true));
  await moment('slide', `(x) => { const O = ${O}; return O('beam', x, 0.98, 1.5, 2.42); }`, 'slide');
  await moment(
    'air',
    `(x) => { const O = ${O}; return O('stack', x, 0, 1.5, 1.95); }`,
    'air',
  );

  // Dive through glass. No barrier this time — with manual control, the jump
  // is the input, and a barrier would simply kill an unattended runner.
  await page.evaluate(() => {
    window.NEON_VAULT.setBot(false);
    window.NEON_VAULT.startRun();
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const w = window.NEON_VAULT.world;
    w.spawner.obstacles.length = 0;
    w.spawner.gaps.length = 0;
    w.spawner.obstacles.push({
      id: 5150, kind: 'panel', x: w.player.x + 16, y: 0, w: 0.45, h: 2.9,
      vaultable: false, breakable: true, standable: false, cleared: false,
      broken: false, minClear: 99, locked: false, t: 0, baseY: 0, amp: 0,
      period: 2, phase: 0, variant: 0, seed: 3,
    });
  });
  await page
    .waitForFunction(
      () => {
        const w = window.NEON_VAULT.world;
        const o = w.spawner.obstacles.find((b) => b.kind === 'panel');
        return !o || (o.x - w.player.x) / w.speed < 0.55;
      },
      null,
      { timeout: 6000 },
    )
    .catch(() => console.warn('  (panel approach timed out)'));
  // Hold the jump: a tap is deliberately a short hop, which lands before a
  // dive could ever start.
  await page.keyboard.down('Space');
  await page.waitForTimeout(230);
  await page.keyboard.up('Space');
  await page.keyboard.down('ArrowDown');
  await page
    .waitForFunction(() => window.NEON_VAULT.world.player.state === 'dive', null, { timeout: 2000 })
    .catch(() => console.warn('  (never reached dive)'));
  await page.waitForTimeout(90);
  await page.screenshot({ path: join(SHOTS, 'pose-dive.png') });
  await page.keyboard.up('ArrowDown');
  await page.evaluate(() => window.NEON_VAULT.setBot(true));
  console.log('shot dive');

  // Flow state, with a full course running.
  await page.evaluate(() => {
    const w = window.NEON_VAULT.world;
    w.flow = 0.999;
    w.flowActive = true;
    w.flowTimer = 12;
    w.stats.combo = 6;
    w.shields = 2;
    w.magnetTimer = 8;
  });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: join(SHOTS, 'pose-flow.png') });
  console.log('shot flow');

  // Overdrive smash.
  await page.evaluate(() => {
    window.NEON_VAULT.world.overdriveTimer = 6;
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(SHOTS, 'pose-overdrive.png') });
  console.log('shot overdrive');

  await browser.close();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
