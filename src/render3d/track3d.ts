import * as THREE from 'three';
import type { Spawner } from '../game/spawner';
import type { Zone3D } from './theme';

/**
 * The Conduit itself: deck, edge lighting, side rails, overhead gantries and
 * the city beyond.
 *
 * Nothing here is ever spawned or destroyed while running. Every repeating
 * element lives in a fixed-size instanced mesh whose instances are re-placed
 * each frame from a sliding window of slot indices, with all variation derived
 * from a hash of the slot index. The result is an infinite, deterministic city
 * at a constant, tiny memory cost — the same trick the 2-D skyline used.
 */

export const TRACK_WIDTH = 7.2;
const TILE = 2;
const TILES = 110;
const BEHIND = 24;
const GANTRIES = 6;
const PIT_EDGES = 8;
const SIGNS = 8;

const hash = (n: number): number => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};

/** Window grid used by every building, generated once. */
const makeWindowTexture = (): THREE.CanvasTexture => {
  const cvs = document.createElement('canvas');
  cvs.width = 64;
  cvs.height = 128;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, 64, 128);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 8; x++) {
      const r = hash(x * 31 + y * 977);
      if (r < 0.45) continue;
      ctx.fillStyle = `rgba(255,255,255,${0.25 + r * 0.75})`;
      ctx.fillRect(x * 8 + 2, y * 8 + 2, 4, 4);
    }
  }
  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 3);
  return tex;
};

/**
 * Deck surface: a dark panel with a lit leading seam. Every tile is 2 m, so the
 * seams stream past at a fixed rate and give the eye something to measure speed
 * against — the thing a bare floor cannot do.
 */
const makeDeckTexture = (): THREE.CanvasTexture => {
  const cvs = document.createElement('canvas');
  cvs.width = 64;
  cvs.height = 64;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#0b1322';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = 'rgba(150,220,255,0.16)';
  ctx.fillRect(0, 0, 64, 3);
  ctx.fillStyle = 'rgba(150,220,255,0.05)';
  ctx.fillRect(0, 32, 64, 1);
  for (let i = 1; i < 4; i++) {
    ctx.fillStyle = 'rgba(150,220,255,0.05)';
    ctx.fillRect(i * 16, 0, 1, 64);
  }
  return new THREE.CanvasTexture(cvs);
};

interface Band {
  mesh: THREE.InstancedMesh;
  spacing: number;
  count: number;
}

export class Track3D {
  readonly group = new THREE.Group();

  private deck: THREE.InstancedMesh;
  private edgeL: THREE.InstancedMesh;
  private edgeR: THREE.InstancedMesh;
  private rail: THREE.InstancedMesh;
  private gantryBeam: THREE.InstancedMesh;
  private gantryLeg: THREE.InstancedMesh;
  private gantryStrip: THREE.InstancedMesh;
  private pitEdges: THREE.InstancedMesh;
  private bands: Band[] = [];
  private buildingMat: THREE.MeshLambertMaterial;
  private towerMat: THREE.MeshLambertMaterial;
  private deckMat: THREE.MeshLambertMaterial;
  private deckTopMat!: THREE.MeshLambertMaterial;
  private edgeMat: THREE.MeshBasicMaterial;
  private railMat: THREE.MeshLambertMaterial;
  private signs: THREE.InstancedMesh;

  private dummy = new THREE.Object3D();
  private color = new THREE.Color();

