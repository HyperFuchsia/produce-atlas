/**
 * Unified input: touch, mouse, keyboard and gamepad all collapse into four
 * buffered actions — UP (jump/vault), DOWN (dive/slide), LEFT and RIGHT
 * (lane changes).
 *
 * The touch scheme is the part that needed care. Firing a jump on `pointerdown`
 * is the lowest-latency thing you can do, but it makes horizontal swipes
 * impossible — the jump has already gone off before the finger moves. Waiting
 * for `pointerup` fixes swipes and adds latency to every jump.
 *
 * So: a swipe fires the instant it crosses the threshold, a quick tap fires on
 * release, and a press still held after HOLD_FIRE_MS fires there and stays
 * held — which is what keeps variable jump height working for players who
 * press and hold rather than flick.
 *
 * Two details make it fair regardless:
 *  - *Buffering*: an action pressed slightly too early still fires when it
 *    becomes legal (BUFFER_MS).
 *  - *Hold state*: variable jump height and extended slides need to know the
 *    button is still down, not just that it was tapped.
 */

export type Action = 'up' | 'down' | 'left' | 'right';

const BUFFER_MS = 130;
/** Movement (CSS px) that turns a press into a swipe. */
const SWIPE_PX = 26;
/** A press still held this long fires in place, so holds still work. */
const HOLD_FIRE_MS = 120;

export interface InputOptions {
  /** Swap tap zones for left-handed / inverted preference. */
  invert: boolean;
}

interface Touch {
  startX: number;
  startY: number;
  startTime: number;
  fired: Action | null;
}

export class Input {
  private buffered: Record<Action, number> = { up: 0, down: 0, left: 0, right: 0 };
  private held: Record<Action, boolean> = { up: false, down: false, left: false, right: false };
  private heldSince: Record<Action, number> = { up: 0, down: 0, left: 0, right: 0 };
  private keys = new Set<string>();
  private touches = new Map<number, Touch>();
  private now = 0;
  private enabled = true;
  private padState: Record<Action, boolean> = { up: false, down: false, left: false, right: false };

  options: InputOptions = { invert: false };
  /** Fired for any input while the game is not running (menus use it to start). */
  onAnyPress: (() => void) | null = null;
  onPauseKey: (() => void) | null = null;

