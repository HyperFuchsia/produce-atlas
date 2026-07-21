/**
 * Generative botanical illustration — the atlas's visual centrepiece.
 *
 * Every species (by id) grows a unique, stable ink-line plant: a stem with
 * phyllotactic leaves and a category-appropriate inflorescence (grass ear,
 * Apiaceae umbel, composite disc, simple blossom, berry cluster, legume pod,
 * or catkin). Rendered as an engraving-style drawing so it sits on the
 * herbarium parchment rather than a screen. Deterministic: same species →
 * same plate.
 *
 * These are interpretive signatures, not botanically exact reconstructions.
 */

const GOLDEN_ANGLE = 137.5 * (Math.PI / 180);

function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

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

type InflorescenceKind =
  | "spike" // cereals / grasses
  | "umbel" // herbs & spices (Apiaceae)
  | "composite" // oil / sunflower family
  | "blossom" // vegetables — simple 5-petal flower
  | "berry" // fruit / beverage — fruit cluster
  | "pod" // legumes
  | "catkin"; // nuts

const KIND_BY_CATEGORY: Record<string, InflorescenceKind> = {
  cereal: "spike",
  spice: "umbel",
  oil: "composite",
  vegetable: "blossom",
  fruit: "berry",
  beverage: "berry",
  legume: "pod",
  tuber: "blossom",
  nut: "catkin",
};

export interface PlantOptions {
  /** Category tint (hex). */
  color: string;
  /** Ink colour for line work (hex). */
  ink?: string;
  /** Category id, selects the inflorescence archetype. */
  category?: string;
  /** Logical square size in CSS px. */
  size?: number;
  dpr?: number;
}

export function renderPlant(
  canvas: HTMLCanvasElement,
  seed: string,
  opts: PlantOptions,
): void {
  const size = opts.size ?? 300;
  const dpr = opts.dpr ?? Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const rnd = mulberry32(hash32(seed));
  const ink = opts.ink ?? "#2c2620";
  const tint = opts.color;
  const kind: InflorescenceKind =
    (opts.category && KIND_BY_CATEGORY[opts.category]) || "blossom";

  const cx = size / 2;
  const baseY = size * 0.94;
  const topY = size * (0.16 + rnd() * 0.05);
  const sway = (rnd() - 0.5) * size * 0.12;

  // Stem as a quadratic curve from base to apex.
  const ctrlX = cx + sway;
  const ctrlY = (baseY + topY) / 2;
  const apexX = cx + sway * 0.5;

  const stemAt = (t: number) => {
    const mt = 1 - t;
    return {
      x: mt * mt * cx + 2 * mt * t * ctrlX + t * t * apexX,
      y: mt * mt * baseY + 2 * mt * t * ctrlY + t * t * topY,
    };
  };
  const stemAngleAt = (t: number) => {
    const mt = 1 - t;
    const dx = 2 * mt * (ctrlX - cx) + 2 * t * (apexX - ctrlX);
    const dy = 2 * mt * (ctrlY - baseY) + 2 * t * (topY - ctrlY);
    return Math.atan2(dy, dx);
  };

  // --- Stem (tapered) ---
  const segs = 24;
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const p = stemAt(i / segs);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = withAlpha(ink, 0.9);
  ctx.stroke();

  // --- Leaves along the stem (phyllotaxis) ---
  const nodes = 4 + Math.floor(rnd() * 4);
  const serrate = rnd() > 0.55;
  const leafBlade = 0.9 + rnd() * 0.5;
  for (let i = 0; i < nodes; i++) {
    const t = 0.12 + (i / nodes) * 0.7;
    const p = stemAt(t);
    const stemAng = stemAngleAt(t);
    const side = i % 2 === 0 ? 1 : -1;
    const spread = (0.7 + rnd() * 0.35) * side;
    const ang = stemAng + spread; // leaf points outward/up from stem
    const len = size * (0.2 + (1 - t) * 0.16) * leafBlade;
    drawLeaf(ctx, p.x, p.y, ang, len, len * 0.32, serrate, ink, tint);
  }

  // --- Inflorescence at the apex ---
  const apex = stemAt(1);
  drawInflorescence(ctx, apex.x, apex.y, size, kind, rnd, ink, tint);

  function withAlpha(hex: string, a: number): string {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }
}

function drawLeaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ang: number,
  len: number,
  wid: number,
  serrate: boolean,
  ink: string,
  tint: string,
) {
  const tipX = x + Math.cos(ang) * len;
  const tipY = y + Math.sin(ang) * len;
  const perp = ang + Math.PI / 2;
  const mx = x + Math.cos(ang) * len * 0.5;
  const my = y + Math.sin(ang) * len * 0.5;
  const bx = Math.cos(perp) * wid;
  const by = Math.sin(perp) * wid;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx + bx, my + by, tipX, tipY);
  ctx.quadraticCurveTo(mx - bx, my - by, x, y);
  ctx.closePath();
  ctx.fillStyle = rgba(tint, 0.16);
  ctx.fill();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = rgba(ink, 0.7);
  ctx.stroke();

  // midrib
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tipX, tipY);
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = rgba(ink, 0.5);
  ctx.stroke();

  if (serrate) {
    // a couple of vein hints
    for (const f of [0.4, 0.65]) {
      const vx = x + Math.cos(ang) * len * f;
      const vy = y + Math.sin(ang) * len * f;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx + Math.cos(perp) * wid * 0.5, vy + Math.sin(perp) * wid * 0.5);
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx - Math.cos(perp) * wid * 0.5, vy - Math.sin(perp) * wid * 0.5);
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = rgba(ink, 0.35);
      ctx.stroke();
    }
  }
}

