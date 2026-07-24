import * as THREE from 'three';
import { clamp } from '../engine/math';
import type { Zone3D } from './theme';
import { TRACK_WIDTH } from './track3d';

/**
 * Sparks, glass, weather, speed streaks and score popups.
 *
 * Particles live in one Points cloud with a fixed-size buffer — no allocation
 * while running. Popups are DOM, projected from world space each frame, so
 * award text stays crisp at any pixel ratio instead of being drawn into the
 * 3-D buffer and resampled.
 */

const MAX_PARTICLES = 700;
const STREAKS = 26;

const softDot = (): THREE.CanvasTexture => {
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = 32;
  const ctx = cvs.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(cvs);
};

interface Particle {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  drag: number;
  r: number;
  g: number;
  b: number;
  bounce: boolean;
}

interface Popup {
  el: HTMLDivElement;
  x: number;
  y: number;
  z: number;
  life: number;
  maxLife: number;
  alive: boolean;
}

export interface EmitOpts {
  speed?: number;
  spread?: number;
  /** Bias direction: +1 forward (−Z), −1 backward. */
  dir?: number;
  color?: number;
  size?: number;
  life?: number;
  gravity?: number;
  drag?: number;
  bounce?: boolean;
}

export class Fx3D {
  readonly group = new THREE.Group();

  private pool: Particle[] = [];
  private points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  private streaks: THREE.InstancedMesh;
  private streakData: { x: number; y: number; z: number; len: number }[] = [];
  private weather: THREE.Points;
  private weatherPos: Float32Array;
  private weatherKind: Zone3D['weather'] = 'none';

  private popups: Popup[] = [];
  private popupHost: HTMLDivElement;
  private flashEl: HTMLDivElement;
  private flash = 0;
  private flashColor = '#ffffff';

  private dummy = new THREE.Object3D();
  private tmp = new THREE.Vector3();