  constructor() {
    this.deckMat = new THREE.MeshLambertMaterial({ color: 0x0a1020 });
    this.edgeMat = new THREE.MeshBasicMaterial({ color: 0x45f5ff });
    this.railMat = new THREE.MeshLambertMaterial({ color: 0x101827 });

    // ---------------------------------------------------------------- deck
    // Faces are ordered +x −x +y −y +z −z; only the top carries the panel seam.
    this.deckTopMat = new THREE.MeshLambertMaterial({ color: 0x0a1020, map: makeDeckTexture() });
    this.deck = new THREE.InstancedMesh(
      new THREE.BoxGeometry(TRACK_WIDTH, 0.4, TILE * 0.96),
      [this.deckMat, this.deckMat, this.deckTopMat, this.deckMat, this.deckMat, this.deckMat],
      TILES,
    );
    this.deck.frustumCulled = false;
    this.group.add(this.deck);

    const edgeGeo = new THREE.BoxGeometry(0.16, 0.1, TILE * 0.96);
    this.edgeL = new THREE.InstancedMesh(edgeGeo, this.edgeMat, TILES);
    this.edgeR = new THREE.InstancedMesh(edgeGeo, this.edgeMat, TILES);
    this.edgeL.frustumCulled = false;
    this.edgeR.frustumCulled = false;
    this.group.add(this.edgeL, this.edgeR);

    // Low side rails, tiled with the deck so they vanish over a pit too.
    this.rail = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.75, TILE * 0.96), this.railMat, TILES * 2);
    this.rail.frustumCulled = false;
    this.group.add(this.rail);

    // ---------------------------------------------------------------- city
    const winTex = makeWindowTexture();
    this.buildingMat = new THREE.MeshLambertMaterial({
      color: 0x0b1428,
      map: winTex,
      emissive: new THREE.Color(0x0a1830),
      emissiveMap: winTex,
    });
    this.towerMat = new THREE.MeshLambertMaterial({
      color: 0x0d1830,
      map: winTex,
      emissive: new THREE.Color(0x060f20),
      emissiveMap: winTex,
    });

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const near = new THREE.InstancedMesh(boxGeo, this.buildingMat, 68);
    near.frustumCulled = false;
    this.bands.push({ mesh: near, spacing: 7, count: 68 });
    const far = new THREE.InstancedMesh(boxGeo, this.towerMat, 32);
    far.frustumCulled = false;
    this.bands.push({ mesh: far, spacing: 22, count: 32 });
    this.group.add(near, far);

    // ---------------------------------------------------------------- props
    // Everything repeated is instanced. Six gantries as separate groups cost 24
    // draw calls; as three instanced meshes they cost three.
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x121a2b });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x45f5ff });
    this.gantryBeam = new THREE.InstancedMesh(
      new THREE.BoxGeometry(TRACK_WIDTH + 2.6, 0.5, 0.5),
      frameMat,
      GANTRIES,
    );
    this.gantryLeg = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 6.4, 0.42), frameMat, GANTRIES * 2);
    this.gantryStrip = new THREE.InstancedMesh(
      new THREE.BoxGeometry(TRACK_WIDTH + 2, 0.1, 0.1),
      lightMat,
      GANTRIES,
    );
    for (const m of [this.gantryBeam, this.gantryLeg, this.gantryStrip]) {
      m.frustumCulled = false;
      this.group.add(m);
    }

    this.pitEdges = new THREE.InstancedMesh(
      new THREE.BoxGeometry(TRACK_WIDTH + 0.6, 0.16, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xff3fa4 }),
      PIT_EDGES,
    );
    this.pitEdges.frustumCulled = false;
    this.group.add(this.pitEdges);

    // Neon billboards hanging off the nearer buildings.
    this.signs = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(3.4, 1.9),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
      SIGNS,
    );
    this.signs.frustumCulled = false;
    this.signs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(SIGNS * 3), 3);
    this.group.add(this.signs);
  }

  /** Re-place every repeating element for the camera's current position. */
  update(camX: number, spawner: Spawner, zone: Zone3D, time: number): void {
    this.deckMat.color.copy(zone.deck);
    this.deckTopMat.color.copy(zone.deck).multiplyScalar(1.3);
    this.edgeMat.color.copy(zone.deckEdge);
    this.buildingMat.color.copy(zone.building);
    this.buildingMat.emissive.copy(zone.window).multiplyScalar(0.17);
    this.towerMat.color.copy(zone.building).multiplyScalar(0.8);
    this.towerMat.emissive.copy(zone.window).multiplyScalar(0.1);
    this.railMat.color.copy(zone.building).multiplyScalar(1.25);

    this.updateDeck(camX, spawner);
    this.updateCity(camX, zone);
    this.updateGantries(camX);
    this.updatePits(camX, spawner);
    this.updateSigns(camX, zone, time);
  }

  private updateDeck(camX: number, spawner: Spawner): void {
    const first = Math.floor((camX - BEHIND) / TILE);
    const d = this.dummy;
    let railIdx = 0;

    for (let i = 0; i < TILES; i++) {
      const slot = first + i;
      const x = slot * TILE + TILE * 0.5;
      const solid = spawner.isSolidAt(x - TILE * 0.35) && spawner.isSolidAt(x + TILE * 0.35);

      d.position.set(0, solid ? -0.2 : -60, -x);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      this.deck.setMatrixAt(i, d.matrix);

      d.position.set(-TRACK_WIDTH * 0.5, solid ? 0.02 : -60, -x);
      d.updateMatrix();
      this.edgeL.setMatrixAt(i, d.matrix);
      d.position.x = TRACK_WIDTH * 0.5;
      d.updateMatrix();
      this.edgeR.setMatrixAt(i, d.matrix);

      // Rails only on every other tile — a solid wall would hide the city.
      for (const sx of [-1, 1]) {
        const show = solid && slot % 2 === 0;
        d.position.set(sx * (TRACK_WIDTH * 0.5 + 0.35), show ? -0.15 : -60, -x);
        d.updateMatrix();
        this.rail.setMatrixAt(railIdx++, d.matrix);
      }
    }
    this.deck.instanceMatrix.needsUpdate = true;
    this.edgeL.instanceMatrix.needsUpdate = true;
    this.edgeR.instanceMatrix.needsUpdate = true;
    this.rail.instanceMatrix.needsUpdate = true;
  }

  private updateCity(camX: number, zone: Zone3D): void {
    const d = this.dummy;
    for (let b = 0; b < this.bands.length; b++) {
      const band = this.bands[b];
      const far = b === 1;
      const first = Math.floor((camX - BEHIND) / band.spacing);
      const perSide = band.count / 2;

      for (let i = 0; i < band.count; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const slot = first + Math.floor(i / 2);
        const seed = slot * 131 + (side > 0 ? 7919 : 0) + (far ? 104729 : 0);
        const r1 = hash(seed);
        const r2 = hash(seed * 3 + 11);
        const r3 = hash(seed * 7 + 5);

        const height = far ? 30 + r1 * 84 : 8 + r1 * 30;
        const width = far ? 9 + r2 * 12 : 4.5 + r2 * 5;
        const depth = far ? 9 + r3 * 10 : 4 + r3 * 4;
        const lateral = far ? 40 + r3 * 52 : TRACK_WIDTH * 0.5 + 9.5 + r2 * 11;
        const z = slot * band.spacing + r3 * band.spacing * 0.6;

        d.position.set(side * lateral, height * 0.5 - 3, -z);
        d.rotation.set(0, 0, 0);
        d.scale.set(width, height, depth);
        d.updateMatrix();
        band.mesh.setMatrixAt(i, d.matrix);
        void perSide;
      }
      band.mesh.instanceMatrix.needsUpdate = true;
    }
    void zone;
  }

  private updateGantries(camX: number): void {
    const spacing = 34;
    const first = Math.floor((camX - 10) / spacing);
    const d = this.dummy;
    for (let i = 0; i < GANTRIES; i++) {
      const z = -((first + i) * spacing);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, 1, 1);

      d.position.set(0, 6.2, z);
      d.updateMatrix();
      this.gantryBeam.setMatrixAt(i, d.matrix);

      d.position.set(0, 5.92, z);
      d.updateMatrix();
      this.gantryStrip.setMatrixAt(i, d.matrix);

      for (let k = 0; k < 2; k++) {
        d.position.set((k === 0 ? -1 : 1) * (TRACK_WIDTH * 0.5 + 1), 3.2, z);
        d.updateMatrix();
        this.gantryLeg.setMatrixAt(i * 2 + k, d.matrix);
      }
    }
    this.gantryBeam.instanceMatrix.needsUpdate = true;
    this.gantryLeg.instanceMatrix.needsUpdate = true;
    this.gantryStrip.instanceMatrix.needsUpdate = true;
  }

  private updatePits(camX: number, spawner: Spawner): void {
    const d = this.dummy;
    let n = 0;
    for (const g of spawner.gaps) {
      if (g.x1 < camX || g.x0 > camX + 190) continue;
      for (const edge of [g.x0, g.x1]) {
        if (n >= PIT_EDGES) break;
        // Anything behind the runner sits between the camera and him.
        if (edge < camX + 0.5) continue;
        d.position.set(0, 0.05, -edge);
        d.rotation.set(0, 0, 0);
        d.scale.set(1, 1, 1);
        d.updateMatrix();
        this.pitEdges.setMatrixAt(n++, d.matrix);
      }
    }
    // Park the unused instances far below rather than paying for a hidden draw.
    d.position.set(0, -500, 0);
    d.updateMatrix();
    for (let i = n; i < PIT_EDGES; i++) this.pitEdges.setMatrixAt(i, d.matrix);
    this.pitEdges.instanceMatrix.needsUpdate = true;
  }

  private updateSigns(camX: number, zone: Zone3D, time: number): void {
    const spacing = 41;
    const first = Math.floor((camX - 10) / spacing);
    const d = this.dummy;
    for (let i = 0; i < SIGNS; i++) {
      const slot = first + Math.floor(i / 2);
      const side = i % 2 === 0 ? -1 : 1;
      const r = hash(slot * 613 + (side > 0 ? 31 : 0));

      if (r < 0.45) {
        d.position.set(0, -500, 0);
        d.rotation.set(0, 0, 0);
        d.scale.set(1, 1, 1);
      } else {
        d.position.set(side * (TRACK_WIDTH * 0.5 + 4.4), 3 + r * 7, -(slot * spacing + r * 12));
        d.rotation.set(0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
        d.scale.set(1, 1, 1);
      }
      d.updateMatrix();
      this.signs.setMatrixAt(i, d.matrix);

      const flicker = 0.55 + 0.45 * Math.abs(Math.sin(time * 1.6 + slot));
      this.color.copy(r > 0.72 ? zone.accent : zone.accent2).multiplyScalar(flicker);
      this.signs.setColorAt(i, this.color);
    }
    this.signs.instanceMatrix.needsUpdate = true;
    if (this.signs.instanceColor) this.signs.instanceColor.needsUpdate = true;
  }
}
