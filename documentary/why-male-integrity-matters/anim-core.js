/* ==========================================================================
   VIRDIGNITY — ANIMATION CORE
   "Why Male Integrity Matters". Drop this in place of the old fig/walker/ground
   block. Everything below is a pure function of (t, index): no Math.random, no
   accumulated state, no per-frame allocation in a draw path. Scrubbing is
   frame-exact by construction.

   Assumes in scope: g, W, H, P, bg, line, rect, circle, label, serif, TXT,
   lerp, clamp, ease, seg.

   TWO COORDINATE SPACES, AND ONLY TWO.
     CANVAS  — what fig(), CAM and every environment primitive take. y is DOWN.
     POSE    — figure-local. Origin at the root (between the feet, on the
               ground). u = forward (+ = the way the figure faces, before flip),
               v = UP. Pose vector targets are FRACTIONS OF h in this space.
               grip() converts canvas -> pose. It is the only conversion you
               ever need.

   ANGLES. Radians from straight-down, positive rotating toward +u (forward).
   0 = hanging / standing. PI/2 = pointing forward. PI = straight up.
   ========================================================================== */

/* ==========================================================================
   1 · STAGING GRID
   One grid. No scene invents a height, a baseline or a horizon.
   ========================================================================== */

var HORIZON  = 440;               // eye line. vanishing line. camera zoom pivot.
var GROUND   = 760;               // canonical midground baseline (MG feet)
var FIG_H    = 324;               // canonical midground figure height (H*0.30)
var BAND_Y   = 912;               // opaque subtitle burn band. HARD FLOOR.
var FLOOR_B  = 890;               // lowest permitted contact point
var TYPE_MAX = 866;               // no label()/serif() baseline below this
var HUD_Y    = 72;                // scene chip + timecode strip. keep clear.
var SAFE_L   = 96,  SAFE_R = 1824;  // title-safe: all type inside
var ACT_L    = 48,  ACT_R  = 1872;  // action-safe: all subjects inside
var OVER_L   = -300, OVER_R = 2220; // overscan world bounds for z<1 / panning

// The scale ladder. baseline = HORIZON + 320*s, height = FIG_H*s, which makes
// every head-top land on the horizon (435..439) at every depth. That single
// invariant is what turns "different sizes" into "different distances".
var STEP  = { FG:1.30, MG:1.00, MB:0.72, BG:0.52, FAR:0.36, INSET:0.22 };
// ...and the depth value that produces each one. Use these names, not numbers.
var DEPTH = { FG:-1, MG:0, MB:0.4375, BG:0.75, FAR:1 };
var LADDER = [DEPTH.FG, DEPTH.MG, DEPTH.MB, DEPTH.BG, DEPTH.FAR];

// depth d: 0 = midground (the acting plane), 1 = far, -1 = foreground.
function scaleAt(d){
  d = clamp(d, -1, 1);
  return d <= 0 ? lerp(1.00, STEP.FG, -d) : lerp(1.00, STEP.FAR, d);
}
function ground(d){ return HORIZON + 320 * scaleAt(d === undefined ? 0 : d); }
function figH(d){   return FIG_H  * scaleAt(d === undefined ? 0 : d); }

// Atmospheric perspective: distant things are lighter AND thinner. Never one
// without the other — varying size alone is what reads as a rendering error.
// Both curves are anchored so the acting plane (d=0) is full strength.
function depthAlpha(d){
  var s = scaleAt(d);
  if (s >= 1) return 1;
  return clamp(0.28 + 0.72 * Math.pow((s - STEP.FAR) / 0.64, 1.3), 0.2, 1);
}
function depthWeight(d){
  var s = scaleAt(d);
  if (s >= 1) return lerp(1.00, 1.45, clamp((s - 1) / 0.30, 0, 1));
  return clamp(lerp(0.50, 1.00, (s - STEP.FAR) / 0.64), 0.4, 1.5);
}
// Nearest sanctioned ladder step. Crowds snap to these so figures genuinely
// share planes instead of each inventing its own distance.
function snapDepth(d){
  var best = LADDER[1], bd = 1e9, k, dd;
  for (k = 0; k < LADDER.length; k++){ dd = Math.abs(d - LADDER[k]); if (dd < bd){ bd = dd; best = LADDER[k]; } }
  return best;
}

/* ==========================================================================
   2 · MATH, NOISE, EASING, KEYFRAMES
   ========================================================================== */

var TAU = Math.PI * 2;
var EMPTY = {};   // shared frozen-by-convention default options object

function imul32(a, b){                 // exact 32-bit multiply, ES5-safe
  var ah = (a >>> 16) & 0xffff, al = a & 0xffff,
      bh = (b >>> 16) & 0xffff, bl = b & 0xffff;
  return ((al * bl) + ((((ah * bl + al * bh) & 0xffff) << 16) >>> 0)) | 0;
}
function hash32(i){
  var x = imul32(i | 0, 0x9E3779B1);
  x ^= x >>> 15; x = imul32(x, 0x85EBCA77);
  x ^= x >>> 13; x = imul32(x, 0xC2B2AE3D);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
function nz1(i){ return hash32(i | 0); }                      // 0..1
function nz2(i, j){ return hash32(((i | 0) * 73856093) ^ ((j | 0) * 19349663)); }
function nzs(i){ return nz1(i) * 2 - 1; }                     // -1..1
// Golden-angle decorrelator. Phase-offset figure i by this and no two figures
// in a crowd ever land in step.
function decor(i){ return (i | 0) * 2.39996; }

var EASE = {
  linear:  function(t){ return t; },
  in:      function(t){ return t * t; },
  out:     function(t){ return 1 - (1 - t) * (1 - t); },
  inOut:   function(t){ return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2; },
  inCubic: function(t){ return t*t*t; },
  outCubic:function(t){ var u = 1 - t; return 1 - u*u*u; },
  // dips backwards before it goes. Put this on anything deliberate.
  anticipate: function(t){ var s = 1.9; return t*t*((s + 1)*t - s); },
  // arrives past the mark and comes back. Weight, not bounce.
  overshoot:  function(t){ var s = 1.45, u = t - 1; return u*u*((s + 1)*u + s) + 1; },
  // decaying oscillation. damping ~4 loose, ~9 tight, ~14 barely moves.
  spring: function(t, damping){
    if (t >= 1) return 1;
    var k = damping === undefined ? 9 : damping;
    return 1 - Math.exp(-k * t) * Math.cos(t * TAU * 3.2);
  },
  // holds the outgoing value for the whole segment, then steps. Stillness is
  // a valid performance; this is how you author it inside a track().
  hold: function(t){ return t >= 1 ? 1 : 0; }
};

// A settle: add this to any joint angle on arrival. tau = seconds since arrival.
function settle(tau, amp, damping){
  if (tau < 0) return 0;
  var k = damping === undefined ? 9 : damping;
  return (amp === undefined ? 0.03 : amp) * Math.exp(-k * tau) * Math.sin(TAU * 3.2 * tau);
}

// 1 while t is inside [a,b], 0 outside. For gating a beat.
function within(t, a, b){ return (t >= a && t < b) ? 1 : 0; }
// 0..1 across a beat that starts at `start` and lasts `dur`.
function beat(t, start, dur){ return clamp((t - start) / dur, 0, 1); }

/* Keyframe track. keys = [[time, value], [time, value, easeFn], ...]
   Times must ascend. The ease on key i governs the segment i -> i+1.
   Clamps outside the range, so a track is safe at any t including scrub. */
function track(keys, t){
  var n = keys.length, i, a, b, u, fn;
  if (!n) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[n-1][0]) return keys[n-1][1];
  for (i = 0; i < n - 1; i++){
    a = keys[i]; b = keys[i+1];
    if (t < b[0]){
      u = (t - a[0]) / (b[0] - a[0]);
      fn = a[2] || EASE.inOut;
      return lerp(a[1], b[1], fn(u));
    }
  }
  return keys[n-1][1];
}

/* Same shape, but returns the index of the key you are currently sitting on,
   and how long you have been there. For "hold 0.5s then move" logic. */
function trackPhase(keys, t){
  var i;
  for (i = keys.length - 1; i >= 0; i--) if (t >= keys[i][0]) return i;
  return 0;
}

/* ==========================================================================
   3 · TWO-BONE IK
   Solved in POSE space (u forward, v up). One sqrt per joint, no allocation.
   ========================================================================== */

var BEND = { KNEE: 1, ELBOW: -1 };   // knee bulges forward, elbow back and down

var _ik = [0, 0];   // scratch: solved joint position
/* Places the middle joint of a two-bone chain from (ax,av) to (bx,bv).
   Writes into out[0],out[1]. Never lets the chain lock straight — a chain at
   exactly l1+l2 pops on the frame it crosses. */
function ik2(au, av, bu, bv, l1, l2, dir, out){
  var du = bu - au, dv = bv - av;
  var d  = Math.sqrt(du*du + dv*dv);
  if (d < 1e-4) d = 1e-4;
  var dm = Math.min(d, (l1 + l2) * 0.999);
  var a  = (l1*l1 - l2*l2 + dm*dm) / (2 * dm);
  var hh = Math.sqrt(Math.max(0, l1*l1 - a*a));
  var uu = du / d, uv = dv / d;
  out[0] = au + uu*a - uv*hh*dir;
  out[1] = av + uv*a + uu*hh*dir;
}

/* The authoring form. Give it a shoulder (or hip) and a target in POSE space,
   get back the two angles in the pose convention so you can drop them straight
   into pose.shoulderR / pose.elbowR.
   Returns a reused object: {upper, lower, reach} where `reach` is 0..1 (1 = at
   full extension, which is your cue that the target is too far away). */
var _reach = { upper: 0, lower: 0, reach: 0, u: 0, v: 0 };
function reachIK(su, sv, tu, tv, upperLen, lowerLen, dir){
  ik2(su, sv, tu, tv, upperLen, lowerLen, dir === undefined ? BEND.ELBOW : dir, _ik);
  var j0 = _ik[0] - su,  j1 = _ik[1] - sv;
  var k0 = tu - _ik[0],  k1 = tv - _ik[1];
  // angle from straight-down, positive toward +u:  atan2(u, -v)
  var up = Math.atan2(j0, -j1);
  var lo = Math.atan2(k0, -k1);
  var du = tu - su, dv = tv - sv;
  _reach.upper = up;
  _reach.lower = lo - up;                       // flexion, relative to the upper
  _reach.reach = clamp(Math.sqrt(du*du + dv*dv) / (upperLen + lowerLen), 0, 1);
  _reach.u = _ik[0]; _reach.v = _ik[1];
  return _reach;
}

/* Canvas point -> POSE-space fraction of h. The one conversion scene authors
   need: "put his hand on the beam at (bx, by)".
   Returns a pooled 2-vector, so eight consecutive calls are safe to hold at
   once (both hands of four figures). Pass `out` if you need more. */
var _GP = [], _GPI = 0;
(function(){ for (var i = 0; i < 8; i++) _GP.push([0, 0]); })();
function _gv(out){ return out || _GP[_GPI++ % 8]; }
function grip(x, y, h, flip, wx, wy, out){
  out = _gv(out);
  out[0] = ((wx - x) / h) * (flip || 1);
  out[1] =  (y - wy) / h;
  return out;
}
/* And back again, for drawing a prop where a joint ended up. */
function unGrip(x, y, h, flip, u, v, out){
  out = _gv(out);
  out[0] = x + u * h * (flip || 1);
  out[1] = y - v * h;
  return out;
}

/* ==========================================================================
   4 · PROPORTIONS
   Fractions of h, heights measured UP from the sole. 6.67 heads: the real
   adult canon is 7.5, compressed so the head survives the FAR step (a 0.36
   figure still has a 35px head on canvas).
   ========================================================================== */

