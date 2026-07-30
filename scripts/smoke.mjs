/**
 * End-to-end smoke test: drives the real UI in a headless browser and asserts
 * the space keeps composing, animating and disposing without errors.
 *
 *   npx vite build && npx vite preview --port 4173 &
 *   CHROME_PATH=/path/to/chrome node scripts/smoke.mjs
 */

import { chromium } from 'playwright';

const url = process.env.SHOOT_URL ?? 'http://127.0.0.1:4173/';

const results = [];
let failures = 0;

function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition), detail });
  if (!condition) failures++;
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('pageerror', (err) => errors.push(err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error' && !msg.text().includes('favicon')) errors.push(msg.text());
});

await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.atlas), null, { timeout: 60000 });
await page.evaluate(() => window.atlas.postfx.renderer.setAnimationLoop(null));

const step = (seconds) =>
  page.evaluate((s) => {
    for (let i = 0; i < Math.round(s * 60); i++) window.atlas.step(1 / 60);
  }, seconds);

// --- boot ---------------------------------------------------------------------
const boot = await page.evaluate(() => ({
  cards: window.atlas.stage.cards.length,
  glyphs: window.atlas.stage.cards.reduce((n, c) => n + c.charCount, 0),
  fonts: Object.keys(window.atlas.stage.typeface.fonts),
}));
check('sample content composes into cards', boot.cards >= 5, `cards=${boot.cards}`);
check('glyph geometry is produced', boot.glyphs > 300, `glyphs=${boot.glyphs}`);
check('both faces loaded', boot.fonts.length === 2, boot.fonts.join(','));

// --- typing new content and materialising -------------------------------------
await page.fill('#input', '# Fresh Cargo\n\nRoutes: Lisbon to Nagasaki\n\n- one\n- two\n\n88%\n');
await page.click('#btn-run');
await step(1);
const composed = await page.evaluate(() => ({
  cards: window.atlas.stage.cards.length,
  headline: window.atlas.stage.cards[0]?.headline,
  index: window.atlas.director.index,
}));
check('materialize rebuilds the space', composed.cards >= 2, `cards=${composed.cards}`);
check('first card is the title', composed.headline === 'Fresh Cargo', composed.headline);
check('director restarts at the first card', composed.index === 0, `index=${composed.index}`);

// --- navigation ---------------------------------------------------------------
await page.keyboard.press('ArrowRight');
await step(3.5);
const advanced = await page.evaluate(() => window.atlas.director.index);
check('arrow key travels forward', advanced === 1, `index=${advanced}`);

await page.keyboard.press('ArrowLeft');
await step(3.5);
const back = await page.evaluate(() => window.atlas.director.index);
check('arrow key travels back', back === 0, `index=${back}`);

await page.keyboard.press('r');
await step(0.4);
const replayed = await page.evaluate(() => window.atlas.stage.runtime.get(0)?.phase);
check('replay restarts the reveal', replayed === 'in', `phase=${replayed}`);

// --- every reveal style renders ----------------------------------------------
const styles = await page.evaluate(() => window.atlas.stage && ['surface', 'swarm', 'unfold', 'ignite', 'tide', 'descend', 'warp']);
for (const style of styles) {
  await page.selectOption('#sel-style', style);
  await page.keyboard.press('r');
  await step(0.6);
  const state = await page.evaluate(() => {
    const built = window.atlas.stage.runtime.get(window.atlas.stage.active);
    const bad = built.glyphs.filter((g) => {
      const p = g.mesh.position;
      return !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z);
    });
    return { style: built.style, bad: bad.length, count: built.glyphs.length };
  });
  check(`style "${style}" animates finite positions`, state.bad === 0 && state.count > 0, JSON.stringify(state));
}
await page.selectOption('#sel-style', 'auto');

// --- palettes -----------------------------------------------------------------
for (const palette of ['void', 'aqua', 'miami']) {
  await page.selectOption('#sel-palette', palette);
  await step(0.3);
}
const afterPalettes = await page.evaluate(() => ({
  textures: window.atlas.postfx.renderer.info.memory.textures,
  env: Boolean(window.atlas.scene.environment),
}));
check('palette switching keeps an environment map', afterPalettes.env, JSON.stringify(afterPalettes));
check('palette switching does not leak textures', afterPalettes.textures < 60, `textures=${afterPalettes.textures}`);

// --- awkward input ------------------------------------------------------------
const awkward = [
  ['empty input falls back to the sample', ''],
  ['a single very long word', 'Pneumonoultramicroscopicsilicovolcanoconiosis'.repeat(6)],
  ['unsupported scripts', '# 番茄 🍅 tomato\n\nثمرة\n\n- ok'],
  ['numbers only', '1\n\n2\n\n3.14159\n\n99%'],
  ['one enormous paragraph', 'seed '.repeat(4000)],
];
for (const [name, text] of awkward) {
  await page.evaluate((t) => window.atlas.load(t), text);
  await step(0.5);
  const state = await page.evaluate(() => ({
    cards: window.atlas.stage.cards.length,
    glyphs: window.atlas.stage.cards.reduce((n, c) => n + c.charCount, 0),
  }));
  check(name, state.cards >= 1, JSON.stringify(state));
}

// --- long unattended run, to catch build/dispose churn -----------------------
await page.evaluate(() => window.atlas.load(document.getElementById('input').value));
await step(90);
const late = await page.evaluate(() => {
  let meshes = 0;
  for (const built of window.atlas.stage.runtime.values()) meshes += built.glyphs.length;
  return {
    built: window.atlas.stage.runtime.size,
    meshes,
    // One cached geometry per distinct (face, character, extrusion profile).
    glyphGeometries: window.atlas.stage.typeface.cache.size,
    index: window.atlas.director.index,
    y: window.atlas.camera.position.y,
  };
});
check('only a window of cards stays built', late.built <= 3, `built=${late.built}`);
check('live glyph meshes stay bounded', late.meshes > 0 && late.meshes < 1200, `meshes=${late.meshes}`);
check(
  'glyph geometry is shared, not per-instance',
  late.glyphGeometries > 0 && late.glyphGeometries < 400,
  `cached=${late.glyphGeometries}`,
);
check('the flight actually progressed', late.index > 0, `index=${late.index}`);
check('camera stays above the water', late.y > 1, `y=${late.y.toFixed(2)}`);

// --- resize -------------------------------------------------------------------
await page.setViewportSize({ width: 390, height: 844 });
await step(0.4);
await page.evaluate(() => window.atlas.postfx.render(1 / 60, 1));
const mobile = await page.evaluate(() => ({
  w: window.atlas.postfx.renderer.domElement.width,
  aspect: Number(window.atlas.camera.aspect.toFixed(3)),
}));
check('resize reconfigures the renderer', mobile.w > 0 && mobile.aspect < 1, JSON.stringify(mobile));

check('no page errors', errors.length === 0, errors.slice(0, 4).join(' | '));

await browser.close();

for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures ? 1 : 0);
