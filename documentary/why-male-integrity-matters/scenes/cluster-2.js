/* ==========================================================================
   CLUSTER 2 — SCENES 04, 05, 06
   04 · The Word          — one whole thing, a row of wholes, a beam, a crack
   05 · Ten Ways To Be Whole — a man on a deck carried by ten struts
   06 · Every Decision Passes Through A Body — lift, carry, set down
   ========================================================================== */

/* ---------------------------------------------------------------- shared -- */

/* An axis-aligned or rotated block. cx,cy = centre. `fill` gives it mass. */
function c2_block(cx, cy, w, h, ang, col, lw, alpha, fill){
  g.save();
  if (alpha !== undefined) g.globalAlpha = alpha;
  g.translate(cx, cy);
  if (ang) g.rotate(ang);
  g.beginPath(); g.rect(-w * 0.5, -h * 0.5, w, h);
  if (fill){
    g.save();
    g.globalAlpha = (alpha === undefined ? 1 : alpha) * fill;
    g.fillStyle = P.dim; g.fill();
    g.restore();
  }
  g.strokeStyle = col || P.ink;
  g.lineWidth = camPx(lw === undefined ? LW.C : lw);
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.stroke();
  g.restore();
}

/* Expanding arcs from a struck point. dir: -1 arcs open left, +1 right. */
function c2_ring(cx, cy, age, dir, life, speed){
  if (age < 0 || age > life) return;
  var a = 1 - age / life, i, r;
  g.save();
  g.globalAlpha = a * a * 0.85;
  g.strokeStyle = P.dim; g.lineWidth = camPx(2.8); g.lineCap = 'round';
  g.beginPath();
  for (i = 0; i < 3; i++){
    r = 24 + age * speed - i * 54;
    if (r < 10) continue;
    if (dir < 0) g.arc(cx, cy, r, Math.PI * 0.52, Math.PI * 1.48);
    else         g.arc(cx, cy, r, -Math.PI * 0.48, Math.PI * 0.48);
  }
  g.stroke();
  g.restore();
}

/* Partial polyline: draws the first `frac` of a flat [x,y,...] point list. */
function c2_poly(pts, n, frac, col, lw, alpha){
  var i, total = 0, want, run = 0, dx, dy, L, k;
  for (i = 0; i < n - 1; i++){
    dx = pts[i*2+2] - pts[i*2]; dy = pts[i*2+3] - pts[i*2+1];
    total += Math.sqrt(dx*dx + dy*dy);
  }
  want = total * clamp(frac, 0, 1);
  if (want <= 0.5) return;
  g.save();
  g.globalAlpha = alpha === undefined ? 1 : alpha;
  g.strokeStyle = col || P.accent;
  g.lineWidth = camPx(lw || LW.WARM);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (i = 0; i < n - 1; i++){
    dx = pts[i*2+2] - pts[i*2]; dy = pts[i*2+3] - pts[i*2+1];
    L = Math.sqrt(dx*dx + dy*dy);
    if (run + L <= want){ g.lineTo(pts[i*2+2], pts[i*2+3]); run += L; }
    else { k = (want - run) / L; g.lineTo(pts[i*2] + dx*k, pts[i*2+1] + dy*k); break; }
  }
  g.stroke();
  g.restore();
}

/* A bowed compression member: from (ax,ay) to (bx,by), bulging `bow` sideways. */
function c2_strut(ax, ay, bx, by, bow, col, lw, alpha){
  var mx = (ax + bx) * 0.5, my = (ay + by) * 0.5;
  g.save();
  g.globalAlpha = alpha === undefined ? 1 : alpha;
  g.strokeStyle = col || P.dim;
  g.lineWidth = camPx(lw || LW.D);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(ax, ay);
  g.quadraticCurveTo(mx + bow * 2, my, bx, by);
  g.stroke();
  g.restore();
}

/* A stack of cut stone on a depth plane. Fills the yard without competing. */
function c2_stack(x, depth, n, seed){
  var s = scaleAt(depth), y = ground(depth), i, w = 78 * s, h = 190 * s;
  var al = depthAlpha(depth), lw = LW.D * depthWeight(depth);
  for (i = 0; i < n; i++)
    c2_block(x + nzs(seed * 7 + i) * 5 * s, y - (i + 0.5) * h,
             w, h, 0, P.dim, lw, al, 0.10);
}


/* ==========================================================================
   SCENE 04 — THE WORD  (45s)
   0–11   one whole thing. he squares it up, knocks on it, and it rings clean.
   11–26  it parts into six identical units. he counts the row by contact.
          a half will not stand in a row of wholes.
   26–45  the units go up as a beam. a man walks out on it. a hairline opens
          at the web, runs the width of the frame, and the beam sags under
          exactly the weight it carried a moment ago.
   ========================================================================== */

