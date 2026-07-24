import { clamp, type Rect } from '../engine/math';
import { LANES, PLAYER, WALL, laneX } from './tuning';

export type PlayerState = 'run' | 'air' | 'vault' | 'slide' | 'dive' | 'wallrun' | 'hurt' | 'dead';

export type PlayerEvent =
  | 'lane'
  | 'jump'
  | 'doubleFail'
  | 'land'
  | 'hardLand'
  | 'diveStart'
  | 'slideStart'
  | 'slideEnd'
  | 'vaultStart'
  | 'vaultEnd'
  | 'wallMount'
  | 'wallEnd';

export interface PlayerCtx {
  wantJump: boolean;
  wantDive: boolean;
  wantLeft: boolean;
  wantRight: boolean;
  holdJump: boolean;
  holdDive: boolean;
  /** Horizontal speed the run manager wants this frame (m/s). */
  targetSpeed: number;
  /** True while a ceiling forbids standing up out of a slide. */
  ceilingBlocked: boolean;
}

/**
 * Marcus. A compact state machine over a spring-free kinematic body.
 *
 * The three verbs — jump, vault, dive — all read from the same two buttons, so
 * the controller's job is mostly about *intent*: what did the player mean by
 * "down" right now, and how forgiving can we be without making it play itself.
 */
