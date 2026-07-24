/** Visual identity of each zone. Zones cycle every 900 m of a run. */

export interface ZonePalette {
  name: string;
  tagline: string;
  sky: [string, string, string];
  sun: string;
  sunY: number;
  far: string;
  mid: string;
  near: string;
  window: string;
  accent: string;
  accent2: string;
  ground: string;
  groundGlow: string;
  fog: string;
  weather: 'none' | 'rain' | 'ember' | 'star';
}

export const ZONES: ZonePalette[] = [
  {
    name: 'THE CONDUIT',
    tagline: 'Transit spine · sector 9',
    sky: ['#050a1b', '#0d1c3d', '#1b3b63'],
    sun: 'rgba(69,245,255,0.35)',
    sunY: 0.34,
    far: '#0d1830',
    mid: '#132242',
    near: '#0b1428',
    window: '#45f5ff',
    accent: '#45f5ff',
    accent2: '#ff3fa4',
    ground: '#0a1020',
    groundGlow: '#45f5ff',
    fog: 'rgba(20,50,90,0.55)',
    weather: 'none',
  },
  {
    name: 'UNDERCITY',
    tagline: 'Below the stacks · rain never stops',
    sky: ['#0a0512', '#200c2c', '#40133f'],
    sun: 'rgba(255,63,164,0.3)',
    sunY: 0.42,
    far: '#1a0d28',
    mid: '#24123a',
    near: '#140a20',
    window: '#ff5fbf',
    accent: '#ff3fa4',
    accent2: '#7b2ff7',
    ground: '#12081c',
    groundGlow: '#ff3fa4',
    fog: 'rgba(70,20,80,0.55)',
    weather: 'rain',
  },
  {
    name: 'SOLAR SPINE',
    tagline: 'Above the smog line · full glare',
    sky: ['#1a0a02', '#5c2a06', '#e0761a'],
    sun: 'rgba(255,214,102,0.55)',
    sunY: 0.5,
    far: '#3a1c08',
    mid: '#54280c',
    near: '#2a1406',
    window: '#ffd166',
    accent: '#ffc857',
    accent2: '#ff6b35',
    ground: '#2a1608',
    groundGlow: '#ffc857',
    fog: 'rgba(180,90,20,0.45)',
    weather: 'ember',
  },
  {
    name: 'VOID LINE',
    tagline: 'Outer rail · vacuum sealed',
    sky: ['#02040c', '#070d22', '#0d1a3a'],
    sun: 'rgba(157,255,77,0.25)',
    sunY: 0.26,
    far: '#070d1e',
    mid: '#0a1428',
    near: '#050a16',
    window: '#9dff4d',
    accent: '#9dff4d',
    accent2: '#45f5ff',
    ground: '#05080f',
    groundGlow: '#9dff4d',
    fog: 'rgba(10,25,50,0.6)',
    weather: 'star',
  },
];

export const zoneAt = (index: number): ZonePalette => ZONES[((index % ZONES.length) + ZONES.length) % ZONES.length];

/** High-contrast accessibility variant: pushes obstacle-critical hues apart. */
export const contrastBoost = (p: ZonePalette): ZonePalette => ({
  ...p,
  sky: ['#02040a', '#050b18', '#0a1424'],
  far: '#0a1020',
  mid: '#0e1830',
  near: '#060c18',
  fog: 'rgba(5,10,20,0.6)',
  accent: '#ffffff',
  groundGlow: '#ffffff',
});

/** Mix two hex colours (both `#rrggbb`). */
export const mix = (a: string, b: string, t: number): string => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round((((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t));
  const g = Math.round((((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t));
  const bl = Math.round(((pa & 255) * (1 - t) + (pb & 255) * t));
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
};

export const withAlpha = (hex: string, alpha: number): string => {
  const p = parseInt(hex.slice(1), 16);
  return `rgba(${(p >> 16) & 255},${(p >> 8) & 255},${p & 255},${alpha})`;
};
