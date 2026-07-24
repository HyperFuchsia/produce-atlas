import * as THREE from 'three';
import type { Player } from '../game/player';
import type { SkinDef } from '../game/tuning';
import {
  FOOT,
  FOREARM,
  HEAD_R,
  HEAD_Y,
  HIP_Y,
  SHIN,
  SHOULDER_Y,
  THIGH,
  UPPER_ARM,
  poseFor,
} from '../render/pose';

/**
 * Marcus in three dimensions.
 *
 * The skeleton is driven by exactly the same pose solver the 2-D build used, so
 * every animation stays tuned to the physics: a late jump still reads as a late
 * jump. Only the ink changed — capsules and boxes in a hierarchy instead of
 * canvas paths.
 *
 * Angle convention carried over from the 2-D solver: 0 points at the floor and
 * +π/2 points forward. Forward is −Z here, and a limb hanging down rotates
 * toward −Z for a positive angle, so the raw angles map straight onto
 * `rotation.x`. Because the solver reports *absolute* joint angles, each child
 * subtracts its parent's angle.
 */

const SPINE = SHOULDER_Y - HIP_Y;

interface Limb {
  root: THREE.Group;
  child: THREE.Group;
  tip: THREE.Group;
}

const capsule = (radius: number, length: number, material: THREE.Material): THREE.Mesh => {
  const len = Math.max(0.02, length - radius * 2);
  const geo = new THREE.CapsuleGeometry(radius, len, 3, 8);
  const mesh = new THREE.Mesh(geo, material);
  // Capsules are built centred on the origin; hang it from the joint.
  mesh.position.y = -length * 0.5;
  return mesh;
};

export class Runner3D {
  readonly group = new THREE.Group();

  /** Rotates (bank, wall roll); the shadow and fill light must not. */
  private body = new THREE.Group();
  private pivot = new THREE.Group();
  private spine = new THREE.Group();
  private shoulders = new THREE.Group();
  private headGroup = new THREE.Group();
  private legs: Limb[] = [];
  private arms: Limb[] = [];
  private materials: THREE.Material[] = [];
  private accentMats: THREE.MeshBasicMaterial[] = [];
  private glow: THREE.Mesh;
  /** Neutral-warm fill so the runner is never coloured by the zone's key. */
  readonly fillLight = new THREE.PointLight(0xffe2c4, 9, 9, 2);
  private shadow: THREE.Mesh;
  private skinId = '';

