/**
 * Versioned local save. Everything the player earns is stored on-device only —
 * no accounts, no network, nothing to declare beyond "Data Not Collected".
 */

export interface Settings {
  sfx: boolean;
  music: boolean;
  haptics: boolean;
  quality: 'auto' | 'high' | 'low';
  screenShake: boolean;
  highContrast: boolean;
  invertTouch: boolean;
  showFps: boolean;
}

export interface MissionSave {
  id: string;
  progress: number;
  done: boolean;
  claimed: boolean;
}

export interface Profile {
  version: number;
  shards: number;
  bestScore: number;
  bestDistance: number;
  totalRuns: number;
  totalDistance: number;
  totalVaults: number;
  totalDives: number;
  totalShards: number;
  xp: number;
  level: number;
  upgrades: Record<string, number>;
  ownedSkins: string[];
  skin: string;
  ownedTrails: string[];
  trail: string;
  missions: MissionSave[];
  missionRolls: number;
  lastDaily: string;
  dailyStreak: number;
  seenHowTo: boolean;
  settings: Settings;
}

const KEY = 'neon-vault.profile.v1';
const VERSION = 1;

export const defaultSettings = (): Settings => ({
  sfx: true,
  music: true,
  haptics: true,
  quality: 'auto',
  screenShake: true,
  highContrast: false,
  invertTouch: false,
  showFps: false,
});

export const defaultProfile = (): Profile => ({
  version: VERSION,
  shards: 0,
  bestScore: 0,
  bestDistance: 0,
  totalRuns: 0,
  totalDistance: 0,
  totalVaults: 0,
  totalDives: 0,
  totalShards: 0,
  xp: 0,
  level: 1,
  upgrades: {},
  ownedSkins: ['courier'],
  skin: 'courier',
  ownedTrails: ['none'],
  trail: 'none',
  missions: [],
  missionRolls: 0,
  lastDaily: '',
  dailyStreak: 0,
  seenHowTo: false,
  settings: defaultSettings(),
});

/** Merge unknown persisted data onto defaults so old saves never crash a new build. */
const migrate = (raw: unknown): Profile => {
  const base = defaultProfile();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Partial<Profile>;
  const merged: Profile = {
    ...base,
    ...data,
    upgrades: { ...base.upgrades, ...(data.upgrades ?? {}) },
    settings: { ...base.settings, ...(data.settings ?? {}) },
    ownedSkins: Array.from(new Set([...base.ownedSkins, ...(data.ownedSkins ?? [])])),
    ownedTrails: Array.from(new Set([...base.ownedTrails, ...(data.ownedTrails ?? [])])),
    missions: Array.isArray(data.missions) ? data.missions : [],
    version: VERSION,
  };
  // Guard against corrupted numerics (a NaN in a currency field is unrecoverable UX).
  const nums: (keyof Profile)[] = [
    'shards',
    'bestScore',
    'bestDistance',
    'totalRuns',
    'totalDistance',
    'totalVaults',
    'totalDives',
    'totalShards',
    'xp',
    'level',
    'missionRolls',
    'dailyStreak',
  ];
  for (const k of nums) {
    const v = merged[k] as unknown as number;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) (merged[k] as unknown as number) = 0;
  }
  if (merged.level < 1) merged.level = 1;
  return merged;
};

let memoryFallback: string | null = null;

const readRaw = (): string | null => {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return memoryFallback;
  }
};

const writeRaw = (value: string): void => {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Private browsing / quota — keep the session playable in memory.
    memoryFallback = value;
  }
};

export const loadProfile = (): Profile => {
  const raw = readRaw();
  if (!raw) return defaultProfile();
  try {
    return migrate(JSON.parse(raw));
  } catch {
    return defaultProfile();
  }
};

let saveTimer = 0;

export const saveProfile = (p: Profile): void => {
  writeRaw(JSON.stringify(p));
};

/** Coalesced save — safe to call on every shard pickup. */
export const saveProfileSoon = (p: Profile): void => {
  if (saveTimer) return;
  saveTimer = window.setTimeout(() => {
    saveTimer = 0;
    saveProfile(p);
  }, 400);
};

export const flushProfile = (p: Profile): void => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = 0;
  }
  saveProfile(p);
};

export const wipeProfile = (): Profile => {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    memoryFallback = null;
  }
  return defaultProfile();
};
