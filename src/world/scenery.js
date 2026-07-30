import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Points,
  PointsMaterial,
  Vector3,
} from 'three';
import { SUN_DIR } from '../config.js';

/**
 * Three-point rig plus a travelling accent light. The sun is *behind* the type,
 * so it works as a rim light while the key light comes from over the viewer's
 * shoulder — that combination is what makes extruded chrome read.
 */
export function createLights(palette) {
  const sun = new Vector3(...SUN_DIR).normalize();

  const key = new DirectionalLight(0xfff0e2, 2.1);
  key.position.set(0.35, 0.75, 1).multiplyScalar(40);

  const rim = new DirectionalLight(palette.sky.sunGlow, 3.4);
  rim.position.copy(sun).multiplyScalar(60);

  const fill = new DirectionalLight(palette.type.accent, 0.85);
  fill.position.set(-1, -0.15, 0.45).multiplyScalar(40);

  const accent = new PointLight(palette.type.heading, 90, 90, 2);

  return {
    lights: [key, rim, fill, accent],
    accent,
    setPalette(p) {
      rim.color.set(p.sky.sunGlow);
      fill.color.set(p.type.accent);
      accent.color.set(p.type.heading);
    },
  };
}

function moteTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

/** Slow drifting spray/dust that gives the air some volume. */
export class Motes {
  constructor(palette, count = 1500) {
    this.box = new Vector3(170, 70, 170);
    this.count = count;
    this.origin = new Vector3();

    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.box.x;
      positions[i * 3 + 1] = Math.random() * this.box.y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.box.z;
      speeds[i] = 0.3 + Math.random() * 1.1;
    }

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.speeds = speeds;

    this.material = new PointsMaterial({
      size: 0.34,
      map: moteTexture(),
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      color: new Color(palette.type.accent),
      opacity: 0.5,
      sizeAttenuation: true,
    });

    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.name = 'motes';
  }

  setPalette(palette) {
    this.material.color.set(palette.type.accent);
  }

  update(dt, camera) {
    const pos = this.geometry.attributes.position.array;
    const { x: bx, y: by, z: bz } = this.box;
    const cx = camera.position.x;
    const cy = camera.position.y;
    const cz = camera.position.z;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      pos[i3 + 1] += this.speeds[i] * dt;
      pos[i3] += Math.sin(pos[i3 + 1] * 0.3 + i) * dt * 0.25;

      // Wrap the cloud around the camera so it is never outrun.
      if (pos[i3 + 1] - cy > by * 0.5) pos[i3 + 1] -= by;
      if (pos[i3 + 1] - cy < -by * 0.5) pos[i3 + 1] += by;
      if (pos[i3] - cx > bx * 0.5) pos[i3] -= bx;
      if (pos[i3] - cx < -bx * 0.5) pos[i3] += bx;
      if (pos[i3 + 2] - cz > bz * 0.5) pos[i3 + 2] -= bz;
      if (pos[i3 + 2] - cz < -bz * 0.5) pos[i3 + 2] += bz;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.map.dispose();
    this.material.dispose();
  }
}

/** A low island silhouette with a glowing crest, parked on the horizon. */
export class HorizonRidge {
  constructor(palette) {
    this.group = new Group();
    this.group.name = 'ridge';
    this.distance = 1500;

    const segments = 420;
    const width = 5200;
    const profile = new Float32Array(segments + 1);
    const xs = new Float32Array(segments + 1);

    for (let i = 0; i <= segments; i++) {
      const x = -width / 2 + (width * i) / segments;
      xs[i] = x;
      const ridge =
        Math.sin(x * 0.0021) * 34 +
        Math.sin(x * 0.0067 + 1.7) * 21 +
        Math.sin(x * 0.0173 + 0.4) * 11 +
        Math.sin(x * 0.041 + 2.2) * 4;
      // Window the profile so the land breaks into separate islands.
      const window = Math.max(0, Math.sin(x * 0.00088 + 0.6) * 0.85 + 0.2);
      profile[i] = Math.max(0, (ridge + 26) * window);
    }

    const verts = [];
    const colors = [];
    const dark = new Color(palette.sky.zenith).lerp(new Color(0x000000), 0.35);
    const lit = new Color(palette.sky.mid).lerp(new Color(palette.sky.horizon), 0.25);

    for (let i = 0; i < segments; i++) {
      const x0 = xs[i];
      const x1 = xs[i + 1];
      const h0 = profile[i];
      const h1 = profile[i + 1];
      // Two triangles from the waterline up to the crest.
      verts.push(x0, 0, 0, x1, 0, 0, x1, h1, 0);
      verts.push(x0, 0, 0, x1, h1, 0, x0, h0, 0);
      for (const t of [0, 0, 1, 0, 1, 1]) {
        const c = t ? lit : dark;
        colors.push(c.r, c.g, c.b);
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(verts, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    this.landMaterial = new MeshBasicMaterial({ vertexColors: true, fog: false });
    const land = new Mesh(geometry, this.landMaterial);
    land.frustumCulled = false;

    const crest = new BufferGeometry();
    const crestVerts = [];
    for (let i = 0; i <= segments; i++) crestVerts.push(xs[i], profile[i] + 1.5, 0);
    crest.setAttribute('position', new Float32BufferAttribute(crestVerts, 3));
    this.crestMaterial = new LineBasicMaterial({
      color: new Color(palette.water.grid),
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const crestLine = new Line(crest, this.crestMaterial);
    crestLine.frustumCulled = false;

    this.group.add(land, crestLine);
  }

  setPalette(palette) {
    this.crestMaterial.color.set(palette.water.grid);
    const dark = new Color(palette.sky.zenith).lerp(new Color(0x000000), 0.35);
    const lit = new Color(palette.sky.mid).lerp(new Color(palette.sky.horizon), 0.25);
    const geo = this.group.children[0].geometry;
    const colors = geo.attributes.color.array;
    for (let i = 0; i < colors.length / 3; i++) {
      // Vertex order per triangle pair: bottom, bottom, top, bottom, top, top.
      const isTop = [0, 0, 1, 0, 1, 1][i % 6];
      const c = isTop ? lit : dark;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.attributes.color.needsUpdate = true;
  }

  update(_dt, camera) {
    this.group.position.set(camera.position.x * 0.35, 0, camera.position.z - this.distance);
  }

  dispose() {
    for (const child of this.group.children) child.geometry.dispose();
    this.landMaterial.dispose();
    this.crestMaterial.dispose();
  }
}
