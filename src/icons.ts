/**
 * Botanical produce icons — hand-built SVG line illustrations, one per crop.
 * Herbarium style: warm ink outline, soft botanical fills, a defining feature
 * so each reads as the specific fruit / vegetable / herb / spice (not emoji).
 * viewBox 0 0 64 64.
 */

const INK = "#3a3125";
const LEAF = "#71905d";
const LEAF2 = "#5f7d4e";
const STEM = "#6a5334";

const g = (inner: string) =>
  `<g fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${inner}</g>`;

// ---- reusable motifs ------------------------------------------------------
const leaf = (x: number, y: number, rot: number, s = 1, fill = LEAF) =>
  `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M0 0 C6 -7 15 -8 20 -3 C13 2 4 3 0 0 Z" fill="${fill}"/>`;
const stem = (x1: number, y1: number, x2: number, y2: number) =>
  `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${STEM}"/>`;

// round body helper (apple/tomato/citrus…)
const orb = (cx: number, cy: number, r: number, fill: string) =>
  `<path d="M${cx} ${cy - r} C${cx + r} ${cy - r} ${cx + r} ${cy + r} ${cx} ${cy + r} C${cx - r} ${cy + r} ${cx - r} ${cy - r} ${cx} ${cy - r} Z" fill="${fill}"/>`;

const grainSpike = (fill: string, awns: boolean) => {
  let s = `<path d="M32 54 L32 30" stroke="${STEM}"/>`;
  for (let i = 0; i < 6; i++) {
    const y = 16 + i * 6;
    s += `<path d="M32 ${y + 3} C26 ${y} 25 ${y + 5} 28 ${y + 8}" fill="${fill}"/>`;
    s += `<path d="M32 ${y + 3} C38 ${y} 39 ${y + 5} 36 ${y + 8}" fill="${fill}"/>`;
    if (awns) s += `<path d="M30 ${y + 1} L26 ${y - 6} M34 ${y + 1} L38 ${y - 6}" stroke="${STEM}" stroke-width="1"/>`;
  }
  s += `<path d="M32 14 L32 8" stroke="${STEM}"/>`;
  return g(s);
};

const rootVeg = (fill: string) =>
  g(
    `${leaf(30, 16, -50, 0.7)}${leaf(34, 15, -100, 0.7)}${leaf(32, 14, -75, 0.8)}` +
    `<path d="M26 22 C24 34 30 52 32 54 C34 52 40 34 38 22 C34 20 30 20 26 22 Z" fill="${fill}"/>` +
    `<path d="M28 30 h8 M29 38 h6" stroke="${INK}" stroke-width="1"/>`,
  );

const tuber = (fill: string, spots = true) =>
  g(
    `<path d="M18 34 C16 24 28 18 40 22 C50 25 50 40 42 46 C32 52 20 46 18 34 Z" fill="${fill}"/>` +
    (spots ? `<circle cx="28" cy="32" r="1.4" fill="${INK}"/><circle cx="38" cy="30" r="1.4" fill="${INK}"/><circle cx="34" cy="40" r="1.4" fill="${INK}"/>` : ""),
  );

const bulb = (fill: string, cloves: boolean) =>
  g(
    `<path d="M22 14 C26 20 26 22 24 24 M42 14 C38 20 38 22 40 24" stroke="${LEAF2}"/>` +
    `<path d="M32 22 C44 24 46 40 38 48 C34 52 30 52 26 48 C18 40 20 24 32 22 Z" fill="${fill}"/>` +
    (cloves
      ? `<path d="M32 24 L32 50 M26 26 C24 38 26 46 30 50 M38 26 C40 38 38 46 34 50" stroke="${INK}" stroke-width="1"/>`
      : `<path d="M27 50 L26 54 M32 51 L32 55 M37 50 L38 54" stroke="${STEM}" stroke-width="1"/>`),
  );

const podLegume = (fill: string, seeds: number, fuzzy = false) => {
  let s = `<path d="M16 40 C18 26 40 18 50 22 C46 34 24 46 16 40 Z" fill="${fill}"/>`;
  for (let i = 0; i < seeds; i++) s += `<circle cx="${24 + i * 6}" cy="${38 - i * 3.4}" r="2.4" fill="${LEAF2}"/>`;
  if (fuzzy) s += `<path d="M20 40 l-2 3 M28 42 l-2 3 M36 38 l-2 3" stroke="${INK}" stroke-width="0.8"/>`;
  return g(s);
};

