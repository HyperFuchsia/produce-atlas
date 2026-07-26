/* ==========================================================================
   PHOSPHOR — TUBE BEHAVIOUR
   --------------------------------------------------------------------------
   The parts of the system that are properties of the display rather than of
   the application: power-on, the running log, phosphor persistence on
   changed values, and the mission clock.

   Nothing here knows what produce-atlas is. Any application can mount on it.
   ========================================================================== */

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* -------------------------------------------------------------------------
   PERSISTENCE
   Any element carrying [data-live] flashes to core brightness when its text
   changes and decays back. This is the system's single most characteristic
   motion, and it is automatic: components never call it themselves.
   ------------------------------------------------------------------------- */
function watchPersistence(root = document) {
  if (reducedMotion()) return;
  const obs = new MutationObserver(records => {
    const hit = new Set();
    for (const r of records) {
      const el = r.target.nodeType === 1 ? r.target : r.target.parentElement;
      const live = el && el.closest('[data-live]');
      if (live) hit.add(live);
    }
    hit.forEach(el => {
      el.classList.remove('struck');
      void el.offsetWidth;              // force reflow so the animation restarts
      el.classList.add('struck');
    });
  });
  obs.observe(root, { subtree: true, childList: true, characterData: true });
  return obs;
}

/* -------------------------------------------------------------------------
   BEAM SWEEP
   A module that reloads its contents redraws visibly. A vector display
   cannot cross-fade, so nothing in this system cross-fades.
   ------------------------------------------------------------------------- */
function sweep(el) {
  if (!el || reducedMotion()) return;
  el.classList.remove('sweeping');
  void el.offsetWidth;
  el.classList.add('sweeping');
  setTimeout(() => el.classList.remove('sweeping'), 950);
}

/* -------------------------------------------------------------------------
   LOG
   A bounded, append-only console. Lines carry a source and a severity;
   severity is rendered as colour and as a prefix character, so it survives
   greyscale.
   ------------------------------------------------------------------------- */
function Log(node, opts = {}) {
  const max = opts.max || 60;
  const lines = [];

  function stamp() {
    const t = new Date();
    return `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
  }

  function render() {
    node.innerHTML = lines.map(l => `
      <div class="term__line" data-sev="${l.sev}">
        <span class="term__t">${l.t}</span>
        <span class="term__src">${l.src}</span>
        <span class="term__msg">${l.msg}</span>
      </div>`).join('') +
      '<div class="term__line"><span class="term__t"></span><span class="term__src"></span>' +
      '<span class="term__msg"><span class="caret"></span></span></div>';
    node.scrollTop = node.scrollHeight;
  }

  return {
    write(msg, src = 'ATLAS', sev = 'info') {
      lines.push({ t: stamp(), src, msg, sev });
      if (lines.length > max) lines.shift();
      render();
    },
    clear() { lines.length = 0; render(); }
  };
}

/* -------------------------------------------------------------------------
   TYPE-ON
   Text arrives a character at a time, on a fixed interval. Not an easing
   curve — a teletype has a constant character rate.
   ------------------------------------------------------------------------- */
function typeOn(el, text, rate = 9) {
  if (reducedMotion()) { el.textContent = text; return Promise.resolve(); }
  el.textContent = '';
  return new Promise(resolve => {
    let i = 0;
    const id = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) { clearInterval(id); resolve(); }
    }, rate);
  });
}

/* -------------------------------------------------------------------------
   MISSION CLOCK
   Elapsed session time plus wall clock, in the format a ship's console
   would print: no meridiem, zero-padded, monospaced.
   ------------------------------------------------------------------------- */
function startClock(elapsedEl, wallEl) {
  const t0 = Date.now();
  function paint() {
    const s = Math.floor((Date.now() - t0) / 1000);
    if (elapsedEl) {
      elapsedEl.textContent =
        `${pad(Math.floor(s / 3600), 3)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
    }
    if (wallEl) {
      const d = new Date();
      wallEl.textContent =
        `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())} ` +
        `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z`;
    }
  }
  paint();
  return setInterval(paint, 1000);
}

/* -------------------------------------------------------------------------
   POWER-ON
   Runs the degauss animation, then hands control to the application.
   Resolves immediately when motion is reduced.
   ------------------------------------------------------------------------- */
function powerOn(bootEl) {
  return new Promise(resolve => {
    if (!bootEl || reducedMotion()) {
      if (bootEl) bootEl.hidden = true;
      resolve();
      return;
    }
    setTimeout(() => { bootEl.hidden = true; resolve(); }, 2600);
  });
}

/* -------------------------------------------------------------------------
   SIGNAL FAULT
   Deliberately rare. A glitch that runs constantly stops signifying
   anything; this fires only on a channel change or an alarm.
   ------------------------------------------------------------------------- */
function tear(el) {
  if (!el || reducedMotion()) return;
  el.classList.remove('tearing');
  void el.offsetWidth;
  el.classList.add('tearing');
  setTimeout(() => el.classList.remove('tearing'), 1100);
}
