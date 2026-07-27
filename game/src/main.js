// main.js — input, animation, chrome.
//
// The simulation in sim.js is turn-based and instantaneous. Everything here is the layer that
// makes that legible: tweening between ticks, easing the palette across a flip, and keeping
// the dimension readout honest about where you are in all four and a half of them.

import { parse, start, tick, clone, rewind, PH_WILD, PH_CULT } from './sim.js';
import { LEVELS } from './levels.js';
import { makeView, stepView, render, YAW0 } from './render.js';
import { ease, lerp } from './gfx.js';
import { Audio } from './audio.js';

const TICK_MS = 145;
const STORE_KEY = 'rachis.progress.v1';

const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const ctx = canvas.getContext('2d');
const app = $('app');

const audio = new Audio();
const view = makeView();

const levels = LEVELS.map(parse);

let idx = 0;
let state = null;
let recording = [];
let undoStack = [];
let anim = null;          // { from, to, t, snap }
let busy = false;         // true while an overlay owns the screen
let toastTimer = 0;

// ── Progress ─────────────────────────────────────────────────────────────────────────

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* private browsing, embedded frames — play unsaved rather than fail */ }
  return { solved: [], seen: false };
}

let progress = loadProgress();

function saveProgress() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch { /* ignore */ }
}

const unlocked = (i) => i === 0 || progress.solved.includes(LEVELS[i - 1].id);

// ── Level lifecycle ──────────────────────────────────────────────────────────────────

const filledPlots = () =>
  levels[idx].plots.filter((p) => state.seeds.some((s) => s.x === p.x && s.y === p.y && s.z === p.z)).length;

function snapshotEntities(s) {
  return {
    player: { ...s.player },
    ghosts: s.ghosts.map((g) => ({ x: g.x, y: g.y, z: g.z })),
    seeds: s.seeds.map((sd) => ({ ...sd })),
  };
}

function load(i, { keepCamera = false } = {}) {
  idx = i;
  state = start(levels[i]);
  recording = [];
  undoStack = [];
  anim = { from: snapshotEntities(state), to: snapshotEntities(state), t: 1, snap: true };
  view.phaseMix = state.phase === PH_CULT ? 1 : 0;
  view.phaseTarget = view.phaseMix;
  if (!keepCamera) {
    view.yawStep = 0;
    view.yaw = YAW0;
    view.yawTarget = YAW0;
  }
  syncChrome();
}

function syncChrome() {
  const def = LEVELS[idx];
  app.dataset.phase = state.phase === PH_WILD ? 'wild' : 'cult';

  $('plate-n').textContent = `PLATE ${roman(idx + 1)}`;
  $('plate-name').textContent = def.name;
  $('plate-teaches').textContent = def.teaches;

  $('crop-common').textContent = def.crop.common;
  $('crop-binomial').textContent = def.crop.binomial;
  $('crop-ancestor').textContent = def.crop.ancestor;
  $('crop-origin').textContent = def.crop.origin;
  $('crop-years').textContent = def.crop.years;
  const conf = $('crop-confidence');
  conf.textContent = def.crop.confidence;
  conf.className = def.crop.confidence === 'contested' ? 'contested' : '';

  $('ax-x').textContent = state.player.x;
  $('ax-y').textContent = state.player.y;
  $('ax-z').textContent = state.player.z;
  $('ax-t').textContent = String(state.t).padStart(2, '0');
  $('ax-p').textContent = state.phase === PH_WILD ? 'WILD' : 'CULT';

  const budget = levels[idx].maxLoops;
  const spent = state.ghosts.length;
  const loops = $('loops');
  loops.innerHTML = '';
  if (budget > 0) {
    const cap = document.createElement('span');
    cap.className = 'eyebrow';
    cap.textContent = 'rewinds';
    loops.append(cap);
    for (let k = 0; k < budget; k++) {
      const dot = document.createElement('i');
      if (k < spent) dot.className = 'spent';
      loops.append(dot);
    }
  }
}

