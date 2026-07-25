#!/usr/bin/env node
/**
 * Renders "A Naming Error" to a true 3840x2160 master.
 *
 * A screen recording can never contain more pixels than the display it was
 * taken from, so this drives the page frame by frame in headless Chromium at
 * deviceScaleFactor 2 and pipes frames straight into ffmpeg. You get a real 4K
 * master on any machine, with no dropped frames and no compositor noise.
 *
 *   npm i playwright
 *   node render-4k.mjs
 *
 * Options
 *   --out <path>        output file (default derives from --codec)
 *   --fps 30            frame rate (default 30)
 *   --height 2160       output height; 1080 renders a 1080p master instead
 *   --plates 1-6        render only these plates, 1-indexed inclusive
 *   --frames png|jpeg   capture format (default png, lossless but ~4x slower)
 *   --codec <c>         h264 (default) | prores | vp9 | vp8
 *   --crf 12            quality for h264/vp9, lower is better
 *   --workers N         parallel renderers (default: cores-1, capped at 6)
 *   --apparatus         keep the plate number / rail / timecode in frame
 *   --chrome <path>     explicit Chromium binary
 *   --ffmpeg <path>     explicit ffmpeg binary
 *
 * Frames are piped, never written to disk. Only the per-worker segments touch
 * disk, and they are removed on success.
 *
 * Timing: PNG capture at 4K costs roughly 4s/frame/worker, so a full 4:40 run
 * at 30fps is about 2.5 core-hours — ~40min on 8 cores. Use --frames jpeg for
 * a fast preview; note that JPEG chroma subsampling softens crisp type on dark
 * grounds, which is exactly this piece's worst case, so keep PNG for a master.
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg  = (k, d) => { const i = argv.indexOf(`--${k}`); return i === -1 ? d : argv[i + 1]; };
const flag = k => argv.includes(`--${k}`);

const FPS      = Number(arg('fps', 30));
const HEIGHT   = Number(arg('height', 2160));
const CRF      = arg('crf', '12');
const FRAMES   = arg('frames', 'png');
const CODEC    = arg('codec', 'h264');
const KEEP_UI  = flag('apparatus');
const PLATES   = arg('plates', null);
const CHROME   = arg('chrome', process.env.CHROME_PATH || undefined);
const FFMPEG   = arg('ffmpeg', process.env.FFMPEG_PATH || 'ffmpeg');

const SHARD    = arg('_shard', null);          // internal: worker range
const SEGOUT   = arg('_segout', null);         // internal: worker output

const CONTAINER = { h264:'mp4', prores:'mov', vp9:'webm', vp8:'webm' };
const ENCODER   = { h264:'libx264', prores:'prores_ks', vp9:'libvpx-vp9', vp8:'libvpx' };
const VARGS = {
  h264:   ['-c:v','libx264','-preset','slow','-crf',CRF,'-pix_fmt','yuv420p','-movflags','+faststart'],
  prores: ['-c:v','prores_ks','-profile:v','3','-pix_fmt','yuv422p10le'],
  vp9:    ['-c:v','libvpx-vp9','-crf',CRF,'-b:v','0','-pix_fmt','yuv420p','-row-mt','1'],
  vp8:    ['-c:v','libvpx','-crf',CRF,'-b:v','10M','-pix_fmt','yuv420p'],
};

if (!CONTAINER[CODEC]) die(`unknown --codec ${CODEC} (h264 | prores | vp9 | vp8)`);
if (!['png','jpeg'].includes(FRAMES)) die(`--frames must be png or jpeg (got ${FRAMES})`);

const OUT   = arg('out', `a-naming-error-${HEIGHT}p.${CONTAINER[CODEC]}`);
const SCALE = HEIGHT / 1080;
const WIDTH = Math.round(1920 * SCALE);
if (!Number.isInteger(SCALE) || SCALE < 1) die(`--height must be a whole multiple of 1080 (got ${HEIGHT})`);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.join(HERE, 'index.html');

function die(msg) { console.error(msg); process.exit(1); }

/* ---------------- ffmpeg capability preflight ----------------
   Playwright ships a --disable-everything ffmpeg with no PNG decoder, no
   libx264 and no mp4 muxer. Rather than letting the pipe deadlock when that
   binary exits early, check up front and say exactly what is missing. */
async function ffProbe(list) {
  return new Promise(res => {
    const p = spawn(FFMPEG, ['-hide_banner', `-${list}`], { stdio: ['ignore','pipe','ignore'] });
    let s = '';
    p.stdout.on('data', d => (s += d));
    p.on('close', () => res(s));
    p.on('error', () => res(null));
  });
}

