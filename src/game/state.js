import { makeCreature, healFull, recalcStats } from './creature.js';
import { SPECIES } from '../data/species.js';

const SAVE_KEY = 'wildbound.save.v1';

export const G = {
  started: false,
  player: { name: 'ROWAN', pal: 'player', map: 'home', x: 7, y: 6, dir: 0 },
  party: [],
  box: [],
  bag: { bondorb: 5, salve: 3 },
  money: 3000,
  flags: {},
  seen: {},
  caught: {},
  starter: null,
  rivalStarter: null,
  playtime: 0,
  badges: 0,
};

export function resetGame() {
  G.started = false;
  G.player = { name: 'ROWAN', pal: 'player', map: 'home', x: 7, y: 6, dir: 0 };
  G.party = [];
  G.box = [];
  G.bag = { bondorb: 5, salve: 3 };
  G.money = 3000;
  G.flags = {};
  G.seen = {};
  G.caught = {};
  G.starter = null;
  G.rivalStarter = null;
  G.playtime = 0;
  G.badges = 0;
}

export function flag(name) {
  return !!G.flags[name];
}
export function setFlag(name, v = true) {
  G.flags[name] = v;
}

export function addItem(id, n = 1) {
  G.bag[id] = (G.bag[id] || 0) + n;
}
export function removeItem(id, n = 1) {
  if (!G.bag[id]) return false;
  G.bag[id] -= n;
  if (G.bag[id] <= 0) delete G.bag[id];
  return true;
}
export function itemCount(id) {
  return G.bag[id] || 0;
}
export function bagList() {
  return Object.keys(G.bag).filter((k) => G.bag[k] > 0);
}

export function addToParty(creature) {
  if (G.party.length < 6) {
    G.party.push(creature);
    return 'party';
  }
  G.box.push(creature);
  return 'box';
}

export function firstHealthy() {
  return G.party.findIndex((c) => c.hp > 0);
}
export function partyAlive() {
  return G.party.some((c) => c.hp > 0);
}
export function healParty() {
  for (const c of G.party) healFull(c);
}

export function markSeen(id) {
  G.seen[id] = true;
}
export function markCaught(id) {
  G.seen[id] = true;
  G.caught[id] = true;
}
export function dexCounts() {
  return { seen: Object.keys(G.seen).length, caught: Object.keys(G.caught).length, total: Object.keys(SPECIES).length };
}

// ---------------------------------------------------------------------------
export function saveGame() {
  try {
    const data = {
      v: 1,
      player: G.player,
      party: G.party,
      box: G.box,
      bag: G.bag,
      money: G.money,
      flags: G.flags,
      seen: G.seen,
      caught: G.caught,
      starter: G.starter,
      rivalStarter: G.rivalStarter,
      playtime: Math.floor(G.playtime),
      badges: G.badges,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch (e) {
    return false;
  }
}

export function peekSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return {
      name: d.player?.name || 'ROWAN',
      party: d.party?.length || 0,
      playtime: d.playtime || 0,
      caught: Object.keys(d.caught || {}).length,
    };
  } catch (e) {
    return null;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    G.player = d.player;
    G.party = d.party || [];
    G.box = d.box || [];
    G.bag = d.bag || {};
    G.money = d.money ?? 0;
    G.flags = d.flags || {};
    G.seen = d.seen || {};
    G.caught = d.caught || {};
    G.starter = d.starter || null;
    G.rivalStarter = d.rivalStarter || null;
    G.playtime = d.playtime || 0;
    G.badges = d.badges || 0;
    G.started = true;
    for (const c of G.party) recalcStats(c);
    for (const c of G.box) recalcStats(c);
    return true;
  } catch (e) {
    return false;
  }
}

export function deleteSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}

export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

/** Convenience for scripted gifts. */
export function giveCreature(speciesId, level, opts) {
  const c = makeCreature(speciesId, level, opts);
  markCaught(speciesId);
  addToParty(c);
  return c;
}
