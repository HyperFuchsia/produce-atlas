import { describe, expect, it } from 'vitest';
import { Autopilot } from '../src/game/autopilot';
import { PATTERNS, patternsFor } from '../src/game/patterns';
import { Rng } from '../src/engine/rng';
import { makeObstacle, type Obstacle } from '../src/game/entities';
import { Spawner } from '../src/game/spawner';
import { PLAYER, RUN } from '../src/game/tuning';
import { World, type RunConfig } from '../src/game/world';
import { clamp, overlaps } from '../src/engine/math';

const FIXED_DT = 1 / 120;

const baseConfig = (seed: number): RunConfig => ({
  seed,
  headstart: 0,
  startShields: 0,
  magnetLevel: 0,
  flowLevel: 0,
  glovesLevel: 0,
  payoutLevel: 0,
});

/** Run the bot through a full simulated run and report what happened. */
const simulate = (seed: number, seconds: number) => {
  const world = new World();
  const bot = new Autopilot();
  world.start(baseConfig(seed));
  let deaths = 0;
  let steps = 0;
  const maxSteps = Math.round(seconds / FIXED_DT);
  let peakObstacles = 0;
  let furthest = 0;

  while (steps < maxSteps) {
    const intent = bot.update(world, FIXED_DT);
    world.step(FIXED_DT, intent.wantJump, intent.wantDive, intent.holdJump, intent.holdDive);
    world.events.length = 0;
    peakObstacles = Math.max(peakObstacles, world.spawner.obstacles.length);
    furthest = Math.max(furthest, world.stats.distance);
    if (world.phase === 'revive' || world.phase === 'over') {
      deaths++;
      if (deaths > 40) break;
      world.start(baseConfig(seed + deaths * 7919));
      bot.reset();
    }
    steps++;
  }
  return { world, deaths, peakObstacles, distance: furthest };
};

describe('physics', () => {
  it('produces a jump arc that clears a standard barrier', () => {
    // Apex height of a full-hold jump must exceed the tallest vaultable barrier.
    const apex = (PLAYER.jumpVelocity * PLAYER.jumpVelocity) / (2 * PLAYER.gravity * PLAYER.riseGravityMul);
    expect(apex).toBeGreaterThan(1.4);
    // ...but not so high that a 1.15 m barrier feels trivial.
    expect(apex).toBeLessThan(4);
  });

  it('lets a slide fit under every scanner beam', () => {
    const lowestBeamGap = 0.92;
    expect(PLAYER.slideHeight).toBeLessThan(lowestBeamGap);
    expect(PLAYER.diveHeight).toBeLessThan(lowestBeamGap);
    // A standing runner must NOT fit, or the beam would be free.
    expect(PLAYER.height).toBeGreaterThan(lowestBeamGap);
  });

  it('keeps the player on the floor with no input', () => {
    const world = new World();
    world.start(baseConfig(11));
    for (let i = 0; i < 240; i++) world.step(FIXED_DT, false, false, false, false);
    expect(world.player.onGround).toBe(true);
    expect(world.player.y).toBeCloseTo(0, 5);
    expect(Number.isFinite(world.player.x)).toBe(true);
  });

  it('accelerates toward the speed ceiling but never past it', () => {
    const world = new World();
    world.start(baseConfig(3));
    for (let i = 0; i < 120 * 60; i++) world.step(FIXED_DT, false, false, false, false);
    expect(world.speed).toBeGreaterThan(RUN.startSpeed);
    expect(world.speed).toBeLessThanOrEqual(RUN.maxSpeed + RUN.flowSpeedBonus + RUN.overdriveSpeedBonus + 0.5);
  });
});

