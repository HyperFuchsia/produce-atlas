import * as THREE from 'three';
import { ZONES, type ZonePalette } from '../render/palette';

/**
 * Zone looks, expressed the way a 3-D scene needs them: colours as THREE.Color,
 * plus fog density, light tint and sky gradient stops. The hex identity is
 * shared with the 2-D UI palette so the HUD and the world never disagree.
 */
export interface Zone3D {
  name: string;
  tagline: string;
  fog: THREE.Color;
  fogNear: number;
  fogFar: number;
  sky: [THREE.Color, THREE.Color, THREE.Color];
  deck: THREE.Color;
  deckEdge: THREE.Color;
  building: THREE.Color;
  window: THREE.Color;
  accent: THREE.Color;
  accent2: THREE.Color;
  key: THREE.Color;
  fill: THREE.Color;
  weather: ZonePalette['weather'];
}

const c = (hex: string): THREE.Color => new THREE.Color(hex);

const build = (p: ZonePalette, extra: Partial<Zone3D>): Zone3D => ({
  name: p.name,
  tagline: p.tagline,
  fog: c(p.sky[1]),
  fogNear: 34,
  fogFar: 165,
  sky: [c(p.sky[0]), c(p.sky[1]), c(p.sky[2])],
  deck: c(p.ground),
  deckEdge: c(p.groundGlow),
  building: c(p.near),
  window: c(p.window),
  accent: c(p.accent),
  accent2: c(p.accent2),
  key: c(p.accent),
  fill: c(p.sky[2]),
  weather: p.weather,
  ...extra,
});

export const ZONES_3D: Zone3D[] = [
  build(ZONES[0], { fog: c('#0d1c3d'), fogFar: 175 }),
  build(ZONES[1], { fog: c('#200c2c'), fogFar: 140, key: c('#ff3fa4') }),
  build(ZONES[2], { fog: c('#5c2a06'), fogFar: 200, key: c('#ffc857'), fill: c('#e0761a') }),
  build(ZONES[3], { fog: c('#070d22'), fogFar: 210, key: c('#9dff4d') }),
];

export const zone3DAt = (index: number): Zone3D =>
  ZONES_3D[((index % ZONES_3D.length) + ZONES_3D.length) % ZONES_3D.length];

/** Mutates `out` to the blend of two zones — called every frame, allocates nothing. */
export const blendZones = (out: Zone3D, a: Zone3D, b: Zone3D, t: number): Zone3D => {
  out.name = t > 0.5 ? b.name : a.name;
  out.tagline = t > 0.5 ? b.tagline : a.tagline;
  out.weather = t > 0.5 ? b.weather : a.weather;
  out.fog.copy(a.fog).lerp(b.fog, t);
  out.fogNear = a.fogNear + (b.fogNear - a.fogNear) * t;
  out.fogFar = a.fogFar + (b.fogFar - a.fogFar) * t;
  for (let i = 0; i < 3; i++) out.sky[i].copy(a.sky[i]).lerp(b.sky[i], t);
  out.deck.copy(a.deck).lerp(b.deck, t);
  out.deckEdge.copy(a.deckEdge).lerp(b.deckEdge, t);
  out.building.copy(a.building).lerp(b.building, t);
  out.window.copy(a.window).lerp(b.window, t);
  out.accent.copy(a.accent).lerp(b.accent, t);
  out.accent2.copy(a.accent2).lerp(b.accent2, t);
  out.key.copy(a.key).lerp(b.key, t);
  out.fill.copy(a.fill).lerp(b.fill, t);
  return out;
};

export const cloneZone = (z: Zone3D): Zone3D => ({
  ...z,
  fog: z.fog.clone(),
  sky: [z.sky[0].clone(), z.sky[1].clone(), z.sky[2].clone()],
  deck: z.deck.clone(),
  deckEdge: z.deckEdge.clone(),
  building: z.building.clone(),
  window: z.window.clone(),
  accent: z.accent.clone(),
  accent2: z.accent2.clone(),
  key: z.key.clone(),
  fill: z.fill.clone(),
});

/**
 * Sky gradient as a 2×N texture. Regenerated only when the blended colours
 * actually move, because uploading a texture every frame is not free.
 */
export class SkyTexture {
  readonly texture: THREE.DataTexture;
  private data: Uint8Array;
  private last = '';
  private static readonly STEPS = 64;

  constructor() {
    this.data = new Uint8Array(SkyTexture.STEPS * 4);
    this.texture = new THREE.DataTexture(this.data, 1, SkyTexture.STEPS, THREE.RGBAFormat);
    this.texture.needsUpdate = true;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
  }

  update(zone: Zone3D): void {
    const key = `${zone.sky[0].getHexString()}${zone.sky[1].getHexString()}${zone.sky[2].getHexString()}`;
    if (key === this.last) return;
    this.last = key;
    const n = SkyTexture.STEPS;
    const tmp = new THREE.Color();
    for (let i = 0; i < n; i++) {
      // Row 0 is the bottom of the sphere, so walk the ramp from horizon up.
      const t = i / (n - 1);
      if (t < 0.5) tmp.copy(zone.sky[2]).lerp(zone.sky[1], t * 2);
      else tmp.copy(zone.sky[1]).lerp(zone.sky[0], (t - 0.5) * 2);
      this.data[i * 4 + 0] = Math.round(tmp.r * 255);
      this.data[i * 4 + 1] = Math.round(tmp.g * 255);
      this.data[i * 4 + 2] = Math.round(tmp.b * 255);
      this.data[i * 4 + 3] = 255;
    }
    this.texture.needsUpdate = true;
  }
}