var S4_UW = 78, S4_UH = 190;
var S4_BLK_L = 783;
var S4_MAP = [2, 3, 4, 1, 5, 0];
var S4_TAP = [6.6, 8.6, 10.4];
var S4_BY = 430, S4_BTH = 78;
var S4_PIER_A = 300, S4_PIER_B = 1620;
var S4_CRACK = new Float32Array(48);
var S4_YARD = [-260, -40, 170, 350, 1440, 1660, 1880, 2100];
var S4_YARD2 = [-140, 1760, 2010];

var S4_CAM = [
  [0,   -110, 105, 1.42],
  [6,    -70, 105, 1.40],
  [11,   -30,  80, 1.28],
  [14.5,  40,  22, 1.15],
  [19,    90,  22, 1.15],
  [22.5, 130,  22, 1.15],
  [26.5, 110,   8, 1.02],
  [30.5,   0,  -6, 0.86],
  [40,     0,  -6, 0.86],
  [45,    70,   2, 0.94]
];

function s4_rowX(i){ return 560 + i * 130; }
function s4_touchX(i){ return s4_rowX(i) + S4_UW * 0.5 - 62; }

function s4_manX(t){
  if (t < 3.5)  return 110 + 173 * t;
  if (t < 13.9) return 715;
  if (t < 18.9) return 480 + 162 * (t - 13.9);
  if (t < 20.4) return 1290 + 157 * (t - 18.9);
  if (t < 20.5) return 1525;
  if (t < 22.6) return 1525 - 62.9 * (t - 20.5);
  if (t < 24.6) return 1393 - 106.5 * (t - 22.6);
  return 1180;
}

/* the beam's material, so it reads as a member and not two rules */
function s4_beamMass(x1, x2, y, sag, th, alpha){
  var i, n = 20, x, yy;
  g.save();
  g.globalAlpha = alpha * 0.10; g.fillStyle = P.dim;
  g.beginPath();
  for (i = 0; i <= n; i++){ x = lerp(x1, x2, i/n); yy = beamY(x1, x2, y, sag, x);
    if (i === 0) g.moveTo(x, yy); else g.lineTo(x, yy); }
  for (i = n; i >= 0; i--){ x = lerp(x1, x2, i/n);
    g.lineTo(x, beamY(x1, x2, y, sag, x) - th); }
  g.closePath(); g.fill();
  g.restore();
}