var B = {
  headR:      0.075,
  headTop:    1.000,
  chin:       0.850,
  shoulderV:  0.820,
  sternumV:   0.650,
  hipV:       0.520,   // anatomical hip joint, leg straight and vertical
  hipStand:   0.512,   // authored standing hip. ~16 deg of knee flexion, so the
                       // knee is visibly a knee and the chain never locks.
  kneeV:      0.285,
  ankleV:     0.045,
  neck:       0.030,
  lumbar:     0.130,   // hip -> sternum
  thoracic:   0.170,   // sternum -> shoulder line
  shoulderHW: 0.090,   // MUST exceed headR. This is what stops raised arms
                       // being drawn straight through the skull.
  hipHW:      0.055,
  upperArm:   0.190,
  foreArm:    0.150,
  hand:       0.055,
  handR:      0.022,
  thigh:      0.235,
  shin:       0.240,   // thigh + shin = 0.475 = hipV - ankleV, exactly
  footFwd:    0.090,
  footBack:   0.025,
  stanceHW:   0.055,   // half of 0.110, matching hip width
  turnR:      0.130,   // head lateral swing radius
  lw:         0.030
};
var LEG_CHAIN = B.thigh + B.shin;
var ARM_CHAIN = B.upperArm + B.foreArm;

// Child variant. 0.72 of adult height, head-heavy and short-legged so it reads
// as a child rather than as a distant adult.
var CHILD = { scale: 0.72, headR: 0.088, hipStand: 0.490, thigh: 0.220, shin: 0.225,
              step: 0.36, cadence: 1.20 };

// Line weight by RANK, never derived from size. Deriving weight from height is
// what made one figure fat-limbed and another a hairline.
var LW = { A: 7.0, B: 5.0, C: 4.0, D: 2.5, E: 2.0, GROUND: 3.0, WARM: 3.0 };

/* ==========================================================================
   5 · POSE MODEL
   A pose is a plain object of joint angles. Every field has a default, so a
   partial pose is legal: {spine: 0.3} is a complete, drawable pose.
   ========================================================================== */

var POSE_NUM = [
  'spine','chest','breath','neck','headTurn','headTilt',
  'shoulderL','shoulderR','elbowL','elbowR','wristL','wristR',
  'hipL','hipR','kneeL','kneeR','ankleL','ankleR',
  'comX','comY','rootDx','hipDrop','stance','shoulderRound','rootRot','hipH'
];
var POSE_VEC = ['handL','handR','footL','footR'];

var POSE_DEF = {
  spine: 0.035,          // 2 deg forward. Nobody stands at exactly vertical.
  chest: 0,              // additional thoracic bend (rounding)
  breath: 0,             // sternum rise, fraction of h (see POSE.breathe)
  neck: 1,               // neck length multiplier. <1 = head sinking under load
  headTurn: 0,           // -0.35..0.35. THE primary acting channel.
  headTilt: 0,           // + = chin down. fatigue, concentration, grief.
  shoulderL: -0.03, shoulderR: -0.03,
  elbowL: 0.24, elbowR: 0.24,     // 14 deg. A straight arm is the robot tell.
  wristL: 0, wristR: 0,
  hipL: 0.05, hipR: -0.05,
  kneeL: 0.10, kneeR: 0.10,
  ankleL: 0, ankleR: 0,           // foot pitch from HORIZONTAL, + = toe up
  comX: 0, comY: 0,               // pelvis offset, fractions of h, +v = up
  rootDx: 0,                      // whole-figure drift, fractions of h
  hipDrop: 0,                     // pelvic list, + drops the LEFT hip
  stance: 1,                      // stance width multiplier
  shoulderRound: 0,               // + narrows the shoulder line (chest closing)
  rootRot: 0,                     // whole-figure rotation about the pelvis
  hipH: B.hipStand,               // authored hip height. The rig lowers it if
                                  // the legs cannot otherwise reach the ground.
  handL: null, handR: null,       // [u,v] IK targets. null = use FK angles.
  footL: null, footR: null
};

// Pool. Builders return a pooled pose, valid until 32 more are built — draw or
// copy before then. Never store a pose across frames.
var POOL = [], POOL_I = 0, POOL_N = 32;
(function(){
  var i, j, p;
  for (i = 0; i < POOL_N; i++){
    p = {};
    for (j = 0; j < POSE_NUM.length; j++) p[POSE_NUM[j]] = POSE_DEF[POSE_NUM[j]];
    for (j = 0; j < POSE_VEC.length; j++){ p[POSE_VEC[j]] = null; p['_' + POSE_VEC[j]] = [0, 0]; }
    POOL.push(p);
  }
})();
function pnew(out){
  var p = out || POOL[POOL_I++ % POOL_N], i, k;
  for (i = 0; i < POSE_NUM.length; i++){ k = POSE_NUM[i]; p[k] = POSE_DEF[k]; }
  for (i = 0; i < POSE_VEC.length; i++) p[POSE_VEC[i]] = null;
  return p;
}
/* Set a vector channel without allocating. vec(p,'handR', u, v). */
function vec(p, key, u, v){
  var a = p['_' + key] || (p['_' + key] = [0, 0]);
  a[0] = u; a[1] = v; p[key] = a;
  return p;
}
function copyPose(src, out){
  var p = out || POOL[POOL_I++ % POOL_N], i, k, a;
  for (i = 0; i < POSE_NUM.length; i++){ k = POSE_NUM[i]; p[k] = src[k] === undefined ? POSE_DEF[k] : src[k]; }
  for (i = 0; i < POSE_VEC.length; i++){
    k = POSE_VEC[i]; a = src[k];
    if (a) vec(p, k, a[0], a[1]); else p[k] = null;
  }
  return p;
}
function pget(p, k){ var v = p[k]; return v === undefined ? POSE_DEF[k] : v; }

/* Interpolate every joint. Vector targets lerp when both sides have one and
   cross over at t=0.5 when only one does. */
function mix(a, b, t, out){
  var p = pnew(out), i, k, va, vb;
  for (i = 0; i < POSE_NUM.length; i++){ k = POSE_NUM[i]; p[k] = lerp(pget(a,k), pget(b,k), t); }
  for (i = 0; i < POSE_VEC.length; i++){
    k = POSE_VEC[i]; va = a[k]; vb = b[k];
    if (va && vb)      vec(p, k, lerp(va[0], vb[0], t), lerp(va[1], vb[1], t));
    else if (va)       { if (t < 0.5) vec(p, k, va[0], va[1]); else p[k] = null; }
    else if (vb)       { if (t >= 0.5) vec(p, k, vb[0], vb[1]); else p[k] = null; }
    else p[k] = null;
  }
  return p;
}
/* Layer a delta on top, in place. add(POSE.stand(t,i), POSE.breathe(t)).
   Only the numeric channels present on `d` are touched, and hipH/neck/stance
   are treated as multiplicative so a delta can compress the neck under load. */
var MULT_KEYS = { neck: 1, stance: 1 };
function add(p, d){
  var i, k, v;
  for (i = 0; i < POSE_NUM.length; i++){
    k = POSE_NUM[i]; v = d[k];
    if (v === undefined || v === POSE_DEF[k]) continue;
    if (MULT_KEYS[k]) p[k] = pget(p, k) * v;
    else              p[k] = pget(p, k) + v;
  }
  for (i = 0; i < POSE_VEC.length; i++){ k = POSE_VEC[i]; if (d[k]) vec(p, k, d[k][0], d[k][1]); }
  return p;
}

/* ==========================================================================
   6 · GAIT
   The one thing that makes a stick figure walk instead of skate: during
   stance the ankle does not move in world space. The pelvis travels past it.
   ========================================================================== */

var GAIT = {
  cycle: 1.05,     // seconds per full cycle (two steps)
  step:  0.28,     // half-stride, fractions of h
  duty:  0.62,     // fraction of the cycle each foot is planted
  lift:  0.062,    // toe clearance at mid-swing (=65 deg of swing-knee flexion)
  heel:  0.314,    // +18 deg at heel strike
  toe:  -0.611     // -35 deg at toe off
};
// Body speed in px/s for a figure of height h. Use this and the feet cannot
// slide, because position and phase come from the same number.
function walkSpeed(h, rate){ return (2 * GAIT.step * h) / (GAIT.cycle / (rate || 1)); }
// Phase derived from distance travelled. This is the API that kills sliding.
function walkPhase(x0, x, h, rate){
  var per = walkSpeed(h, rate) * (GAIT.cycle / (rate || 1));
  var p = (x - x0) / per;
  return p - Math.floor(p);
}

/* A pitched foot is not a flat foot lifted: it pivots on whichever end is
   down. These two terms are what stop a toe-off from being drawn 14px through
   the floor, and what make the heel stay put while the shin rocks over it. */
// Ankle height that puts the lowest point of the sole exactly on the ground.
function soleDrop(pitch){
  var c = Math.cos(pitch), s = Math.sin(pitch);
  return Math.max(B.footBack * s + B.ankleV * c, -B.footFwd * s + B.ankleV * c);
}
// Ankle offset that keeps the down-end of the foot world-fixed through the roll.
function rollU(pitch){
  var c = Math.cos(pitch), s = Math.sin(pitch);
  return pitch >= 0 ? -B.footBack * (1 - c) - B.ankleV * s
                    :  B.footFwd  * (1 - c) - B.ankleV * s;
}
/* Set a foot target that is guaranteed to sit on a surface, whatever its
   pitch. foot(pose,'R', u, pitch, surfaceV). Use it for every planted foot. */
function foot(p, side, u, pitch, surfaceV){
  pitch = pitch || 0;
  vec(p, side === 'L' ? 'footL' : 'footR',
      u + rollU(pitch), (surfaceV || 0) + soleDrop(pitch));
  p[side === 'L' ? 'ankleL' : 'ankleR'] = pitch;
  return p;
}

// Local ankle u for one foot at its own cycle phase pf.
function _ankleU(pf, E, stepPx, D){
  if (pf < D) return E * (1 - 2 * pf / D);                 // planted: linear drift back
  var w = (pf - D) / (1 - D);
  // Cycloid in WORLD space minus the body's own travel, so world velocity is
  // zero at both toe-off and touchdown. A plain eased arc lands the foot
  // moving forward, which is exactly what reads as skating.
  return -E + 2 * stepPx * (w - Math.sin(TAU * w) / TAU) - 2 * stepPx * (1 - D) * w;
}
function _ankleV(pf, D, pitch){
  if (pf < D) return soleDrop(pitch);
  var w = (pf - D) / (1 - D);
  return soleDrop(pitch) + GAIT.lift * Math.pow(Math.sin(Math.PI * w), 1.2);
}
function _footPitch(pf, D){
  if (pf < 0.10) return lerp(GAIT.heel, 0, EASE.out(pf / 0.10));           // heel strike -> flat
  if (pf < 0.40) return 0;                                                 // flat
  if (pf < D)    return lerp(0, GAIT.toe, EASE.in((pf - 0.40) / (D - 0.40)));
  return lerp(GAIT.toe, GAIT.heel, EASE.inOut((pf - D) / (1 - D)));        // swing recovery
}

/* POSE.walk(phase, opts)
   phase 0..1. opts: {rate, step, lean, load, arms:false, child:true, i} */
