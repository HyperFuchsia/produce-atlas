import * as THREE from 'three';
import type { Obstacle, ObstacleKind, Pickup } from '../game/entities';
import type { Zone3D } from './theme';
import { TRACK_WIDTH } from './track3d';

/**
 * Obstacle and pickup meshes, pooled by kind and re-bound to the simulation's
 * entities every frame. Each mesh is built as a unit and scaled to the exact
 * hitbox the collision code uses, so what you see is precisely what kills you.
 *
 * One rule drives every silhouette: there is no strafing on the Conduit, so an
 * obstacle must *read* as blocking the whole path. Anything physically narrow
 * (a pylon, a sentry drone) carries a hazard field spanning the deck, or
 * players would waste a life trying to go around it.
 */

interface PoolItem {
  group: THREE.Group;
  /** Parts that need per-frame tinting or animation. */
  glow?: THREE.Mesh;
  spin?: THREE.Object3D;
}

const SPAN = TRACK_WIDTH - 1.1;

/** Diagonal hazard tape, generated once and shared by every blocking face. */
const hazardTexture = (): THREE.CanvasTexture => {
  const cvs = document.createElement('canvas');
  cvs.width = 128;
  cvs.height = 32;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#111a2b';
  ctx.fillRect(0, 0, 128, 32);
  ctx.strokeStyle = '#d99a35';
  ctx.lineWidth = 7;
  for (let i = -2; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 16, 34);
    ctx.lineTo(i * 16 + 26, -2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3.4, 1);
  return tex;
};

export class Props3D {
  readonly group = new THREE.Group();

  private pools = new Map<ObstacleKind, PoolItem[]>();
  private shards: THREE.Mesh[] = [];
  private cores: THREE.Mesh[] = [];
  private powers: THREE.Group[] = [];
  private mats: THREE.Material[] = [];
  private hazard = hazardTexture();
  private time = 0;

  private accentMats: THREE.MeshBasicMaterial[] = [];

  constructor() {
    const kinds: ObstacleKind[] = [
      'barrier', 'stack', 'beam', 'panel', 'drone', 'gate', 'pad', 'rail', 'pylon', 'wallrun', 'field',
    ];
    for (const kind of kinds) {
      const pool: PoolItem[] = [];
      const size = kind === 'barrier' || kind === 'beam' || kind === 'panel' ? 8 : kind === 'wallrun' || kind === 'field' ? 3 : 5;
      for (let i = 0; i < size; i++) {
        const item = this.build(kind);
        item.group.visible = false;
        this.group.add(item.group);
        pool.push(item);
      }
      this.pools.set(kind, pool);
    }

    // ---------------------------------------------------------------- shards
    const shardGeo = new THREE.OctahedronGeometry(0.3, 0);
    const shardMat = this.keep(new THREE.MeshBasicMaterial({ color: 0x45f5ff }));
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(shardGeo, shardMat);
      m.scale.set(0.75, 1.35, 0.75);
      m.visible = false;
      this.shards.push(m);
      this.group.add(m);
    }