S[4] = function(t, d){
  var i, k, a, x, y, yy, ang, al;

  bg();
  CAM.reset();
  CAM.frame(t, S4_CAM);
  CAM.breath(t, 0.7);
  CAM.begin();

  /* ---------- the yard -------------------------------------------------- */
  g.save();
  g.globalAlpha = 0.16; g.strokeStyle = P.dim; g.lineWidth = camPx(2);
  g.beginPath(); g.moveTo(OVER_L, HORIZON); g.lineTo(OVER_R, HORIZON); g.stroke();
  g.restore();
  groundLine(ground(DEPTH.BG), { alpha: 0.40, lw: 2 });
  for (i = 0; i < S4_YARD.length; i++)
    c2_stack(S4_YARD[i], DEPTH.BG, nz1(i * 11 + 3) > 0.5 ? 2 : 1, i + 2);
  groundLine(ground(DEPTH.MB), { alpha: 0.45, lw: 2 });
  for (i = 0; i < S4_YARD2.length; i++)
    c2_stack(S4_YARD2[i], DEPTH.MB, 1, i + 9);
  groundLine(GROUND, { alpha: 0.7 });

  var sepA = 11.0;
  var beamA = 26.5, beamB = 28.8;

  /* ---------- the monolith, and the six units --------------------------- */
  var mo = 1 - clamp((t - sepA) / 0.5, 0, 1);
  if (mo > 0){
    var shove = settle(t - 4.5, 4, 7);
    c2_block(S4_BLK_L + S4_UW * 1.5 + shove, GROUND - S4_UH,
             S4_UW * 3, S4_UH * 2, 0, P.ink, LW.B, mo, 0.14);
  }
  var seam = clamp((t - 10.5) / 0.5, 0, 1);
  if (seam > 0 && t < beamB + 1.4){
    for (k = 0; k < 6; k++){
      i = S4_MAP[k];
      var s = EASE.inOut(clamp((t - (sepA + 0.3 + i * 0.16)) / 1.25, 0, 1));
      var bx = S4_BLK_L + (k % 3) * S4_UW + S4_UW * 0.5;
      var by = GROUND - ((k / 3 | 0) + 1) * S4_UH + S4_UH * 0.5;
      var rx = s4_rowX(i) + S4_UW * 0.5, ry = GROUND - S4_UH * 0.5;
      x = lerp(bx, rx, s); y = lerp(by, ry, s) - 34 * Math.sin(Math.PI * s);
      ang = 0;
      var r = EASE.inOut(clamp((t - (beamA + Math.abs(i - 2.5) * 0.22)) / 1.6, 0, 1));
      if (r > 0){
        x = lerp(x, 390 + i * 190 + 95, r);
        y = lerp(y, S4_BY - S4_UW * 0.5, r) - 34 * Math.sin(Math.PI * r);
        ang = -r * Math.PI * 0.5;
      }
      if (s >= 1 && r <= 0) y += settle(t - (sepA + 1.55 + i * 0.16), 5, 9);
      var ct = 14.25 + i * 0.80;
      if (t > ct && t < ct + 1.2) y += settle(t - ct, 4, 10);
      al = (1 - EASE.inOut(clamp((t - (beamB - 0.1)) / 1.0, 0, 1))) * seam;
      if (al <= 0.02) continue;
      c2_block(x, y, S4_UW, S4_UH, ang, P.ink, LW.C, al, 0.14);
    }
  }

  /* ---------- the half unit -------------------------------------------- */
  var hx = 1420 + S4_UW * 0.25, hy = GROUND - S4_UH * 0.5, ha = 0;
  if (t > 20.5){
    var pu = EASE.inOut(clamp((t - 20.5) / 2.1, 0, 1));
    hx = lerp(1420, 1288, pu) + S4_UW * 0.25;
  }
  if (t > 23.6) ha = 0.075 * clamp((t - 23.6) / 1.2, 0, 1) * Math.sin((t - 23.6) * 9.5);
  if (t > 24.8){
    var tp = EASE.in(clamp((t - 24.8) / 1.0, 0, 1));
    ha = lerp(ha, Math.PI * 0.5, tp);
    var px0 = hx + S4_UW * 0.25, py0 = GROUND;
    var rr = Math.sqrt(S4_UW * 0.25 * S4_UW * 0.25 + S4_UH * 0.5 * S4_UH * 0.5);
    var a0 = Math.atan2(S4_UW * 0.25, S4_UH * 0.5);
    hx = px0 - rr * Math.sin(a0 - ha);
    hy = py0 - rr * Math.cos(a0 - ha);
  } else if (ha !== 0){
    hy = GROUND - S4_UH * 0.5 * Math.cos(ha) - S4_UW * 0.25 * Math.abs(Math.sin(ha));
  }
  if (t > 18.4) c2_block(hx, hy, S4_UW * 0.5, S4_UH, ha, P.ink, LW.C, 1, 0.14);

  /* ---------- piers and beam ------------------------------------------- */
  var sag = 28 * EASE.inOut(clamp((t - 40.0) / 4.4, 0, 1));
  var pierU = EASE.inOut(clamp((t - 27.0) / 1.5, 0, 1));
  if (pierU > 0){
    yy = lerp(GROUND, S4_BY, pierU);
    g.save();
    g.globalAlpha = 0.10; g.fillStyle = P.dim;
    g.fillRect(S4_PIER_A - 27, yy, 54, GROUND - yy);
    g.fillRect(S4_PIER_B - 27, yy, 54, GROUND - yy);
    g.restore();
    g.save();
    g.strokeStyle = P.dim; g.lineWidth = camPx(LW.C); g.lineCap = 'round';
    g.beginPath();
    g.moveTo(S4_PIER_A - 27, GROUND); g.lineTo(S4_PIER_A - 27, yy);
    g.moveTo(S4_PIER_A + 27, GROUND); g.lineTo(S4_PIER_A + 27, yy);
    g.moveTo(S4_PIER_B - 27, GROUND); g.lineTo(S4_PIER_B - 27, yy);
    g.moveTo(S4_PIER_B + 27, GROUND); g.lineTo(S4_PIER_B + 27, yy);
    g.stroke();
    g.restore();
  }
  var bu = EASE.inOut(clamp((t - beamB) / 1.6, 0, 1));
  var bx1 = lerp(390, OVER_L - 40, bu), bx2 = lerp(1530, OVER_R + 40, bu);
  var beamOn = clamp((t - (beamB - 0.4)) / 0.9, 0, 1);
  if (beamOn > 0){
    s4_beamMass(bx1, bx2, S4_BY, sag, S4_BTH, beamOn);
    beam(bx1, bx2, S4_BY, { sag: sag, thick: S4_BTH, col: P.ink,
                            lw: LW.C, alpha: beamOn * 0.85 });
  }

  /* ---------- the block man -------------------------------------------- */
  var mx = s4_manX(t), mflip = (t > 20.3 && t < 22.8) ? -1 : 1, q;
  var h = FIG_H;
  if (t < 3.5){
    q = POSE.walkAt(mx, 110, h, { rate: 1 });
  } else if (t < 6.2){
    a = EASE.inOut(clamp((t - 3.6) / 0.9, 0, 1)) *
        (1 - EASE.inOut(clamp((t - 5.4) / 0.8, 0, 1)));
    q = POSE.stand(t, 4);
    q.spine = 0.035 + 0.22 * a;
    vec(q, 'handR', lerp(0.075, 0.200, a), lerp(0.47, 0.600, a));
    vec(q, 'handL', lerp(-0.075, 0.185, a), lerp(0.47, 0.495, a));
    foot(q, 'L', -0.15 - 0.06 * a, 0, 0); foot(q, 'R', 0.09, 0, 0);
    q.headTurn = 0.24 * a;
  } else if (t < 13.6){
    a = 0;
    for (i = 0; i < 3; i++){
      var lt = t - S4_TAP[i], v2 = 0;
      if (lt > -0.30 && lt < 0.62){
        v2 = lt < 0 ? EASE.out((lt + 0.30) / 0.30)
           : lt < 0.10 ? 1 : 1 - EASE.inOut((lt - 0.10) / 0.52);
      }
      if (v2 > a) a = v2;
    }
    q = POSE.stand(t, 4);
    vec(q, 'handR', lerp(0.075, 0.210, a), lerp(0.47, 0.617, a));
    q.spine = 0.035 + 0.06 * a;
    q.headTurn = 0.20 + 0.10 * a;
  } else if (t < 20.4){
    q = POSE.walkAt(mx, 480, h, { rate: 0.937 });
    for (i = 0; i < 6; i++){
      var dxr = Math.abs(mx - s4_touchX(i));
      if (dxr < 62){
        a = 1 - EASE.inOut(dxr / 62);
        vec(q, 'handR', lerp(0.075, 0.191, a), lerp(0.47, 0.586, a));
        q.headTurn = 0.10 + 0.20 * a;
        break;
      }
    }
  } else if (t < 22.8){
    a = EASE.inOut(clamp((t - 20.3) / 0.5, 0, 1));
    q = POSE.stand(t, 4);
    q.spine = 0.035 + 0.30 * a;
    vec(q, 'handR', lerp(0.075, 0.205, a), lerp(0.47, 0.560, a));
    vec(q, 'handL', lerp(-0.075, 0.170, a), lerp(0.47, 0.470, a));
    foot(q, 'L', -0.21 * (1 + a), 0, 0); foot(q, 'R', 0.10, 0, 0);
    q.headTurn = 0.20 * a;
  } else if (t < 30.0){
    q = POSE.stand(t, 4, { look: t < 26.5 ? 0.16 : 0.02 });
    if (t > 27) q.headTilt = -0.20 - 0.12 * ease(clamp((t - 27) / 3, 0, 1));
  } else {
    /* he goes down on one knee under his own work and watches it */
    a = EASE.inOut(clamp((t - 30.0) / 1.6, 0, 1));
    var kq = POSE.kneel(t, 4, EMPTY);
    kq.headTilt = -0.30;
    kq.spine = 0.24;
    if (t > 39.9){
      /* the sag: his head comes up and he braces a hand back on the ground */
      var rx2 = EASE.out(clamp((t - 39.9) / 0.55, 0, 1));
      kq.headTilt = lerp(-0.30, -0.46, rx2);
      kq.spine = lerp(0.24, 0.06, rx2) + settle(t - 40.5, 0.05, 8);
      vec(kq, 'handR', lerp(0.22, -0.20, rx2), lerp(0.26, 0.06, rx2));
    }
    var sq = POSE.stand(t, 4, { look: 0.02 });
    sq.headTilt = -0.32;
    q = mix(sq, kq, a);
  }
  add(q, POSE.breathe(t, EMPTY));
  fig(mx, GROUND, h, q, { rank: 'A', flip: mflip });

  /* ---------- the beam walker ------------------------------------------ */
  var WA = 30.0, wspeed = 233.3, wstop = 34.6;
  if (t > WA){
    var wt = Math.min(t, wstop);
    var wx = -60 + wspeed * (wt - WA);
    var wy = beamY(bx1, bx2, S4_BY, sag, wx) - S4_BTH;
    var wq = POSE.walkAt(wx, -60, h, { rate: 1.35 });
    if (t > wstop){
      var fr = clamp((t - wstop - 1.3) / 1.5, 0, 1);
      var bq = POSE.stand(t, 9, { look: -0.06 });
      bq.stance = 1.5; bq.kneeL = 0.34; bq.kneeR = 0.34; bq.spine = 0.13;
      bq.shoulderR = 0.62; bq.shoulderL = -0.62;
      bq.elbowR = 0.30; bq.elbowL = 0.30;
      bq.headTilt = 0.34;
      wq = mix(wq, bq, EASE.inOut(fr));
    }
    add(wq, POSE.breathe(t, EMPTY));
    fig(wx, wy, h, wq, { rank: 'B' });
  }

  /* ---------- ringing --------------------------------------------------- */
  for (i = 0; i < 3; i++)
    c2_ring(S4_BLK_L, GROUND - 0.617 * FIG_H, t - S4_TAP[i], -1, 1.7, 320);
  for (i = 0; i < 6; i++)
    c2_ring(s4_rowX(i) + S4_UW * 0.5, GROUND - S4_UH, t - (14.25 + i * 0.80),
            1, 0.9, 170);

  /* ---------- the warm line climbs the piers, and then fractures -------- */
  var CRK_A = 33.6, CRK_B = 34.6, CRK_C = 41.5;
  if (t > CRK_A){
    var climb = EASE.inOut(clamp((t - CRK_A) / (CRK_B - CRK_A), 0, 1));
    var xc = S4_PIER_A + 1560 * EASE.in(clamp((t - CRK_B) / (CRK_C - CRK_B), 0, 1));
    var j = 0, cx2, cyy, jit;
    S4_CRACK[j++] = S4_PIER_A; S4_CRACK[j++] = GROUND;
    for (i = 0; i < 21; i++){
      cx2 = lerp(S4_PIER_A, S4_PIER_B, i / 20);
      cyy = lerp(GROUND, beamY(bx1, bx2, S4_BY, sag, cx2) - S4_BTH * 0.5, climb);
      jit = clamp((xc - cx2) / 150, 0, 1) * climb * (1 + sag * 0.03);
      S4_CRACK[j++] = cx2;
      S4_CRACK[j++] = cyy + nzs(i * 13 + 5) * 8 * jit;
    }
    S4_CRACK[j++] = S4_PIER_B;
    S4_CRACK[j++] = lerp(GROUND, beamY(bx1, bx2, S4_BY, sag, S4_PIER_B) - S4_BTH * 0.5, climb);
    S4_CRACK[j++] = S4_PIER_B; S4_CRACK[j++] = GROUND;
    warmLine(S4_CRACK, EMPTY);
  } else {
    warmLine(null, EMPTY);
  }

  CAM.end();
};


