/* ==========================================================================
   BUILD — self-contained page
   --------------------------------------------------------------------------
   Inlines every stylesheet and script referenced by an HTML file into one
   document with no external requests. Needed wherever a strict CSP blocks
   sub-resource loads, and useful for handing someone a single file.

     node build/inline.mjs index.html            > dist/console.html
     node build/inline.mjs docs/gallery.html     > dist/gallery.html

   Run with no arguments to build both into dist/.
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* Neither CSS nor JS may contain a literal `</script>` or the browser ends
   the block early. Escaping the slash is inert inside both languages. */
const guard = s => s.replace(/<\/(script|style)/gi, '<\\/$1');

function inline(htmlPath) {
  const abs = resolve(ROOT, htmlPath);
  const base = dirname(abs);
  let html = readFileSync(abs, 'utf8');

  const read = href => readFileSync(resolve(base, href), 'utf8');

  html = html.replace(
    /[ \t]*<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>\n?/gi,
    (whole, href) => href.startsWith('http')
      ? whole
      : `<style>\n/* ${href} */\n${guard(read(href))}\n</style>\n`);

  html = html.replace(
    /[ \t]*<script[^>]*src=["']([^"']+)["'][^>]*><\/script>\n?/gi,
    (whole, src) => src.startsWith('http')
      ? whole
      : `<script>\n/* ${src} */\n${guard(read(src))}\n</script>\n`);

  /* Relative links between the two pages would 404 once flattened. */
  html = html
    .replace(/href="\.\.\/index\.html"/g, 'href="./console.html"')
    .replace(/href="docs\/gallery\.html"/g, 'href="./gallery.html"');

  return html;
}

/* Fragment build. Some hosts (the Artifact publisher among them) supply their
   own <!doctype>/<head>/<body> shell and expect page content only. Hoist the
   title and the inlined <style> blocks out of the head, then emit them
   followed by the body's contents. */
function fragment(htmlPath) {
  const full = inline(htmlPath);
  const head = full.slice(full.indexOf('<head>'), full.indexOf('</head>'));
  const body = full.slice(full.indexOf('<body>') + 6, full.lastIndexOf('</body>'));

  const title = (head.match(/<title>([\s\S]*?)<\/title>/i) || [, ''])[1];
  const styles = head.match(/<style>[\s\S]*?<\/style>/gi) || [];

  /* `class="doc"` and `data-channel` normally live on <html>, which we no
     longer own. Reapply them at runtime. */
  const isDoc = /<html[^>]*class=["'][^"']*\bdoc\b/.test(full);
  const bootstrap =
    `<script>document.documentElement.setAttribute('data-channel','viridian');` +
    (isDoc ? `document.documentElement.classList.add('doc');` : '') +
    `</script>`;

  return `<title>${title}</title>\n${styles.join('\n')}\n${bootstrap}\n${body}`;
}

const PAIRS = [
  ['index.html', 'dist/console.html', inline],
  ['docs/gallery.html', 'dist/gallery.html', inline],
  ['index.html', 'dist/artifact-console.html', fragment],
  ['docs/gallery.html', 'dist/artifact-gallery.html', fragment]
];

if (process.argv[2]) {
  process.stdout.write(inline(process.argv[2]));
} else {
  for (const [src, dest, fn] of PAIRS) {
    const out = fn(src);
    mkdirSync(join(ROOT, dirname(dest)), { recursive: true });
    writeFileSync(join(ROOT, dest), out);
    process.stderr.write(`${src} → ${dest}  ${(out.length / 1024).toFixed(1)} kB\n`);
  }
}