describe('generator', () => {
  it('offers legal patterns at every difficulty', () => {
    for (let d = 0; d <= 1.0001; d += 0.05) {
      expect(patternsFor(d).length).toBeGreaterThan(0);
    }
  });

  it('never authors two solid obstacles inside one another', () => {
    const spawner = new Spawner();
    spawner.reset(4242);
    for (let d = 0; d <= 1; d += 0.1) {
      spawner.ensure(spawner.cursor + 400, d, 10 + d * 15);
    }
    const solid = spawner.obstacles.filter((o) => !o.standable);
    for (let i = 0; i < solid.length; i++) {
      for (let j = i + 1; j < solid.length; j++) {
        const a = solid[i];
        const b = solid[j];
        if (a.x + a.w <= b.x || b.x + b.w <= a.x) continue;
        // Overlapping x is allowed only when they occupy different heights.
        const vertical = overlaps(
          { x: a.x, y: a.y, w: a.w, h: a.h },
          { x: b.x, y: b.y, w: b.w, h: b.h },
        );
        expect(vertical).toBe(false);
      }
    }
  });

  it('always leaves a route through every pit', () => {
    const spawner = new Spawner();
    spawner.reset(99);
    const speed = 14;
    for (let d = 0; d <= 1; d += 0.1) spawner.ensure(spawner.cursor + 500, d, speed);
    // Max horizontal distance covered by one full jump.
    const airtime = (2 * PLAYER.jumpVelocity) / (PLAYER.gravity * PLAYER.riseGravityMul);
    const reach = airtime * (speed + PLAYER.diveForwardBoost);
    for (const g of spawner.gaps) {
      expect(g.x1 - g.x0).toBeLessThan(reach * 0.85);
    }
  });

  it('keeps memory flat — pruning bounds the entity lists', () => {
    const spawner = new Spawner();
    spawner.reset(7);
    let x = 0;
    for (let i = 0; i < 400; i++) {
      x += 20;
      spawner.ensure(x, clamp(x / 2400, 0, 1), 18);
      spawner.prune(x);
    }
    expect(spawner.obstacles.length).toBeLessThan(120);
    expect(spawner.pickups.length).toBeLessThan(500);
    expect(spawner.gaps.length).toBeLessThan(40);
  });

  it('is deterministic for a given seed', () => {
    const a = new Spawner();
    const b = new Spawner();
    a.reset(123456);
    b.reset(123456);
    a.ensure(600, 0.5, 16);
    b.ensure(600, 0.5, 16);
    expect(a.obstacles.map((o) => `${o.kind}@${o.x.toFixed(3)}`)).toEqual(
      b.obstacles.map((o) => `${o.kind}@${o.x.toFixed(3)}`),
    );
  });

  it('every pattern builds without throwing at any difficulty', () => {
    for (const p of PATTERNS) {
      for (let d = p.minD; d <= 1; d += 0.25) {
        const chunk = p.build({ rng: new Rng(d * 1000 + 1), x: 100, d, speed: 12 + d * 12 });
        expect(chunk.length).toBeGreaterThan(0);
        for (const o of chunk.obstacles) {
          expect(Number.isFinite(o.x)).toBe(true);
          expect(o.w).toBeGreaterThan(0);
          expect(o.h).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('playability', () => {
  it('the course is survivable — the bot runs a long way before dying', () => {
    // 5 seeds × 90 simulated seconds each.
    let best = 0;
    let totalDeaths = 0;
    let cleanWindows = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      const res = simulate(seed * 1013, 90);
      best = Math.max(best, res.distance);
      totalDeaths += res.deaths;
      if (res.deaths === 0) cleanWindows++;
      expect(res.peakObstacles).toBeLessThan(160);
    }
    // A competent run should reach well past the first zone change.
    expect(best).toBeGreaterThan(1250);
    // A clean reader of the course should almost never be killed by it.
    expect(totalDeaths).toBeLessThan(8);
    // And at least some seeds must be survivable end to end: if no window is
    // ever clean, the generator is producing courses nobody can read.
    expect(cleanWindows).toBeGreaterThanOrEqual(3);
  });

  it('never produces NaN in the simulation state', () => {
    const { world } = simulate(777, 45);
    const p = world.player;
    for (const v of [p.x, p.y, p.vx, p.vy, world.speed, world.stats.score, world.stats.distance]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('awards score and shards during a run', () => {
    const { world } = simulate(31337, 40);
    expect(world.stats.score).toBeGreaterThan(0);
    expect(world.stats.distance).toBeGreaterThan(100);
  });
});

describe('rules', () => {
  it('a shield absorbs a hit instead of ending the run', () => {
    const world = new World();
    world.start({ ...baseConfig(5), startShields: 1 });
    // Park a wall directly in front of the player.
    world.spawner.obstacles.length = 0;
    world.spawner.obstacles.push(
      makeObstacle('stack', world.player.x + 1.2, 0, 1.5, 2.2, { vaultable: false }) as Obstacle,
    );
    for (let i = 0; i < 60; i++) world.step(FIXED_DT, false, false, false, false);
    expect(world.shields).toBe(0);
    expect(world.phase).toBe('running');
  });

  it('ends the run when an unshielded runner hits a wall', () => {
    const world = new World();
    world.start(baseConfig(6));
    world.spawner.obstacles.length = 0;
    world.spawner.obstacles.push(
      makeObstacle('stack', world.player.x + 1.2, 0, 1.5, 2.2, { vaultable: false }) as Obstacle,
    );
    for (let i = 0; i < 240; i++) world.step(FIXED_DT, false, false, false, false);
    expect(['dying', 'revive', 'over']).toContain(world.phase);
  });

  it('vaults a barrier when the player jumps into it', () => {
    const world = new World();
    world.start(baseConfig(8));
    world.spawner.obstacles.length = 0;
    world.spawner.obstacles.push(
      makeObstacle('barrier', world.player.x + 6, 0, 1, 1.15, { vaultable: true }) as Obstacle,
    );
    const bot = new Autopilot();
    for (let i = 0; i < 180; i++) {
      const intent = bot.update(world, FIXED_DT);
      world.step(FIXED_DT, intent.wantJump, intent.wantDive, intent.holdJump, intent.holdDive);
    }
    expect(world.stats.vaults + world.stats.clears).toBeGreaterThan(0);
    expect(world.phase).toBe('running');
  });
});
