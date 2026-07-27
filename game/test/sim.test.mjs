import test from 'node:test';
import assert from 'node:assert/strict';

import { parse, start, tick, clone, replay, rewind, checkWin, PH_WILD, PH_CULT } from '../src/sim.js';
import { LEVELS, NEEDS_TIME, NEEDS_PHASE } from '../src/levels.js';
import { solve } from '../tools/solve.mjs';

const levels = new Map(LEVELS.map((d) => [d.id, parse(d)]));

test('every level parses and has a distinct id', () => {
  const ids = LEVELS.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(levels.size, LEVELS.length);
});

test('every level ships a solution that actually wins', async (t) => {
  for (const def of LEVELS) {
    await t.test(def.id, () => {
      const r = replay(levels.get(def.id), def.solution);
      assert.ok(r.ok, `${def.id}: ${r.reason} (t=${r.state.t}, loops=${r.state.ghosts.length})`);
    });
  }
});

test('no solution overspends its loop budget', () => {
  for (const def of LEVELS) {
    const used = (def.solution.match(/R/g) || []).length;
    assert.ok(used <= def.maxLoops, `${def.id} rewinds ${used}× with a budget of ${def.maxLoops}`);
  }
});

// ── The claims the game makes about its own dimensions ──────────────────────────────────
// These are the tests that matter. A game can call itself 4.5-dimensional and have the half
// be decoration; these fail if the phase and time axes are not load-bearing.

test('levels that claim to need the phase axis are unsolvable without it', async (t) => {
  for (const id of NEEDS_PHASE) {
    await t.test(id, () => {
      const r = solve(levels.get(id), { allowFlip: false });
      assert.ok(r.exhausted, `${id}: search hit the node cap, so proves nothing`);
      assert.ok(!r.solved, `${id} is solvable with no flips in ${r.solution?.length} moves — the phase axis is decoration here`);
    });
  }
});

test('levels that claim to need the time axis are unsolvable in a single run', async (t) => {
  for (const id of NEEDS_TIME) {
    await t.test(id, () => {
      const r = solve(levels.get(id));
      assert.ok(r.exhausted, `${id}: search hit the node cap, so proves nothing`);
      assert.ok(!r.solved, `${id} is solvable without rewinding in ${r.solution?.length} moves — the time axis is decoration here`);
    });
  }
});

test('levels that do not claim to need time really are solvable in one run', async (t) => {
  for (const def of LEVELS) {
    if (NEEDS_TIME.includes(def.id)) continue;
    await t.test(def.id, () => {
      const r = solve(levels.get(def.id));
      assert.ok(r.solved, `${def.id} claims to be loop-free but no single-run solution exists`);
    });
  }
});

// ── Rules ────────────────────────────────────────────────────────────────────────────────

test('phase only changes terrain solidity, never geometry', () => {
  const lv = levels.get('shatter');
  const s = start(lv);
  assert.equal(s.phase, PH_WILD);
  tick(s, 'F');
  assert.equal(s.phase, PH_CULT);
  tick(s, 'F');
  assert.equal(s.phase, PH_WILD);
});

test('a flip that would bury the courier under bedrock is a loss, not a teleport', () => {
  const lv = parse({
    id: 'crush',
    layers: [
      ['###', '###', '###'],
      ['..o', '@c.', '..s'],
      ['###', '###', '###'],
    ],
  });
  const s = start(lv);
  tick(s, 'E');            // step into the cell the terrace will fill
  assert.equal(s.player.x, 1);
  tick(s, 'F');            // ceiling directly above, nowhere to be ejected to
  assert.equal(s.lost, 'crush');
});

test('falling out of the world is a loss', () => {
  const lv = parse({
    id: 'pit',
    layers: [
      ['#.#', '#.#', '#.#'],
      ['...', '@.o', '..s'],
    ],
  });
  const s = start(lv);
  tick(s, 'E');
  assert.equal(s.lost, 'void');
});

test('seeds cannot be pushed into each other', () => {
  const lv = parse({
    id: 'jam',
    layers: [
      ['#####', '#####', '#####'],
      ['.....', '@ss.o', '.....'],
    ],
  });
  const s = start(lv);
  tick(s, 'E');
  assert.deepEqual([s.player.x, s.seeds[0].x, s.seeds[1].x], [0, 1, 2], 'nothing should have moved');
});

test('a courier walking into a past self climbs onto them', () => {
  const lv = levels.get('scaffold');
  let s = start(lv);
  tick(s, 'E');
  s = rewind(s, ['E']);
  assert.equal(s.ghosts.length, 1);
  tick(s, 'E');                       // ghost steps east, courier steps into it
  assert.equal(s.ghosts[0].y, 1);
  assert.equal(s.player.y, 2, 'courier should be standing on the ghost');
  assert.equal(s.player.x, s.ghosts[0].x);
});

test('a ghost holds a seed up over a gap', () => {
  const lv = levels.get('causeway');
  // Two pushes puts the seed over the gap at x=3, where the only thing under it is a ghost.
  const r = replay(lv, 'SEEEN' + 'R' + '...EE');
  const s = r.state;
  const bridged = s.seeds.find((seed) => seed.x === 3 && seed.y === 2);
  assert.ok(bridged, `seed should be resting on the ghost at x=3,y=2, found ${JSON.stringify(s.seeds)}`);
  assert.equal(s.ghosts[0].y, 1);
});

test('the loop budget is enforced', () => {
  const lv = levels.get('furrow');           // budget of zero
  const s = start(lv);
  assert.equal(rewind(s, ['E']), null);
});

test('rewinding preserves recordings and resets the world', () => {
  const lv = levels.get('causeway');
  const s = start(lv);
  tick(s, 'S');
  tick(s, 'E');
  const after = rewind(s, ['S', 'E']);
  assert.equal(after.t, 0);
  assert.deepEqual(after.ghosts[0].actions, ['S', 'E']);
  assert.deepEqual(after.player, lv.spawn);
  assert.deepEqual(after.ghosts[0], { actions: ['S', 'E'], ...lv.spawn });
});

test('cloning is deep enough that undo cannot be corrupted', () => {
  const s = start(levels.get('furrow'));
  const snap = clone(s);
  tick(s, 'E');
  tick(s, 'E');
  assert.notDeepEqual(s.player, snap.player);
  assert.equal(snap.t, 0);
  assert.deepEqual(snap.seeds, start(levels.get('furrow')).seeds);
});

test('the simulation is deterministic', () => {
  for (const def of LEVELS) {
    const a = replay(levels.get(def.id), def.solution);
    const b = replay(levels.get(def.id), def.solution);
    assert.equal(a.ok, b.ok);
    assert.deepEqual(a.state.player, b.state.player);
    assert.deepEqual(a.state.seeds, b.state.seeds);
    assert.equal(a.state.phase, b.state.phase);
  }
});

test('a win requires every plot filled, not just one', () => {
  const lv = levels.get('sheaf');
  const s = start(lv);
  tick(s, 'E');            // moves one seed onto a terrace cell, fills nothing
  assert.equal(checkWin(s), false);
  assert.equal(s.won, false);
});