/* ==========================================================================
   SCENE 05 — TEN WAYS TO BE WHOLE  (55s)
   0–20   ten struts arrive one at a time under the deck he stands on.
   20–40  he moves. whatever he crosses bows, thickens, and carries him.
   40–55  one lets go and hangs. the deck tilts three degrees, he catches
          himself with a step, and the two either side take it — and stay bent.
   ========================================================================== */

var S5_DX = 300, S5_DW = 1320, S5_DECK = 520, S5_SLAB = 26;
var S5_N = 10;
var S5_FAIL = 7;
var S5_TFAIL = 41.5;
var S5_ARCH = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

var S5_CAM = [
  [0,     0, -34, 0.94],
  [12,  -50, -34, 0.95],
  [24,   30, -24, 0.99],
  [36,   90, -24, 0.99],
  [41,  120, -14, 1.01],
  [46,  240,  20, 1.12],
  [55,  270,  24, 1.14]
];

function s5_strutX(i){ return S5_DX + (i + 0.5) * (S5_DW / S5_N); }
function s5_appear(i){ return 1.0 + i * 1.75; }

function s5_drop(t){
  var i, n = 0;
  for (i = 0; i < S5_N; i++)
    if (t > s5_appear(i) + 0.45) n += ease(clamp((t - s5_appear(i) - 0.45) / 0.5, 0, 1));
  return n;
}
function s5_tilt(t){
  if (t < S5_TFAIL) return 0;
  var u = clamp((t - S5_TFAIL) / 1.4, 0, 1);
  return 0.0524 * (EASE.out(u) + settle(t - S5_TFAIL - 1.0, 0.16, 6));
}
function s5_deckY(t, x){ return S5_DECK + s5_drop(t) + (x - 960) * s5_tilt(t); }

