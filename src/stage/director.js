import { Vector2, Vector3 } from 'three';
import { CAMERA, WORLD } from '../config.js';
import { readPose } from './path.js';

const EASE = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Flies the camera from card to card, adds the idle drift and mouse parallax
 * that keep the space feeling hand-held, and decides when to advance.
 */
export class Director {
  constructor(camera, stage) {
    this.camera = camera;
    this.stage = stage;

    this.index = 0;
    this.travel = 1; // 0..1 through the current move
    this.autoplay = true;
    this.speed = 1;
    this.dwell = 0;

    this.fromEye = new Vector3();
    this.fromTarget = new Vector3();
    this.toEye = new Vector3();
    this.toTarget = new Vector3();
    this.eye = new Vector3();
    this.target = new Vector3();

    this.pointer = new Vector2();
    this.pointerSmooth = new Vector2();
    /** Card waiting to be revealed once the camera is most of the way there. */
    this.pending = null;
  }

  /** Called after new content is composed. */
  reset(index = 0) {
    const pose = this.pose(index);
    this.index = index;
    this.dwell = 0;
    this.fromEye.copy(pose.eye);
    this.fromTarget.copy(pose.target);
    this.toEye.copy(pose.eye);
    this.toTarget.copy(pose.target);
    this.eye.copy(pose.eye);
    this.target.copy(pose.target);
    // Open from further out and higher up, for a proper establishing shot.
    this.fromEye.copy(pose.eye).add(new Vector3(0, 3.5, 26));
    this.travel = 0;
    this.pending = null;
    this.stage.reveal(index);
  }

  get view() {
    return { aspect: this.camera.aspect, fov: this.camera.fov };
  }

  pose(index) {
    return readPose(index, this.stage.cards[index], this.view);
  }

  /**
   * Re-aims at the current card without restarting its reveal — used when the
   * viewport changes shape and the framing has to be solved again.
   */
  reframe() {
    const pose = this.pose(this.index);
    this.fromEye.copy(this.eye);
    this.fromTarget.copy(this.target);
    this.toEye.copy(pose.eye);
    this.toTarget.copy(pose.target);
    this.travel = Math.min(this.travel, 0.55);
  }

  goto(index, { immediate = false } = {}) {
    const clamped = Math.max(0, Math.min(this.stage.count - 1, index));
    if (clamped === this.index && this.travel >= 1) {
      this.dwell = 0;
      return;
    }
    this.index = clamped;
    const pose = this.pose(clamped);
    this.fromEye.copy(this.eye);
    this.fromTarget.copy(this.target);
    this.toEye.copy(pose.eye);
    this.toTarget.copy(pose.target);
    this.travel = immediate ? 1 : 0;
    this.dwell = 0;

    // Break the old card apart now, but hold the new one back until we are
    // nearly there — otherwise the two animations overlap in the same frame.
    this.stage.dismissActive();
    this.stage.prepare(clamped);
    if (immediate) {
      this.stage.reveal(clamped);
      this.pending = null;
    } else {
      this.pending = clamped;
    }
  }

  next() {
    if (this.index >= this.stage.count - 1) {
      this.goto(0);
      return;
    }
    this.goto(this.index + 1);
  }

  previous() {
    this.goto(this.index - 1);
  }

  setPointer(x, y) {
    this.pointer.set(x, y);
  }

  update(dt, elapsed) {
    const card = this.stage.cards[this.index];

    if (this.travel < 1) {
      this.travel = Math.min(1, this.travel + dt / (CAMERA.travel / this.speed));
      if (this.pending !== null && this.travel >= 0.42) {
        this.stage.reveal(this.pending);
        this.pending = null;
      }
    } else if (this.autoplay && this.stage.count > 1) {
      const chars = card ? card.charCount : 0;
      const hold = (CAMERA.dwellBase + chars * CAMERA.dwellPerChar) / this.speed;
      // Only start counting once the type has finished arriving.
      if (this.stage.activeProgress() >= 1) this.dwell += dt;
      if (this.dwell > hold) this.next();
    }

    if (this.pending !== null && this.travel >= 1) {
      this.stage.reveal(this.pending);
      this.pending = null;
    }

    const t = EASE(this.travel);
    this.eye.lerpVectors(this.fromEye, this.toEye, t);
    this.target.lerpVectors(this.fromTarget, this.toTarget, t);

    // Arc the flight slightly so travel does not feel like a dolly on rails.
    const arc = Math.sin(this.travel * Math.PI);
    this.eye.y += arc * 1.5;
    this.eye.x += arc * Math.sin(this.index * 2.1) * 2.6;

    // Idle breathing.
    this.eye.x += Math.sin(elapsed * 0.31) * 0.35;
    this.eye.y += Math.sin(elapsed * 0.24 + 1.2) * 0.22;
    this.eye.z += Math.cos(elapsed * 0.19) * 0.3;

    // Mouse parallax, smoothed.
    this.pointerSmooth.lerp(this.pointer, Math.min(1, dt * 3));
    this.eye.x += this.pointerSmooth.x * CAMERA.parallax;
    this.eye.y += this.pointerSmooth.y * CAMERA.parallax * 0.55;

    // Never dip into the water.
    this.eye.y = Math.max(this.eye.y, WORLD.waterLevel + 1.1);

    this.camera.position.copy(this.eye);
    this.camera.lookAt(this.target);
    // A whisper of roll keeps the horizon alive.
    this.camera.rotateZ(Math.sin(elapsed * 0.16) * 0.006 + this.pointerSmooth.x * 0.01);
  }
}
