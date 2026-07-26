/* ==========================================================================
   Strips the document shell off index.html.

   Some hosts supply their own <!doctype>/<head>/<body> and expect page
   content only. index.html has no external assets, so the fragment is just
   the title, the style block and the body — no inlining required.

     node orbital/build.mjs        → orbital/dist/fragment.html
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const full = readFileSync(join(HERE, 'index.html'), 'utf8');

const head = full.slice(full.indexOf('<head>'), full.indexOf('</head>'));
const body = full.slice(full.indexOf('<body>') + 6, full.lastIndexOf('</body>'));

const title  = (head.match(/<title>([\s\S]*?)<\/title>/i) || [, ''])[1];
const styles = (head.match(/<style>[\s\S]*?<\/style>/gi) || []).join('\n');

/* The page paints its own black ground and sizes to the viewport. Without
   the <html>/<body> we own, restate just enough for the host's shell. */
const shim = `<style>
html,body{height:100%;margin:0;background:#000;overflow:hidden;overscroll-behavior:none}
</style>`;

const out = `<title>${title}</title>\n${styles}\n${shim}\n${body}`;

mkdirSync(join(HERE, 'dist'), { recursive: true });
writeFileSync(join(HERE, 'dist', 'fragment.html'), out);
process.stderr.write(`orbital/index.html → orbital/dist/fragment.html  ${(out.length / 1024).toFixed(1)} kB\n`);
