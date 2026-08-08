/* NOGGIN — the fruit machine.

   He conjures it, and then he plays it, and he does not look at you again
   until it goes. That is the whole joke and the geometry is in service of it:
   it has to be recognisable in a second and a half, from across a room, at
   about twice the size of his head.

   Which rules out modelling it and rules in painting it. The cabinet is four
   rounded boxes. The reels are drums, and everything that makes a reel read
   as a reel — cherries, bars, the gap between one symbol and the next — is
   done in vertex colour, worked out from where each vertex sits on the drum.
   A cherry is a red disc: the distance from the middle of its band, measured
   in arc length one way and along the axle the other. That is six recognisable
   symbols for no triangles at all, and it means the reels can spin by
   rotating, which is what reels do.

   It is a fruit machine in an atlas of fruit. That was not planned and it is
   too good to leave alone, so he mentions it. */
(function (NG) {
  'use strict';

  const G = NG.G;
  const cm = 0.1;                        /* 1 cm in world units */

  /* Prop materials, same table the face uses: 0 matte, 1 enamel, 2 chrome,
     3 cloth, 4 and up emissive. */
  const MAT = { CASE: 1, DRUM: 0, CHROME: 2, DARK: 0, BULB: 4 };

  /* The machine, in centimetres, measured off nothing at all — it is a
     conjured object and it is his, so it is his size: about twice his head
     and light enough to have appeared out of the air. */
  const M_ = {
    w: 34, h: 46, d: 26,
    reelR: 5.4, reelHalf: 3.6, reelGap: 8.4, reelY: 29, reelZ: 2.5,
    winW: 28, winH: 9.2, winY: 29,
    leverX: 21.8, leverY: 30, leverLen: 12.5, knobR: 2.7
  };

  const CASE_COLOR = [0.215, 0.024, 0.030];      /* deep red enamel */
  const TRIM = [0.40, 0.245, 0.055];             /* brass */
  const CHROME = [0.52, 0.545, 0.58];
  const DARK = [0.020, 0.020, 0.026];
  const DRUM_BG = [0.60, 0.575, 0.52];           /* the paper the symbols sit on */
  const BULB = [0.95, 0.80, 0.42];

  /* What is painted round a reel, in order. Six is enough to be a fruit
     machine and few enough that three in a row is a thing that can happen
     while somebody is watching. */
  const SYMBOLS = [
    { id: 'cherry', colour: [0.42, 0.020, 0.022], kind: 'disc', r: 2.5, say: 'cherries' },
    { id: 'lemon', colour: [0.52, 0.395, 0.020], kind: 'disc', r: 2.6, say: 'lemons' },
    { id: 'bar', colour: [0.045, 0.045, 0.052], kind: 'bar', r: 1.45, say: 'bars' },
    { id: 'plum', colour: [0.145, 0.028, 0.215], kind: 'disc', r: 2.5, say: 'plums' },
    { id: 'bell', colour: [0.50, 0.305, 0.030], kind: 'disc', r: 2.6, say: 'bells' },
    { id: 'melon', colour: [0.055, 0.275, 0.050], kind: 'disc', r: 2.7, say: 'melons' }
  ];

  function Parts() { this.pos = []; this.col = []; this.mat = []; this.idx = []; }
  Parts.prototype.add = function (positions, indices, colour, matId, colourAt) {
    const base = this.pos.length / 3;
    for (let i = 0; i < positions.length / 3; i++) {
      this.pos.push(positions[i * 3] * cm, positions[i * 3 + 1] * cm, positions[i * 3 + 2] * cm);
      const c = colourAt ? colourAt(i) : colour;
      this.col.push(c[0], c[1], c[2]);
      this.mat.push(matId);
    }
    for (let i = 0; i < indices.length; i++) this.idx.push(indices[i] + base);
  };
  Parts.prototype.mesh = function () {
    const positions = new Float32Array(this.pos);
    const indices = new Uint32Array(this.idx);
    return {
      positions: positions,
      normals: G.computeNormals(positions, indices, positions.length / 3),
      colors: new Float32Array(this.col),
      mats: new Float32Array(this.mat),
      indices: indices
    };
  };

  /* A box with its edges taken off. Same trick the produce builder uses: push
     a sphere out to the box surface and keep a little of the sphere. */
  function box(unit, cx, cy, cz, hx, hy, hz, round) {
    const n = unit.positions.length / 3;
    const out = new Float32Array(n * 3);
    const k = round === undefined ? 0.12 : round;
    for (let i = 0; i < n; i++) {
      const dx = unit.positions[i * 3], dy = unit.positions[i * 3 + 1], dz = unit.positions[i * 3 + 2];
      const m = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) || 1;
      const bx = dx / m, by = dy / m, bz = dz / m;
      out[i * 3] = cx + (bx + (dx - bx) * k) * hx;
      out[i * 3 + 1] = cy + (by + (dy - by) * k) * hy;
      out[i * 3 + 2] = cz + (bz + (dz - bz) * k) * hz;
    }
    return out;
  }

  function ball(unit, cx, cy, cz, r) {
    const n = unit.positions.length / 3;
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      out[i * 3] = cx + unit.positions[i * 3] * r;
      out[i * 3 + 1] = cy + unit.positions[i * 3 + 1] * r;
      out[i * 3 + 2] = cz + unit.positions[i * 3 + 2] * r;
    }
    return out;
  }

  /* A rod between two points, for the lever. */
  function rod(ax, ay, az, bx, by, bz, r, sides) {
    const pos = [], idx = [];
    const wx = bx - ax, wy = by - ay, wz = bz - az;
    const len = Math.hypot(wx, wy, wz) || 1e-6;
    const w = [wx / len, wy / len, wz / len];
    const fr = NG.M.frame(w);
    const u = fr[0], v = fr[1];
    for (let ring = 0; ring < 2; ring++) {
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const c = Math.cos(a) * r, s = Math.sin(a) * r;
        const t = ring === 0 ? 0 : len;
        pos.push(ax + u[0] * c + v[0] * s + w[0] * t,
          ay + u[1] * c + v[1] * s + w[1] * t,
          az + u[2] * c + v[2] * s + w[2] * t);
      }
    }
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      idx.push(i, sides + i, sides + j, i, sides + j, j);
    }
    return { positions: new Float32Array(pos), indices: idx };
  }

  /* ---- the reel ---------------------------------------------------------- */

  /* A drum on the X axis, painted rather than modelled.

     Angle zero is the front, which is what the window is looking at, so
     turning the drum by minus one band brings the next symbol up. Each
     vertex works out which band it is in, and then how far it is from the
     middle of that band in two directions — arc length round the drum, and
     distance along the axle. Those two are a flat coordinate system on the
     drum's surface, and a symbol is a shape drawn in it. */
  NG.SLOT = NG.SLOT || {};

  NG.SLOT.reel = function () {
    const parts = new Parts();
    const N = SYMBOLS.length;
    const around = 132;                 /* enough that a disc edge is smooth */
    const along = 12;
    const R = M_.reelR, HW = M_.reelHalf;
    const band = (Math.PI * 2) / N;
    const pos = [], idx = [];
    const colours = [];

    for (let j = 0; j <= along; j++) {
      const v = -HW + (j / along) * HW * 2;
      for (let i = 0; i < around; i++) {
        const a = (i / around) * Math.PI * 2;
        pos.push(v, Math.sin(a) * R, Math.cos(a) * R);

        /* Which symbol, and where inside it. */
        let k = Math.round(a / band) % N;
        if (k < 0) k += N;
        let off = a - k * band;
        if (off > Math.PI) off -= Math.PI * 2;
        if (off < -Math.PI) off += Math.PI * 2;
        const sym = SYMBOLS[k];
        const du = off * R;             /* arc length from the band's middle */
        const dv = v;                   /* along the axle */

        let c = DRUM_BG;
        /* The dark line between one symbol and the next, which is most of
           what makes a spinning drum read as a drum. */
        if (Math.abs(du) > band * R * 0.5 - 0.35) {
          c = [0.10, 0.09, 0.085];
        } else if (sym.kind === 'bar') {
          if (Math.abs(dv) < sym.r && Math.abs(du) < 2.9) c = sym.colour;
        } else if (Math.hypot(du, dv) < sym.r) {
          c = sym.colour;
        }
        colours.push(c);
      }
    }
    for (let j = 0; j < along; j++) {
      for (let i = 0; i < around; i++) {
        const a0 = j * around + i, a1 = j * around + (i + 1) % around;
        const b0 = a0 + around, b1 = a1 + around;
        idx.push(a0, b0, b1, a0, b1, a1);
      }
    }
    parts.add(new Float32Array(pos), idx, null, MAT.DRUM, function (i) { return colours[i]; });

    /* Cheeks, so the drum is not an open pipe when seen from the side. */
    const disc = G.icosphere(2);
    parts.add(ball(disc, -HW - 0.3, 0, 0, R * 0.96), disc.indices, [0.09, 0.085, 0.08], MAT.DRUM);
    parts.add(ball(disc, HW + 0.3, 0, 0, R * 0.96), disc.indices, [0.09, 0.085, 0.08], MAT.DRUM);
    return parts.mesh();
  };

  /* ---- the cabinet ------------------------------------------------------- */

  NG.SLOT.cabinet = function () {
    const parts = new Parts();
    const unit = G.icosphere(3);
    const small = G.icosphere(2);
    const w = M_.w * 0.5, h = M_.h, d = M_.d * 0.5;
    const ww = M_.winW * 0.5, wh = M_.winH * 0.5, wy = M_.winY;

    /* The carcass is only the back of it. The front is four separate pieces
       with a hole between them, because the reels have to be seen through
       something and a solid box with a dark rectangle painted on it is a
       solid box with a dark rectangle painted on it — the first attempt was
       exactly that, and it sealed three finished reels inside a cupboard. */
    parts.add(box(unit, 0, h * 0.5, -d * 0.35, w, h * 0.5, d * 0.65, 0.10),
      unit.indices, CASE_COLOR, MAT.CASE);

    const fz = d * 0.72, fd = d * 0.28;      /* the front frame, in z */
    /* above the window */
    parts.add(box(unit, 0, (wy + wh + h) * 0.5, fz, w, (h - wy - wh) * 0.5, fd, 0.12),
      unit.indices, CASE_COLOR, MAT.CASE);
    /* below it */
    parts.add(box(unit, 0, (wy - wh) * 0.5, fz, w, (wy - wh) * 0.5, fd, 0.12),
      unit.indices, CASE_COLOR, MAT.CASE);
    /* and down each side */
    for (let i = -1; i <= 1; i += 2) {
      parts.add(box(unit, i * (w + ww) * 0.5, wy, fz, (w - ww) * 0.5, wh, fd, 0.14),
        unit.indices, CASE_COLOR, MAT.CASE);
    }

    /* Plinth. */
    parts.add(box(unit, 0, 2.2, -d * 0.2, w * 1.06, 2.2, d * 0.9, 0.10),
      unit.indices, DARK, MAT.CASE);

    /* Marquee: a sign on top, leaning back, with a row of bulbs along it. */
    parts.add(box(unit, 0, h + 5.0, -1.6, w * 0.98, 5.0, d * 0.55, 0.14),
      unit.indices, CASE_COLOR, MAT.CASE);
    parts.add(box(unit, 0, h + 5.2, d * 0.44, w * 0.86, 3.4, 0.7, 0.20),
      unit.indices, TRIM, MAT.CHROME);
    for (let i = 0; i < 7; i++) {
      const x = -w * 0.84 + (i / 6) * w * 1.68;
      parts.add(ball(small, x, h + 10.6, -1.0, 1.0), small.indices, BULB, MAT.BULB);
    }

    /* The bezel round the opening — a bright lip on all four sides, which is
       what turns a hole into a window. */
    const lip = 1.6;
    parts.add(box(unit, 0, wy + wh + lip * 0.5, d * 0.97, ww + lip, lip * 0.5, 0.55, 0.2),
      unit.indices, TRIM, MAT.CHROME);
    parts.add(box(unit, 0, wy - wh - lip * 0.5, d * 0.97, ww + lip, lip * 0.5, 0.55, 0.2),
      unit.indices, TRIM, MAT.CHROME);
    for (let i = -1; i <= 1; i += 2) {
      parts.add(box(unit, i * (ww + lip * 0.5), wy, d * 0.97, lip * 0.5, wh + lip, 0.55, 0.2),
        unit.indices, TRIM, MAT.CHROME);
      /* and the two uprights that split it into three, which is the clearest
         signal there are three reels behind it */
      parts.add(box(unit, i * M_.reelGap * 0.5, wy, d * 0.95, 0.3, wh, 0.45, 0.2),
        unit.indices, TRIM, MAT.CHROME);
    }

    /* Coin tray and slot. */
    parts.add(box(unit, 0, 9, d * 0.86, w * 0.62, 3.0, 1.2, 0.20), unit.indices, DARK, MAT.DARK);
    parts.add(box(unit, 0, wy - wh - 5.5, d * 0.95, 3.4, 0.5, 0.5, 0.3),
      unit.indices, DARK, MAT.DARK);

    /* The bracket the lever turns on. */
    parts.add(ball(small, M_.leverX, M_.leverY, 0, 2.0), small.indices, CHROME, MAT.CHROME);
    return parts.mesh();
  };

  /* The arm, built about its own pivot so it can be swung by rotating it. */
  NG.SLOT.lever = function () {
    const parts = new Parts();
    const small = G.icosphere(2);
    const r = rod(0, 0, 0, 0, M_.leverLen, 0, 1.05, 14);
    parts.add(r.positions, r.indices, CHROME, MAT.CHROME);
    parts.add(ball(small, 0, M_.leverLen, 0, M_.knobR), small.indices,
      [0.46, 0.030, 0.030], MAT.CHROME);
    return parts.mesh();
  };

  NG.SLOT.SYMBOLS = SYMBOLS;
  NG.SLOT.SIZE = M_;
  NG.SLOT.cm = cm;

  /* Where a reel has to be turned to for a symbol to sit in the window.
     Band k is centred at k bands round from the front, so bringing it to the
     front is turning back by that much. */
  NG.SLOT.angleFor = function (k) {
    return -(k / SYMBOLS.length) * Math.PI * 2;
  };
})(window.NG = window.NG || {});
