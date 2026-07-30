import { PALETTES, REVEAL_STYLES } from '../config.js';

const STORE = 'atlas.v1';

const readStore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? '{}');
  } catch {
    return {};
  }
};

const writeStore = (patch) => {
  try {
    localStorage.setItem(STORE, JSON.stringify({ ...readStore(), ...patch }));
  } catch {
    /* private mode — settings simply do not persist */
  }
};

const el = (id) => document.getElementById(id);

/** All DOM wiring: the composer panel, the HUD, keyboard and drag-and-drop. */
export class Controls {
  constructor(handlers) {
    this.handlers = handlers;
    this.saved = readStore();
    this.toastTimer = 0;
    this.nudgeTimer = 0;
    this.touched = false;

    this.dom = {
      ui: el('ui'),
      boot: el('boot'),
      bootFill: el('boot-fill'),
      bootStatus: el('boot-status'),
      input: el('input'),
      style: el('sel-style'),
      palette: el('sel-palette'),
      speed: el('rng-speed'),
      auto: el('chk-auto'),
      run: el('btn-run'),
      sample: el('btn-sample'),
      replay: el('btn-replay'),
      collapse: el('btn-collapse'),
      reopen: el('btn-reopen'),
      composer: el('composer'),
      index: el('hud-index'),
      total: el('hud-total'),
      headline: el('hud-headline'),
      dots: el('hud-dots'),
      toast: el('toast'),
    };

    this.populate();
    this.bind();
  }

  populate() {
    for (const style of REVEAL_STYLES) {
      const option = document.createElement('option');
      option.value = style;
      option.textContent = style === 'auto' ? 'Auto (per card)' : style;
      this.dom.style.append(option);
    }
    for (const palette of PALETTES) {
      const option = document.createElement('option');
      option.value = palette.id;
      option.textContent = palette.name;
      this.dom.palette.append(option);
    }

    this.dom.style.value = this.saved.style ?? 'auto';
    this.dom.palette.value = this.saved.palette ?? PALETTES[0].id;
    this.dom.speed.value = this.saved.speed ?? 1;
    this.dom.auto.checked = this.saved.autoplay ?? true;
  }

  get settings() {
    return {
      text: this.saved.text ?? '',
      style: this.dom.style.value,
      palette: this.dom.palette.value,
      speed: Number(this.dom.speed.value),
      autoplay: this.dom.auto.checked,
    };
  }

  bind() {
    const h = this.handlers;

    const run = () => {
      const text = this.dom.input.value;
      writeStore({ text });
      this.saved.text = text;
      h.onRun(text);
      // Once you have committed some text you want to watch it, not the panel.
      this.setComposerOpen(false);
    };

    // The panel is left open on arrival for discoverability, then gets out of
    // the way on its own if it is never touched.
    for (const event of ['pointerdown', 'focusin', 'input']) {
      this.dom.composer.addEventListener(event, () => {
        this.touched = true;
        clearTimeout(this.nudgeTimer);
      });
    }
    this.nudgeTimer = setTimeout(() => {
      if (!this.touched) this.setComposerOpen(false);
    }, 7000);

    this.dom.run.addEventListener('click', run);
    this.dom.sample.addEventListener('click', () => h.onSample());
    this.dom.replay.addEventListener('click', () => h.onReplay());

    this.dom.style.addEventListener('change', () => {
      writeStore({ style: this.dom.style.value });
      h.onStyle(this.dom.style.value);
    });
    this.dom.palette.addEventListener('change', () => {
      writeStore({ palette: this.dom.palette.value });
      h.onPalette(this.dom.palette.value);
    });
    this.dom.speed.addEventListener('input', () => {
      writeStore({ speed: Number(this.dom.speed.value) });
      h.onSpeed(Number(this.dom.speed.value));
    });
    this.dom.auto.addEventListener('change', () => {
      writeStore({ autoplay: this.dom.auto.checked });
      h.onAutoplay(this.dom.auto.checked);
    });

    this.dom.collapse.addEventListener('click', () => this.setComposerOpen(false));
    this.dom.reopen.addEventListener('click', () => this.setComposerOpen(true));

    this.dom.input.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        run();
      }
    });

    window.addEventListener('keydown', (event) => {
      const typing =
        document.activeElement === this.dom.input ||
        document.activeElement?.tagName === 'SELECT';
      if (typing) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          h.onNext();
          break;
        case 'ArrowRight':
          h.onNext();
          break;
        case 'ArrowLeft':
          h.onPrevious();
          break;
        case 'r':
        case 'R':
          h.onReplay();
          break;
        case 'p':
        case 'P':
          this.dom.auto.checked = !this.dom.auto.checked;
          writeStore({ autoplay: this.dom.auto.checked });
          h.onAutoplay(this.dom.auto.checked);
          this.toast(this.dom.auto.checked ? 'autoplay on' : 'autoplay paused');
          break;
        case 'h':
        case 'H':
          this.dom.ui.classList.toggle('ui--hidden');
          break;
        case 'f':
        case 'F':
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen?.();
          break;
        default:
          break;
      }
    });

    // Drag a text file anywhere to load it.
    const stop = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('dragover', (event) => {
      stop(event);
      document.body.classList.add('dragging');
    });
    window.addEventListener('dragleave', (event) => {
      stop(event);
      if (event.relatedTarget === null) document.body.classList.remove('dragging');
    });
    window.addEventListener('drop', async (event) => {
      stop(event);
      document.body.classList.remove('dragging');
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      if (file.size > 1_500_000) {
        this.toast('that file is a bit large');
        return;
      }
      const text = await file.text();
      this.dom.input.value = text;
      writeStore({ text });
      h.onRun(text);
    });

    window.addEventListener('pointermove', (event) => {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = -((event.clientY / window.innerHeight) * 2 - 1);
      h.onPointer(nx, ny);
    });
  }

  setComposerOpen(open) {
    this.dom.composer.classList.toggle('composer--collapsed', !open);
    this.dom.reopen.hidden = open;
  }

  setText(text) {
    this.dom.input.value = text;
    writeStore({ text });
    this.saved.text = text;
  }

  setCardCount(count, onSelect) {
    this.dom.total.textContent = String(count);
    this.dom.dots.replaceChildren();
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('span');
      dot.title = `card ${i + 1}`;
      dot.addEventListener('click', () => onSelect(i));
      this.dom.dots.append(dot);
    }
  }

  setActive(index, headline) {
    this.dom.index.textContent = String(index + 1);
    this.dom.headline.textContent = headline || '—';
    const dots = this.dom.dots.children;
    for (let i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i === index);
  }

  setPaletteVars(palette) {
    const hex = (v) => `#${v.toString(16).padStart(6, '0')}`;
    document.documentElement.style.setProperty('--accent', hex(palette.type.accent));
    document.documentElement.style.setProperty('--hot', hex(palette.type.heading));
  }

  boot(fraction, status) {
    this.dom.bootFill.style.width = `${Math.round(fraction * 100)}%`;
    if (status) this.dom.bootStatus.textContent = status;
  }

  bootDone() {
    this.dom.boot.classList.add('boot--done');
    setTimeout(() => this.dom.boot.remove(), 1600);
  }

  toast(message) {
    const node = this.dom.toast;
    node.textContent = message;
    node.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      node.hidden = true;
    }, 2600);
  }

  fatal(message) {
    this.dom.bootStatus.textContent = message;
    this.dom.bootFill.style.background = '#ff6a8a';
  }
}
