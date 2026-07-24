import { clamp, damp, overlaps, type Rect } from '../engine/math';
import { Rng } from '../engine/rng';
import { gateIsHigh, resetIds, updateObstacle, type Obstacle, type Pickup } from './entities';
import { Player } from './player';
import { Spawner } from './spawner';
import { LANES, PLAYER, RUN, SCORE, WALL, WORLD } from './tuning';

export type RunPhase = 'running' | 'dying' | 'revive' | 'over';

export interface RunConfig {
  seed: number;
  headstart: number;
  startShields: number;
  magnetLevel: number;
  flowLevel: number;
  glovesLevel: number;
  payoutLevel: number;
}

export interface RunStats {
  distance: number;
  score: number;
  shards: number;
  combo: number;
  maxCombo: number;
  clears: number;
  vaults: number;
  perfects: number;
  dives: number;
  shatters: number;
  closeCalls: number;
  cores: number;
  powerups: number;
  time: number;
  flowsEntered: number;
}

export type FxEvent =
  | { type: 'jump'; x: number; y: number }
  | { type: 'land'; x: number; y: number; hard: boolean }
  | { type: 'slide'; x: number; y: number }
  | { type: 'lane'; x: number; y: number }
  | { type: 'wallMount'; x: number; y: number; side: number }
  | { type: 'wallEnd'; x: number; y: number }
  | { type: 'dive'; x: number; y: number }
  | { type: 'vault'; x: number; y: number; perfect: boolean }
  | { type: 'shatter'; x: number; y: number }
  | { type: 'smash'; x: number; y: number }
  | { type: 'shard'; x: number; y: number; chain: number }
  | { type: 'core'; x: number; y: number }
  | { type: 'power'; x: number; y: number; kind: string }
  | { type: 'hit'; x: number; y: number }
  | { type: 'shield'; x: number; y: number }
  | { type: 'flowStart' }
  | { type: 'flowEnd' }
  | { type: 'zone'; index: number }
  | { type: 'toast'; text: string; color: string }
  | { type: 'popup'; x: number; y: number; text: string; color: string };

const emptyStats = (): RunStats => ({
  distance: 0,
  score: 0,
  shards: 0,
  combo: 1,
  maxCombo: 1,
  clears: 0,
  vaults: 0,
  perfects: 0,
  dives: 0,
  shatters: 0,
  closeCalls: 0,
  cores: 0,
  powerups: 0,
  time: 0,
  flowsEntered: 0,
});

/**
 * The run. Owns the player, the track, and every rule that turns motion into
 * score. Rendering reads this; it never writes back.
 */
export class World {
  readonly player = new Player();
  readonly spawner = new Spawner();
  readonly stats: RunStats = emptyStats();
  readonly events: FxEvent[] = [];

  phase: RunPhase = 'over';
  config: RunConfig = {
    seed: 1,
    headstart: 0,
    startShields: 0,
    magnetLevel: 0,
    flowLevel: 0,
    glovesLevel: 0,
    payoutLevel: 0,
  };

  speed: number = RUN.startSpeed;
  startX = 0;
  flow = 0;
  flowActive = false;
  flowTimer = 0;
  shields = 0;
  magnetTimer = 0;
  overdriveTimer = 0;
  shardChain = 0;
  shardChainTimer = 0;
  invulnAfterRevive = 0;
  deathTimer = 0;
  revivesUsed = 0;
  zone = 0;
  /** What ended the last run — surfaced on the results screen and in tests. */
  lastDeathCause = '';

  /** Camera in world metres. */
  camX = 0;
  camY = 0;
  zoom = 1;
  shake = 0;
  /** Frames of freeze applied on impacts and perfect vaults. */
  hitStop = 0;
  timeScale = 1;

  private rng = new Rng();
  private clearsSinceCombo = 0;
  private airPeak = 0;
  private wallStartX = 0;
  private wallScored = 0;

