/**
 * Development helper: boots the app in headless Chromium, steps the simulation
 * deterministically (software rendering is far slower than real time, so we
 * drive the clock ourselves) and captures a frame at each requested moment.
 *
 *   npx vite preview --port 4173
 *   CHROME_PATH=/path/to/chrome node scripts/shoot.mjs shots --times=1,3,7,12
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const outDir = process.argv[2] ?? 'shots';
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const times = arg('times', '1.2,3,7,12').split(',').map(Number);
const url = process.env.SHOOT_URL ?? 'http://127.0.0.1:4173/';
const width = Number(arg('width', 1280));
const height = Number(arg('height', 720));
const hideUi = arg('ui', 'on') === 'off';
const text = arg('text', null);
const paletteId = arg('palette', null);

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  // The sandbox image pins a specific Chromium build; allow pointing at it.
  executablePath: process.env.CHROME_PATH || undefined,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});
const page = await browser.newPage({ viewport: { width, height } });

const logs = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') logs.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.atlas), null, { timeout: 60000 });

if (text !== null) {
  await page.evaluate((t) => window.atlas.load(t), text);
}
if (paletteId) {
  await page.evaluate((id) => window.atlas.setPalette(id), paletteId);
}
if (hideUi) {
  await page.evaluate(() => {
    document.getElementById('ui').classList.add('ui--hidden');
    document.getElementById('boot')?.remove();
  });
} else {
  // Let the boot curtain finish its fade before we start capturing.
  await page.waitForSelector('#boot', { state: 'detached', timeout: 15000 }).catch(() => {});
}

// Freeze the real render loop: from here on the harness owns the clock.
await page.evaluate(() => {
  window.__frozen = true;
  window.atlas.postfx.renderer.setAnimationLoop(null);
});

let simulated = 0;
for (const t of times) {
  await page.evaluate((seconds) => {
    const dt = 1 / 60;
    for (let i = 0; i < Math.round(seconds / dt); i++) window.atlas.step(dt);
  }, Math.max(0, t - simulated));
  simulated = t;
  await page.evaluate(() => window.atlas.postfx.render(1 / 60, performance.now() / 1000));
  await page.screenshot({ path: `${outDir}/t${String(t).replace('.', '_')}.png` });
  process.stdout.write(`captured t=${t}s\n`);
}

const stats = await page.evaluate(() => {
  const atlas = window.atlas;
  return {
    cards: atlas.stage.cards.length,
    activeCard: atlas.stage.active,
    directorIndex: atlas.director.index,
    glyphsTotal: atlas.stage.cards.reduce((n, c) => n + c.charCount, 0),
    builtCards: [...atlas.stage.runtime.keys()],
    headlines: atlas.stage.cards.map((c) => c.headline.slice(0, 42)),
    camera: atlas.camera.position.toArray().map((n) => Number(n.toFixed(2))),
    render: {
      calls: atlas.postfx.renderer.info.render.calls,
      triangles: atlas.postfx.renderer.info.render.triangles,
      programs: atlas.postfx.renderer.info.programs?.length ?? 0,
      textures: atlas.postfx.renderer.info.memory.textures,
      geometries: atlas.postfx.renderer.info.memory.geometries,
    },
  };
});

console.log(JSON.stringify(stats, null, 2));
if (logs.length) console.log('\n--- console ---\n' + [...new Set(logs)].join('\n'));

await browser.close();
