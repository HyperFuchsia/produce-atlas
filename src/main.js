import { input } from './core/input.js';
import { audio } from './core/audio.js';
import { startLoop } from './core/loop.js';
import { app } from './game/app.js';
import { TitleState } from './states/title.js';

function boot() {
  const overlay = document.getElementById('boot');
  input.init();

  const start = () => {
    if (start.done) return;
    start.done = true;
    overlay?.remove();
    audio.resume();
    audio.playMusic('title');
  };

  overlay?.addEventListener('pointerdown', start);
  window.addEventListener('keydown', start, { once: false });
  window.addEventListener('pointerdown', start, { once: false });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM') {
      const muted = audio.toggleMute();
      if (!muted) audio.sfx('cursor');
    }
  });

  app.push(new TitleState());
  startLoop((dt) => app.update(dt), () => app.render());
}

boot();

// Handy for debugging from the console (and for the headless test harness).
import { G, addToParty, markCaught } from './game/state.js';
import { makeCreature } from './game/creature.js';
window.__wildbound = {
  app, audio, input, G,
  give: (id, lv) => { const c = makeCreature(id, lv); markCaught(id); addToParty(c); return c.nick; },
  party: () => G.party.map((c) => `${c.nick} Lv${c.level} ${c.hp}/${c.maxhp}`),
  warp: (map, x, y) => {
    const ow = app.states.find((s) => s.player && s.map);
    if (ow) ow.loadMap(map, x, y, 0);
  },
};
