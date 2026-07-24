import { App } from './game/app';

/**
 * Entry point. Boots the game, and exposes a tiny debug handle that the
 * headless smoke test drives (it is harmless in production — read-only).
 */

const canvas = document.getElementById('stage') as HTMLCanvasElement | null;

const fail = (message: string): void => {
  const boot = document.querySelector<HTMLElement>('[data-screen="boot"]');
  if (boot) {
    boot.innerHTML = `<div class="boot-mark"><h1 class="boot-mark__title">NEON<span>VAULT</span></h1><p class="boot-mark__sub">${message}</p></div>`;
    boot.hidden = false;
  }
};

if (!canvas) {
  fail('canvas missing');
} else {
  try {
    const app = new App(canvas);
    app.boot();
    (window as unknown as { NEON_VAULT?: unknown }).NEON_VAULT = app.debug;
  } catch (err) {
    console.error(err);
    fail(err instanceof Error ? err.message : 'failed to start');
  }
}
