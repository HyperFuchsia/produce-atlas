import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { WORLD } from '../config.js';
import { composeCards } from '../text/compose.js';
import { MaterialLibrary } from '../text/materials.js';
import { autoStyle, exitStateFor, startStateFor } from './animations.js';
import { cardPosition } from './path.js';

/** Soft radial wash used behind each card so type separates from the sky. */
function plateTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.88)');
  g.addColorStop(0.68, 'rgba(255,255,255,0.42)');
  g.addColorStop(0.86, 'rgba(255,255,255,0.1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

export class TextStage {
  constructor({ typeface, palette, root }) {
    this.typeface = typeface;
    this.palette = palette;
    this.root = root;
    this.materials = new MaterialLibrary(palette);
    this.plateTexture = plateTexture();
    this.markerGeometry = new OctahedronGeometry(0.5, 0);

    this.cards = [];
    this.runtime = new Map(); // index -> built card
    this.style = 'auto';
    this.active = -1;
    this.elapsed = 0;
    this.truncated = false;
  }

  get count() {
    return this.cards.length;
  }

  /**
   * Replaces the content of the whole space.
   * @param {string} raw
   * @param {{wrapScale: number}} [frame] layout measure for the current viewport
   */
  setContent(raw, frame) {
    for (const index of [...this.runtime.keys()]) this.release(index);
    this.frame = frame ?? this.frame ?? { wrapScale: 1 };
    this.source = raw;
    const { cards, truncated, glyphCount } = composeCards(raw, this.typeface, this.frame);
    this.cards = cards;
    this.truncated = truncated;
    this.active = -1;
    return { cards: cards.length, glyphCount, truncated };
  }

  setStyle(style) {
    this.style = style;
  }

  setPalette(palette) {
    this.palette = palette;
    this.materials.setPalette(palette);
    for (const built of this.runtime.values()) {
      const accent = new Color(palette.type.accent);
      built.plate.material.color.set(palette.sky.zenith);
      built.aura.material.color.set(palette.type.heading);
      for (const rule of built.rules) rule.material.color.copy(accent);
      for (const marker of built.markers) marker.material.color.set(palette.type.marker);
      if (built.ring) built.ring.material.color.copy(accent);
      for (const glyph of built.glyphs) {
        const base = this.materials.base.get(glyph.role) ?? this.materials.base.get('body');
        glyph.material.color.copy(base.color);
        glyph.material.emissive.copy(base.emissive);
      }
    }
  }

  /** Instantiates the meshes for a card (idempotent). */
  ensure(index) {
    if (index < 0 || index >= this.cards.length) return null;
    const existing = this.runtime.get(index);
    if (existing) return existing;

    const card = this.cards[index];
    const position = cardPosition(index, card);
    const group = new Group();
    group.position.copy(position);
    group.visible = false;
    group.name = `card-${index}`;

    const glyphs = [];
    for (const descriptor of card.glyphs) {
      const entry = this.typeface.glyph(descriptor.font, descriptor.char, descriptor.profile);
      if (!entry) continue;
      const material = this.materials.instance(descriptor.role);
      const mesh = new Mesh(entry.geometry, material);
      mesh.scale.setScalar(descriptor.size);
      mesh.position.set(descriptor.x, descriptor.y, 0);
      group.add(mesh);
      glyphs.push({
        mesh,
        material,
        home: new Vector3(descriptor.x, descriptor.y, 0),
        size: descriptor.size,
        role: descriptor.role,
        col: descriptor.col,
        colCount: descriptor.colCount,
        line: descriptor.line,
        x: descriptor.x,
        y: descriptor.y,
        phase: Math.random() * Math.PI * 2,
        timeline: null,
      });
    }

    // Accent rules under headlines.
    const rules = [];
    for (const rule of card.rules) {
      const material = new MeshBasicMaterial({
        color: new Color(this.palette.type.accent),
        transparent: true,
        opacity: 0.9,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new Mesh(new PlaneGeometry(1, rule.kind === 'divider' ? 0.02 : 0.045), material);
      mesh.position.set(0, rule.y, -0.02);
      mesh.scale.x = rule.width;
      mesh.userData.width = rule.width;
      group.add(mesh);
      rules.push(mesh);
    }

    // Bullet markers.
    const markers = [];
    for (const marker of card.markers) {
      const material = new MeshBasicMaterial({
        color: new Color(this.palette.type.marker),
        transparent: true,
        opacity: 0.95,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new Mesh(this.markerGeometry, material);
      mesh.position.set(marker.x, marker.y, 0);
      mesh.scale.setScalar(marker.size * 0.34);
      group.add(mesh);
      markers.push(mesh);
    }

    // A soft scrim behind the card. It darkens rather than glows, which is what
    // buys the type contrast when it drifts across the sun.
    const plateMaterial = new MeshBasicMaterial({
      map: this.plateTexture,
      color: new Color(this.palette.sky.zenith),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const plate = new Mesh(new PlaneGeometry(1, 1), plateMaterial);
    plate.scale.set(Math.max(card.width * 2.3, 14), Math.max(card.height * 3.1, 12), 1);
    plate.position.z = -1.4;
    plate.renderOrder = -1;
    group.add(plate);

    // …and a much fainter coloured bloom just behind the glyphs.
    const auraMaterial = new MeshBasicMaterial({
      map: this.plateTexture,
      color: new Color(this.palette.type.heading),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const aura = new Mesh(new PlaneGeometry(1, 1), auraMaterial);
    aura.scale.set(Math.max(card.width * 1.25, 7), Math.max(card.height * 1.5, 6), 1);
    aura.position.z = -1.2;
    aura.renderOrder = -1;
    group.add(aura);

    // A slow orbit ring, but only around the hero cards.
    let ring = null;
    if (card.kinds.some((k) => k === 'title' || k === 'heading' || k === 'stat')) {
      const radius = card.width * 0.5 + 1.0;
      const ringMaterial = new MeshBasicMaterial({
        color: new Color(this.palette.type.accent),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      ring = new Mesh(new TorusGeometry(radius, 0.016, 3, 180), ringMaterial);
      // Laid almost flat and set back, so it reads as an orbit the card sits
      // inside rather than a circle drawn on top of the type.
      ring.position.z = -2.4;
      ring.rotation.set(Math.PI / 2 - 0.09, 0, 0.05);
      group.add(ring);
    }

    const built = {
      index,
      card,
      group,
      glyphs,
      rules,
      markers,
      plate,
      aura,
      ring,
      phase: 'hidden',
      clock: 0,
      span: 1,
      style: 'surface',
      seed: index * 7.13 + 1.7,
      basePosition: position.clone(),
      // Resolved on the first update, then damped, so cards always face the eye.
      yaw: null,
      // Reused each frame so the ocean's light columns cost no allocations.
      beacon: { position: position.clone(), color: new Color(), power: 0, distance: 0 },
    };

    this.root.add(group);
    this.runtime.set(index, built);
    return built;
  }

  release(index) {
    const built = this.runtime.get(index);
    if (!built) return;
    this.root.remove(built.group);
    for (const glyph of built.glyphs) glyph.material.dispose();
    for (const rule of built.rules) {
      rule.geometry.dispose();
      rule.material.dispose();
    }
    for (const marker of built.markers) marker.material.dispose();
    built.plate.geometry.dispose();
    built.plate.material.dispose();
    built.aura.geometry.dispose();
    built.aura.material.dispose();
    if (built.ring) {
      built.ring.geometry.dispose();
      built.ring.material.dispose();
    }
    this.runtime.delete(index);
  }

  /** Keeps only the cards near `index` in memory. */
  prune(index) {
    for (const key of [...this.runtime.keys()]) {
      if (Math.abs(key - index) > WORLD.buildRadius) this.release(key);
    }
  }

  /** Builds a card's meshes ahead of time, without showing it. */
  prepare(index) {
    this.ensure(index);
  }

  /** Sends the card currently on screen away. */
  dismissActive() {
    const built = this.runtime.get(this.active);
    if (built) this.dismiss(built);
  }

  /** Starts the reveal for a card, and dismisses whatever was showing. */
  reveal(index) {
    if (index < 0 || index >= this.cards.length) return;
    if (this.active === index && this.runtime.get(index)?.phase !== 'hidden') return;

    if (this.active !== index) {
      const previous = this.runtime.get(this.active);
      if (previous && previous.phase !== 'hidden') this.dismiss(previous);
    }

    const built = this.ensure(index);
    if (!built) return;
    this.active = index;

    const styleName = this.style === 'auto' ? autoStyle(built.card, index) : this.style;
    built.style = styleName;
    built.phase = 'in';
    built.clock = 0;
    built.group.visible = true;

    const total = built.glyphs.length;
    let span = 0;

    built.glyphs.forEach((glyph, readIndex) => {
      const ctx = {
        seed: built.seed,
        readIndex,
        total,
        colFrac: glyph.colCount > 1 ? glyph.col / (glyph.colCount - 1) : 0,
        lineFrac: built.card.lineCount > 1 ? glyph.line / (built.card.lineCount - 1) : 0,
        altitude: built.basePosition.y,
      };
      const state = startStateFor(styleName, glyph, ctx);
      glyph.timeline = {
        fromPos: new Vector3(
          glyph.home.x + state.offset[0],
          glyph.home.y + state.offset[1],
          glyph.home.z + state.offset[2],
        ),
        toPos: glyph.home.clone(),
        fromRot: state.rotation,
        toRot: [0, 0, 0],
        fromScale: state.scale,
        toScale: 1,
        delay: state.delay,
        duration: state.duration,
        ease: state.ease,
        fadeIn: true,
      };
      span = Math.max(span, state.delay + state.duration);
    });

    built.span = Math.max(span, 0.6);
    this.prune(index);
    // Warm up the neighbours so the next reveal has zero hitch.
    this.ensure(index + 1);
  }

  dismiss(built) {
    if (!built || built.phase === 'out' || built.phase === 'hidden') return;
    built.phase = 'out';
    built.clock = 0;
    let span = 0;
    for (const glyph of built.glyphs) {
      const ctx = {
        seed: built.seed,
        colFrac: glyph.colCount > 1 ? glyph.col / (glyph.colCount - 1) : 0,
        lineFrac: built.card.lineCount > 1 ? glyph.line / (built.card.lineCount - 1) : 0,
      };
      const state = exitStateFor(glyph, ctx);
      const current = glyph.mesh.position.clone();
      glyph.timeline = {
        fromPos: current,
        toPos: new Vector3(
          glyph.home.x + state.offset[0],
          glyph.home.y + state.offset[1],
          glyph.home.z + state.offset[2],
        ),
        fromRot: [glyph.mesh.rotation.x, glyph.mesh.rotation.y, glyph.mesh.rotation.z],
        toRot: state.rotation,
        fromScale: glyph.mesh.scale.x / glyph.size,
        toScale: state.scale,
        delay: state.delay,
        duration: state.duration,
        ease: state.ease,
        fadeIn: false,
      };
      span = Math.max(span, state.delay + state.duration);
    }
    built.span = Math.max(span, 0.5);
  }

  /** Re-runs the current card's entrance. */
  replay() {
    const built = this.runtime.get(this.active);
    if (!built) return;
    const index = this.active;
    built.phase = 'hidden';
    this.active = -1;
    this.reveal(index);
  }

  update(dt, elapsed, camera) {
    this.elapsed = elapsed;

    for (const built of this.runtime.values()) {
      if (built.phase === 'hidden') continue;
      built.clock += dt;

      const progress = Math.min(1, built.clock / built.span);
      const isOut = built.phase === 'out';

      // Card-level float, and a damped turn to keep the card facing the eye.
      const bob = Math.sin(elapsed * 0.42 + built.seed) * 0.14;
      built.group.position.y = built.basePosition.y + bob;
      if (camera) {
        const wanted = Math.atan2(
          camera.position.x - built.group.position.x,
          camera.position.z - built.group.position.z,
        );
        built.yaw = built.yaw === null ? wanted : built.yaw + (wanted - built.yaw) * Math.min(1, dt * 2.2);
      }
      built.group.rotation.y = (built.yaw ?? 0) + Math.sin(elapsed * 0.24 + built.seed) * 0.012;

      const presence = isOut ? 1 - progress : Math.min(1, built.clock / (built.span * 0.55));
      built.plate.material.opacity = 0.6 * presence;
      built.aura.material.opacity = 0.14 * presence;
      built.aura.rotation.z = Math.sin(elapsed * 0.1 + built.seed) * 0.05;

      for (const rule of built.rules) {
        const grow = isOut ? 1 - progress : easeOutExpo(Math.min(1, built.clock / 0.9));
        rule.scale.x = rule.userData.width * grow;
        rule.material.opacity = 0.9 * presence;
      }

      for (let i = 0; i < built.markers.length; i++) {
        const marker = built.markers[i];
        marker.rotation.y = elapsed * 1.1 + i;
        marker.rotation.x = elapsed * 0.7;
        marker.material.opacity = 0.95 * presence;
      }

      if (built.ring) {
        // Only the tilt breathes: a torus spinning in its own plane is invisible,
        // and spinning it about world Y would swing the whole ellipse off-axis.
        built.ring.rotation.x = Math.PI / 2 - 0.09 + Math.sin(elapsed * 0.17 + built.seed) * 0.035;
        built.ring.rotation.z = 0.05 + Math.sin(elapsed * 0.11 + built.seed) * 0.02;
        built.ring.material.opacity = 0.22 * presence;
      }

      let settled = true;
      for (const glyph of built.glyphs) {
        const tl = glyph.timeline;
        if (!tl) continue;
        const local = (built.clock - tl.delay) / tl.duration;
        const p = local <= 0 ? 0 : local >= 1 ? 1 : tl.ease(local);
        if (local < 1) settled = false;

        const clamped = Math.max(0, Math.min(1, local));
        glyph.mesh.position.lerpVectors(tl.fromPos, tl.toPos, p);
        glyph.mesh.rotation.set(
          lerp(tl.fromRot[0], tl.toRot[0], p),
          lerp(tl.fromRot[1], tl.toRot[1], p),
          lerp(tl.fromRot[2], tl.toRot[2], p),
        );
        glyph.mesh.scale.setScalar(glyph.size * lerp(tl.fromScale, tl.toScale, p));

        const base = glyph.material.userData.baseEmissive ?? 0.2;
        // A bright ignition spike as the glyph lands, then settle to base.
        const fromLanding = (clamped - 0.82) * 6.5;
        const spike = Math.exp(-(fromLanding * fromLanding));
        glyph.material.emissiveIntensity = base + (tl.fadeIn ? spike * 1.9 : 0);
        glyph.material.opacity = tl.fadeIn
          ? Math.min(1, Math.max(clamped * 3.2, 0.02))
          : Math.max(0, 1 - clamped) ** 0.7;

        if (local >= 1 && tl.fadeIn) {
          // Living idle: a barely-there sway keeps the type from feeling printed.
          const wob = Math.sin(elapsed * 0.9 + glyph.phase) * 0.012 * glyph.size;
          glyph.mesh.position.y = glyph.home.y + wob;
          glyph.mesh.rotation.z = Math.sin(elapsed * 0.6 + glyph.phase) * 0.01;
        }
      }

      if (settled) {
        if (isOut) {
          built.phase = 'hidden';
          built.group.visible = false;
        } else if (built.phase === 'in') {
          built.phase = 'idle';
        }
      }
    }
  }

  /** Reveal progress of the active card, 0..1 — used to time the camera. */
  activeProgress() {
    const built = this.runtime.get(this.active);
    if (!built) return 1;
    return Math.min(1, built.clock / built.span);
  }

  /** Light columns for the ocean, nearest cards first. */
  beacons(cameraPosition) {
    const list = [];
    for (const built of this.runtime.values()) {
      if (built.phase === 'hidden') continue;
      const presence =
        built.phase === 'out'
          ? 1 - Math.min(1, built.clock / built.span)
          : Math.min(1, built.clock / (built.span * 0.6));
      const distance = built.group.position.distanceTo(cameraPosition);
      const colorKey = built.card.kinds.includes('stat') ? 'stat' : 'heading';
      const beacon = built.beacon;
      beacon.position.copy(built.group.position);
      beacon.color.set(this.palette.type[colorKey]);
      beacon.power = presence * 0.9 * Math.max(0, 1 - distance / 90);
      beacon.distance = distance;
      list.push(beacon);
    }
    list.sort((a, b) => a.distance - b.distance);
    return list;
  }

  dispose() {
    for (const index of [...this.runtime.keys()]) this.release(index);
    this.materials.dispose();
    this.plateTexture.dispose();
    this.markerGeometry.dispose();
  }
}

const lerp = (a, b, t) => a + (b - a) * t;
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-9 * t));