async function preflight(needConcat) {
  const [dec, enc, mux] = await Promise.all([ffProbe('decoders'), ffProbe('encoders'), ffProbe('muxers')]);
  if (dec === null) die(`could not run ffmpeg at "${FFMPEG}".\nInstall it, or pass --ffmpeg /path/to/ffmpeg`);

  const missing = [];
  const wantDec = FRAMES === 'png' ? 'png' : 'mjpeg';
  if (!new RegExp(`^\\s*\\S+\\s+${wantDec}\\b`, 'm').test(dec)) missing.push(`decoder ${wantDec} (for --frames ${FRAMES})`);
  if (!new RegExp(`^\\s*\\S+\\s+${ENCODER[CODEC]}\\b`, 'm').test(enc)) missing.push(`encoder ${ENCODER[CODEC]} (for --codec ${CODEC})`);
  if (!new RegExp(`^\\s*\\S*E\\s+${CONTAINER[CODEC]}\\b`, 'm').test(mux)) missing.push(`muxer ${CONTAINER[CODEC]}`);
  if (needConcat) {
    const demux = await ffProbe('demuxers');
    if (demux && !/^\s*\S*\s+concat\b/m.test(demux)) missing.push('demuxer concat (needed for --workers > 1)');
  }
  if (missing.length) {
    die(`the ffmpeg at "${FFMPEG}" is missing:\n  - ${missing.join('\n  - ')}\n\n` +
        `This is usually a minimal build. Install a full ffmpeg (brew install ffmpeg,\n` +
        `apt install ffmpeg) or point --ffmpeg at one. Do not use the copy bundled\n` +
        `with Playwright — it is built with --disable-everything.`);
  }
}

/* ---------------- render one contiguous plate range ---------------- */
async function renderRange(first, last, outFile, onProgress) {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--force-color-profile=srgb', '--font-render-hinting=none',
           '--disable-lcd-text', '--hide-scrollbars'],
  });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: SCALE,
  });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e.message)));

  await page.goto(PAGE, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  const meta = await page.evaluate(() => window.__plate && {
    count: window.__plate.count, durations: window.__plate.durations });
  if (!meta) { await browser.close(); die('index.html did not expose window.__plate — stale copy?'); }

  if (!KEEP_UI) await page.keyboard.press('c');
  await page.waitForTimeout(400);

  const clip = { x: 0, y: 0, width: 1920, height: 1080 };
  const shotOpts = FRAMES === 'jpeg'
    ? { clip, type: 'jpeg', quality: 100 }
    : { clip };

  // assert we really are capturing at the advertised size
  const probe = await page.screenshot(shotOpts);
  const got = FRAMES === 'png'
    ? { w: probe.readUInt32BE(16), h: probe.readUInt32BE(20) }
    : jpegSize(probe);
  if (!got || got.w !== WIDTH || got.h !== HEIGHT) {
    await browser.close();
    die(`expected ${WIDTH}x${HEIGHT} frames, Chromium produced ${got ? `${got.w}x${got.h}` : 'an unreadable frame'}`);
  }

  const ff = spawn(FFMPEG, [
    '-y',
    '-f', 'image2pipe', '-c:v', FRAMES === 'png' ? 'png' : 'mjpeg',
    '-r', String(FPS), '-i', 'pipe:0',
    ...VARGS[CODEC], '-r', String(FPS),
    outFile,
  ], { stdio: ['pipe', 'ignore', 'pipe'] });

  let ffErr = '', ffExit = null;
  ff.stderr.on('data', d => (ffErr += d));
  ff.on('close', c => (ffExit = c));
  ff.stdin.on('error', () => {});            // swallow EPIPE; handled below
  // one shared close promise — racing a fresh once(ff,'close') per frame would
  // pile up thousands of listeners over a full render
  const ffClosed = once(ff, 'close');
  const spawnFailed = new Promise(res => ff.on('error', res));
  if (await Promise.race([spawnFailed, new Promise(r => setTimeout(() => r(null), 300))]))
    { await browser.close(); die(`could not start ffmpeg at "${FFMPEG}"`); }

  for (let s = first; s <= last; s++) {
    const n = Math.round(meta.durations[s] / 1000 * FPS);
    for (let f = 0; f < n; f++) {
      if (ffExit !== null) {
        await browser.close();
        die(`ffmpeg exited early (code ${ffExit}):\n${ffErr.split('\n').slice(-12).join('\n')}`);
      }
      await page.evaluate(([i, t]) => window.__plate.seek(i, t), [s, (f / FPS) * 1000]);
      // no animations:'disabled' — that fast-forwards finite animations to
      // completion and would defeat the per-frame seeking above
      const buf = await page.screenshot(shotOpts);
      if (!ff.stdin.write(buf)) await Promise.race([once(ff.stdin, 'drain'), ffClosed]);
      onProgress?.(s);
    }
  }

  ff.stdin.end();
  await ffClosed;
  await browser.close();
  if (ffExit) die(`ffmpeg failed (code ${ffExit}):\n${ffErr.split('\n').slice(-12).join('\n')}`);
  return pageErrors;
}

