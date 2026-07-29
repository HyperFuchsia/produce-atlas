// Drive the game headlessly and capture screenshots at key moments.
//   node tools/tour.mjs <outdir> [scenario]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { createServer } from 'http';
import { readFile, mkdir } from 'fs/promises';
import { extname, join } from 'path';

const outDir = process.argv[2] || '/tmp/wb';
const scenario = process.argv[3] || 'main';
await mkdir(outDir, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' };
const root = process.cwd();
const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const data = await readFile(join(root, url === '/' ? '/index.html' : url));
    res.writeHead(200, { 'Content-Type': MIME[extname(url)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[console] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${(e.stack || '').split('\n').slice(0, 4).join('\n')}`));
await page.goto(`http://127.0.0.1:${port}/index.html`);
await page.waitForTimeout(500);

const shot = async (name) => {
  const el = await page.$('#screen');
  await el.screenshot({ path: join(outDir, name + '.png') });
};
const press = async (code, n = 1) => {
  for (let i = 0; i < n; i++) { await page.keyboard.press(code, { delay: 40 }); await page.waitForTimeout(120); }
};
const hold = async (code, ms) => {
  await page.keyboard.down(code);
  await page.waitForTimeout(ms);
  await page.keyboard.up(code);
  await page.waitForTimeout(140);
};
const wait = (ms) => page.waitForTimeout(ms);
const state = () => page.evaluate(() => {
  const a = window.__wildbound.app;
  const top = a.states[a.states.length - 1];
  const ow = a.states.find((s) => s.player && s.map);
  return {
    stack: a.states.map((s) => s.constructor.name),
    top: top?.constructor.name,
    pos: ow ? { map: ow.map.id, x: ow.player.x, y: ow.player.y, dir: ow.player.dir } : null,
    party: window.__wildbound.party?.() ?? null,
  };
});

async function boot() {
  await press('KeyZ');       // dismiss overlay
  await wait(400);
  await press('KeyZ');       // press start
  await wait(300);
  await shot('01-title');
  await press('KeyZ');       // NEW JOURNEY
  await wait(300);
  await shot('02-name');
  await press('Enter');      // confirm default name
  await wait(900);
}

if (scenario === 'main') {
  await boot();
  await shot('03-home');
  await hold('ArrowDown', 900);     // walk to the door
  await wait(1200);
  await shot('04-town');
  console.log('after door:', JSON.stringify(await state()));
  await hold('ArrowRight', 1500);
  await wait(300);
  await shot('05-town-road');
  await hold('ArrowUp', 700);
  await wait(200);
  await shot('06-town-study');
  console.log('pos:', JSON.stringify((await state()).pos));
}

if (scenario === 'study') {
  await boot();
  await hold('ArrowDown', 900);
  await wait(1000);
  // town: from (4,9) walk right to x=19 then up to the study door
  await hold('ArrowRight', 3100);
  await wait(200);
  console.log('pos:', JSON.stringify((await state()).pos));
  await hold('ArrowUp', 600);
  await wait(1200);
  await shot('10-study');
  console.log('pos:', JSON.stringify((await state()).pos));
  await press('KeyZ', 6);
  await shot('11-yarrow');
}

if (scenario === 'battle') {
  await boot();
  await page.evaluate(() => {
    window.__wildbound.give('sproutle', 9);
    window.__wildbound.give('voltpip', 7);
    window.__wildbound.warp('route1', 5, 28);
  });
  await wait(600);
  await shot('20-route');
  // wander the tall grass until an encounter fires
  for (let i = 0; i < 14; i++) {
    await hold(i % 2 ? 'ArrowLeft' : 'ArrowRight', 420);
    const st = await state();
    if (st.top === 'BattleState') break;
  }
  await wait(2600);
  await shot('21-battle-intro');
  await wait(2600);
  await shot('22-battle-menu');
  console.log('state:', JSON.stringify(await state()));
  await press('KeyZ');            // FIGHT
  await wait(400);
  await shot('23-moves');
  await press('KeyZ');            // first move
  await wait(2400);
  await shot('24-attack');
  await wait(3000);
  await shot('25-attack2');
  console.log('party:', JSON.stringify((await state()).party));
}

if (scenario === 'menus') {
  await boot();
  await page.evaluate(() => {
    window.__wildbound.give('sproutle', 12);
    window.__wildbound.give('voltpip', 8);
    window.__wildbound.give('pebblit', 10);
  });
  await wait(400);
  await press('Enter');           // pause menu
  await wait(300);
  await shot('30-menu');
  await press('ArrowDown');
  await press('KeyZ');            // KINDRED
  await wait(400);
  await shot('31-party');
  await press('KeyZ');            // options
  await wait(200);
  await press('KeyZ');            // SUMMARY
  await wait(400);
  await shot('32-summary');
  await press('KeyZ');
  await wait(300);
  await shot('33-summary-stats');
  await press('KeyZ');
  await wait(300);
  await shot('34-summary-moves');
  await press('KeyX'); await press('KeyX');
  await wait(300);
  await press('ArrowDown'); await press('KeyZ');   // BAG
  await wait(400);
  await shot('35-bag');
  await press('KeyX');
  await wait(200);
  await press('ArrowUp'); await press('ArrowUp'); await press('KeyZ');  // WILDBOOK
  await wait(400);
  await shot('36-wildbook');
}

if (scenario === 'world') {
  await boot();
  await page.evaluate(() => {
    window.__wildbound.give('sproutle', 30);
    window.__wildbound.warp('route1', 9, 30);
  });
  await wait(700);
  await shot('40-route-south');
  await page.evaluate(() => window.__wildbound.warp('route1', 9, 12));
  await wait(600);
  await shot('41-route-mid');
  await page.evaluate(() => window.__wildbound.warp('route1', 9, 3));
  await wait(600);
  await shot('42-route-cave');
  await page.evaluate(() => window.__wildbound.warp('hollow', 12, 16));
  await wait(700);
  await shot('43-hollow');
  await page.evaluate(() => window.__wildbound.warp('hearthstead', 13, 12));
  await wait(700);
  await shot('44-town-wide');
  await page.evaluate(() => window.__wildbound.warp('route1', 10, 35));
  await wait(700);
  await shot('45-bridge');
  await page.evaluate(() => window.__wildbound.warp('route1', 4, 22));
  await wait(700);
  await shot('46-bluff');
  await hold('ArrowUp', 820);        // climb the ladder
  await wait(400);
  await shot('47-bluff-top');
  await page.evaluate(() => window.__wildbound.warp('route1', 4, 15));
  await wait(500);
  await press('ArrowRight');         // turn to the stash on the bluff
  await press('KeyZ');
  await wait(400);
  await shot('48-bluff-stash');
  console.log('bag:', JSON.stringify(await page.evaluate(() => window.__wildbound.G.bag)));
  await press('KeyZ');
  await wait(300);
  await page.evaluate(() => window.__wildbound.warp('resthall', 7, 6));
  await wait(700);
  await shot('45-resthall');
}

if (scenario === 'capture') {
  await boot();
  await page.evaluate(() => {
    window.__wildbound.give('sproutle', 25);
    window.__wildbound.G.bag.bondorb = 20;
    window.__wildbound.warp('route1', 5, 28);
  });
  await wait(500);
  for (let i = 0; i < 16; i++) {
    await hold(i % 2 ? 'ArrowLeft' : 'ArrowRight', 420);
    if ((await state()).top === 'BattleState') break;
  }
  await wait(5200);
  await press('ArrowRight');       // BAG
  await press('KeyZ');
  await wait(500);
  await shot('50-bag-in-battle');
  await press('KeyZ');             // first item (bondorb)
  await wait(2600);
  await shot('51-throw');
  await wait(3500);
  await shot('52-result');
  console.log('party:', JSON.stringify((await state()).party));
  console.log('stack:', JSON.stringify((await state()).stack));
}

if (scenario === 'trainer') {
  await boot();
  await page.evaluate(() => {
    window.__wildbound.give('sproutle', 14);
    window.__wildbound.give('rilldrop', 12);
    window.__wildbound.warp('route1', 10, 27);
  });
  await wait(1400);
  await shot('60-spotted');
  console.log('after spot:', JSON.stringify(await state()));
  for (let i = 0; i < 8; i++) { await press('KeyZ'); await wait(500); }
  await wait(2500);
  await shot('61-trainer-battle');
  console.log('stack:', JSON.stringify((await state()).stack));
}

if (scenario === 'shop') {
  await boot();
  await page.evaluate(() => {
    window.__wildbound.give('sproutle', 10);
    window.__wildbound.warp('resthall', 11, 5);
  });
  await wait(600);
  await shot('70-hall');
  await press('ArrowUp');
  await wait(200);
  for (let i = 0; i < 8; i++) {
    if ((await state()).top === 'ShopState') break;
    await press('KeyZ');
    await wait(500);
  }
  await shot('71-shop');
  await press('ArrowDown'); await press('KeyZ');
  await wait(400);
  await shot('72-qty');
  console.log('stack:', JSON.stringify((await state()).stack));
  await press('KeyZ');
  await wait(400);
  await shot('73-bought');
  console.log('bag:', JSON.stringify(await page.evaluate(() => window.__wildbound.G.bag)));
  // and the healing counter
  await press('KeyX');
  await wait(300);
  await hold('ArrowLeft', 1600);
  await wait(200);
  console.log('pos:', JSON.stringify((await state()).pos));
}

console.log(logs.join('\n') || '(no errors)');
await browser.close();
server.close();