  constructor() {
    this.group.add(this.body);
    this.body.add(this.pivot);

    // Contact shadow — a soft disc that lives on the deck, not on the body.
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.group.add(this.shadow);

    // Rim glow used by Flow / Overdrive; sits just behind the runner.
    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 12, 10),
      new THREE.MeshBasicMaterial({
        color: 0xff3fa4,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.BackSide,
      }),
    );
    this.glow.position.y = 1;
    this.body.add(this.glow);

    this.fillLight.position.set(2.2, 2.0, 1.8);
    this.group.add(this.fillLight);
    this.fillLight.matrixAutoUpdate = true;
  }

  /** (Re)build the body with a skin's palette. Cheap enough to call on change. */
  setSkin(skin: SkinDef): void {
    if (this.skinId === skin.id) return;
    this.skinId = skin.id;

    this.body.remove(this.pivot);
    this.pivot = new THREE.Group();
    this.body.add(this.pivot);
    for (const m of this.materials) m.dispose();
    this.materials.length = 0;
    this.accentMats.length = 0;

    const p = skin.palette;
    /**
     * `warmth` is how much of the surface lights itself in its own hue rather
     * than taking the scene's. The Conduit's key light is cyan, and cyan on
     * brown skin renders olive — so skin, hair and beard carry more of their
     * own colour, and Marcus reads the same under every zone's lighting.
     */
    const mat = (hex: string, warmth = 0.28): THREE.MeshLambertMaterial => {
      const c = new THREE.Color(hex);
      const m = new THREE.MeshLambertMaterial({ color: c, emissive: c.clone().multiplyScalar(warmth) });
      this.materials.push(m);
      return m;
    };
    const emissive = (hex: string): THREE.MeshBasicMaterial => {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex) });
      this.materials.push(m);
      this.accentMats.push(m);
      return m;
    };

    const skinMat = mat(p.skin, 0.52);
    const skinDark = mat(p.skinShadow, 0.48);
    const jacket = mat(p.jacket);
    const jacketDark = mat(p.jacketDark);
    const trouser = mat(p.trouser);
    const shoe = mat(p.shoe, 0.22);
    const hair = mat(p.hair, 0.5);
    const accent = emissive(p.accent);

    // ---------------------------------------------------------------- torso
    this.spine = new THREE.Group();
    this.pivot.add(this.spine);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.165, SPINE, 10), jacket);
    torso.position.y = SPINE * 0.5;
    torso.scale.z = 0.66;
    this.spine.add(torso);

    // Courier strap across the chest, and the satchel riding the lower back.
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.055, SPINE * 0.92, 0.02), accent);
    strap.position.set(0.05, SPINE * 0.5, -0.13);
    strap.rotation.z = 0.32;
    this.spine.add(strap);

    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.045, 0.28), accent);
    collar.position.y = SPINE - 0.02;
    this.spine.add(collar);

    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.14), jacketDark);
    bag.position.set(0, SPINE * 0.34, 0.19);
    this.spine.add(bag);
    const bagLight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), accent);
    bagLight.position.set(0, SPINE * 0.34, 0.26);
    this.spine.add(bagLight);

    // ---------------------------------------------------------------- head
    this.shoulders = new THREE.Group();
    this.shoulders.position.y = SPINE;
    this.spine.add(this.shoulders);

    this.headGroup = new THREE.Group();
    this.headGroup.position.y = HEAD_Y - SHOULDER_Y + 0.02;
    this.shoulders.add(this.headGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 8), skinDark);
    neck.position.y = -0.08;
    this.headGroup.add(neck);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 14, 12), skinMat);
    skull.scale.set(0.95, 1.04, 1.0);
    this.headGroup.add(skull);

    // A high-top fade: full on the crown, tight at the temples.
    const crown = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.98, 12, 10), hair);
    crown.scale.set(1.02, 0.86, 1.02);
    crown.position.y = HEAD_R * 0.46;
    this.headGroup.add(crown);
    const fade = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.9, 10, 8), hair);
    fade.scale.set(1.02, 0.62, 1.02);
    fade.position.y = HEAD_R * 0.06;
    fade.position.z = 0.012;
    this.headGroup.add(fade);

    const beard = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.72, 10, 8), hair);
    beard.scale.set(0.92, 0.6, 0.78);
    beard.position.set(0, -HEAD_R * 0.5, -HEAD_R * 0.22);
    this.headGroup.add(beard);

    const eyeGeo = new THREE.SphereGeometry(HEAD_R * 0.11, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf2f6ff });
    this.materials.push(eyeMat);
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(sx * HEAD_R * 0.34, HEAD_R * 0.06, -HEAD_R * 0.82);
      eye.scale.z = 0.5;
      this.headGroup.add(eye);
    }
    if (p.visor) {
      const visorMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(p.visor),
        transparent: true,
        opacity: 0.85,
      });
      this.materials.push(visorMat);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(HEAD_R * 1.7, HEAD_R * 0.5, 0.03), visorMat);
      visor.position.set(0, HEAD_R * 0.1, -HEAD_R * 0.86);
      this.headGroup.add(visor);
    }

    // ---------------------------------------------------------------- limbs
    const makeLimb = (
      upperLen: number,
      lowerLen: number,
      upperR: number,
      lowerR: number,
      upperMat: THREE.Material,
      lowerMat: THREE.Material,
      tipMat: THREE.Material,
      tipLen: number,
      isLeg: boolean,
    ): Limb => {
      const root = new THREE.Group();
      root.add(capsule(upperR, upperLen, upperMat));

      const child = new THREE.Group();
      child.position.y = -upperLen;
      child.add(capsule(lowerR, lowerLen, lowerMat));
      root.add(child);

      const tip = new THREE.Group();
      tip.position.y = -lowerLen;
      if (isLeg) {
        // Shoe: a slab that points forward out of the ankle.
        const shoeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, tipLen), tipMat);
        shoeMesh.position.set(0, -0.05, -tipLen * 0.28);
        tip.add(shoeMesh);
      } else {
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), tipMat);
        tip.add(hand);
      }
      child.add(tip);
      return { root, child, tip };
    };

    this.legs = [0, 1].map((i) => {
      const limb = makeLimb(THIGH, SHIN, 0.105, 0.085, trouser, trouser, shoe, FOOT, true);
      limb.root.position.set(i === 0 ? -0.1 : 0.1, 0, 0);
      this.pivot.add(limb.root);
      return limb;
    });

    this.arms = [0, 1].map((i) => {
      const limb = makeLimb(UPPER_ARM, FOREARM, 0.082, 0.068, jacket, skinMat, jacketDark, 0, false);
      limb.root.position.set(i === 0 ? -0.23 : 0.23, -0.02, 0);
      this.shoulders.add(limb.root);
      return limb;
    });
  }

  /** Pose and place the runner for this frame. */
  update(
    player: Player,
    speedT: number,
    worldZ: number,
    y: number,
    lateral: number,
    opts: { flow: number; overdrive: boolean; ghost: number },
  ): void {
    const pose = poseFor(player, speedT);

    // A wall run hugs the panel: shift him the last half-metre so his shoes
    // meet the face rather than hanging in the air beside it.
    this.group.position.set(lateral + player.wallRoll * 0.45, y, worldZ);
    // Bank into a lane change — the body leads the feet, as it does in life.
    // A wall run rolls much further: his feet end up on the wall, which is the
    // whole reason the move is worth having. Sign matters — +Z rotation swings
    // his head toward −X, so a left wall needs a *negative* angle to plant the
    // feet on it and throw the torso back out over the deck.
    const roll = player.wallRoll * 1.18;
    this.body.rotation.z = -player.bank * 0.5 + roll;
    this.body.rotation.y = player.bank * 0.55;
    this.pivot.position.y = HIP_Y + pose.hipDrop;
    this.pivot.position.z = -pose.hipShift;
    this.pivot.rotation.x = pose.rot;

    this.spine.rotation.x = -pose.torsoLean;
    this.headGroup.rotation.x = -pose.headTilt * 0.5;

    for (let i = 0; i < 2; i++) {
      const leg = pose.legs[i];
      const l = this.legs[i];
      l.root.rotation.x = leg.thigh;
      l.child.rotation.x = leg.knee - leg.thigh;
      l.tip.rotation.x = leg.ankle + Math.PI / 2 - leg.knee;

      const arm = pose.arms[i];
      const a = this.arms[i];
      // Arms hang off the spine, which carries its own lean — subtract it so
      // the solver's absolute angles survive the extra parent.
      a.root.rotation.x = arm.shoulder + pose.torsoLean;
      a.child.rotation.x = arm.elbow - arm.shoulder;
    }

    // The fill normally rides his open side. On a wall it swings across to the
    // panel, so the surface blooms where his shoes strike it — the one cue
    // that says "in contact" rather than "falling past".
    const wall = player.wallRoll;
    this.fillLight.position.set(2.2 + wall * 3.6, 2.0 - Math.abs(wall) * 0.9, 1.8);
    this.fillLight.intensity = 9 + Math.abs(wall) * 10;

    // Blink while invulnerable; the whole rig fades rather than flickering parts.
    const visible = opts.ghost > 0.5;
    this.pivot.visible = visible;

    // Contact shadow follows the ground, not the body.
    const lift = Math.max(0, y);
    this.shadow.position.set(0, 0.02 - y, worldZ - this.group.position.z);
    this.shadow.position.z = 0;
    const shrink = Math.max(0.25, 1 - lift * 0.16);
    this.shadow.scale.setScalar(shrink);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.45 * shrink;

    const glowMat = this.glow.material as THREE.MeshBasicMaterial;
    const target = opts.overdrive ? 0.3 : opts.flow * 0.24;
    glowMat.opacity += (target - glowMat.opacity) * 0.15;
    glowMat.color.set(opts.overdrive ? 0xff3fa4 : 0xff3fa4);
    this.glow.visible = glowMat.opacity > 0.01;
  }

  /** Tint the emissive piping to the zone accent so he belongs to the place. */
  setAccent(color: THREE.Color): void {
    for (const m of this.accentMats) m.color.lerp(color, 0.08);
  }

  dispose(): void {
    for (const m of this.materials) m.dispose();
    this.materials.length = 0;
  }
}