function s5_manX(t){
  if (t < 26.5) return 940;
  if (t < 31.0) return lerp(940, 470, EASE.inOut((t - 26.5) / 4.5));
  if (t < 34.0) return 470;
  if (t < 39.5) return lerp(470, 1290, EASE.inOut((t - 34.0) / 5.5));
  if (t < S5_TFAIL) return 1290;
  return lerp(1290, 1150, EASE.out(clamp((t - S5_TFAIL - 0.15) / 0.85, 0, 1)));
}

function s5_seat(q, x, h, flip, t){
  var s = s5_tilt(t), fx, key, i, f;
  if (!s) return q;
  for (i = 0; i < 2; i++){
    key = i ? 'footR' : 'footL';
    f = q[key];
    if (!f) continue;
    fx = x + f[0] * h * flip;
    vec(q, key, f[0], f[1] + ((x - fx) * s) / h);
  }
  return q;
}

S[5] = function(t, d){
  var i, x, a, q;

  bg();
  CAM.reset();
  CAM.frame(t, S5_CAM);
  CAM.breath(t, 0.8);
  CAM.begin();

  g.save();
  g.globalAlpha = 0.16; g.strokeStyle = P.dim; g.lineWidth = camPx(2);
  g.beginPath(); g.moveTo(OVER_L, HORIZON); g.lineTo(OVER_R, HORIZON); g.stroke();
  g.restore();
  groundLine(ground(DEPTH.BG), { alpha: 0.22, lw: 2 });
  groundLine(ground(DEPTH.MB), { alpha: 0.26, lw: 2 });
  groundLine(GROUND, { alpha: 0.65 });

  var mx = s5_manX(t), h = FIG_H;

  /* ---------- the struts ------------------------------------------------ */
  for (i = 0; i < S5_N; i++){
    var ap = s5_appear(i);
    var grow = EASE.out(clamp((t - ap) / 0.5, 0, 1));
    if (grow <= 0) continue;
    x = s5_strutX(i);
    var topY = s5_deckY(t, x) + S5_SLAB;
    var footY = lerp(topY, GROUND, grow) + settle(t - ap - 0.5, 5, 8);
    var load = Math.exp(-Math.pow((mx - x) / 150, 2));
    var dir = nzs(i * 7 + 2) >= 0 ? 1 : -1;
    var bow = 21 * load * dir;
    var lw = lerp(2.1, 5.2, load);

    if (i === S5_FAIL && t > S5_TFAIL){
      var bk = EASE.out(clamp((t - S5_TFAIL) / 0.55, 0, 1));
      var sw = 26 * Math.sin((t - S5_TFAIL) * 2.1) * Math.exp(-(t - S5_TFAIL) * 0.22);
      c2_strut(x, topY, x - 52 * bk + sw, GROUND - 40 * bk,
               50 * bk + sw * 0.4, P.dim, 2.1, 0.7);
      continue;
    }
    if (t > S5_TFAIL && (i === S5_FAIL - 1 || i === S5_FAIL + 1)){
      var tk = EASE.out(clamp((t - S5_TFAIL) / 0.9, 0, 1));
      bow = lerp(bow, (i < S5_FAIL ? -1 : 1) * 40, tk);
      lw = lerp(lw, 5.4, tk);
    }
    c2_strut(x, topY, x, footY, bow, P.dim, lw, 1);
  }

  /* ---------- the deck -------------------------------------------------- */
  var yL = s5_deckY(t, S5_DX), yR = s5_deckY(t, S5_DX + S5_DW);
  g.save();
  g.globalAlpha = 0.10; g.fillStyle = P.dim;
  g.beginPath();
  g.moveTo(S5_DX, yL); g.lineTo(S5_DX + S5_DW, yR);
  g.lineTo(S5_DX + S5_DW, yR + S5_SLAB); g.lineTo(S5_DX, yL + S5_SLAB);
  g.closePath(); g.fill();
  g.globalAlpha = 1;
  g.strokeStyle = P.ink; g.lineWidth = camPx(LW.C); g.lineJoin = 'round';
  g.stroke();
  g.restore();

  /* ---------- the man --------------------------------------------------- */
  var flip = 1;
  if (t < 20.0){
    q = POSE.stand(t, 12, { look: 0.06 });
  } else if (t < 26.5){
    a = t < 24.0 ? EASE.inOut(clamp((t - 20.6) / 3.0, 0, 1))
                 : 1 - EASE.inOut(clamp((t - 24.2) / 2.1, 0, 1));
    q = mix(POSE.stand(t, 12), POSE.kneel(t, 12, { deep: true }), a);
  } else if (t < 31.0){
    flip = -1;
    q = POSE.walkAt(-mx, -940, h, { rate: 0.80 });
  } else if (t < 34.0){
    flip = -1;
    a = t < 32.4 ? EASE.out(clamp((t - 31.1) / 1.2, 0, 1))
                 : 1 - EASE.inOut(clamp((t - 32.6) / 1.2, 0, 1));
    q = POSE.reach(a, t, 12, { target: [0.36, 0.28] });
  } else if (t < 39.5){
    q = POSE.walkAt(mx, 470, h, { rate: 0.92 });
  } else if (t < S5_TFAIL + 0.15){
    q = POSE.stand(t, 12, { look: -0.08 });
    q.comX += 0.035;
  } else if (t < S5_TFAIL + 1.1){
    flip = -1;
    q = POSE.walkAt(-mx, -1290, h, { rate: 1.6 });
  } else {
    q = POSE.stand(t, 12, { stance: 1.45, look: -0.20 });
    q.kneeL += 0.16; q.kneeR += 0.16;
    q.spine = 0.10;
    q.headTilt = 0.16;
  }
  add(q, POSE.breathe(t, EMPTY));
  s5_seat(q, mx, h, flip, t);
  fig(mx, s5_deckY(t, mx), h, q, { rank: 'A', flip: flip });

  /* ---------- the warm line takes the load ------------------------------ */
  if (t > S5_TFAIL + 1.0){
    var ar = EASE.out(clamp((t - S5_TFAIL - 1.0) / 2.5, 0, 1));
    var ax = s5_strutX(S5_FAIL), ay = lerp(GROUND, 676, ar);
    S5_ARCH[0] = ax - 130; S5_ARCH[1] = GROUND;
    S5_ARCH[2] = ax - 68;  S5_ARCH[3] = lerp(GROUND, ay + 24, ar);
    S5_ARCH[4] = ax;       S5_ARCH[5] = ay;
    S5_ARCH[6] = ax + 68;  S5_ARCH[7] = lerp(GROUND, ay + 24, ar);
    S5_ARCH[8] = ax + 130; S5_ARCH[9] = GROUND;
    warmLine(S5_ARCH, EMPTY);
  } else {
    warmLine(null, EMPTY);
  }

  CAM.end();
};


