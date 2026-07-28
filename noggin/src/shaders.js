/* NOGGIN — GLSL ES 3.00 shader sources. */
(function (NG) {
  'use strict';

  const S = {};

  /* Attribute locations are fixed so one VAO can feed several programs. */
  S.LOC = { POS: 0, NOR: 1, COL: 2, MAT: 3, STRETCH: 4 };

  const COMMON = `
const float PI = 3.14159265;

vec3 acesFilm(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

/* Value noise, and a cell pattern built from it. There are no textures here
   and there is not going to be: everything a surface needs has to be a
   function of position, which is also why it costs nothing to ship. */
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
             mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}

/* Rough cellular distance: how close this point is to the middle of a cell.
   Real Worley would want 27 neighbour lookups; two octaves of value noise
   pushed through a curve gets close enough for skin at a fraction of it. */
float cells(vec3 p) {
  float a = vnoise(p);
  float b = vnoise(p * 2.03 + 11.7);
  return clamp(a * 0.72 + b * 0.28, 0.0, 1.0);
}
`;

  /* ---- fullscreen triangle -------------------------------------------- */

  S.fullscreenVS = `#version 300 es
out vec2 vUV;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUV = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  /* ---- background ------------------------------------------------------ */

  S.bgFS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform vec3 uRayF, uRayR, uRayU;
uniform float uTime;
uniform vec3 uTopColor, uBotColor, uGlowColor;
uniform float uGlow;
out vec4 oColor;
${COMMON}

void main() {
  vec2 ndc = vUV * 2.0 - 1.0;
  vec3 dir = normalize(uRayF + uRayR * ndc.x + uRayU * ndc.y);

  // Seamless sweep: a lit backdrop, not a sky.
  float h = dir.y * 0.5 + 0.5;
  vec3 col = mix(uBotColor, uTopColor, pow(h, 0.9));

  // Soft pool of light behind the subject.
  float d = length(ndc * vec2(0.85, 1.0));
  col += uGlowColor * uGlow * pow(max(0.0, 1.0 - d * 0.55), 3.5);

  oColor = vec4(col, 1.0);
}`;

  /* ---- surface (head, eyes, brows, hair) ------------------------------- */

  S.surfaceVS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNor;
layout(location = 2) in vec3 aCol;
layout(location = 3) in float aMat;
layout(location = 4) in float aStretch;

uniform mat4 uModel;
uniform mat4 uViewProj;
uniform mat4 uLightVP;
uniform float uTime;
uniform float uGas;      /* 0 = a surface, 1 = a cloud of itself */
uniform float uBoil;     /* 0..1, spikes while it is changing state */
uniform float uVoice;    /* 0..1, rises while it is speaking */
uniform float uMorph;    /* 0 = itself, 1 = fully wearing a form */
uniform vec3 uFocusDir;  /* world direction its attention is on */

/* Speech ripple. Deliberately faint — the swell carries the speaking, and a
   violent ripple reads as a struggling membrane rather than as a voice. What
   is left is enough surface motion that a growing sphere does not look like a
   balloon being inflated. */
const float RIPPLE_K = 9.0;
const float RIPPLE_W = 22.0;
const float RIPPLE_A = 0.010;
const float RIPPLE_R = 1.15;   /* nominal radius, for the normal tilt */

out vec3 vWPos;
out vec3 vNor;
out vec3 vCol;
out float vMat;
out float vStretch;
out vec4 vLPos;
out vec3 vObj;   /* unit direction on the body: where the skin lives */

void main() {
  vec3 p = aPos;
  /* A gas has no surface to hold still. Three interfering sines push the
     shell along its own normal so the cloud churns rather than sitting there
     being a lumpy ball. The solver never sees this, so picking and the camera
     fit still work against the shape underneath. */
  if (uGas > 0.001 || uBoil > 0.001) {
    float n = sin(p.x * 2.6 + uTime * 1.7)
            * sin(p.y * 2.2 - uTime * 1.3)
            * sin(p.z * 2.9 + uTime * 1.9);
    /* Boiling seethes harder and faster than settled vapour does. */
    float fast = sin(p.x * 4.1 - uTime * 5.6)
               * sin(p.y * 3.6 + uTime * 4.9)
               * sin(p.z * 4.4 - uTime * 6.2);
    p += normalize(aNor) * (n * 0.34 * uGas + fast * 0.22 * uBoil);

    /* A puddle inflating into a ball is a balloon, not evaporation. While it
       is boiling the mass is drawn upward into a plume and pinched inward, so
       it leaves the ground before it opens out. */
    if (uBoil > 0.001) {
      p.y += uBoil * (0.95 + 0.55 * p.y);
      p.xz *= 1.0 - 0.32 * uBoil;
    }
  }

  vec3 nrm = normalize(aNor);
  vec3 wn = mat3(uModel) * nrm;

  /* Speaking shakes it. The wave travels in the angle from the focal point —
     the point that carries its attention — so the ripple radiates from where
     the voice is coming from and dies away round the back. Gated on the shell
     material, because props go through this same program and a talking apple
     should not be rippling too. */
  if (uVoice > 0.001 && aMat > 4.5 && aMat < 5.5) {
    vec3 wnn = normalize(wn);
    vec3 f = normalize(uFocusDir);
    float c = clamp(dot(wnn, f), -1.0, 1.0);
    float band = acos(c);
    float phase = band * RIPPLE_K - uTime * RIPPLE_W;
    /* Off entirely once it is wearing something: whatever it has become
       should hold still. */
    float amp = RIPPLE_A * uVoice * (1.0 - uMorph) * exp(-band * 0.35)
              * (1.0 - 0.7 * uGas)
              * (0.75 + 0.25 * sin(uTime * 5.3 + band * 3.0));
    p += nrm * sin(phase) * amp;

    /* Tilt the normal to match. Without this the ripple only shows on the
       silhouette and the surface it is crossing stays glassy and still —
       and it is the iridescence bending that sells it, not the outline. */
    vec3 t = f - wnn * c;                        /* tangent, toward the focus */
    float tl = length(t);
    if (tl > 1e-4) {
      float dh = amp * RIPPLE_K * cos(phase);    /* d(height) / d(band) */
      wn = normalize(wnn + (t / tl) * (dh / RIPPLE_R));
    }
  }

  vec4 wp = uModel * vec4(p, 1.0);
  vWPos = wp.xyz;
  vNor = wn;
  /* Normalised, so a pineapple has the same number of cells whatever size
     it is — skin is counted in features, not in centimetres. */
  vObj = normalize(aPos + vec3(1e-6));
  vCol = aCol;
  vMat = aMat;
  vStretch = aStretch;
  // Normal-offset the shadow lookup to kill acne on the curved skin.
  vLPos = uLightVP * vec4(wp.xyz + normalize(wn) * 0.035, 1.0);
  gl_Position = uViewProj * wp;
}`;

  S.surfaceFS = `#version 300 es
precision highp float;
in vec3 vWPos;
in vec3 vNor;
in vec3 vCol;
in float vMat;
in float vStretch;
in vec4 vLPos;
in vec3 vObj;

uniform vec3 uEye;
uniform vec3 uLightDir, uLightColor;
uniform vec3 uFillDir, uFillColor;
uniform vec3 uAmbSky, uAmbGround;
uniform vec3 uRimColor, uSSSColor;
uniform vec3 uStretchTint, uStretchGlow;
uniform highp sampler2DShadow uShadow;
uniform vec2 uShadowTexel;
uniform float uTime;
uniform float uHighlightAmount;
uniform vec3 uFocusDir;      /* world direction it is attending to */
uniform vec3 uFocusColor;
uniform vec3 uCoreColor;
uniform float uVoice;        /* 0..1, rises while it is speaking */
uniform float uMorph;        /* 0 = itself, 1 = fully wearing a form */
uniform vec3 uFormColor;
uniform float uGas;          /* 0 = a surface, 1 = a cloud of itself */
uniform float uInert;        /* 0 = alive and looking at you, 1 = an object */
uniform float uSkin;         /* which procedural surface, 0 for none */
uniform float uSkinAmt;      /* how far the skin pushes the normal */
uniform float uSkinShade;    /* how far it darkens the pits */
uniform float uPaint;        /* 1 = the form is painted per vertex */

out vec4 oColor;
${COMMON}

float ggx(vec3 N, vec3 V, vec3 L, float rough) {
  vec3 H = normalize(V + L);
  float a = max(rough * rough, 0.002);
  float a2 = a * a;
  float NdH = max(dot(N, H), 0.0);
  float NdV = max(dot(N, V), 1e-4);
  float NdL = max(dot(N, L), 0.0);
  float den = NdH * NdH * (a2 - 1.0) + 1.0;
  float D = a2 / (PI * den * den);
  float k = a * 0.5;
  float G = (NdV / (NdV * (1.0 - k) + k)) * (NdL / (NdL * (1.0 - k) + k));
  return D * G;
}

/* Surface detail at a point on the body. Two numbers, not one: x is relief,
   which bends the light, and y is tint, which only says how pale the skin is
   there.

   They started as a single value and that was a real mistake. An apple's
   stripes are pigment with no depth whatsoever, and feeding them to the bump
   chopped the highlight into three mirror blobs and washed the red underneath
   out to salmon. A freckle on a banana is not a dent either. Anything that is
   colour has to be able to say so.

   One branch per kind of skin, all of them cheap, none of them needing a
   single byte of texture. */
vec2 skinDetail(int kind, vec3 q, float fine) {
  if (kind == 1) {
    /* Citrus. Oil glands: pits sunk into an otherwise taut skin, with a
       slow swell underneath so it is not evenly stippled. */
    float pit = -pow(cells(q * 13.0), 2.0) * fine;
    float swell = 0.30 * vnoise(q * 4.0);
    return vec2(pit + swell, pit + swell);
  }
  if (kind == 2) {
    /* Pineapple. Fruitlets are separate flowers fused together, and they
       land on a diamond lattice wrapping the body — two helices crossing.
       Here relief and shade genuinely are the same thing: the dark is the
       groove between the fruitlets. */
    float u = atan(q.z, q.x);
    float v = asin(clamp(q.y / max(length(q), 1e-4), -1.0, 1.0));
    float d = abs(sin(6.0 * u + 7.0 * v)) * abs(sin(6.0 * u - 7.0 * v));
    float h = (pow(d, 0.45) - 0.5) * fine;
    return vec2(h, h);
  }
  if (kind == 3) {
    /* Strawberry. The seeds are the actual fruits, and each one sits in its
       own dimple — the pit around the pip is most of the read. */
    float c = cells(q * 11.0);
    float seed = smoothstep(0.62, 0.86, c);
    float h = (seed * 0.9 - smoothstep(0.30, 0.62, c) * 0.55) * fine;
    return vec2(h, h);
  }
  if (kind == 4) {
    /* Banana. Faint ridges down its length, freckles scattered over them.
       A freckle is bruised pigment and ought to be flat, but most of what
       makes these read is the pit the bump gives them, so relief and tint
       stay tied here until there is a reason to separate them. */
    float ridge = sin(atan(q.z, q.x) * 5.0) * 0.18;
    float freckle = smoothstep(0.80, 0.95, cells(q * 10.0));
    float h = ridge - freckle * 0.5 * fine;
    return vec2(h, h);
  }
  /* Waxy skins — apples, chillies, tomatoes. Two things carry the read.
     Lenticels, the pores the fruit breathes through: pale flecks, with a
     whisper of relief because giving them any real depth turned them into
     bruises. And striping, which is emphatically not a sine wave — real
     stripes vary in width, drift, and some of them stop halfway up. Noise
     squashed along the axis streaks into meridians, which is the direction
     the pigment actually runs, and costs the same as a sine would. */
  float lenticel = smoothstep(0.86, 0.99, cells(q * 21.0)) * fine;
  float stripe = (vnoise(vec3(q.x, q.y * 0.13, q.z) * 5.0) - 0.5) * 1.6;
  float mottle = 0.10 * vnoise(q * 4.0);
  return vec2(lenticel * 0.18, lenticel * 0.40 + stripe + mottle);
}

/* How much fine detail this pixel can actually resolve. Once a feature is
   smaller than the pixel showing it there is nothing left but static, so the
   fine terms fade out rather than sparkling — the same reason textures have
   mipmaps, arrived at without one. */
float skinFine(vec3 q, float freq) {
  return 1.0 - smoothstep(0.10, 0.45, length(fwidth(q)) * freq);
}

/* Bump without a parametrisation. The surface has no UVs and never will, so
   the gradient of the height is recovered from screen-space derivatives —
   Mikkelsen's method. This is what turns a height function into something the
   light actually catches. */
vec3 bumpNormal(vec3 N, vec3 wpos, float h, float strength) {
  vec3 dpdx = dFdx(wpos), dpdy = dFdy(wpos);
  float dhdx = dFdx(h), dhdy = dFdy(h);
  vec3 r1 = cross(dpdy, N), r2 = cross(N, dpdx);
  float det = dot(dpdx, r1);
  if (abs(det) < 1e-12) return N;
  vec3 grad = (r1 * dhdx + r2 * dhdy) / det;
  return normalize(N - grad * strength);
}

float sampleShadow(vec4 lpos) {
  vec3 p = lpos.xyz / lpos.w;
  p = p * 0.5 + 0.5;
  if (p.z > 1.0 || p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return 1.0;
  float s = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      s += texture(uShadow, vec3(p.xy + vec2(float(x), float(y)) * uShadowTexel, p.z - 0.0016));
    }
  }
  return s / 9.0;
}

void main() {
  vec3 N = normalize(vNor);
  if (!gl_FrontFacing) N = -N;

  /* Skin first, so everything downstream lights the bumped surface rather
     than a smooth one with a pattern painted on it. */
  vec3 Ng = N;                 /* geometric: what the silhouette is made of */
  float skinT = 1.0;
  if (uSkin > 0.5) {
    vec2 sk = skinDetail(int(uSkin + 0.5), vObj, skinFine(vObj, 20.0));
    N = bumpNormal(N, vWPos, sk.x, uSkinAmt);
    skinT = clamp(1.0 + sk.y * uSkinShade, 0.30, 1.7);
  }

  vec3 V = normalize(uEye - vWPos);
  vec3 L = normalize(uLightDir);
  float m = vMat;

  float ndvAll = clamp(dot(N, V), 0.0, 1.0);
  /* Everything view-angle driven — the film, the sheen, the rim — reads the
     geometric normal. Run through the bumped one instead and every speckle on
     an apple catches its own rainbow, which is exactly what the first attempt
     at pitting looked like. */
  float ndvGeo = clamp(dot(Ng, V), 0.0, 1.0);

  // Wireframe overlays: emissive filament, brightest edge-on.
  if (m > 5.5) {
    float edge = pow(1.0 - ndvAll, 1.4);
    oColor = vec4(vCol * (0.5 + 2.6 * edge) * (0.8 + 0.4 * uVoice), 1.0);
    return;
  }

  // The being itself: a thin-film shell over a lit core.
  if (m > 4.5) {
    float st2 = clamp(vStretch * 0.9, 0.0, 1.0);

    // Thin-film interference. Film thickness varies with view angle and drifts
    // slowly over the surface, so the hue sweeps the way an oil film does.
    float f = pow(1.0 - ndvGeo, 1.5);
    float flow = sin(vWPos.y * 2.7 + uTime * 0.35)
               + sin(vWPos.x * 2.1 - uTime * 0.27)
               + sin(vWPos.z * 2.4 + uTime * 0.31);
    float phase = f * 2.6 + flow * 0.11 + uTime * 0.05 + st2 * 0.5;
    vec3 iri = 0.5 + 0.5 * cos(6.28318 * (phase + vec3(0.0, 0.33, 0.67)));

    // Lit core showing through the middle, iridescence gathering at the rim.
    vec3 col = uCoreColor * (0.09 + 0.30 * ndvAll);
    /* Pearl, not tie-dye: light through the middle, spectrum gathering
       outward. The film reaches full saturation well before the silhouette so
       the bands stay visible across the body. */
    vec3 film = mix(vec3(0.88, 0.92, 1.0), iri, clamp(f * 1.15, 0.0, 1.0));
    col += film * (0.17 + 1.40 * f);

    // A crisp specular keeps it reading as a surface, not a fog.
    col += uLightColor * ggx(N, V, L, 0.12) * 0.5;

    // The focal point: with no face, this is the only thing that can show
    // where its attention is, so it carries all of the looking.
    float focus = pow(max(dot(N, normalize(uFocusDir)), 0.0), 13.0);
    col += uFocusColor * focus * (1.5 + 0.8 * uVoice);

    // Speech travels outward from the focal point as concentric rings. Same
    // wave the vertex stage is riding, so the bright bands sit on the crests
    // of the ripple rather than beating against them.
    if (uVoice > 0.001) {
      float band = acos(clamp(dot(N, normalize(uFocusDir)), -1.0, 1.0));
      float wave = 0.5 + 0.5 * sin(band * 9.0 - uTime * 22.0);
      col += iri * wave * uVoice * (1.0 - uMorph) * 0.10 * exp(-band * 0.35);
    }

    // Pulled hard, the shell stresses and glows along the strain.
    col += vec3(0.55, 0.80, 1.15) * pow(st2, 1.8) * 1.1;

    // Wearing a form: the same body, lit as the thing it has become. A little
    // interference is left along the rim so it never stops being itself.
    if (uMorph > 0.001) {
      float shf = sampleShadow(vLPos);
      float ndl = dot(N, L);
      float wrap = clamp((ndl + 0.35) / 1.35, 0.0, 1.0);
      vec3 amb = mix(uAmbGround, uAmbSky, N.y * 0.5 + 0.5);
      vec3 paint = (uPaint > 0.5 ? vCol : uFormColor) * skinT;
      vec3 form = paint * (uLightColor * wrap * mix(1.0, shf, 0.8) + amb + uFillColor * 0.45);
      /* Car paint, not satin plastic: a tight highlight rather than a broad
         one. At 0.30 roughness the lobe smeared a white band down the entire
         flank of anything with a large flat panel.

         Fruit is the opposite problem. Wax over a scattering surface gives a
         highlight that is broad and weak, and the tight lobe put three hard
         mirror spots on an apple's shoulder. Whether a form has skin is
         already the question of whether it is a made thing or a grown one, so
         it can decide this too. */
      float rough = uSkin > 0.5 ? 0.34 : 0.17;
      form += uLightColor * ggx(N, V, L, rough) * (uSkin > 0.5 ? 0.13 : 0.22);
      // The film along the rim and the focal point are the two things that
      // make it look inhabited, so an inert body has to lose both — otherwise
      // turning to stone just tints a thing that is still obviously awake.
      /* A rim of its own interference, so it never stops being itself.
         Deliberately not the shell's own interference: that one drifts with world
         position, which is invisible across a 23 cm sphere and bands a 4.5 m
         car like an oil slick. This one depends on view angle alone, so it
         behaves the same whatever size the thing has become, and it is tight
         enough to stay an edge rather than a wash. */
      vec3 sheen = 0.5 + 0.5 * cos(6.28318 * (f * 1.6 + uTime * 0.05
                 + vec3(0.0, 0.33, 0.67)));
      /* No focal point here. It is a tight spot on a sphere because the normal
         turns away fast; a car's flank is one normal over two square metres,
         so the whole side lit up. It is the being's own tell in any case, and
         whatever it has become does not get to keep it. */
      form += sheen * pow(1.0 - ndvGeo, 5.0) * 0.12 * (1.0 - uInert);
      // What replaces them is a plain rim light, so a dark solid still has an
      // edge against a dark room instead of reading as a hole.
      form += uRimColor * pow(1.0 - ndvGeo, 3.2) * 0.35 * uInert;
      col = mix(col, form, uMorph);
    }

    // Vapour. Nothing here is a surface any more: brightness comes from how
    // much of it you are looking through, so the silhouette goes soft and the
    // middle nearly vanishes. Alpha is the accumulation weight — the renderer
    // draws this additively, front and back faces both, so the cloud is
    // thickest exactly where there is most of it in the way.
    float alpha = 1.0;
    if (uGas > 0.001) {
      // Two octaves of drifting noise, squared. A single smooth term left the
      // shell looking like frosted glass; the point of the square is to make
      // the density patchy rather than evenly hazy.
      float n1 = sin(vWPos.x * 5.1 + uTime * 1.9)
               * sin(vWPos.y * 4.3 - uTime * 1.5)
               * sin(vWPos.z * 4.7 + uTime * 1.7);
      float n2 = sin(vWPos.x * 11.3 - uTime * 2.7)
               * sin(vWPos.y * 9.7 + uTime * 2.2)
               * sin(vWPos.z * 10.9 - uTime * 3.1);
      float churn = clamp(0.5 + 0.55 * n1 + 0.30 * n2, 0.0, 1.0);
      // Thin toward the silhouette, not thick: a cloud has no edge, and
      // brightening the rim is exactly what made it look like an object.
      float body = ndvAll;
      vec3 vapour = (uCoreColor * 0.5 + vec3(0.55, 0.62, 0.78)) * (0.35 + 0.90 * churn);
      vapour += uFocusColor * focus * 0.6;
      col = mix(col, vapour, uGas);
      // Squared, so the density falls off hard toward the silhouette and the
      // closed shell stops having a visible outline at all.
      alpha = mix(1.0, 0.26 * (0.12 + churn * churn * 1.5) * (0.03 + 0.97 * body * body), uGas);
    }

    oColor = vec4(col, alpha);
    return;
  }

  // Pure emissive material for the eye glints.
  if (m > 3.5) {
    oColor = vec4(vCol * (1.45 + uHighlightAmount * 0.5), 1.0);
    return;
  }

  float rough = 0.55, specI = 0.07, sssAmt = 1.0;
  if (m > 0.5 && m < 1.5)      { rough = 0.15; specI = 0.45; sssAmt = 0.12; }
  else if (m > 1.5 && m < 2.5) { rough = 0.09; specI = 0.70; sssAmt = 0.0;  }
  else if (m > 2.5)            { rough = 0.62; specI = 0.10; sssAmt = 0.05; }

  float st = clamp(vStretch * 0.72, 0.0, 1.0);
  vec3 base = vCol * skinT;
  if (m < 0.5) base = mix(base, uStretchTint, st * 0.8);

  float sh = sampleShadow(vLPos);
  float ndl = dot(N, L);

  // Wrapped diffuse reads as soft skin without a full BSSRDF.
  float wrap = clamp((ndl + 0.4) / 1.4, 0.0, 1.0);
  vec3 diffuse = uLightColor * wrap * mix(1.0, sh, 0.85);

  // Cheap forward-scatter term: light bleeding through thin stretched parts.
  float back = clamp(-ndl * 0.5 + 0.5, 0.0, 1.0);
  float thin = clamp(st * 1.4 + 0.15, 0.0, 1.0);
  vec3 sss = uSSSColor * pow(back, 2.2) * sssAmt * thin * 0.55;

  float ndf = clamp(dot(N, normalize(uFillDir)) * 0.5 + 0.5, 0.0, 1.0);
  vec3 fill = uFillColor * ndf * 0.55;

  vec3 ambient = mix(uAmbGround, uAmbSky, N.y * 0.5 + 0.5);

  vec3 lit = base * (diffuse + fill + ambient + sss);

  float spec = ggx(N, V, L, rough) * specI * sh;
  lit += uLightColor * spec;

  float ndv = ndvGeo;
  // Rim light is reflected light, so a black surface should barely take any.
  // Without this a tyre picks up the same warm edge as a lemon and reads as
  // grey plastic.
  float rim = pow(1.0 - ndv, 3.2);
  float reflectivity = 0.22 + 0.78 * dot(base, vec3(0.3333));
  lit += uRimColor * rim * (0.45 + 0.9 * st) * reflectivity;

  // Rubber under tension goes hot: direct visual feedback for how far the
  // player has pulled a region.
  lit += uStretchGlow * pow(st, 2.4) * 0.9;

  oColor = vec4(lit, 1.0);
}`;

  /* ---- shadow depth pass ----------------------------------------------- */

  S.depthVS = `#version 300 es
layout(location = 0) in vec3 aPos;
uniform mat4 uModel;
uniform mat4 uLightVP;
void main() {
  gl_Position = uLightVP * uModel * vec4(aPos, 1.0);
}`;

  S.depthFS = `#version 300 es
precision highp float;
void main() {}`;

  /* ---- floor ------------------------------------------------------------ */

  S.floorVS = `#version 300 es
layout(location = 0) in vec3 aPos;
uniform mat4 uViewProj;
uniform mat4 uLightVP;
out vec3 vWPos;
out vec4 vLPos;
void main() {
  vWPos = aPos;
  vLPos = uLightVP * vec4(aPos, 1.0);
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

  S.floorFS = `#version 300 es
precision highp float;
in vec3 vWPos;
in vec4 vLPos;
uniform vec3 uEye;
uniform vec3 uGridColor, uFloorColor;
uniform vec3 uPoolPos, uPoolColor;
uniform highp sampler2DShadow uShadow;
uniform vec2 uShadowTexel;
uniform float uTime;
uniform float uFade;      /* how far the floor reaches before it goes */
out vec4 oColor;
${COMMON}

float gridMask(vec2 p, float step) {
  vec2 q = p / step;
  vec2 g = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), 1e-5);
  return 1.0 - min(min(g.x, g.y), 1.0);
}

void main() {
  float d = length(vWPos.xz);
  /* The room grows with the subject: a 4.5 m car standing on a floor that
     runs out at 2.6 m looks like it is parked on a rug. */
  float fade = smoothstep(uFade, uFade * 0.15, d);
  if (fade <= 0.001) discard;

  vec3 p = vLPos.xyz / vLPos.w * 0.5 + 0.5;
  float sh = 1.0;
  if (p.z <= 1.0 && p.x > 0.0 && p.x < 1.0 && p.y > 0.0 && p.y < 1.0) {
    float s = 0.0;
    for (int y = -2; y <= 2; y++) {
      for (int x = -2; x <= 2; x++) {
        s += texture(uShadow, vec3(p.xy + vec2(float(x), float(y)) * uShadowTexel * 1.6, p.z - 0.004));
      }
    }
    sh = s / 25.0;
  }

  /* One line per 10 cm up close; coarser once the shot is wide enough that
     the fine grid would alias into a haze. */
  float step0 = uFade > 60.0 ? 10.0 : (uFade > 26.0 ? 5.0 : 1.0);
  float g = gridMask(vWPos.xz, step0);
  vec3 col = uFloorColor + uGridColor * g;
  /* A luminous body should light the table under it, and a hard black
     shadow under something emissive reads as a contradiction. */
  col *= mix(0.45, 1.0, sh);
  float pd = length(vWPos.xz - uPoolPos.xz);
  col += uPoolColor * exp(-pd * pd * 0.16);
  col *= fade;

  oColor = vec4(col, 1.0);
}`;

  /* ---- post: bloom prefilter, blur, composite ---------------------------- */

  S.brightFS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uScene;
uniform float uThreshold, uKnee;
out vec4 oColor;
void main() {
  vec3 c = texture(uScene, vUV).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float w = smoothstep(uThreshold, uThreshold + uKnee, l);
  oColor = vec4(c * w, 1.0);
}`;

  S.blurFS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uSource;
uniform vec2 uDirection;
out vec4 oColor;
void main() {
  // 9-tap gaussian folded into 5 linearly-filtered taps.
  const float o1 = 1.3846153846;
  const float o2 = 3.2307692308;
  vec3 c = texture(uSource, vUV).rgb * 0.2270270270;
  c += texture(uSource, vUV + uDirection * o1).rgb * 0.3162162162;
  c += texture(uSource, vUV - uDirection * o1).rgb * 0.3162162162;
  c += texture(uSource, vUV + uDirection * o2).rgb * 0.0702702703;
  c += texture(uSource, vUV - uDirection * o2).rgb * 0.0702702703;
  oColor = vec4(c, 1.0);
}`;

  S.compositeFS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomIntensity;
uniform float uExposure;
uniform float uVignette;
uniform float uAberration;
uniform float uTime;
out vec4 oColor;
${COMMON}

void main() {
  vec2 uv = vUV;
  vec2 off = (uv - 0.5) * uAberration;
  vec3 c;
  if (uAberration > 0.00002) {
    c.r = texture(uScene, uv + off).r;
    c.g = texture(uScene, uv).g;
    c.b = texture(uScene, uv - off).b;
  } else {
    c = texture(uScene, uv).rgb;
  }

  c += texture(uBloom, uv).rgb * uBloomIntensity;
  c *= uExposure;
  c = acesFilm(c);

  float v = length((uv - 0.5) * vec2(1.0, 0.92));
  c *= 1.0 - uVignette * pow(clamp(v * 1.5, 0.0, 1.0), 2.2);

  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  // Ordered-ish dither removes banding in the dark backdrop gradient.
  c += (hash12(gl_FragCoord.xy + uTime) - 0.5) / 255.0;

  oColor = vec4(c, 1.0);
}`;

  NG.S = S;
})(window.NG = window.NG || {});
