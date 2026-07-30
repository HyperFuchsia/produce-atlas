/**
 * Renders index.html to an MP4.
 *
 * Frames are pulled straight off the canvas with toDataURL and piped into
 * ffmpeg — screenshotting the page instead is about 13x slower. The timeline
 * is split into contiguous chunks rendered by parallel workers, each writing
 * its own segment, and the segments are concatenated without re-encoding.
 *
 *   node render/capture.mjs [--fps 30] [--out dist/money-isnt-real.mp4]
 *                           [--from 0] [--to 120] [--scale 1] [--workers 3]
 *                           [--preset slow] [--crf 18]
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cpus } from 'node:os';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i === -1 ? dflt : argv[i + 1];
};

const FPS     = Number(arg('fps', 30));
const OUT     = resolve(ROOT, arg('out', 'dist/money-isnt-real.mp4'));
const SCALE   = Number(arg('scale', 1));
const PRESET  = arg('preset', 'medium');
const CRF     = arg('crf', '18');
const WORKERS = Math.max(1, Number(arg('workers', Math.min(3, Math.max(1, cpus().length - 1)))));

const pad = (n, w = 2) => String(n).padStart(w, '0');
const srtTime = s =>
  `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)},${pad(Math.round((s % 1) * 1000), 3)}`;

const PAGE_URL = pathToFileURL(resolve(ROOT, 'index.html')).href + '?capture=1';

const browser = await chromium.launch({
  args: ['--force-color-profile=srgb', '--disable-lcd-text', '--hide-scrollbars']
});

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(PAGE_URL);
  await page.waitForFunction('typeof window.frameData === "function"');
  await page.evaluate(() => document.fonts.ready);
  if (SCALE !== 1) await page.evaluate(s => window.setScale(s), SCALE);
  return page;
}

// One page up front, to read the duration and the caption list.
const probe = await openPage();
const duration = await probe.evaluate(() => window.DURATION);
const from = arg('from', null) === null ? 0 : Number(arg('from'));
const to   = arg('to', null)   === null ? duration : Number(arg('to'));
const total = Math.round((to - from) * FPS);

// Subtitles come from the same array the animation draws, so they can't drift.
const captions = await probe.evaluate(() => window.CAPTIONS);
mkdirSync(resolve(ROOT, 'script'), { recursive: true });
writeFileSync(
  resolve(ROOT, 'script/captions.srt'),
  captions.map(([a, b, s], i) => `${i + 1}\n${srtTime(a)} --> ${srtTime(b)}\n${s}\n`).join('\n'),
  'utf8'
);

mkdirSync(dirname(OUT), { recursive: true });

// Split the frame range into contiguous chunks, one per worker.
const chunks = [];
const per = Math.ceil(total / WORKERS);
for (let i = 0; i < WORKERS; i++) {
  const start = i * per, end = Math.min(total, start + per);
  if (start < end) chunks.push({ i, start, end, file: resolve(dirname(OUT), `.part-${i}.mp4`) });
}

let done = 0;
const started = Date.now();
const tick = () => {
  done++;
  if (done % 30 && done !== total) return;
  const el = (Date.now() - started) / 1000;
  process.stdout.write(
    `\r  frame ${done}/${total}  (${(done / total * 100).toFixed(1)}%)  ` +
    `${(done / el).toFixed(1)} fps  eta ${Math.round(el / done * (total - done))}s   `
  );
};

async function runChunk({ start, end, file, i }) {
  const page = i === 0 ? probe : await openPage();
  const ff = spawn('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', PRESET, '-crf', String(CRF),
    '-pix_fmt', 'yuv420p', '-r', String(FPS), file
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  const closed = new Promise((res, rej) => {
    ff.on('close', c => c === 0 ? res() : rej(new Error(`ffmpeg exited ${c} on part ${i}`)));
    ff.on('error', rej);
  });
  const write = buf => new Promise(res => ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res));

  for (let f = start; f < end; f++) {
    const url = await page.evaluate(t => window.frameData(t, 'image/png'), from + f / FPS);
    await write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    tick();
  }
  ff.stdin.end();
  await closed;
  if (i !== 0) await page.close();
}

console.log(`  ${total} frames @ ${FPS}fps across ${chunks.length} worker(s)`);
await Promise.all(chunks.map(runChunk));
await browser.close();
process.stdout.write('\n');

// Stitch the segments together without re-encoding.
if (chunks.length === 1) {
  spawnSync(['-y', '-hide_banner', '-loglevel', 'error', '-i', chunks[0].file,
    '-c', 'copy', '-movflags', '+faststart', OUT]);
} else {
  const list = resolve(dirname(OUT), '.parts.txt');
  writeFileSync(list, chunks.map(c => `file '${c.file}'`).join('\n'), 'utf8');
  spawnSync(['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0',
    '-i', list, '-c', 'copy', '-movflags', '+faststart', OUT]);
  rmSync(list, { force: true });
}
chunks.forEach(c => rmSync(c.file, { force: true }));

function spawnSync(args) {
  const r = require('node:child_process').spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg concat failed');
}

console.log(`  done → ${OUT}`);
console.log(`  subtitles → ${resolve(ROOT, 'script/captions.srt')}`);
