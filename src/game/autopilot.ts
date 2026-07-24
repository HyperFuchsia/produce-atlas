import type { Obstacle } from './entities';
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
  holdJump: boolean;
  holdDive: boolean;
}

const idle = (): BotIntent => ({ wantJump: false, wantDive: false, holdJump: false, holdDive: false });

export class Autopilot {
  private holdJumpFor = 0;
  private holdDiveFor = 0;
  private jumpCooldown = 0;

  reset(): void {
    this.holdJumpFor = 0;
    this.holdDiveFor = 0;
    this.jumpCooldown = 0;
  }

  update(world: World, dt: number): BotIntent {
    const p = world.player;
    const out = idle();
    this.holdJumpFor = Math.max(0, this.holdJumpFor - dt);
    this.holdDiveFor = Math.max(0, this.holdDiveFor - dt);
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);

    out.holdJump = this.holdJumpFor > 0;
    out.holdDive = this.holdDiveFor > 0;
    if (world.phase !== 'running') return out;

    const speed = Math.max(1, world.speed);
    const front = p.x + 0.33;

    // ---- pits are the least forgiving thing on the track, so they win.
    const pit = world.spawner.pitAhead(front, speed * 0.8);
    let pitTime = Infinity;
    if (pit) pitTime = (pit.x0 - front) / speed;

    // ---- nearest blocking obstacle
    let threat: Obstacle | null = null;
    let threatTime = Infinity;
    for (const o of world.spawner.obstacles) {
      if (o.broken || o.standable) continue;
      if (o.x + o.w < front) continue;
      const t = (o.x - front) / speed;
      if (t > 0.95) break;
      if (t < threatTime) {
        threat = o;
        threatTime = t;
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