  constructor(host: HTMLElement) {
    // ---------------------------------------------------------------- points
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        life: 0, maxLife: 1, size: 1, gravity: 0, drag: 1, r: 1, g: 1, b: 1, bounce: false,
      });
    }
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geo.setDrawRange(0, 0);

    const mat = new THREE.PointsMaterial({
      size: 0.34,
      map: softDot(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);

    // ---------------------------------------------------------------- streaks
    this.streaks = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.05, 0.05, 1),
      new THREE.MeshBasicMaterial({ color: 0x45f5ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }),
      STREAKS,
    );
    this.streaks.frustumCulled = false;
    for (let i = 0; i < STREAKS; i++) {
      this.streakData.push({
        x: (Math.random() < 0.5 ? -1 : 1) * (TRACK_WIDTH * 0.45 + Math.random() * 7),
        y: 0.5 + Math.random() * 7,
        z: -Math.random() * 90,
        len: 3 + Math.random() * 9,
      });
    }
    this.group.add(this.streaks);

    // ---------------------------------------------------------------- weather
    const wCount = 260;
    this.weatherPos = new Float32Array(wCount * 3);
    for (let i = 0; i < wCount; i++) {
      this.weatherPos[i * 3] = (Math.random() - 0.5) * 46;
      this.weatherPos[i * 3 + 1] = Math.random() * 22;
      this.weatherPos[i * 3 + 2] = -Math.random() * 120;
    }
    const wGeo = new THREE.BufferGeometry();
    wGeo.setAttribute('position', new THREE.BufferAttribute(this.weatherPos, 3));
    this.weather = new THREE.Points(
      wGeo,
      new THREE.PointsMaterial({
        size: 0.12,
        color: 0xaadfff,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    this.weather.frustumCulled = false;
    this.weather.visible = false;
    this.group.add(this.weather);

    // ---------------------------------------------------------------- DOM
    this.popupHost = document.createElement('div');
    this.popupHost.className = 'fx-popups';
    host.appendChild(this.popupHost);
    for (let i = 0; i < 14; i++) {
      const el = document.createElement('div');
      el.className = 'fx-popup';
      el.style.opacity = '0';
      this.popupHost.appendChild(el);
      this.popups.push({ el, x: 0, y: 0, z: 0, life: 0, maxLife: 1, alive: false });
    }

    this.flashEl = document.createElement('div');
    this.flashEl.className = 'fx-flash';
    host.appendChild(this.flashEl);
  }

  reset(): void {
    for (const p of this.pool) p.alive = false;
    for (const p of this.popups) {
      p.alive = false;
      p.el.style.opacity = '0';
    }
    this.flash = 0;
    this.flashEl.style.opacity = '0';
  }

  emit(worldX: number, y: number, count: number, opts: EmitOpts = {}): void {
    const color = new THREE.Color(opts.color ?? 0xffffff);
    for (let i = 0; i < count; i++) {
      const p = this.pool.find((q) => !q.alive);
      if (!p) return;
      const speed = (opts.speed ?? 4) * (0.35 + Math.random() * 0.95);
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * (opts.spread ?? Math.PI);
      p.alive = true;
      p.x = (Math.random() - 0.5) * 0.7;
      p.y = y + (Math.random() - 0.5) * 0.2;
      p.z = -worldX + (Math.random() - 0.5) * 0.4;
      p.vx = Math.cos(theta) * Math.cos(phi) * speed;
      p.vy = Math.sin(phi) * speed + (opts.gravity === 0 ? 0 : 1.4);
      p.vz = Math.sin(theta) * Math.cos(phi) * speed - (opts.dir ?? 0) * speed * 0.7;
      p.maxLife = (opts.life ?? 0.6) * (0.6 + Math.random() * 0.8);
      p.life = p.maxLife;
      p.size = (opts.size ?? 0.3) * (0.6 + Math.random() * 0.9);
      p.gravity = opts.gravity ?? -14;
      p.drag = opts.drag ?? 0.93;
      p.bounce = opts.bounce ?? false;
      p.r = color.r;
      p.g = color.g;
      p.b = color.b;
    }
  }

  popup(worldX: number, y: number, text: string, color: string): void {
    let slot = this.popups.find((p) => !p.alive);
    if (!slot) slot = this.popups.reduce((a, b) => (a.life < b.life ? a : b));
    slot.alive = true;
    slot.x = 0;
    slot.y = y;
    slot.z = -worldX;
    slot.maxLife = 1.15;
    slot.life = slot.maxLife;
    slot.el.textContent = text;
    slot.el.style.color = color;
  }

  screenFlash(color: string, amount = 0.5): void {
    this.flash = Math.max(this.flash, amount);
    this.flashColor = color;
  }

  setWeather(kind: Zone3D['weather'], enabled: boolean): void {
    this.weatherKind = kind;
    this.weather.visible = enabled && kind !== 'none';
    const mat = this.weather.material as THREE.PointsMaterial;
    if (kind === 'rain') {
      mat.color.set(0xaadfff);
      mat.size = 0.1;
      mat.opacity = 0.55;
    } else if (kind === 'ember') {
      mat.color.set(0xffb85c);
      mat.size = 0.14;
      mat.opacity = 0.7;
    } else if (kind === 'star') {
      mat.color.set(0xffffff);
      mat.size = 0.16;
      mat.opacity = 0.8;
    }
  }

  update(dt: number, camZ: number, speed: number, camera: THREE.Camera, canvas: HTMLElement): void {
    // ---------------------------------------------------------------- points
    let n = 0;
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.vy += p.gravity * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d;
      p.vy *= d;
      p.vz *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.bounce && p.y < 0.05) {
        p.y = 0.05;
        p.vy *= -0.4;
        p.vx *= 0.7;
        p.vz *= 0.7;
      }
      const t = clamp(p.life / p.maxLife, 0, 1);
      this.positions[n * 3] = p.x;
      this.positions[n * 3 + 1] = p.y;
      this.positions[n * 3 + 2] = p.z;
      this.colors[n * 3] = p.r * t;
      this.colors[n * 3 + 1] = p.g * t;
      this.colors[n * 3 + 2] = p.b * t;
      this.sizes[n] = p.size * t;
      n++;
    }
    const geo = this.points.geometry;
    geo.setDrawRange(0, n);
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('size') as THREE.BufferAttribute).needsUpdate = true;

    this.updateStreaks(dt, camZ, speed);
    this.updateWeather(dt, camZ, speed);
    this.updatePopups(dt, camera, canvas);

    // ---------------------------------------------------------------- flash
    this.flash = Math.max(0, this.flash - dt * 2.6);
    this.flashEl.style.background = this.flashColor;
    this.flashEl.style.opacity = String(this.flash * 0.5);
  }

  private updateStreaks(dt: number, camZ: number, speed: number): void {
    const intensity = clamp((speed - 11) / 15, 0, 1);
    this.streaks.visible = intensity > 0.04;
    if (!this.streaks.visible) return;
    (this.streaks.material as THREE.MeshBasicMaterial).opacity = 0.06 + intensity * 0.2;

    const d = this.dummy;
    for (let i = 0; i < STREAKS; i++) {
      const s = this.streakData[i];
      s.z += (speed * 1.7 + 20) * dt;
      // Recycle anything that has swept past the camera.
      if (s.z > camZ + 12) {
        s.z = camZ - 110 - Math.random() * 40;
        // Keep them out of the corridor centre so they never cross the runner.
        s.x = (Math.random() < 0.5 ? -1 : 1) * (TRACK_WIDTH * 0.45 + Math.random() * 7);
        s.y = 0.5 + Math.random() * 7;
        s.len = 3 + Math.random() * 10;
      }
      d.position.set(s.x, s.y, s.z);
      d.scale.set(1, 1, s.len);
      d.rotation.set(0, 0, 0);
      d.updateMatrix();
      this.streaks.setMatrixAt(i, d.matrix);
    }
    this.streaks.instanceMatrix.needsUpdate = true;
  }

  private updateWeather(dt: number, camZ: number, speed: number): void {
    if (!this.weather.visible) return;
    const pos = this.weatherPos;
    const fall = this.weatherKind === 'rain' ? -26 : this.weatherKind === 'ember' ? 2.2 : 0;
    const drift = this.weatherKind === 'star' ? 0 : speed * 0.35;
    for (let i = 0; i < pos.length / 3; i++) {
      pos[i * 3 + 1] += fall * dt;
      pos[i * 3 + 2] += drift * dt;
      if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 22;
      if (pos[i * 3 + 1] > 24) pos[i * 3 + 1] = 0;
      if (pos[i * 3 + 2] > camZ + 8) pos[i * 3 + 2] -= 130;
      if (pos[i * 3 + 2] < camZ - 130) pos[i * 3 + 2] += 130;
    }
    (this.weather.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  private updatePopups(dt: number, camera: THREE.Camera, canvas: HTMLElement): void {
    const rect = canvas.getBoundingClientRect();
    for (const p of this.popups) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        p.el.style.opacity = '0';
        continue;
      }
      p.y += 1.6 * dt;
      const t = clamp(p.life / p.maxLife, 0, 1);
      this.tmp.set(p.x, p.y, p.z).project(camera);
      if (this.tmp.z > 1) {
        p.el.style.opacity = '0';
        continue;
      }
      const sx = (this.tmp.x * 0.5 + 0.5) * rect.width;
      const sy = (-this.tmp.y * 0.5 + 0.5) * rect.height;
      const pop = t > 0.85 ? 1 + (1 - t) * 3 : 1;
      p.el.style.transform = `translate(-50%,-50%) translate(${clamp(sx, 60, rect.width - 60)}px, ${clamp(sy, 30, rect.height - 30)}px) scale(${pop.toFixed(3)})`;
      p.el.style.opacity = String(Math.min(1, t * 1.9));
    }
  }
}