function roman(n) {
  const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

// ── Actions ──────────────────────────────────────────────────────────────────────────

const animating = () => anim && !anim.snap && anim.t < 1;

function pushUndo() {
  undoStack.push({ state: clone(state), recording: recording.slice() });
  if (undoStack.length > 400) undoStack.shift();
}

// One buffered input. Holding a direction should feel continuous rather than eating every
// keypress that lands mid-tween, but buffering more than one turns a puzzle game into a
// place where you overshoot and cannot say why.
let buffered = null;

function flush() {
  if (buffered === null) return;
  const next = buffered;
  buffered = null;
  act(next);
}

function act(action) {
  if (busy || state.won || state.lost) return;
  if (animating()) { buffered = action; return; }

  audio.init();
  const plotsBefore = filledPlots();
  const before = snapshotEntities(state);
  const phaseBefore = state.phase;

  pushUndo();
  recording.push(action);
  const { events } = tick(state, action);

  const after = snapshotEntities(state);
  anim = { from: before, to: after, t: 0, snap: false };

  if (state.phase !== phaseBefore) {
    view.phaseTarget = state.phase === PH_CULT ? 1 : 0;
    view.shake = 0.55;
    audio.flip(state.phase === PH_CULT);
  } else {
    const mine = events.find((e) => e.who === 'player');
    if (mine?.kind === 'blocked') audio.blocked();
    else if (mine?.kind === 'mount') audio.mount();
    else if (after.player.y < before.player.y) audio.land(before.player.y - after.player.y);
    else audio.step(after.player.y);
  }

  const gained = filledPlots() - plotsBefore;
  if (gained > 0 && !state.won) audio.planted(plotsBefore);

  syncChrome();

  if (state.lost) {
    view.shake = 0.8;
    toast(state.lost === 'void' ? 'Lost to the void — rewinding that move.' : 'Buried. Rewinding that move.');
    setTimeout(() => { undo({ silent: true }); }, 620);
  } else if (state.won) {
    audio.win();
    setTimeout(showWin, 520);
  }
}

function doRewind() {
  if (busy || animating() || state.won || state.lost) return;
  audio.init();

  const next = rewind(state, recording);
  if (!next) {
    audio.blocked();
    toast(levels[idx].maxLoops === 0 ? 'No rewinds on this plate.' : 'No rewinds left — press Enter to restart.');
    return;
  }

  pushUndo();
  state = next;
  recording = [];
  view.phaseTarget = state.phase === PH_CULT ? 1 : 0;
  view.phaseMix = view.phaseTarget;
  view.shake = 0.7;
  anim = { from: snapshotEntities(state), to: snapshotEntities(state), t: 1, snap: true };
  audio.rewind();
  syncChrome();
  toast(`Loop ${state.ghosts.length} — your last run is walking it again.`);
}

function undo({ silent = false } = {}) {
  if (busy || !undoStack.length) return;
  const prev = undoStack.pop();
  state = prev.state;
  recording = prev.recording;
  view.phaseTarget = state.phase === PH_CULT ? 1 : 0;
  view.phaseMix = view.phaseTarget;
  anim = { from: snapshotEntities(state), to: snapshotEntities(state), t: 1, snap: true };
  if (!silent) audio.undo();
  syncChrome();
}

function restart() {
  if (busy) return;
  load(idx, { keepCamera: true });
  audio.init();
  audio.rewind();
}

function turn(dir) {
  view.yawStep = (view.yawStep + dir + 4) % 4;
  view.yawTarget = YAW0 + view.yawStep * (Math.PI / 2);
}

// Arrow keys name screen directions; the world direction they mean depends on where the
// camera is standing. Recomputing here (rather than storing screen-relative moves) is what
// keeps a recording valid after the player turns the camera mid-loop.
const CYCLE = ['N', 'E', 'S', 'W'];
const worldDir = (i) => CYCLE[(i - view.yawStep + 4) % 4];

// ── Overlays ─────────────────────────────────────────────────────────────────────────

const sheet = $('sheet');
const sheetInner = $('sheet-inner');

function openSheet(build) {
  busy = true;
  sheetInner.innerHTML = '';
  build(sheetInner);
  sheet.hidden = false;
  const first = sheetInner.querySelector('button');
  if (first) first.focus();
}

function closeSheet() {
  sheet.hidden = true;
  busy = false;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function button(label, onClick) {
  const b = el('button', null, label);
  b.addEventListener('click', onClick);
  return b;
}

function showTitle() {
  openSheet((root) => {
    root.append(el('div', 'eyebrow', 'Produce Atlas'));
    root.append(el('h2', null, 'Rachis'));

    const p = el('p');
    p.innerHTML = 'The <em>rachis</em> is the stalk that holds grain on a cereal plant. '
      + 'Wild cereals shatter — the rachis snaps and scatters the seed. Every domesticated '
      + 'cereal descends from plants that could not do that, and so had to be carried. '
      + '<strong>You are what carries them.</strong>';
    root.append(p);

    const ledger = el('div', 'ledger');
    const rows = [
      ['x, y, z', '3', 'space — you walk all three'],
      ['t', '1', 'time — rewind, and your past run keeps walking'],
      ['Φ', '½', 'wild ⇄ cultivated — an axis with two positions and no middle'],
    ];
    for (const [name, amt, why] of rows) {
      ledger.append(el('b', null, name), el('div', 'amt', amt), el('div', 'why', why));
    }
    ledger.append(
      el('b', 'sum', 'total'),
      el('div', 'amt sum', '4½'),
      el('div', 'why sum', 'the half is the one you cannot stand in the middle of'),
    );
    root.append(ledger);

    const p2 = el('p');
    p2.innerHTML = 'Push each seed onto its origin plot — the place that crop actually came from. '
      + 'Twelve plates, twelve real centres of domestication.';
    root.append(p2);

    const actions = el('div', 'actions');
    actions.append(button(progress.solved.length ? 'Continue' : 'Begin', () => {
      progress.seen = true;
      saveProgress();
      audio.init();
      closeSheet();
    }));
    actions.append(button('Plate index', () => showPlates()));
    root.append(actions);
  });
}

function showPlates() {
  openSheet((root) => {
    root.append(el('div', 'eyebrow', 'Plate index'));
    root.append(el('h2', null, 'Twelve origins'));

    const grid = el('div', 'plates');
    LEVELS.forEach((def, i) => {
      const b = el('button');
      if (progress.solved.includes(def.id)) b.classList.add('done');
      b.disabled = !unlocked(i);
      b.append(el('div', 'pn', `PLATE ${roman(i + 1)}`));
      b.append(el('div', 'pname', def.name));
      b.append(el('div', 'pcrop', def.crop.common));
      b.addEventListener('click', () => { load(i); closeSheet(); });
      grid.append(b);
    });
    root.append(grid);

    const actions = el('div', 'actions');
    actions.append(button('Back', () => (progress.seen ? closeSheet() : showTitle())));
    actions.append(button('About the dimensions', () => showTitle()));
    root.append(actions);
  });
}

function showWin() {
  const def = LEVELS[idx];
  if (!progress.solved.includes(def.id)) progress.solved.push(def.id);
  saveProgress();

  openSheet((root) => {
    root.append(el('div', 'eyebrow', `Plate ${roman(idx + 1)} · delivered`));
    root.append(el('h2', null, def.crop.common));

    root.append(el('p', 'binomial', def.crop.binomial));

    const dl = el('div', 'ledger');
    dl.append(el('b', null, 'Wild'), el('div', 'amt', ''), el('div', 'why', def.crop.ancestor));
    dl.append(el('b', null, 'Origin'), el('div', 'amt', ''), el('div', 'why', def.crop.origin));
    dl.append(el('b', null, 'Since'), el('div', 'amt', ''), el('div', 'why', def.crop.years));
    dl.append(el('b', null, 'Evidence'), el('div', 'amt', ''),
      el('div', `why ${def.crop.confidence === 'contested' ? 'contested' : ''}`, def.crop.confidence));
    root.append(dl);

    root.append(el('p', null, def.crop.note));

    root.append(el('p', 'stat',
      `Delivered in ${state.t} moves${state.ghosts.length ? ` across ${state.ghosts.length + 1} loops` : ''}.`));

    const actions = el('div', 'actions');
    if (idx + 1 < LEVELS.length) {
      actions.append(button('Next plate', () => { load(idx + 1); closeSheet(); }));
    } else {
      actions.append(button('Plate index', () => showPlates()));
    }
    actions.append(button('Replay', () => { load(idx, { keepCamera: true }); closeSheet(); }));
    root.append(actions);
  });
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

// ── Input ────────────────────────────────────────────────────────────────────────────

const KEYS = {
  ArrowUp: 0, KeyW: 0,
  ArrowRight: 1, KeyD: 1,
  ArrowDown: 2, KeyS: 2,
  ArrowLeft: 3, KeyA: 3,
};

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.code === 'Escape') {
    e.preventDefault();
    if (!sheet.hidden) closeSheet(); else showPlates();
    return;
  }

  if (!sheet.hidden) return;

  if (e.code in KEYS) { e.preventDefault(); act(worldDir(KEYS[e.code])); return; }

  switch (e.code) {
    case 'Space': e.preventDefault(); act('F'); break;
    case 'KeyR': e.preventDefault(); doRewind(); break;
    case 'KeyZ': case 'Backspace': e.preventDefault(); undo(); break;
    case 'KeyQ': e.preventDefault(); turn(-1); break;
    case 'KeyE': e.preventDefault(); turn(1); break;
    case 'Enter': e.preventDefault(); restart(); break;
    case 'Period': e.preventDefault(); act('.'); break;
    default: break;
  }
});