/* ==========================================================================
   SCENE 06 — EVERY DECISION PASSES THROUGH A BODY  (50s)
   0–15   the lift. the warm line leaves the floor and runs up through him.
   15–28  the carry. the line pulses on each footfall; both get slower.
   28–50  he sets it down under control, straightens, stands — and is costed.
   ========================================================================== */

var S6_X0 = 635, S6_CW = 176, S6_CH = 124;
var S6_T0 = 15.0, S6_TC = 13.0;
var S6_R0 = 0.52, S6_R1 = 0.38;
var S6_S0 = 0.30, S6_S1 = 0.185;
var S6_PHI = (13.0 / 1.05) * (0.52 + (0.38 - 0.52) * 0.5);
var S6_JOINT = ['heelR', 'ankleR', 'kneeR', 'hipR', 'pelvisC', 'sternum',
                'shoulderC', 'neckTop', 'headC'];
var S6_PATH = new Float32Array(24);

var S6_CAM = [
  [0,  -290, 108, 1.42],
  [6,  -270, 108, 1.42],
  [12, -250,  80, 1.30],
  [16, -150,  46, 1.12],
  [28,  280,  46, 1.12],
  [34,  360,  46, 1.12],
  [41,  400,  60, 1.20],
  [50,  430,  70, 1.30]
];

