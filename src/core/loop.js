import { input } from './input.js';

const STEP = 1000 / 60;

export function startLoop(update, render) {
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = now - last;
    last = now;
    if (dt > 250) dt = 250; // avoid spiral of death after a tab switch
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      input.beginFrame();
      update(STEP);
      input.endFrame();
      acc -= STEP;
      steps++;
    }
    if (steps === 5) acc = 0;
    render();
  }
  requestAnimationFrame(frame);
}