const bind = (id, fn) => {
  const node = $(id);
  node.addEventListener('click', (e) => { e.preventDefault(); fn(); });
};

bind('pad-up', () => act(worldDir(0)));
bind('pad-right', () => act(worldDir(1)));
bind('pad-down', () => act(worldDir(2)));
bind('pad-left', () => act(worldDir(3)));
bind('pad-flip', () => act('F'));
bind('pad-loop', () => doRewind());
bind('btn-plates', () => (sheet.hidden ? showPlates() : closeSheet()));
bind('btn-sound', () => {
  audio.init();
  const on = audio.toggle();
  $('btn-sound').setAttribute('aria-pressed', String(on));
  $('btn-sound').textContent = on ? 'Sound' : 'Muted';
});

// Drag horizontally to orbit — the fastest way to prove to yourself the world is really 3D.
let dragX = null;
canvas.addEventListener('pointerdown', (e) => { dragX = e.clientX; });
canvas.addEventListener('pointerup', () => { dragX = null; });
canvas.addEventListener('pointercancel', () => { dragX = null; });
canvas.addEventListener('pointermove', (e) => {
  if (dragX === null) return;
  const dx = e.clientX - dragX;
  if (Math.abs(dx) > 60) {
    turn(dx > 0 ? -1 : 1);
    dragX = e.clientX;
  }
});