  constructor(private readonly target: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    target.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('blur', this.releaseAll);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
    // Belt and braces on iOS Safari: kill double-tap zoom and rubber-banding.
    target.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    target.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v) this.releaseAll();
  }

  /** Advance the internal clock; call once per frame before consuming. */
  tick(nowMs: number): void {
    this.now = nowMs;
    // A press held past the window is a deliberate hold, not a swipe.
    for (const t of this.touches.values()) {
      if (t.fired || nowMs - t.startTime < HOLD_FIRE_MS) continue;
      const action = this.zoneAction(t.startY);
      t.fired = action;
      this.press(action, nowMs);
    }
    this.pollGamepad();
  }

  /** True (once) if the action was pressed within the buffer window. */
  consume(action: Action): boolean {
    if (this.now - this.buffered[action] <= BUFFER_MS) {
      this.buffered[action] = -1e9;
      return true;
    }
    return false;
  }

  peek(action: Action): boolean {
    return this.now - this.buffered[action] <= BUFFER_MS;
  }

  clear(action: Action): void {
    this.buffered[action] = -1e9;
  }

  isHeld(action: Action): boolean {
    return this.held[action];
  }

  heldFor(action: Action): number {
    return this.held[action] ? (this.now - this.heldSince[action]) / 1000 : 0;
  }

  press(action: Action, nowMs = performance.now()): void {
    this.onAnyPress?.();
    if (!this.enabled) return;
    this.buffered[action] = nowMs;
    if (!this.held[action]) this.heldSince[action] = nowMs;
    // Lane changes are discrete: there is nothing to hold.
    this.held[action] = action === 'up' || action === 'down';
  }

  release(action: Action): void {
    this.held[action] = false;
  }

  releaseAll = (): void => {
    this.held.up = false;
    this.held.down = false;
    this.held.left = false;
    this.held.right = false;
    this.touches.clear();
    this.keys.clear();
  };

  // ------------------------------------------------------------------ keyboard
  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const code = e.code;
    if (code === 'Escape' || code === 'KeyP') {
      this.onPauseKey?.();
      return;
    }
    const action = this.keyAction(code);
    if (!action) return;
    e.preventDefault();
    this.keys.add(code);
    this.press(action, performance.now());
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const action = this.keyAction(e.code);
    if (!action) return;
    this.keys.delete(e.code);
    // Only release when no other key for the same action is still down.
    for (const k of this.keys) if (this.keyAction(k) === action) return;
    this.release(action);
  };

  private keyAction(code: string): Action | null {
    switch (code) {
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
      case 'KeyZ':
        return 'up';
      case 'ArrowDown':
      case 'KeyS':
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyX':
        return 'down';
      case 'ArrowLeft':
      case 'KeyA':
      case 'KeyQ':
        return 'left';
      case 'ArrowRight':
      case 'KeyD':
      case 'KeyE':
        return 'right';
      default:
        return null;
    }
  }

  // ------------------------------------------------------------------ pointer
  private onPointerDown = (e: PointerEvent): void => {
    // Menu buttons live in the DOM above the canvas and stop propagation
    // themselves; anything reaching here is a gameplay input.
    this.touches.set(e.pointerId, {
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      fired: null,
    });
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    this.onAnyPress?.();
    e.preventDefault();
  };

  private onPointerMove = (e: PointerEvent): void => {
    const t = this.touches.get(e.pointerId);
    if (!t || t.fired) return;
    const dx = e.clientX - t.startX;
    const dy = e.clientY - t.startY;
    if (Math.abs(dx) < SWIPE_PX && Math.abs(dy) < SWIPE_PX) return;

    // Dominant axis wins, so a sloppy diagonal still does the obvious thing.
    let action: Action;
    if (Math.abs(dx) > Math.abs(dy)) action = dx > 0 ? 'right' : 'left';
    else action = dy > 0 ? 'down' : 'up';
    t.fired = action;
    this.press(action, performance.now());
    e.preventDefault();
  };

  private onPointerUp = (e: PointerEvent): void => {
    const t = this.touches.get(e.pointerId);
    if (!t) return;
    this.touches.delete(e.pointerId);
    if (!t.fired) {
      // A clean tap: top half jumps, bottom half dives.
      this.press(this.zoneAction(t.startY), performance.now());
      // Release straight away — a tap is not a hold.
      this.release('up');
      this.release('down');
      return;
    }
    if (t.fired === 'up' || t.fired === 'down') {
      for (const other of this.touches.values()) if (other.fired === t.fired) return;
      this.release(t.fired);
    }
  };

  private zoneAction(clientY: number): Action {
    const rect = this.target.getBoundingClientRect();
    const rel = (clientY - rect.top) / Math.max(1, rect.height);
    const isTop = rel < 0.5;
    const up = this.options.invert ? !isTop : isTop;
    return up ? 'up' : 'down';
  }

  // ------------------------------------------------------------------ gamepad
  private pollGamepad(): void {
    const pads = navigator.getGamepads?.();
    if (!pads) return;
    const now: Record<Action, boolean> = { up: false, down: false, left: false, right: false };
    for (const pad of pads) {
      if (!pad) continue;
      now.up = now.up || !!pad.buttons[0]?.pressed || !!pad.buttons[12]?.pressed || (pad.axes[1] ?? 0) < -0.5;
      now.down = now.down || !!pad.buttons[1]?.pressed || !!pad.buttons[13]?.pressed || (pad.axes[1] ?? 0) > 0.5;
      now.left = now.left || !!pad.buttons[14]?.pressed || (pad.axes[0] ?? 0) < -0.5;
      now.right = now.right || !!pad.buttons[15]?.pressed || (pad.axes[0] ?? 0) > 0.5;
      if (pad.buttons[9]?.pressed) this.onPauseKey?.();
    }
    for (const a of ['up', 'down', 'left', 'right'] as Action[]) {
      if (now[a] && !this.padState[a]) this.press(a, performance.now());
      if (!now[a] && this.padState[a]) this.release(a);
      this.padState[a] = now[a];
    }
  }
}
