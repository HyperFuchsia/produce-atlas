/**
 * The sky is described once, in GLSL, and reused twice: the dome draws it
 * directly and the ocean samples it along the reflection vector. That is what
 * keeps the sun column on the water perfectly in step with the sun in the sky.
 */

export const NOISE_GLSL = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * vnoise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return sum;
}
`;

/** Uniform block shared by the dome and the ocean. */
export const SKY_UNIFORMS_GLSL = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uUpper;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSunCore;
uniform vec3 uSunGlow;
uniform vec3 uCloudDark;
uniform vec3 uCloudLit;
uniform vec3 uSunDir;
uniform float uSunSize;
uniform float uBands;
uniform float uTime;
`;

export const SKY_FUNCTION_GLSL = /* glsl */ `
/** Retro horizontal slats carved out of the sun, thickening downwards. */
float sunSlats(float sy) {
  float slats = smoothstep(0.30, 0.60, fract(sy * uBands + 0.18));
  float amount = smoothstep(0.42, -1.05, sy);
  return mix(1.0, slats, amount);
}

/**
 * @param dir    view direction, does not need to be normalised
 * @param stars  1.0 to include the star field (dome only)
 */
vec3 atlasSky(vec3 dir, float stars) {
  vec3 d = normalize(dir);
  float h = d.y;

  // Vertical gradient: horizon -> mid -> upper -> zenith.
  vec3 col = uHorizon;
  col = mix(col, uMid, smoothstep(-0.015, 0.17, h));
  col = mix(col, uUpper, smoothstep(0.11, 0.44, h));
  col = mix(col, uZenith, smoothstep(0.40, 0.98, h));
  // Rays that dip below the horizon (reflections) settle into the horizon tone.
  col = mix(uHorizon * 0.62, col, smoothstep(-0.22, 0.005, h));

  // --- sun -----------------------------------------------------------------
  float dsun = distance(d, normalize(uSunDir));
  float sy = (h - normalize(uSunDir).y) / uSunSize;
  float slat = sunSlats(sy);

  float core = 1.0 - smoothstep(uSunSize * 0.90, uSunSize * 1.0, dsun);
  float glow = exp(-(dsun * dsun) / (uSunSize * uSunSize * 2.6));
  float halo = pow(max(0.0, 1.0 - dsun * 0.55), 7.0);

  col = mix(col, uSunCore, core * slat);
  col += uSunGlow * glow * 0.40 * mix(0.25, 1.0, slat);
  col += uSunGlow * halo * 0.16;

  // --- stretched horizon cloud bands --------------------------------------
  float az = atan(d.x, -d.z);
  float cl = fbm(vec2(az * 2.4 + uTime * 0.008, h * 11.0 - uTime * 0.004));
  float band = smoothstep(0.50, 0.86, cl);
  float belt = smoothstep(0.52, 0.05, h) * smoothstep(0.002, 0.05, h);
  float lit = clamp(glow * 1.4 + halo * 0.9, 0.0, 1.0);
  col = mix(col, mix(uCloudDark, uCloudLit, lit), band * belt * 0.6);

  // Hot seam where sky meets water.
  col += uSunGlow * 0.13 * exp(-abs(h) * 46.0);

  // --- stars ---------------------------------------------------------------
  if (stars > 0.5) {
    vec2 sp = vec2(az, asin(clamp(h, -1.0, 1.0))) * 34.0;
    vec2 cell = floor(sp);
    float r = hash21(cell);
    float present = step(0.982, r);
    vec2 jitter = (vec2(hash21(cell + 3.17), hash21(cell + 7.71)) - 0.5) * 0.55;
    vec2 fp = fract(sp) - 0.5 - jitter;
    float point = exp(-dot(fp, fp) * 110.0) * present;
    float twinkle = 0.6 + 0.4 * sin(uTime * 2.1 + r * 63.0);
    col += vec3(0.86, 0.91, 1.0) * point * twinkle * 1.7 * smoothstep(0.05, 0.5, h);
  }

  return col;
}
`;

export const SKY_CHUNK = NOISE_GLSL + SKY_UNIFORMS_GLSL + SKY_FUNCTION_GLSL;
