import { makeCanvas } from '../core/screen.js';
import { PAL } from './palette.js';
import { hash2, mix } from './pixel.js';

/**
 * Procedural front-facing building. The tall roof plus the shaded wall base is
 * what gives the overworld its 2.5D reading — the player walks *in front of*
 * these and they occlude when the player is behind.
 */
export function makeBuilding(opts) {
  const tw = opts.tw ?? 4;
  const th = opts.th ?? 2;
  const roof = opts.roof || [PAL.roofR0, PAL.roofR1, PAL.roofR2, PAL.roofR3];
  const wall = opts.wall || [PAL.wall0, PAL.wall1, PAL.wall2, PAL.wall3];
  const bodyH = th * 16;
  const roofH = opts.roofH ?? 24;
  const over = 4; // roof overhang each side
  const W = tw * 16;
  const CW = W + over * 2;
  const CH = roofH + bodyH + 4;
  const c = makeCanvas(CW, CH);
  const g = c.getContext('2d');
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

  // ground shadow
  g.fillStyle = 'rgba(18,14,26,0.25)';
  g.fillRect(over - 2, CH - 5, W + 4, 4);

  const wallTop = roofH;
  const wallBot = roofH + bodyH;

  // ---- wall ----------------------------------------------------------------
  rect(over, wallTop, W, bodyH, wall[1]);
  for (let y = wallTop; y < wallBot; y++) {
    for (let x = over; x < over + W; x++) {
      const h = hash2(x, y, 17);
      if (h < 0.08) px(x, y, wall[0]);
      else if (h > 0.93) px(x, y, wall[2]);
    }
  }
  // lit left face / shaded right face
  rect(over, wallTop, 3, bodyH, wall[2]);
  rect(over + W - 4, wallTop, 4, bodyH, mix(wall[1], wall[0], 0.45));
  // skirting + outline
  rect(over, wallBot - 4, W, 4, mix(wall[0], '#241a12', 0.35));
  rect(over, wallTop, W, 1, mix(wall[0], '#241a12', 0.2));
  rect(over - 1, wallTop, 1, bodyH, '#241a12');
  rect(over + W, wallTop, 1, bodyH, '#241a12');
  rect(over - 1, wallBot, W + 2, 1, '#241a12');

  // ---- windows -------------------------------------------------------------
  const doorTile = opts.doorTile ?? Math.floor(tw / 2);
  const winY = wallTop + 6;
  for (let t = 0; t < tw; t++) {
    if (t === doorTile || (opts.doorWide && t === doorTile + 1)) continue;
    if (opts.noWindows) break;
    const x = over + t * 16 + 3;
    rect(x - 1, winY - 1, 12, 11, '#3a2a1c');
    rect(x, winY, 10, 9, PAL.glass1);
    rect(x, winY, 10, 4, PAL.glass2);
    rect(x + 1, winY + 1, 4, 3, PAL.glass3);
    rect(x + 4, winY, 2, 9, '#3a2a1c');
    rect(x, winY + 4, 10, 1, '#3a2a1c');
    rect(x - 1, winY + 9, 12, 2, PAL.wood2);
  }

  // ---- door ----------------------------------------------------------------
  const dw = opts.doorWide ? 26 : 13;
  const dx = over + doorTile * 16 + (opts.doorWide ? 3 : 2);
  const dh = 20;
  const dy = wallBot - dh;
  rect(dx - 1, dy - 1, dw + 2, dh + 1, '#2a1c10');
  rect(dx, dy, dw, dh, PAL.wood1);
  rect(dx, dy, dw, 2, PAL.wood2);
  rect(dx + 1, dy + 2, dw - 2, dh - 3, PAL.wood0);
  rect(dx + 2, dy + 3, dw - 4, dh - 5, PAL.wood1);
  if (opts.doorWide) rect(dx + dw / 2 - 1, dy + 2, 2, dh - 2, '#2a1c10');
  px(dx + dw - 4, dy + 11, '#f0d060');
  px(dx + dw - 4, dy + 12, '#c09030');
  // step
  rect(dx - 2, wallBot, dw + 4, 2, PAL.stone2);

  // ---- roof ----------------------------------------------------------------
  const cx = CW / 2;
  const botHalf = CW / 2;
  const topHalf = Math.max(6, botHalf - roofH * 0.62);
  for (let y = 0; y < roofH; y++) {
    const t = y / (roofH - 1);
    const half = topHalf + (botHalf - topHalf) * t;
    const x0 = Math.round(cx - half);
    const x1 = Math.round(cx + half);
    const shingleRow = Math.floor(y / 4);
    for (let x = x0; x < x1; x++) {
      const edge = x < x0 + 2 || x >= x1 - 2 || y < 2;
      let col;
      if (edge) col = roof[0];
      else {
        const rel = (x - x0) / (x1 - x0);
        const lit = 1 - rel * 0.8 + (1 - t) * 0.35;
        const n = hash2(x, shingleRow, 31);
        const band = lit + (n - 0.5) * 0.22;
        col = band > 1.05 ? roof[3] : band > 0.78 ? roof[2] : band > 0.5 ? roof[1] : roof[0];
      }
      px(x, y, col);
    }
    // shingle seam
    if (y % 4 === 3) {
      for (let x = x0 + 1; x < x1 - 1; x++) if ((x + shingleRow) % 2) px(x, y, roof[0]);
    }
  }
  // eave board
  rect(0, roofH - 3, CW, 3, mix(roof[0], '#1a1018', 0.35));
  rect(0, roofH - 3, CW, 1, roof[1]);
  // ridge highlight
  rect(Math.round(cx - topHalf) + 1, 0, Math.round(topHalf * 2) - 2, 1, roof[3]);

  // ---- optional sign -------------------------------------------------------
  if (opts.sign) {
    const sw = 34;
    const sx = Math.round(cx - sw / 2);
    const sy = roofH + 2;
    rect(sx - 1, sy - 1, sw + 2, 12, '#241a12');
    rect(sx, sy, sw, 10, opts.signBg || '#f0e4c4');
    rect(sx, sy, sw, 2, '#ffffff');
    const ink = opts.signInk || '#3a63b8';
    if (opts.emblem === 'cross') {
      rect(sx + sw / 2 - 5, sy + 3, 10, 4, ink);
      rect(sx + sw / 2 - 2, sy + 1, 4, 8, ink);
    } else if (opts.emblem === 'leaf') {
      for (let i = 0; i < 9; i++) {
        const hgt = Math.round(Math.sin((i / 8) * Math.PI) * 3) + 1;
        rect(sx + sw / 2 - 4 + i, sy + 5 - hgt, 1, hgt * 2, ink);
      }
      rect(sx + sw / 2 - 6, sy + 4, 3, 1, ink);
    } else {
      rect(sx + 2, sy + 3, sw - 4, 4, ink);
    }
  }

  return {
    c,
    ox: -over,
    oy: -(roofH + (th - 1) * 16) - (opts.lift ?? 0),
    fw: tw,
    fh: th,
    solid: true,
    doorTile,
  };
}

