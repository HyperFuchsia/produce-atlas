# Procedural 3D Car Model (Three.js)

A realistic sports-coupe 3D model generated **entirely in code** — no `.glb`/`.obj`
files, no downloaded textures. One self-contained file:
[`realistic-car.html`](./realistic-car.html).

![preview](#) <!-- open realistic-car.html in a browser for the live turntable -->

## What's inside

- **Lofted body shell** — smooth cross-sections (crowned hood, shoulder bulge,
  rocker tuck) swept along keyframed length profiles, with real wheel-arch
  cutouts and fender flares baked into the surface.
- **Glass fastback canopy** — raked windshield, tumblehome side glass, painted
  decklid, chrome A-pillar/belt trim.
- **PBR materials** — clear-coat metallic paint, tinted glass, chrome, satin
  black trim, rubber.
- **Details** — wrap-around LED daytime running lights, full-width bowed LED
  tail bar, ducktail lip, splitter, diffuser with fins, twin exhausts, mirrors,
  flush door handles, fender vents, shark-fin antenna, license plate with a
  canvas-generated texture, interior tub with seats.
- **Wheels** — lathe-profiled tires, 10-spoke rims, brake discs and red
  calipers, lug nuts.
- **Studio demo scene** — RoomEnvironment image-based lighting, soft shadows,
  contact-shadow blob, display dais, auto-rotating OrbitControls camera.

## Run it

Any static server works:

```bash
npx serve .          # or: python3 -m http.server
# open http://localhost:3000/realistic-car.html
```

Drag to orbit, scroll to zoom, keys **1–5** switch paint colors.

## Use it in your own project

The file is split by banner comments:

- `── CAR MODEL (portable) ─ BEGIN/END ──` — `createRealisticCar(options)`,
  which only needs `three` and `RoundedBoxGeometry` from three's addons.
- `── DEMO SCENE ──` — replace with your own scene/renderer.

```js
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
// ...paste the CAR MODEL section, then:

const car = createRealisticCar({ paint: '#7a0d1e', plateText: 'MYCAR' });
scene.add(car.group);        // origin at ground level, +X = nose, meters
car.setPaint('#1f5c46');     // live repaint
car.wheels;                  // [FL, FR, RL, RR] groups, spin around local Z
```

For best results the host scene should set `scene.environment` (PMREM),
`ACESFilmicToneMapping`, and enable shadow mapping — see the demo section.

Tested on `three@0.180.0`; needs `>= 0.160`.