function drawInflorescence(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  kind: InflorescenceKind,
  rnd: () => number,
  ink: string,
  tint: string,
) {
  const s = size / 300; // scale factor
  ctx.lineWidth = 1;

  const dot = (dx: number, dy: number, r: number, a = 0.9) => {
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(tint, 0.5 * a);
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = rgba(ink, 0.7 * a);
    ctx.stroke();
  };

  switch (kind) {
    case "spike": {
      // grass ear: staggered grains up a short terminal axis
      const n = 6 + Math.floor(rnd() * 5);
      for (let i = 0; i < n; i++) {
        const gy = y - i * 7 * s;
        const off = (i % 2 === 0 ? 1 : -1) * 4 * s;
        ctx.save();
        ctx.translate(x + off, gy);
        ctx.rotate((off > 0 ? -0.5 : 0.5));
        ctx.beginPath();
        ctx.ellipse(0, 0, 5.5 * s, 2.6 * s, 0, 0, Math.PI * 2);
        ctx.fillStyle = rgba(tint, 0.45);
        ctx.fill();
        ctx.strokeStyle = rgba(ink, 0.7);
        ctx.stroke();
        // awn
        ctx.beginPath();
        ctx.moveTo(0, -1 * s);
        ctx.lineTo(0, -12 * s);
        ctx.strokeStyle = rgba(ink, 0.4);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case "umbel": {
      // Apiaceae umbel: radiating spokes tipped with tiny florets
      const spokes = 9 + Math.floor(rnd() * 6);
      const R = (22 + rnd() * 8) * s;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        const ex = x + Math.cos(a) * R;
        const ey = y - 6 * s + Math.sin(a) * R * 0.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(ex, ey);
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = rgba(ink, 0.55);
        ctx.stroke();
        dot(ex, ey, 1.8 * s);
      }
      break;
    }
    case "composite": {
      // sunflower-like: ray petals around a spiral seed disc
      const petals = 12 + Math.floor(rnd() * 8);
      const R = (20 + rnd() * 6) * s;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(6 * s, 0);
        ctx.quadraticCurveTo(R * 0.6, 3.2 * s, R, 0);
        ctx.quadraticCurveTo(R * 0.6, -3.2 * s, 6 * s, 0);
        ctx.fillStyle = rgba(tint, 0.4);
        ctx.fill();
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = rgba(ink, 0.55);
        ctx.stroke();
        ctx.restore();
      }
      // seed disc via phyllotaxis
      const seeds = 40;
      for (let i = 0; i < seeds; i++) {
        const rr = 6 * s * Math.sqrt(i / seeds);
        const a = i * GOLDEN_ANGLE;
        dot(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 0.9 * s, 0.8);
      }
      break;
    }
    case "blossom": {
      // simple 5-petal flower
      const petals = 5 + (rnd() > 0.5 ? 1 : 0);
      const R = (14 + rnd() * 6) * s;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2 - Math.PI / 2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(R * 0.7, -R * 0.5, 0, -R);
        ctx.quadraticCurveTo(-R * 0.7, -R * 0.5, 0, 0);
        ctx.fillStyle = rgba(tint, 0.32);
        ctx.fill();
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = rgba(ink, 0.6);
        ctx.stroke();
        ctx.restore();
      }
      dot(x, y, 3 * s);
      break;
    }
    case "berry": {
      // small cluster of fruits
      const n = 3 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd();
        const rr = (8 + rnd() * 8) * s;
        dot(x + Math.cos(a) * rr, y - 4 * s + Math.sin(a) * rr * 0.7, (4 + rnd() * 2) * s);
      }
      break;
    }
    case "pod": {
      // a hanging legume pod + small keel flower
      const len = (34 + rnd() * 12) * s;
      const curve = (rnd() - 0.5) * 16 * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + curve, y + len * 0.5, x + curve * 0.4, y + len);
      ctx.lineWidth = 5 * s;
      ctx.strokeStyle = rgba(tint, 0.4);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(ink, 0.6);
      ctx.stroke();
      // seeds as bumps
      for (let i = 0; i < 4; i++) {
        const t = 0.2 + i * 0.2;
        dot(x + curve * t, y + len * t, 1.6 * s, 0.7);
      }
      dot(x, y, 3 * s);
      break;
    }
    case "catkin": {
      // drooping catkin + a nut
      const len = (28 + rnd() * 10) * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 8 * s, y + len * 0.6, x + 2 * s, y + len);
      ctx.lineWidth = 4 * s;
      ctx.strokeStyle = rgba(tint, 0.4);
      ctx.stroke();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = rgba(ink, 0.5);
      ctx.stroke();
      dot(x - 6 * s, y + 4 * s, 5 * s);
      break;
    }
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16,
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