  get difficulty(): number {
    return clamp(this.stats.distance / 2400, 0, 1);
  }

  get scoreMultiplier(): number {
    return this.stats.combo * (this.flowActive ? RUN.flowScoreMul : 1);
  }

  get canRevive(): boolean {
    return this.revivesUsed < 1;
  }

  start(config: RunConfig): void {
    this.config = config;
    resetIds();
    this.rng = new Rng(config.seed);
    Object.assign(this.stats, emptyStats());
    this.events.length = 0;
    this.spawner.reset(config.seed);
    this.player.reset(0);
    this.phase = 'running';

    this.startX = 0;
    this.speed = RUN.startSpeed;
    this.flow = 0;
    this.flowActive = false;
    this.flowTimer = 0;
    this.shields = config.startShields;
    this.magnetTimer = 0;
    this.overdriveTimer = 0;
    this.shardChain = 0;
    this.shardChainTimer = 0;
    this.deathTimer = 0;
    this.revivesUsed = 0;
    this.zone = 0;
    this.clearsSinceCombo = 0;
    this.hitStop = 0;
    this.timeScale = 1;
    this.shake = 0;
    this.camY = 0;

    if (config.headstart > 0) {
      // A head start skips distance *and* the speed ramp that goes with it.
      this.player.x = config.headstart;
      this.stats.distance = config.headstart;
      this.speed = this.speedForDistance(config.headstart);
      this.spawner.cursor = config.headstart + WORLD.introRunway;
      this.invulnAfterRevive = 0.6;
      this.player.invuln = 0.6;
    }

    this.camX = this.player.x;
    this.spawner.ensure(this.player.x, this.difficulty, this.speed);
  }

  /**
   * Does the runner's lateral extent overlap this obstacle's?
   *
   * This is the whole of the third axis. Anything authored with
   * `LANES.fullHalfWidth` still spans the deck and behaves exactly as it did
   * before lanes existed, which is why the entire pattern library kept working.
   */
  private laterallyOverlaps(lane: number, halfW: number): boolean {
    return Math.abs(this.player.lateral - lane) < halfW + LANES.halfWidth;
  }

  private speedForDistance(dist: number): number {
    return RUN.startSpeed + (RUN.maxSpeed - RUN.startSpeed) * (1 - Math.exp(-dist / RUN.speedRamp));
  }

  // ==========================================================================
  // Simulation
  // ==========================================================================

  step(
    dt: number,
    wantJump: boolean,
    wantDive: boolean,
    holdJump: boolean,
    holdDive: boolean,
    wantLeft = false,
    wantRight = false,
  ): void {
    if (this.phase === 'over' || this.phase === 'revive') return;

    // Hit-stop: a few frames of frozen time sell every impact.
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      this.shake = Math.max(0, this.shake - dt * 2.2);
      return;
    }

    const scaled = dt * this.timeScale;

    if (this.phase === 'dying') {
      this.deathTimer += dt;
      this.player.step(scaled, {
        wantJump: false,
        wantDive: false,
        wantLeft: false,
        wantRight: false,
        holdJump: false,
        holdDive: false,
        targetSpeed: 0,
        ceilingBlocked: false,
      });
      this.updateCamera(dt, true);
      this.shake = Math.max(0, this.shake - dt * 1.6);
      if (this.deathTimer > 0.85) {
        this.phase = this.canRevive ? 'revive' : 'over';
      }
      return;
    }

    this.stats.time += scaled;

    // ---------------------------------------------------------------- speed
    const base = this.speedForDistance(this.stats.distance);
    let target = base;
    if (this.flowActive) target += RUN.flowSpeedBonus;
    if (this.overdriveTimer > 0) target += RUN.overdriveSpeedBonus;
    this.speed = damp(this.speed, target, 2.4, scaled);