    const coreGeo = new THREE.IcosahedronGeometry(0.42, 0);
    const coreMat = this.keep(new THREE.MeshBasicMaterial({ color: 0xffc857 }));
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(coreGeo, coreMat);
      m.visible = false;
      this.cores.push(m);
      this.group.add(m);
    }

    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.075, 6, 20),
        this.keep(new THREE.MeshBasicMaterial({ color: 0xffffff })),
      );
      const bulb = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.3, 0),
        this.keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })),
      );
      g.add(ring, bulb);
      g.visible = false;
      this.powers.push(g);
      this.group.add(g);
    }
  }

  private keep<T extends THREE.Material>(m: T): T {
    this.mats.push(m);
    return m;
  }

  private emissive(hex: number, opts: THREE.MeshBasicMaterialParameters = {}): THREE.MeshBasicMaterial {
    const m = this.keep(new THREE.MeshBasicMaterial({ color: hex, ...opts }));
    return m;
  }

  // --------------------------------------------------------------------------
  // Construction — every mesh is authored in unit terms and scaled to the hitbox
  // --------------------------------------------------------------------------
  private build(kind: ObstacleKind): PoolItem {
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);

    switch (kind) {
      case 'barrier': {
        // Box faces are ordered +x −x +y −y +z −z; the runner arrives from +z,
        // so only that face wears the hazard tape.
        const plain = this.keep(new THREE.MeshLambertMaterial({ color: 0x1d2740 }));
        const front = this.keep(new THREE.MeshBasicMaterial({ map: this.hazard }));
        const shell = new THREE.Mesh(new THREE.BoxGeometry(SPAN, 1, 1), [
          plain, plain, plain, plain, front, plain,
        ]);
        shell.position.y = 0.5;
        body.add(shell);
        // A narrow lit lip — the promise of a hand-plant, not a landing pad.
        const lip = new THREE.Mesh(new THREE.BoxGeometry(SPAN + 0.2, 0.1, 0.34), this.accent(0x45f5ff));
        lip.position.set(0, 1.01, -0.42);
        body.add(lip);
        return { group: g, glow: lip };
      }

      case 'stack': {
        const plain = this.keep(new THREE.MeshLambertMaterial({ color: 0x232c44 }));
        const front = this.keep(new THREE.MeshBasicMaterial({ map: this.hazard }));
        const mat = [plain, plain, plain, plain, front, plain];
        for (let i = 0; i < 3; i++) {
          const crate = new THREE.Mesh(new THREE.BoxGeometry(SPAN / 3 - 0.08, 1, 1), mat);
          crate.position.set((i - 1) * (SPAN / 3), 0.5, 0);
          body.add(crate);
        }
        const cap = new THREE.Mesh(new THREE.BoxGeometry(SPAN + 0.1, 0.1, 1.1), this.accent(0x45f5ff));
        cap.position.y = 1;
        body.add(cap);
        return { group: g, glow: cap };
      }

      case 'beam': {
        for (const sx of [-1, 1]) {
          const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 1, 0.3),
            this.keep(new THREE.MeshLambertMaterial({ color: 0x1b2334 })),
          );
          post.position.set(sx * SPAN * 0.5, 0.5, 0);
          post.scale.y = 1;
          body.add(post);
        }
        const field = new THREE.Mesh(
          new THREE.BoxGeometry(SPAN, 1, 0.9),
          this.emissive(0xff3fa4, { transparent: true, opacity: 0.22, depthWrite: false }),
        );
        field.position.y = 0.5;
        body.add(field);
        // The hard edge you must get under.
        const edge = new THREE.Mesh(new THREE.BoxGeometry(SPAN + 0.5, 0.11, 1.1), this.accent(0xff3fa4));
        body.add(edge);
        return { group: g, glow: edge };
      }

      case 'panel': {
        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(SPAN, 1, 0.12),
          this.emissive(0xbfe9ff, { transparent: true, opacity: 0.26, depthWrite: false }),
        );
        glass.position.y = 0.5;
        body.add(glass);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(SPAN + 0.14, 0.1, 0.22), this.accent(0x9dff4d));
        frame.position.y = 1;
        body.add(frame);
        // Pre-scored fracture line at dive height — the invitation to smash it.
        const score = new THREE.Mesh(
          new THREE.BoxGeometry(SPAN, 0.07, 0.2),
          this.emissive(0x9dff4d, { transparent: true, opacity: 0.85 }),
        );
        score.position.y = 0.28;
        body.add(score);
        return { group: g, glow: frame };
      }

      case 'drone': {
        const hull = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.42, 1.1, 3, 10),
          this.keep(new THREE.MeshLambertMaterial({ color: 0x2b3550 })),
        );
        hull.rotation.z = Math.PI / 2;
        hull.position.y = 0.5;
        body.add(hull);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), this.accent(0xff3fa4));
        eye.position.set(0, 0.5, -0.5);
        body.add(eye);
        // Hazard field, so it reads as blocking the whole deck.
        const field = new THREE.Mesh(
          new THREE.BoxGeometry(SPAN, 0.9, 0.5),
          this.emissive(0xff3fa4, { transparent: true, opacity: 0.16, depthWrite: false }),
        );
        field.position.y = 0.5;
        body.add(field);
        const wash = new THREE.Mesh(
          new THREE.ConeGeometry(0.55, 1.6, 8, 1, true),
          this.emissive(0x45f5ff, { transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }),
        );
        wash.position.y = -0.6;
        wash.rotation.x = Math.PI;
        body.add(wash);
        return { group: g, glow: eye, spin: hull };
      }

      case 'gate': {
        for (const sx of [-1, 1]) {
          const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.32, 4.4, 0.32),
            this.keep(new THREE.MeshLambertMaterial({ color: 0x161d2e })),
          );
          post.position.set(sx * SPAN * 0.5, 2.2, 0);
          body.add(post);
        }
        const field = new THREE.Mesh(
          new THREE.BoxGeometry(SPAN, 1, 0.34),
          this.emissive(0xffc857, { transparent: true, opacity: 0.5, depthWrite: false }),
        );
        field.position.y = 0.5;
        body.add(field);
        return { group: g, glow: field };
      }

      case 'pad': {
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(SPAN * 0.6, 1, 1),
          this.keep(new THREE.MeshLambertMaterial({ color: 0x1a2338 })),
        );
        base.position.y = 0.5;
        body.add(base);
        const top = new THREE.Mesh(new THREE.BoxGeometry(SPAN * 0.62, 0.12, 1.05), this.accent(0x9dff4d));
        top.position.y = 1;
        body.add(top);
        const beacon = new THREE.Mesh(
          new THREE.ConeGeometry(SPAN * 0.28, 3.2, 8, 1, true),
          this.emissive(0x9dff4d, { transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }),
        );
        beacon.position.y = 2.6;
        body.add(beacon);
        return { group: g, glow: top };
      }

      case 'rail': {
        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(SPAN * 0.8, 1, 1),
          this.keep(new THREE.MeshLambertMaterial({ color: 0x18202f })),
        );
        deck.position.y = 0.5;
        body.add(deck);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(SPAN * 0.82, 0.1, 1.04), this.accent(0x45f5ff));
        strip.position.y = 1;
        body.add(strip);
        return { group: g, glow: strip };
      }

      case 'wallrun': {
        // The collision extent is the mount lane; the wall itself is drawn out
        // at the deck edge, where it reads as a surface you could run on.
        // It is lit, not dark: an unlit navy slab disappeared into the skyline
        // and the run looked like Marcus falling over in mid-air.
        const face = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 1, 1),
          this.keep(new THREE.MeshLambertMaterial({ color: 0x2c4470, emissive: 0x0b1526 })),
        );
        face.position.set(0, 0.5, 0);
        body.add(face);
        // Light rails at running height: the invitation, and the sightline.
        for (const h of [0.42, 0.62]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.98), this.accent(0x45f5ff));
          rail.position.set(-0.3, h, 0);
          body.add(rail);
        }
        // Panel seams down its length. Without them the face is a flat colour
        // and nothing on it moves, so the wall reads as painted backdrop
        // rather than a surface tearing past at forty metres a second.
        const seamMat = this.emissive(0x45f5ff, { transparent: true, opacity: 0.5 });
        for (let i = 0; i < 5; i++) {
          const seam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.88, 0.012), seamMat);
          seam.position.set(-0.27, 0.5, -0.5 + (i + 0.5) / 5);
          body.add(seam);
        }
        const glow = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.55, 0.98),
          this.emissive(0x45f5ff, { transparent: true, opacity: 0.2, depthWrite: false }),
        );
        glow.position.set(-0.32, 0.52, 0);
        body.add(glow);
        return { group: g, glow };
      }

      case 'field': {
        // Lethal, and it must look it — but as a volume of energy you can see
        // through, not a painted slab that swallows the whole frame.
        const core = new THREE.Mesh(
          new THREE.BoxGeometry(SPAN, 1, 1),
          this.emissive(0xff2f6d, { transparent: true, opacity: 0.09, depthWrite: false }),
        );
        core.position.y = 0.5;
        body.add(core);
        const floor = new THREE.Mesh(
          new THREE.BoxGeometry(SPAN, 0.05, 1),
          this.emissive(0xff2f6d, { transparent: true, opacity: 0.5 }),
        );
        floor.position.y = 0.015;
        body.add(floor);
        // The ceiling of the volume. It must stay see-through: opaque, this is
        // a 6 m × 24 m plate seen from a camera above it, and it painted out
        // half the screen in flat magenta.
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(SPAN, 0.06, 1),
          this.emissive(0xff2f6d, { transparent: true, opacity: 0.2, depthWrite: false }),
        );
        cap.position.y = 1;
        body.add(cap);
        // Emitter ribs down its length, kept deliberately faint. You view a
        // field end-on, so every rib stacks: seven at 0.4 opacity multiplied
        // out to a 97%-opaque magenta curtain that hid the whole course
        // behind it. Five at 0.1 still read as a field and you can see through.
        const ribMat = this.emissive(0xff5f95, { transparent: true, opacity: 0.1, depthWrite: false });
        for (let i = 0; i < 5; i++) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(SPAN, 0.9, 0.03), ribMat);
          rib.position.set(0, 0.5, -0.5 + (i + 0.5) / 5);
          body.add(rib);
        }
        // Edge rails carry the width instead — they read at a glance and,
        // being end-on themselves, never stack.
        for (const sx of [-1, 1]) {
          const rail = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.08, 1),
            this.emissive(0xff87ad, { transparent: true, opacity: 0.85 }),
          );
          rail.position.set(sx * SPAN * 0.5, 1, 0);
          body.add(rail);
        }
        for (const sx of [-1, 1]) {
          const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 1.15, 0.22),
            this.keep(new THREE.MeshLambertMaterial({ color: 0x2a1522 })),
          );
          post.position.set(sx * SPAN * 0.5, 0.55, 0);
          body.add(post);
        }
        return { group: g, glow: cap };
      }

      case 'pylon': {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 1, 0.55),
          this.keep(new THREE.MeshLambertMaterial({ color: 0x222c44 })),
        );
        post.position.y = 0.5;
        body.add(post);
        const field = new THREE.Mesh(
          new THREE.BoxGeometry(SPAN, 1, 0.3),
          this.emissive(0xffc857, { transparent: true, opacity: 0.18, depthWrite: false }),
        );
        field.position.y = 0.5;
        body.add(field);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(SPAN, 0.1, 0.4), this.accent(0xffc857));
        cap.position.y = 1;
        body.add(cap);
        return { group: g, glow: cap };
      }
    }
  }

  private accent(hex: number): THREE.MeshBasicMaterial {
    const m = this.emissive(hex);
    this.accentMats.push(m);
    return m;
  }

  // --------------------------------------------------------------------------
  // Per-frame binding
  // --------------------------------------------------------------------------
  update(obstacles: Obstacle[], pickups: Pickup[], camX: number, dt: number, zone: Zone3D): void {
    this.time += dt;
    const used = new Map<ObstacleKind, number>();

    for (const o of obstacles) {
      if (o.broken) continue;
      // Retire an obstacle as soon as the runner is past it. The camera rides
      // ~6 m behind him, so anything left behind ends up between the two and a
      // waist-high barrier's lit lip swells to fill a third of the screen.
      if (o.x + o.w < camX - 0.8 || o.x > camX + 200) continue;
      const pool = this.pools.get(o.kind);
      if (!pool) continue;
      const idx = used.get(o.kind) ?? 0;
      if (idx >= pool.length) continue;
      used.set(o.kind, idx + 1);

      const item = pool[idx];
      item.group.visible = true;
      // Unit meshes sit on y=0 spanning z ∈ [-0.5, 0.5] and x ∈ [-SPAN/2,
      // SPAN/2]; scale to the exact hitbox, including its lateral extent.
      if (o.kind === 'wallrun') {
        const side = Math.sign(o.lane) || 1;
        item.group.position.set(side * (TRACK_WIDTH * 0.5 + 0.25), 0, -(o.x + o.w * 0.5));
        item.group.scale.set(side, o.h, o.w);
      } else {
        item.group.position.set(o.lane, o.y, -(o.x + o.w * 0.5));
        item.group.scale.set(Math.min(1, (o.halfW * 2) / SPAN), o.h, o.w);
      }

      if (item.spin) item.spin.rotation.x = Math.sin(this.time * 2.5 + o.seed) * 0.15;
      if (o.kind === 'gate') {
        const mat = item.glow!.material as THREE.MeshBasicMaterial;
        mat.color.set(o.variant === 1 ? 0xff3fa4 : 0xffc857);
        // A locked gate stops pulsing: it has committed, and so have you.
        mat.opacity = o.locked ? 0.72 : 0.42 + 0.22 * Math.sin(this.time * 9 + o.seed);
      }
    }

    for (const [kind, pool] of this.pools) {
      for (let i = used.get(kind) ?? 0; i < pool.length; i++) pool[i].group.visible = false;
    }

    this.updatePickups(pickups, camX, zone);
  }

  private updatePickups(pickups: Pickup[], camX: number, zone: Zone3D): void {
    let s = 0;
    let c = 0;
    let p = 0;
    for (const pk of pickups) {
      if (pk.taken) continue;
      if (pk.x < camX - 0.6 || pk.x > camX + 170) continue;
      const bob = Math.sin(this.time * 3 + pk.x * 0.6) * 0.08;

      if (pk.kind === 'shard') {
        if (s >= this.shards.length) continue;
        const m = this.shards[s++];
        m.visible = true;
        m.position.set(pk.lane, pk.y + bob, -pk.x);
        m.rotation.y = this.time * 2.4 + pk.x;
        m.rotation.z = 0.35;
      } else if (pk.kind === 'core') {
        if (c >= this.cores.length) continue;
        const m = this.cores[c++];
        m.visible = true;
        m.position.set(pk.lane, pk.y + bob, -pk.x);
        m.rotation.y = this.time * 1.6;
        m.rotation.x = this.time * 0.9;
      } else {
        if (p >= this.powers.length) continue;
        const g = this.powers[p++];
        g.visible = true;
        g.position.set(pk.lane, pk.y + bob, -pk.x);
        g.rotation.y = this.time * 1.8;
        const color = pk.kind === 'magnet' ? 0x45f5ff : pk.kind === 'shield' ? 0x9dff4d : 0xff3fa4;
        for (const child of g.children) {
          ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(color);
        }
        const pulse = 1 + 0.08 * Math.sin(this.time * 6);
        g.scale.setScalar(pulse);
      }
    }
    for (let i = s; i < this.shards.length; i++) this.shards[i].visible = false;
    for (let i = c; i < this.cores.length; i++) this.cores[i].visible = false;
    for (let i = p; i < this.powers.length; i++) this.powers[i].visible = false;
    void zone;
  }
}
