/**
 * Renders the app icon and launch art with headless Chromium, so the marks are
 * generated from the same vector description the game uses — no binary art
 * assets in the repo, and any palette change re-exports in one command.
 *
 *   node tools/generate-icons.mjs
 *
 * Outputs (public/assets):
 *   icon-1024.png   App Store / marketing
 *   icon-512.png    PWA maskable
 *   icon-192.png    PWA / favicon
 *   splash-2732.png Launch screen art
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const OUT = resolve('public/assets');

/** The mark: a chevron vault arc over a neon horizon. */
const iconHtml = (size) => `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:transparent}
  canvas{display:block}
</style>
<canvas id="c" width="${size}" height="${size}"></canvas>
<script>
const s = ${size};
const ctx = document.getElementById('c').getContext('2d');
const u = s / 1024;

// Backdrop
const bg = ctx.createLinearGradient(0, 0, s, s);
bg.addColorStop(0, '#0a1230');
bg.addColorStop(0.5, '#0b1a3f');
bg.addColorStop(1, '#170a2c');
ctx.fillStyle = bg;
ctx.fillRect(0, 0, s, s);

// Horizon glow
const halo = ctx.createRadialGradient(s*0.5, s*0.72, 0, s*0.5, s*0.72, s*0.6);
halo.addColorStop(0, 'rgba(69,245,255,0.35)');
halo.addColorStop(1, 'rgba(0,0,0,0)');
ctx.fillStyle = halo;
ctx.fillRect(0, 0, s, s);

// Skyline silhouette
ctx.fillStyle = 'rgba(4,8,20,0.85)';
const towers = [[0.03,0.30],[0.13,0.46],[0.23,0.22],[0.33,0.38],[0.62,0.34],[0.72,0.5],[0.84,0.26],[0.93,0.4]];
for (const [x, h] of towers) ctx.fillRect(x*s, s*0.74 - h*s*0.55, s*0.085, h*s*0.55 + s*0.1);

// Deck
ctx.fillStyle = '#45f5ff';
ctx.fillRect(0, s*0.735, s, s*0.016);
ctx.fillStyle = 'rgba(69,245,255,0.22)';
ctx.fillRect(0, s*0.751, s, s*0.05);

// Vault arc
ctx.strokeStyle = '#ff3fa4';
ctx.lineWidth = 26*u;
ctx.lineCap = 'round';
ctx.shadowColor = '#ff3fa4';
ctx.shadowBlur = 40*u;
ctx.beginPath();
ctx.moveTo(s*0.16, s*0.735);
ctx.quadraticCurveTo(s*0.5, s*0.12, s*0.86, s*0.735);
ctx.stroke();
ctx.shadowBlur = 0;

// Barrier being cleared
ctx.fillStyle = '#1d2a44';
ctx.fillRect(s*0.435, s*0.60, s*0.13, s*0.135);
ctx.fillStyle = 'rgba(255,255,255,0.10)';
ctx.fillRect(s*0.435, s*0.60, s*0.13, s*0.03);
ctx.fillStyle = '#45f5ff';
ctx.fillRect(s*0.425, s*0.586, s*0.15, s*0.018);

// The vaulting figure: hand planted on the lip, legs swept up behind.
(function runner(){
  const f = s * 0.30;                 // figure height
  ctx.save();
  ctx.translate(s*0.505, s*0.415);    // hip sits just above the arc apex
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const P = (x, y) => [x*f, y*f];
  const hip      = P(0, 0);
  const shoulder = P(0.20, -0.40);
  const head     = P(0.33, -0.60);
  const plantEl  = P(0.16, -0.02);
  const plantHd  = P(0.03, 0.34);     // down onto the barrier lip
  const freeEl   = P(0.46, -0.56);
  const freeHd   = P(0.66, -0.70);
  const knee1    = P(-0.34, 0.00);
  const foot1    = P(-0.62, -0.24);
  const knee2    = P(-0.26, 0.20);
  const foot2    = P(-0.58, 0.06);

  const bone = (a, b, w, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w*f;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };

  // Back leg first, then the rest, so the silhouette layers correctly.
  bone(hip, knee2, 0.155, '#b9c9dd');
  bone(knee2, foot2, 0.125, '#b9c9dd');
  bone(shoulder, freeEl, 0.13, '#b9c9dd');
  bone(freeEl, freeHd, 0.11, '#b9c9dd');

  bone(hip, shoulder, 0.30, '#ffffff');            // torso
  bone(hip, knee1, 0.17, '#ffffff');
  bone(knee1, foot1, 0.14, '#ffffff');
  bone(shoulder, plantEl, 0.14, '#ffffff');
  bone(plantEl, plantHd, 0.12, '#ffffff');

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(head[0], head[1], 0.155*f, 0, Math.PI*2);
  ctx.fill();

  // Accent: the courier strap and a speed flick off the trailing foot.
  bone(shoulder, P(-0.02, -0.06), 0.06, '#45f5ff');
  ctx.strokeStyle = 'rgba(69,245,255,0.9)';
  ctx.lineWidth = 0.07*f;
  ctx.beginPath();
  ctx.moveTo(foot1[0]-0.05*f, foot1[1]-0.10*f);
  ctx.lineTo(foot1[0]-0.34*f, foot1[1]-0.22*f);
  ctx.stroke();
  ctx.restore();
})();

window.__done = true;
</script>`;

