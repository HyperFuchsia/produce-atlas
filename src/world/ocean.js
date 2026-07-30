import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import { SKY_CHUNK } from './shaders/sky.glsl.js';

/** How many text scenes can cast a light column on the water at once. */
export const MAX_BEACONS = 4;

const WAVES = /* glsl */ `
void addWave(vec2 p, vec2 dir, float amp, float len, float spd, float t,
             inout float h, inout vec2 grad) {
  float k = 6.2831853 / len;
  float phase = dot(dir, p) * k + t * spd;
  h += amp * sin(phase);
  grad += dir * (amp * k * cos(phase));
}

// Three travelling swells. Anything shorter than the mesh can resolve is added
// per-pixel in the fragment stage instead, which is what keeps the water from
// shimmering into moire in the mid-distance.
float oceanHeight(vec2 p, float t, out vec2 grad) {
  float h = 0.0;
  grad = vec2(0.0);
  addWave(p, normalize(vec2(0.86, 0.50)), 0.30, 27.0, 0.85, t, h, grad);
  addWave(p, normalize(vec2(-0.30, 0.95)), 0.19, 15.5, 1.10, t, h, grad);
  addWave(p, normalize(vec2(0.60, -0.80)), 0.11, 8.6, 1.55, t, h, grad);
  return h;
}
`;

