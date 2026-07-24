import { Rng } from '../engine/rng';
import { LANES } from './tuning';
import type { Gap, Obstacle, Pickup } from './entities';
import { PATTERNS, type ChunkCtx } from './patterns';
import { WORLD } from './tuning';

/**
 * Streams the Conduit into existence a chunk at a time.
 *
 * Rules that keep an endless course readable:
 *  - never repeat the previous chunk's primary demand back to back,
 *  - force a breather after a few consecutive hazards,
 *  - always leave a landing runway between chunks (patterns bake in their own
 *    trailing space, and the spawner adds a difficulty-scaled rest gap).
 */
export class Spawner {
  obstacles: Obstacle[] = [];
  pickups: Pickup[] = [];
  gaps: Gap[] = [];

  /** World x where the next chunk will be written. */
  cursor = 0;
  private rng = new Rng();
  private lastTags: string[] = [];
  private hazardStreak = 0;
  private lastId = '';

  reset(seed: number): void {
    this.rng = new Rng(seed);
    this.obstacles.length = 0;
    this.pickups.length = 0;
    this.gaps.length = 0;
    this.cursor = WORLD.introRunway;
    this.lastTags = [];
    this.hazardStreak = 0;
    this.lastId = '';
  }

  /** Generate until the track is populated `spawnAhead` metres past `x`. */
  ensure(x: number, difficulty: number, speed: number): void {
    let guard = 0;
    while (this.cursor < x + WORLD.spawnAhead && guard++ < 24) {
      this.emitChunk(difficulty, speed);
    }
  }

  private emitChunk(d: number, speed: number): void {
    const forceRest = this.hazardStreak >= (d > 0.6 ? 4 : 3);
    const legal = PATTERNS.filter((p) => {
      if (d < p.minD) return false;
      if (forceRest) return p.tags.includes('rest');
      return p.weight(d) > 0;
    });
    const pool = legal.length ? legal : PATTERNS.filter((p) => p.tags.includes('rest'));

    const def = this.rng.weighted(pool, (p) => {
      let w = Math.max(0.001, p.weight(d));
      if (p.id === this.lastId) w *= 0.15;
      else if (p.tags.some((t) => this.lastTags.includes(t))) w *= 0.45;
      return w;
    });

    const ctx: ChunkCtx = { rng: this.rng, x: this.cursor, d, speed };
    const chunk = def.build(ctx);

    for (const o of chunk.obstacles) this.obstacles.push(o);
    for (const p of chunk.pickups) this.pickups.push(p);
    for (const g of chunk.gaps) this.gaps.push(g);

    const restGap = speed * (0.12 + (1 - d) * 0.3);
    this.cursor += Math.max(chunk.length, speed * 0.5) + restGap;

    this.lastTags = def.tags;
    this.lastId = def.id;
    this.hazardStreak = def.tags.includes('rest') || def.tags.includes('reward') ? 0 : this.hazardStreak + 1;
  }

  /** Drop everything well behind the camera so memory stays flat forever. */
  prune(x: number): void {
    const cut = x - WORLD.despawnBehind;
    let w = 0;
    for (let i = 0; i < this.obstacles.length; i++) {
      const o = this.obstacles[i];
      if (o.x + o.w > cut) this.obstacles[w++] = o;
    }
    this.obstacles.length = w;

    w = 0;
    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];
      if (p.x > cut && !p.taken) this.pickups[w++] = p;
    }
    this.pickups.length = w;

    w = 0;
    for (let i = 0; i < this.gaps.length; i++) {
      const g = this.gaps[i];
      if (g.x1 > cut) this.gaps[w++] = g;
    }
    this.gaps.length = w;
  }

  /** Is there floor under this world x, in this lane? */
  isSolidAt(x: number, lateral = 0): boolean {
    for (const g of this.gaps) {
      if (x <= g.x0 || x >= g.x1) continue;
      if (Math.abs(lateral - g.lane) < g.halfW + LANES.halfWidth) return false;
    }
    return true;
  }

  /** Nearest pit ahead of x that threatens this lane, or null. */
  pitAhead(x: number, range: number, lateral = 0): Gap | null {
    let best: Gap | null = null;
    for (const g of this.gaps) {
      if (g.x1 < x) continue;
      if (g.x0 > x + range) continue;
      if (Math.abs(lateral - g.lane) >= g.halfW + LANES.halfWidth) continue;
      if (!best || g.x0 < best.x0) best = g;
    }
    return best;
  }
}