// ── Frame loop ───────────────────────────────────────────────────────────────────────

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
}

window.addEventListener('resize', resize);

/** Horizontal motion eases; a fall accelerates. Nothing about this touches the rules. */
function interp(from, to, t) {
  const e = ease.out(t);
  const y = to.y === from.y ? from.y
    : to.y < from.y ? lerp(from.y, to.y, t * t)
      : lerp(from.y, to.y, ease.out(t));
  return { x: lerp(from.x, to.x, e), y, z: lerp(from.z, to.z, e) };
}

function entities() {
  if (!anim || anim.snap || anim.t >= 1) return snapshotEntities(state);
  const t = anim.t;
  const n = Math.min(anim.from.ghosts.length, anim.to.ghosts.length);
  return {
    player: interp(anim.from.player, anim.to.player, t),
    ghosts: anim.to.ghosts.map((g, i) => (i < n ? interp(anim.from.ghosts[i], g, t) : g)),
    seeds: anim.to.seeds.map((s, i) => interp(anim.from.seeds[i] ?? s, s, t)),
  };
}

let last = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;

  if (anim && !anim.snap && anim.t < 1) {
    anim.t = Math.min(1, anim.t + (dt * 1000) / TICK_MS);
    if (anim.t >= 1) flush();
  }

  stepView(view, dt);
  render(ctx, canvas, state, view, entities());

  requestAnimationFrame(frame);
}

// ── Boot ─────────────────────────────────────────────────────────────────────────────

resize();

const firstUnsolved = LEVELS.findIndex((d) => !progress.solved.includes(d.id));
load(firstUnsolved === -1 ? 0 : firstUnsolved);

if (!progress.seen) showTitle();

requestAnimationFrame((t) => { last = t; frame(t); });
