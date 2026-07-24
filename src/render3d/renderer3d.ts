import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { clamp, damp } from '../engine/math';
import type { Screen } from '../engine/screen';
import { RUN } from '../game/tuning';
import type { SkinDef, TrailDef } from '../game/tuning';
import type { FxEvent, World } from '../game/world';
import { Fx3D } from './fx3d';
import { Props3D } from './props3d';
import { Runner3D } from './runner3d';
import { SkyTexture, blendZones, cloneZone, zone3DAt, type Zone3D } from './theme';
import { Track3D } from './track3d';

export interface RenderOpts {
  skin: SkinDef;
  trail: TrailDef;
  quality: 'high' | 'low';
  screenShake: boolean;
  highContrast: boolean;
  showFps: boolean;
  fps: number;
}

/**
 * The 3-D view of a run.
 *
 * The camera rides behind and above Marcus looking down the Conduit, which is
 * the whole point of the third dimension: obstacles arrive in depth, and the
 * city has somewhere to be. Nothing here writes to the simulation — the world
 * would run identically with the renderer removed, which is what let the
 * physics, the generator and every fairness test survive the move from 2-D
 * untouched.
 */
export class Renderer3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;

  private track = new Track3D();
  private props = new Props3D();
  private runner = new Runner3D();
  private fx: Fx3D;

  private sky: THREE.Mesh;
  private skyTex = new SkyTexture();
  private planet: THREE.Group;
  private hemi: THREE.HemisphereLight;
  private key: THREE.DirectionalLight;
  private rimLight: THREE.PointLight;

  private zone: Zone3D = cloneZone(zone3DAt(0));
  private time = 0;
  private camY = 3;
  private camLateral = 0;
  private camShake = 0;
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private grade: ShaderPass | null = null;
  private usePost = true;
  private banner: HTMLDivElement;
  private bannerTimer = 0;
  private perf: HTMLDivElement;
  private trailTimer = 0;
  private lastQuality: 'high' | 'low' | '' = '';

  /** Draw-call / triangle budget — what actually predicts device performance. */
  get budget(): { calls: number; triangles: number; programs: number } {
    return {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      programs: this.renderer.info.programs?.length ?? 0,
    };
  }

  constructor(private readonly screen: Screen) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: screen.canvas,
      // Above ~1.5× DPR the extra samples buy almost nothing visible and cost
      // real fill rate, which is the budget that matters on a phone.
      antialias: (window.devicePixelRatio || 1) < 1.5,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setClearColor(0x05060d, 1);
    this.renderer.shadowMap.enabled = false;

    this.camera = new THREE.PerspectiveCamera(64, screen.viewport.aspect, 0.4, 400);
    this.scene.fog = new THREE.Fog(this.zone.fog.getHex(), this.zone.fogNear, this.zone.fogFar);

    // ---------------------------------------------------------------- sky
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(320, 20, 16),
      new THREE.MeshBasicMaterial({ map: this.skyTex.texture, side: THREE.BackSide, fog: false, depthWrite: false }),
    );
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    // A hanging sister world, parked far down the Conduit.
    this.planet = new THREE.Group();
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(38, 32),
      new THREE.MeshBasicMaterial({ color: 0x2c6f86, fog: false, transparent: true, opacity: 0.55 }),
    );
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(50, 53, 48),
      new THREE.MeshBasicMaterial({
        color: 0x45f5ff,
        fog: false,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = 0.42;
    ring.rotation.z = 0.25;
    this.planet.add(disc, ring);
    this.planet.renderOrder = -9;
    this.scene.add(this.planet);

    // ---------------------------------------------------------------- lights
    this.hemi = new THREE.HemisphereLight(0x8fd8ff, 0x101828, 1.15);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffffff, 1.4);
    this.key.position.set(-6, 12, 6);
    this.scene.add(this.key);
    // Travels with the runner so he never sinks into the fog.
    this.rimLight = new THREE.PointLight(0x45f5ff, 14, 22, 2);
    this.scene.add(this.rimLight);

    this.scene.add(this.track.group, this.props.group, this.runner.group);

    const host = screen.canvas.parentElement ?? document.body;
    this.fx = new Fx3D(host);
    this.scene.add(this.fx.group);

    this.banner = document.createElement('div');
    this.banner.className = 'zone-banner';
    host.appendChild(this.banner);

    this.perf = document.createElement('div');
    this.perf.className = 'perf-readout';
    this.perf.hidden = true;
    host.appendChild(this.perf);

    this.buildPost();
    screen.onResize(() => this.applySize());
    this.applySize();
  }

  /**
   * Post chain: bloom, then a grade/vignette pass.
   *
   * Bloom is not decoration here — the whole look is emissive strips against
   * near-black, and without a bloom the neon reads as flat coloured tape. The
   * pass runs at half resolution, which is where bloom looks best anyway
   * (it is a blur) and costs a quarter of the fill.
   */
  private buildPost(): void {
    try {
      const vp = this.screen.viewport;
      const composer = new EffectComposer(this.renderer);
      composer.addPass(new RenderPass(this.scene, this.camera));

      const bloom = new UnrealBloomPass(
        new THREE.Vector2(Math.max(1, vp.width * 0.5), Math.max(1, vp.height * 0.5)),
        1.15, // strength
        0.85, // radius
        0.66, // threshold — only the emissive strips and lights should bloom
      );
      composer.addPass(bloom);

      const grade = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          uVignette: { value: 0.9 },
          uSaturation: { value: 1.16 },
          uTint: { value: new THREE.Color(0x0a1428) },
          uFlash: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float uVignette;
          uniform float uSaturation;
          uniform vec3 uTint;
          varying vec2 vUv;
          void main() {
            vec4 c = texture2D(tDiffuse, vUv);
            // Saturate around luma, so neon gets richer without clipping.
            float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
            c.rgb = mix(vec3(l), c.rgb, uSaturation);
            // Lift the shadows toward the zone's own blue rather than to grey.
            c.rgb += uTint * (1.0 - smoothstep(0.0, 0.35, l)) * 0.5;
            // Vignette.
            vec2 d = vUv - 0.5;
            float v = 1.0 - dot(d, d) * uVignette;
            c.rgb *= v;
            gl_FragColor = vec4(c.rgb, c.a);
          }
        `,
      });
      grade.renderToScreen = true;
      composer.addPass(grade);

      this.composer = composer;
      this.bloom = bloom;
      this.grade = grade;
    } catch {
      // Any failure here just means we draw without post; never a black screen.
      this.composer = null;
    }
  }

  private applySize(): void {
    const vp = this.screen.viewport;
    this.renderer.setPixelRatio(this.screen.pixelRatio);
    this.renderer.setSize(vp.width, vp.height, false);
    this.camera.aspect = vp.aspect;
    // Portrait sees less width, so widen the lens to keep the same road ahead.
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setPixelRatio(this.screen.pixelRatio);
      this.composer.setSize(vp.width, vp.height);
      this.bloom?.setSize(Math.max(1, vp.width * 0.5), Math.max(1, vp.height * 0.5));
    }
  }

  reset(): void {
    this.fx.reset();
    this.bannerTimer = 0;
    this.banner.classList.remove('is-on');
    this.camY = 3;
    this.camLateral = 0;
    this.trailTimer = 0;
  }

  /** Turn a simulation event into light, debris and noise. */
  onEvent(e: FxEvent, world: World): void {
    const accent = this.zone.accent.getHex();
    switch (e.type) {
      case 'jump':
        this.fx.emit(e.x, e.y + 0.05, 8, { speed: 3.2, spread: 1.4, color: 0x9fb4d6, life: 0.4, size: 0.26 });
        break;
      case 'land':
        this.fx.emit(e.x, e.y + 0.05, e.hard ? 18 : 8, {
          speed: e.hard ? 5.5 : 3,
          spread: 1.2,
          color: 0x8ba0bd,
          life: 0.45,
          size: e.hard ? 0.34 : 0.24,
        });
        break;
      case 'slide':
        this.fx.emit(e.x, e.y + 0.1, 14, { speed: 6, spread: 0.8, dir: -1, color: 0xffc857, life: 0.4, size: 0.24 });
        break;
      case 'dive':
        this.fx.emit(e.x, e.y + 0.4, 12, { speed: 3.4, spread: 1.6, color: 0x9fb4d6, life: 0.5, size: 0.3 });
        break;
      case 'lane':
        this.fx.emit(e.x, e.y + 0.35, 7, { speed: 3, spread: 1.2, dir: -1, color: accent, life: 0.3, size: 0.22 });
        break;
      case 'vault':
        this.fx.emit(e.x, e.y, e.perfect ? 34 : 16, {
          speed: e.perfect ? 8 : 5,
          spread: 2.4,
          color: e.perfect ? 0xffc857 : accent,
          life: 0.55,
          size: 0.32,
        });
        if (e.perfect) this.fx.screenFlash('#ffc857', 0.3);
        break;
      case 'shatter':
        this.fx.emit(e.x, e.y + 0.8, 44, {
          speed: 7.5,
          spread: 3,
          color: 0xcdefff,
          life: 1,
          size: 0.3,
          gravity: -16,
          bounce: true,
        });
        this.fx.emit(e.x, e.y + 0.8, 14, { speed: 6, spread: 3, color: 0x9dff4d, life: 0.5, size: 0.26 });
        this.fx.screenFlash('#cdefff', 0.34);
        break;
      case 'smash':
        this.fx.emit(e.x, e.y, 30, { speed: 9, spread: 3, color: 0xff3fa4, life: 0.7, size: 0.34 });
        this.fx.screenFlash('#ff3fa4', 0.26);
        break;
      case 'shard':
        this.fx.emit(e.x, e.y, 6, { speed: 3.6, spread: 3, color: 0x45f5ff, life: 0.35, size: 0.22 });
        break;
      case 'core':
        this.fx.emit(e.x, e.y, 40, { speed: 8, spread: 3, color: 0xffc857, life: 0.85, size: 0.34 });
        this.fx.screenFlash('#ffc857', 0.32);
        break;
      case 'power':
        this.fx.emit(e.x, e.y, 34, { speed: 7.5, spread: 3, color: accent, life: 0.75, size: 0.34 });
        this.fx.screenFlash('#45f5ff', 0.3);
        break;
      case 'hit':
        this.fx.emit(e.x, e.y + 0.6, 46, { speed: 10, spread: 3, color: 0xff5b5b, life: 0.9, size: 0.36 });
        this.fx.screenFlash('#ff5b5b', 0.62);
        break;
      case 'shield':
        this.fx.emit(e.x, e.y + 0.8, 28, { speed: 6, spread: 3, color: 0x9dff4d, life: 0.6, size: 0.32 });
        this.fx.screenFlash('#9dff4d', 0.36);
        break;
      case 'flowStart':
        this.fx.emit(world.player.x, world.player.y + 0.9, 60, {
          speed: 9,
          spread: 3,
          color: 0xff3fa4,
          life: 1,
          size: 0.36,
        });
        this.fx.screenFlash('#ff3fa4', 0.45);
        break;
      case 'zone':
        this.showBanner(e.index);
        this.fx.screenFlash(`#${zone3DAt(e.index).accent.getHexString()}`, 0.28);
        break;
      case 'popup':
        this.fx.popup(e.x, e.y, e.text, e.color);
        break;
      default:
        break;
    }
  }

  private showBanner(index: number): void {
    const z = zone3DAt(index);
    this.banner.innerHTML = `<b>${z.name}</b><span>${z.tagline.toUpperCase()}</span>`;
    this.banner.style.setProperty('--accent', `#${z.accent.getHexString()}`);
    this.banner.classList.add('is-on');
    this.bannerTimer = 3.2;
  }

  draw(world: World, alpha: number, frameDt: number, opts: RenderOpts): void {
    this.time += frameDt;
    const p = world.player;

    // Interpolate the fixed-step simulation into render space.
    const x = p.px + (p.x - p.px) * alpha;
    const y = p.py + (p.y - p.py) * alpha;
    const lateral = p.pLateral + (p.lateral - p.pLateral) * alpha;
    const z = -x;

    // ---------------------------------------------------------------- zone
    const a = zone3DAt(world.zone);
    const b = zone3DAt(world.zone + 1);
    const progress = (world.stats.distance % 900) / 900;
    const t = clamp((progress - 0.86) / 0.14, 0, 1);
    blendZones(this.zone, a, b, t);
    this.applyZone(opts);

    // ---------------------------------------------------------------- camera
    const speedT = clamp((world.speed - RUN.startSpeed) / (RUN.maxSpeed - RUN.startSpeed), 0, 1);
    // Follow height only partly: a jump should read without throwing the world.
    this.camY = damp(this.camY, 3.15 + y * 0.4, 7, frameDt);

    const portraitLift = this.screen.viewport.portrait ? 0.5 : 0;
    const back = 4.7 + speedT * 0.9 + (world.overdriveTimer > 0 ? 0.7 : 0);
    // Three-quarter view: the camera sits off the side of the platform rather
    // than dead behind. The platform then recedes on a diagonal, and — more
    // usefully — an off-axis view reads *height* properly, which is the only
    // axis this game asks you to judge. From straight behind, a vault and a
    // dive look far more alike than they should.
    // Portrait has a much narrower horizontal lens, so it takes a gentler
    // angle — at the landscape offset the runner falls outside the frame.
    const side = this.screen.viewport.portrait ? 2.7 : 5.2;
    // Follow lane changes only partly. Tracking them fully would swing the
    // whole city sideways every dodge; ignoring them entirely would let him
    // walk out of frame.
    this.camLateral = damp(this.camLateral, lateral * 0.45, 9, frameDt);
    this.camera.position.set(side + this.camLateral, this.camY + portraitLift, z + back);
    // Aim slightly *past* the runner, not at him: overshooting swings him back
    // toward the middle of the frame while the platform still recedes across
    // it, so hazards travel toward him rather than straight at the lens.
    this.camera.lookAt(-0.9 + this.camLateral, 1.35 + y * 0.3, z - 5.5);

    // Speed widens the lens; portrait widens it further to restore lookahead.
    const fov = 62 + speedT * 9 + (this.screen.viewport.portrait ? 8 : 0) + (world.overdriveTimer > 0 ? 5 : 0);
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    const shakeAmt = (opts.screenShake ? world.shake : world.shake * 0.25) * 0.5;
    this.camShake = Math.max(this.camShake * 0.86, shakeAmt);
    if (this.camShake > 0.002) {
      this.camera.position.x += (Math.random() - 0.5) * this.camShake;
      this.camera.position.y += (Math.random() - 0.5) * this.camShake;
      this.camera.rotation.z += (Math.random() - 0.5) * this.camShake * 0.05;
    }

    this.sky.position.copy(this.camera.position);
    this.planet.position.set(-26, 46, z - 300);

    // ---------------------------------------------------------------- world
    this.runner.setSkin(opts.skin);
    this.runner.setAccent(this.zone.accent);
    const blinking = p.invuln > 0 && world.phase === 'running';
    const ghost = blinking ? (Math.sin(this.time * 26) > 0 ? 1 : 0) : 1;
    this.runner.update(p, speedT, z, y, lateral, {
      flow: world.flowActive ? 1 : 0,
      overdrive: world.overdriveTimer > 0,
      ghost,
    });

    this.rimLight.position.set(lateral - 1.6, y + 2.4, z + 0.4);
    this.rimLight.color.copy(world.flowActive ? new THREE.Color(0xff3fa4) : this.zone.key);
    this.rimLight.intensity = world.flowActive ? 30 : 20;

    this.track.update(x, world.spawner, this.zone, this.time);
    this.props.update(world.spawner.obstacles, world.spawner.pickups, x, frameDt, this.zone);

    this.emitTrail(world, x, y, frameDt, opts);
    this.fx.update(frameDt, z + back, world.speed, this.camera, this.screen.canvas);

    // ---------------------------------------------------------------- chrome
    if (this.bannerTimer > 0) {
      this.bannerTimer -= frameDt;
      if (this.bannerTimer <= 0) this.banner.classList.remove('is-on');
    }
    if (opts.showFps) {
      this.perf.hidden = false;
      const info = this.renderer.info.render;
      this.perf.textContent =
        `${opts.fps.toFixed(0)} fps · ${info.calls} draws · ${(info.triangles / 1000).toFixed(1)}k tris · ` +
        `${this.screen.pixelRatio.toFixed(2)}x · ${opts.quality}`;
    } else if (!this.perf.hidden) {
      this.perf.hidden = true;
    }

    if (this.usePost && this.composer) {
      if (this.grade) {
        // Flow pushes saturation; the grade lifts shadows toward the zone hue.
        const sat = 1.16 + (world.flowActive ? 0.22 : 0) + (world.overdriveTimer > 0 ? 0.12 : 0);
        this.grade.uniforms.uSaturation.value +=
          (sat - this.grade.uniforms.uSaturation.value) * Math.min(1, frameDt * 6);
        (this.grade.uniforms.uTint.value as THREE.Color).copy(this.zone.fog).multiplyScalar(0.35);
      }
      if (this.bloom) {
        const target = 1.15 + (world.flowActive ? 0.5 : 0) + (world.overdriveTimer > 0 ? 0.35 : 0);
        this.bloom.strength += (target - this.bloom.strength) * Math.min(1, frameDt * 5);
      }
      this.composer.render(frameDt);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private applyZone(opts: RenderOpts): void {
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(this.zone.fog);
    fog.near = this.zone.fogNear;
    fog.far = opts.quality === 'low' ? this.zone.fogFar * 0.72 : this.zone.fogFar;
    // Post is the first thing to go when a device is struggling.
    this.usePost = opts.quality === 'high';
    this.renderer.setClearColor(this.zone.fog.getHex(), 1);
    this.skyTex.update(this.zone);

    this.hemi.color.copy(this.zone.fill);
    this.hemi.groundColor.copy(this.zone.deck);
    this.key.color.copy(this.zone.key);
    this.key.intensity = opts.highContrast ? 1.9 : 1.35;
    this.hemi.intensity = opts.highContrast ? 0.7 : 1.15;

    const planetMat = (this.planet.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    planetMat.color.copy(this.zone.window).multiplyScalar(0.5);
    const ringMat = (this.planet.children[1] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    ringMat.color.copy(this.zone.accent);

    if (opts.quality !== this.lastQuality) {
      this.lastQuality = opts.quality;
      this.fx.setWeather(this.zone.weather, opts.quality === 'high');
    } else {
      this.fx.setWeather(this.zone.weather, opts.quality === 'high');
    }
  }

  private emitTrail(world: World, x: number, y: number, dt: number, opts: RenderOpts): void {
    if (world.phase !== 'running') return;
    this.trailTimer -= dt;
    if (this.trailTimer > 0) return;
    const p = world.player;

    if (opts.trail.kind === 'spark' && p.onGround) {
      this.trailTimer = 0.05;
      this.fx.emit(x - 0.25, y + 0.06, 2, {
        speed: 3.4,
        spread: 0.7,
        dir: -1,
        color: new THREE.Color(opts.trail.color).getHex(),
        life: 0.35,
        size: 0.22,
      });
    } else if (opts.trail.kind === 'ribbon') {
      this.trailTimer = 0.03;
      this.fx.emit(x - 0.2, y + p.height * 0.55, 1, {
        speed: 0.3,
        spread: 0.4,
        color: new THREE.Color(opts.trail.color).getHex(),
        life: 0.5,
        size: 0.34,
        gravity: 0,
        drag: 0.86,
      });
    } else if (opts.trail.kind === 'echo') {
      this.trailTimer = 0.06;
      this.fx.emit(x - 0.15, y + p.height * 0.5, 3, {
        speed: 0.5,
        spread: 1.2,
        color: new THREE.Color(opts.trail.color).getHex(),
        life: 0.4,
        size: 0.4,
        gravity: 0,
        drag: 0.8,
      });
    } else {
      this.trailTimer = 0.05;
    }

    if (world.overdriveTimer > 0) {
      this.fx.emit(x - 0.4, y + 0.9, 2, { speed: 5, spread: 1, dir: -1, color: 0xff3fa4, life: 0.3, size: 0.28 });
    }
  }
}