const berryCluster = (fill: string) => {
  let s = leaf(32, 12, -30, 0.9) + stem(32, 14, 32, 20);
  const pts = [[26, 24], [38, 24], [32, 30], [23, 32], [41, 32], [32, 38], [27, 42], [37, 42], [32, 48]];
  for (const [x, y] of pts) s += orb(x, y, 5, fill);
  return g(s);
};

const herbSprig = (fill: string) =>
  g(
    stem(32, 54, 32, 16) +
    leaf(32, 24, -35, 0.8, fill) + leaf(32, 24, 215, 0.8, fill) +
    leaf(32, 34, -35, 0.9, fill) + leaf(32, 34, 215, 0.9, fill) +
    leaf(32, 44, -35, 1, fill) + leaf(32, 44, 215, 1, fill),
  );

const leafyHead = (fill: string) =>
  g(
    `<path d="M18 40 C16 24 32 18 46 26 C50 40 42 50 32 50 C22 50 19 46 18 40 Z" fill="${fill}"/>` +
    `<path d="M32 20 C30 34 30 44 32 50 M24 24 C26 36 27 44 30 49 M40 24 C38 36 37 44 34 49" stroke="${LEAF2}" stroke-width="1"/>`,
  );

const rhizome = (fill: string) =>
  g(
    `<path d="M16 40 C16 34 22 32 26 34 C28 28 36 28 38 34 C44 32 50 36 48 42 C50 48 42 50 38 46 C34 52 26 50 26 44 C20 48 14 44 16 40 Z" fill="${fill}"/>`,
  );

