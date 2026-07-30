import {
  BackSide,
  Color,
  Mesh,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { SKY_CHUNK } from './shaders/sky.glsl.js';
import { SUN_DIR } from '../config.js';

const RADIUS = 2200;

function skyUniforms(palette) {
  const s = palette.sky;
  return {
    uZenith: { value: new Color(s.zenith) },
    uUpper: { value: new Color(s.upper) },
    uMid: { value: new Color(s.mid) },
    uHorizon: { value: new Color(s.horizon) },
    uSunCore: { value: new Color(s.sunCore) },
    uSunGlow: { value: new Color(s.sunGlow) },
    uCloudDark: { value: new Color(s.cloudDark) },
    uCloudLit: { value: new Color(s.cloudLit) },
    uSunDir: { value: new Vector3(...SUN_DIR).normalize() },
    uSunSize: { value: s.sunSize },
    uBands: { value: s.bands },
    uTime: { value: 0 },
  };
}

/**
 * The gradient dome. It also doubles as the source for the scene's
 * environment map, so chrome type reflects the actual sunset behind it.
 */
export class Sky {
  constructor(palette) {
    this.uniforms = skyUniforms(palette);

    this.material = new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vDir = world.xyz - cameraPosition;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        ${SKY_CHUNK}
        varying vec3 vDir;
        void main() {
          gl_FragColor = vec4(atlasSky(vDir, 1.0), 1.0);
        }
      `,
    });

    this.mesh = new Mesh(new SphereGeometry(RADIUS, 64, 40), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100;
    this.mesh.name = 'sky';
  }

  /** Uniform values shared with the ocean so both stay in lockstep. */
  get sharedUniforms() {
    return this.uniforms;
  }

  setPalette(palette) {
    const s = palette.sky;
    this.uniforms.uZenith.value.set(s.zenith);
    this.uniforms.uUpper.value.set(s.upper);
    this.uniforms.uMid.value.set(s.mid);
    this.uniforms.uHorizon.value.set(s.horizon);
    this.uniforms.uSunCore.value.set(s.sunCore);
    this.uniforms.uSunGlow.value.set(s.sunGlow);
    this.uniforms.uCloudDark.value.set(s.cloudDark);
    this.uniforms.uCloudLit.value.set(s.cloudLit);
    this.uniforms.uSunSize.value = s.sunSize;
    this.uniforms.uBands.value = s.bands;
  }

  update(elapsed, camera) {
    this.uniforms.uTime.value = elapsed;
    // Keep the dome centred on the viewer so it never gets "reached".
    this.mesh.position.copy(camera.position);
  }

  /**
   * Bakes the current sky into a pre-filtered environment map. Called on boot
   * and whenever the palette changes — the sun itself never moves.
   */
  buildEnvironment(renderer) {
    const pmrem = new PMREMGenerator(renderer);
    const scene = new Scene();
    const proxy = new Mesh(this.mesh.geometry, this.material.clone());
    proxy.material.uniforms = this.uniforms; // share live values
    scene.add(proxy);
    const target = pmrem.fromScene(scene, 0.04, 1, RADIUS * 2);
    pmrem.dispose();
    proxy.material.dispose();
    return target.texture;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