function _walk(phase, o, out){
  o = o || EMPTY;
  var p = phase - Math.floor(phase);
  var D = GAIT.duty;
  var stepPx = o.step === undefined ? GAIT.step : o.step;
  var E = stepPx * D;
  var pR = p, pL = p + 0.5; pL -= Math.floor(pL);      // half-cycle offset. THE line.

  var q = pnew(out);
  var kR = _footPitch(pR, D), kL = _footPitch(pL, D);
  vec(q, 'footR', _ankleU(pR, E, stepPx, D) + rollU(kR), _ankleV(pR, D, kR));
  vec(q, 'footL', _ankleU(pL, E, stepPx, D) + rollU(kL), _ankleV(pL, D, kL));
  q.ankleR = kR;
  q.ankleL = kL;

  // The pelvis rides as high as the legs allow, and no higher. Grounding then
  // cannot be got wrong, and the bob comes out phase-correct for free: lowest
  // at double support, highest at passing.
  q.hipH = B.hipStand - 0.006 * Math.max(0, Math.sin(TAU * (p - 0.02)));
  q.spine = 0.052 + (o.lean || 0);                     // 3 deg forward
  q.hipDrop = 0.008 * Math.sin(TAU * (p - 0.12));      // swing-side pelvic list

  if (o.arms !== false){
    // Contralateral: each arm swings opposite the same-side leg. Asymmetric,
    // because the arm goes further back than forward.
    var sR = Math.sin(TAU * pL), sL = Math.sin(TAU * pR);
    q.shoulderR = -0.035 + (sR > 0 ? 0.31 * sR : 0.38 * sR);
    q.shoulderL = -0.035 + (sL > 0 ? 0.31 * sL : 0.38 * sL);
    q.elbowR = 0.349 + sR * (sR > 0 ? 0.349 : 0.140);
    q.elbowL = 0.349 + sL * (sL > 0 ? 0.349 : 0.140);
  }
  // Head bob is 45% of the pelvis bob and lags it by 0.06 of a cycle.
  q.headTilt = 0.04 + 0.03 * Math.sin(TAU * (p - 0.06));
  q.breath = 0.006 * _breathCurve((phase * GAIT.cycle) / 3.2);
  return q;
}

/* ==========================================================================
   7 · POSE LIBRARY
   Each pose is a distinct silhouette, not an arm angle. Where the audits
   specify a prop contact, the pose puts a HAND at the contact point — props
   attach to hands, never to torsos.
   ========================================================================== */

// Inhale over 40% of the period, exhale over 60%. Not a sine: the asymmetry is
// what stops it reading as a machine.
function _breathCurve(u){
  u = u - Math.floor(u);
  return u < 0.4 ? ease(u / 0.4) : 1 - ease((u - 0.4) / 0.6);
}
// Weight shift, as a function of time, so callers can evaluate it at t, t-0.09
// and t-0.16 and get overlap for free.
function _shiftAt(t, i){
  var per = 4 + 3 * nz1(i * 7 + 11);
  var ph  = (t + nz1(i * 7 + 13) * per) / per;
  var k   = Math.floor(ph), f = ph - k;
  var side = (k & 1) ? 1 : -1;
  return lerp(-side, side, EASE.inOut(clamp(f / (0.5 / per), 0, 1)));
}

var POSE = {};

POSE.def = function(out){ return pnew(out); };
POSE.copy = copyPose;

/* Breathing. A delta, meant to be layered: add(POSE.stand(t,i), POSE.breathe(t)).
   Every figure in every scene, always. Three lines that touch all 20 scenes. */
POSE.breathe = function(t, o, out){
  o = o || EMPTY;
  var period = o.period || 3.6, amp = o.amp === undefined ? 0.006 : o.amp;
  var q = pnew(out);
  q.breath = amp * _breathCurve((t + (o.phase || 0)) / period);
  return q;
};

/* Standing idle with contrapposto. Weight is never 50/50 and nothing is
   symmetrical — this alone turns the crowd scenes from asterisk fields into
   people. i is the figure index: same i and t give the same man, forever. */
POSE.stand = function(t, i, o, out){
  o = o || EMPTY; i = i || 0; t = t || 0;
  var q = pnew(out);
  var w  = _shiftAt(t, i);            // -1 .. 1, which side carries the weight
  var wS = _shiftAt(t - 0.09, i);     // shoulders follow the hips
  var wH = _shiftAt(t - 0.16, i);     // head follows the shoulders
  var hw = B.stanceHW * (o.stance || 1) * (1 + 0.08 * nzs(i * 7 + 3));

  var freeR = (w + 1) / 2;            // 0 = right leg free, 1 = right leg loaded
  vec(q, 'footR',  hw + 0.03 * (1 - freeR), B.ankleV);
  vec(q, 'footL', -hw - 0.03 * freeR,       B.ankleV);
  q.kneeR = 0.10 + 0.14 * (1 - freeR);
  q.kneeL = 0.10 + 0.14 * freeR;
  q.hipDrop = -0.012 * w;             // the loaded hip sits higher
  q.hipH = B.hipStand + 0.004 * nzs(i * 7 + 4);
  q.comX = 0.010 * w;

  q.spine = 0.035 + 0.02 * nz1(i * 7 + 5);
  q.shoulderRound = 0.05 * wS;
  q.shoulderL = -0.03 - 0.05 * wS; q.shoulderR = -0.03 + 0.05 * wS;
  q.elbowL = 0.24 + 0.06 * nz1(i * 7 + 6); q.elbowR = 0.24 + 0.06 * nz1(i * 7 + 7);
  q.headTurn = (o.look === undefined ? 0 : o.look)
             + 0.06 * Math.sin(t * 0.57 + decor(i)) + 0.04 * wH;
  q.headTilt = 0.02 + 0.02 * nz1(i * 7 + 8);
  q.breath = 0.006 * _breathCurve((t + nz1(i * 7 + 9) * 3.6) / 3.6);
  return q;
};

/* Walking. Pass a phase, or use POSE.walkAt() and never think about it. */
POSE.walk = function(phase, o, out){ return _walk(phase, o, out); };
/* The one you want. Phase is derived from world x, so the feet cannot slide. */
POSE.walkAt = function(x, x0, h, o, out){
  o = o || EMPTY;
  return _walk(walkPhase(x0, x, h, o.rate), o, out);
};

/* Carrying overhead under load. strain 0..1. Both hands go on the underside of
   whatever is being carried — pass o.handL/o.handR as [u,v] (usually from
   grip() against the beam's actual sagging y, so the hands ride the sag). */
POSE.carry = function(strain, t, i, o, out){
  o = o || EMPTY; i = i || 0; t = t || 0;
  var s = clamp(strain, 0, 1);
  var q = pnew(out);
  q.hipH  = lerp(0.510, 0.470, s);
  q.kneeL = q.kneeR = lerp(0.105, 0.384, s);          // 6 -> 22 deg
  q.spine = lerp(0.035, 0.105, s);
  q.neck  = lerp(1.0, 0.60, s);                        // head sinking into the
                                                       // shoulders: the single
                                                       // strongest load cue
  var hw = B.stanceHW * lerp(1.0, 1.5, s);
  vec(q, 'footL', -hw, B.ankleV);
  vec(q, 'footR',  hw, B.ankleV);
  if (o.handL) vec(q, 'handL', o.handL[0], o.handL[1]);
  else vec(q, 'handL', -0.100, lerp(1.19, 1.08, s));
  if (o.handR) vec(q, 'handR', o.handR[0], o.handR[1]);
  else vec(q, 'handR',  0.100, lerp(1.19, 1.08, s));
  q.headTilt = 0.05 + 0.14 * s;
  // Tremor above half load, decorrelated per figure so eight men under one beam
  // are eight men and not one man drawn eight times.
  if (s > 0.5){
    var tr = 0.004 * (s - 0.5) * 2 * Math.sin(t * 22 + decor(i) * (o.sync ? 0 : 1));
    q.comX += tr; q.comY += tr * 0.5;
  }
  q.breath = 0.011 * _breathCurve(t / lerp(3.6, 1.6, s) + (o.sync ? 0 : nz1(i)));
  return q;
};

/* Sitting on a chair. Hip at seat height, thigh horizontal, shin vertical, and
   the foot FLAT ON THE GROUND — that last one is what anchors it. */
POSE.sit = function(t, i, o, out){
  o = o || EMPTY; i = i || 0; t = t || 0;
  var seat = o.seat === undefined ? 0.28 : o.seat;
  var q = pnew(out);
  q.hipH = seat;
  q.comX = -0.02;
  var fwd = o.feet === undefined ? 0.30 : o.feet;
  vec(q, 'footL', fwd - 0.03, o.footV === undefined ? B.ankleV : o.footV);
  vec(q, 'footR', fwd + 0.03, o.footV === undefined ? B.ankleV : o.footV);
  q.spine = -0.087;                       // 5 deg back
  q.shoulderL = 0.55; q.shoulderR = 0.55; // forearms down onto the thighs
  q.elbowL = q.elbowR = 0.95;
  q.headTurn = (o.look || 0) + 0.02 * Math.sin(t / 6 + decor(i));
  q.headTilt = 0.04;
  q.breath = 0.006 * _breathCurve((t + nz1(i * 7 + 2) * 3.6) / 3.6);
  return q;
};

/* Bench: as sit, but higher seat, feet tucked back, forearms on the thighs.
   For a pair on one bench give them different `look` values — that head-turn
   difference is the entire relationship in the shot. */
POSE.bench = function(t, i, o, out){
  o = o || EMPTY;
  var q = POSE.sit(t, i, { seat: o.seat === undefined ? 0.30 : o.seat,
                           feet: 0.16, look: o.look }, out);
  q.spine = 0.052;
  q.shoulderL = q.shoulderR = 0.72;
  q.elbowL = q.elbowR = 1.15;
  return q;
};

/* Holding an infant. The head and the bundle move as one unit while the body
   sways beneath: that is the whole performance of care.
   Returns the pose; read the bundle position back off the drawn figure with
   FIG.hand('R') so the bundle is parented to the hand, never to the torso. */
POSE.hold = function(t, i, o, out){
  o = o || EMPTY; i = i || 0; t = t || 0;
  var side = o.side === undefined ? 1 : o.side;
  var sway = 0.010 * Math.sin(TAU * 0.4 * t + decor(i));
  var q = POSE.stand(t, i, EMPTY, out);
  q.comX += sway;
  q.spine = -0.07;                              // 4 deg back, counterweight
  var bu = 0.16 * side, bv = 0.63;              // bundle centre, chest height
  vec(q, 'handR', bu + 0.02, bv - 0.03);
  vec(q, 'handL', bu - 0.11, bv + 0.02);
  q.headTilt = 0.21;                            // 12 deg down
  q.headTurn = 0.20 * side;
  q.breath = 0.006 * _breathCurve(t / 3.6);
  return q;
};

/* Welding / skilled two-handed work. phase drives the bead.
   o.tip = [u,v] the torch tip in pose space (use grip()). Both hands land on
   the torch: two hands on one prop is what reads as skill. */
POSE.work = function(phase, t, i, o, out){
  o = o || EMPTY; i = i || 0; t = t || 0;
  var q = pnew(out);
  q.hipH = 0.470;
  q.kneeL = q.kneeR = 0.42;
  q.spine = 0.384;                              // 22 deg forward
  vec(q, 'footL', -0.10 - 0.06, B.ankleV);
  vec(q, 'footR',  0.10 + 0.04, B.ankleV);
  var tu = o.tip ? o.tip[0] : 0.30, tv = o.tip ? o.tip[1] : 0.36;
  var wob = 0.006 * Math.sin(TAU * 3 * t + decor(i));   // 3 Hz micro-oscillation
  vec(q, 'handR', tu, tv + wob);
  vec(q, 'handL', tu - 0.14, tv + 0.06 + wob * 0.6);    // off hand back along the shaft
  q.headTilt = 0.52;                            // 30 deg down
  q.headTurn = 0.10;
  q.breath = 0.008 * _breathCurve(t / 2.8);
  return q;
};

