#!/usr/bin/env node
// solve.mjs — breadth-first search over a level's single-run state space.
//
// This exists for two reasons.
//
// 1. Authoring. It returns the shortest loop-free solution, so solution strings for the
//    levels that need no rewind are derived rather than typed, and cannot silently rot when
//    a rule changes.
//
// 2. Proof. The interesting claim this game makes is that the half-dimension is load-bearing —
//    that flipping phase is not decoration. That claim is cheap to assert and easy to get
//    wrong, so the test suite instead asks this solver to fail: it searches the entire
//    reachable space with FLIP removed and requires that no solution exists. Likewise a level
//    advertised as needing the time axis must be provably unsolvable in a single run.
//
// Ghosts are deliberately outside the search. Searching over recordings means searching over
// strategies, which is a different and far larger problem; the loop levels are hand-authored
// and checked by replay instead. Everything this solver proves, it proves about the subspace
// with no rewinds — which is exactly the subspace the "needs a rewind" claim is about.

import { start, tick, clone, checkWin, DIRS } from '../src/sim.js';

const MOVES = Object.keys(DIRS); // waiting is inert with no other actors, so it is omitted

function key(s) {
  const seeds = s.seeds
    .map((p) => `${p.x},${p.y},${p.z}`)
    .sort()                       // seeds are interchangeable for the win test
    .join(';');
  return `${s.player.x},${s.player.y},${s.player.z}|${seeds}|${s.phase}`;
}

/**
 * @returns {{solved: boolean, solution?: string, explored: number, exhausted: boolean}}
 *   `exhausted` distinguishes "searched everything, no solution exists" — the only result
 *   strong enough to support a negative claim — from "hit the node cap and gave up".
 */
export function solve(level, { allowFlip = true, maxNodes = 3_000_000 } = {}) {
  const actions = allowFlip ? [...MOVES, 'F'] : MOVES;

  const root = start(level);
  if (root.lost) return { solved: false, explored: 0, exhausted: true };
  if (checkWin(root)) return { solved: true, solution: '', explored: 0, exhausted: true };

  const seen = new Set([key(root)]);
  let frontier = [{ state: root, path: '' }];
  let explored = 0;

  while (frontier.length) {
    const next = [];
    for (const node of frontier) {
      for (const a of actions) {
        if (explored >= maxNodes) return { solved: false, explored, exhausted: false };

        const s = clone(node.state);
        tick(s, a);
        explored++;

        if (s.lost) continue;
        const k = key(s);
        if (seen.has(k)) continue;
        seen.add(k);

        const path = node.path + a;
        if (s.won) return { solved: true, solution: path, explored, exhausted: true };
        next.push({ state: s, path });
      }
    }
    frontier = next;
  }

  return { solved: false, explored, exhausted: true };
}

// CLI: `node tools/solve.mjs [levelId...]` — prints the shortest loop-free solution for each
// level, and whether one still exists once the phase axis is taken away.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { LEVELS } = await import('../src/levels.js');
  const { parse } = await import('../src/sim.js');
  const wanted = process.argv.slice(2);

  for (const def of LEVELS) {
    if (wanted.length && !wanted.includes(def.id)) continue;
    const level = parse(def);
    const withFlip = solve(level);
    const without = solve(level, { allowFlip: false });

    const len = withFlip.solved ? withFlip.solution.length : '—';
    console.log(
      `${def.id.padEnd(14)} loop-free: ${(withFlip.solved ? `yes (${len} moves)` : 'NO').padEnd(18)}` +
      `without flip: ${(without.solved ? `yes (${without.solution.length})` : without.exhausted ? 'NO (proved)' : 'unknown').padEnd(14)}` +
      `nodes: ${withFlip.explored}`,
    );
    if (withFlip.solved) console.log(`${' '.repeat(16)}${withFlip.solution}`);
  }
}
