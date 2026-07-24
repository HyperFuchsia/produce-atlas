/**
 * Packs the production build into ONE self-contained HTML fragment that can be
 * published as a hosted page (or emailed, or opened from a USB stick).
 *
 *   npm run build && node tools/build-artifact.mjs
 *   → dist/neon-vault.html
 *
 * The output deliberately omits <!doctype>, <html>, <head> and <body>: hosts
 * that wrap fragments in their own skeleton reject those, and browsers imply
 * them anyway when the file is opened directly.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const DIST = resolve('dist');
const OUT = join(DIST, 'neon-vault.html');

const main = async () => {
  const html = await readFile(join(DIST, 'index.html'), 'utf8');
  const assets = await readdir(join(DIST, 'assets'));

  const jsName = assets.find((f) => f.endsWith('.js'));
  const cssName = assets.find((f) => f.endsWith('.css'));
  if (!jsName || !cssName) throw new Error('build output missing — run `npm run build` first');

  const js = await readFile(join(DIST, 'assets', jsName), 'utf8');
  const css = await readFile(join(DIST, 'assets', cssName), 'utf8');

  // Body markup only, with the bundler's external references stripped.
  const body = html
    .slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))
    .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '')
    .replace(/<link[^>]*>/g, '')
    .trim();

  // `</script>` inside a JS string would close the tag early.
  const safeJs = js.replace(/<\/script/gi, '<\\/script');

  const out = `<title>NEON VAULT</title>
<style>
${css}

/* --------------------------------------------------------------------------
   Hosted-page adjustments. The game normally owns the whole window; inside a
   host page it owns the frame instead, and must not inherit the host's type.
   -------------------------------------------------------------------------- */
html,
body {
  width: 100%;
  height: 100%;
  min-height: 100dvh;
  margin: 0;
  padding: 0;
  background: #05060d;
  color-scheme: dark;
}

#app {
  position: absolute;
  inset: 0;
  min-height: 100dvh;
}

/* The page commits to one visual world — a neon arcade screen — so it stays
   dark in a light-themed host rather than inverting into something it isn't. */
:root[data-theme='light'],
:root[data-theme='dark'] {
  color-scheme: dark;
}

/* Keyboard hint, shown until the player actually plays. */
.kbd-hint {
  position: absolute;
  left: 50%;
  bottom: calc(var(--safe-b) + 0.6em);
  transform: translateX(-50%);
  z-index: 5;
  padding: 0.45em 0.9em;
  border-radius: 0.6em;
  background: rgba(9, 14, 28, 0.82);
  border: 1px solid var(--edge);
  color: var(--dim);
  font-size: 0.62em;
  letter-spacing: 0.14em;
  white-space: nowrap;
  pointer-events: none;
  transition: opacity 0.4s ease;
}
.kbd-hint[hidden] {
  display: none;
}
.kbd-hint.is-gone {
  opacity: 0;
}
</style>

${body}
<div class="kbd-hint" id="kbd-hint">TAP TOP TO VAULT · TAP BOTTOM TO DIVE</div>

<script type="module">
${safeJs}
</script>
<script>
  // Hosted in a frame, key events only arrive once the frame has focus, and a
  // player who clicks straight into the canvas would otherwise find the
  // keyboard dead. Claim focus on load and on every pointer down.
  const claim = () => {
    try {
      window.focus();
    } catch {}
  };
  claim();
  window.addEventListener('pointerdown', claim, true);
  window.addEventListener('load', claim);

  // Retire the control hint once the player has taken a run.
  const hint = document.getElementById('kbd-hint');
  let hidden = false;
  const retire = () => {
    if (hidden) return;
    hidden = true;
    hint.classList.add('is-gone');
    setTimeout(() => (hint.hidden = true), 500);
  };
  window.addEventListener('pointerdown', () => setTimeout(retire, 4000), { once: true });
  window.addEventListener('keydown', () => setTimeout(retire, 4000), { once: true });
</script>
`;

  await writeFile(OUT, out, 'utf8');
  const kb = (Buffer.byteLength(out) / 1024).toFixed(1);
  console.log(`wrote ${OUT} (${kb} kB, single file, no external requests)`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
