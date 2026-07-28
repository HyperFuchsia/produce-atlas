# Paste-into-another-chat prompt

Copy the block below into a new chat, then paste the contents of `car3d.js`
underneath it. That is everything the other model needs — the file is
self-contained and has no dependencies beyond `three` itself.

---

```
I have a self-contained procedural 3-D car model for three.js. It is a single
ES module with no asset dependencies — the body surface, wheels, tyre tread,
metallic-flake paint and the studio light probe used for reflections are all
generated from maths at runtime. It needs `three` (r160+) and nothing else.

Please integrate it into my project. Here is what you need to know about it:

INSTALL / IMPORT
  npm i three
  import { createCar, createStudioEnvironment, createStudioScene } from './car3d.js';

ORIENTATION
  Real-world metres, built around the origin. +X right, +Y up, +Z forward
  (the nose points at +Z). The wheels rest on the y = 0 plane. The default
  car is 4.75 m long, 1.92 m wide, 1.40 m tall.

USAGE
  const env = createStudioEnvironment(renderer);   // once, needs the renderer
  scene.environment = env.envMap;

  const car = createCar({ bodyColor: '#16305c' });
  scene.add(car.group);

  // per frame
  car.update(dt, speedInMetresPerSecond);

API
  createCar(options) -> {
    group,                     // THREE.Group — add to your scene
    update(dt, speed),         // speed in m/s, spins the wheels
    setSteering(radians),      // Ackermann-corrected, ±0.62
    setPaintColor(color),
    setLights(bool),
    setBrake(0..1),
    setReverse(bool),
    setIndicator(-1 | 0 | 1),
    dispose(),
    spec, surface, materials, wheels, body,   // escape hatches
  }

  Options: preset ('gt' | 'suv' | 'hatch'), bodyColor, rimColor, caliperColor,
  glassTint, quality ('low' | 'medium' | 'high'), glass ('transmission' |
  'simple'), rimStyle ('split5' | 'mesh'), paintMetalness, paintRoughness,
  flakes, envMapIntensity, interior, details, panelLines, contactShadow,
  castShadow, spec (override individual body profiles).

RENDERER SETTINGS THAT MATTER
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  The car relies almost entirely on reflections. Without scene.environment set
  to an env map it will look like painted clay — use createStudioEnvironment,
  or any HDRI you already have.

PERFORMANCE
  ~99k triangles at quality:'high', ~350 ms to build. Build once and reuse;
  never call createCar per frame. Pass glass:'simple' on weak GPUs, since
  'transmission' costs an extra scene render pass.

CUSTOMISING THE SHAPE
  Every silhouette is a set of profile curves sampled along Z, in the PRESETS
  table near the top of the file: `top` is the side-view roofline, `width_` the
  plan view, `belt` the shoulder line, `taperTop` the tumblehome. Editing those
  numbers is how you design a different body; nothing else needs to change.

Only the 'gt' preset is fully tuned. 'suv' and 'hatch' build correctly and are
structurally sound but their proportions are rougher.

Please tell me where to put the file, wire it into my scene/render loop, and
flag anything in my setup that would fight with it (tone mapping, colour space,
missing environment map, an existing asset pipeline, etc.).
```

---

## If you also want the demo or the React wrapper

`demo.html` is a runnable standalone page (orbit controls, colour swatches,
preset switcher) that loads three from a CDN import map. `CarModel.jsx` is a
React Three Fiber wrapper exporting `<CarModel />` and `<StudioEnvironment />`.
Paste either alongside `car3d.js` if the target project needs them.