export class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;

  /** Previous fixed-step position, for render interpolation. */
  px = 0;
  py = 0;

  state: PlayerState = 'run';
  stateT = 0;
  onGround = true;
  /** Surface the player is standing on (0 = floor). */
  supportY = 0;

  coyote = 0;
  holdTime = 0;
  jumpCut = false;
  slideT = 0;
  airTime = 0;
  /** Time since the last jump press — used to score late "perfect" vaults. */
  sinceJump = 99;
  vaultObstacleId = -1;
  vaultFromY = 0;
  vaultToY = 0;
  invuln = 0;
  /** Extra speed from vaults/dives that decays back to the run speed. */
  boost = 0;

  /** Lane index (−1 left, 0 middle, +1 right) and the smoothed position. */
  lane = 0;
  lateral = 0;
  /** Previous lateral, for render interpolation. */
  pLateral = 0;
  /** Signed lean into a lane change, purely for the pose. */
  bank = 0;

  /** Wall run: which side he is attached to (−1 left, +1 right), and how far in. */
  wallSide = 0;
  wallRoll = 0;
  wallEndX = 0;

  /** Cosmetic: leg cycle phase, used by the character renderer. */
  cycle = 0;
  lean = 0;

  events: PlayerEvent[] = [];

  reset(x: number): void {
    this.x = this.px = x;
    this.y = this.py = 0;
    this.vx = 0;
    this.vy = 0;
    this.state = 'run';
    this.stateT = 0;
    this.onGround = true;
    this.supportY = 0;
    this.coyote = PLAYER.coyoteTime;
    this.holdTime = 0;
    this.jumpCut = false;
    this.slideT = 0;
    this.airTime = 0;
    this.sinceJump = 99;
    this.vaultObstacleId = -1;
    this.invuln = 0;
    this.boost = 0;
    this.cycle = 0;
    this.lean = 0;
    this.lane = 0;
    this.lateral = 0;
    this.pLateral = 0;
    this.bank = 0;
    this.wallSide = 0;
    this.wallRoll = 0;
    this.wallEndX = 0;
    this.events.length = 0;
  }

  /** True while he is still crossing between lanes. */
  get changingLane(): boolean {
    return Math.abs(this.lateral - laneX(this.lane)) > 0.02;
  }

  get height(): number {
    // On the wall he is horizontal-ish against it, but the box that matters is
    // still the one the deck hazards below him must miss.
    if (this.state === 'wallrun') return PLAYER.height * 0.8;
    if (this.state === 'slide') return PLAYER.slideHeight;
    if (this.state === 'dive') return PLAYER.diveHeight;
    if (this.state === 'vault') return PLAYER.height * 0.78;
    return PLAYER.height;
  }

  /** Collision box in world metres (y = bottom edge). */
  hitbox(): Rect {
    const w = this.state === 'dive' ? PLAYER.width * 1.5 : PLAYER.width;
    return { x: this.x - w * 0.5, y: this.y, w, h: this.height };
  }

  isDiving(): boolean {
    return this.state === 'dive';
  }

  isLow(): boolean {
    return this.state === 'slide' || this.state === 'dive';
  }

  step(dt: number, ctx: PlayerCtx): void {
    this.px = this.x;
    this.py = this.y;
    this.pLateral = this.lateral;
    this.stepLateral(dt, ctx);
    this.stateT += dt;
    this.sinceJump += dt;
    this.invuln = Math.max(0, this.invuln - dt);

    if (this.state === 'dead') {
      // Ragdoll-ish tumble so the failure reads clearly.
      this.vy -= PLAYER.gravity * 0.8 * dt;
      this.y = Math.max(0, this.y + this.vy * dt);
      this.vx *= 0.94;
      this.x += this.vx * dt;
      return;
    }

    // ---------------------------------------------------------------- wall run
    if (this.state === 'wallrun') {
      const t = clamp(this.stateT / WALL.mountTime, 0, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      this.y = WALL.height * ease;
      // Roll onto the wall: feet toward it, body square to the deck.
      this.wallRoll = this.wallSide * ease;
      this.vy = 0;
      this.vx = ctx.targetSpeed + WALL.speedBonus;
      this.x += this.vx * dt;
      this.cycle += dt * (this.vx / 12) * 9.5;
      this.lean = 0.3;
      // A push away from the wall drops him off it early, by choice.
      const bailing = this.wallSide < 0 ? ctx.wantRight : ctx.wantLeft;
      if (bailing) this.releaseWall();
      return;
    }

    // ---------------------------------------------------------------- vault
    if (this.state === 'vault') {
      const t = clamp(this.stateT / PLAYER.vaultDuration, 0, 1);
      // A shaped arc: pull up over the lip, then release forward.
      this.y = this.vaultFromY + (this.vaultToY - this.vaultFromY) * (1 - Math.pow(1 - t, 2)) + Math.sin(t * Math.PI) * 0.35;
      this.vx = ctx.targetSpeed + this.boost;
      this.x += this.vx * dt;
      this.cycle += dt * 6;
      this.lean = 0.35;
      if (t >= 1) {
        this.state = 'air';
        this.stateT = 0;
        this.onGround = false;
        this.vy = PLAYER.vaultExitVelocity;
        this.vaultObstacleId = -1;
        this.events.push('vaultEnd');
      }
      this.boost = Math.max(0, this.boost - dt * 2.2);
      return;
    }

    // ---------------------------------------------------------------- intent
    const canAct = this.state !== 'hurt';

    if (canAct && ctx.wantJump && (this.onGround || this.coyote > 0)) {
      this.vy = PLAYER.jumpVelocity;
      this.onGround = false;
      this.coyote = 0;
      this.holdTime = 0;
      this.jumpCut = false;
      this.sinceJump = 0;
      this.slideT = 0;
      this.state = 'air';
      this.stateT = 0;
      this.events.push('jump');
    }

    if (canAct && ctx.wantDive) {
      if (this.onGround) {
        if (this.state !== 'slide') {
          this.state = 'slide';
          this.stateT = 0;
          this.slideT = 0;
          this.events.push('slideStart');
        } else {
          this.slideT = 0; // re-press extends the slide
        }
      } else if (this.state !== 'dive') {
        this.state = 'dive';
        this.stateT = 0;
        this.vy = PLAYER.diveVelocity;
        this.boost = Math.max(this.boost, PLAYER.diveForwardBoost);
        this.events.push('diveStart');
      }
    }

    // ---------------------------------------------------------------- vertical
    if (!this.onGround) {
      this.airTime += dt;
      if (this.vy > 0 && ctx.holdJump && this.holdTime < PLAYER.maxHoldTime) {
        this.holdTime += dt;
      } else if (this.vy > 0 && !ctx.holdJump && !this.jumpCut) {
        // Releasing *early* clips the arc. Releasing after the hold cap does
        // not: past that point the jump is committed, so a long press can never
        // be punished for being a fraction too long.
        if (this.holdTime < PLAYER.maxHoldTime) this.vy *= PLAYER.jumpCutMul;
        this.jumpCut = true;
      }

      let g = PLAYER.gravity;
      if (this.vy > 0 && ctx.holdJump && this.holdTime < PLAYER.maxHoldTime) g *= PLAYER.riseGravityMul;
      else if (this.vy < 0) g *= PLAYER.fallGravityMul;
      if (this.state === 'dive') g *= 1.65;

      this.vy = Math.max(PLAYER.terminalVelocity, this.vy - g * dt);
      this.y += this.vy * dt;
      this.coyote = Math.max(0, this.coyote - dt);
      this.lean = clamp(this.lean + (0.18 - this.lean) * dt * 6, -0.6, 0.6);
      if (this.state === 'dive') this.lean = 0.85;
    } else {
      this.airTime = 0;
      this.coyote = PLAYER.coyoteTime;
      if (this.state === 'slide') {
        this.slideT += dt;
        const wantsUp = !ctx.holdDive && this.slideT >= PLAYER.slideMin;
        const forcedUp = this.slideT >= PLAYER.slideMax;
        if ((wantsUp || forcedUp) && !ctx.ceilingBlocked) {
          this.state = 'run';
          this.stateT = 0;
          this.events.push('slideEnd');
        }
      } else if (this.state !== 'hurt') {
        this.state = 'run';
      }
      this.lean = clamp(this.lean + ((this.state === 'slide' ? 0.9 : 0.12) - this.lean) * dt * 8, -0.6, 1.0);
    }

    // ---------------------------------------------------------------- horizontal
    const slideDrag = this.state === 'slide' ? 1 - (1 - PLAYER.slideFriction) * dt * 2 : 1;
    this.boost = Math.max(0, this.boost * slideDrag - dt * 1.5);
    this.vx = ctx.targetSpeed + this.boost;
    this.x += this.vx * dt;

    // ---------------------------------------------------------------- anim
    const stride = this.state === 'slide' ? 2.4 : 8.6;
    this.cycle += dt * (this.onGround ? (this.vx / 12) * stride : 3.2);

    if (this.state === 'hurt' && this.stateT > PLAYER.hurtStun) {
      this.state = this.onGround ? 'run' : 'air';
      this.stateT = 0;
    }
  }

  /**
   * Lateral movement. A lane change is a commitment: the input picks a target
   * lane and he crosses at a fixed speed, so a dodge always takes the same time
   * to complete and can be read by the player as a fixed cost.
   */
  private stepLateral(dt: number, ctx: PlayerCtx): void {
    if (this.state === 'dead') return;
    if (this.state === 'wallrun') {
      // Pinned to the wall; the lane index stays put for the dismount.
      const target = laneX(this.wallSide) + this.wallSide * WALL.outboard;
      this.lateral += (target - this.lateral) * Math.min(1, dt * 14);
      return;
    }
    // Settle the roll back to level once he is off the wall.
    if (this.wallRoll !== 0) {
      this.wallRoll += (0 - this.wallRoll) * Math.min(1, dt * 9);
      if (Math.abs(this.wallRoll) < 0.01) this.wallRoll = 0;
    }
    const limit = (LANES.count - 1) / 2;
    if (ctx.wantLeft && this.lane > -limit) {
      this.lane--;
      this.events.push('lane');
    }
    if (ctx.wantRight && this.lane < limit) {
      this.lane++;
      this.events.push('lane');
    }

    const target = laneX(this.lane);
    const delta = target - this.lateral;
    const step = LANES.changeSpeed * dt;
    this.lateral = Math.abs(delta) <= step ? target : this.lateral + Math.sign(delta) * step;

    // Bank into the turn, and settle back when the crossing finishes.
    const wanted = clamp(delta * 0.5, -0.42, 0.42);
    this.bank += (wanted - this.bank) * Math.min(1, dt * 12);
  }

  /** Latch onto a side wall. The world decides when; the player owns the ride. */
  mountWall(side: number, endX: number): void {
    this.state = 'wallrun';
    this.stateT = 0;
    this.wallSide = side;
    this.wallEndX = endX;
    this.lane = side;
    this.onGround = false;
    this.vy = 0;
    this.jumpCut = true;
    this.events.push('wallMount');
  }

  /** Step off the wall, arcing back toward the deck. */
  releaseWall(): void {
    if (this.state !== 'wallrun') return;
    this.state = 'air';
    this.stateT = 0;
    this.onGround = false;
    this.vy = WALL.dismountVelocity;
    this.jumpCut = true;
    this.wallSide = 0;
    this.events.push('wallEnd');
  }

  /** Shove him back inside the deck — used when a wall blocks a lane change. */
  blockLaneChange(): void {
    this.lane = Math.round(this.lateral / LANES.spacing);
  }

  /** Called by the world when the feet cross a solid surface while falling. */
  land(surfaceY: number): void {
    const hard = this.vy < -18 || this.state === 'dive';
    this.y = surfaceY;
    this.vy = 0;
    this.onGround = true;
    this.supportY = surfaceY;
    this.coyote = PLAYER.coyoteTime;
    this.jumpCut = false;
    if (this.state === 'dive') {
      // A dive rolls straight into a slide — momentum is never wasted.
      this.state = 'slide';
      this.stateT = 0;
      this.slideT = 0;
      this.events.push('slideStart');
    } else if (this.state === 'air') {
      this.state = 'run';
      this.stateT = 0;
    }
    this.events.push(hard ? 'hardLand' : 'land');
  }

  leaveGround(): void {
    if (!this.onGround) return;
    this.onGround = false;
    if (this.state === 'run' || this.state === 'slide') {
      this.state = 'air';
      this.stateT = 0;
    }
  }

  beginVault(obstacleId: number, topY: number): void {
    this.vaultObstacleId = obstacleId;
    this.vaultFromY = this.y;
    this.vaultToY = topY;
    this.state = 'vault';
    this.stateT = 0;
    this.onGround = false;
    this.vy = 0;
    this.boost = Math.max(this.boost, PLAYER.vaultSpeedBonus);
    this.invuln = Math.max(this.invuln, PLAYER.vaultDuration + 0.05);
    this.events.push('vaultStart');
  }

  hurt(): void {
    this.state = 'hurt';
    this.stateT = 0;
    this.invuln = 1.1;
    this.boost = 0;
  }

  kill(): void {
    this.state = 'dead';
    this.stateT = 0;
    this.vy = 7.5;
    this.vx = -3;
  }
}
