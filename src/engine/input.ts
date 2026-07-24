/**
 * Unified input: touch (tap zones + swipes), mouse, keyboard and gamepad all
 * collapse into two buffered actions — UP (jump/vault) and DOWN (dive/slide).
 *
 * Two details that make a runner feel fair:
 *  - *Buffering*: an action pressed slightly too early still fires when it
 *    becomes legal (BUFFER_MS).
 *  - *Hold state*: variable jump height and extended slides need to know the
 *    button is still down, not just that it was tapped.
 */

export type Action = 'up' | 'down';

const BUFFER_MS = 130;

export interface InputOptions {
  /** Swap tap zones for left-handed / inverted preference. */
  invert: boolean;
}

export class Input {
  private buffered: Record<Action, number> = { up: 0, down: 0 };
  private held: Record<Action, boolean> = { up: false, down: false };
  private heldSince: Record<Action, number> = { up: 0, down: 0 };
  private keys = new Set<string>();
  private pointerAction = new Map<number, Action>();
  private now = 0;
  private enabled = true;
  private padUpWasDown = false;
  private padDownWasDown = false;

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
    this.held[action] = true;
  }

  release(action: Action): void {
    this.held[action] = false;
  }

  releaseAll = (): void => {
    this.held.up = false;
    this.held.down = false;
    this.pointerAction.clear();
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
      default:
        return null;
    }
  }

  // ------------------------------------------------------------------ pointer
  private onPointerDown = (e: PointerEvent): void => {
    // Menu buttons live in the DOM above the canvas and stop propagation
    // themselves; anything reaching here is a gameplay input.
    const action = this.resolveZone(e.clientY);
    this.pointerAction.set(e.pointerId, action);
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    this.press(action, performance.now());
    e.preventDefault();
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.pointerAction.has(e.pointerId)) return;
    // A swipe that crosses into the other half re-triggers the opposite action,
    // so "tap-and-drag down" reads as a dive without lifting the finger.
    const action = this.resolveZone(e.clientY);
    const prev = this.pointerAction.get(e.pointerId);
    if (prev !== action) {
      this.pointerAction.set(e.pointerId, action);
      if (prev) this.release(prev);
      this.press(action, performance.now());
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    const action = this.pointerAction.get(e.pointerId);
    if (!action) return;
    this.pointerAction.delete(e.pointerId);
    for (const a of this.pointerAction.values()) if (a === action) return;
    this.release(action);
  };

  private resolveZone(clientY: number): Action {
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
    let up = false;
    let down = false;
    for (const pad of pads) {
      if (!pad) continue;
      up = up || !!pad.buttons[0]?.pressed || !!pad.buttons[12]?.pressed || (pad.axes[1] ?? 0) < -0.5;
      down = down || !!pad.buttons[1]?.pressed || !!pad.buttons[13]?.pressed || (pad.axes[1] ?? 0) > 0.5;
      if (pad.buttons[9]?.pressed) this.onPauseKey?.();
    }
    if (up && !this.padUpWasDown) this.press('up', performance.now());
    if (!up && this.padUpWasDown) this.release('up');
    if (down && !this.padDownWasDown) this.press('down', performance.now());
    if (!down && this.padDownWasDown) this.release('down');
    this.padUpWasDown = up;
    this.padDownWasDown = down;
  }
}