// ---- per-crop icons -------------------------------------------------------
const ICONS: Record<string, string> = {
  apple: g(`${leaf(34, 16, -20, 0.9)}${stem(32, 20, 32, 14)}<path d="M32 22 C22 18 16 28 18 38 C20 50 28 52 32 48 C36 52 44 50 46 38 C48 28 42 18 32 22 Z" fill="#c0392b"/><path d="M32 22 C31 26 31 30 32 34" stroke="${INK}" stroke-width="1"/>`),
  tomato: g(`<path d="M24 18 L28 24 M32 16 L32 24 M40 18 L36 24 M22 22 L28 25 M42 22 L36 25" stroke="${LEAF2}" stroke-width="1.4"/>${orb(32, 38, 17, "#d1462f")}<path d="M32 24 C31 28 31 30 32 33" stroke="${INK}" stroke-width="1"/>`),
  orange: g(`${leaf(40, 18, -30, 0.8)}${orb(32, 38, 16, "#e0862e")}<circle cx="26" cy="34" r="0.9" fill="${INK}"/><circle cx="36" cy="32" r="0.9" fill="${INK}"/><circle cx="32" cy="42" r="0.9" fill="${INK}"/>`),
  lemon: g(`${leaf(42, 22, -30, 0.8)}<path d="M20 40 C16 30 26 20 38 22 C50 24 50 40 40 46 C30 52 24 50 20 40 Z" fill="#e6c93f"/><path d="M20 40 l-3 2 M44 26 l3 -2" stroke="${INK}"/>`),
  pomegranate: g(`<path d="M28 14 L32 20 L36 14 M30 12 L32 18 L34 12" stroke="${LEAF2}" stroke-width="1.4"/>${orb(32, 40, 16, "#a52a2a")}<path d="M26 36 l2 3 M32 34 l0 3 M38 36 l-2 3" stroke="#7a1f1f" stroke-width="1"/>`),
  mango: g(`${leaf(40, 16, -40, 0.8)}<path d="M22 30 C22 18 40 14 48 24 C54 32 46 48 34 50 C24 51 20 40 22 30 Z" fill="#e0a53a"/><path d="M40 26 C44 32 44 40 40 46" stroke="#c66" stroke-width="1"/>`),
  fig: g(`${stem(32, 16, 32, 12)}${leaf(32, 14, -40, 0.7)}<path d="M32 20 C24 22 20 32 24 42 C28 52 36 52 40 42 C44 32 40 22 32 20 Z" fill="#6b4a7a"/><path d="M28 46 l8 0" stroke="#4a3255" stroke-width="1"/>`),
  avocado: g(`<path d="M32 16 C24 18 22 30 26 40 C29 50 35 50 38 40 C42 30 40 18 32 16 Z" fill="#5f7d3a"/><circle cx="32" cy="40" r="6" fill="#7a5a34"/>`),
  papaya: g(`${leaf(38, 14, -50, 0.7)}<path d="M24 16 C18 26 18 44 28 52 C38 58 46 46 44 34 C42 22 32 12 24 16 Z" fill="#de8a3a"/><circle cx="34" cy="40" r="1" fill="${INK}"/><circle cx="30" cy="44" r="1" fill="${INK}"/><circle cx="38" cy="44" r="1" fill="${INK}"/>`),
  banana: g(`<path d="M18 26 C18 42 30 52 46 48 C40 50 30 44 28 34 C36 42 44 42 48 38 C44 40 34 36 30 28 C26 22 20 22 18 26 Z" fill="#e6c23a"/><path d="M46 48 l3 -2 M18 26 l-2 -3" stroke="${STEM}"/>`),
  grape: berryCluster("#6a4a86"),
  watermelon: g(`<path d="M14 34 C14 22 26 16 34 16 C46 16 50 26 50 34 C50 46 40 50 32 50 C22 50 14 44 14 34 Z" fill="#3f7d3a"/><path d="M22 20 C20 30 20 40 24 48 M32 16 C31 28 31 40 32 50 M42 20 C44 30 44 40 40 48" stroke="#2c5c2a" stroke-width="1.4"/>`),
  pineapple: g(`<path d="M26 12 L24 22 M32 8 L32 22 M38 12 L40 22 M22 16 L27 23 M42 16 L37 23" stroke="${LEAF2}" stroke-width="1.6"/><path d="M24 26 C24 22 40 22 40 26 C44 40 40 52 32 52 C24 52 20 40 24 26 Z" fill="#d9a441"/><path d="M26 30 l6 6 M34 28 l-6 6 M34 40 l-6 -6 M38 34 l-6 6" stroke="#a97e26" stroke-width="1"/>`),
  eggplant: g(`<path d="M22 20 L28 26 M32 18 L32 26 M42 20 L36 26" stroke="${LEAF2}" stroke-width="1.6"/><path d="M24 26 C20 34 22 48 32 52 C42 48 44 34 40 26 C36 22 28 22 24 26 Z" fill="#5b3a6b"/><path d="M28 30 C27 38 28 44 31 48" stroke="#412a4d" stroke-width="1"/>`),
  cucumber: g(`<path d="M18 44 C14 38 20 26 32 20 C44 14 50 22 46 30 C42 40 26 50 18 44 Z" fill="#4e7c4a"/><circle cx="26" cy="36" r="0.9" fill="#2c5c2a"/><circle cx="34" cy="30" r="0.9" fill="#2c5c2a"/><circle cx="40" cy="26" r="0.9" fill="#2c5c2a"/>`),
  chili: g(`${stem(30, 14, 34, 18)}<path d="M34 18 C44 20 46 34 36 46 C30 52 24 50 26 44 C30 36 30 26 34 18 Z" fill="#c0392b"/>`),
  squash: g(`${stem(32, 16, 32, 22)}<path d="M16 38 C16 26 24 22 32 22 C40 22 48 26 48 38 C48 48 40 50 32 50 C24 50 16 48 16 38 Z" fill="#d07b3a"/><path d="M24 24 C22 34 22 44 26 49 M32 22 L32 50 M40 24 C42 34 42 44 38 49" stroke="#a85f28" stroke-width="1.2"/>`),
  carrot: rootVeg("#d0743a"),
  potato: tuber("#c2a06a"),
  "sweet-potato": g(`<path d="M14 40 C12 30 26 22 40 24 C52 26 54 36 46 42 C34 50 18 50 14 40 Z" fill="#b5673a"/><circle cx="26" cy="34" r="1.2" fill="${INK}"/><circle cx="38" cy="34" r="1.2" fill="${INK}"/>`),
  cassava: g(`${leaf(30, 14, -60, 0.6)}${leaf(34, 13, -110, 0.6)}<path d="M28 20 C26 34 30 52 32 54 C34 52 38 34 36 20 Z" fill="#c7b48f"/><path d="M22 40 C22 48 26 54 30 54 M42 40 C42 48 38 54 34 54" fill="#c7b48f"/>`),
  yam: tuber("#8a6a4a", false),
  onion: bulb("#c9a86a", false),
  garlic: bulb("#efe6d5", true),
  ginger: rhizome("#d9c48f"),
  turmeric: rhizome("#d99a2a"),
  cabbage: leafyHead("#7fae6a"),
  lettuce: g(`<path d="M16 44 C14 32 22 24 32 26 C42 24 50 32 48 44 C40 42 36 46 32 46 C28 46 24 42 16 44 Z" fill="#8fbf6a"/><path d="M24 30 C22 38 22 44 24 46 M32 26 L32 46 M40 30 C42 38 42 44 40 46" stroke="#5f8f4a" stroke-width="1"/>`),
  basil: herbSprig("#5f8f4a"),
  coriander: g(`${stem(32, 54, 32, 20)}<path d="M32 20 C24 14 20 20 24 26 C20 24 16 30 22 34 M32 20 C40 14 44 20 40 26 C44 24 48 30 42 34" fill="${LEAF}"/>`),
  tea: g(`${stem(32, 52, 32, 22)}${leaf(32, 42, -40, 1)}${leaf(32, 42, 210, 0.9)}${leaf(32, 32, -35, 0.8)}<path d="M32 24 C29 20 31 15 34 16 C33 20 33 21 32 24 Z" fill="#c9d6ad"/>`),
  maize: g(`${leaf(20, 40, 40, 1.1, LEAF2)}${leaf(44, 40, 140, 1.1, LEAF)}<path d="M32 14 C40 16 42 30 40 44 C38 52 26 52 24 44 C22 30 24 16 32 14 Z" fill="#e6c23a"/><path d="M28 20 h8 M27 28 h10 M27 36 h10 M28 44 h8" stroke="#b89020" stroke-width="1"/><path d="M31 20 v26 M35 20 v26" stroke="#b89020" stroke-width="1"/>`),
  wheat: grainSpike("#cca63f", true),
  barley: grainSpike("#c9a441", true),
  rice: grainSpike("#c9b96a", false),
  sorghum: g(`${stem(32, 54, 32, 22)}<path d="M32 12 C22 16 20 28 32 30 C44 28 42 16 32 12 Z" fill="#b06a4a"/><circle cx="28" cy="20" r="1.4" fill="#8a4a34"/><circle cx="36" cy="20" r="1.4" fill="#8a4a34"/><circle cx="32" cy="24" r="1.4" fill="#8a4a34"/>`),
  sugarcane: g(`<path d="M26 54 L24 20 M38 54 L36 20" stroke="#9ab06a" stroke-width="3"/><path d="M23 44 h4 M35 44 h4 M23 34 h4 M35 34 h4" stroke="${STEM}" stroke-width="1.4"/>${leaf(30, 18, -50, 1.1, LEAF)}${leaf(34, 18, -120, 1.1, LEAF2)}`),
  soybean: podLegume("#c7c07a", 3, true),
  "common-bean": podLegume("#b98a5a", 4),
  lentil: g(`<path d="M16 34 C22 28 42 28 48 34 C42 40 22 40 16 34 Z" fill="#9a7a4a"/><path d="M20 40 C24 36 38 36 42 40 C38 44 24 44 20 40 Z" fill="#a88a5a"/><path d="M26 46 C29 43 35 43 38 46 C35 49 29 49 26 46 Z" fill="#9a7a4a"/>`),
  chickpea: g(`<path d="M18 40 C20 28 40 22 48 28 C44 36 30 44 18 40 Z" fill="#cdb87a"/><circle cx="30" cy="36" r="4" fill="#d9c48f"/><path d="M30 33 C33 34 33 38 30 39" stroke="${INK}" stroke-width="0.8"/>`),
  peanut: g(`<path d="M22 22 C16 26 16 34 22 38 C18 42 18 50 24 52 C34 54 40 46 36 40 C42 36 42 26 34 24 C30 20 26 20 22 22 Z" fill="#cbb083"/><path d="M22 38 C26 36 30 36 34 38" stroke="${INK}"/><path d="M24 28 h6 M26 46 h6" stroke="#a88a5a" stroke-width="0.8"/>`),
  cacao: g(`${stem(24, 16, 40, 22)}<path d="M40 20 C50 22 52 40 42 50 C34 56 28 48 30 38 C32 28 34 20 40 20 Z" fill="#8a5a34"/><path d="M36 24 C34 34 34 44 38 50 M44 24 C46 34 46 44 42 50" stroke="#5f3a1f" stroke-width="1.2"/>`),
  coffee: g(`${leaf(20, 30, 30, 1, LEAF2)}${leaf(44, 30, 150, 1, LEAF)}${orb(28, 40, 6, "#c0392b")}${orb(38, 40, 6, "#c0392b")}`),
  "black-pepper": g(`${stem(32, 54, 32, 22)}${leaf(20, 40, 40, 0.9, LEAF2)}<circle cx="30" cy="18" r="2.4" fill="#4a3a2a"/><circle cx="35" cy="22" r="2.4" fill="#7a5a3a"/><circle cx="29" cy="26" r="2.4" fill="#4a3a2a"/><circle cx="35" cy="30" r="2.4" fill="#8a6a4a"/><circle cx="30" cy="34" r="2.4" fill="#4a3a2a"/>`),
  clove: g(`<path d="M32 50 L32 26" stroke="#6a4a2a" stroke-width="2.4"/><path d="M28 22 C28 18 36 18 36 22 C36 28 28 28 28 22 Z" fill="#7a4a2a"/><path d="M32 22 L28 14 M32 22 L36 14 M32 22 L32 12" stroke="#7a4a2a" stroke-width="1.4"/>`),
  nutmeg: g(`<path d="M22 24 C22 18 42 18 42 24 C48 34 44 48 32 50 C20 48 16 34 22 24 Z" fill="#b58a5a"/><path d="M24 26 C30 22 34 22 40 26 M26 34 C30 30 34 30 38 34" stroke="#c0392b" stroke-width="1.4"/>`),
  vanilla: g(`<path d="M30 16 C22 24 22 44 30 52 C34 54 36 52 35 48 C30 40 30 26 34 18 C34 15 32 14 30 16 Z" fill="#5a4a3a"/>${leaf(40, 20, -30, 0.9, "#e8e0c8")}${leaf(44, 26, 10, 0.8, "#efe6d0")}`),
  cinnamon: g(`<path d="M24 16 C22 30 22 48 26 52 C28 40 28 28 30 18 Z" fill="#a8703a"/><path d="M34 16 C32 30 32 48 36 52 C38 40 38 28 40 18 Z" fill="#95602f"/><path d="M28 18 C26 32 26 44 28 50 M38 18 C36 32 36 44 38 50" stroke="#5f3a1f" stroke-width="0.8"/>`),
  olive: g(`${leaf(18, 26, 20, 1.1, LEAF2)}${leaf(46, 26, 160, 1.1, LEAF)}${orb(26, 42, 6, "#7d8a4a")}${orb(38, 42, 6, "#4a5230")}`),
  "date-palm": g(`${leaf(22, 16, 30, 1, LEAF2)}${leaf(42, 16, 150, 1, LEAF)}${leaf(32, 12, 90, 1, LEAF)}<path d="M26 30 C24 44 30 52 32 52 C34 52 40 44 38 30 Z" fill="#8a5a34"/><ellipse cx="28" cy="38" rx="3" ry="5" fill="#6a3f22"/><ellipse cx="36" cy="38" rx="3" ry="5" fill="#7a4a2a"/>`),
};

export function cropIconSVG(id: string): string {
  const inner = ICONS[id] ?? herbSprig(LEAF);
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img">${inner}</svg>`;
}

export function hasIcon(id: string): boolean {
  return id in ICONS;
}
