import type { Profile } from '../engine/storage';
import { saveProfileSoon } from '../engine/storage';
import { SKINS, TRAILS, UPGRADES, xpForLevel, type SkinDef, type TrailDef, type UpgradeDef } from './tuning';
import type { RunConfig, RunStats } from './world';

/** Meta-progression: wallets, levels, purchases, and the daily bonus. */

export const upgradeLevel = (p: Profile, id: string): number => p.upgrades[id] ?? 0;

export const upgradeValue = (p: Profile, id: string): number => {
  const def = UPGRADES.find((u) => u.id === id);
  return def ? def.value(upgradeLevel(p, id)) : 0;
};

export const upgradeCost = (p: Profile, def: UpgradeDef): number | null => {
  const lvl = upgradeLevel(p, def.id);
  return lvl >= def.maxLevel ? null : def.cost(lvl);
};

export const buyUpgrade = (p: Profile, id: string): boolean => {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return false;
  const cost = upgradeCost(p, def);
  if (cost === null || p.shards < cost) return false;
  p.shards -= cost;
  p.upgrades[id] = upgradeLevel(p, id) + 1;
  saveProfileSoon(p);
  return true;
};

export const skinLocked = (p: Profile, skin: SkinDef): string | null => {
  if (p.ownedSkins.includes(skin.id)) return null;
  if (skin.requires?.bestDistance && p.bestDistance < skin.requires.bestDistance) {
    return `Reach ${skin.requires.bestDistance} m`;
  }
  if (skin.requires?.level && p.level < skin.requires.level) return `Courier level ${skin.requires.level}`;
  return null;
};

export const buySkin = (p: Profile, id: string): boolean => {
  const def = SKINS.find((s) => s.id === id);
  if (!def || p.ownedSkins.includes(id)) return false;
  if (skinLocked(p, def)) return false;
  if (p.shards < def.cost) return false;
  p.shards -= def.cost;
  p.ownedSkins.push(id);
  p.skin = id;
  saveProfileSoon(p);
  return true;
};

export const buyTrail = (p: Profile, id: string): boolean => {
  const def = TRAILS.find((t) => t.id === id);
  if (!def || p.ownedTrails.includes(id)) return false;
  if (p.shards < def.cost) return false;
  p.shards -= def.cost;
  p.ownedTrails.push(id);
  p.trail = id;
  saveProfileSoon(p);
  return true;
};

export const currentSkin = (p: Profile): SkinDef => SKINS.find((s) => s.id === p.skin) ?? SKINS[0];
export const currentTrail = (p: Profile): TrailDef => TRAILS.find((t) => t.id === p.trail) ?? TRAILS[0];

export interface LevelUp {
  level: number;
  reward: number;
}

export const addXp = (p: Profile, amount: number): LevelUp[] => {
  p.xp += Math.max(0, Math.round(amount));
  const ups: LevelUp[] = [];
  let guard = 0;
  while (p.xp >= xpForLevel(p.level) && guard++ < 50) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    const reward = 100 + p.level * 40;
    p.shards += reward;
    ups.push({ level: p.level, reward });
  }
  return ups;
};

export const xpProgress = (p: Profile): { have: number; need: number; pct: number } => {
  const need = xpForLevel(p.level);
  return { have: p.xp, need, pct: Math.min(1, p.xp / need) };
};

/** XP earned from a run — distance dominates, style tops it up. */
export const xpForRun = (s: RunStats): number =>
  Math.round(s.distance / 12 + s.perfects * 3 + s.shatters * 2 + s.cores * 5 + s.flowsEntered * 8 + s.maxCombo * 2);

export const buildRunConfig = (p: Profile, seed: number): RunConfig => ({
  seed,
  headstart: upgradeValue(p, 'headstart'),
  startShields: upgradeValue(p, 'shield'),
  magnetLevel: upgradeLevel(p, 'magnet'),
  flowLevel: upgradeLevel(p, 'flow'),
  glovesLevel: upgradeLevel(p, 'gloves'),
  payoutLevel: upgradeLevel(p, 'payout'),
});

const todayKey = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface DailyResult {
  claimed: boolean;
  streak: number;
  reward: number;
}

/** One free stack of shards a day; streaks grow it up to a week. */
export const claimDaily = (p: Profile): DailyResult => {
  const today = todayKey();
  if (p.lastDaily === today) return { claimed: false, streak: p.dailyStreak, reward: 0 };
  const yesterday = todayKey(new Date(Date.now() - 86400000));
  p.dailyStreak = p.lastDaily === yesterday ? Math.min(7, p.dailyStreak + 1) : 1;
  p.lastDaily = today;
  const reward = 60 + p.dailyStreak * 40;
  p.shards += reward;
  saveProfileSoon(p);
  return { claimed: true, streak: p.dailyStreak, reward };
};

export interface RunSummary {
  score: number;
  distance: number;
  shards: number;
  newBest: boolean;
  xp: number;
  levelUps: LevelUp[];
}

/** Bank a finished run into the profile. */
export const bankRun = (p: Profile, s: RunStats): RunSummary => {
  const score = Math.round(s.score);
  const distance = Math.round(s.distance);
  const newBest = score > p.bestScore;

  p.shards += s.shards;
  p.totalShards += s.shards;
  p.totalRuns++;
  p.totalDistance += distance;
  p.totalVaults += s.vaults;
  p.totalDives += s.shatters;
  p.bestScore = Math.max(p.bestScore, score);
  p.bestDistance = Math.max(p.bestDistance, distance);

  const xp = xpForRun(s);
  const levelUps = addXp(p, xp);
  saveProfileSoon(p);

  return { score, distance, shards: s.shards, newBest, xp, levelUps };
};
