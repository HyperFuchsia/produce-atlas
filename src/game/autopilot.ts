import type { Obstacle } from './entities';
import { LANES, laneX } from './tuning';
import type { World } from './world';

/**
 * A rule-based courier used for the title-screen attract loop — and, just as
 * usefully, by the automated smoke test, which drives thousands of metres of
 * real gameplay to prove the physics and generator can't produce an
 * impossible course.
 */
export interface BotIntent {
  wantJump: boolean;
  wantDive: boolean;
  wantLeft: boolean;
  wantRight: boolean;
  holdJump: boolean;
  holdDive: boolean;
}

const idle = (): BotIntent => ({
  wantJump: false,
  wantDive: false,
  wantLeft: false,
  wantRight: false,
  holdJump: false,
  holdDive: false,
});

export class Autopilot {
  private holdJumpFor = 0;
  private holdDiveFor = 0;
  private jumpCooldown = 0;
  private laneCooldown = 0;

  reset(): void {
    this.holdJumpFor = 0;
    this.holdDiveFor = 0;
    this.jumpCooldown = 0;
    this.laneCooldown = 0;
  }

  /**
   * Is this lane clear through the given stretch of track? Used both to decide
   * whether a dodge is needed and to make sure the dodge lands somewhere safe —
   * sidestepping out of one wall into another is worse than not moving.
   */
  private laneIsClear(world: World, lane: number, x0: number, x1: number, speed: number): boolean {
    const lateral = laneX(lane);

    /**
     * Is a hazard spanning [a,b] carried over by a mountable wall in this lane?
     * Asking whether the wall covers the whole *scan window* is wrong — the
     * window is far longer than any wall, so that test never fires and the bot
     * runs straight into the field the wall exists to beat.
     */
    const wallCovers = (a: number, b: number): boolean => {
      for (const w of world.spawner.obstacles) {
        if (w.kind !== 'wallrun' || w.broken) continue;
        if (Math.abs(lateral - w.lane) >= w.halfW + LANES.halfWidth) continue;
        if (w.x <= a + 0.5 && w.x + w.w >= b - 0.5) return true;
      }
      return false;
    };

    for (const o of world.spawner.obstacles) {
      if (o.kind === 'wallrun') continue;
      if (o.broken || o.standable) continue;
      if (o.x + o.w < x0 || o.x > x1) continue;
      if (Math.abs(lateral - o.lane) >= o.halfW + LANES.halfWidth) continue;
      // Anything a jump or a slide can beat does not force a dodge — but
      // "jumpable" is about length as well as height. A field is only 1.85 m
      // tall and looks clearable, yet it runs for twenty metres: no jump in the
      // game covers that, and checking height alone walks straight into it.
      const jumpReach = speed * 0.5;
      const clearableByAir = o.y + o.h <= 2.55 && o.w <= jumpReach;
      const clearableBySlide = o.y > 0.55;
      if (clearableByAir || clearableBySlide || o.breakable) continue;
      if (wallCovers(o.x, o.x + o.w)) continue;
      return false;
    }
    for (const g of world.spawner.gaps) {
      if (g.x1 < x0 || g.x0 > x1) continue;
      if (Math.abs(lateral - g.lane) < g.halfW + LANES.halfWidth) return false;
    }
    return true;
  }