/* Reaching. amount 0..1 (use 0.70 for a withheld reach — the hand that starts
   and stops is instantly legible as refusal, and it needs an elbow).
   o.target = [u,v] overrides the default forward reach. */
POSE.reach = function(amount, t, i, o, out){
  o = o || EMPTY; i = i || 0; t = t || 0;
  var a = clamp(amount, 0, 1);
  var q = POSE.stand(t, i, EMPTY, out);
  var tu = o.target ? o.target[0] : 0.34, tv = o.target ? o.target[1] : 0.66;
  // Anticipation: the hand drops before it goes.
  var anti = a < 0.22 ? -0.04 * Math.sin(Math.PI * a / 0.22) : 0;
  vec(q, 'handR', lerp(0.075, tu, EASE.out(a)), lerp(0.47, tv, EASE.out(a)) + anti);
  q.spine = 0.035 + 0.09 * a;
  q.headTurn = lerp(q.headTurn, 0.26, EASE.out(clamp(a * 1.6, 0, 1)));  // head commits first
  return q;
};

/* Teaching. The hold IS the teaching: hand rises 0.25s, holds 0.6s, drops
   0.35s, rests 0.8s. Weight on the back foot, off hand at the hip. */
var _TEACH = [[0, 0], [0.25, 1, EASE.overshoot], [0.85, 1, EASE.hold],
              [1.20, 0, EASE.inOut], [2.00, 0]];
POSE.teach = function(t, i, o, out){
  o = o || EMPTY; i = i || 0; t = t || 0;
  var lt = (t + nz1(i * 7 + 21) * 2) % 2;
  var a = track(_TEACH, lt);
  var anti = lt < 0.10 ? -0.03 * Math.sin(Math.PI * lt / 0.10) : 0;
  var q = POSE.stand(t, i, EMPTY, out);
  vec(q, 'footL', -0.075, B.ankleV);
  vec(q, 'footR',  0.14,  B.ankleV);             // front foot forward, weight back
  q.kneeL = 0.10; q.kneeR = 0.26;
  q.spine = -0.017;
  vec(q, 'handR', lerp(0.10, 0.30, a), lerp(0.50, 0.66, a) + anti);
  q.shoulderL = -0.20; q.elbowL = 0.85;          // off hand at the hip
  q.headTurn = (o.look === undefined ? 0.22 : o.look);
  q.headTilt = 0.02;
  return q;
};

/* Fatigue. f 0..1. Posture AND timing — everything slows, the breath gets
   longer, and there is a half-second hold at the bottom of the exhale. */
POSE.slump = function(f, t, i, o, out){
  o = o || EMPTY; i = i || 0; t = t || 0;
  var a = clamp(f, 0, 1);
  var q = POSE.stand(t, i, EMPTY, out);
  q.headTilt = lerp(q.headTilt, 0.384, a);              // 22 deg down
  q.headTurn *= (1 - 0.5 * a);
  q.chest = lerp(0, 0.175, a);                          // shoulders round forward
  q.shoulderRound = lerp(0, 0.9, a);
  q.spine = lerp(q.spine, 0.244, a);                    // 14 deg
  q.hipH = lerp(q.hipH, 0.492, a);
  q.kneeL = lerp(q.kneeL, 0.262, a); q.kneeR = lerp(q.kneeR, 0.262, a);
  q.elbowL = lerp(q.elbowL, 0.105, a); q.elbowR = lerp(q.elbowR, 0.105, a);
  q.shoulderL = lerp(q.shoulderL, 0.06, a); q.shoulderR = lerp(q.shoulderR, 0.06, a);
  var per = lerp(3.6, 5.2, a);
  var u = ((t + nz1(i * 7 + 9) * per) / per) % 1;
  // the sigh: hold at the bottom of the exhale
  q.breath = 0.006 * (u > 0.90 ? 0 : _breathCurve(u / 0.90));
  return q;
};

/* Queueing. Oriented idle, narrowed stance, plus the shuffle: every 5-8s a
   figure takes one small step and the step propagates BACKWARD down the line
   with a 0.35s delay per position. A queue that ripples is alive. */
POSE.queue = function(i, t, o, out){
  o = o || EMPTY;
  var dir = o.dir === undefined ? 1 : o.dir;     // + = the gate is forward
  var per = o.period || 6.5;
  var lt = t - i * 0.35 + nz1(i * 7 + 31) * 0.4; // ripple delay per position
  var n  = Math.floor(lt / per);
  var f  = clamp((lt - n * per) / 0.5, 0, 1);
  var q  = POSE.stand(t, i, { stance: 0.77, look: 0.10 * dir }, out);
  q.rootDx = dir * 0.12 * (n + EASE.inOut(f));   // one 0.12h step per period
  q.spine += 0.017 * dir;
  return q;
};

/* Lifting from the ground. phase 0..1 across the whole action:
   0.00-0.18 anticipation dip · 0.18-0.55 the pull · 0.55-0.72 the settle ·
   0.72-1.00 stood up holding. Hips lead, head arrives last. */
POSE.lift = function(phase, t, i, o, out){
  o = o || EMPTY; i = i || 0; t = t || 0;
  var p = clamp(phase, 0, 1);
  var dip  = p < 0.18 ? EASE.inOut(p / 0.18) : 1;
  var rise = clamp((p - 0.18) / 0.45, 0, 1);
  var q = pnew(out);
  var low = 0.26, high = B.hipStand - 0.02;
  q.hipH = lerp(lerp(B.hipStand, low, dip), high, EASE.out(rise))
         + settle(p - 0.63, 0.012, 11);
  q.kneeL = q.kneeR = lerp(lerp(0.11, 1.30, dip), 0.20, EASE.out(rise));
  q.spine = lerp(lerp(0.06, 0.62, dip), 0.13, EASE.out(clamp((p - 0.22) / 0.45, 0, 1)));
  vec(q, 'footL', -0.10, B.ankleV);
  vec(q, 'footR',  0.10, B.ankleV);
  var hv = lerp(lerp(0.50, 0.14, dip), 0.52, EASE.out(rise));
  vec(q, 'handL', 0.16, hv); vec(q, 'handR', 0.24, hv);
  // head arrives 0.14 of the action after the hips
  var hr = clamp((p - 0.18 - 0.14) / 0.45, 0, 1);
  q.headTilt = lerp(lerp(0.10, 0.60, dip), 0.06, EASE.out(hr));
  q.breath = 0.011 * _breathCurve(t / 2.0 + nz1(i));
  return q;
};

/* Handing an object over. phase 0..1 across 2.4s. side: +1 giver, -1 receiver.
   The receiver reacts AFTER the giver commits — a simultaneous reach is the
   tell of a machine. Read the hand back with FIG.hand() and parent the object
   to it; never draw the object on a torso.
   For a withheld reach (scene 14) pass o.withhold = 0.70: the receiver runs
   the first three beats and then stops. */
POSE.handoff = function(phase, side, t, i, o, out){
  o = o || EMPTY; i = i || 0; t = t || 0;
  var p = clamp(phase, 0, 1);
  var giver = (side === undefined ? 1 : side) >= 0;
  var mu = o.meet ? o.meet[0] : 0.42, mv = o.meet ? o.meet[1] : 0.64;
  var a, hu, hv, look;
  if (giver){
    look = clamp(p / 0.125, 0, 1);
    a = p < 0.125 ? -0.30 * EASE.inOut(p / 0.125)                    // pull back
      : p < 0.50  ? lerp(-0.30, 1, EASE.out((p - 0.125) / 0.375))    // extend
      : p < 0.75  ? 1                                                // HOLD
      : lerp(1, 0, EASE.inOut((p - 0.75) / 0.25)) + settle(p - 0.95, 0.10, 10);
  } else {
    look = clamp((p - 0.375) / 0.125, 0, 1);                          // reacts late
    var cap = o.withhold === undefined ? 1 : o.withhold;
    a = p < 0.375 ? 0
      : p < 0.625 ? cap * EASE.out((p - 0.375) / 0.25)
      : p < 0.75  ? cap
      : cap >= 1  ? lerp(1, 0.25, EASE.inOut((p - 0.75) / 0.25))      // draw to chest
                  : cap;                                              // withheld: hold
  }
  var q = POSE.stand(t, i, EMPTY, out);
  hu = lerp(0.075, mu, a); hv = lerp(0.47, mv, a);
  vec(q, 'handR', hu, hv);
  q.headTurn = lerp(q.headTurn, 0.28, look);
  q.headTilt = 0.02 + 0.14 * clamp(a, 0, 1);       // both heads down to the object
  q.spine = 0.035 + 0.07 * clamp(a, 0, 1);
  return q;
};

/* Kneeling — planting, striking a weld low, getting to a child's eye level.
   The trailing shin is on the ground, the lead foot flat. */
POSE.kneel = function(t, i, o, out){
  o = o || EMPTY; i = i || 0; t = t || 0;
  var q = pnew(out);
  if (o.deep){                                 // deep squat: both feet flat
    q.hipH = 0.245;
    foot(q, 'L', -0.10, 0); foot(q, 'R', 0.11, 0);
    q.spine = 0.52;
    vec(q, 'handL', 0.17, 0.22); vec(q, 'handR', 0.27, 0.19);
  } else {                                     // half-kneel: trailing shin down
    q.hipH = 0.280;
    foot(q, 'L', -0.34, -1.15);                // toe back, heel up, shin flat
    foot(q, 'R',  0.20, 0);                    // lead foot flat and forward
    q.spine = 0.30;
    vec(q, 'handL', 0.10, 0.30); vec(q, 'handR', 0.22, 0.26);
  }
  q.headTilt = o.deep ? 0.30 : 0.38;
  q.breath = 0.008 * _breathCurve((t + nz1(i)) / 3.2);
  return q;
};

/* Seated in a wheelchair: as sit, but the ankles are on a footplate, not the
   floor, and the head is turned toward whoever is pushing.
   For the PUSHER use POSE.push(): both hands IK-locked to the handles, arms
   nearly straight, shortened stride, and NO arm swing — which is exactly why
   arms need IK. */
POSE.wheel = function(t, i, o, out){
  o = o || EMPTY;
  var q = POSE.sit(t, i, { seat: 0.28, feet: 0.38, footV: 0.12, look: -0.15 }, out);
  q.shoulderL = q.shoulderR = 0.62;
  q.elbowL = q.elbowR = 1.05;                // hands on the armrests
  return q;
};
POSE.push = function(phase, t, i, o, out){
  o = o || EMPTY;
  var q = _walk(phase, { step: 0.30, arms: false }, out);
  q.spine = 0.14;                            // 8 deg forward
  var hu = o.handles ? o.handles[0] : 0.26, hv = o.handles ? o.handles[1] : 0.62;
  vec(q, 'handL', hu - 0.05, hv);
  vec(q, 'handR', hu + 0.05, hv);
  q.headTilt = 0.06;
  return q;
};

/* Lying on the back, chest rising. Scene 18 opens on this; scene 01 wakes from
   it. rootRot puts the whole figure down without breaking any joint. */
POSE.lie = function(t, i, o, out){
  o = o || EMPTY; i = i || 0; t = t || 0;
  var q = pnew(out);
  q.rootRot = -Math.PI / 2 + (o.tilt || 0);
  q.hipH = 0.10;
  q.spine = 0.10; q.chest = -0.06;
  vec(q, 'footL', -0.05, 0.44); vec(q, 'footR', 0.06, 0.47);
  q.shoulderL = 1.15; q.shoulderR = 1.25;
  q.elbowL = 0.35; q.elbowR = 0.30;
  q.headTilt = -0.18;
  q.breath = 0.011 * _breathCurve((t + nz1(i)) / 4.0);
  return q;
};

