/**
 * Central tuning: colour palettes, typographic scale and world layout.
 * Everything visual that is worth nudging by hand lives here.
 */

/** Direction the sun sits in, in world space (normalised in the shaders). */
export const SUN_DIR = [0.86, 0.05, -1];

export const PALETTES = [
  {
    id: 'miami',
    name: 'Miami Sunset',
    sky: {
      zenith: 0x120736,
      upper: 0x3d1268,
      mid: 0xa8237f,
      horizon: 0xff8f5e,
      sunCore: 0xffe6a4,
      sunGlow: 0xff5c8a,
      cloudDark: 0x2b0f46,
      cloudLit: 0xff9ec0,
      sunSize: 0.175,
      bands: 7.5,
    },
    water: {
      deep: 0x06041d,
      shallow: 0x1a2a72,
      grid: 0x28e8ff,
      gridStrength: 0.34,
    },
    type: {
      title: 0xf3f7ff,
      heading: 0xffdff2,
      body: 0xdce8ff,
      accent: 0x3ceaff,
      stat: 0xffd166,
      quote: 0xffb3dd,
      marker: 0x3ceaff,
    },
    bloom: { strength: 0.5, radius: 0.72, threshold: 1.05 },
    beacon: 0xff64ad,
  },
  {
    id: 'void',
    name: 'Neon Void',
    sky: {
      zenith: 0x01010c,
      upper: 0x0d0b3f,
      mid: 0x341a86,
      horizon: 0x8b2bd0,
      sunCore: 0xd8fbff,
      sunGlow: 0x7d5cff,
      cloudDark: 0x0a0730,
      cloudLit: 0x9c8cff,
      sunSize: 0.155,
      bands: 9,
    },
    water: {
      deep: 0x01010a,
      shallow: 0x0a1745,
      grid: 0xff45bb,
      gridStrength: 0.4,
    },
    type: {
      title: 0xeef3ff,
      heading: 0x8ff0ff,
      body: 0xcfd9ff,
      accent: 0xff5ec4,
      stat: 0x9dfcff,
      quote: 0xb9a6ff,
      marker: 0xff5ec4,
    },
    bloom: { strength: 0.66, radius: 0.8, threshold: 0.95 },
    beacon: 0x6a7bff,
  },
  {
    id: 'aqua',
    name: 'Aqua Dusk',
    sky: {
      zenith: 0x04263c,
      upper: 0x0c5568,
      mid: 0x35a89b,
      horizon: 0xffd08a,
      sunCore: 0xfffdf0,
      sunGlow: 0xff9d52,
      cloudDark: 0x134a52,
      cloudLit: 0xffc9a0,
      sunSize: 0.17,
      bands: 6.5,
    },
    water: {
      deep: 0x02141e,
      shallow: 0x0d5468,
      grid: 0xffe9a3,
      gridStrength: 0.3,
    },
    type: {
      title: 0xfdfbf3,
      heading: 0xffc46b,
      body: 0xe6f6ff,
      accent: 0x6ff0d8,
      stat: 0xfff0a8,
      quote: 0xbfeee4,
      marker: 0x6ff0d8,
    },
    bloom: { strength: 0.44, radius: 0.7, threshold: 1.1 },
    beacon: 0xffb066,
  },
];

/**
 * Typographic roles. `size` is cap-height-ish in world units, `tracking` and
 * `lineHeight` are multiples of the size. `profile` picks an extrusion recipe.
 */
export const TYPE = {
  title: { font: 'display', size: 1.62, tracking: 0.085, lineHeight: 1.36, profile: 'deep', wrap: 19, align: 'center', role: 'title' },
  heading: { font: 'display', size: 1.0, tracking: 0.06, lineHeight: 1.42, profile: 'deep', wrap: 20, align: 'center', role: 'heading' },
  body: { font: 'body', size: 0.57, tracking: 0.012, lineHeight: 1.62, profile: 'flat', wrap: 19.5, align: 'center', role: 'body' },
  bullet: { font: 'body', size: 0.59, tracking: 0.012, lineHeight: 1.58, profile: 'flat', wrap: 18, align: 'left', role: 'body' },
  quote: { font: 'body', size: 0.88, tracking: 0.02, lineHeight: 1.5, profile: 'flat', wrap: 16, align: 'center', role: 'quote' },
  stat: { font: 'display', size: 2.9, tracking: 0.02, lineHeight: 1.1, profile: 'deep', wrap: 22, align: 'center', role: 'stat' },
  label: { font: 'body', size: 0.42, tracking: 0.2, lineHeight: 1.7, profile: 'flat', wrap: 22, align: 'center', role: 'accent' },
  kvValue: { font: 'display', size: 0.78, tracking: 0.03, lineHeight: 1.35, profile: 'deep', wrap: 19, align: 'center', role: 'heading' },
};

/** Extrusion recipes, expressed relative to a 1-unit em so they scale cleanly. */
export const PROFILES = {
  deep: { depth: 0.2, bevelThickness: 0.022, bevelSize: 0.018, bevelSegments: 2, curveSegments: 5 },
  flat: { depth: 0.085, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 1, curveSegments: 4 },
};

export const WORLD = {
  /** Distance between consecutive scenes along the flight path. */
  sceneSpacing: 30,
  /** Lateral sway of the flight path. */
  sway: 7.4,
  /** Minimum height of a card's centre above the water. */
  altitude: 5.6,
  /** Clearance kept between a card's bottom line and the waterline. */
  clearance: 2.7,
  /** How far below a card the camera sits, so the horizon stays under the type. */
  eyeDrop: 0.9,
  /** Reading distance is solved from the card's size; these bound the result. */
  readDistanceMin: 11,
  readDistanceMax: 40,
  /** Fraction of the frame a card is allowed to fill. */
  fillHeight: 0.74,
  fillWidth: 0.8,
  /** Extra scenes kept built either side of the active one. */
  buildRadius: 1,
  waterLevel: 0,
  maxChars: 5200,
};

export const CAMERA = {
  fov: 44,
  near: 0.5,
  far: 4000,
  /** Seconds spent travelling between two scenes. */
  travel: 2.5,
  /** Base dwell time on a scene plus per-character reading allowance. */
  dwellBase: 3.0,
  dwellPerChar: 0.011,
  parallax: 1.1,
};

export const REVEAL_STYLES = [
  'auto',
  'surface',
  'swarm',
  'unfold',
  'ignite',
  'tide',
  'descend',
  'warp',
];
