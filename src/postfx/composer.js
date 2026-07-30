import { HalfFloatType, Vector2, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Final grade: radial chromatic aberration, faint CRT scanlines, film grain and
 * a vignette. Subtle on purpose — enough to feel like VHS, not enough to fight
 * the type for attention.
 */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uAberration: { value: 1 },
    uScanline: { value: 0.05 },
    uGrain: { value: 0.05 },
    uVignette: { value: 0.9 },
    uSaturation: { value: 1.08 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uAberration;
    uniform float uScanline;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uSaturation;
    varying vec2 vUv;

    void main() {
      vec2 centered = vUv - 0.5;
      float r2 = dot(centered, centered);

      // Split the channels outward from the centre.
      float shift = uAberration * (0.0012 + r2 * 0.006);
      vec2 dir = r2 > 0.0 ? normalize(centered) : vec2(0.0);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + dir * shift).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - dir * shift).b;

      // Scanlines and a slow rolling band.
      float lines = sin(vUv.y * uResolution.y * 1.35) * 0.5 + 0.5;
      col *= 1.0 - uScanline * lines;
      col *= 1.0 - 0.018 * sin(vUv.y * 2.4 - uTime * 0.35);

      // Grain.
      float g = fract(sin(dot(vUv * uResolution + uTime * 60.0, vec2(12.9898, 78.233))) * 43758.5453);
      col += (g - 0.5) * uGrain;

      // Vignette.
      col *= mix(1.0, smoothstep(0.86, 0.16, r2 * 1.7), uVignette);

      // Gentle saturation lift.
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class PostFX {
  constructor(renderer, scene, camera, palette) {
    this.renderer = renderer;

    // Multisampled float target: extruded type has a lot of thin bevel edges and
    // needs real MSAA, which a plain composer target would not give us.
    const size = renderer.getSize(new Vector2());
    const target = new WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), {
      type: HalfFloatType,
      samples: 4,
    });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(
      new Vector2(1, 1),
      palette.bloom.strength,
      palette.bloom.radius,
      palette.bloom.threshold,
    );
    this.composer.addPass(this.bloom);

    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);

    this.composer.addPass(new OutputPass());
    this.enabled = true;
  }

  setPalette(palette) {
    this.bloom.strength = palette.bloom.strength;
    this.bloom.radius = palette.bloom.radius;
    this.bloom.threshold = palette.bloom.threshold;
  }

  setSize(width, height, pixelRatio) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    this.grade.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
  }

  /** Drops the heavy passes when the frame budget is blown. */
  setQuality(level) {
    this.bloom.enabled = level > 0;
    this.grade.uniforms.uGrain.value = level > 0 ? 0.05 : 0.03;
    this.grade.uniforms.uAberration.value = level > 0 ? 1 : 0.4;
  }

  render(dt, elapsed) {
    this.grade.uniforms.uTime.value = elapsed;
    this.composer.render(dt);
  }

  dispose() {
    this.composer.dispose();
  }
}