/* Waking: sit up, swing the feet down, and then TWO SECONDS OF SITTING STILL
   before standing. That pause is the whole film in one gesture, so it is a
   pose beat, not an afterthought. phase 0..1 over ~7s. */
POSE.wake = function(phase, t, i, out){
  var p = clamp(phase, 0, 1);
  if (p < 0.32) return mix(POSE.lie(t, i), POSE.sit(t, i, { seat: 0.32, feet: 0.20 }),
                           EASE.inOut(p / 0.32), out);
  if (p < 0.64) return POSE.sit(t, i, { seat: 0.32, feet: 0.20 }, out);   // the hold
  return mix(POSE.sit(t, i, { seat: 0.32, feet: 0.20 }),
             POSE.stand(t, i),
             EASE.inOut((p - 0.64) / 0.36), out);
};

/* Digging. phase 0..1 per stroke: wind-up, plant, lift, follow-through, with
   the weight shifting across it. */
POSE.dig = function(phase, t, i, o, out){
  o = o || EMPTY; i = i || 0;
  var p = phase - Math.floor(phase);
  var q = pnew(out);
  var drive = p < 0.30 ? -EASE.inOut(p / 0.30)                       // wind up (back)
            : p < 0.52 ?  lerp(-1, 1, EASE.in((p - 0.30) / 0.22))    // plant (down)
            : p < 0.78 ?  lerp(1, 0.2, EASE.out((p - 0.52) / 0.26))  // lift
            :             lerp(0.2, 0, EASE.inOut((p - 0.78) / 0.22));
  q.hipH = B.hipStand - 0.055 * clamp(drive, 0, 1) - 0.02;
  q.kneeL = q.kneeR = 0.28 + 0.30 * clamp(drive, 0, 1);
  q.spine = 0.20 + 0.34 * clamp(drive, 0, 1);
  vec(q, 'footL', -0.13, B.ankleV); vec(q, 'footR', 0.13, B.ankleV);
  var hv = lerp(0.62, 0.20, clamp(drive, 0, 1)), hu = lerp(0.14, 0.30, clamp(drive, 0, 1));
  vec(q, 'handL', hu - 0.10, hv + 0.10);
  vec(q, 'handR', hu, hv);
  q.headTilt = 0.30 + 0.22 * clamp(drive, 0, 1);
  return q;
};

/* Time-offset overlap. Evaluate the same pose builder at a per-joint delay and
   drag increases outward along every chain. No state, no allocation, and it is
   the cheapest high-value change available.
     POSE.lag(function(tt){ return POSE.teach(tt, 3); }, t)  */
var LAG = { pelvis: 0, chest: 0.045, head: 0.100, shoulder: 0.030, elbow: 0.070, hand: 0.110 };
POSE.lag = function(build, t, out){
  var base  = build(t);
  var q     = copyPose(base, out);
  var pc = build(t - LAG.chest), ph = build(t - LAG.head),
      ps = build(t - LAG.shoulder), pe = build(t - LAG.elbow), pw = build(t - LAG.hand);
  q.chest = pget(pc, 'chest'); q.spine = pget(pc, 'spine') * 0.5 + pget(base, 'spine') * 0.5;
  q.headTurn = pget(ph, 'headTurn'); q.headTilt = pget(ph, 'headTilt');
  q.shoulderL = pget(ps, 'shoulderL'); q.shoulderR = pget(ps, 'shoulderR');
  q.elbowL = pget(pe, 'elbowL'); q.elbowR = pget(pe, 'elbowR');
  if (pw.handL) vec(q, 'handL', pw.handL[0], pw.handL[1]);
  if (pw.handR) vec(q, 'handR', pw.handR[0], pw.handR[1]);
  return q;
};

/* ==========================================================================
   8 · THE RIG
   23 points, built into one reusable Float32Array. Three strokes and one fill
   per figure: ~4 paths, so ten figures cost ~40 paths a frame.
   ========================================================================== */

var J = { pelvisC:0, hipL:1, hipR:2, sternum:3, shoulderC:4, shoulderL:5, shoulderR:6,
          neckTop:7, headC:8, elbowL:9, elbowR:10, wristL:11, wristR:12, handL:13,
          handR:14, kneeL:15, kneeR:16, ankleL:17, ankleR:18, heelL:19, toeL:20,
          heelR:21, toeR:22 };
var NPT = 23;
var RIG = new Float32Array(NPT * 2);      // POSE space: u forward, v up, px
var OUT = new Float32Array(NPT * 2);      // CANVAS space
var LAST = { x:0, y:0, h:1, flip:1, pts:OUT };

function _set(i, u, v){ RIG[i*2] = u; RIG[i*2+1] = v; }
function _u(i){ return RIG[i*2]; }
function _v(i){ return RIG[i*2+1]; }

/* Highest hip that still lets a leg reach its ankle target. Deriving the hip
   height instead of authoring it is what makes ground contact impossible to
   get wrong, and it produces the walk bob for free. */
function _reachHip(hipU, au, av, chain){
  var du = au - hipU, m = chain * 0.998;
  var r = m*m - du*du;
  return av + (r > 0 ? Math.sqrt(r) : 0);
}

function buildRig(h, p, prop, noClear){
  var i;
  var headR = (prop && prop.headR || B.headR) * h;
  var thigh = (prop && prop.thigh || B.thigh) * h;
  var shin  = (prop && prop.shin  || B.shin)  * h;
  var chain = thigh + shin;

  var spine   = pget(p, 'spine');
  var chestB  = pget(p, 'chest');
  var stance  = pget(p, 'stance');
  var hipHW   = B.hipHW * h;
  var shHW    = B.shoulderHW * h * (1 - 0.09 * clamp(pget(p, 'shoulderRound'), 0, 1));

  // --- pelvis -------------------------------------------------------------
  var hipH = (prop && prop.hipStand || pget(p, 'hipH')) * h + pget(p, 'comY') * h;
  var pu   = pget(p, 'comX') * h;
  // A figure leaning forward with its hips still under its shoulders is falling
  // over, and the eye knows it. The hips go back as the chest goes forward.
  var chestOff = Math.sin(spine) * (B.lumbar + B.thoracic) * h;
  pu -= 0.35 * chestOff;

  var fL = p.footL, fR = p.footR;
  var auL, avL, auR, avR;
  if (fL){ auL = fL[0]*h; avL = fL[1]*h; }
  if (fR){ auR = fR[0]*h; avR = fR[1]*h; }
  if (fL || fR){
    var cap = 1e9;
    if (fL) cap = Math.min(cap, _reachHip(pu - hipHW, auL, avL, chain));
    if (fR) cap = Math.min(cap, _reachHip(pu + hipHW, auR, avR, chain));
    if (hipH > cap) hipH = cap;
  }
  _set(J.pelvisC, pu, hipH);

  var tilt = pget(p, 'hipDrop');            // + drops the LEFT hip
  _set(J.hipL, pu - hipHW, hipH - tilt * h);
  _set(J.hipR, pu + hipHW, hipH + tilt * h);

  // --- spine, shoulders, neck, head ---------------------------------------
  var lum = B.lumbar * h, tho = (B.thoracic + pget(p, 'breath')) * h;
  var su = pu + Math.sin(spine) * lum, sv = hipH + Math.cos(spine) * lum;
  _set(J.sternum, su, sv);
  var a2 = spine + chestB;
  var cu = su + Math.sin(a2) * tho, cv = sv + Math.cos(a2) * tho;
  _set(J.shoulderC, cu, cv);
  // Clavicles run perpendicular to the thoracic segment, so the chest tips with
  // the torso instead of staying a flat bar.
  var pxx = Math.cos(a2), pyy = -Math.sin(a2);
  _set(J.shoulderL, cu - pxx * shHW, cv - pyy * shHW);
  _set(J.shoulderR, cu + pxx * shHW, cv + pyy * shHW);

  var tiltH = pget(p, 'headTilt'), turn = pget(p, 'headTurn');
  var ha = a2 + tiltH;
  var neckL = B.neck * h * pget(p, 'neck');
  var lat = clamp(B.turnR * Math.sin(turn), -0.045, 0.045) * h;
  var nu = cu + Math.sin(ha) * neckL + pxx * lat * 0.35;
  var nv = cv + Math.cos(ha) * neckL + pyy * lat * 0.35;
  _set(J.neckTop, nu, nv);
  _set(J.headC, nu + Math.sin(ha) * headR + pxx * lat * 0.65,
                nv + Math.cos(ha) * headR + pyy * lat * 0.65);

  // --- arms ----------------------------------------------------------------
  var ua = B.upperArm * h, fa = B.foreArm * h, hn = B.hand * h;
  var hcU = _u(J.headC), hcV = _v(J.headC), hcR = headR * 1.10;
  for (i = 0; i < 2; i++){
    var L = i === 0;
    var sIdx = L ? J.shoulderL : J.shoulderR;
    var tgt  = L ? p.handL : p.handR;
    var eIdx = L ? J.elbowL : J.elbowR, wIdx = L ? J.wristL : J.wristR,
        dIdx = L ? J.handL : J.handR;
    var ox = _u(sIdx), oy = _v(sIdx);
    if (tgt){
      // Pull the wrist target back from the grip point by a hand length, so the
      // HAND lands on the prop rather than the wrist.
      var gu = tgt[0]*h, gv = tgt[1]*h;
      var dxg = gu - ox, dyg = gv - oy, dl = Math.sqrt(dxg*dxg + dyg*dyg) || 1;
      var wu = gu - dxg/dl * hn, wv = gv - dyg/dl * hn;
      _armIK(ox, oy, wu, wv, ua, fa, BEND.ELBOW, hcU, hcV, hcR);
      _set(eIdx, _ik[0], _ik[1]);
      _set(wIdx, wu, wv);
      _set(dIdx, gu, gv);
    } else {
      // Limb angles are WORLD angles from straight-down, not torso-relative, so
      // a leaning figure's arms still hang plumb and the author never has to
      // compensate for spine.  v is UP, hence the minus on the cosine.
      var sa = pget(p, L ? 'shoulderL' : 'shoulderR');
      if (!noClear) sa = _coneClear(ox, oy, sa, ua, hcU, hcV, hcR);
      var ex = ox + Math.sin(sa) * ua, ey = oy - Math.cos(sa) * ua;
      _set(eIdx, ex, ey);
      var fangle = sa + pget(p, L ? 'elbowL' : 'elbowR');
      if (!noClear) fangle = _coneClear(ex, ey, fangle, fa, hcU, hcV, hcR);
      var wx = ex + Math.sin(fangle) * fa, wy = ey - Math.cos(fangle) * fa;
      _set(wIdx, wx, wy);
      var wa = fangle + pget(p, L ? 'wristL' : 'wristR');
      _set(dIdx, wx + Math.sin(wa) * hn, wy - Math.cos(wa) * hn);
    }
  }

  // --- legs ----------------------------------------------------------------
  for (i = 0; i < 2; i++){
    var Lg = i === 0;
    var hIdx = Lg ? J.hipL : J.hipR, kIdx = Lg ? J.kneeL : J.kneeR,
        aIdx = Lg ? J.ankleL : J.ankleR;
    var hx = _u(hIdx), hy = _v(hIdx);
    var ft = Lg ? p.footL : p.footR;
    if (ft){
      var tu2 = ft[0]*h, tv2 = ft[1]*h;
      ik2(hx, hy, tu2, tv2, thigh, shin, BEND.KNEE, _ik);
      _set(kIdx, _ik[0], _ik[1]);
      _set(aIdx, tu2, tv2);
    } else {
      var hipA = pget(p, Lg ? 'hipL' : 'hipR');
      var kx = hx + Math.sin(hipA) * thigh, ky = hy - Math.cos(hipA) * thigh;
      // NOTE: v is UP, so a hip angle of 0 must take the knee DOWN.
      _set(kIdx, kx, ky);
      var shA = hipA - pget(p, Lg ? 'kneeL' : 'kneeR');
      _set(aIdx, kx + Math.sin(shA) * shin, ky - Math.cos(shA) * shin);
    }
    // Foot. Pitch is ABSOLUTE (from horizontal), which is what keeps a sole
    // flat on the floor no matter what the shin is doing.
    var pitch = pget(p, Lg ? 'ankleL' : 'ankleR');
    var cs = Math.cos(pitch), sn = Math.sin(pitch);
    var ax = _u(aIdx), ay = _v(aIdx);
    var dr = B.ankleV * h;
    _set(Lg ? J.heelL : J.heelR,
         ax - B.footBack*h*cs + dr*sn,  ay - B.footBack*h*sn - dr*cs);
    _set(Lg ? J.toeL : J.toeR,
         ax + B.footFwd*h*cs  + dr*sn,  ay + B.footFwd*h*sn  - dr*cs);
  }
}

