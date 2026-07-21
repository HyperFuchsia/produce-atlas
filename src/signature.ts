/**
 * Procedural "specimen signatures" — deterministic generative botanical marks.
 *
 * Every species (by id) produces a unique, stable 2-D form drawn on a canvas:
 * a phyllotactic (golden-angle) arrangement — the same spiral real plants grow
 * by — rendered as luminous strokes in the record's category colour. This
 * scales to thousands of species with no image assets, stays crisp at any size,
 * and reads as part of the dark data-globe aesthetic rather than clip-art.
 *
 * The mark is an interpretive signature, not a botanical reconstruction.
 */

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.5°

/** FNV-1a string hash → 32-bit unsigned. */
function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — small, fast, deterministic. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h.split("").map((c) => c + c).join("")
      : h,
    16,
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export interface SignatureOptions {
  /** Category / accent colour (hex). */
  color: string;
  /** Logical size in CSS pixels (square). */
  size?: number;
  /** Device pixel ratio to render at (crispness). */
  dpr?: number;
}

/**
 * Draw a specimen signature for `seed` into `canvas`. Pure function of the
 * seed + colour, so the same species always renders identically.
 */
export function renderSignature(
  canvas: HTMLCanvasElement,
  seed: string,
  opts: SignatureOptions,
): void {
  const size = opts.size ?? 132;
  const dpr = opts.dpr ?? Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  const rnd = mulberry32(hash32(seed));
  const [r, g, b] = hexToRgb(opts.color);
  const rgba = (a: number) => `rgba(${r},${g},${b},${a})`;

  const cx = size / 2;
  const cy = size / 2;

  // Seed-driven parameters — bounded so every mark stays elegant.
  const florets = 90 + Math.floor(rnd() * 150); // 90–240 elements
  const spread = size * (0.052 + rnd() * 0.03); // spiral tightness
  const petalLen = 3.2 + rnd() * 3.6;
  const petalWid = 1.1 + rnd() * 1.4;
  const twist = (rnd() - 0.5) * 0.5;
  const rings = rnd() > 0.55; // some species get an outer contour ring
  const maxR = size * 0.42;

  ctx.globalCompositeOperation = "lighter"; // additive glow
  ctx.lineCap = "round";

  for (let i = 0; i < florets; i++) {
    const angle = i * GOLDEN_ANGLE + twist * Math.sqrt(i);
    const radius = spread * Math.sqrt(i);
    if (radius > maxR) break;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    // Elements grow toward the rim, fade toward the core.
    const t = radius / maxR;
    const scale = 0.45 + t * 1.0;
    const alpha = 0.1 + t * 0.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.scale(scale, scale);

    // A slender luminous petal/seed.
    ctx.beginPath();
    ctx.moveTo(0, -petalLen);
    ctx.quadraticCurveTo(petalWid, 0, 0, petalLen);
    ctx.quadraticCurveTo(-petalWid, 0, 0, -petalLen);
    ctx.fillStyle = rgba(alpha * 0.5);
    ctx.fill();
    ctx.lineWidth = 0.4;
    ctx.strokeStyle = rgba(alpha);
    ctx.stroke();
    ctx.restore();
  }

  // Optional outer contour ring for extra variety.
  if (rings) {
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * (0.86 + rnd() * 0.1), 0, Math.PI * 2);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = rgba(0.22);
    ctx.setLineDash([1.5, 4 + rnd() * 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Bright core.
  ctx.globalCompositeOperation = "lighter";
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.14);
  core.addColorStop(0, rgba(0.85));
  core.addColorStop(1, rgba(0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.14, 0, Math.PI * 2);
  ctx.fill();
}
