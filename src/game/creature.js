import { SPECIES, xpForLevel, levelFromXp } from '../data/species.js';
import { MOVES } from '../data/moves.js';
import { rng } from '../core/rng.js';

export function statAt(base, iv, level, isHp) {
  if (isHp) return Math.floor(((2 * base + iv) * level) / 100) + level + 10;
  return Math.floor(((2 * base + iv) * level) / 100) + 5;
}

export function recalcStats(c) {
  const sp = SPECIES[c.id];
  const s = {};
  for (const k of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
    s[k] = statAt(sp.base[k], c.ivs[k], c.level, k === 'hp');
  }
  c.stats = s;
  c.maxhp = s.hp;
  return s;
}

/** The four most recent level-up moves the species would know. */
export function movesAtLevel(speciesId, level) {
  const sp = SPECIES[speciesId];
  const known = [];
  for (const [lv, id] of sp.learn) {
    if (lv > level) break;
    if (!known.includes(id)) known.push(id);
  }
  return known.slice(-4);
}

export function makeMove(id) {
  const m = MOVES[id];
  return { id, pp: m.pp, maxpp: m.pp };
}

export function makeCreature(speciesId, level, opts = {}) {
  const sp = SPECIES[speciesId];
  if (!sp) throw new Error('unknown species ' + speciesId);
  const ivs = {};
  for (const k of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
    ivs[k] = opts.perfect ? 31 : rng.int(32);
  }
  const c = {
    id: speciesId,
    nick: opts.nick || sp.name,
    level,
    xp: xpForLevel(level),
    ivs,
    moves: (opts.moves || movesAtLevel(speciesId, level)).map(makeMove),
    status: null,
    sleep: 0,
    hp: 0,
    maxhp: 0,
    stats: null,
    ot: opts.ot || null,
    caught: opts.caught || null,
  };
  recalcStats(c);
  c.hp = c.maxhp;
  return c;
}

export function healFull(c) {
  recalcStats(c);
  c.hp = c.maxhp;
  c.status = null;
  c.sleep = 0;
  for (const m of c.moves) m.pp = m.maxpp;
}

export function isFainted(c) {
  return c.hp <= 0;
}

export function xpToNext(c) {
  if (c.level >= 100) return 0;
  return xpForLevel(c.level + 1) - c.xp;
}

export function xpProgress(c) {
  if (c.level >= 100) return 1;
  const lo = xpForLevel(c.level);
  const hi = xpForLevel(c.level + 1);
  return Math.max(0, Math.min(1, (c.xp - lo) / (hi - lo)));
}

/**
 * Add XP and report what happened: levels gained, moves that can be learned and
 * whether the creature is ready to evolve.
 */
export function gainXp(c, amount) {
  const result = { levels: 0, learned: [], pending: [], evolve: null, before: c.level };
  if (c.level >= 100) return result;
  c.xp += amount;
  const newLevel = Math.min(100, levelFromXp(c.xp));
  const sp = SPECIES[c.id];
  while (c.level < newLevel) {
    c.level++;
    result.levels++;
    const before = c.maxhp;
    recalcStats(c);
    c.hp += c.maxhp - before;
    for (const [lv, id] of sp.learn) {
      if (lv !== c.level) continue;
      if (c.moves.some((m) => m.id === id)) continue;
      if (c.moves.length < 4) {
        c.moves.push(makeMove(id));
        result.learned.push(id);
      } else {
        result.pending.push(id);
      }
    }
    if (sp.evolve && c.level >= sp.evolve.level && !result.evolve) {
      result.evolve = sp.evolve.into;
    }
  }
  return result;
}

export function evolveInto(c, newId) {
  const oldName = SPECIES[c.id].name;
  const wasNick = c.nick === oldName;
  c.id = newId;
  if (wasNick) c.nick = SPECIES[newId].name;
  const before = c.maxhp;
  recalcStats(c);
  c.hp = Math.min(c.maxhp, c.hp + (c.maxhp - before));
  return c;
}

/** XP awarded to a single participant for defeating `foe`. */
export function xpAward(foe, isTrainer) {
  const b = SPECIES[foe.id].baseExp;
  return Math.max(1, Math.floor((b * foe.level * (isTrainer ? 1.5 : 1)) / 7));
}

export const STATUS_LABEL = { burn: 'BRN', para: 'PAR', sleep: 'SLP' };
export const STATUS_COLOR = { burn: '#e07038', para: '#e0c040', sleep: '#9088c0' };