export class Ocean {
  /**
   * @param {object} palette
   * @param {object} sharedSkyUniforms uniforms owned by the Sky, reused verbatim
   */
  constructor(palette, sharedSkyUniforms) {
    this.uniforms = {
      ...sharedSkyUniforms,
      uDeep: { value: new Color(palette.water.deep) },
      uShallow: { value: new Color(palette.water.shallow) },
      uGrid: { value: new Color(palette.water.grid) },
      uGridStrength: { value: palette.water.gridStrength },
      uBeaconPos: {
        value: Array.from({ length: MAX_BEACONS }, () => new Vector3()),
      },
      uBeaconColor: {
        value: Array.from({ length: MAX_BEACONS }, () => new Color()),
      },
      uBeaconPower: { value: new Float32Array(MAX_BEACONS) },
      uDisplace: { value: 1 },
    };

    const vertexShader = /* glsl */ `
      uniform float uTime;
      uniform float uDisplace;
      ${WAVES}
      varying vec3 vWorld;
      varying vec2 vGrad;

      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vec2 grad;
        float h = oceanHeight(world.xz, uTime, grad);
        // Displacement is only worth paying for near the viewer; further out the
        // geometry is coarse, so it fades into the flat distance plane.
        float near = 1.0 - smoothstep(140.0, 320.0, distance(world.xz, cameraPosition.xz));
        float amount = uDisplace * near;
        world.y += h * amount;
        vGrad = grad * amount;
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `;

    const fragmentShader = /* glsl */ `
      ${SKY_CHUNK}
      ${WAVES}
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uGrid;
      uniform float uGridStrength;
      uniform vec3 uBeaconPos[${MAX_BEACONS}];
      uniform vec3 uBeaconColor[${MAX_BEACONS}];
      uniform float uBeaconPower[${MAX_BEACONS}];
      varying vec3 vWorld;
      varying vec2 vGrad;

      void main() {
        vec3 view = cameraPosition - vWorld;
        float dist = length(view);
        vec3 v = view / max(dist, 1e-4);

        // Fine ripples live only in the normal, keeping the mesh cheap.
        float ripple = 0.0;
        vec2 rgrad = vec2(0.0);
        float ripFade = 1.0 - smoothstep(25.0, 150.0, dist);
        addWave(vWorld.xz, normalize(vec2(0.95, 0.30)), 0.036 * ripFade, 4.3, 2.10, uTime, ripple, rgrad);
        addWave(vWorld.xz, normalize(vec2(0.7, 0.71)), 0.012 * ripFade, 2.1, 3.10, uTime, ripple, rgrad);
        addWave(vWorld.xz, normalize(vec2(-0.8, 0.6)), 0.006 * ripFade, 1.15, 4.30, uTime, ripple, rgrad);

        vec2 grad = vGrad + rgrad;
        vec3 n = normalize(vec3(-grad.x, 1.0, -grad.y));

        // Sky reflection — the sun column on the water comes out of this for free.
        vec3 r = reflect(-v, n);
        r.y = abs(r.y);
        // With distance the reflection is pulled towards straight up, which acts
        // as a cheap blur: the sun's slats stop aliasing across the far water.
        r = normalize(mix(r, vec3(0.0, 1.0, 0.0), clamp(dist / 420.0, 0.0, 0.5)));
        vec3 sky = atlasSky(r, 0.0);

        float fres = 0.025 + 0.975 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 5.0);
        vec3 body = mix(uDeep, uShallow, smoothstep(0.965, 1.0, n.y));
        vec3 col = mix(body, sky, clamp(fres * 1.05, 0.0, 1.0));

        // Sharp specular sparkle straight off the sun.
        vec3 sdir = normalize(uSunDir);
        vec3 hv = normalize(sdir + v);
        col += uSunGlow * pow(max(dot(n, hv), 0.0), 300.0) * 1.5;

        // Neon grid, anti-aliased in screen space and faded with distance.
        vec2 gp = vWorld.xz * 0.09 + vec2(0.0, uTime * 0.01);
        vec2 gw = fwidth(gp) * 1.35;
        vec2 gf = abs(fract(gp - 0.5) - 0.5) / max(gw, vec2(1e-5));
        float line = 1.0 - clamp(min(gf.x, gf.y), 0.0, 1.0);
        float gridFade = exp(-dist * 0.006) * (1.0 - smoothstep(0.0, 1.0, gw.x));
        col += uGrid * line * gridFade * uGridStrength;

        // Light columns cast by the text hovering above the water.
        for (int i = 0; i < ${MAX_BEACONS}; i++) {
          vec2 bxz = uBeaconPos[i].xz;
          vec2 toCam = normalize(cameraPosition.xz - bxz + vec2(1e-4));
          vec2 rel = vWorld.xz - bxz;
          float along = dot(rel, toCam);
          float across = dot(rel, vec2(-toCam.y, toCam.x));
          float streak = exp(-across * across / 5.5)
                       * exp(-max(-along, 0.0) * 0.55)
                       * exp(-max(along, 0.0) * 0.055);
          float shimmer = 0.55 + 0.75 * abs(sin(vWorld.z * 1.6 + vWorld.x * 0.7 + uTime * 1.7));
          col += uBeaconColor[i] * streak * shimmer * uBeaconPower[i];
        }

        // Dissolve into the sky at the horizon so the seam disappears.
        vec3 horizonCol = atlasSky(vec3(-v.x, 0.014, -v.z), 0.0);
        col = mix(col, horizonCol, pow(1.0 - exp(-dist * 0.0026), 1.5));

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    this.material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      fog: false,
    });

    // A displaced plane that follows the viewer…
    const near = new PlaneGeometry(620, 620, 300, 300);
    near.rotateX(-Math.PI / 2);
    this.near = new Mesh(near, this.material);
    this.near.frustumCulled = false;
    this.near.name = 'ocean-near';

    // …and a flat one that reaches the horizon, parked just underneath it.
    const far = new PlaneGeometry(7000, 7000, 32, 32);
    far.rotateX(-Math.PI / 2);
    this.farMaterial = this.material.clone();
    this.farMaterial.uniforms = { ...this.uniforms, uDisplace: { value: 0 } };
    this.far = new Mesh(far, this.farMaterial);
    this.far.position.y = -0.06;
    this.far.frustumCulled = false;
    this.far.name = 'ocean-far';

    this.group = [this.near, this.far];
  }

  setPalette(palette) {
    this.uniforms.uDeep.value.set(palette.water.deep);
    this.uniforms.uShallow.value.set(palette.water.shallow);
    this.uniforms.uGrid.value.set(palette.water.grid);
    this.uniforms.uGridStrength.value = palette.water.gridStrength;
  }

  /** @param {{position: Vector3, color: Color, power: number}[]} beacons */
  setBeacons(beacons) {
    const pos = this.uniforms.uBeaconPos.value;
    const col = this.uniforms.uBeaconColor.value;
    const pow = this.uniforms.uBeaconPower.value;
    for (let i = 0; i < MAX_BEACONS; i++) {
      const b = beacons[i];
      if (b) {
        pos[i].copy(b.position);
        col[i].copy(b.color);
        pow[i] = b.power;
      } else {
        pow[i] = 0;
      }
    }
  }

  update(_elapsed, camera) {
    // Snap to the wave grid so vertices never swim as the camera drifts.
    this.near.position.set(Math.round(camera.position.x / 2) * 2, 0, Math.round(camera.position.z / 2) * 2);
    this.far.position.x = camera.position.x;
    this.far.position.z = camera.position.z;
  }

  dispose() {
    this.near.geometry.dispose();
    this.far.geometry.dispose();
    this.material.dispose();
    this.farMaterial.dispose();
  }
}
