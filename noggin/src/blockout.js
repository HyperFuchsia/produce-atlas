/* NOGGIN — the blockout.

   Every element in the scene as the crudest shape that still names it, all of
   it on the field at once, labelled, in about the time it takes to describe
   it. Boxes for machines and vehicles, spheres for heads and fruit, tubes for
   levers and limbs, slabs for screens and signs. Nothing is modelled, nothing
   is textured, nothing moves.

   This is the version that should exist before anything is built, so the
   layout, the scale and the proportions can be argued about while they still
   cost nothing to change. The fruit machine took an afternoon and three
   rounds of looking at renders to find out it was standing in the wrong place
   and its window was the wrong height. Both of those are visible here in
   grey, in one screen, in minutes. */
(function (NG) {
  'use strict';

  const G = NG.G;
  const cm = 0.1;

  const B = {};
  NG.BLOCK = B;

  /* One grey for everything, so nothing looks finished and nothing looks
     more finished than anything else. */
  const GREY = [0.115, 0.120, 0.128];
  const PALE = [0.235, 0.240, 0.250];
  const MARK = [0.240, 0.150, 0.030];      /* the few bits worth pointing at */

  function Parts() { this.pos = []; this.col = []; this.mat = []; this.idx = []; }
  Parts.prototype.add = function (positions, indices, colour) {
    const base = this.pos.length / 3;
    for (let i = 0; i < positions.length / 3; i++) {
      this.pos.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      this.col.push(colour[0], colour[1], colour[2]);
      this.mat.push(0);
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

  /* A box, sharp enough to read as a box. */
  function boxAt(out, cx, cy, cz, hx, hy, hz) {
    const unit = G.icosphere(2);
    const n = unit.positions.length / 3;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const dx = unit.positions[i * 3], dy = unit.positions[i * 3 + 1], dz = unit.positions[i * 3 + 2];
      const m = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) || 1;
      pos[i * 3] = cx + (dx / m) * hx;
      pos[i * 3 + 1] = cy + (dy / m) * hy;
      pos[i * 3 + 2] = cz + (dz / m) * hz;
    }
    out.add(pos, unit.indices, arguments[7] || GREY);
  }

  function ballAt(out, cx, cy, cz, r, colour) {
    const unit = G.icosphere(2);
    const n = unit.positions.length / 3;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = cx + unit.positions[i * 3] * r;
      pos[i * 3 + 1] = cy + unit.positions[i * 3 + 1] * r;
      pos[i * 3 + 2] = cz + unit.positions[i * 3 + 2] * r;
    }
    out.add(pos, unit.indices, colour || GREY);
  }

  /* A tube between two points: levers, poles, limbs, edges. */
  function tubeAt(out, ax, ay, az, bx, by, bz, r, colour) {
    const pos = [], idx = [], sides = 10;
    const w = [bx - ax, by - ay, bz - az];
    const len = Math.hypot(w[0], w[1], w[2]) || 1e-6;
    w[0] /= len; w[1] /= len; w[2] /= len;
    const fr = NG.M.frame(w), u = fr[0], v = fr[1];
    for (let ring = 0; ring < 2; ring++) {
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const c = Math.cos(a) * r, s = Math.sin(a) * r, t = ring * len;
        pos.push(ax + u[0] * c + v[0] * s + w[0] * t,
          ay + u[1] * c + v[1] * s + w[1] * t,
          az + u[2] * c + v[2] * s + w[2] * t);
      }
    }
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      idx.push(i, sides + i, sides + j, i, sides + j, j);
    }
    out.add(new Float32Array(pos), idx, colour || GREY);
  }

  /* The twelve edges of a box, for anything that is a frame rather than a
     solid — a wireframe, a doorway, a screen surround. */
  function cageAt(out, cx, cy, cz, hx, hy, hz, r, colour) {
    for (let i = -1; i <= 1; i += 2) {
      for (let j = -1; j <= 1; j += 2) {
        tubeAt(out, cx - hx, cy + i * hy, cz + j * hz, cx + hx, cy + i * hy, cz + j * hz, r, colour);
        tubeAt(out, cx + i * hx, cy - hy, cz + j * hz, cx + i * hx, cy + hy, cz + j * hz, r, colour);
        tubeAt(out, cx + i * hx, cy + j * hy, cz - hz, cx + i * hx, cy + j * hy, cz + hz, r, colour);
      }
    }
  }

  /* ---- the scene ---------------------------------------------------------

     Every element that has been asked for, at its real size and in its real
     place, as one shape each. Sizes are centimetres. `at` is in world units
     where the being's head sits at the origin and the floor is at -3.35. */
  B.SCENE = function (floorY) {
    const S = [];
    const put = function (label, size, build) { S.push({ label: label, size: size, build: build }); };

    put('the being', '23 cm sphere', function (p) {
      ballAt(p, 0, 0, 0, 11.5 * cm, PALE);
    });

    put('face + afro', '23 cm + 30 cm', function (p) {
      ballAt(p, 0, 0, 0, 11.5 * cm);
      ballAt(p, 0, 4.5 * cm, -1 * cm, 15 * cm);
    });

    put('hands', '19 x 9 cm', function (p) {
      for (let s = -1; s <= 1; s += 2) {
        boxAt(p, s * 16.2 * cm, -14.2 * cm, 5.5 * cm, 4.5 * cm, 9.5 * cm, 1.5 * cm);
        tubeAt(p, s * 16.2 * cm, -4.7 * cm, 5.5 * cm, s * 16.2 * cm, 0, 5.5 * cm, 1.2 * cm);
      }
    });

    put('chat bar — on the glass', '33 x 4.5 cm slab', function (p) {
      boxAt(p, 0, -26 * cm, 30 * cm, 16.5 * cm, 2.2 * cm, 0.4 * cm, MARK);
    });

    put('chat bar — in his hand', 'same slab, moved', function (p) {
      boxAt(p, 15 * cm, -21 * cm, 9 * cm, 16.5 * cm, 2.2 * cm, 0.4 * cm, MARK);
    });

    put('fruit machine', '34 x 46 x 26 cm', function (p) {
      const y = floorY;
      /* cabinet */
      boxAt(p, 0, y + 23 * cm, 0, 17 * cm, 23 * cm, 13 * cm);
      /* marquee */
      boxAt(p, 0, y + 51 * cm, 0, 17 * cm, 5 * cm, 8 * cm);
      /* window */
      boxAt(p, 0, y + 29 * cm, 13 * cm, 14 * cm, 4.6 * cm, 0.5 * cm, MARK);
      /* three reels */
      for (let i = -1; i <= 1; i++) {
        tubeAt(p, (i * 8.4 - 3.6) * cm, y + 29 * cm, 2.5 * cm,
          (i * 8.4 + 3.6) * cm, y + 29 * cm, 2.5 * cm, 5.4 * cm, PALE);
      }
      /* lever, and a knob that means nothing */
      tubeAt(p, 21 * cm, y + 30 * cm, 0, 25 * cm, y + 41 * cm, 4 * cm, 1 * cm);
      ballAt(p, 25 * cm, y + 41 * cm, 4 * cm, 2.6 * cm, MARK);
    });

    put('specimen beside him', '8 cm sphere', function (p) {
      ballAt(p, 0, 0, 0, 4 * cm);
    });

    put('car', '450 x 180 x 145 cm', function (p) {
      boxAt(p, 0, 45 * cm, 0, 225 * cm, 45 * cm, 90 * cm);
      boxAt(p, -8 * cm, 105 * cm, 0, 126 * cm, 28 * cm, 71 * cm);
      for (let x = -1; x <= 1; x += 2) {
        for (let z = -1; z <= 1; z += 2) {
          tubeAt(p, x * 143 * cm, 32 * cm, (z * 76 - 11) * cm,
            x * 143 * cm, 32 * cm, (z * 76 + 11) * cm, 32 * cm);
        }
      }
    });

    put('tesseract', '20 cm wire cage', function (p) {
      cageAt(p, 0, 0, 0, 10 * cm, 10 * cm, 10 * cm, 0.5 * cm, MARK);
      cageAt(p, 0, 0, 0, 5 * cm, 5 * cm, 5 * cm, 0.5 * cm, MARK);
    });

    put('camera — lowest it can go', 'stops 8 cm off the floor', function (p) {
      boxAt(p, 0, 0, 0, 5 * cm, 3.5 * cm, 7 * cm, MARK);
      tubeAt(p, 0, 0, 7 * cm, 0, 0, 13 * cm, 3 * cm, MARK);
    });

    return S;
  };

  /* Where each one stands. Kept apart from the shapes so the layout can be
     argued about without touching any geometry. */
  B.WHERE = function (floorY) {
    return {
      'the being': [0, 0, 0],
      'face + afro': [0, 0, 0],
      'hands': [0, 0, 0],
      'chat bar — on the glass': [0, 0, 0],
      'chat bar — in his hand': [0, 0, 0],
      'fruit machine': [3.5, 0, 0.3],
      'specimen beside him': [-2.6, -0.25, 0.1],
      'car': [-26, floorY, -30],
      'tesseract': [0, 3.4, 0],
      'camera — lowest it can go': [0, floorY + 0.8, 7.4]
    };
  };
})(window.NG = window.NG || {});