/* Transform the whole rig into canvas space in one pass. */
function projectRig(x, y, h, flip, rot){
  var i, u, v, cu, cv, pu = _u(J.pelvisC), pv = _v(J.pelvisC), c = 1, s = 0;
  if (rot){ c = Math.cos(rot); s = Math.sin(rot); }
  for (i = 0; i < NPT; i++){
    u = RIG[i*2]; v = RIG[i*2+1];
    if (rot){                                    // rotate about the pelvis
      var du = u - pu, dv = v - pv;
      u = pu + du*c - dv*s; v = pv + du*s + dv*c;
    }
    cu = x + u * flip; cv = y - v;
    OUT[i*2] = cu; OUT[i*2+1] = cv;
  }
}

function _seg(a, b){ g.moveTo(OUT[a*2], OUT[a*2+1]); g.lineTo(OUT[b*2], OUT[b*2+1]); }

/* --------------------------------------------------------------------------
   HEAD CLEARANCE
   An arm drawn through its own skull is the single most visible defect in the
   current cut (scenes 11, 12, 14, 17). A wide shoulder line fixes the common
   case; these two functions make it structurally impossible in every case.
   -------------------------------------------------------------------------- */

// Distance from a point to a segment. Used to score IK candidates.
function _ptSeg(px, pv, ax, av, bx, bv){
  var dx = bx - ax, dv = bv - av, L = dx*dx + dv*dv;
  var u = L ? clamp(((px-ax)*dx + (pv-av)*dv) / L, 0, 1) : 0;
  var qx = ax + dx*u, qv = av + dv*u;
  dx = px - qx; dv = pv - qv;
  return Math.sqrt(dx*dx + dv*dv);
}
/* Two-bone IK that also picks the bend direction. `pref` is the natural one
   (elbow back and down); it is only overruled when it would drive the arm
   through the head — which is what happens on every overhead carry, because a
   folded chain throws the elbow straight into the skull. */
function _armIK(ax, av, bx, bv, l1, l2, pref, hx, hv, hr){
  ik2(ax, av, bx, bv, l1, l2, pref, _ik);
  var e0 = _ik[0], e1 = _ik[1];
  var d0 = Math.min(_ptSeg(hx, hv, ax, av, e0, e1), _ptSeg(hx, hv, e0, e1, bx, bv));
  if (d0 >= hr) return;                       // natural bend is clear: keep it
  ik2(ax, av, bx, bv, l1, l2, -pref, _ik);
  var d1 = Math.min(_ptSeg(hx, hv, ax, av, _ik[0], _ik[1]),
                    _ptSeg(hx, hv, _ik[0], _ik[1], bx, bv));
  if (d1 <= d0){ _ik[0] = e0; _ik[1] = e1; }  // neither is clear: keep the better
}
/* Push an FK limb angle out of the cone the head occupies as seen from the
   joint. Continuous, deterministic, and a no-op for every angle that was not
   about to intersect the head — a hanging or forward-reaching arm is untouched. */
function _coneClear(ax, av, ang, len, hx, hv, hr){
  var du = hx - ax, dv = hv - av;
  var dC = Math.sqrt(du*du + dv*dv);
  if (dC < 1e-4 || dC - hr > len) return ang;   // cannot reach the head anyway
  var half = Math.asin(clamp(hr / Math.max(dC, hr), -1, 1));
  var aC = Math.atan2(du, -dv);                 // pose convention: from straight-down
  var delta = ang - aC;
  while (delta >  Math.PI) delta -= TAU;
  while (delta < -Math.PI) delta += TAU;
  if (Math.abs(delta) >= half) return ang;
  return aC + (delta >= 0 ? half : -half);      // slide it to the nearer edge
}

/* --------------------------------------------------------------------------
   fig(x, y, h, pose, opts)
   FEET at y, total height h. opts: {col, lw, alpha, flip, depth, rank, child,
   contact, ghost}
   Returns the last-drawn joint table (canvas space) — use FIG.hand()/FIG.at()
   to hang a prop off a hand.
   -------------------------------------------------------------------------- */
function fig(x, y, h, pose, opts){
  var o = opts || EMPTY;
  var p = pose || POSE.stand(0, 0);
  var d = o.depth === undefined ? 0 : o.depth;
  var flip = o.flip === undefined ? 1 : o.flip;
  var child = !!o.child;
  var prop = child ? { headR: CHILD.headR, thigh: CHILD.thigh, shin: CHILD.shin,
                       hipStand: CHILD.hipStand } : null;

  var alpha = (o.alpha === undefined ? 1 : o.alpha) * (o.ghost ? 0.45 : 1)
            * (o.depth === undefined ? 1 : depthAlpha(d));
  var rank  = o.rank || (d > 0.55 ? 'D' : d > 0.2 ? 'C' : 'B');
  var base  = o.lw || LW[rank] || LW.B;
  var lw    = camPx(base * (o.depth === undefined ? 1 : depthWeight(d)));
  var col   = o.col || (o.ghost ? P.dim : (d > 0.55 ? P.dim : P.ink));

  var rdx = pget(p, 'rootDx') * h * flip;
  x += rdx;

  buildRig(h, p, prop, o.headClear === false);
  projectRig(x, y, h, flip, pget(p, 'rootRot') * flip);

  g.save();
  if (alpha < 1) g.globalAlpha = alpha;
  g.strokeStyle = col; g.fillStyle = col;
  g.lineCap = 'round'; g.lineJoin = 'round';

  if (o.contact !== false) contact(x, y, h, d, alpha);

  var hr = B.handR * h;
  // The far-side limbs go down at reduced alpha. In a side-on stick figure
  // that single move is what separates the passing pose of a walk from a
  // tangle of identical sticks — it is occlusion, not distance, so it is a
  // different signal from the depth fade. Skipped for small/flat figures.
  var split = (o.flat !== true) && d < 0.60 && alpha > 0.5;

  if (split){
    g.globalAlpha = alpha * 0.55;
    g.lineWidth = lw * 0.92;
    g.beginPath();
    _seg(J.hipL, J.kneeL); _seg(J.kneeL, J.ankleL);
    _seg(J.ankleL, J.heelL); _seg(J.heelL, J.toeL);
    _seg(J.shoulderL, J.elbowL); _seg(J.elbowL, J.wristL); _seg(J.wristL, J.handL);
    g.stroke();
    g.beginPath();
    g.moveTo(OUT[J.handL*2] + hr, OUT[J.handL*2+1]);
    g.arc(OUT[J.handL*2], OUT[J.handL*2+1], hr, 0, TAU);
    g.fill();
    g.globalAlpha = alpha;
  }

  // 1 · body: spine, clavicles, pelvis bar, near leg, near arm
  g.lineWidth = lw;
  g.beginPath();
  _seg(J.pelvisC, J.sternum); _seg(J.sternum, J.shoulderC);
  _seg(J.shoulderL, J.shoulderR);
  _seg(J.hipL, J.hipR);
  _seg(J.shoulderC, J.neckTop);
  _seg(J.hipR, J.kneeR); _seg(J.kneeR, J.ankleR);
  _seg(J.ankleR, J.heelR); _seg(J.heelR, J.toeR);
  if (!split){
    _seg(J.hipL, J.kneeL); _seg(J.kneeL, J.ankleL);
    _seg(J.ankleL, J.heelL); _seg(J.heelL, J.toeL);
  }
  g.stroke();

  // 2 · arms, a shade lighter so the torso stays the read. The wrist->hand
  // segment is the hand itself: without it the grip dot floats off the arm.
  g.lineWidth = lw * 0.92;
  g.beginPath();
  _seg(J.shoulderR, J.elbowR); _seg(J.elbowR, J.wristR); _seg(J.wristR, J.handR);
  if (!split){ _seg(J.shoulderL, J.elbowL); _seg(J.elbowL, J.wristL); _seg(J.wristL, J.handL); }
  g.stroke();

  // 3 · head
  g.lineWidth = lw * 0.90;
  g.beginPath();
  g.arc(OUT[J.headC*2], OUT[J.headC*2+1], (prop ? prop.headR : B.headR) * h, 0, TAU);
  if (o.fillHead) g.fill(); else g.stroke();

  // 4 · hands. The IK end-effector, and the only thing a prop may attach to.
  g.beginPath();
  if (!split){
    g.moveTo(OUT[J.handL*2] + hr, OUT[J.handL*2+1]);
    g.arc(OUT[J.handL*2], OUT[J.handL*2+1], hr, 0, TAU);
  }
  g.moveTo(OUT[J.handR*2] + hr, OUT[J.handR*2+1]);
  g.arc(OUT[J.handR*2], OUT[J.handR*2+1], hr, 0, TAU);
  g.fill();

  g.restore();

  LAST.x = x; LAST.y = y; LAST.h = h; LAST.flip = flip;
  return LAST;
}

/* Sugar: correct height, baseline, alpha and weight from one depth value.
   figAt(0.4, 820, POSE.stand(t, 3))  */
function figAt(depth, x, pose, opts){
  var o = opts || EMPTY;
  _fo.depth = depth;
  _fo.col = o.col; _fo.lw = o.lw; _fo.alpha = o.alpha;
  _fo.flip = o.flip === undefined ? 1 : o.flip;
  _fo.rank = o.rank; _fo.child = o.child; _fo.ghost = o.ghost;
  _fo.contact = o.contact; _fo.fillHead = o.fillHead;
  _fo.flat = o.flat; _fo.headClear = o.headClear;
  var h = figH(depth) * (o.child ? CHILD.scale : 1);
  return fig(x, ground(depth), h, pose, _fo);
}
var _fo = {};

/* Read a joint of the last figure drawn, in canvas coordinates. This is how a
   prop gets parented to a hand. */
var FIG = {
  at: function(name, out){
    var i = J[name]; out = _gv(out);
    out[0] = OUT[i*2]; out[1] = OUT[i*2+1];
    return out;
  },
  hand: function(side, out){ return FIG.at(side === 'L' ? 'handL' : 'handR', out); },
  head: function(out){ return FIG.at('headC', out); },
  x: function(name){ return OUT[J[name]*2]; },
  y: function(name){ return OUT[J[name]*2+1]; },
  last: LAST
};

/* Contact ellipse. Without it a stick figure never touches the ground, no
   matter how correct the baseline is. */
function contact(x, y, h, d, alpha){
  var w = h * 0.34, hh = h * 0.042;
  g.save();
  g.globalAlpha = 0.11 * (d === undefined ? 1 : depthAlpha(d)) * (alpha === undefined ? 1 : alpha);
  g.fillStyle = P.dim;
  g.translate(x, y); g.scale(1, hh / w);
  g.beginPath(); g.arc(0, 0, w * 0.5, 0, TAU); g.fill();
  g.restore();
}

