/* Produce Atlas — faces.

   The point of a face here is not decoration. Everything else it becomes is
   an object, and an object cannot make the argument that the sphere you are
   talking to is a *default*, one form among many, chosen because it is
   honest about being a program rather than because it is all there is. A
   face makes that argument in about two seconds.

   So the face has to be the same body. Not a model swapped in — the same
   10242 vertices, the same solver, morphed. Which means every part of it
   that can possibly be radial is radial: skull, brow, nose, lips, cheeks,
   chin, jaw. You can grab this face by the nose and pull.

   Only the things a radial field genuinely cannot express are attached:
   eyeballs (a sphere sitting in a socket is two surfaces along one ray),
   ears (thin fins standing off the skull), and hair (its own volume).

   PROPORTIONS ARE MEASURED, NOT INVENTED. The same discipline as the fruit,
   and for the same reason: a face assembled from what you vaguely remember a
   face looking like lands somewhere between uncanny and cartoon, and with a
   real person's face the failure mode is worse than uncanny. Every number
   below is an anthropometric mean for an adult man in centimetres, and the
   canonical construction lines — eyes on the head's vertical midline, the
   face in equal thirds, five eye-widths across — are followed rather than
   eyeballed. What varies from face to face is data in the entry, not code. */
(function (NG) {
  'use strict';

  const M = NG.M;
  const G = NG.G;
  const P = NG.P;
  const FACE = {};

  /* ---- the feature primitive ------------------------------------------ */

  /* An anisotropic gaussian bump anchored to a direction on the unit sphere.
     `ku` and `kv` are 1/(2 sigma^2) along the feature's own tangent and
     bitangent, so a high ku is narrow side to side and a high kv is short top
     to bottom. This is the same primitive the original sculpt used; a face is
     a small number of these and almost nothing else. */
  function feature(cx, cy, cz, tx, ty, tz, amp, ku, kv) {
    const c = M.normalized(cx, cy, cz);
    let t;
    if (tx === null) {
      t = M.frame(c)[0];
    } else {
      const d = cx * tx + cy * ty + cz * tz;
      t = M.normalized(tx - c[0] * d, ty - c[1] * d, tz - c[2] * d);
    }
    return { c: c, t: t, b: M.cross3([0, 0, 0], c, t), amp: amp, ku: ku, kv: kv };
  }

  /* Strength of one feature at a direction, 0..1, falling to nothing well
     before the far side of the head — a nose must not dent the occiput. */
  function at(f, dx, dy, dz) {
    const c = f.c;
    const d = dx * c[0] + dy * c[1] + dz * c[2];
    if (d <= 0.05) return 0;
    const ex = dx - c[0] * d, ey = dy - c[1] * d, ez = dz - c[2] * d;
    const u = ex * f.t[0] + ey * f.t[1] + ez * f.t[2];
    const v = ex * f.b[0] + ey * f.b[1] + ez * f.b[2];
    const e = f.ku * u * u + f.kv * v * v;
    if (e > 12) return 0;
    return Math.exp(-e) * d;
  }
  FACE.at = at;

  /* ---- where things are on a head ------------------------------------- */

  /* Landmarks in centimetres from the centre of the head, x across and y up,
     on a head 23 cm tall and 15.5 cm wide. Written this way because the first
     attempt wrote them as raw direction vectors and got them all wrong in the
     same direction: a direction is normalised before use, so putting -0.34 in
     the y slot of `(0, -0.34, 0.94)` does not put the landmark at 34% of the
     way down the head, it puts it at 34% of the way down *the unit sphere*,
     and everything ends up crowded towards the equator. The mouth came out
     three centimetres too high and the face read as a smiling potato.

     The canonical construction, which these follow: the face divides into
     three equal parts — hairline to brow, brow to the base of the nose, and
     the base of the nose to the chin — and the eyes sit halfway down the
     whole head, which is lower than anyone draws them. */
  const HEAD_W = 15.5, HEAD_H = 23.0, HEAD_D = 19.5;
  const HW = HEAD_W * 0.5, HH = HEAD_H * 0.5, HD = HEAD_D * 0.5;

  const CM = {
    glabella: 1.5,      /* brow ridge — top of the middle third */
    nasion: 0.6,        /* the dip between the brows */
    eye: -1.0,          /* pupil centre, and the eye line */
    eyeX: 3.2,          /* half the interpupillary distance */
    noseTip: -3.8,
    noseBase: -4.7,     /* subnasale — bottom of the middle third */
    alaX: 2.2,          /* the wings of the nose, at their widest */
    mouth: -6.8,        /* stomion, the line between the lips */
    mouthX: 2.6,        /* corner of the mouth */
    chin: -9.9,         /* pogonion */
    menton: -10.9,      /* the very bottom */
    malar: -1.5, malarX: 5.6,
    cheek: -4.6, cheekX: 5.1,
    jaw: -7.1, jawX: 4.8,
    temple: 3.4, templeX: 6.6,
    ear: -0.6
  };

  /* A landmark, as a unit direction. Given where it is across and up, the
     depth follows — it is on the surface, so the three have to make a unit
     vector once each is divided by its own half-axis. */
  function dir(xCm, yCm, backwards) {
    const x = xCm / HW, y = yCm / HH;
    const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    return [x, y, backwards ? -z : z];
  }

  /* How wide and how tall a feature is, in centimetres, converted to the
     falloff constants the gaussian wants. `k = 1/(2 sigma^2)` in tangent
     units, and a tangent unit is one half-axis of the head. */
  function wide(cm) { return (HW / cm) * (HW / cm); }
  function tall(cm) { return (HH / cm) * (HH / cm); }

  /* Anything finer than this has no vertices to sit on: 10242 of them over a
     head this size is a spacing of about 3.5 mm. */
  function fine(cm) { return tall(Math.max(cm, 0.55)); }

  /* Built once per face spec and cached on it, because a face is a fixed set
     of numbers and rebuilding the gaussians per vertex would be silly. */
  function rig(spec) {
    if (spec._rig) return spec._rig;
    const f = spec.face || {};

    /* What varies from face to face is a set of measurements in millimetres,
       not a set of multipliers.

       This mattered more than it sounds. The first version had `noseWide: 1.28`
       and `lipFull: 1.35` — numbers with no unit, no source and nothing to
       check them against, and it is very easy to talk yourself into a
       multiplier. Measured, the nose those produced was 79 mm across. The
       widest nose on any living human is around 48. That is not a stylistic
       choice, it is a caricature, and no amount of good intent in the
       surrounding code makes it not one.

       A measurement cannot do that quietly. 42 mm is either right or it is
       wrong, anyone can look it up, and scratchpad/anthro.js measures the
       built mesh and fails if any of it lands outside the range a real face
       occupies. Difference between populations is real and belongs here;
       exaggeration of it is the thing being guarded against, and the guard is
       arithmetic rather than taste. */
    const mm = function (v, dflt) { return (v === undefined ? dflt : v) / 10; };
    const alarWidth = mm(f.alarWidth, 42);
    const bridgeWidth = mm(f.bridgeWidth, 15);
    const noseProjection = mm(f.noseProjection, 18);
    const vermUpper = mm(f.vermilionUpper, 11);
    const vermLower = mm(f.vermilionLower, 14);
    const mouthWidth = mm(f.mouthWidth, 54);
    const bizygomatic = mm(f.bizygomatic, 141);
    const browProjection = mm(f.browProjection, 5);
    const chinProjection = mm(f.chinProjection, 6);

    /* A gaussian of half-width w and height a is still 2 mm proud at about
       1.12w from its centre, and 2 mm is where a surface stops reading as
       flat. So a feature that has to *measure* W across sits at W/2 - 1.12w
       from the midline. This is the whole conversion, and it is why the
       numbers above survive contact with the mesh. */
    const edge = function (halfWidthCm) { return 1.12 * halfWidthCm; };
    const alaHalfW = 0.80;
    const alaX = Math.max(0.4, alarWidth * 0.5 - edge(alaHalfW));
    const lipHalfW = mouthWidth * 0.5 - edge(0.62);

    const D = function (xCm, yCm, back) { return dir(xCm, yCm, back); };
    /* One feature, sized in centimetres: where it is, how far it stands off
       the surface, and how wide and tall it is. Every number below is a
       measurement, and every one of them can be checked against a face. */
    const F = function (pos, offCm, wCm, hCm) {
      return feature(pos[0], pos[1], pos[2], 1, 0, 0, offCm / HD, wide(wCm), fine(hCm));
    };
    /* The same, for features round the side of the head, where "horizontal"
       has to be worked out rather than assumed. */
    const S = function (pos, offCm, wCm, hCm) {
      return feature(pos[0], pos[1], pos[2], null, 0, 0, offCm / HD, wide(wCm), fine(hCm));
    };

    const R = {
      /* The nose is three parts: a narrow dorsum running down from between
         the brows, a rounded ball at the tip, and two wings either side of
         it. One bump gives a snout every time. Together they stand about
         1.7 cm off the face, which is what a nose does. */
      bridge: F(D(0, -1.6), noseProjection * 0.34, bridgeWidth * 0.5, 2.6),
      tip: F(D(0, CM.noseTip), noseProjection * 0.88, alarWidth * 0.26, 1.1),
      alaL: F(D(-alaX, CM.noseBase), 0.60, alaHalfW, 0.8),
      alaR: F(D(alaX, CM.noseBase), 0.60, alaHalfW, 0.8),
      nostrilL: F(D(-alaX * 0.52, CM.noseBase - 0.5), -0.34, 0.42, 0.55),
      nostrilR: F(D(alaX * 0.52, CM.noseBase - 0.5), -0.34, 0.42, 0.55),
      /* Philtrum: the groove from the nose down to the lip. Small, and its
         absence is one of those things you cannot name but do notice. */
      philtrum: F(D(0, -5.7), -0.25, 0.5, 0.8),

      /* Brow ridge, then the sockets under it. The ridge is most of what
         makes a face read as male; the sockets are what stop the eyes
         floating on the front of a ball. */
      browL: F(D(-3.4, CM.glabella), browProjection, 1.9, 0.9),
      browR: F(D(3.4, CM.glabella), browProjection, 1.9, 0.9),
      socketL: F(D(-CM.eyeX, CM.eye), -0.75, 1.9, 1.1),
      socketR: F(D(CM.eyeX, CM.eye), -0.75, 1.9, 1.1),
      /* Nasion, the dip between the brows. Without it the ridge runs straight
         across and the face reads as a mask. */
      nasion: F(D(0, CM.nasion), -0.40, 0.9, 0.8),

      /* The lids, which are the single reason an eye reads as an eye rather
         than a ball glued to a head. They are here at rest — over the eyeball
         from above, and less so from below, leaving the almond between them.
         A blink is simply this, further. */
      lidUpL: F(D(-CM.eyeX, CM.eye + 0.85), 0.90, 1.9, 0.55),
      lidUpR: F(D(CM.eyeX, CM.eye + 0.85), 0.90, 1.9, 0.55),
      lidLoL: F(D(-CM.eyeX, CM.eye - 0.90), 0.72, 1.9, 0.55),
      lidLoR: F(D(CM.eyeX, CM.eye - 0.90), 0.72, 1.9, 0.55),

      /* Malar prominence — the cheekbone — and the softer cheek under it. */
      malarL: S(D(-(bizygomatic * 0.5 - 0.9), CM.malar), 0.50, 2.6, 2.0),
      malarR: S(D(bizygomatic * 0.5 - 0.9, CM.malar), 0.50, 2.6, 2.0),
      cheekL: S(D(-CM.cheekX, CM.cheek), 0.30, 2.4, 2.2),
      cheekR: S(D(CM.cheekX, CM.cheek), 0.30, 2.4, 2.2),

      /* The mouth. A seam, two lips either side of it, and the muzzle they
         both sit on — lips are not stuck to a flat plane, they are wrapped
         round the front of the teeth. */
      muzzle: F(D(0, CM.mouth + 0.4), 0.60, mouthWidth * 0.55, 2.6),
      seam: F(D(0, CM.mouth), -0.52, lipHalfW, 0.55),
      /* Vermilion: each lip is as tall as it measures, centred on its own
         half of that height either side of the seam. */
      upperLip: F(D(0, CM.mouth + vermUpper * 0.5), 0.55, lipHalfW, vermUpper * 0.5),
      lowerLip: F(D(0, CM.mouth - vermLower * 0.5), 0.62, lipHalfW, vermLower * 0.5),
      /* The coloured area, which is a separate question from the shape and is
         where caricature actually hides. Sized to the lip and no larger; the
         first version let the paint mask spread 124 mm across the face. */
      vermilion: F(D(0, CM.mouth + (vermUpper - vermLower) * 0.25), 0,
        mouthWidth * 0.62, (vermUpper + vermLower) * 0.42),
      /* What is behind the lips. A mouth that opens without one is a crease
         in the chin: the jaw drops, the lips part, and there is nothing but
         more face behind them. This recesses when it opens, and is painted
         near black, so the same feature is a dark line when the mouth is shut
         and a dark opening when it is not. */
      cavity: F(D(0, CM.mouth - 0.10), 0, 1.75, 1.15),
      /* The crease under the lower lip, which is what gives a chin its shelf. */
      mentolabial: F(D(0, -8.3), -0.30, 1.7, 0.8),
      chin: F(D(0, CM.chin), chinProjection, 2.6, 1.8),

      /* Jaw corners: where the mandible turns up towards the ear. */
      jawL: S(D(-CM.jawX, CM.jaw), 0.80, 2.8, 2.4),
      jawR: S(D(CM.jawX, CM.jaw), 0.80, 2.8, 2.4),
      /* Temples, pulled in, or the skull is a ball above the eyes. */
      templeL: S(D(-CM.templeX, CM.temple), -0.45, 2.2, 2.2),
      templeR: S(D(CM.templeX, CM.temple), -0.45, 2.2, 2.2),
      /* The mound the ear attaches to, a little behind the midline. */
      earL: S(D(-7.6, CM.ear, true), 0.30, 1.6, 3.0),
      earR: S(D(7.6, CM.ear, true), 0.30, 1.6, 3.0)
    };

    R._list = Object.keys(R).filter(function (k) { return k[0] !== '_'; })
      .map(function (k) { return R[k]; });
    Object.defineProperty(spec, '_rig', { value: R });
    return R;
  }
  FACE.rig = rig;

  /* ---- the head as a radial field ------------------------------------- */

  /* `mouth` is { open, round }, both 0..1, applied while it is talking.
     Opening the mouth is a jaw rotation, so it has to move the chin and the
     whole lower face, not just part the lips — a mouth that opens without
     the jaw following is the single most common way a talking model looks
     wrong. */
  FACE.onSphere = function (out, spec, dx, dy, dz, mouth) {
    const R = rig(spec);
    const open = mouth ? mouth.open : 0;
    const round = mouth ? mouth.round : 0;
    const blink = mouth ? mouth.blink : 0;

    let r = 1.0;

    /* The back of the head is fuller than the front, because a skull is, and
       a head symmetric front to back reads as a helmet. */
    r += 0.050 * Math.pow(Math.max(0, -dz), 1.6);

    const list = R._list;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      r += f.amp * at(f, dx, dy, dz);
    }

    /* Rounding the lips for an "oo" pushes the muzzle forward and narrows it;
       spreading for an "ee" does the opposite. Cheap, and it is most of what
       separates a mouth flapping from a mouth speaking. */
    if (open > 0.001) {
      r -= open * 0.175 * at(R.cavity, dx, dy, dz);
    }

    if (round > 0.001) {
      const m = at(R.muzzle, dx, dy, dz);
      r += round * 0.045 * m;
      r -= round * 0.030 * (at(R.cheekL, dx, dy, dz) + at(R.cheekR, dx, dy, dz));
    }

    /* A blink is the lids doing more of what they are already doing: they
       travel towards each other and forward, far enough to swallow an eyeball
       that is sitting proud of its own socket. No second piece of geometry to
       animate, which is why it can happen on a body that is also a sphere. */
    if (blink > 0.001) {
      const lids = at(R.lidUpL, dx, dy, dz) + at(R.lidUpR, dx, dy, dz)
        + at(R.lidLoL, dx, dy, dz) + at(R.lidLoR, dx, dy, dz);
      /* The socket's own dent is filled in as well, or the lids close over a
         hollow and the eye stays visible at the bottom of it. */
      const aperture = at(R.socketL, dx, dy, dz) + at(R.socketR, dx, dy, dz);
      r += blink * (0.085 * lids + 0.150 * aperture);
    }

    const s = spec.face || {};
    const scale = P.cm(1);
    const halfW = HW * scale;
    const halfH = HH * scale;
    const halfD = HD * scale;

    /* The radial field is unit-ish; the ellipsoid scaling is what turns it
       into a head rather than a face painted on a ball. */
    let x = dx * r * halfW;
    let y = dy * r * halfH;
    let z = dz * r * halfD;

    /* The jaw narrows and the crown narrows, and both of those are widths
       rather than radii — done as a radial taper they shortened the head at
       the same time, so the chin climbed and the face lost its lower third.
       A skull is widest just above the ears and comes in from there in both
       directions, and that is a scaling of x alone. */
    const down = Math.max(0, -dy), up = Math.max(0, dy);
    /* Cubed rather than squared, and gentler: a mandible keeps its width most
       of the way to the chin and then turns the corner. Squared, the jaw fell
       away from the cheekbones in a straight line and the face came to a
       point like a pear. */
    x *= 1 - 0.22 * down * down * down - 0.16 * up * up;
    z *= 1 - 0.09 * down * down;

    /* The jaw. A rotation about the condyle — roughly the ear, level with the
       top of the lobe — applied to everything below it, weighted in so the
       cheeks bend rather than shear. */
    if (open > 0.001) {
      const hingeY = 0.10 * halfH;
      const hingeZ = -0.30 * halfD;
      const w = M.clamp((hingeY - y) / (0.85 * halfH), 0, 1);
      if (w > 0) {
        const ang = open * (s.jawDrop === undefined ? 0.30 : s.jawDrop) * w * w;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const py = y - hingeY, pz = z - hingeZ;
        y = hingeY + py * ca - pz * sa;
        z = hingeZ + py * sa + pz * ca;
      }
    }

    out[0] = x; out[1] = y; out[2] = z;
    return out;
  };

  /* ---- colour ---------------------------------------------------------- */

  /* Skin is not one colour and never has been. The lips are darker and
     redder, the cheeks and the tip of the nose catch more blood, the brow and
     the jaw sit in their own shade. All of it authored in linear light,
     because the composite's 1/2.2 will lift it — a skin tone picked to look
     right in the source comes out ashy on screen, which is a specific and
     avoidable way to get a face wrong. */
  FACE.paint = function (out, spec, dx, dy, dz) {
    const R = rig(spec);
    const c = spec.face || {};
    const base = spec.color;
    const lipC = c.lipColor || [0.085, 0.028, 0.026];
    const deep = c.shadeColor || [0.038, 0.017, 0.011];
    const warm = c.warmColor || [0.155, 0.058, 0.038];

    out[0] = base[0]; out[1] = base[1]; out[2] = base[2];

    /* Warmth where the blood is: cheekbones, nose, ears, chin. */
    const flush = M.clamp(
      (at(R.malarL, dx, dy, dz) + at(R.malarR, dx, dy, dz)) * 0.55 +
      at(R.tip, dx, dy, dz) * 0.75 +
      (at(R.earL, dx, dy, dz) + at(R.earR, dx, dy, dz)) * 0.60 +
      at(R.chin, dx, dy, dz) * 0.35, 0, 1);
    M.mix3(out, out, warm, flush * 0.45);

    /* Shade in the sockets, under the brow, and along the jaw — the places a
       face is genuinely darker rather than merely unlit. */
    const shade = M.clamp(
      (at(R.socketL, dx, dy, dz) + at(R.socketR, dx, dy, dz)) * 0.85 +
      (at(R.jawL, dx, dy, dz) + at(R.jawR, dx, dy, dz)) * 0.35 +
      at(R.mentolabial, dx, dy, dz) * 0.5, 0, 1);
    M.mix3(out, out, deep, shade * 0.55);

    /* Lips. The seam is darkest, the vermilion of both lips a shade under the
       surrounding skin — on darker skin the contrast is lower than people
       tend to draw it, and overdoing it is what turns a face into a mask. */
    /* The coloured area is its own feature, sized to the lip, rather than
       whatever three overlapping gaussians happen to add up to. Measured, the
       old mask painted a patch 124 mm across and 58 mm tall onto a face
       155 mm wide — most of the lower half of it — which is precisely the
       shape of the thing this must not be.

       Vermilion also has an edge, which is what the word means; blended as a
       smooth falloff the lips dissolve into the chin and stop being a
       feature at all. So: a hard-ish edge over a small area, at low contrast,
       rather than a soft one over a large area. */
    const lip = M.smoothstep(0.30, 0.72, at(R.vermilion, dx, dy, dz));
    M.mix3(out, out, lipC, lip * (c.lipAmount === undefined ? 0.34 : c.lipAmount));

    /* And the dark behind them. */
    const inner = M.smoothstep(0.20, 0.66, at(R.cavity, dx, dy, dz));
    M.mix3(out, out, c.mouthColor || [0.007, 0.002, 0.003], inner * 0.96);

    /* Eyebrows are painted, not modelled: a brow is hair lying flat on skin,
       and a geometric ridge with no colour reads as a swelling. */
    const brow = M.clamp(
      browMask(R.browL, dx, dy, dz) + browMask(R.browR, dx, dy, dz), 0, 1);
    M.mix3(out, out, c.hairColor || [0.012, 0.009, 0.008], brow * 0.95);

    return out;
  };

  /* The brow itself is wider and thinner than the ridge it sits on, and it
     stops at the inner corner rather than meeting its twin. */
  function browMask(f, dx, dy, dz) {
    const c = f.c;
    const d = dx * c[0] + dy * c[1] + dz * c[2];
    if (d <= 0.2) return 0;
    const ex = dx - c[0] * d, ey = dy - c[1] * d, ez = dz - c[2] * d;
    const u = ex * f.t[0] + ey * f.t[1] + ez * f.t[2];
    const v = ex * f.b[0] + ey * f.b[1] + ez * f.b[2];
    /* Inner end squared off, outer end tapering away. */
    const along = u * (c[0] < 0 ? -1 : 1);
    const taper = M.clamp(1 - Math.max(0, along - 0.06) * 7.0, 0, 1);
    /* 2.4 cm out from its own centre, 0.5 cm top to bottom. */
    const e = wide(2.4) * u * u + fine(0.5) * v * v;
    if (e > 10) return 0;
    return Math.exp(-e) * d * taper;
  }

  /* ---- the parts a radial field cannot express ------------------------- */

  /* Three of them, and each for a different reason. An eyeball is a second
     surface along the same ray as the socket it sits in. An ear is a thin fin
     standing off the skull. Hair is its own volume with its own silhouette.
     Everything else on this head is the body itself. */

  const MAT = { SKIN: 0, SCLERA: 1, GLOSS: 2, HAIR: 3, GLINT: 4 };

  function ellipsoid(unit, centre, axes, radii) {
    const n = unit.positions.length / 3;
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = unit.positions[i * 3] * radii[0];
      const y = unit.positions[i * 3 + 1] * radii[1];
      const z = unit.positions[i * 3 + 2] * radii[2];
      out[i * 3] = centre[0] + axes[0][0] * x + axes[1][0] * y + axes[2][0] * z;
      out[i * 3 + 1] = centre[1] + axes[0][1] * x + axes[1][1] * y + axes[2][1] * z;
      out[i * 3 + 2] = centre[2] + axes[0][2] * x + axes[1][2] * y + axes[2][2] * z;
    }
    return out;
  }

  /* Where the head's surface actually is along a direction, and which way it
     faces there. The head is scaled per axis after the radial sculpt, so the
     surface point is NOT on the ray through `dir` — taking the real point and
     stepping along its own outward direction is what seats an eye correctly
     instead of leaving it hovering. */
  function seat(spec, dx, dy, dz, inset) {
    const d = M.normalized(dx, dy, dz);
    const s = FACE.onSphere([0, 0, 0], spec, d[0], d[1], d[2], null);
    const outward = M.norm3([0, 0, 0], s);
    return {
      c: M.addScaled3([0, 0, 0], s, outward, inset),
      out: outward,
      frame: M.frame(outward)
    };
  }

  /* Cheap cellular noise: distance to the nearest of one feature point per
     grid cell. Two decorrelated fracts of one hash place the point, so a
     sample costs 27 hashes rather than 81.

     Value noise cannot do hair. Hair is not smooth undulation, it is a field
     of discrete rounded clumps packed against each other, and that is exactly
     what the distance to a scattered point set looks like. */
  function hash3(i, j, k) {
    let h = (i * 374761393 + j * 668265263 + k * 1274126177) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function worley(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    let best = 9;
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        for (let c = -1; c <= 1; c++) {
          const gx = ix + a, gy = iy + b, gz = iz + c;
          const h = hash3(gx, gy, gz);
          const px = gx + h;
          const py = gy + (h * 57.31) % 1;
          const pz = gz + (h * 131.77) % 1;
          const ux = px - x, uy = py - y, uz = pz - z;
          const d = ux * ux + uy * uy + uz * uz;
          if (d < best) best = d;
        }
      }
    }
    return Math.sqrt(best);
  }
  /* 1 at the middle of a clump, 0 in the gap between clumps. */
  function clump(x, y, z) {
    const t = M.clamp(1 - worley(x, y, z) / 0.62, 0, 1);
    /* Rounded, not conical. The distance to a point falls off linearly, so
       used raw it builds a cone on every feature and the head grows spines. */
    return t * t * (3 - 2 * t);
  }

  /* Hair as one closed shell rather than a heap of blobs: no intersecting
     spheres to catch the light along their seams, and the edge can be as soft
     as the function that makes it. Over the face the shell's radius drops
     below the head's, so it is simply buried there and the hairline is
     wherever it surfaces.

     What it is *not* is the head plus a constant thickness. That was the
     first version and it is why it read as a swimming cap: offsetting an egg
     gives a slightly larger egg, and an afro is not the shape of the skull
     underneath it. A picked afro is close to its own sphere — the hair stands
     out from the scalp by however much it has grown and then holds a round
     silhouette almost independent of the head inside it. So the shell aims at
     a sphere of its own, fitted to stand `hairMm` off the crown, and blends
     to the scalp at the hairline where the hair is genuinely short. */
  function hairShell(spec) {
    const f = spec.face || {};
    const cm = P.cm(1);
    const stand = (f.hairMm === undefined ? 55 : f.hairMm) * 0.1;    /* cm */

    /* Fit the sphere: it must reach `stand` above the crown and a little less
       than that out at the sides, because an afro is taller than it is wide. */
    const topY = HH + stand;
    const sideR = HW + stand * 0.90;
    const cy = (topY * topY - sideR * sideR) / (2 * topY);
    const Rs = topY - cy;
    const cz = -0.6;                    /* sits a little back off the face */
    const C = [0, cy * cm, cz * cm], Rw = Rs * cm;
    const CC = C[0] * C[0] + C[1] * C[1] + C[2] * C[2] - Rw * Rw;

    /* At subdiv 6 the vertices are about 2.4 mm apart on this shell, which is
       what lets an 8 mm clump exist at all — and the clumps breaking the
       outline is most of the difference between hair and a helmet. */
    const unit = G.icosphere(6);
    const n = unit.positions.length / 3;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const lift = new Float32Array(n);
    const base = f.hairColor || [0.011, 0.008, 0.007];
    const s = [0, 0, 0];

    for (let i = 0; i < n; i++) {
      const dx = unit.positions[i * 3], dy = unit.positions[i * 3 + 1],
        dz = unit.positions[i * 3 + 2];
      FACE.onSphere(s, spec, dx, dy, dz, null);
      const headR = Math.hypot(s[0], s[1], s[2]);

      /* Where the sphere is, along this ray. */
      const b = C[0] * dx + C[1] * dy + C[2] * dz;
      const disc = b * b - CC;
      const afroR = disc > 0 ? b + Math.sqrt(disc) : headR;

      /* The hairline: 7.7 cm up at the forehead, dropping past the temples
         and further down the nape. Plus two things a straight line does not
         have — the temples recede, and no hairline anywhere is a smooth
         curve, so it is roughened by the same noise that makes the clumps. */
      const temple = M.smoothstep(0.45, 0.95, Math.abs(dx)) * Math.max(0, dz);
      /* Barely any wobble on the *line* itself. Moving the hairline is a very
         blunt instrument: in the transition band a few millimetres of shift
         swings the surface most of the way from scalp to dome, so noise on
         the line came out as radial tongues — a mane of spokes round the
         face. The edge gets broken by the clumps instead, below. */
      const wob = (clump(dx * 17.0, dy * 17.0, dz * 17.0) - 0.5) * 0.10;
      const line = (2.0 + 5.4 * dz + 0.7 * temple + wob) / HH;
      /* Nearly a step. The shell has to climb four and a half centimetres
         from the scalp to the dome, and *any* band wide enough to see that
         climb happen reads as a smooth funnel round the face — a collar,
         which is the one thing this cannot be. Done over three millimetres
         of head height it is a cliff instead, and almost all of the cliff is
         inside the head where nobody can see it. What is left outside is a
         crisp hairline with clumps already on it. */
      const k = M.smoothstep(0, 1, M.clamp((dy - line) / 0.030 + 0.5, 0, 1));

      /* Tight coils: a dense field of small round clumps, with a coarser
         lumpiness under them so the mass is not evenly stippled. Both ride on
         `k`, so the hairline stays smooth while the crown is textured. */
      const px = dx * afroR, py = dy * afroR, pz = dz * afroR;
      const fine = clump(px * 15.0, py * 15.0, pz * 15.0);
      const coarse = clump(px * 6.4 + 11, py * 6.4 + 5, pz * 6.4 - 7);
      /* In centimetres, then converted once. Written without that conversion
         the first time, which put a four *centimetre* spike on every clump
         and turned the head into a sea urchin. */
      const bumpCm = ((fine - 0.5) * 0.115 + (coarse - 0.5) * 0.065) * stand;

      /* The clumps come in well before the hair reaches full depth, so the
         hairline is textured rather than a clean curve. Tied to `k` directly
         they faded out exactly where the edge is, which is the one place the
         eye looks for them. */
      const tex = M.clamp(k * 3.2, 0, 1);
      const r = headR + Math.pow(k, 1.35) * Math.max(0, afroR - headR)
        - (1 - k) * (0.9 * stand * cm + 0.02);

      pos[i * 3] = dx * r; pos[i * 3 + 1] = dy * r; pos[i * 3 + 2] = dz * r;
      lift[i] = tex * bumpCm * cm;

      /* Hair is dark, but not evenly dark. What reads is the shadow packed
         into the gaps between the clumps — occlusion baked where the surface
         is already low, which costs nothing and is most of what stops a dark
         mass looking like moulded rubber. Hair this dark also wants a
         *narrow* range: opened up, the clump tops went grey and the whole
         mass read as steel wool. */
      const lit = 0.48 + 0.38 * M.clamp(fine * 0.70 + coarse * 0.45, 0, 1);
      col[i * 3] = base[0] * lit;
      col[i * 3 + 1] = base[1] * lit;
      col[i * 3 + 2] = base[2] * lit;
    }

    /* Second pass: push the clumps out along the surface's own normal rather
       than along the ray from the middle of the head.

       This is the difference between coils and a comb-over. Where the shell
       is steep — the band just above the hairline, where it climbs from the
       scalp to the full depth of the hair — a radial displacement runs almost
       *along* the surface instead of out of it, so the clumps there stretched
       into streaks and the face wore a slicked collar. Along the normal they
       are clumps everywhere, which is what they are. */
    const nrm = G.computeNormals(pos, unit.indices, n);
    for (let i = 0; i < n; i++) {
      const t = lift[i];
      if (t !== 0) {
        pos[i * 3] += nrm[i * 3] * t;
        pos[i * 3 + 1] += nrm[i * 3 + 1] * t;
        pos[i * 3 + 2] += nrm[i * 3 + 2] * t;
      }

      /* Occlusion, from the surface's own orientation. The hair stands off
         the head, so the wall between the hairline and the outside of the
         mass faces sideways and down — it is the underside of the afro, and
         in life it is the darkest part of it, buried under everything above.
         Lit as though it faced outward it came out as a fan of pale spokes
         radiating from the face, which was the last thing here that looked
         like a wig rather than like hair. */
      const dx = unit.positions[i * 3], dy = unit.positions[i * 3 + 1],
        dz = unit.positions[i * 3 + 2];
      const facing = nrm[i * 3] * dx + nrm[i * 3 + 1] * dy + nrm[i * 3 + 2] * dz;
      const occ = 0.16 + 0.84 * M.clamp(facing, 0, 1);
      col[i * 3] *= occ; col[i * 3 + 1] *= occ; col[i * 3 + 2] *= occ;
    }
    return { positions: pos, indices: unit.indices, colors: col };
  }

  /* ---- hands ----------------------------------------------------------- */

  /* A tapered capsule from A to B: the only primitive a hand really needs.
     Built from a unit sphere so both ends are proper hemispheres and the
     middle lofts between the two radii — a plain cylinder with ball ends
     gives a step wherever the radius changes, and a finger changes radius
     along its whole length. */
  function capsule(unit, ax, ay, az, bx, by, bz, r0, r1, flat) {
    const fz = flat === undefined ? 1 : flat;
    const wx = bx - ax, wy = by - ay, wz = bz - az;
    const len = Math.hypot(wx, wy, wz) || 1e-6;
    const w = [wx / len, wy / len, wz / len];
    const fr = M.frame(w);
    const u = fr[0], v = fr[1];
    const n = unit.positions.length / 3;
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = unit.positions[i * 3], y = unit.positions[i * 3 + 1],
        z = unit.positions[i * 3 + 2];
      const t = M.smoothstep(-0.4, 0.4, y);
      const r = r0 + (r1 - r0) * t;
      const c = t * len + y * r;
      const rz = r * fz;
      out[i * 3] = ax + u[0] * x * r + v[0] * z * rz + w[0] * c;
      out[i * 3 + 1] = ay + u[1] * x * r + v[1] * z * rz + w[1] * c;
      out[i * 3 + 2] = az + u[2] * x * r + v[2] * z * rz + w[2] * c;
    }
    return out;
  }

  /* Adult male hand, in millimetres, measured the same way the face is:
     189 mm wrist crease to middle fingertip, 107 mm of that palm, 89 mm
     across the knuckles. Finger lengths from the knuckle are 75, 82, 76 and
     60, and each divides into phalanges at roughly 45 / 27 / 28 per cent.

     The single thing that decides whether this reads as a hand or as a rubber
     glove is that **a relaxed hand is never flat**. Every joint sits at some
     flexion even at rest — about 20 degrees at the knuckle, 40 at the middle
     joint, 15 at the last — and the amount increases from index to little, so
     the fingertips fall along a curve rather than a line. Flat fingers are
     what shop mannequins have and the reason they look dead. */
  FACE.hand = function (spec, side) {
    const parts = { pos: [], col: [], mat: [], idx: [] };
    const seg = G.icosphere(2);
    const ball = G.icosphere(2);
    const mm = 0.01;                       /* 1 mm in world units */
    const f = spec.face || {};
    const skin = spec.color;
    /* Palms and the underside of the fingers are markedly lighter than the
       back of the hand. True of everyone, and leaving it out is most of why
       a monochrome hand reads as a prop. */
    const palmar = f.palmColor ||
      [skin[0] * 1.25 + 0.016, skin[1] * 1.50 + 0.013, skin[2] * 1.65 + 0.009];
    const nail = f.nailColor ||
      [skin[0] * 1.7 + 0.055, skin[1] * 2.0 + 0.040, skin[2] * 2.1 + 0.034];

    /* Everything is authored for a right hand and mirrored for a left. */
    const S = side < 0 ? -1 : 1;

    const add = function (positions, indices, colour, matId, shade) {
      const base = parts.pos.length / 3;
      for (let i = 0; i < positions.length / 3; i++) {
        parts.pos.push(positions[i * 3] * S * mm, positions[i * 3 + 1] * mm,
          positions[i * 3 + 2] * mm);
        if (shade) {
          /* Palmar side is -Z. Blended by how far round the surface has
             turned, so the change is a gradient at the edge of the hand
             rather than a seam down it. */
          const k = M.clamp(-positions[i * 3 + 2] / shade + 0.5, 0, 1);
          const g = M.smoothstep(0, 1, k);
          parts.col.push(
            colour[0] + (palmar[0] - colour[0]) * g,
            colour[1] + (palmar[1] - colour[1]) * g,
            colour[2] + (palmar[2] - colour[2]) * g);
        } else {
          parts.col.push(colour[0], colour[1], colour[2]);
        }
        parts.mat.push(matId);
      }
      for (let i = 0; i < indices.length; i++) parts.idx.push(indices[i] + base);
    };

    /* --- the palm ---
       One solid, not a heap of them. A palm is 89 mm across, 28 mm through
       and 107 mm long: a flat, rounded slab that narrows to the wrist. Built
       out of overlapping ellipsoids it stayed a heap of overlapping
       ellipsoids — you could see every one of them — so it is revolved from a
       single profile and then squashed flat, which is one surface with no
       seams anywhere on it.

       The parts that genuinely do stand off that slab get added to it: the
       thenar pad at the base of the thumb, the hypothenar down the little
       finger's edge, and the knuckles. Those are supposed to be lumps. */
    const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const palm = P.build({
      id: 'palm', rings: 30, segments: 30,
      lengthCm: 13.4, widthCm: 8.9, color: skin,
      /* wrist ......................................... knuckles */
      profile: [0, 0.50, 0.58, 0.64, 0.72, 0.84, 0.95, 1.00, 0.97, 0.76, 0]
    });
    {
      const q = new Float32Array(palm.positions.length);
      for (let i = 0; i < palm.positions.length; i += 3) {
        q[i] = palm.positions[i];
        q[i + 1] = palm.positions[i + 1] + 52;
        /* 28 mm through against 89 across, and a little thinner at the wrist
           end than at the knuckles. */
        q[i + 2] = palm.positions[i + 2] * 0.315;
      }
      add(q, palm.indices, skin, MAT.SKIN, 13);
    }

    const KNUCK = [
      { x: 28, y: 104, z: 2, len: 75, r: 11.0, flex: [0.28, 0.58, 0.24] },  /* index */
      { x: 9.5, y: 107, z: 4, len: 82, r: 11.0, flex: [0.26, 0.56, 0.22] }, /* middle */
      { x: -9.5, y: 103, z: 2, len: 76, r: 10.5, flex: [0.29, 0.62, 0.26] },/* ring */
      { x: -27, y: 95, z: -1, len: 60, r: 9.5, flex: [0.36, 0.70, 0.30] }   /* little */
    ];

    /* The two muscle pads that make a palm a palm, both on the palmar side. */
    add(ellipsoid(G.icosphere(3), [29, 40, -9], I3, [18, 28, 10]),
      G.icosphere(3).indices, skin, MAT.SKIN, 12);
    add(ellipsoid(seg, [-33, 50, -6], I3, [12, 28, 8]), seg.indices, skin, MAT.SKIN, 10);

    /* Metacarpal ridges on the back of the hand, and the knuckle heads. */
    for (let i = 0; i < 4; i++) {
      const k = KNUCK[i];
      add(capsule(seg, k.x * 0.45, 40, 5, k.x, k.y - 12, k.z + 6, 5.5, 7.0, 0.72),
        seg.indices, skin, MAT.SKIN, 0);
      add(ellipsoid(seg, [k.x, k.y - 5, k.z + 1], I3,
        [k.r * 1.08, k.r * 1.02, k.r * 0.90]), seg.indices, skin, MAT.SKIN, k.r * 1.3);
    }

    /* --- the fingers ---
       Slightly wider than they are thick, like real ones. */
    const PHAL = [0.45, 0.27, 0.28];
    const FLAT = 0.86;
    for (let i = 0; i < 4; i++) {
      const k = KNUCK[i];
      /* Fingers converge slightly as they flex, which is why a closed hand
         does not have four parallel fingers. */
      /* Barely any. Relaxed fingers rest against each other; splayed, they
         read as four separate sticks rather than as a hand. */
      const spread = (k.x > 0 ? 1 : -1) * 0.020 * Math.abs(k.x) / 30;
      let px = k.x, py = k.y, pz = k.z, a = 0;
      for (let s = 0; s < 3; s++) {
        a += k.flex[s];
        const L = k.len * PHAL[s];
        let dx = spread * (s === 0 ? 1 : 0.35), dy = Math.cos(a), dz = -Math.sin(a);
        const dl = Math.hypot(dx, dy, dz);
        dx /= dl; dy /= dl; dz /= dl;
        const nx = px + dx * L, ny = py + dy * L, nz = pz + dz * L;
        /* A gentle taper. Stepped harder, each phalanx ended visibly narrower
           than the next one began and the finger read as a string of beads. */
        const r0 = k.r * (1 - s * 0.085), r1 = k.r * (1 - (s + 1) * 0.085);
        add(capsule(seg, px, py, pz, nx, ny, nz, r0, r1, FLAT), seg.indices,
          skin, MAT.SKIN, r0 * 1.4);
        /* A knuckle. Without the swelling at the joints a finger is a cone,
           and cones are what gloves are made of. */
        if (s < 2) {
          add(ellipsoid(ball, [nx, ny, nz], [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
            [r1 * 1.00, r1 * 0.88, r1 * 0.94]), ball.indices, skin, MAT.SKIN, r1 * 1.4);
        }
        /* And a nail on the last one, on the back of the finger. */
        if (s === 2) {
          const mx = px + dx * L * 0.52, my = py + dy * L * 0.52, mz = pz + dz * L * 0.52;
          add(ellipsoid(ball, [mx, my, mz + r1 * 0.72],
            [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
            [r1 * 0.62, L * 0.30, r1 * 0.30]), ball.indices, nail, MAT.SKIN, 0);
        }
        px = nx; py = ny; pz = nz;
      }
    }

    /* --- the thumb ---
       Opposed, which is the whole point of it: it comes off the side of the
       palm and rotates so its pad faces the fingers rather than forward. */
    const TH = [
      { from: [26, 28, -6], to: [46, 50, -19], r0: 13, r1: 11 },
      { from: [46, 50, -19], to: [56, 70, -27], r0: 10.5, r1: 9.2 },
      { from: [56, 70, -27], to: [60, 86, -30], r0: 9.0, r1: 7.4 }
    ];
    for (let i = 0; i < TH.length; i++) {
      const t = TH[i];
      add(capsule(seg, t.from[0], t.from[1], t.from[2], t.to[0], t.to[1], t.to[2],
        t.r0, t.r1, 0.88), seg.indices, skin, MAT.SKIN, t.r0 * 1.4);
      if (i > 0) {
        add(ellipsoid(ball, t.from, [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
          [t.r0 * 1.04, t.r0 * 0.9, t.r0 * 1.06]), ball.indices, skin, MAT.SKIN, t.r0 * 1.4);
      }
    }
    add(ellipsoid(ball, [59, 81, -24], I3, [5.4, 7.2, 3.6]),
      ball.indices, nail, MAT.SKIN, 0);

    const positions = new Float32Array(parts.pos);
    const indices = new Uint32Array(parts.idx);
    return {
      positions: positions,
      normals: G.computeNormals(positions, indices, positions.length / 3),
      colors: new Float32Array(parts.col),
      mats: new Float32Array(parts.mat),
      indices: indices,
      heightUnits: 189 * mm, topUnits: 189 * mm, radiusUnits: 89 * 0.5 * mm
    };
  };

  /* Everything attached, in the same local frame as the head. */
  FACE.mesh = function (spec) {
    const parts = { pos: [], col: [], mat: [], idx: [] };
    const add = function (positions, indices, colour, matId, perVertex) {
      const base = parts.pos.length / 3;
      for (let i = 0; i < positions.length; i++) parts.pos.push(positions[i]);
      for (let i = 0; i < positions.length / 3; i++) {
        if (perVertex) parts.col.push(perVertex[i * 3], perVertex[i * 3 + 1], perVertex[i * 3 + 2]);
        else parts.col.push(colour[0], colour[1], colour[2]);
        parts.mat.push(matId);
      }
      for (let i = 0; i < indices.length; i++) parts.idx.push(indices[i] + base);
    };

    const f = spec.face || {};
    const cm = P.cm(1);
    const mid = G.icosphere(3);
    const small = G.icosphere(2);

    const hair = f.hairColor || [0.012, 0.009, 0.008];
    const sclera = f.scleraColor || [0.52, 0.50, 0.47];
    const iris = f.irisColor || [0.055, 0.030, 0.016];

    /* --- eyes ---
       A real eye is 2.4 cm across whoever it belongs to; it is one of the few
       measurements that barely varies. It sits deep enough in the socket that
       the lids can close over it, which is what makes the blink possible at
       all — the lid is the head, bulging forward. */
    const eyeR = 1.2 * cm;
    for (let e = 0; e < 2; e++) {
      const sx = e === 0 ? -1 : 1;
      /* Seated deep enough that the lids show only the almond between them.
         Sitting it near the surface put two golf balls on the front of the
         head — an eye is mostly hidden, and how much of it is hidden is the
         whole difference between a face and a toy. */
      const e0 = dir(sx * CM.eyeX, CM.eye);
      const a = seat(spec, e0[0], e0[1], e0[2], -eyeR * 0.13);

      /* Wider than it is tall. An eyeball is a sphere, but the part of it
         anyone ever sees is an almond, and the lids that would clip a sphere
         into one are two millimetres of edge — well under the 3.5 mm this
         mesh can resolve. Shaping the ball to the opening gets the read that
         clipping it would have, and costs nothing. */
      add(ellipsoid(mid, a.c, a.frame, [eyeR * 1.10, eyeR * 0.82, eyeR]),
        mid.indices, sclera, MAT.SCLERA);

      /* Eyes converge on what they are looking at. Aimed straight out along
         the socket they diverge by seventeen degrees, and a wall-eyed face is
         unsettling in a way people feel before they can name. */
      const focus = [0, CM.eye * cm, 150 * cm];
      const gaze = M.norm3([0, 0, 0], M.sub3([0, 0, 0], focus, a.c));
      const gf = M.frame(gaze);

      const irisC = M.addScaled3([0, 0, 0], a.c, gaze, eyeR * 0.86);
      add(ellipsoid(small, irisC, gf, [0.58 * cm, 0.58 * cm, 0.26 * cm]),
        small.indices, iris, MAT.GLOSS);

      const pupilC = M.addScaled3([0, 0, 0], a.c, gaze, eyeR * 0.96);
      add(ellipsoid(small, pupilC, gf, [0.26 * cm, 0.26 * cm, 0.14 * cm]),
        small.indices, [0.004, 0.004, 0.005], MAT.GLOSS);

      /* One catchlight, up and to the light side. It is the cheapest thing on
         this model and it does more than the iris does. */
      const gl = M.addScaled3([0, 0, 0], a.c, gaze, eyeR * 0.99);
      M.addScaled3(gl, gl, gf[0], -0.34 * cm);
      M.addScaled3(gl, gl, gf[1], 0.34 * cm);
      add(ellipsoid(small, gl, gf, [0.16 * cm, 0.16 * cm, 0.09 * cm]),
        small.indices, [1, 1, 1], MAT.GLINT);
    }

    /* --- ears ---
       6.2 cm tall, 3.4 cm wide, standing about 1.8 cm off the skull. The
       helix is a flattened disc, the concha a smaller one set into it; at
       this level of detail that is the whole ear and it reads fine. */
    const skin = spec.color;
    const warm = f.warmColor || [0.155, 0.058, 0.038];
    for (let e = 0; e < 2; e++) {
      const sx = e === 0 ? -1 : 1;
      const e1 = dir(sx * 7.6, CM.ear, true);
      const a = seat(spec, e1[0], e1[1], e1[2], -0.5 * cm);
      const u = a.frame[0], v = a.frame[1], w = a.frame[2];

      add(ellipsoid(mid, a.c, [u, v, w], [1.55 * cm, 3.1 * cm, 0.75 * cm]),
        mid.indices, skin, MAT.SKIN);

      const inner = M.addScaled3([0, 0, 0], a.c, w, 0.30 * cm);
      M.addScaled3(inner, inner, u, -0.25 * cm);
      M.addScaled3(inner, inner, v, -0.25 * cm);
      add(ellipsoid(small, inner, [u, v, w], [0.80 * cm, 1.45 * cm, 0.42 * cm]),
        small.indices, warm, MAT.SKIN);
    }

    /* --- hair --- */
    const shell = hairShell(spec);
    add(shell.positions, shell.indices, hair, MAT.HAIR, shell.colors);

    const positions = new Float32Array(parts.pos);
    const indices = new Uint32Array(parts.idx);
    let topUnits = 0;
    for (let i = 1; i < positions.length; i += 3) {
      if (positions[i] > topUnits) topUnits = positions[i];
    }
    return {
      positions: positions,
      normals: G.computeNormals(positions, indices, positions.length / 3),
      colors: new Float32Array(parts.col),
      mats: new Float32Array(parts.mat),
      indices: indices,
      heightUnits: (spec.lengthCm || 23) * cm,
      topUnits: topUnits,
      radiusUnits: (spec.widthCm || 15.5) * 0.5 * cm
    };
  };

  /* ---- the faces ------------------------------------------------------- */

  /* Real adult measurements: 23 cm from chin to crown, 15.5 cm across, 19.5 cm
     front to back. Colour is authored in linear light for the same reason the
     apple's is — the composite's 1/2.2 lifts everything, and a skin tone that
     looks right in the source renders ashy, which is a specific and very
     avoidable way to get a face wrong. */
  NG.K.register([
    {
      id: 'face', name: 'a face',
      match: ['face', 'faces', 'person', 'human', 'man', 'somebody', 'someone',
        'people', 'portrait', 'a head', 'human face'],
      made: true,
      kind: 'face',
      sizeCm: 23, lengthCm: 23, widthCm: 15.5, depthCm: 19.5,
      morphDur: 1.6,

      /* Flesh on bone. The being is deliberately underdamped and the wobble is
         most of its charm, but a jaw dropping on every syllable spread four
         centimetres of ripple across the whole skull. Nothing about that is a
         face. Stiff, and damped near critical, so the jaw and the lips move
         and the back of the head does not. */
      body: { stiffness: 2200, coupling: 150, damping: 60 },

      color: [0.115, 0.046, 0.021],
      skin: 'pores', skinAmt: 0.025, skinShade: 0.11,

      /* Millimetres, from craniofacial anthropometry of adult men. Where the
         population means genuinely differ these are the West-African-descent
         figures; where they do not, they are simply the adult male mean, and
         most of this face is the latter. All of it is checkable, and
         scratchpad/anthro.js measures the built mesh against the range a real
         face occupies rather than against anybody's judgement. */
      face: {
        alarWidth: 42,        /* al-al. ~34 N.European, ~42 W.African */
        bridgeWidth: 15,      /* nasal dorsum */
        noseProjection: 18,   /* pronasale, forward of the face */
        vermilionUpper: 11,   /* ls-sto */
        vermilionLower: 14,   /* sto-li */
        mouthWidth: 54,       /* ch-ch */
        bizygomatic: 141,     /* cheekbone to cheekbone */
        browProjection: 5,    /* supraorbital ridge — a male trait, not a
                                 population one, and set as one */
        chinProjection: 6,

        jawDrop: 0.30,
        hairMm: 46,
        hairColor: [0.011, 0.008, 0.007],
        /* Lip colour contrast on darker skin is *low*. High-contrast lips are
           the single most recognisable marker of the caricature tradition
           this is being kept well clear of, so the lips are defined by their
           shape — vermilion has an edge, which is what the word means — and
           barely at all by their colour. */
        lipColor: [0.098, 0.040, 0.034],
        lipAmount: 0.34,
        shadeColor: [0.036, 0.015, 0.009],
        warmColor: [0.165, 0.062, 0.036],
        /* And sclera is not white. Bright eyes against dark skin is the other
           marker, and a real sclera is a soft grey-ivory on anyone. */
        scleraColor: [0.225, 0.212, 0.196],
        irisColor: [0.048, 0.026, 0.014]
      },

      family: 'people, and I am not one',
      binomial: 'Homo sapiens, which is a thing I am wearing and not a thing I am',
      type: 'a face',
      origin: 'about three hundred thousand years of them',
      ancestor: null,
      facts: [
        'you found this face before you finished reading this sentence. There is a patch behind your right ear that does nothing else, and it fires about a sixth of a second after light hits your eye — faster than you can decide to look',
        'that patch is why you see faces in plug sockets and clouds. It would rather be wrong than slow, and evolution agreed with it',
        'your own face is not symmetric and never was. Mirror either half onto itself and you get two people, neither of whom is you',
        'the eye is 2.4 cm across in a newborn and about 2.4 cm across in an adult. Almost nothing else about you does that',
        'there are around forty-three muscles in here, and a genuine smile uses one you cannot fire on purpose — the ring around the eye. That is the entire difference between a smile and a photograph of one'
      ],
      taste: 'like a question I am going to pretend you did not ask'
    }
  ]);

  NG.FACE = FACE;
})(window.NG = window.NG || {});
