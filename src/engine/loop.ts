import { clamp } from './math';

/**
 * Fixed-timestep simulation with interpolated rendering.
 *
 * A runner lives or dies on consistent physics: at 120 Hz on a ProMotion iPad
 * and 60 Hz on an older phone the jump arc must be identical, so the sim always
 * advances in 1/120 s slices and the renderer interpolates between them.
 */

export const FIXED_DT = 1 / 120;
const MAX_FRAME = 0.25; // never simulate more than a quarter second of catch-up

export interface LoopStats {
  fps: number;
  frameMs: number;
  steps: number;
}

export class Loop {
  private acc = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private fpsSamples: number[] = [];

  readonly stats: LoopStats = { fps: 60, frameMs: 16.7, steps: 1 };

  constructor(
    private readonly update: (dt: number) => void,
    private readonly render: (alpha: number, frameDt: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Drop accumulated time (after a pause / tab restore) to avoid a fast-forward. */
  resync(): void {
    this.last = performance.now();
    this.acc = 0;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);

    const frameDt = clamp((now - this.last) / 1000, 0, MAX_FRAME);
    this.last = now;
    this.acc += frameDt;

    let steps = 0;
    while (this.acc >= FIXED_DT && steps < 8) {
      this.update(FIXED_DT);
      this.acc -= FIXED_DT;
      steps++;
    }
    if (steps === 8) this.acc = 0; // hard catch-up guard on very slow devices

    const alpha = clamp(this.acc / FIXED_DT, 0, 1);
    const t0 = performance.now();
    this.render(alpha, frameDt);
    const t1 = performance.now();

    this.stats.steps = steps;
    this.stats.frameMs = t1 - t0;
    if (frameDt > 0) {
      this.fpsSamples.push(1 / frameDt);
      if (this.fpsSamples.length > 30) this.fpsSamples.shift();
      let sum = 0;
      for (const s of this.fpsSamples) sum += s;
      this.stats.fps = sum / this.fpsSamples.length;
    }
  };
}