/** Reads dimensions out of a JPEG's SOF marker. */
function jpegSize(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC)
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

/* ---------------- worker mode ---------------- */
if (SHARD) {
  const [a, b] = SHARD.split('-').map(Number);
  let n = 0;
  const errs = await renderRange(a, b, SEGOUT, () => {
    if (++n % 10 === 0) process.send?.({ done: 10 });
  });
  process.send?.({ done: n % 10, errs });
  process.exit(0);
}

/* ---------------- parent ---------------- */
const probeBrowser = await chromium.launch({ executablePath: CHROME });
const probePage = await probeBrowser.newPage();
await probePage.goto(PAGE, { waitUntil: 'load' });
const meta = await probePage.evaluate(() => window.__plate && {
  count: window.__plate.count, durations: window.__plate.durations });
await probeBrowser.close();
if (!meta) die('index.html did not expose window.__plate — stale copy?');

let first = 0, last = meta.count - 1;
if (PLATES) {
  const [a, b] = PLATES.split('-').map(Number);
  first = Math.max(0, (a || 1) - 1);
  last  = Math.min(meta.count - 1, (b || a || meta.count) - 1);
}

const WORKERS = Math.max(1, Math.min(
  Number(arg('workers', Math.min(6, Math.max(1, cpus().length - 1)))),
  last - first + 1));

await preflight(WORKERS > 1);

const framesFor = s => Math.round(meta.durations[s] / 1000 * FPS);
const totalFrames = Array.from({ length: last - first + 1 }, (_, k) => framesFor(first + k))
  .reduce((a, b) => a + b, 0);

// split into contiguous runs of roughly equal duration so segments concat in order
const target = totalFrames / WORKERS;
const ranges = [];
let cur = first, acc = 0;
for (let s = first; s <= last; s++) {
  acc += framesFor(s);
  if ((acc >= target && ranges.length < WORKERS - 1) || s === last) {
    ranges.push([cur, s]); cur = s + 1; acc = 0;
  }
}

console.log(`${WIDTH}x${HEIGHT} @ ${FPS}fps · ${FRAMES} frames · ${CODEC}`);
console.log(`plates ${first + 1}..${last + 1} · ${totalFrames} frames ` +
            `(${(totalFrames / FPS).toFixed(1)}s) · ${WORKERS} worker${WORKERS > 1 ? 's' : ''} -> ${OUT}`);

const started = Date.now();
let done = 0;
const draw = () => {
  const pct  = (done / totalFrames * 100).toFixed(1);
  const rate = done / ((Date.now() - started) / 1000);
  const eta  = rate > 0 ? ((totalFrames - done) / rate / 60).toFixed(1) : '?';
  process.stdout.write(`\r  ${pct}%  ${rate.toFixed(2)} fps  eta ${eta}m      `);
};

let result;
if (WORKERS === 1) {
  const errs = await renderRange(first, last, OUT, () => { done++; if (done % 10 === 0) draw(); });
  result = errs;
} else {
  const tmp = fs.mkdtempSync(path.join(path.dirname(path.resolve(OUT)), '.render-'));
  const segs = ranges.map((_, i) => path.join(tmp, `seg${i}.${CONTAINER[CODEC]}`));
  const self = fileURLToPath(import.meta.url);
  const base = argv.filter((v, i) =>
    !['--plates','--workers','--out'].includes(v) &&
    !['--plates','--workers','--out'].includes(argv[i - 1]));

  await Promise.all(ranges.map((r, i) => new Promise((res, rej) => {
    const ch = spawn(process.execPath,
      [self, ...base, '--_shard', `${r[0]}-${r[1]}`, '--_segout', segs[i]],
      { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
    ch.on('message', m => { done += m.done || 0; draw(); });
    ch.on('close', c => c === 0 ? res() : rej(new Error(`worker ${i} exited ${c}`)));
  }))).catch(e => { fs.rmSync(tmp, { recursive: true, force: true }); die(`\n${e.message}`); });

  const listFile = path.join(tmp, 'list.txt');
  fs.writeFileSync(listFile, segs.map(s => `file '${s.replace(/'/g, "'\\''")}'`).join('\n'));
  const cat = spawn(FFMPEG, ['-y','-f','concat','-safe','0','-i',listFile,'-c','copy',OUT],
                    { stdio: ['ignore','ignore','inherit'] });
  const [code] = await once(cat, 'close');
  fs.rmSync(tmp, { recursive: true, force: true });
  if (code) die('\nconcat failed');
  result = [];
}

process.stdout.write('\n');
if (result?.length) console.warn('page errors during render:', [...new Set(result)]);
const size = fs.existsSync(OUT) ? (fs.statSync(OUT).size / 1e6).toFixed(1) + ' MB' : '?';
console.log(`done in ${((Date.now() - started) / 60000).toFixed(1)}m -> ${OUT} (${size})`);