const splashHtml = (w, h) => `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0}canvas{display:block}</style>
<canvas id="c" width="${w}" height="${h}"></canvas>
<script>
const ctx = document.getElementById('c').getContext('2d');
const W=${w}, H=${h};
const bg = ctx.createLinearGradient(0,0,0,H);
bg.addColorStop(0,'#05060d'); bg.addColorStop(0.55,'#0b1730'); bg.addColorStop(1,'#160a26');
ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
const halo = ctx.createRadialGradient(W*0.5,H*0.45,0,W*0.5,H*0.45,H*0.5);
halo.addColorStop(0,'rgba(69,245,255,0.20)'); halo.addColorStop(1,'rgba(0,0,0,0)');
ctx.fillStyle = halo; ctx.fillRect(0,0,W,H);
ctx.fillStyle='rgba(4,8,20,0.9)';
for (let i=0;i<14;i++){ const x=(i/14)*W; const hh=(0.12+((i*37)%9)/22)*H; ctx.fillRect(x, H*0.68-hh, W*0.055, hh+H*0.4); }
ctx.fillStyle='#45f5ff'; ctx.fillRect(0,H*0.68,W,4);
ctx.textAlign='center';
ctx.fillStyle='#ffffff';
ctx.font='900 ' + Math.round(H*0.075) + 'px "Avenir Next", system-ui, sans-serif';
ctx.fillText('NEON', W*0.5, H*0.40);
ctx.fillStyle='#45f5ff';
ctx.fillText('VAULT', W*0.5, H*0.40 + H*0.082);
ctx.fillStyle='rgba(160,190,220,0.8)';
ctx.font='600 ' + Math.round(H*0.019) + 'px "Avenir Next", system-ui, sans-serif';
ctx.fillText('ONE PATH.  INFINITE MOMENTUM.', W*0.5, H*0.40 + H*0.14);
window.__done = true;
</script>`;

const preinstalled = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
];
const executablePath = preinstalled.find((p) => existsSync(p));

const main = async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: ['--use-gl=swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
  });

  const shoot = async (html, w, h, file) => {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.setContent(html);
    await page.waitForFunction(() => window.__done === true);
    const buf = await page.locator('#c').screenshot({ omitBackground: true });
    await writeFile(resolve(OUT, file), buf);
    await page.close();
    console.log('wrote', file, `${w}x${h}`);
  };

  for (const size of [1024, 512, 192]) {
    await shoot(iconHtml(size), size, size, `icon-${size}.png`);
  }
  await shoot(splashHtml(2732, 2732), 2732, 2732, 'splash-2732.png');

  await browser.close();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