    // ---------------------------------------------------------------- player
    const ceilingBlocked = this.isCeilingBlocked();
    const before = this.player.x;
    this.player.step(scaled, {
      wantJump,
      wantDive,
      wantLeft,
      wantRight,
      holdJump,
      holdDive,
      targetSpeed: this.speed,
      ceilingBlocked,
    });
    const moved = this.player.x - before;
    this.stats.distance += moved;
    this.stats.score += moved * RUN.scorePerMetre * this.scoreMultiplier;

    this.drainPlayerEvents();

    // ---------------------------------------------------------------- track
    // Size the course on the *baseline* speed, never the boosted one. Flow and
    // Overdrive must make the Conduit easier; if the generator measured the
    // boosted speed, a power-up that expired early would leave behind a gap
    // the player can no longer clear.
    this.spawner.ensure(this.player.x, this.difficulty, base);
    for (const o of this.spawner.obstacles) {
      // Lock a gate's phase once it is inside the commitment window.
      const lead = (o.x - this.player.x) / Math.max(1, this.speed);
      updateObstacle(o, scaled, o.kind === 'gate' && lead < 0.95 && lead > -1.5);
    }

    this.resolveWall(scaled);
    this.resolveSupport();
    this.resolveObstacles();
    this.resolvePickups(scaled);
    this.creditClears();

    if (this.player.y < -4) this.fallOut();

    // ---------------------------------------------------------------- meters
    this.updateFlow(scaled);
    this.updateTimers(scaled);
    this.updateZone();

