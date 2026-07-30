/**
 * Reveal choreography. Every style answers the same question for one glyph:
 * "where do you come from, when do you leave, and how long do you take?"
 * The stage then interpolates from that start state to the glyph's home.
 */

export const EASE = {
  outCubic: (t) => 1 - (1 - t) ** 3,
  outQuint: (t) => 1 - (1 - t) ** 5,
  outBack: (t) => 1 + 2.2 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2,
  outElastic: (t) =>
    t === 0 || t === 1 ? t : 2 ** (-9 * t) * Math.sin((t * 10 - 0.75) * 2.1) + 1,
  inOutCubic: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
};

/** Deterministic per-glyph pseudo-random so replays look identical. */
function rand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const STYLES = {
  /** Type rises out of the water, straightening as it clears the surface. */
  surface(g, ctx) {
    const depth = ctx.altitude + g.y + 2.2 + rand(ctx.seed + g.col) * 1.6;
    return {
      offset: [rand(ctx.seed + g.col * 3) * 0.6 - 0.3, -depth, -1.2],
      rotation: [-0.75, (rand(ctx.seed + g.col) - 0.5) * 0.5, (rand(ctx.seed + g.col * 7) - 0.5) * 0.3],
      scale: 0.72,
      delay: ctx.colFrac * 0.85 + ctx.lineFrac * 0.5,
      duration: 1.5,
      ease: EASE.outQuint,
    };
  },

  /** Characters converge from a sphere of scattered debris. */
  swarm(g, ctx) {
    const a = rand(ctx.seed + g.col * 5 + g.line * 13) * Math.PI * 2;
    const b = (rand(ctx.seed + g.col * 11) - 0.5) * Math.PI;
    const r = 11 + rand(ctx.seed + g.col) * 12;
    return {
      offset: [Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r * 0.6, Math.sin(a) * Math.cos(b) * r],
      rotation: [rand(ctx.seed + g.col) * 6, rand(ctx.seed + g.col * 3) * 6, rand(ctx.seed + g.col * 9) * 6],
      scale: 0.2,
      delay: rand(ctx.seed + g.col * 17 + g.line) * 0.9,
      duration: 1.7,
      ease: EASE.outQuint,
    };
  },

  /** Each glyph hinges down out of edge-on, like a split-flap board. */
  unfold(g, ctx) {
    return {
      offset: [0, 0.1, 0],
      rotation: [-Math.PI / 2, 0, 0],
      scale: 1,
      delay: ctx.colFrac * 0.6 + ctx.lineFrac * 0.7,
      duration: 0.95,
      ease: EASE.outBack,
    };
  },

  /** Letters ignite in reading order, punching out from nothing. */
  ignite(g, ctx) {
    return {
      offset: [0, 0, -0.4],
      rotation: [0, 0, (rand(ctx.seed + g.col) - 0.5) * 0.6],
      scale: 0.02,
      delay: (ctx.readIndex / Math.max(ctx.total, 1)) * 1.5,
      duration: 0.8,
      ease: EASE.outBack,
    };
  },

  /** A swell passes along each line and leaves the type behind it. */
  tide(g, ctx) {
    const phase = ctx.colFrac * Math.PI * 2;
    return {
      offset: [0, 1.4 + Math.sin(phase) * 0.9, 0],
      rotation: [Math.sin(phase) * 0.4, 0, Math.cos(phase) * 0.22],
      scale: 0.85,
      delay: ctx.colFrac * 1.1 + ctx.lineFrac * 0.35,
      duration: 1.25,
      ease: EASE.outElastic,
    };
  },

  /** Type drops in from above and settles with a small bounce. */
  descend(g, ctx) {
    return {
      offset: [0, 9 + rand(ctx.seed + g.col) * 5, 0],
      rotation: [1.15, 0, (rand(ctx.seed + g.col * 3) - 0.5) * 0.7],
      scale: 1.15,
      delay: ctx.colFrac * 0.35 + ctx.lineFrac * 0.75,
      duration: 1.25,
      ease: EASE.outBack,
    };
  },

  /** Characters streak in from behind the viewer at speed. */
  warp(g, ctx) {
    return {
      offset: [g.x * 1.7, g.y * 1.2, 34 + rand(ctx.seed + g.col) * 16],
      rotation: [0, 0, (rand(ctx.seed + g.col * 5) - 0.5) * 2.4],
      scale: 2.6,
      delay: (1 - ctx.colFrac) * 0.35 + ctx.lineFrac * 0.5,
      duration: 1.4,
      ease: EASE.outQuint,
    };
  },
};

export const STYLE_NAMES = Object.keys(STYLES);

/** Picks a style that suits the card when the user leaves it on "auto". */
export function autoStyle(card, index) {
  if (card.kinds.includes('title')) return 'surface';
  if (card.kinds.includes('stat')) return 'ignite';
  if (card.kinds.includes('quote')) return 'tide';
  if (card.kinds.includes('bullets')) return 'unfold';
  const rotation = ['surface', 'descend', 'swarm', 'warp', 'tide'];
  return rotation[index % rotation.length];
}

export function startStateFor(styleName, glyph, ctx) {
  const style = STYLES[styleName] ?? STYLES.surface;
  return style(glyph, ctx);
}

/** Exit choreography — the card breaks apart and drifts away. */
export function exitStateFor(glyph, ctx) {
  const a = rand(ctx.seed + glyph.col * 7 + glyph.line * 3) * Math.PI * 2;
  const r = 4 + rand(ctx.seed + glyph.col) * 7;
  return {
    offset: [Math.cos(a) * r, 1.5 + rand(ctx.seed + glyph.col * 13) * 4, Math.sin(a) * r * 0.6 + 3],
    rotation: [rand(ctx.seed + glyph.col) * 3, rand(ctx.seed + glyph.col * 5) * 3, rand(ctx.seed + glyph.col * 9) * 3],
    scale: 0.001,
    delay: (1 - ctx.colFrac) * 0.25 + ctx.lineFrac * 0.2,
    duration: 0.95,
    ease: EASE.inOutCubic,
  };
}