export const BUILDING_PRESETS = {
  house_red: { tw: 3, th: 2, roof: [PAL.roofR0, PAL.roofR1, PAL.roofR2, PAL.roofR3] },
  house_blue: { tw: 3, th: 2, roof: [PAL.roofB0, PAL.roofB1, PAL.roofB2, PAL.roofB3] },
  house_green: { tw: 3, th: 2, roof: [PAL.roofG0, PAL.roofG1, PAL.roofG2, PAL.roofG3] },
  house_purple: { tw: 3, th: 2, roof: [PAL.roofP0, PAL.roofP1, PAL.roofP2, PAL.roofP3] },
  study: {
    tw: 5, th: 3, roofH: 30, doorWide: true, doorTile: 2,
    roof: [PAL.roofG0, PAL.roofG1, PAL.roofG2, PAL.roofG3],
    wall: [PAL.lab0, PAL.lab1, PAL.lab2, PAL.lab3],
    sign: true, emblem: 'leaf', signBg: '#eaf4ea', signInk: '#2e7448',
  },
  rest_hall: {
    tw: 5, th: 3, roofH: 30, doorWide: true, doorTile: 2,
    roof: [PAL.roofR0, PAL.roofR1, PAL.roofR2, PAL.roofR3],
    wall: [PAL.wall0, PAL.wall1, PAL.wall2, PAL.wall3],
    sign: true, emblem: 'cross', signBg: '#fff0f0', signInk: '#cc5540',
  },
  market: {
    tw: 5, th: 3, roofH: 30, doorWide: true, doorTile: 2,
    roof: [PAL.roofB0, PAL.roofB1, PAL.roofB2, PAL.roofB3],
    wall: [PAL.wall0, PAL.wall1, PAL.wall2, PAL.wall3],
    sign: true, signBg: '#eef4ff', signInk: '#2c569c',
  },
};
