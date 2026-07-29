import { SPECIES } from '../data/species.js';
import { MOVES } from '../data/moves.js';
import { typeMult } from '../data/types.js';
import { rng } from '../core/rng.js';

const STAGE = [2 / 8, 2 / 7, 2 / 6, 2 / 5, 2 / 4, 2 / 3, 1, 3 / 2, 4 / 2, 5 / 2, 6 / 2, 7 / 2, 8 / 2];
export function stageMult(stage) {
  return STAGE[Math.max(-6, Math.min(6, stage)) + 6];
}
const ACC_STAGE = [3 / 9, 3 / 8, 3 / 7, 3 / 6, 3 / 5, 3 / 4, 1, 4 / 3, 5 / 3, 6 / 3, 7 / 3, 8 / 3, 9 / 3];
export function accStageMult(stage) {
  return ACC_STAGE[Math.max(-6, Math.min(6, stage)) + 6];
}

export function effectiveStat(side, key) {
  let v = side.creature.stats[key] * stageMult(side.stages[key] || 0);
  if (key === 'atk' && side.creature.status === 'burn') v *= 0.5;
  if (key === 'spe' && side.creature.status === 'para') v *= 0.5;
  return Math.max(1, Math.floor(v));
}

export function accuracyCheck(attacker, defender, move) {
  if (move.acc >= 100 && !attacker.stages.acc && !defender.stages.eva) return true;
  const acc = move.acc * accStageMult((attacker.stages.acc || 0) - (defender.stages.eva || 0));
  return rng.next() * 100 < acc;
}

/**
 * Gen-3 style damage: the level term, an attack/defence ratio, then the
 * multiplier stack (crit, STAB, type, spread).
 */
export function calcDamage(attacker, defender, move) {
  const a = attacker.creature;
  const d = defender.creature;
  const phys = move.cat === 'phys';
  const atk = effectiveStat(attacker, phys ? 'atk' : 'spa');
  const def = effectiveStat(defender, phys ? 'def' : 'spd');
  const crit = rng.next() < 0.0625;
  let dmg = Math.floor(Math.floor(Math.floor((2 * a.level) / 5 + 2) * move.pow * atk / def) / 50) + 2;
  if (crit) dmg = Math.floor(dmg * 2);
  const stab = SPECIES[a.id].types.includes(move.type) ? 1.5 : 1;
  const eff = typeMult(move.type, SPECIES[d.id].types);
  dmg = Math.floor(dmg * stab);
  dmg = Math.floor(dmg * eff);
  dmg = Math.floor(dmg * (0.85 + rng.next() * 0.15));
  return { damage: Math.max(eff === 0 ? 0 : 1, dmg), eff, crit };
}

export function effLabel(eff) {
  if (eff === 0) return "It had no effect…";
  if (eff >= 2) return "It's super effective!";
  if (eff > 1) return "It's super effective!";
  if (eff <= 0.5) return "It's not very effective…";
  return null;
}

/** Gen-3 capture maths, shake count included. */
export function captureRoll(foe, ballRate) {
  const rate = SPECIES[foe.id].catchRate;
  const statusBonus = foe.status === 'sleep' ? 2 : foe.status ? 1.5 : 1;
  const a = (((3 * foe.maxhp - 2 * foe.hp) * rate * ballRate) / (3 * foe.maxhp)) * statusBonus;
  if (a >= 255) return { caught: true, shakes: 3 };
  const b = Math.floor(1048560 / Math.floor(Math.sqrt(Math.floor(Math.sqrt(Math.floor(16711680 / a))))));
  let shakes = 0;
  for (let i = 0; i < 4; i++) {
    if (Math.floor(rng.next() * 65536) < b) shakes++;
    else break;
  }
  return { caught: shakes === 4, shakes: Math.min(3, shakes) };
}

/** Simple but type-aware AI. */
export function chooseAiMove(self, foe) {
  const usable = self.creature.moves.filter((m) => m.pp > 0);
  if (!usable.length) return null;
  if (rng.chance(0.18)) return rng.pick(usable);
  let best = usable[0];
  let bestScore = -1;
  for (const mv of usable) {
    const move = MOVES[mv.id];
    let score;
    if (move.cat === 'status') {
      score = 22 + rng.int(14);
      if (move.heal && self.creature.hp > self.creature.maxhp * 0.6) score = 4;
      if (move.status && foe.creature.status) score = 3;
    } else {
      const phys = move.cat === 'phys';
      const atk = effectiveStat(self, phys ? 'atk' : 'spa');
      const def = effectiveStat(foe, phys ? 'def' : 'spd');
      const eff = typeMult(move.type, SPECIES[foe.creature.id].types);
      const stab = SPECIES[self.creature.id].types.includes(move.type) ? 1.5 : 1;
      score = (move.pow * (atk / def) * eff * stab * (move.acc / 100)) / 4;
    }
    score += rng.next() * 6;
    if (score > bestScore) { bestScore = score; best = mv; }
  }
  return best;
}

export function makeSide(creature, isPlayer) {
  return {
    creature,
    isPlayer,
    stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
    flinch: false,
    turns: 0,
  };
}

export const STAT_LABEL = { atk: 'ATTACK', def: 'DEFENCE', spa: 'SP.ATK', spd: 'SP.DEF', spe: 'SPEED', acc: 'accuracy', eva: 'evasion' };