function s6_phi(t){
  var tau = clamp((t - S6_T0) / S6_TC, 0, 1);
  return (S6_TC / GAIT.cycle) * (S6_R0 * tau + (S6_R1 - S6_R0) * tau * tau * 0.5);
}
function s6_step(p){ return S6_S0 + (S6_S1 - S6_S0) * clamp(p / S6_PHI, 0, 1); }
function s6_carryX(p){
  return S6_X0 + 2 * FIG_H * (S6_S0 * p + (S6_S1 - S6_S0) * p * p / (2 * S6_PHI));
}

S[6] = function(t, d){
  var i, q, x, p, a;
  var h = FIG_H;

  bg();
  CAM.reset();
  CAM.frame(t, S6_CAM);
  CAM.breath(t, 0.9);
  CAM.begin();

  groundPlane(EMPTY);

  /* the yard: where the crate came from, and where it is going */
  c2_stack(180, DEPTH.BG, 2, 5);
  c2_stack(1900, DEPTH.BG, 1, 6);
  c2_stack(2100, DEPTH.BG, 2, 7);
  for (i = 0; i < 2; i++)
    c2_block(430, GROUND - (i + 0.5) * S6_CH, S6_CW, S6_CH, 0, P.dim, LW.D, 0.85, 0.10);
  for (i = 0; i < 2; i++)
    c2_block(1760, GROUND - (i + 0.5) * S6_CH, S6_CW, S6_CH, 0, P.dim, LW.D, 0.85, 0.10);
  /* one foreground crate, cropped by the frame edge */
  c2_block(-40, ground(DEPTH.FG) - S6_CH * 0.65, S6_CW * 1.3, S6_CH * 1.3, 0,
           P.dim, LW.C, 0.9, 0.12);

  warmLine(null, EMPTY);

  var fat = 0;
  x = S6_X0;

  if (t < S6_T0){
    p = t < 2.4 ? 0 : EASE.inOut(clamp((t - 2.4) / 8.0, 0, 1));
    q = POSE.lift(p, t, 6, EMPTY);
    fat = 0.10 * clamp((t - 4) / 8, 0, 1);
  } else if (t < S6_T0 + S6_TC){
    p = s6_phi(t);
    x = s6_carryX(p);
    q = POSE.walk(p, { step: s6_step(p), arms: false });
    vec(q, 'handL', 0.16, 0.52);
    vec(q, 'handR', 0.24, 0.52);
    fat = 0.10 + 0.55 * EASE.out(clamp((t - S6_T0) / S6_TC, 0, 1));
    q.spine = lerp(-0.03, 0.12, fat);
    q.neck = lerp(1.0, 0.68, fat);
    q.headTilt = lerp(0.04, 0.26, fat);
    q.hipH -= 0.012 * fat;
  } else if (t < 34.5){
    x = s6_carryX(S6_PHI);
    a = EASE.inOut(clamp((t - (S6_T0 + S6_TC + 0.6)) / 5.0, 0, 1));
    p = lerp(1, 0.18, a);
    q = POSE.lift(p, t, 6, EMPTY);
    fat = 0.65;
  } else if (t < 38.0){
    x = s6_carryX(S6_PHI) - 66 * EASE.inOut(clamp((t - 35.4) / 2.2, 0, 1));
    a = EASE.inOut(clamp((t - 34.5) / 2.6, 0, 1));
    q = mix(POSE.lift(0.18, t, 6, EMPTY), POSE.slump(0.30, t, 6, EMPTY), a);
    fat = 0.65;
  } else {
    x = s6_carryX(S6_PHI) - 66;
    fat = lerp(0.65, 0.34, EASE.out(clamp((t - 38) / 9, 0, 1)));
    q = POSE.slump(0.30 * (1 - EASE.out(clamp((t - 38) / 10, 0, 1)) * 0.35), t, 6, EMPTY);
    q.headTurn = -0.06 + 0.10 * Math.sin(t * 0.4);
  }
  add(q, POSE.breathe(t, { period: lerp(3.2, 2.1, fat), amp: 0.006 + 0.006 * fat }));

  fig(x, GROUND, h, q, { rank: 'A' });

  /* ---------- the crate, parented to the hands -------------------------- */
  var hL = FIG.hand('L'), hR = FIG.hand('R');
  var craX = (hL[0] + hR[0]) * 0.5 + 54;
  var craY = (hL[1] + hR[1]) * 0.5 + 0.42 * S6_CH;
  if (t < 2.4) { craX = S6_X0 + 118; craY = GROUND; }
  if (t > 34.5) { craX = s6_carryX(S6_PHI) + 118; craY = GROUND; }
  c2_block(craX, craY - S6_CH * 0.5, S6_CW, S6_CH, 0, P.ink, LW.C, 1, 0.12);

  /* ---------- the decision path, drawn inside him ----------------------- */
  var rev = ease(clamp((t - 3.4) / 8.0, 0, 1));
  var n = S6_JOINT.length;
  for (i = 0; i < n; i++){
    var pj = FIG.at(S6_JOINT[i]);
    S6_PATH[i*2] = pj[0]; S6_PATH[i*2+1] = pj[1];
  }
  var heelY = S6_PATH[1];
  var base = lerp(1.0, 0.55, fat);
  var pulse;
  if (t >= S6_T0 && t < S6_T0 + S6_TC){
    pulse = Math.exp(-5.5 * ((s6_phi(t) * 2) % 1));
  } else {
    pulse = 0.5 + 0.5 * _breathCurve(t / lerp(3.2, 2.1, fat));
  }
  var alp = base * (0.60 + 0.40 * pulse);
  if (rev > 0){
    if (heelY > GROUND - 46){
      g.save();
      g.globalAlpha = alp; g.strokeStyle = P.accent;
      g.lineWidth = camPx(4.4); g.lineCap = 'round';
      g.beginPath(); g.moveTo(S6_PATH[0], GROUND); g.lineTo(S6_PATH[0], heelY);
      g.stroke(); g.restore();
    }
    c2_poly(S6_PATH, n, rev, P.accent, 4.4, alp);
    if (rev > 0.985){
      g.save();
      g.globalAlpha = alp; g.fillStyle = P.accent;
      g.beginPath();
      g.arc(S6_PATH[(n-1)*2], S6_PATH[(n-1)*2+1], camPx(9), 0, TAU);
      g.fill(); g.restore();
    }
  }

  CAM.end();
};
