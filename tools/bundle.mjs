// Inline the whole game into a single self-contained HTML file.
//
// The source is plain ES modules, which browsers refuse to load over file://.
// This walks the import graph from src/main.js, rewrites each module into a
// factory in a tiny registry, and emits:
//   dist/wildbound.html  — a complete document you can just open
//   dist/artifact.html   — body-level content only, for embedding
//
// No dependencies; the transform only has to handle the import/export forms
// this codebase actually uses.
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join, normalize, relative, resolve } from 'path';

const ROOT = process.cwd();
const ENTRY = 'src/main.js';

const IMPORT_NAMED = /import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?/g;
const IMPORT_STAR = /import\s+\*\s+as\s+(\w+)\s+from\s*['"]([^'"]+)['"];?/g;
const IMPORT_BARE = /import\s+['"]([^'"]+)['"];?/g;

function keyFor(path) {
  return relative(ROOT, resolve(path)).split('\\').join('/');
}

async function collect(entry, modules = new Map()) {
  const key = keyFor(entry);
  if (modules.has(key)) return modules;
  const src = await readFile(entry, 'utf8');
  modules.set(key, { src, deps: [] });
  const dir = dirname(entry);
  const specs = new Set();
  for (const re of [IMPORT_NAMED, IMPORT_STAR]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) specs.add(m[2]);
  }
  IMPORT_BARE.lastIndex = 0;
  let m;
  while ((m = IMPORT_BARE.exec(src))) specs.add(m[1]);
  for (const spec of specs) {
    if (!spec.startsWith('.')) throw new Error(`bare import "${spec}" in ${key}`);
    const dep = normalize(join(dir, spec));
    modules.get(key).deps.push({ spec, key: keyFor(dep) });
    await collect(dep, modules);
  }
  return modules;
}

function transform(src, deps) {
  const head = [];
  const exports = new Set();
  const resolveSpec = (spec) => deps.find((d) => d.spec === spec)?.key ?? spec;

  let out = src.replace(IMPORT_NAMED, (_, names, spec) => {
    const clean = names
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => (n.includes(' as ') ? n.replace(/\s+as\s+/, ': ') : n))
      .join(', ');
    head.push(`const { ${clean} } = __req(${JSON.stringify(resolveSpec(spec))});`);
    return '';
  });
  out = out.replace(IMPORT_STAR, (_, ns, spec) => {
    head.push(`const ${ns} = __req(${JSON.stringify(resolveSpec(spec))});`);
    return '';
  });
  out = out.replace(IMPORT_BARE, (_, spec) => {
    head.push(`__req(${JSON.stringify(resolveSpec(spec))});`);
    return '';
  });

  // export declarations -> plain declarations, remembering the names
  out = out.replace(/export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)/g, (_, kind, name) => {
    exports.add(name);
    return `${kind} ${name}`;
  });
  out = out.replace(/export\s+(async\s+)?function\s+([A-Za-z_$][\w$]*)/g, (_, asy, name) => {
    exports.add(name);
    return `${asy || ''}function ${name}`;
  });
  out = out.replace(/export\s+class\s+([A-Za-z_$][\w$]*)/g, (_, name) => {
    exports.add(name);
    return `class ${name}`;
  });
  // re-export lists: export { a, b as c };
  out = out.replace(/export\s*\{([^}]*)\}\s*;?/g, (_, names) => {
    for (const n of names.split(',')) {
      const t = n.trim();
      if (!t) continue;
      const [local, alias] = t.split(/\s+as\s+/).map((x) => x.trim());
      exports.add(alias || local);
      if (alias && alias !== local) head.push(`/* alias */ const ${alias} = ${local};`);
    }
    return '';
  });

  if (/export\s+default/.test(out)) throw new Error('default exports are not supported');

  const tail = exports.size
    ? `\n__exp(${JSON.stringify([...exports])}, () => ({ ${[...exports].join(', ')} }));\n`
    : '';
  return `${head.join('\n')}\n${out}${tail}`;
}

const RUNTIME = `
(function () {
  'use strict';
  var __defs = {}, __cache = {};
  function __register(id, fn) { __defs[id] = fn; }
  function __req(id) {
    if (__cache[id]) return __cache[id].exports;
    var def = __defs[id];
    if (!def) throw new Error('module not bundled: ' + id);
    var mod = __cache[id] = { exports: {} };
    def(mod.exports, __req, function (names, get) {
      Object.defineProperties(mod.exports, names.reduce(function (acc, n) {
        acc[n] = { enumerable: true, get: function () { return get()[n]; } };
        return acc;
      }, {}));
    });
    return mod.exports;
  }
  __MODULES__
  __req(__ENTRY__);
})();
`;

async function build() {
  const modules = await collect(ENTRY);
  const parts = [];
  for (const [key, mod] of modules) {
    const body = transform(mod.src, mod.deps);
    parts.push(
      `__register(${JSON.stringify(key)}, function (exports, __req, __exp) {\n${body}\n});`,
    );
  }
  // NB: replacer functions, not strings — the font data contains `$'` and
  // friends, which String.replace would treat as substitution patterns.
  const js = RUNTIME
    .replace('__MODULES__', () => parts.join('\n'))
    .replace('__ENTRY__', () => JSON.stringify(keyFor(ENTRY)));

  const html = await readFile('index.html', 'utf8');
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
  const style = styleMatch ? styleMatch[1] : '';
  const body = (bodyMatch ? bodyMatch[1] : '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .trim();

  await mkdir('dist', { recursive: true });

  const standalone = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#101018">
<title>WILDBOUND — Amber Edition</title>
<style>${style}</style>
</head>
<body>
${body}
<script>${js}</script>
</body>
</html>
`;
  await writeFile('dist/wildbound.html', standalone);

  const embedded = `<title>WILDBOUND — Amber Edition</title>
<style>${style}</style>
${body}
<script>${js}</script>
`;
  await writeFile('dist/artifact.html', embedded);

  console.log(`bundled ${modules.size} modules -> dist/wildbound.html (${(standalone.length / 1024).toFixed(0)} KB)`);
}

build().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
