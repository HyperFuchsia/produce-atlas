#!/usr/bin/env node
// build.mjs — inline the ES modules and stylesheet into one self-contained HTML file.
//
// No dependencies, by design: the output has to survive a strict CSP that blocks every
// external request, so there is nothing to fetch at runtime and nothing to install to build.
//
// The source is deliberately written to a restricted subset of ESM so the transform below
// stays honest rather than becoming a half-parser:
//   imports  — `import { a, b as c } from './mod.js';`
//   exports  — `export function|const|let|class Name`, or `export { a, b };`
// No default exports, no namespace imports, no dynamic import, no re-exports.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const srcDir = resolve(root, 'src');

const IMPORT_RE = /^import\s*\{([\s\S]*?)\}\s*from\s*['"](.+?)['"];?\s*$/gm;
const DECL_RE = /^export\s+(?:async\s+)?(function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
const LIST_RE = /^export\s*\{([\s\S]*?)\};?\s*$/gm;

/** Read a module, rewrite it into a factory body, and report what it depends on. */
function transform(id) {
  let code = readFileSync(resolve(srcDir, id), 'utf8');
  const deps = [];

  code = code.replace(IMPORT_RE, (_, names, spec) => {
    if (!spec.startsWith('.')) throw new Error(`${id}: only relative imports are supported (got "${spec}")`);
    const dep = relative(srcDir, resolve(dirname(resolve(srcDir, id)), spec)).split('\\').join('/');
    deps.push(dep);
    // `a as b` is valid destructuring as `a: b`, which is exactly the rename we want.
    return `const {${names.split(' as ').join(': ')}} = __req(${JSON.stringify(dep)});`;
  });

  const exported = new Set();
  for (const m of code.matchAll(DECL_RE)) exported.add(m[2]);
  for (const m of code.matchAll(LIST_RE)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/).pop().trim();
      if (name) exported.add(name);
    }
  }

  code = code.replace(LIST_RE, '').replace(/^export\s+/gm, '');

  // Assigned at the end of the body so `const` declarations are already initialised,
  // and by getter so cyclic imports still observe live values rather than snapshots.
  const bindings = [...exported].map((n) => `${n}: { get: () => ${n}, enumerable: true }`).join(', ');
  const tail = exported.size ? `\nObject.defineProperties(__x, { ${bindings} });\n` : '';

  return { code: `${code}${tail}`, deps };
}

function bundle(entry) {
  const seen = new Map();
  const order = [];
  const visit = (id) => {
    if (seen.has(id)) return;
    const mod = transform(id);
    seen.set(id, mod);          // set before recursing so import cycles terminate
    for (const d of mod.deps) visit(d);
    order.push(id);
  };
  visit(entry);

  const defs = order
    .map((id) => `__m[${JSON.stringify(id)}] = function (__x, __req) {\n${seen.get(id).code}\n};`)
    .join('\n');

  return `(function () {
'use strict';
var __m = {}, __c = {};
function __req(id) {
  if (__c[id]) return __c[id];
  var x = __c[id] = {};
  __m[id](x, __req);
  return x;
}
${defs}
__req(${JSON.stringify(entry)});
})();`;
}

// src/index.html is the only copy of the markup. The build reads it, lifts out the body, and
// swaps the two external references (stylesheet, module script) for inline equivalents — so
// there is no second copy of the HUD to fall out of step with the first.
const css = readFileSync(resolve(srcDir, 'style.css'), 'utf8');
const page = readFileSync(resolve(srcDir, 'index.html'), 'utf8');
const js = bundle('main.js');

const title = page.match(/<title>([\s\S]*?)<\/title>/)?.[1];
if (!title) throw new Error('src/index.html: no <title>');

const inner = page.match(/<body>([\s\S]*)<\/body>/)?.[1];
if (!inner) throw new Error('src/index.html: no <body>');

const scriptTag = /<script\s+type="module"\s+src="\.\/main\.js"><\/script>/;
if (!scriptTag.test(inner)) throw new Error('src/index.html: module script tag not found');

const body = `<title>${title}</title>\n\n<style>\n${css}</style>\n`
  + inner.replace(scriptTag, () => `<script>\n${js}\n</script>`).trimEnd()
  + '\n';

mkdirSync(resolve(root, 'dist'), { recursive: true });

// Artifact target: body content only. The publisher supplies <!doctype>, <html> and <head>.
writeFileSync(resolve(root, 'dist', 'rachis.html'), body);

// Standalone target: the same payload in a complete document, openable straight off disk.
writeFileSync(
  resolve(root, 'dist', 'standalone.html'),
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${body}\n</body>\n</html>\n`,
);

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
console.log(`bundled ${order_count(js)} modules → dist/rachis.html (${kb(body.length)})`);
console.log(`                              → dist/standalone.html`);

function order_count(code) {
  return (code.match(/^__m\[/gm) || []).length;
}