/* A figure who has left: last pose he held, dim, 0.45 alpha, never moves again.
   Scenes 12, 17 and 19 only. */
function ghost(x, y, h, pose, opts){
  var o = opts || EMPTY;
  _go.depth = o.depth; _go.flip = o.flip; _go.ghost = true;
  _go.rank = 'D'; _go.col = P.dim; _go.contact = false;
  return fig(x, y, h, pose, _go);
}
var _go = {};

/* ==========================================================================
   9 · CAMERA
   Derived from t alone, every frame, after an unconditional CAM.reset().
   No accumulation, no += across frames. Scrub-safe by construction.
   ========================================================================== */

var _camZ = 1;                          // live zoom, for stroke compensation

var CAM = {
  x: 0, y: 0, zoom: 1, rot: 0,
  // Zoom pivots on the frame centre horizontally and on the EYE LINE
  // vertically, so a push-in does not slide the ground out from under the
  // figures. Override with CAM.pivot() if a scene needs otherwise.
  px: W * 0.5, py: HORIZON,
  min: 0.78, max: 2.80,
  _depth: 0,

  reset: function(){
    CAM.x = 0; CAM.y = 0; CAM.zoom = 1; CAM.rot = 0;
    CAM.px = W * 0.5; CAM.py = HORIZON;
    return CAM;
  },
  pivot: function(x, y){ CAM.px = x; CAM.py = y; return CAM; },
  set: function(o){
    if (!o) return CAM;
    if (o.x !== undefined) CAM.x = o.x;
    if (o.y !== undefined) CAM.y = o.y;
    if (o.zoom !== undefined) CAM.zoom = clamp(o.zoom, CAM.min, CAM.max);
    if (o.rot !== undefined) CAM.rot = o.rot;
    if (o.px !== undefined) CAM.px = o.px;
    if (o.py !== undefined) CAM.py = o.py;
    return CAM;
  },
  /* Animated move. keys = [[time, x, y, zoom], [time, x, y, zoom, easeFn], ...]
     Hoist the array to module scope; do not build it inside a scene function. */
  frame: function(t, keys){
    var n = keys.length, i, a, b, u, fn;
    if (!n) return CAM;
    if (t <= keys[0][0]) return CAM.set({ x:keys[0][1], y:keys[0][2], zoom:keys[0][3] });
    if (t >= keys[n-1][0]) { a = keys[n-1]; return CAM.set({ x:a[1], y:a[2], zoom:a[3] }); }
    for (i = 0; i < n - 1; i++){
      a = keys[i]; b = keys[i+1];
      if (t < b[0]){
        u = (t - a[0]) / (b[0] - a[0]); fn = a[4] || EASE.inOut;
        u = fn(u);
        return CAM.set({ x:lerp(a[1],b[1],u), y:lerp(a[2],b[2],u), zoom:lerp(a[3],b[3],u) });
      }
    }
    return CAM;
  },
  /* A tracking shot must NOT ease mid-move or the world appears to slide.
     Linear, always. */
  track: function(t, a, b, x0, x1){
    CAM.x = lerp(x0, x1, clamp((t - a) / (b - a), 0, 1));
    return CAM;
  },
  /* Always on. No shot in this film is ever dead-locked. */
  breath: function(t, amt){
    var k = amt === undefined ? 1 : amt;
    CAM.x += Math.sin(t * 0.31) * 6 * k;
    CAM.y += Math.sin(t * 0.23 + 1.7) * 3.6 * k;
    CAM.zoom *= 1 + Math.sin(t * 0.19) * 0.0025 * k;
    return CAM;
  },
  /* Deterministic strain. Scene 12 only: the frame itself begins to shake. */
  stress: function(t, amt){
    CAM.y += Math.sin(t * 7.3) * amt;
    CAM.x += Math.sin(t * 5.1) * amt * 0.4;
    return CAM;
  },
  begin: function(){
    CAM.zoom = clamp(CAM.zoom, CAM.min, CAM.max);
    _camZ = CAM.zoom;
    g.save();
    g.translate(CAM.px, CAM.py);
    if (CAM.rot) g.rotate(CAM.rot);
    g.scale(CAM.zoom, CAM.zoom);
    g.translate(-CAM.px - CAM.x, -CAM.py - CAM.y);
    return CAM;
  },
  end: function(){ g.restore(); _camZ = 1; return CAM; },
  /* World x visible at the left/right frame edge, for building overscan. */
  leftEdge:  function(){ return CAM.x + CAM.px - (CAM.px) / CAM.zoom; },
  rightEdge: function(){ return CAM.x + CAM.px + (W - CAM.px) / CAM.zoom; }
};

/* Compensated stroke width. Every core primitive uses it, so lines hold their
   screen weight through a zoom instead of fattening. If you call the legacy
   line()/rect()/circle() helpers inside CAM.begin(), pass camPx(w) yourself. */
function camPx(w){ return w / _camZ; }

/* ==========================================================================
   10 · ENVIRONMENT KIT
   All depth-aware. All deterministic. All batched into as few paths as the
   shape allows.
   ========================================================================== */

/* The ground plane as a wedge, not a line. Horizon, the five ladder baselines
   at their own alphas, and orthogonals converging on the vanishing point. This
   one call fixes "figures float" everywhere. */
function groundPlane(o){
  o = o || EMPTY;
  var i, x, y, a;
  var L = o.x0 === undefined ? OVER_L : o.x0, R = o.x1 === undefined ? OVER_R : o.x1;
  g.save();
  g.lineCap = 'round'; g.strokeStyle = o.col || P.dim;

  if (o.horizon !== false){
    g.globalAlpha = 0.18; g.lineWidth = camPx(2);
    g.beginPath(); g.moveTo(L, HORIZON); g.lineTo(R, HORIZON); g.stroke();
  }
  if (o.orthos){                               // recession, opt-in
    g.globalAlpha = 0.10; g.lineWidth = camPx(2);
    g.beginPath();
    var yNear = ground(-1), yFar = ground(1);
    for (i = 0; i <= 6; i++){
      x = lerp(L, R, i / 6);
      var k = (yNear - yFar) / (yNear - HORIZON);
      g.moveTo(x, yNear);
      g.lineTo(lerp(x, W * 0.5, k), yFar);
    }
    g.stroke();
  }
  for (i = 0; i < LADDER.length; i++){        // the baselines figures stand on
    y = ground(LADDER[i]); a = depthAlpha(LADDER[i]);
    g.globalAlpha = (i === 1 ? 1 : 0.34) * a * (o.alpha === undefined ? 1 : o.alpha);
    g.lineWidth = camPx(i === 1 ? LW.GROUND : 2);
    g.beginPath(); g.moveTo(L, y); g.lineTo(R, y); g.stroke();
  }
  g.restore();
}

/* One ground rule, for scenes that want the floor and nothing else.
   Plate scenes (03, 04, 20) call this with {alpha:0.22}. */
function groundLine(y, o){
  o = o || EMPTY;
  g.save();
  g.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
  g.strokeStyle = o.col || P.dim; g.lineWidth = camPx(o.lw || LW.GROUND);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(o.x0 === undefined ? OVER_L : o.x0, y === undefined ? GROUND : y);
  g.lineTo(o.x1 === undefined ? OVER_R : o.x1, y === undefined ? GROUND : y);
  g.stroke();
  g.restore();
}

/* building(x, y, w, h, opts)
   x = left edge, y = BASELINE (where it meets the ground), h = height upward.
   opts: {depth, lit, seed, cols, rows, col, litCol}
   `lit` is the fraction of windows alight, 0..1. Ramp it over scene time and
   the block wakes one window at a time in a hash-scattered order — no two on
   the same frame, and none of it random. */
function building(x, y, w, h, o){
  o = o || EMPTY;
  var d = o.depth === undefined ? 0 : o.depth;
  var seed = (o.seed || 0) | 0;
  var cols = o.cols || Math.max(2, Math.round(w / 46));
  var rows = o.rows || Math.max(3, Math.round(h / 58));
  var lit  = o.lit === undefined ? 0 : o.lit;
  var i, j, wx, wy, ww, wh;

  g.save();
  g.globalAlpha = depthAlpha(d) * (o.alpha === undefined ? 1 : o.alpha);
  g.strokeStyle = o.col || P.dim;
  g.lineWidth = camPx(LW.C * depthWeight(d));
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(x, y); g.lineTo(x, y - h); g.lineTo(x + w, y - h); g.lineTo(x + w, y);
  g.stroke();

  ww = (w / cols) * 0.52; wh = (h / rows) * 0.46;
  // unlit windows, one path
  g.globalAlpha = depthAlpha(d) * 0.30;
  g.beginPath();
  for (i = 0; i < cols; i++) for (j = 0; j < rows; j++){
    wx = x + (i + 0.5) * (w / cols) - ww / 2;
    wy = y - h + (j + 0.5) * (h / rows) - wh / 2;
    g.rect(wx, wy, ww, wh);
  }
  g.lineWidth = camPx(LW.E * depthWeight(d));
  g.stroke();
  // lit windows, one fill. Wake order is hash-scattered, so no two light on the
  // same frame and none of it is random.
  if (lit > 0){
    g.globalAlpha = depthAlpha(d);
    g.fillStyle = o.litCol || P.accent;
    g.beginPath();
    for (i = 0; i < cols; i++) for (j = 0; j < rows; j++){
      if (nz2(seed * 131 + i, j) >= lit) continue;
      wx = x + (i + 0.5) * (w / cols) - ww / 2;
      wy = y - h + (j + 0.5) * (h / rows) - wh / 2;
      g.rect(wx, wy, ww, wh);
    }
    g.fill();
  }
  g.restore();
}

/* tree(x, y, h, growth, season)
   x = trunk base, y = BASELINE, h = full height at growth 1, growth 0..1.
   season: 'winter' | 'spring' | 'summer' | 'autumn'.
   A real branching form, deterministic, one path for the wood. Trunk is P.dim
   (no out-of-palette browns); canopy is P.green — the only living colour. */
var _TIP = new Float32Array(80), _TIPN = 0;   // terminal branch ends, reused
function _branch(x, y, len, ang, depth, maxD, seed, spread){
  if (depth > maxD || len < 3) return;
  var nx = x + Math.sin(ang) * len, ny = y - Math.cos(ang) * len;
  g.moveTo(x, y); g.lineTo(nx, ny);
  if (depth === maxD){
    if (_TIPN < 78){ _TIP[_TIPN++] = nx; _TIP[_TIPN++] = ny; }
    return;
  }
  var s = spread * (0.75 + 0.5 * nz2(seed, depth * 7 + 1));
  var k = 0.66 + 0.12 * nz2(seed + 3, depth);
  _branch(nx, ny, len * k, ang - s, depth + 1, maxD, seed * 3 + 1, spread * 0.92);
  _branch(nx, ny, len * k, ang + s * (0.8 + 0.4 * nz2(seed + 9, depth)),
          depth + 1, maxD, seed * 3 + 2, spread * 0.92);
}
function tree(x, y, h, growth, season, o){
  o = o || EMPTY;
  var gr = clamp(growth === undefined ? 1 : growth, 0.02, 1);
  var d  = o.depth === undefined ? 0 : o.depth;
  var seed = (o.seed || 7) | 0;
  var th = h * gr;
  var maxD = 1 + Math.floor(gr * 3.99);
  g.save();
  g.globalAlpha = depthAlpha(d) * (o.alpha === undefined ? 1 : o.alpha);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = o.col || P.dim;
  g.lineWidth = camPx(Math.max(2, th * 0.035) * depthWeight(d));
  g.beginPath();
  _TIPN = 0;
  _branch(x, y, th * 0.46, o.lean || 0, 0, maxD, seed, 0.44);
  g.stroke();
  if (season !== 'winter' && _TIPN){
    // Foliage hangs on the actual branch tips, filled and soft. Stroked circles
    // floating near the tree read as bubbles, not as a canopy.
    var i, r, cx, cy, n = _TIPN / 2;
    g.fillStyle = P.green;
    g.globalAlpha *= (season === 'autumn' ? 0.13 : 0.20);
    g.beginPath();
    for (i = 0; i < n; i++){
      cx = _TIP[i*2]; cy = _TIP[i*2+1];
      r  = th * (0.10 + 0.06 * nz2(seed + 33, i));
      g.moveTo(cx + r, cy); g.arc(cx, cy, r, 0, TAU);
    }
    g.fill();
  }
  g.restore();
}

