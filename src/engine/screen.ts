import { clamp } from './math';

/**
 * Canvas sizing. The game is authored against a *virtual* viewport with a fixed
 * height so tuning is resolution independent; the width flexes with the device
 * aspect ratio (wider phones simply see further down the Conduit, which is the
 * fair way to handle it — the camera pulls back rather than the world changing).
 */

/**
 * The design height. Landscape phones and tablets get exactly this, which is
 * what all the tuning was authored against.
 */
export const VIRTUAL_HEIGHT = 540;
export const MIN_VIRTUAL_WIDTH = 620;
export const MAX_VIRTUAL_WIDTH = 1180;
export const MAX_VIRTUAL_HEIGHT = 1500;

/**
 * Where the deck sits, given a viewport height. Landscape lands on 400 of 540
 * exactly as before; a tall portrait viewport keeps the same band of floor
 * below the runner and spends the extra height on city above him.
 */
export const groundYFor = (viewportHeight: number): number =>
  viewportHeight - Math.min(240, Math.max(140, viewportHeight * 0.26));

export interface Viewport {
  /** virtual units */
  width: number;
  height: number;
  /** device pixels */
  pixelWidth: number;
  pixelHeight: number;
  scale: number;
  dpr: number;
  portrait: boolean;
  /** safe-area insets expressed in virtual units */
  insetTop: number;
  insetBottom: number;
  insetLeft: number;
  insetRight: number;
}

/**
 * Reads the real safe-area insets in CSS pixels. `env()` inside a custom
 * property is not reliably readable via getComputedStyle, so we measure an
 * off-screen probe whose padding is driven by the env() values instead.
 */
let insetProbe: HTMLDivElement | null = null;
const readInsets = (): { t: number; b: number; l: number; r: number } => {
  if (typeof document === 'undefined') return { t: 0, b: 0, l: 0, r: 0 };
  if (!insetProbe) {
    insetProbe = document.createElement('div');
    insetProbe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);' +
      'padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);';
    document.body.appendChild(insetProbe);
  }
  const s = getComputedStyle(insetProbe);
  const n = (v: string) => {
    const p = parseFloat(v);
    return Number.isFinite(p) ? p : 0;
  };
  return { t: n(s.paddingTop), b: n(s.paddingBottom), l: n(s.paddingLeft), r: n(s.paddingRight) };
};

export class Screen {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly viewport: Viewport;
  /** Render scale multiplier (dropped on weak devices by the perf governor). */
  renderScale = 1;
  private onResizeCbs: ((vp: Viewport) => void)[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) throw new Error('Canvas 2D is unavailable on this device.');
    this.ctx = ctx;
    this.viewport = {
      width: 960,
      height: VIRTUAL_HEIGHT,
      pixelWidth: 960,
      pixelHeight: VIRTUAL_HEIGHT,
      scale: 1,
      dpr: 1,
      portrait: false,
      insetTop: 0,
      insetBottom: 0,
      insetLeft: 0,
      insetRight: 0,
    };
    this.resize();

    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', () => setTimeout(this.resize, 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this.resize);
  }

  onResize(cb: (vp: Viewport) => void): void {
    this.onResizeCbs.push(cb);
  }

  resize = (): void => {
    const cssW = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const cssH = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const dpr = clamp(window.devicePixelRatio || 1, 1, 3);
    const aspect = cssW / cssH;

    // Flex the virtual viewport so its aspect always matches the device's.
    // A fixed 16:9 stage letterboxed a portrait phone down to a narrow strip
    // with black bars over most of the screen; instead the width holds its
    // range and the height grows, which portrait then fills with skyline.
    const vp = this.viewport;
    let vw = VIRTUAL_HEIGHT * aspect;
    let vh = VIRTUAL_HEIGHT;
    if (vw < MIN_VIRTUAL_WIDTH) {
      vw = MIN_VIRTUAL_WIDTH;
      vh = MIN_VIRTUAL_WIDTH / aspect;
    } else if (vw > MAX_VIRTUAL_WIDTH) {
      vw = MAX_VIRTUAL_WIDTH;
      vh = MAX_VIRTUAL_WIDTH / aspect;
    }
    if (vh > MAX_VIRTUAL_HEIGHT) {
      vh = MAX_VIRTUAL_HEIGHT;
      vw = MAX_VIRTUAL_HEIGHT * aspect;
    }
    vp.width = Math.round(vw);
    vp.height = Math.round(vh);
    vp.portrait = aspect < 1;
    vp.dpr = dpr;

    // Effective back-buffer, capped so huge desktop windows don't torch the GPU.
    const target = clamp(dpr * this.renderScale, 0.75, 2.5);
    const pw = Math.round(cssW * target);
    const ph = Math.round(cssH * target);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    vp.pixelWidth = pw;
    vp.pixelHeight = ph;
    // Uniform scale + letterbox: the virtual viewport always fits exactly.
    vp.scale = Math.min(pw / vp.width, ph / vp.height);

    const insets = readInsets();
    const toVirtual = (cssPx: number) => cssPx * (vp.height / cssH);
    vp.insetTop = toVirtual(insets.t);
    vp.insetBottom = toVirtual(insets.b);
    vp.insetLeft = toVirtual(insets.l);
    vp.insetRight = toVirtual(insets.r);

    for (const cb of this.onResizeCbs) cb(vp);
  };

  setRenderScale(scale: number): void {
    if (Math.abs(scale - this.renderScale) < 0.02) return;
    this.renderScale = scale;
    this.resize();
  }

  /** Prepare the context so drawing can happen in virtual units, centred. */
  begin(): CanvasRenderingContext2D {
    const { ctx, viewport: vp } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const ox = (vp.pixelWidth - vp.width * vp.scale) * 0.5;
    const oy = (vp.pixelHeight - vp.height * vp.scale) * 0.5;
    ctx.clearRect(0, 0, vp.pixelWidth, vp.pixelHeight);
    if (ox > 0 || oy > 0) {
      ctx.fillStyle = '#04050b';
      ctx.fillRect(0, 0, vp.pixelWidth, vp.pixelHeight);
    }
    ctx.setTransform(vp.scale, 0, 0, vp.scale, ox, oy);
    return ctx;
  }

  /** Convert a DOM pointer event position to virtual coordinates. */
  toVirtual(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const vp = this.viewport;
    const px = ((clientX - rect.left) / rect.width) * vp.pixelWidth;
    const py = ((clientY - rect.top) / rect.height) * vp.pixelHeight;
    const ox = (vp.pixelWidth - vp.width * vp.scale) * 0.5;
    const oy = (vp.pixelHeight - vp.height * vp.scale) * 0.5;
    return { x: (px - ox) / vp.scale, y: (py - oy) / vp.scale };
  }
}