    this.spawner.prune(this.camX);
    this.updateCamera(dt, false);
  }

  /**
   * Wall running.
   *
   * Mounting is automatic: be in the lane beside the wall as it starts and he
   * takes it. The skill is the lane read, made under pressure by the fact that
   * what is on the deck alongside cannot be jumped or slid — so this is the one
   * hazard where choosing the right lane is the whole answer, and the reward is
   * the most expressive thing in the game.
   */
  private resolveWall(dt: number): void {
    const p = this.player;

    if (p.state === 'wallrun') {
      // Score by the metre so a longer ride is worth more, and end it at the lip.
      const covered = p.x - this.wallStartX;
      const due = Math.floor(covered) - this.wallScored;
      if (due > 0) {
        this.wallScored += due;
        this.stats.score += Math.round(WALL.scorePerMetre * due * this.scoreMultiplier);
        this.addFlow(RUN.flowGainPerClear * 0.35 * due);
      }
      if (p.x >= p.wallEndX) {
        p.releaseWall();
        this.award(SCORE.vault, p.x, WALL.height + 0.6, 'WALL RUN', '#45f5ff');
        this.stats.vaults++;
        this.stats.clears++;
        this.bumpCombo();
        this.addFlow(RUN.flowGainPerPerfect);
      }
      return;
    }

    if (p.state === 'dead' || p.state === 'hurt' || p.invuln > 0.9) return;

    for (const o of this.spawner.obstacles) {
      if (o.kind !== 'wallrun' || o.broken) continue;
      if (p.x < o.x || p.x > o.x + o.w - 0.5) continue;
      if (!this.laterallyOverlaps(o.lane, o.halfW)) continue;
      const side = Math.sign(o.lane) || 1;
      p.mountWall(side, o.x + o.w);
      this.wallStartX = p.x;
      this.wallScored = 0;
      o.cleared = true;
      this.events.push({ type: 'wallMount', x: p.x, y: WALL.height, side });
      this.shake = Math.max(this.shake, 0.25);
      return;
    }
    void dt;
  }

  // -------------------------------------------------------------- support
  private resolveSupport(): void {
    const p = this.player;
    if (p.state === 'vault' || p.state === 'wallrun' || p.state === 'dead') return;
    const hw = PLAYER.width * 0.5;

    if (!p.onGround && p.vy <= 0) {
      let best: number | null = null;
      // Floor
      if (this.spawner.isSolidAt(p.x, p.lateral) && p.py >= -0.001 && p.y <= 0) best = 0;
      // Standable props
      for (const o of this.spawner.obstacles) {
        if (!o.standable || o.broken) continue;
        if (p.x + hw < o.x || p.x - hw > o.x + o.w) continue;
        if (!this.laterallyOverlaps(o.lane, o.halfW)) continue;
        const top = o.y + o.h;
        if (p.py >= top - 0.02 && p.y <= top) best = best === null ? top : Math.max(best, top);
      }
      if (best !== null) {
        const landedOn = this.standableAt(p.x, best);
        p.land(best);
        if (landedOn?.kind === 'pad') this.launchFromPad(landedOn);
      }
    } else if (p.onGround) {
      // Walked off the end of a rail, or over a pit.
      if (p.supportY === 0) {
        if (!this.spawner.isSolidAt(p.x, p.lateral)) p.leaveGround();
      } else {
        const support = this.standableAt(p.x, p.supportY);
        if (!support) p.leaveGround();
        else p.y = p.supportY;
      }
    }
  }

  private standableAt(x: number, top: number): Obstacle | null {
    const hw = PLAYER.width * 0.5;
    for (const o of this.spawner.obstacles) {
      if (!o.standable || o.broken) continue;
      if (Math.abs(o.y + o.h - top) > 0.05) continue;
      if (x + hw < o.x || x - hw > o.x + o.w) continue;
      if (!this.laterallyOverlaps(o.lane, o.halfW)) continue;
      return o;
    }
    return null;
  }

  private launchFromPad(o: Obstacle): void {
    const p = this.player;
    p.onGround = false;
    p.state = 'air';
    p.stateT = 0;
    p.vy = PLAYER.padLaunchVelocity;
    p.jumpCut = true; // the pad decides the height, not the button
    p.boost = Math.max(p.boost, 1.2);
    this.shake = Math.max(this.shake, 0.35);
    this.events.push({ type: 'jump', x: p.x, y: o.y + o.h });
    this.events.push({ type: 'popup', x: p.x, y: o.y + o.h + 1.6, text: 'LAUNCH', color: '#9dff4d' });
  }

  private isCeilingBlocked(): boolean {
    const p = this.player;
    if (p.state !== 'slide') return false;
    const standing: Rect = { x: p.x - PLAYER.width * 0.5, y: p.y, w: PLAYER.width, h: PLAYER.height };
    for (const o of this.spawner.obstacles) {
      if (o.broken || o.standable) continue;
      if (!this.laterallyOverlaps(o.lane, o.halfW)) continue;
      if (overlaps(standing, { x: o.x, y: o.y, w: o.w, h: o.h })) return true;
    }
    return false;
  }

  // -------------------------------------------------------------- obstacles
  private resolveObstacles(): void {
    const p = this.player;
    if (p.state === 'dead' || p.state === 'wallrun') return;
    const box = p.hitbox();
    const grab = PLAYER.vaultGrab + this.config.glovesLevel * 0.18;

    for (const o of this.spawner.obstacles) {
      if (o.broken || o.kind === 'wallrun') continue;
      if (o.x > p.x + 8) break; // list is generated in x order
      if (o.x + o.w < p.x - 4) continue;

      const sameLane = this.laterallyOverlaps(o.lane, o.halfW);

      // Track how close the miss was, for CLOSE CALL credit.
      if (sameLane && box.x < o.x + o.w && box.x + box.w > o.x) {
        const gap = Math.max(o.y - (box.y + box.h), box.y - (o.y + o.h));
        if (gap >= 0) o.minClear = Math.min(o.minClear, gap);
      }

      if (!sameLane) continue;
      if (!overlaps(box, { x: o.x, y: o.y, w: o.w, h: o.h })) continue;

      // Standables are one-way platforms: you may pass up through them and land
      // on top, but you can never be killed by running into their side. A pad
      // met at ground level simply picks you up and throws you.
      if (o.standable) {
        const surface = o.y + o.h;
        if (o.kind === 'pad' && p.vy <= 0.01 && p.y < surface) {
          p.land(surface);
          this.launchFromPad(o);
        }
        continue;
      }

      // ---- overdrive ploughs through anything solid
      if (this.overdriveTimer > 0) {
        o.broken = true;
        this.award(SCORE.vault, o.x, o.y + o.h, 'SMASH', '#ff3fa4');
        this.events.push({ type: 'smash', x: o.x + o.w * 0.5, y: o.y + o.h * 0.5 });
        this.shake = Math.max(this.shake, 0.4);
        continue;
      }

      // ---- vault
      const top = o.y + o.h;
      if (o.vaultable && p.state !== 'vault' && !p.onGround && p.y >= top - grab) {
        const perfect = p.sinceJump <= 0.34 || p.y < top - grab * 0.45;
        p.beginVault(o.id, top);
        o.cleared = true;
        this.stats.vaults++;
        this.stats.clears++;
        this.bumpCombo();
        if (perfect) {
          this.stats.perfects++;
          this.addFlow(RUN.flowGainPerPerfect);
          this.award(SCORE.perfectVault, o.x, top + 0.6, 'PERFECT VAULT', '#ffc857');
          this.hitStop = 0.055;
        } else {
          this.addFlow(RUN.flowGainPerClear);
          this.award(SCORE.vault, o.x, top + 0.6, 'VAULT', '#45f5ff');
        }
        this.events.push({ type: 'vault', x: o.x + o.w * 0.5, y: top, perfect });
        continue;
      }

      // ---- dive through glass
      if (o.breakable && p.isLow()) {
        o.broken = true;
        o.cleared = true;
        this.stats.shatters++;
        this.stats.clears++;
        this.bumpCombo();
        const diving = p.isDiving();
        if (diving) this.stats.dives++;
        this.addFlow(diving ? RUN.flowGainPerPerfect : RUN.flowGainPerClear);
        this.award(
          diving ? SCORE.shatter : SCORE.diveThrough,
          o.x,
          o.y + 1.4,
          diving ? 'DIVE THROUGH' : 'SMASH',
          '#9dff4d',
        );
        this.events.push({ type: 'shatter', x: o.x + o.w * 0.5, y: p.y + 0.6 });
        this.shake = Math.max(this.shake, 0.32);
        this.hitStop = 0.03;
        continue;
      }

      this.takeHit(o);
      return;
    }
  }

  private creditClears(): void {
    const p = this.player;
    for (const o of this.spawner.obstacles) {
      if (o.cleared || o.broken) continue;
      if (o.x + o.w >= p.x - PLAYER.width * 0.5) continue;
      o.cleared = true;
      if (o.kind === 'pad' || o.kind === 'rail' || o.kind === 'wallrun') continue;
      // Dodging into a clear lane counts; a hazard three lanes over does not.
      if (o.minClear > 90) continue;
      this.stats.clears++;
      this.bumpCombo();
      this.addFlow(RUN.flowGainPerClear);
      if (o.minClear < 0.3) {
        this.stats.closeCalls++;
        this.award(SCORE.closeCall, o.x, o.y + o.h + 0.4, 'CLOSE CALL', '#ff3fa4');
        this.addFlow(RUN.flowGainPerClear * 0.6);
      }
    }
    // Air-time bonus: reward big hangs off pads and rails.
    if (!p.onGround) {
      this.airPeak = Math.max(this.airPeak, p.y);
    } else if (this.airPeak > 0) {
      if (this.airPeak > 4.2) this.award(SCORE.airTimeBonus, p.x, p.y + 2, 'BIG AIR', '#45f5ff');
      this.airPeak = 0;
    }
  }

  private bumpCombo(): void {
    this.clearsSinceCombo++;
    if (this.clearsSinceCombo >= RUN.clearsPerCombo) {
      this.clearsSinceCombo = 0;
      this.stats.combo = Math.min(RUN.comboMax, this.stats.combo + RUN.comboStep);
      this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);
      if (this.stats.combo > 1) {
        this.events.push({ type: 'toast', text: `x${this.stats.combo}`, color: '#ffc857' });
      }
    }
  }

  private award(points: number, x: number, y: number, label: string, color: string): void {
    const total = Math.round(points * this.scoreMultiplier);
    this.stats.score += total;
    this.events.push({ type: 'popup', x, y, text: `${label} +${total}`, color });
  }

  // -------------------------------------------------------------- pickups
  private resolvePickups(dt: number): void {
    const p = this.player;
    const box = p.hitbox();
    const magnetOn = this.magnetTimer > 0;
    const radius = RUN.magnetRadius + this.config.magnetLevel * 1.4;
    const px = p.x;
    const py = p.y + p.height * 0.5;

    this.shardChainTimer = Math.max(0, this.shardChainTimer - dt);
    if (this.shardChainTimer <= 0) this.shardChain = 0;

    for (const pk of this.spawner.pickups) {
      if (pk.taken) continue;
      if (pk.x > px + 40) break;
      pk.t += dt;

      if (magnetOn && pk.kind === 'shard') {
        const dx = px - pk.x;
        const dy = py - pk.y;
        const dl = p.lateral - pk.lane;
        const dist = Math.hypot(dx, dy, dl);
        if (dist < radius) {
          const pull = (1 - dist / radius) * 46;
          pk.vx = damp(pk.vx, (dx / (dist || 1)) * pull, 8, dt);
          pk.vy = damp(pk.vy, (dy / (dist || 1)) * pull, 8, dt);
          pk.lane += (dl / (dist || 1)) * pull * dt;
          pk.x += pk.vx * dt;
          pk.y += pk.vy * dt;
        }
      }

      // Circle vs AABB
      const cx = clamp(pk.x, box.x, box.x + box.w);
      const cy = clamp(pk.y, box.y, box.y + box.h);
      const grabR = pk.r + (pk.kind === 'shard' ? 0.35 : 0.55);
      if (Math.abs(pk.lane - p.lateral) > grabR + LANES.halfWidth) continue;
      if ((pk.x - cx) ** 2 + (pk.y - cy) ** 2 > grabR * grabR) continue;

      pk.taken = true;
      this.collect(pk);
    }
  }

  private collect(pk: Pickup): void {
    switch (pk.kind) {
      case 'shard': {
        this.shardChain++;
        this.shardChainTimer = 1.1;
        const mult = 1 + this.config.payoutLevel * 0.1;
        const gained = Math.max(1, Math.round(1 * mult));
        this.stats.shards += gained;
        this.stats.score += Math.round(SCORE.shard * this.scoreMultiplier);
        this.addFlow(RUN.flowGainPerShard);
        this.events.push({ type: 'shard', x: pk.x, y: pk.y, chain: this.shardChain });
        break;
      }
      case 'core': {
        const mult = 1 + this.config.payoutLevel * 0.1;
        this.stats.cores++;
        this.stats.shards += Math.round(15 * mult);
        this.award(SCORE.core, pk.x, pk.y + 0.8, 'DATA CORE', '#ffc857');
        this.addFlow(0.12);
        this.events.push({ type: 'core', x: pk.x, y: pk.y });
        break;
      }
      case 'magnet':
        this.magnetTimer = RUN.magnetDuration + this.config.magnetLevel * 3;
        this.stats.powerups++;
        this.events.push({ type: 'power', x: pk.x, y: pk.y, kind: 'magnet' });
        this.events.push({ type: 'toast', text: 'SHARD MAGNET', color: '#45f5ff' });
        break;
      case 'shield':
        this.shields = Math.min(3, this.shields + 1);
        this.stats.powerups++;
        this.events.push({ type: 'power', x: pk.x, y: pk.y, kind: 'shield' });
        this.events.push({ type: 'toast', text: 'BARRIER UP', color: '#9dff4d' });
        break;
      case 'overdrive':
        this.overdriveTimer = RUN.overdriveDuration;
        this.stats.powerups++;
        this.player.invuln = Math.max(this.player.invuln, RUN.overdriveDuration);
        this.events.push({ type: 'power', x: pk.x, y: pk.y, kind: 'overdrive' });
        this.events.push({ type: 'toast', text: 'OVERDRIVE', color: '#ff3fa4' });
        break;
    }
  }

  // -------------------------------------------------------------- meters
  private addFlow(amount: number): void {
    if (this.flowActive) return;
    const boost = 1 + this.config.flowLevel * 0.15;
    this.flow = clamp(this.flow + amount * boost, 0, 1);
    if (this.flow >= 1) this.enterFlow();
  }

  private enterFlow(): void {
    this.flowActive = true;
    this.flowTimer = RUN.flowDuration + this.config.flowLevel * 1.5;
    this.stats.flowsEntered++;
    this.events.push({ type: 'flowStart' });
    this.events.push({ type: 'toast', text: 'FLOW STATE', color: '#ff3fa4' });
  }

  private updateFlow(dt: number): void {
    if (this.flowActive) {
      this.flowTimer -= dt;
      this.flow = clamp(this.flowTimer / (RUN.flowDuration + this.config.flowLevel * 1.5), 0, 1);
      if (this.flowTimer <= 0) {
        this.flowActive = false;
        this.flow = 0;
        this.events.push({ type: 'flowEnd' });
      }
    } else {
      this.flow = clamp(this.flow - RUN.flowDecay * dt, 0, 1);
    }
  }

  private updateTimers(dt: number): void {
    this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    const hadOverdrive = this.overdriveTimer > 0;
    this.overdriveTimer = Math.max(0, this.overdriveTimer - dt);
    if (hadOverdrive && this.overdriveTimer === 0) {
      this.events.push({ type: 'toast', text: 'OVERDRIVE OFFLINE', color: '#7f8ea8' });
    }
    if (this.overdriveTimer > 0) this.player.invuln = Math.max(this.player.invuln, 0.1);
    this.shake = Math.max(0, this.shake - dt * 2.4);
  }

  private updateZone(): void {
    const z = Math.floor(this.stats.distance / WORLD.zoneLength);
    if (z !== this.zone) {
      this.zone = z;
      this.events.push({ type: 'zone', index: z });
    }
  }

  private updateCamera(dt: number, dying: boolean): void {
    const p = this.player;
    this.camX = p.x;
    const targetY = clamp(p.y - 0.4, 0, 6) * (dying ? 0.4 : 1);
    this.camY = damp(this.camY, targetY, 4.5, dt);
    const speedT = clamp((this.speed - RUN.startSpeed) / (RUN.maxSpeed - RUN.startSpeed), 0, 1);
    const targetZoom = 1.06 - speedT * 0.2 - (this.overdriveTimer > 0 ? 0.04 : 0);
    this.zoom = damp(this.zoom, targetZoom, 2.5, dt);
  }

  // -------------------------------------------------------------- damage
  private drainPlayerEvents(): void {
    const p = this.player;
    for (const e of p.events) {
      switch (e) {
        case 'jump':
          this.events.push({ type: 'jump', x: p.x, y: p.y });
          break;
        case 'land':
          this.events.push({ type: 'land', x: p.x, y: p.y, hard: false });
          break;
        case 'hardLand':
          this.events.push({ type: 'land', x: p.x, y: p.y, hard: true });
          this.shake = Math.max(this.shake, 0.22);
          break;
        case 'slideStart':
          this.events.push({ type: 'slide', x: p.x, y: p.y });
          break;
        case 'wallEnd':
          this.events.push({ type: 'wallEnd', x: p.x, y: p.y });
          break;
        case 'lane':
          this.events.push({ type: 'lane', x: p.x, y: p.y });
          break;
        case 'diveStart':
          this.events.push({ type: 'dive', x: p.x, y: p.y });
          break;
        default:
          break;
      }
    }
    p.events.length = 0;
  }

  private takeHit(o: Obstacle): void {
    const p = this.player;
    if (p.invuln > 0) return;

    if (this.shields > 0) {
      this.shields--;
      p.invuln = 1.15;
      p.hurt();
      this.speed = Math.max(RUN.startSpeed, this.speed - 2.5);
      this.events.push({ type: 'shield', x: p.x, y: p.y + 1 });
      this.events.push({ type: 'toast', text: 'BARRIER ABSORBED', color: '#9dff4d' });
      this.shake = Math.max(this.shake, 0.5);
      this.hitStop = 0.07;
      o.broken = true;
      return;
    }

    if (this.flowActive) {
      // Flow burns itself to save you — once.
      this.flowActive = false;
      this.flow = 0;
      this.flowTimer = 0;
      p.invuln = 1.0;
      p.hurt();
      o.broken = true;
      this.events.push({ type: 'flowEnd' });
      this.events.push({ type: 'toast', text: 'FLOW BROKEN', color: '#ff3fa4' });
      this.shake = Math.max(this.shake, 0.6);
      this.hitStop = 0.09;
      return;
    }

    this.die(o.x + o.w * 0.5, o.y + o.h * 0.5, o.kind);
  }

  private fallOut(): void {
    if (this.phase !== 'running') return;
    if (this.overdriveTimer > 0) {
      // Overdrive refuses to lose the run to a hole in the floor.
      this.player.y = 0.2;
      this.player.vy = 12;
      return;
    }
    if (this.shields > 0) {
      this.shields--;
      this.player.y = 0.4;
      this.player.vy = 13;
      this.player.invuln = 1.2;
      this.events.push({ type: 'shield', x: this.player.x, y: 0.6 });
      this.events.push({ type: 'toast', text: 'BARRIER ABSORBED', color: '#9dff4d' });
      return;
    }
    this.die(this.player.x, 0, 'pit');
  }

  private die(x: number, y: number, cause: string): void {
    if (this.phase !== 'running') return;
    this.lastDeathCause = cause;
    this.phase = 'dying';
    this.deathTimer = 0;
    this.stats.combo = 1;
    this.player.kill();
    this.events.push({ type: 'hit', x, y });
    this.shake = 1;
    this.hitStop = 0.14;
  }

  // -------------------------------------------------------------- revive
  revive(): void {
    if (this.phase !== 'revive') return;
    this.revivesUsed++;
    const p = this.player;
    // Clear the immediate area so the player never wakes into a wall.
    for (const o of this.spawner.obstacles) {
      if (o.x + o.w > p.x - 6 && o.x < p.x + 22) o.broken = true;
    }
    for (const g of this.spawner.gaps) {
      if (g.x1 > p.x - 6 && g.x0 < p.x + 22) {
        g.x0 = p.x + 1e6;
        g.x1 = p.x + 1e6;
      }
    }
    p.reset(p.x);
    p.invuln = RUN.reviveGraceTime;
    this.speed = Math.max(RUN.startSpeed, this.speed * 0.72);
    this.flow = 0;
    this.flowActive = false;
    this.shields = Math.max(this.shields, 1);
    this.phase = 'running';
    this.deathTimer = 0;
    this.hitStop = 0;
    this.shake = 0.4;
    this.events.push({ type: 'toast', text: 'SECOND WIND', color: '#45f5ff' });
  }

  end(): void {
    this.phase = 'over';
  }

  /** Public read for the HUD / renderer. */
  get zonePalette(): number {
    return this.zone;
  }

  /** Used by the renderer for parallax; kept here so pause freezes it too. */
  get scrollX(): number {
    return this.camX;
  }

  get gatesHigh(): boolean {
    const o = this.spawner.obstacles.find((g) => g.kind === 'gate');
    return o ? gateIsHigh(o) : false;
  }

  /** Deterministic per-run jitter for the renderer (never affects gameplay). */
  noise(): number {
    return this.rng.next();
  }
}