/* room(x, y, w, h, opts)
   x = left, y = FLOOR line, h = height upward. opts.open omits the walls
   entirely (scene 10's "room with no walls"). Rank C or D — a room must never
   outweigh the people inside it. */
function room(x, y, w, h, o){
  o = o || EMPTY;
  var d = o.depth === undefined ? 0.3 : o.depth;
  g.save();
  g.globalAlpha = depthAlpha(d) * (o.alpha === undefined ? 1 : o.alpha);
  g.strokeStyle = o.col || P.dim;
  g.lineWidth = camPx((o.lw || LW.C) * depthWeight(d));
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  if (o.open){                                    // floor only
    g.moveTo(x, y); g.lineTo(x + w, y);
  } else {
    g.moveTo(x, y); g.lineTo(x, y - h);
    g.lineTo(x + w, y - h); g.lineTo(x + w, y); g.lineTo(x, y);
  }
  g.stroke();
  g.restore();
}

/* beam(x1, x2, y, opts)
   A horizontal member with real deflection. opts: {sag, thick, col, depth,
   limit} — when sag exceeds `limit` the deflection curve goes ember, because
   ember means load and nothing else.
   Use beamY() to find the underside at any x, so hands can ride the sag. */
function beamY(x1, x2, y, sag, x){
  var u = clamp((x - x1) / (x2 - x1), 0, 1);
  return y + sag * 4 * u * (1 - u);
}
function beam(x1, x2, y, o){
  o = o || EMPTY;
  var sag = o.sag || 0, th = o.thick === undefined ? 22 : o.thick;
  var d = o.depth === undefined ? 0 : o.depth;
  var over = o.limit !== undefined && sag > o.limit;
  var i, n = 24, x, yy;
  g.save();
  g.globalAlpha = depthAlpha(d) * (o.alpha === undefined ? 1 : o.alpha);
  g.strokeStyle = o.col || P.ink;
  g.lineWidth = camPx((o.lw || LW.C) * depthWeight(d));
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  for (i = 0; i <= n; i++){ x = lerp(x1, x2, i/n); yy = beamY(x1, x2, y, sag, x);
    if (i === 0) g.moveTo(x, yy); else g.lineTo(x, yy); }
  for (i = n; i >= 0; i--){ x = lerp(x1, x2, i/n); yy = beamY(x1, x2, y, sag, x) - th;
    g.lineTo(x, yy); }
  g.closePath(); g.stroke();
  if (over){                                     // the LOAD is ember, not the men
    g.strokeStyle = P.accent; g.lineWidth = camPx(LW.WARM);
    g.beginPath();
    for (i = 0; i <= n; i++){ x = lerp(x1, x2, i/n); yy = beamY(x1, x2, y, sag, x);
      if (i === 0) g.moveTo(x, yy); else g.lineTo(x, yy); }
    g.stroke();
  }
  g.restore();
}

/* doorway(x, y, w, h, opts)
   x = CENTRE, y = baseline. Two uprights and a lintel standing on the ground —
   and nothing else, so when the camera pulls back it is visibly a frame in
   open country with no walls on either side. */
function doorway(x, y, w, h, o){
  o = o || EMPTY;
  var d = o.depth === undefined ? 0 : o.depth;
  var t = o.thick === undefined ? w * 0.10 : o.thick;
  g.save();
  g.globalAlpha = depthAlpha(d) * (o.alpha === undefined ? 1 : o.alpha);
  g.strokeStyle = o.col || P.ink;
  g.lineWidth = camPx((o.lw || LW.C) * depthWeight(d));
  g.lineCap = 'butt'; g.lineJoin = 'miter';
  g.beginPath();
  g.rect(x - w/2 - t, y - h, t, h);
  g.rect(x + w/2,     y - h, t, h);
  g.rect(x - w/2 - t, y - h - t, w + 2*t, t);
  g.stroke();
  g.restore();
}

/* waterBranch(x, y, len, spread, depth, opts)
   The recursive delta / bronchi / root system. opts.up flips the growth axis.
   MIRRORING IS BY AXIS, NEVER BY NEGATIVE LENGTH — negating the length is what
   folded scene 18's delta back into the bronchi and destroyed the mirror.
   opts: {up, col, grow (0..1 reveal), seed, depth (staging depth), lw} */
function _wb(x, y, len, ang, lvl, maxL, seed, spread, up, grow){
  if (lvl > maxL || len < 2) return;
  var reveal = clamp((grow - lvl * 0.14) / 0.30, 0, 1);
  if (reveal <= 0) return;
  var L  = len * reveal;
  var nx = x + Math.sin(ang) * L;
  var ny = y + up * Math.cos(ang) * L;         // `up` is the ONLY mirror term
  g.moveTo(x, y); g.lineTo(nx, ny);
  if (reveal < 1 || lvl === maxL) return;
  var s = spread * (0.80 + 0.45 * nz2(seed, lvl * 5 + 1));
  var k = 0.70 + 0.10 * nz2(seed + 5, lvl);
  _wb(nx, ny, len*k, ang - s, lvl+1, maxL, seed*3+1, spread*0.90, up, grow);
  _wb(nx, ny, len*k, ang + s*(0.85 + 0.3*nz2(seed+11, lvl)), lvl+1, maxL,
      seed*3+2, spread*0.90, up, grow);
}
function waterBranch(x, y, len, spread, maxL, o){
  o = o || EMPTY;
  var d = o.depth === undefined ? 0 : o.depth;
  g.save();
  g.globalAlpha = depthAlpha(d) * (o.alpha === undefined ? 1 : o.alpha);
  g.strokeStyle = o.col || P.green;
  g.lineWidth = camPx((o.lw || LW.C) * depthWeight(d));
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  _wb(x, y, len, o.ang || 0, 0, Math.min(maxL, 5), (o.seed || 3) | 0,
      spread === undefined ? 0.42 : spread,
      o.up ? -1 : 1, o.grow === undefined ? 1 : o.grow);
  g.stroke();
  g.restore();
}

/* crowd(spec)
   spec: {x0, x1, n, d0, d1, t, seed, pose(i,t,d), flip(i), child(i), ghost}
   Distributes n figures across x, alternates depth steps so no two neighbours
   share a plane, draws BACK TO FRONT so near figures overlap far ones, and
   holds the minimum same-plane separation of 0.62h. Overlap across depth steps
   is the point — evenly spaced non-touching figures read as a chart of people
   rather than a crowd of them. */
function crowd(spec){
  var s = spec || EMPTY;
  var n = s.n || 6, i, k, d, x, h, seed = (s.seed || 0) | 0;
  var x0 = s.x0 === undefined ? 200 : s.x0, x1 = s.x1 === undefined ? W - 200 : s.x1;
  var d0 = s.d0 === undefined ? DEPTH.MG : s.d0;
  var d1 = s.d1 === undefined ? DEPTH.BG : s.d1;
  var t  = s.t || 0;
  var span = (x1 - x0) / Math.max(1, n - 1);
  if (DEV && span > 0.30 * figH(d0) * 0.85)
    _warn('crowd_sparse', 'crowd: ' + Math.round(span) + 'px spacing over a ' +
      Math.round(0.30*figH(d0)) + 'px silhouette — no overlap, so it will read as a chart of people rather than a crowd. Raise n or narrow x0..x1.');
  var order = _order(n, seed);                 // far to near
  for (k = 0; k < n; k++){
    i = order[k];
    // Snap to sanctioned steps and cycle them, so no two NEIGHBOURS share a
    // plane. Same-plane figures are 3 apart in the line, which keeps them well
    // clear of the 0.62h separation floor while neighbours are free to overlap
    // across depth — and overlap is the strongest depth cue flat line art has.
    d = snapDepth(lerp(d0, d1, (i % 3) / 2));
    h = figH(d) * (s.child && s.child(i) ? CHILD.scale : 1);
    x = x0 + i * span + nzs(seed*23 + i) * span * 0.22 + (i % 3) * span * 0.28;
    _co.depth = d;
    _co.flip = s.flip ? s.flip(i) : (nz1(seed*29 + i) < 0.25 ? -1 : 1);
    _co.child = s.child ? s.child(i) : false;
    _co.ghost = s.ghost ? s.ghost(i) : false;
    _co.rank = undefined; _co.col = undefined; _co.lw = undefined;
    _co.alpha = undefined; _co.contact = undefined; _co.fillHead = undefined;
    _co.flat = s.flat; _co.headClear = undefined;
    fig(x, ground(d), h, s.pose ? s.pose(i, t, d) : POSE.stand(t, seed*7 + i), _co);
  }
}
var _co = {};
// Draw order, far to near. Precomputed per (n, seed) and cached — the only
// allocation in the kit, and it happens once.
var _ORD = {};
function _order(n, seed){
  var key = n + '_' + seed;
  if (_ORD[key]) return _ORD[key];
  var a = [], i;
  for (i = 0; i < n; i++) a.push(i);
  a.sort(function(p, q){
    var dp = (p % 3), dq = (q % 3);
    return (dq - dp) || (p - q);
  });
  _ORD[key] = a;
  return a;
}

/* The warm line. One continuous ember path, 3px, invariant, drawn LAST and
   over everything, entering at (OVER_L, GROUND) and leaving at (OVER_R, GROUND)
   in every scene. What it does in between is the scene's argument.
   pts = flat [x,y, x,y, ...] interior control points. Hoist it; mutate in place. */
function warmLine(pts, o){
  o = o || EMPTY;
  var i, n = pts ? pts.length : 0;
  g.save();
  g.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
  g.strokeStyle = P.accent; g.lineWidth = camPx(LW.WARM);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(o.x0 === undefined ? OVER_L : o.x0, o.y0 === undefined ? GROUND : o.y0);
  for (i = 0; i < n; i += 2) g.lineTo(pts[i], pts[i+1]);
  g.lineTo(o.x1 === undefined ? OVER_R : o.x1, o.y1 === undefined ? GROUND : o.y1);
  g.stroke();
  g.restore();
}

/* ==========================================================================
   11 · DEV ASSERTIONS
   Flip DEV on while building a scene. Costs nothing when off.
   ========================================================================== */

var DEV = false;
var _warned = {};
function _warn(k, msg){ if (!_warned[k]){ _warned[k] = 1; if (typeof console !== 'undefined') console.warn('[core] ' + msg); } }
function assertStage(name, x, y, h){
  if (!DEV) return;
  if (y > FLOOR_B)  _warn(name+'_band', name + ': contact at y=' + Math.round(y) + ' is inside the subtitle band (>' + FLOOR_B + ')');
  if (x < ACT_L || x > ACT_R) _warn(name+'_safe', name + ': subject at x=' + Math.round(x) + ' is outside action-safe');
  var top = y - h;
  if (top < 432 || top > 444) _warn(name+'_head', name + ': head-top at ' + Math.round(top) + ', expected 432..444 — h and baseline disagree');
}
function assertType(name, y){
  if (DEV && y > TYPE_MAX) _warn(name+'_type', name + ': type at y=' + Math.round(y) + ' will be painted over by the caption band');
}
