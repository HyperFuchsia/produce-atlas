import { clamp } from './math';

/**
 * Canvas sizing for the WebGL view.
 *
 * The 3-D camera derives its aspect from the canvas, so there is no virtual
 * viewport to letterbox any more — this exists to own device pixel ratio,
 * safe-area insets and resize notification in one place.
 */

export interface Viewport {
  /** CSS pixels. */
  width: number;
  height: number;
  /** Back-buffer size in device pixels. */
  pixelWidth: number;
  pixelHeight: number;
  dpr: number;
  aspect: number;
  portrait: boolean;
  /** Safe-area insets in CSS pixels. */
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
  readonly viewport: Viewport;
  /** Multiplier applied to DPR by the performance governor. */
  renderScale = 1;
  private onResizeCbs: ((vp: Viewport) => void)[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.viewport = {
      width: 960,
      height: 540,
      pixelWidth: 960,
      pixelHeight: 540,
      dpr: 1,
      aspect: 16 / 9,
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

    const vp = this.viewport;
    vp.width = cssW;
    vp.height = cssH;
    vp.dpr = dpr;
    vp.aspect = cssW / cssH;
    vp.portrait = cssW < cssH;

    // Cap the back-buffer so a 3× phone or a 5K monitor doesn't melt the GPU.
    const target = clamp(dpr * this.renderScale, 0.5, 1.75);
    vp.pixelWidth = Math.round(cssW * target);
    vp.pixelHeight = Math.round(cssH * target);

    const insets = readInsets();
    vp.insetTop = insets.t;
    vp.insetBottom = insets.b;
    vp.insetLeft = insets.l;
    vp.insetRight = insets.r;

    for (const cb of this.onResizeCbs) cb(vp);
  };

  /** Effective pixel ratio for the WebGL renderer. */
  get pixelRatio(): number {
    return clamp(this.viewport.dpr * this.renderScale, 0.5, 1.75);
  }

  setRenderScale(scale: number): void {
    if (Math.abs(scale - this.renderScale) < 0.02) return;
    this.renderScale = scale;
    this.resize();
  }
}
