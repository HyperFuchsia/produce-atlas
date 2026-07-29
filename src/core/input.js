// Unified input: keyboard, gamepad and on-screen touch controls all funnel into
// the same eight virtual buttons.
export const BTN = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'START', 'SELECT'];

const KEYMAP = {
  ArrowUp: 'UP', KeyW: 'UP',
  ArrowDown: 'DOWN', KeyS: 'DOWN',
  ArrowLeft: 'LEFT', KeyA: 'LEFT',
  ArrowRight: 'RIGHT', KeyD: 'RIGHT',
  KeyZ: 'A', Space: 'A', KeyJ: 'A',
  KeyX: 'B', Escape: 'B', Backspace: 'B', KeyK: 'B',
  ShiftLeft: 'SELECT', ShiftRight: 'SELECT',
  Enter: 'START', Tab: 'START', KeyC: 'START',
};

const held = new Set();
const pressed = new Set();
const released = new Set();
const repeatAt = new Map();
let anyKeySignal = false;

const REPEAT_DELAY = 260;
const REPEAT_RATE = 92;

function press(btn) {
  if (!btn || held.has(btn)) return;
  held.add(btn);
  pressed.add(btn);
  repeatAt.set(btn, performance.now() + REPEAT_DELAY);
  anyKeySignal = true;
}
function release(btn) {
  if (!btn) return;
  held.delete(btn);
  released.add(btn);
  repeatAt.delete(btn);
}

window.addEventListener('keydown', (e) => {
  const b = KEYMAP[e.code];
  if (e.code === 'Tab' || (e.code === 'Space' && !e.repeat)) e.preventDefault();
  if (e.code === 'Backspace') e.preventDefault();
  if (b) {
    if (!e.repeat) press(b);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  }
  anyKeySignal = true;
  input.onKey?.(e);
});
window.addEventListener('keyup', (e) => {
  const b = KEYMAP[e.code];
  if (b) release(b);
});
window.addEventListener('blur', () => {
  for (const b of Array.from(held)) release(b);
});

// ---- touch -----------------------------------------------------------------
function bindTouch() {
  const root = document.getElementById('touch');
  if (!root) return;
  const nodes = root.querySelectorAll('[data-btn]');
  const active = new Map(); // pointerId -> btn

  function setDown(el, on) {
    if (on) el.setAttribute('data-down', '1');
    else el.removeAttribute('data-down');
  }
  function hit(x, y) {
    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      // Generous hit padding so thumbs land reliably.
      if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) return el;
    }
    return null;
  }
  function onDown(e) {
    document.body.classList.add('touch');
    const el = hit(e.clientX, e.clientY);
    if (!el) return;
    e.preventDefault();
    const btn = el.dataset.btn;
    active.set(e.pointerId, el);
    setDown(el, true);
    press(btn);
  }
  function onMove(e) {
    if (!active.has(e.pointerId)) return;
    const prev = active.get(e.pointerId);
    const el = hit(e.clientX, e.clientY);
    if (el === prev) return;
    if (prev) { setDown(prev, false); release(prev.dataset.btn); }
    if (el) { setDown(el, true); press(el.dataset.btn); active.set(e.pointerId, el); }
    else active.delete(e.pointerId);
  }
  function onUp(e) {
    const el = active.get(e.pointerId);
    if (el) { setDown(el, false); release(el.dataset.btn); }
    active.delete(e.pointerId);
  }
  root.addEventListener('pointerdown', onDown, { passive: false });
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

window.addEventListener('touchstart', () => document.body.classList.add('touch'), { once: true });

// ---- gamepad ---------------------------------------------------------------
const GP_MAP = { 12: 'UP', 13: 'DOWN', 14: 'LEFT', 15: 'RIGHT', 0: 'A', 1: 'B', 9: 'START', 8: 'SELECT' };
const gpHeld = new Set();

function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const now = new Set();
  for (const pad of pads) {
    if (!pad) continue;
    for (const [idx, btn] of Object.entries(GP_MAP)) {
      if (pad.buttons[idx] && pad.buttons[idx].pressed) now.add(btn);
    }
    const [ax, ay] = [pad.axes[0] || 0, pad.axes[1] || 0];
    if (ax < -0.45) now.add('LEFT');
    if (ax > 0.45) now.add('RIGHT');
    if (ay < -0.45) now.add('UP');
    if (ay > 0.45) now.add('DOWN');
  }
  for (const b of now) if (!gpHeld.has(b)) press(b);
  for (const b of gpHeld) if (!now.has(b)) release(b);
  gpHeld.clear();
  for (const b of now) gpHeld.add(b);
}

export const input = {
  onKey: null,
  /** true on the frame the button went down (or on auto-repeat) */
  pressed(btn) {
    return pressed.has(btn);
  },
  released(btn) {
    return released.has(btn);
  },
  held(btn) {
    return held.has(btn);
  },
  /** Pressed, including key-repeat — used for menu cursors. */
  repeat(btn) {
    if (pressed.has(btn)) return true;
    if (!held.has(btn)) return false;
    const t = repeatAt.get(btn) ?? Infinity;
    if (performance.now() >= t) {
      repeatAt.set(btn, performance.now() + REPEAT_RATE);
      return true;
    }
    return false;
  },
  /** Direction currently held, preferring the most recent axis. */
  dir() {
    if (held.has('UP')) return 1;
    if (held.has('DOWN')) return 0;
    if (held.has('LEFT')) return 2;
    if (held.has('RIGHT')) return 3;
    return -1;
  },
  anyPressed() {
    return pressed.size > 0;
  },
  consumedAnyKey() {
    const v = anyKeySignal;
    anyKeySignal = false;
    return v;
  },
  beginFrame() {
    pollGamepad();
  },
  endFrame() {
    pressed.clear();
    released.clear();
  },
  init: bindTouch,
};