  update(world: World, dt: number): BotIntent {
    const p = world.player;
    const out = idle();
    this.holdJumpFor = Math.max(0, this.holdJumpFor - dt);
    this.holdDiveFor = Math.max(0, this.holdDiveFor - dt);
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
    this.laneCooldown = Math.max(0, this.laneCooldown - dt);

    out.holdJump = this.holdJumpFor > 0;
    out.holdDive = this.holdDiveFor > 0;
    if (world.phase !== 'running') return out;
    // On the wall there is nothing to decide: enjoy the ride.
    if (p.state === 'wallrun') return out;

    const speed = Math.max(1, world.speed);
    const front = p.x + 0.33;

    // ---- pits are the least forgiving thing on the track, so they win.
    const pit = world.spawner.pitAhead(front, speed * 0.8);
    let pitTime = Infinity;
    if (pit) pitTime = (pit.x0 - front) / speed;

    // ---- nearest blocking obstacle *in this lane*
    let threat: Obstacle | null = null;
    let threatTime = Infinity;
    for (const o of world.spawner.obstacles) {
      if (o.broken || o.standable || o.kind === 'wallrun') continue;
      if (o.x + o.w < front) continue;
      if (Math.abs(p.lateral - o.lane) >= o.halfW + LANES.halfWidth) continue;
      const t = (o.x - front) / speed;
      if (t > 0.95) break;
      if (t < threatTime) {
        threat = o;
        threatTime = t;
      }
    }

    // ---- a wall too tall to jump and too low to slide leaves only a sidestep.
    // Crossing a lane takes a fixed ~0.15 s, so the decision has to be made
    // early, and it has to check that the destination is actually clear.
    if (!p.changingLane && this.laneCooldown <= 0) {
      const escapeTo = front + speed * 0.75;
      // Look *further* down a destination lane than down the one being escaped:
      // checking only as far as the current threat will happily sidestep into a
      // wall standing just past it.
      const commitTo = front + speed * 1.5;

      if (!this.laneIsClear(world, p.lane, front, escapeTo, speed)) {
        const limit = (LANES.count - 1) / 2;
        const inRange = (l: number) => l >= -limit && l <= limit;

        // Search outward for the nearest safe lane and step toward it. Only
        // considering *adjacent* lanes strands him when two lanes are blocked
        // and the gap is on the far side — he needs to be willing to cross
        // twice, which there is time for.
        let target: number | null = null;
        for (let d = 1; d <= LANES.count && target === null; d++) {
          for (const l of [p.lane - d, p.lane + d]) {
            if (!inRange(l)) continue;
            if (this.laneIsClear(world, l, front, commitTo, speed)) {
              target = l;
              break;
            }
          }
        }
        // Nothing is safe for the long haul; take the best short-term escape.
        if (target === null) {
          for (let d = 1; d <= LANES.count && target === null; d++) {
            for (const l of [p.lane - d, p.lane + d]) {
              if (!inRange(l)) continue;
              if (this.laneIsClear(world, l, front, escapeTo, speed)) {
                target = l;
                break;
              }
            }
          }
        }

        if (target !== null && target !== p.lane) {
          if (target < p.lane) out.wantLeft = true;
          else out.wantRight = true;
          this.laneCooldown = 0.16;
          return out;
        }
      }
    }

    // A pad is worth stepping on, never worth avoiding: if one sits between us
    // and the pit, let it do the launching instead of burning the jump early.
    let padAhead = false;
    for (const o of world.spawner.obstacles) {
      if (o.kind !== 'pad' || o.broken) continue;
      const t = (o.x - front) / speed;
      if (t > 0.4) break;
      if (t > -0.05) padAhead = true;
    }

    if (pit && pitTime < 0.18 && !padAhead && (p.onGround || p.coyote > 0)) {
      this.press(out, 'jump', 0.3);
      return out;
    }

    if (!threat) {
      if (p.state === 'slide' && this.holdDiveFor <= 0) out.holdDive = false;
      return out;
    }

    const bottom = threat.y;
    const top = threat.y + threat.h;
    const needsLow = bottom > 0.55; // there is a gap underneath
    const breakable = threat.breakable;

    // Never trade a dive for a fall: a pit inside the dive's recovery window
    // outranks anything a dive could win.
    const pitBlocksDive = pit !== null && pitTime < 0.55;

    if (breakable) {
      // Dive through: get low just before contact, from the air if possible.
      if (pitBlocksDive) return out;
      if (!p.onGround && threatTime < 0.14) this.press(out, 'dive', 0.24);
      else if (p.onGround && threatTime < 0.1) this.press(out, 'dive', 0.28);
      return out;
    }

    if (needsLow) {
      if (pitBlocksDive) return out;
      if (threatTime < 0.16 && p.onGround) this.press(out, 'dive', Math.max(0.2, threat.w / speed + 0.14));
      else if (threatTime < 0.1 && !p.onGround) this.press(out, 'dive', 0.2);
      return out;
    }

    // Ground blocker: jump early enough to be above `top` on arrival.
    const clearHeight = top;
    const lead = 0.2 + Math.min(0.16, clearHeight * 0.07);
    if ((p.onGround || p.coyote > 0) && threatTime < lead && this.jumpCooldown <= 0) {
      this.press(out, 'jump', clearHeight > 1.5 ? 0.4 : 0.18);
      this.jumpCooldown = 0.12;
    }
    return out;
  }

  private press(out: BotIntent, action: 'jump' | 'dive', hold: number): void {
    if (action === 'jump') {
      out.wantJump = true;
      out.holdJump = true;
      this.holdJumpFor = hold;
    } else {
      out.wantDive = true;
      out.holdDive = true;
      this.holdDiveFor = hold;
    }
  }
}
