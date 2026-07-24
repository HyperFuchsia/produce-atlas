import { Rng } from '../engine/rng';
import type { MissionSave, Profile } from '../engine/storage';
import type { RunStats } from './world';

/**
 * Three rotating contracts. They exist to give a reason to play differently —
 * every template rewards a verb the player might otherwise ignore.
 */

export type MissionMode = 'cumulative' | 'best';

export interface MissionDef {
  id: string;
  mode: MissionMode;
  /** Pull the relevant number out of a finished run. */
  read: (s: RunStats) => number;
  target: (level: number) => number;
  text: (target: number) => string;
  xp: number;
  shards: number;
}

export const MISSION_DEFS: MissionDef[] = [
  {
    id: 'distance-total',
    mode: 'cumulative',
    read: (s) => s.distance,
    target: (l) => 1200 + l * 400,
    text: (t) => `Run ${Math.round(t)} m in total`,
    xp: 60,
    shards: 120,
  },
  {
    id: 'distance-single',
    mode: 'best',
    read: (s) => s.distance,
    target: (l) => 600 + l * 130,
    text: (t) => `Reach ${Math.round(t)} m in a single run`,
    xp: 90,
    shards: 180,
  },
  {
    id: 'vaults',
    mode: 'cumulative',
    read: (s) => s.vaults,
    target: (l) => 20 + l * 8,
    text: (t) => `Vault ${t} barriers`,
    xp: 60,
    shards: 110,
  },
  {
    id: 'perfects',
    mode: 'cumulative',
    read: (s) => s.perfects,
    target: (l) => 8 + l * 4,
    text: (t) => `Land ${t} perfect vaults`,
    xp: 90,
    shards: 170,
  },
  {
    id: 'shatters',
    mode: 'cumulative',
    read: (s) => s.shatters,
    target: (l) => 10 + l * 4,
    text: (t) => `Dive through ${t} glass panels`,
    xp: 70,
    shards: 130,
  },
  {
    id: 'shards',
    mode: 'cumulative',
    read: (s) => s.shards,
    target: (l) => 250 + l * 90,
    text: (t) => `Collect ${t} shards`,
    xp: 55,
    shards: 100,
  },
  {
    id: 'cores',
    mode: 'cumulative',
    read: (s) => s.cores,
    target: (l) => 4 + Math.floor(l * 1.5),
    text: (t) => `Recover ${t} data cores`,
    xp: 80,
    shards: 160,
  },
  {
    id: 'combo',
    mode: 'best',
    read: (s) => s.maxCombo,
    target: (l) => Math.min(12, 4 + Math.floor(l * 0.7)),
    text: (t) => `Hold a x${t} multiplier`,
    xp: 85,
    shards: 150,
  },
  {
    id: 'flow',
    mode: 'cumulative',
    read: (s) => s.flowsEntered,
    target: (l) => 3 + Math.floor(l * 0.8),
    text: (t) => `Enter Flow State ${t} times`,
    xp: 75,
    shards: 140,
  },
  {
    id: 'closecalls',
    mode: 'cumulative',
    read: (s) => s.closeCalls,
    target: (l) => 12 + l * 4,
    text: (t) => `Squeeze past ${t} close calls`,
    xp: 70,
    shards: 130,
  },
  {
    id: 'score',
    mode: 'best',
    read: (s) => s.score,
    target: (l) => 4000 + l * 1400,
    text: (t) => `Score ${Math.round(t).toLocaleString()} in one run`,
    xp: 95,
    shards: 190,
  },
];

export const missionById = (id: string): MissionDef | undefined => MISSION_DEFS.find((m) => m.id === id);

export interface MissionView {
  id: string;
  text: string;
  progress: number;
  target: number;
  done: boolean;
  claimed: boolean;
  xp: number;
  shards: number;
}

export const targetFor = (def: MissionDef, level: number): number => def.target(level);

/** Roll a fresh set of three distinct contracts. */
export const rollMissions = (profile: Profile): MissionSave[] => {
  const rng = new Rng(0x51ed ^ (profile.missionRolls * 2654435761) ^ profile.level);
  const picks = rng.shuffled(MISSION_DEFS).slice(0, 3);
  return picks.map((def) => ({ id: def.id, progress: 0, done: false, claimed: false }));
};

export const ensureMissions = (profile: Profile): void => {
  if (!profile.missions || profile.missions.length !== 3 || profile.missions.some((m) => !missionById(m.id))) {
    profile.missions = rollMissions(profile);
  }
};

export const viewMissions = (profile: Profile): MissionView[] => {
  ensureMissions(profile);
  return profile.missions.map((m) => {
    const def = missionById(m.id)!;
    const target = targetFor(def, profile.level);
    return {
      id: m.id,
      text: def.text(target),
      progress: Math.min(m.progress, target),
      target,
      done: m.done || m.progress >= target,
      claimed: m.claimed,
      xp: def.xp,
      shards: def.shards,
    };
  });
};

export interface MissionCompletion {
  id: string;
  text: string;
  xp: number;
  shards: number;
}

/**
 * Fold a finished run into mission progress. Returns the contracts that just
 * completed so the results screen can celebrate them.
 */
export const applyRunToMissions = (profile: Profile, stats: RunStats): MissionCompletion[] => {
  ensureMissions(profile);
  const completed: MissionCompletion[] = [];
  for (const m of profile.missions) {
    const def = missionById(m.id);
    if (!def || m.done) continue;
    const target = targetFor(def, profile.level);
    const value = def.read(stats);
    m.progress = def.mode === 'cumulative' ? m.progress + value : Math.max(m.progress, value);
    if (m.progress >= target) {
      m.done = true;
      completed.push({ id: m.id, text: def.text(target), xp: def.xp, shards: def.shards });
    }
  }
  return completed;
};

/** All three done → pay out, bank the roll counter, and deal a new hand. */
export const refreshIfComplete = (profile: Profile): boolean => {
  ensureMissions(profile);
  if (!profile.missions.every((m) => m.done)) return false;
  profile.missionRolls++;
  profile.missions = rollMissions(profile);
  return true;
};
