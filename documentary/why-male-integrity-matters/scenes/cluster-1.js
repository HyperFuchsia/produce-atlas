/* ==========================================================================
   CLUSTER 1 — scenes 01, 02, 03
   ========================================================================== */
(function(){

/* ---------------------------------------------------------------- helpers */

// POSE.lie() in the core folds the figure: its foot targets sit at +v, and
// rootRot=-PI/2 maps +v to +forward, so head and feet both end up on the same
// side of the pelvis, and the FK arms are driven down through the mattress.
// lieOn() is the corrected supine pose: feet behind, arms along the body.
function lieOn(t, i, o){
  var q = POSE.lie(t, i, o);
  vec(q, 'footL', -0.03, -0.350);
  vec(q, 'footR',  0.01, -0.366);
  q.ankleL = -1.85; q.ankleR = -1.85;      // soles vertical: toes to the ceiling
  q.shoulderL = 0.00; q.shoulderR = 0.02;
  q.elbowL = 0.14; q.elbowR = 0.10;        // arms tucked along the body
  q.headTilt = -0.16;
  return q;
}

function mass(x, y, rx, ry, col, a){
  g.save();
  g.globalAlpha = a === undefined ? 1 : a;
  g.fillStyle = col || P.dim;
  g.translate(x, y); g.scale(1, ry / rx);
  g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill();
  g.restore();
}
function stroke2(x1, y1, x2, y2, col, w, a){
  g.save();
  g.globalAlpha = a === undefined ? 1 : a;
  g.strokeStyle = col || P.dim; g.lineWidth = camPx(w || LW.C);
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  g.restore();
}
// Back-and-forth pacing that never slides: [x, flip, distanceWalked].
var _PAC = [0, 1, 0];
function pace(t, xa, xb, period, phase){
  var L = xb - xa;
  var u = (t / period) + (phase || 0);
  u -= Math.floor(u);
  var tri = u < 0.5 ? u * 2 : 2 - u * 2;
  _PAC[0] = xa + L * tri;
  _PAC[1] = u < 0.5 ? 1 : -1;
  _PAC[2] = u * 2 * L;
  return _PAC;
}

/* ==========================================================================
   SCENE 01 — BEFORE ANYONE IS AWAKE
   One room. One man. Then the pull back, and the block turns out to be full
   of them, and behind the block there are towers full of them.
   ========================================================================== */

var S1_PX = 380, S1_PY = 165, S1_OW = 320, S1_OH = 125, S1_SILL = 705;
var S1_BLD = [[-1220, 4, 3], [400, 1, 5], [860, 3, 3], [2100, 3, 3]];
var S1_BASE = [0, 0, 0, 0];
(function(){ var a = 0, i; for (i = 0; i < S1_BLD.length; i++){ S1_BASE[i] = a; a += S1_BLD[i][1] * S1_BLD[i][2]; } })();
var S1_HERO = S1_BASE[2] + 1 * 3 + 0;
var S1_H    = FIG_H * STEP.INSET;                 // 71.28 — the inset step
var S1_HL   = 860 + S1_PX;                        // hero opening left = 1180
var S1_HX   = 1370;
var S1_BEDX = 1280, S1_BEDW = 140, S1_BEDT = S1_SILL - 23;

var S1_CAM = [
  [0,  440,  195, 2.58, EASE.inOut],
  [14, 440,  195, 2.78, EASE.in],
  [22, 330,  120, 1.80, EASE.linear],
  [34, 160,   14, 1.20, EASE.linear],
  [50,   0, -110, 0.80, EASE.linear]
];
// distant towers: x, width, height. They stand on the BG baseline and carry a
// grid of small windows — the field of points the pull-back resolves into.
var S1_TOWER = [[-1500, 300, 760], [-700, 250, 700], [100, 240, 790],
                [820, 220, 720],   [1700, 260, 745], [2500, 300, 810],
                [3050, 240, 700]];
var S1_WARM  = [0, 0, 0, 0, 0, 0, 0, 0];

function s1CellX(b, c){ return S1_BLD[b][0] + c * S1_PX; }
function s1CellY(r){ return S1_SILL - r * S1_PY; }

function s1Lit(k, t){
  if (k === S1_HERO) return 1;
  var dk = (k === 5) ? 41.5 : (k === 17) ? 44.9 : (k === 28) ? 47.7 : 0;
  if (!dk && nz1(k * 11 + 3) >= 0.50) return 0;
  var T = dk ? (15 + 9 * nz1(k * 37 + 5)) : (15 + 22 * nz1(k * 37 + 5));
  var v = clamp((t - T) / 0.5, 0, 1);
  if (dk) v *= 1 - clamp((t - dk) / 0.7, 0, 1);
  return v;
}

function s1WinFig(k, b, c, r, t, lv){
  var L = s1CellX(b, c), sill = s1CellY(r);
  var xa = L + 56, xb = L + S1_OW - 56;
  var a = k % 6, q, x = lerp(xa, xb, 0.3 + 0.45 * nz1(k * 5 + 1)), fl = nz1(k * 3) < 0.4 ? -1 : 1;
  var lt = t + nz1(k * 17) * 9;
  if (a === 0){
    q = POSE.stand(lt, k);
  } else if (a === 1){
    var s = 0.5 + 0.5 * Math.sin(lt * 0.8 + decor(k));
    q = POSE.reach(0.35 + 0.5 * s, lt, k, { target: [0.30, 0.80] });
  } else if (a === 2){
    q = POSE.kneel(lt, k, { deep: true });
  } else if (a === 3){
    q = POSE.sit(lt, k, { seat: 0.32, feet: 0.22 });
  } else if (a === 4){
    var p = pace(lt, xa, xb, 8 + 3 * nz1(k * 9), nz1(k * 13));
    x = p[0]; fl = p[1];
    q = POSE.walkAt(p[2], 0, S1_H, { rate: 0.8, step: 0.22 });
  } else {
    q = POSE.slump(0.45, lt, k);
  }
  fig(x, sill, S1_H, q, { rank: 'E', lw: 2.4, contact: false, flat: true,
                          alpha: lv, flip: fl, col: P.ink });
  // floor of the room, drawn under the feet so nobody hovers
  stroke2(L + 8, sill, L + S1_OW - 8, sill, P.dim, 2, 0.35 * lv);
}

S[1] = function(t, d){
  var i, b, c, r, k, x, y, lv, B0, cols, rows, left, right, top;

  bg();
  CAM.reset();
  CAM.frame(t, S1_CAM);
  CAM.breath(t, 0.7);
  CAM.begin();

  /* --- the far towers: the constellation --------------------------------- */
  var bgLit = 0.06 + 0.34 * clamp((t - 14) / 24, 0, 1);
  for (i = 0; i < S1_TOWER.length; i++){
    building(S1_TOWER[i][0], ground(DEPTH.BG), S1_TOWER[i][1], S1_TOWER[i][2],
             { depth: DEPTH.BG, seed: i * 13 + 3, lit: bgLit, litCol: P.ink,
               col: P.dim, alpha: 0.85 });
  }

  /* --- the near block ----------------------------------------------------- */
  for (b = 0; b < S1_BLD.length; b++){
    B0 = S1_BLD[b]; cols = B0[1]; rows = B0[2];
    left = B0[0] - 40; right = B0[0] + (cols - 1) * S1_PX + S1_OW + 40;
    top  = s1CellY(rows - 1) - S1_OH - 50;
    g.save();
    g.globalAlpha = 0.10; g.fillStyle = P.dim;
    g.fillRect(left, top, right - left, GROUND - top);
    g.globalAlpha = 0.7; g.strokeStyle = P.dim; g.lineWidth = camPx(LW.C);
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(left, GROUND); g.lineTo(left, top); g.lineTo(right, top); g.lineTo(right, GROUND);
    g.stroke();
    g.restore();
  }

  g.save();                                  // unlit panes, one fill
  g.globalAlpha = 0.34; g.fillStyle = P.dim;
  g.beginPath();
  for (b = 0; b < S1_BLD.length; b++){
    cols = S1_BLD[b][1]; rows = S1_BLD[b][2];
    for (c = 0; c < cols; c++) for (r = 0; r < rows; r++){
      k = S1_BASE[b] + c * rows + r;
      if (s1Lit(k, t) > 0.02) continue;
      g.rect(s1CellX(b, c), s1CellY(r) - S1_OH, S1_OW, S1_OH);
    }
  }
  g.fill();
  g.restore();

  for (b = 0; b < S1_BLD.length; b++){
    cols = S1_BLD[b][1]; rows = S1_BLD[b][2];
    for (c = 0; c < cols; c++) for (r = 0; r < rows; r++){
      k = S1_BASE[b] + c * rows + r;
      lv = s1Lit(k, t);
      if (lv <= 0.02) continue;
      x = s1CellX(b, c); y = s1CellY(r);
      g.save();
      g.globalAlpha = 0.34 * (1 - lv); g.fillStyle = P.dim;
      g.fillRect(x, y - S1_OH, S1_OW, S1_OH);
      g.globalAlpha = 0.34 + 0.56 * lv; g.strokeStyle = P.ink;
      g.lineWidth = camPx(LW.D); g.lineJoin = 'miter';
      g.strokeRect(x, y - S1_OH, S1_OW, S1_OH);
      g.restore();
      if (k !== S1_HERO) s1WinFig(k, b, c, r, t, lv);
    }
  }

  /* --- the hero room ------------------------------------------------------ */
  g.save();
  g.globalAlpha = 0.30; g.strokeStyle = P.dim; g.lineWidth = camPx(LW.E);
  g.lineCap = 'round'; g.beginPath();
  g.moveTo(S1_HL + 8, S1_SILL); g.lineTo(S1_HL + S1_OW - 8, S1_SILL);   // floor
  g.moveTo(S1_HL + 246, S1_SILL); g.lineTo(S1_HL + 246, S1_SILL - 96);  // door
  g.lineTo(S1_HL + 292, S1_SILL - 96); g.lineTo(S1_HL + 292, S1_SILL);
  g.moveTo(S1_HL + 62, S1_SILL - S1_OH); g.lineTo(S1_HL + 62, S1_SILL - 88);
  g.stroke();
  g.globalAlpha = 0.45; g.beginPath();
  g.arc(S1_HL + 62, S1_SILL - 84, 5, 0, TAU); g.stroke();               // pendant
  g.globalAlpha = 0.18; g.fillStyle = P.dim;
  g.fillRect(S1_BEDX, S1_BEDT, S1_BEDW, S1_SILL - S1_BEDT);
  g.globalAlpha = 0.8; g.strokeStyle = P.dim; g.lineWidth = camPx(LW.D);
  g.beginPath();
  g.moveTo(S1_BEDX, S1_SILL); g.lineTo(S1_BEDX, S1_BEDT);
  g.lineTo(S1_BEDX + S1_BEDW, S1_BEDT); g.lineTo(S1_BEDX + S1_BEDW, S1_SILL);
  g.stroke();
  g.restore();
  mass(S1_BEDX + 124, S1_BEDT - 4, 15, 6, P.dim, 0.6);                  // pillow

  var hy, hp, hx = S1_HX;
  if (t < 7.0){
    hp = lieOn(t, 101); hy = S1_BEDT + 0.05 * S1_H;
  } else if (t < 14.0){
    var wp = (t - 7) / 7;
    var lp = lieOn(t, 101);
    var sp = POSE.sit(t, 101, { seat: 0.32, feet: 0.20 });
    if (wp < 0.32)      hp = mix(lp, sp, EASE.inOut(wp / 0.32));
    else if (wp < 0.64) hp = sp;
    else                hp = mix(sp, POSE.stand(t, 101), EASE.inOut((wp - 0.64) / 0.36));
    hy = lerp(S1_BEDT + 0.05 * S1_H, S1_SILL, clamp(wp / 0.32, 0, 1));
  } else if (t < 20.0){
    hp = POSE.stand(t, 101); hy = S1_SILL;
  } else {
    var s2 = clamp((t - 20) / 8, 0, 1), dx = 74 * EASE.inOut(s2);
    hx = S1_HX + dx; hy = S1_SILL;
    var wpz = POSE.walkAt(dx, 0, S1_H, { rate: 0.7, step: 0.22 });
    if (s2 < 0.84) hp = wpz;
    else hp = mix(wpz, POSE.stand(t, 101), EASE.inOut((s2 - 0.84) / 0.16));
  }
  fig(hx, hy, S1_H, hp, { rank: 'D', lw: 3.2, contact: false, col: P.ink });

  // the blanket: what makes a lying stick figure read as a sleeping man. It is
  // thrown back to the foot of the bed as he sits up.
  var ba = 1 - ease(seg(t, 7.0, 8.6));
  if (ba > 0.01) mass(S1_HX - 16 + 10 * (1 - ba), S1_BEDT - 5, 35, 13, P.dim, 0.6 * ba);
  if (ba < 1)    mass(S1_BEDX + 20, S1_BEDT - 1, 18, 10, P.dim, 0.5 * (1 - ba));

  /* --- ground, foreground parapet ---------------------------------------- */
  groundLine(GROUND, { alpha: 0.55 });
  g.save();
  g.globalAlpha = 0.16; g.strokeStyle = P.dim; g.lineWidth = camPx(LW.C);
  g.lineCap = 'round'; g.beginPath();
  g.moveTo(OVER_L, 838); g.lineTo(700, 838);
  for (i = 0; i < 8; i++){ x = -290 + i * 130; g.moveTo(x, 838); g.lineTo(x, 884); }
  g.stroke();
  g.restore();

  /* --- the warm line kinks up to the one window we started in ------------ */
  var kk = ease(seg(t, 45.5, 50)), sy = lerp(GROUND, S1_SILL + 4, kk);
  S1_WARM[0] = S1_HL - 78;         S1_WARM[1] = GROUND;
  S1_WARM[2] = S1_HL;              S1_WARM[3] = sy;
  S1_WARM[4] = S1_HL + S1_OW;      S1_WARM[5] = sy;
  S1_WARM[6] = S1_HL + S1_OW + 78; S1_WARM[7] = GROUND;
  warmLine(S1_WARM);

  CAM.end();
};


/* ==========================================================================
   SCENE 02 — THE ORDINARY
   ========================================================================== */

var S2_CAM = [
  [0,   -460,  92, 1.52],
  [8,   -460,  92, 1.62],
  [12.5, -40,  73, 1.48],
  [18,   -40,  73, 1.48],
  [21.5, 540,  85, 1.55],
  [27,   540,  85, 1.55],
  [30.5, 990, 138, 2.00],
  [36,   990, 138, 2.00],
  [39,  1480,  95, 1.62],
  [43,  1480,  95, 1.62],
  [50,   570,-136, 0.80]
];
var S2_ST = [430, 920, 1400, 2000, 2280];
var S2_DIPT = [3, 12, 21, 30, 39];
var S2_WARM = new Array(30);
var S2_MG = FIG_H;
var S2_KID = FIG_H * CHILD.scale;

function s2Warm(t){
  var i, xk, dip;
  for (i = 0; i < 5; i++){
    xk = S2_ST[i];
    dip = 13 * ease(seg(t, S2_DIPT[i], S2_DIPT[i] + 1.2))
        -  9 * ease(seg(t, S2_DIPT[i] + 1.2, S2_DIPT[i] + 3.4));
    S2_WARM[i*6]   = xk - 120; S2_WARM[i*6+1] = GROUND;
    S2_WARM[i*6+2] = xk;       S2_WARM[i*6+3] = GROUND + dip;
    S2_WARM[i*6+4] = xk + 120; S2_WARM[i*6+5] = GROUND;
  }
  warmLine(S2_WARM, { x0: -600, x1: 3300 });
}

var S2_SPK = 11;
var _SP = [0, 0];
function s2Spark(x0, y0, k, age){
  var vx = nzs(k * 3 + 1) * 130 - 40, vy = -150 - 110 * nz1(k * 5);
  var G = 950, x = x0 + vx * age, y = y0 + vy * age + 0.5 * G * age * age;
  if (y > GROUND){
    var A = 0.5 * G, Bq = vy, C = y0 - GROUND;
    var disc = Bq * Bq - 4 * A * C;
    var ti = disc > 0 ? (-Bq + Math.sqrt(disc)) / (2 * A) : age;
    var vi = vy + G * ti, a2 = age - ti;
    y = GROUND - 0.40 * vi * a2 + 0.5 * G * a2 * a2;
    if (y > GROUND) y = GROUND;
    x = x0 + vx * ti + vx * 0.35 * a2;
  }
  _SP[0] = x; _SP[1] = y;
  return _SP;
}
function s2Welder(t){
  var lt = t % 9.5;
  var bead = clamp((lt - 1.0) / 4.4, 0, 1);
  var arc  = (lt > 0.55 && lt < 5.5) ? 1 : 0;
  var thumb = clamp((lt - 6.6) / 1.5, 0, 1);
  var tu = lerp(0.216, 0.401, bead), tv = 0.196;
  if (lt > 5.5 && lt < 6.6) tv = lerp(0.196, 0.30, ease((lt - 5.5) / 1.1));
  if (lt >= 6.6){ tu = lerp(0.216, 0.401, thumb); tv = 0.186; }
  var x = S2_ST[0], i, p;

  g.save();
  g.globalAlpha = 0.85; g.strokeStyle = P.dim; g.lineWidth = camPx(LW.C);
  g.lineCap = 'round'; g.beginPath();
  g.moveTo(478, 700); g.lineTo(636, 700);
  g.moveTo(478, 714); g.lineTo(636, 714);
  g.moveTo(506, 714); g.lineTo(492, GROUND);
  g.moveTo(506, 714); g.lineTo(520, GROUND);
  g.moveTo(606, 714); g.lineTo(592, GROUND);
  g.moveTo(606, 714); g.lineTo(620, GROUND);
  g.stroke();
  g.restore();

  var q = POSE.kneel(t, 2);
  q.spine = 0.55; q.headTilt = 0.50; q.headTurn = 0.14;
  vec(q, 'handR', tu, tv);
  vec(q, 'handL', tu - 0.13, tv + 0.075);
  fig(x, GROUND, S2_MG, q, { rank: 'A', col: P.ink });

  var hR = FIG.hand('R'), hL = FIG.hand('L');
  var dx = hR[0] - hL[0], dy = hR[1] - hL[1], dl = Math.sqrt(dx*dx + dy*dy) || 1;
  var tipx = hR[0] + dx / dl * 26, tipy = hR[1] + dy / dl * 26;
  if (lt < 6.6) stroke2(hL[0] - dx / dl * 22, hL[1] - dy / dl * 22, tipx, tipy, P.ink, LW.C, 0.9);
  var sx = lerp(500, 566, lt < 6.6 ? bead : 1);
  stroke2(500, 698, sx, 698, P.ink, LW.D, 0.55);

  if (arc){
    g.save();
    g.fillStyle = P.accent;
    for (i = 0; i < S2_SPK; i++){
      var per = 0.75 + 0.55 * nz1(i * 13 + 1);
      var ph = (t + nz1(i * 7 + 3) * per) / per;
      var age = (ph - Math.floor(ph)) * per;
      p = s2Spark(tipx, tipy, i, age);
      g.globalAlpha = 0.9 * (1 - age / per);
      g.beginPath(); g.arc(p[0], p[1], 3.0, 0, TAU); g.fill();
    }
    g.globalAlpha = 0.5; g.beginPath();
    g.arc(tipx, tipy, 9 + 3 * Math.sin(t * 31), 0, TAU); g.fill();
    g.restore();
  }
}

function s2Father(t){
  var p = pace(t, 838, 1002, 13.5, 0.12);
  var x = p[0], fl = p[1];
  var q = POSE.walkAt(p[2], 0, S2_MG, { rate: 0.5, step: 0.16, arms: false });
  q.spine = -0.07;
  vec(q, 'handR', 0.19, 0.615);
  vec(q, 'handL', 0.055, 0.665);
  var droop = 0.5 + 0.5 * Math.sin(t * 0.36 - 1.1);
  q.headTilt = 0.10 + 0.26 * droop;
  q.headTurn = 0.22;
  q.neck = 1 - 0.22 * droop;

  g.save();
  g.globalAlpha = 0.4; g.strokeStyle = P.dim; g.lineWidth = camPx(LW.D);
  g.lineCap = 'round'; g.beginPath();
  g.moveTo(700, GROUND); g.lineTo(700, 612); g.lineTo(816, 612); g.lineTo(816, GROUND);
  for (var i = 1; i < 5; i++){ g.moveTo(700 + i * 23, 612); g.lineTo(700 + i * 23, 690); }
  g.moveTo(700, 690); g.lineTo(816, 690);
  g.stroke();
  g.restore();

  fig(x, GROUND, S2_MG, q, { rank: 'A', flip: fl, col: P.ink });
  var a = FIG.hand('R'), b = FIG.hand('L');
  var bx = (a[0] + b[0]) / 2, by = (a[1] + b[1]) / 2 - 6;
  mass(bx, by, 40, 27, P.dim, 0.5);
  g.save();
  g.globalAlpha = 0.85; g.strokeStyle = P.ink; g.lineWidth = camPx(LW.D);
  g.translate(bx, by); g.scale(1, 27 / 40);
  g.beginPath(); g.arc(0, 0, 40, 0, TAU); g.stroke();
  g.restore();
}

function s2Teacher(t){
  var lt = (t + 4) % 14;
  var down = ease(seg(lt, 2.4, 4.2));
  var point = clamp(seg(lt, 4.3, 5.2) - seg(lt, 8.6, 9.6), 0, 1);

  g.save();
  g.globalAlpha = 0.8; g.strokeStyle = P.dim; g.lineWidth = camPx(LW.C);
  g.lineCap = 'round'; g.beginPath();
  g.moveTo(1448, 650); g.lineTo(1624, 650);
  g.moveTo(1462, 650); g.lineTo(1462, GROUND);
  g.moveTo(1610, 650); g.lineTo(1610, GROUND);
  g.stroke();
  g.globalAlpha = 0.45; g.lineWidth = camPx(LW.E);
  g.beginPath(); g.moveTo(1482, 646); g.lineTo(1546, 646); g.stroke();
  g.restore();

  var st = POSE.stand(t, 4, { look: 0.20 });
  var kn = POSE.kneel(t, 4);
  kn.headTurn = 0.24; kn.headTilt = 0.30;
  var q = down < 1 ? mix(st, kn, down) : kn;
  if (point > 0){
    var gp = grip(S2_ST[2], GROUND, S2_MG, 1, 1502, 648);
    vec(q, 'handR', lerp(0.10, gp[0], EASE.out(point)), lerp(0.44, gp[1], EASE.out(point)));
  }
  fig(S2_ST[2], GROUND, S2_MG, q, { rank: 'A', col: P.ink });

  var kq = POSE.stand(t, 9, { look: -0.16 });
  kq.headTilt = 0.30;
  var kg = grip(1560, GROUND, S2_KID, -1, 1512 + 26 * (0.5 + 0.5 * Math.sin(t * 1.3)), 646);
  vec(kq, 'handR', kg[0], kg[1] + 0.03 + 0.012 * Math.sin(t * 1.7));
  kq.spine = 0.16;
  fig(1560, GROUND, S2_KID, kq, { rank: 'B', flip: -1, child: true, col: P.ink });
}

var S2_TX = 1620, S2_TY = 420, S2_TPITCH = 15, S2_TGW = 72,
    S2_TROW = 50, S2_TH = 34, S2_TGPR = 6;
var _mk = [0, 0, 0];
function s2MarkPos(m, out){
  var gi = Math.floor(m / 5), mi = m % 5;
  var row = Math.floor(gi / S2_TGPR), gc = gi % S2_TGPR;
  out[0] = S2_TX + gc * S2_TGW + mi * S2_TPITCH;
  out[1] = S2_TY + row * S2_TROW;
  out[2] = mi;
  return out;
}
function s2Researcher(t){
  var n = 118 + (t >= 30.6 ? 1 : 0) + (t >= 34.4 ? 1 : 0);
  var last = n - 1, i, rev = 1;
  if (t >= 34.4) rev = clamp((t - 34.4) / 0.7, 0, 1);
  else if (t >= 30.6) rev = clamp((t - 30.6) / 0.7, 0, 1);

  g.save();
  g.globalAlpha = 0.42; g.strokeStyle = P.dim; g.lineWidth = camPx(LW.E);
  g.lineCap = 'round'; g.beginPath();
  for (i = 0; i < last; i++){
    s2MarkPos(i, _mk);
    if (_mk[2] < 4){ g.moveTo(_mk[0], _mk[1]); g.lineTo(_mk[0] - 3, _mk[1] + S2_TH); }
    else { g.moveTo(_mk[0] - 4 * S2_TPITCH - 6, _mk[1] + S2_TH); g.lineTo(_mk[0] + 6, _mk[1]); }
  }
  g.stroke();
  g.restore();

  s2MarkPos(last, _mk);
  var mx = _mk[0], my = _mk[1];
  g.save();
  g.strokeStyle = P.ink; g.lineWidth = camPx(LW.D); g.lineCap = 'round';
  g.beginPath();
  if (_mk[2] < 4){ g.moveTo(mx, my); g.lineTo(mx - 3 * rev, my + S2_TH * rev); }
  else { g.moveTo(mx - 4 * S2_TPITCH - 6, my + S2_TH);
         g.lineTo(lerp(mx - 4 * S2_TPITCH - 6, mx + 6, rev), lerp(my + S2_TH, my, rev)); }
  g.stroke();
  g.restore();

  var x = S2_ST[3];
  var q = POSE.stand(t, 6, { look: -0.24 });
  q.spine = 0.20;
  var gp = grip(x, GROUND, S2_MG, -1, mx - 2, my + S2_TH * 0.45);
  vec(q, 'handR', gp[0], gp[1]);
  q.headTilt = 0.10;
  fig(x, GROUND, S2_MG, q, { rank: 'A', flip: -1, col: P.ink });
}

function s2Bedside(t){
  var bedT = 624, x0 = 2330, x1 = 2660;
  g.save();
  g.globalAlpha = 0.75; g.strokeStyle = P.dim; g.lineWidth = camPx(LW.C);
  g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
  g.moveTo(x0, bedT); g.lineTo(x1, bedT);
  g.moveTo(x0 + 8, bedT); g.lineTo(x0 + 8, GROUND);
  g.moveTo(x1 - 8, bedT); g.lineTo(x1 - 8, GROUND);
  g.moveTo(x0, bedT); g.lineTo(x0, bedT - 76);
  g.lineTo(x0 + 58, bedT - 76);
  g.stroke();
  g.restore();
  mass(x0 + 46, bedT - 12, 34, 16, P.dim, 0.4);

  fig(2600, bedT, S2_MG, lieOn(t, 12), { rank: 'C', lw: 4.2, flip: -1,
                                         contact: false, col: P.ink });

  var sx = S2_ST[4];
  g.save();
  g.globalAlpha = 0.7; g.strokeStyle = P.dim; g.lineWidth = camPx(LW.D);
  g.lineCap = 'round'; g.beginPath();
  g.moveTo(sx - 54, 669); g.lineTo(sx + 34, 669);
  g.moveTo(sx - 50, 669); g.lineTo(sx - 50, 588);
  g.moveTo(sx - 48, 669); g.lineTo(sx - 52, GROUND);
  g.moveTo(sx + 28, 669); g.lineTo(sx + 32, GROUND);
  g.stroke();
  g.restore();

  var q = POSE.sit(t, 7, { seat: 0.28, feet: 0.30, look: 0.22 });
  var gp = grip(sx, GROUND, S2_MG, 1, 2346, bedT - 3);
  vec(q, 'handR', gp[0], gp[1]);
  q.shoulderL = 0.62; q.elbowL = 1.05;
  q.headTilt = 0.20 + 0.05 * Math.sin(t * 0.21);
  q.spine = 0.06;
  fig(sx, GROUND, S2_MG, q, { rank: 'A', col: P.ink });
}

S[2] = function(t, d){
  var i, x;
  bg();
  CAM.reset();
  CAM.frame(t, S2_CAM);
  CAM.breath(t, 0.8);
  CAM.begin();

  g.save();
  g.globalAlpha = 0.15; g.strokeStyle = P.dim; g.lineWidth = camPx(2.4);
  g.lineCap = 'round'; g.beginPath();
  g.moveTo(-600, 300); g.lineTo(3300, 300);
  for (i = 0; i < 11; i++){ x = -400 + i * 380; g.moveTo(x, 300); g.lineTo(x, ground(DEPTH.MB)); }
  g.stroke();
  g.restore();
  groundLine(ground(DEPTH.MB), { alpha: 0.30, lw: 2, x0: -600, x1: 3300 });

  for (i = 0; i < 5; i++)
    doorway(S2_ST[i] + 250, ground(DEPTH.MB), 150, 236,
            { depth: DEPTH.MB, col: P.dim, lw: LW.D, thick: 13 });

  groundLine(GROUND, { alpha: 0.85, x0: -600, x1: 3300 });

  s2Welder(t);
  s2Father(t);
  s2Teacher(t);
  s2Researcher(t);
  s2Bedside(t);

  g.save();
  g.globalAlpha = 0.12; g.strokeStyle = P.dim; g.lineWidth = camPx(LW.C);
  g.beginPath(); g.moveTo(-600, 862); g.lineTo(3300, 862); g.stroke();
  g.restore();

  s2Warm(t);
  CAM.end();
};

/* ==========================================================================
   SCENE 03 — WHAT THIS IS, AND WHAT IT IS NOT
   No type. The guardrail is the picture: two people, identical in height,
   weight and stance, on one deck — and the failure is underneath both.
   ========================================================================== */

var S3_X0 = 200, S3_X1 = 1720, S3_N = 8, S3_PAN = 190;
var S3_DECK = GROUND, S3_UND = GROUND + 24, S3_BOT = 910;
var S3_CAM_A = [
  [0,     0,  52, 1.02],
  [10,    0,  52, 1.07],
  [13, -480, 400, 2.25],
  [23.5, 420, 400, 2.25, EASE.linear],
  [26,     0, 400, 2.25],
  [31.9, -26, 406, 2.32]
];
var S3_CAM_B = [
  [31.9,  0, 44, 1.06],
  [40,    0, 60, 1.10]
];
var S3_WARM = [0, 0, 0, 0, 0, 0, 0, 0];

function s3Sag(t, x){
  var s = 12 * ease(seg(t, 28, 33.5));
  var u = clamp((x - S3_X0) / (S3_X1 - S3_X0), 0, 1);
  return s * 4 * u * (1 - u);
}
function s3Node(i){ return S3_X0 + i * S3_PAN; }

function s3Truss(t){
  var i, x, y, rv, a, bx, by, cx, cy;
  g.save();
  g.strokeStyle = P.dim; g.lineCap = 'round'; g.lineJoin = 'round';

  var gr = clamp((t - 13) / 4.5, 0, 1);
  if (gr > 0){
    var xEnd = lerp(S3_X0, S3_X1, gr);
    g.globalAlpha = 0.8; g.lineWidth = camPx(LW.C);
    g.beginPath();
    for (i = 0; i <= 40; i++){
      x = lerp(S3_X0, xEnd, i / 40); y = S3_BOT + s3Sag(t, x);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }

  g.globalAlpha = 0.8; g.lineWidth = camPx(LW.D);
  g.beginPath();
  for (i = 0; i <= S3_N; i++){
    rv = clamp((t - (13.4 + i * 1.0)) / 0.35, 0, 1);
    if (rv <= 0) continue;
    x = s3Node(i); a = s3Sag(t, x);
    g.moveTo(x, S3_BOT + a);
    g.lineTo(x, lerp(S3_BOT + a, S3_UND + a, EASE.out(rv)));
  }
  g.stroke();

  g.lineWidth = camPx(LW.C); g.globalAlpha = 0.75;
  g.beginPath();
  for (i = 0; i < S3_N; i++){
    if (i === 3 || i === 4) continue;
    rv = clamp((t - (14.0 + i * 1.05)) / 0.4, 0, 1);
    if (rv <= 0) continue;
    bx = s3Node(i); cx = s3Node(i + 1);
    if (i % 2 === 0){ by = S3_BOT + s3Sag(t, bx); cy = S3_UND + s3Sag(t, cx); }
    else            { by = S3_UND + s3Sag(t, bx); cy = S3_BOT + s3Sag(t, cx); }
    g.moveTo(bx, by);
    g.lineTo(lerp(bx, cx, EASE.out(rv)), lerp(by, cy, EASE.out(rv)));
  }
  g.stroke();

  rv = clamp((t - 24) / 3.0, 0, 1);
  if (rv > 0){
    g.globalAlpha = 0.55; g.lineWidth = camPx(2.0);
    g.setLineDash([13, 11]);
    g.beginPath();
    for (i = 3; i <= 4; i++){
      bx = s3Node(i); cx = s3Node(i + 1);
      if (i % 2 === 0){ by = S3_BOT + s3Sag(t, bx); cy = S3_UND + s3Sag(t, cx); }
      else            { by = S3_UND + s3Sag(t, bx); cy = S3_BOT + s3Sag(t, cx); }
      g.moveTo(bx, by);
      g.lineTo(lerp(bx, cx, EASE.out(rv)), lerp(by, cy, EASE.out(rv)));
    }
    g.stroke();
    g.setLineDash([]);
  }
  g.restore();
}

function s3Deck(t){
  var i, x;
  g.save();
  g.strokeStyle = P.dim; g.lineCap = 'round'; g.lineJoin = 'round';
  g.globalAlpha = 0.30; g.lineWidth = camPx(LW.D);
  g.beginPath();
  for (i = 0; i <= 44; i++){ x = lerp(-300, 2220, i / 44);
    if (i === 0) g.moveTo(x, 636 + s3Sag(t, x)); else g.lineTo(x, 636 + s3Sag(t, x)); }
  for (i = 0; i <= S3_N; i++){ x = s3Node(i);
    g.moveTo(x, 636 + s3Sag(t, x)); g.lineTo(x, S3_DECK + s3Sag(t, x)); }
  g.stroke();
  g.globalAlpha = 0.9; g.lineWidth = camPx(LW.C);
  g.beginPath();
  for (i = 0; i <= 44; i++){ x = lerp(-300, 2220, i / 44);
    if (i === 0) g.moveTo(x, S3_UND + s3Sag(t, x)); else g.lineTo(x, S3_UND + s3Sag(t, x)); }
  g.stroke();
  g.restore();
  groundLine(GROUND, { alpha: 0.9 });
}

S[3] = function(t, d){
  bg();
  CAM.reset();
  CAM.frame(t, t < 31.9 ? S3_CAM_A : S3_CAM_B);
  CAM.breath(t, 0.55);
  CAM.begin();

  groundLine(HORIZON, { alpha: 0.13, lw: 2 });
  g.save();
  g.globalAlpha = 0.10; g.strokeStyle = P.dim; g.lineWidth = camPx(2);
  g.beginPath(); g.moveTo(OVER_L, 1030); g.lineTo(OVER_R, 1030); g.stroke();
  g.restore();

  s3Truss(t);
  s3Deck(t);

  var mx = lerp(-160, 880, EASE.outCubic(seg(t, 0.5, 7.6)));
  var wx = lerp(2100, 1090, EASE.outCubic(seg(t, 0.9, 8.0)));
  var adj = clamp(seg(t, 34.4, 35.4), 0, 1) * (1 - clamp(seg(t, 37.6, 38.6), 0, 1));
  var lookDown = clamp(seg(t, 32.2, 33.2), 0, 1) * (1 - clamp(seg(t, 36.6, 37.6), 0, 1));

  var mset = clamp(seg(t, 6.9, 7.9), 0, 1);
  var mw = POSE.walkAt(mx + 160, 0, FIG_H, { rate: 1 });
  var ms = POSE.stand(t, 21, { look: 0.16, stance: 1 + 0.22 * adj });
  var mp = mset < 1 ? mix(mw, ms, EASE.inOut(mset)) : ms;
  mp.headTilt += 0.30 * lookDown;
  mp.comX += 0.02 * adj;
  fig(mx, S3_DECK + s3Sag(t, mx), FIG_H, mp, { rank: 'B', col: P.ink });

  var wset = clamp(seg(t, 7.3, 8.3), 0, 1);
  var ww = POSE.walkAt(2100 - wx, 0, FIG_H, { rate: 1 });
  var ws = POSE.stand(t, 34, { look: 0.16, stance: 1 + 0.22 * adj });
  var wp = wset < 1 ? mix(ww, ws, EASE.inOut(wset)) : ws;
  wp.headTilt += 0.30 * lookDown;
  wp.comX += 0.02 * adj;
  fig(wx, S3_DECK + s3Sag(t, wx), FIG_H, wp, { rank: 'B', flip: -1, col: P.ink });

  var k = ease(seg(t, 27.2, 31.5));
  var nx = s3Node(4);
  S3_WARM[0] = s3Node(3) - 10; S3_WARM[1] = GROUND;
  S3_WARM[2] = s3Node(3);      S3_WARM[3] = GROUND;
  S3_WARM[4] = nx;             S3_WARM[5] = lerp(GROUND, S3_BOT + s3Sag(t, nx), k);
  S3_WARM[6] = s3Node(5);      S3_WARM[7] = GROUND;
  warmLine(S3_WARM);

  CAM.end();
};

})();
