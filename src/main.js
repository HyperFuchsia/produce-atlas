import {
  ACESFilmicToneMapping,
  Group,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { CAMERA, PALETTES } from './config.js';
import { Sky } from './world/sky.js';
import { Ocean, MAX_BEACONS } from './world/ocean.js';
import { HorizonRidge, Motes, createLights } from './world/scenery.js';
import { Typeface } from './text/typeface.js';
import { TextStage } from './stage/textStage.js';
import { Director } from './stage/director.js';
import { frameFor } from './stage/path.js';
import { PostFX } from './postfx/composer.js';
import { Controls } from './ui/controls.js';
import { SAMPLE } from './sample.js';

const canvas = document.getElementById('stage');

/**
 * The UI binds its listeners immediately, but the stage only exists once the
 * typefaces have loaded — so every handler is gated on `ready`.
 */
let ready = false;
const when = (fn) => (...args) => {
  if (ready) fn(...args);
};

const controls = new Controls({
  onRun: when((text) => load(text)),
  onSample: when(() => {
    controls.setText(SAMPLE);
    load(SAMPLE);
  }),
  onReplay: when(() => stage.replay()),
  onStyle: when((style) => stage.setStyle(style)),
  onPalette: when((id) => setPalette(id)),
  onSpeed: when((speed) => {
    director.speed = speed;
  }),
  onAutoplay: when((on) => {
    director.autoplay = on;
  }),
  onNext: when(() => director.next()),
  onPrevious: when(() => director.previous()),
  onPointer: when((x, y) => director.setPointer(x, y)),
});

let palette = PALETTES.find((p) => p.id === controls.settings.palette) ?? PALETTES[0];
controls.setPaletteVars(palette);

// --------------------------------------------------------------- renderer ----

let renderer;
try {
  renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (error) {
  controls.fatal('this browser cannot open a webgl context');
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;

const scene = new Scene();
const camera = new PerspectiveCamera(
  CAMERA.fov,
  window.innerWidth / window.innerHeight,
  CAMERA.near,
  CAMERA.far,
);
camera.position.set(0, 5, 18);

// ------------------------------------------------------------------ world ----

const sky = new Sky(palette);
scene.add(sky.mesh);

const ocean = new Ocean(palette, sky.sharedUniforms);
scene.add(...ocean.group);

const ridge = new HorizonRidge(palette);
scene.add(ridge.group);

const motes = new Motes(palette);
scene.add(motes.points);

const rig = createLights(palette);
scene.add(...rig.lights);

let environment = sky.buildEnvironment(renderer);
scene.environment = environment;

const cardRoot = new Group();
cardRoot.name = 'cards';
scene.add(cardRoot);

const postfx = new PostFX(renderer, scene, camera, palette);
postfx.setSize(window.innerWidth, window.innerHeight, renderer.getPixelRatio());

let stage;
let director;

// ------------------------------------------------------------------ boot -----

controls.boot(0.15, 'loading typefaces…');

const typeface = await Typeface.load().catch((error) => {
  controls.fatal('could not load the typefaces');
  throw error;
});

controls.boot(0.65, 'typesetting…');

stage = new TextStage({ typeface, palette, root: cardRoot });
stage.setStyle(controls.settings.style);
director = new Director(camera, stage);
director.autoplay = controls.settings.autoplay;
director.speed = controls.settings.speed;

let layoutFrame = frameFor(camera.aspect);
/** Last card index pushed to the HUD, so it is only updated on change. */
let lastReported = -1;

function load(text, { keepIndex = false } = {}) {
  const source = text.trim() ? text : SAMPLE;
  const resumeAt = keepIndex ? Math.min(director.index, Math.max(0, stage.count - 1)) : 0;
  typeface.missing.clear();
  layoutFrame = frameFor(camera.aspect);
  const result = stage.setContent(source, layoutFrame);

  if (!result.cards) {
    controls.toast('nothing to show yet');
    return;
  }

  controls.setCardCount(result.cards, (index) => director.goto(index));
  const start = Math.min(resumeAt, result.cards - 1);
  director.reset(start);
  lastReported = start;
  controls.setActive(start, stage.cards[start].headline);

  const notes = [];
  if (result.truncated) notes.push('trimmed to keep it smooth');
  if (typeface.missing.size) notes.push(`${typeface.missing.size} unsupported characters dropped`);
  if (notes.length) controls.toast(notes.join(' · '));
}

function setPalette(id) {
  palette = PALETTES.find((p) => p.id === id) ?? PALETTES[0];
  sky.setPalette(palette);
  ocean.setPalette(palette);
  ridge.setPalette(palette);
  motes.setPalette(palette);
  rig.setPalette(palette);
  stage.setPalette(palette);
  postfx.setPalette(palette);
  controls.setPaletteVars(palette);

  environment.dispose();
  environment = sky.buildEnvironment(renderer);
  scene.environment = environment;
}

ready = true;
load(controls.settings.text || SAMPLE);
controls.setText(controls.settings.text || SAMPLE);

controls.boot(1, 'ready');
setTimeout(() => controls.bootDone(), 420);

// ------------------------------------------------------------------ loop -----

/**
 * Simulation time is accumulated from clamped deltas rather than read from a
 * wall clock, so a stalled or slow frame never teleports the choreography — and
 * so the whole thing can be stepped deterministically from a test harness.
 */
let simTime = 0;
let lastFrame = performance.now();
let frameAverage = 16;
let quality = 1;

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 1 ? 2 : 1));
  renderer.setSize(width, height, false);
  postfx.setSize(width, height, renderer.getPixelRatio());

  if (!ready) return;
  // A change of shape changes the measure text should be set to, so the cards
  // are re-typeset — otherwise the camera would have to retreat until the type
  // was unreadable.
  const next = frameFor(camera.aspect);
  if (Math.abs(next.wrapScale - layoutFrame.wrapScale) > 0.04) {
    load(stage.source, { keepIndex: true });
  } else {
    director.reframe();
  }
}
window.addEventListener('resize', resize);
resize();

/** Steps quality down once, if frames are consistently late. */
function watchPerformance(ms) {
  frameAverage += (ms - frameAverage) * 0.05;
  if (quality === 1 && frameAverage > 30) {
    quality = 0;
    postfx.setQuality(0);
    resize();
  }
}

/** Advances the whole simulation by `dt` seconds without drawing. */
function step(dt) {
  simTime += dt;
  const elapsed = simTime;

  director.update(dt, elapsed);
  stage.update(dt, elapsed, camera);

  sky.update(elapsed, camera);
  ocean.update(elapsed, camera);
  ridge.update(dt, camera);
  motes.update(dt, camera);

  // The accent light rides with whichever card is being read.
  const active = stage.runtime.get(stage.active);
  if (active) {
    rig.accent.position.set(
      active.group.position.x - 5.5,
      active.group.position.y + 4.2,
      active.group.position.z + 8,
    );
    rig.accent.intensity = 55 * Math.min(1, stage.activeProgress() * 1.4);
  }

  ocean.setBeacons(stage.beacons(camera.position).slice(0, MAX_BEACONS));

  if (director.index !== lastReported) {
    lastReported = director.index;
    const card = stage.cards[director.index];
    controls.setActive(director.index, card ? card.headline : '');
  }
}

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  step(dt);
  postfx.render(dt, simTime);
  watchPerformance(performance.now() - now);
});

// A small surface for the console and the screenshot harness.
window.atlas = { scene, camera, stage, director, sky, ocean, postfx, load, setPalette, step };
