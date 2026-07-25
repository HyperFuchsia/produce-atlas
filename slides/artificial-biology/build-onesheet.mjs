#!/usr/bin/env node
/**
 * Builds onesheet.html — the whole piece on one page.
 *
 * Reads index.html as the single source of truth: every plate's duration,
 * world, act, on-screen text and voiceover line is extracted from the live DOM,
 * so the one-sheet cannot drift out of sync with the sequence. Re-run after
 * editing any plate.
 *
 *   node build-onesheet.mjs [--chrome /path/to/chrome]
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i === -1 ? d : argv[i + 1]; };

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC  = path.join(HERE, 'index.html');
const OUT  = path.join(HERE, 'onesheet.html');

/* ---------- pull the plate data out of the real page ---------- */
const browser = await chromium.launch({ executablePath: arg('chrome', process.env.CHROME_PATH) });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + SRC, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

const plates = await page.evaluate(() => {
  // <br> carries meaning in the source (it separates sentences and slab lines).
  // textContent drops it, which would run "table.Medicine" together — so map it
  // to a newline and let the renderer decide whether to keep or flatten it.
  const norm = s => (s || '')
    .replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();
  const brs = c => { c.querySelectorAll('br').forEach(b => b.replaceWith(document.createTextNode('\n'))); return c; };
  const deep = el => norm(brs(el.cloneNode(true)).textContent);
  const minus = (el, sel) => {
    const c = el.cloneNode(true);
    c.querySelectorAll(sel).forEach(n => n.remove());
    return norm(brs(c).textContent);
  };
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  return Array.from(document.querySelectorAll('.scene')).map((sc, i) => {
    const pick = sel => { const e = sc.querySelector(sel); return e ? deep(e) : null; };
    const rows = [];
    sc.querySelectorAll('.stack li').forEach(li =>
      rows.push({ label: clean(li.querySelector('.ix')?.textContent), text: minus(li, '.ix') }));
    sc.querySelectorAll('.slugs li').forEach(li =>
      rows.push({ label: clean(li.querySelector('em')?.textContent), text: minus(li, 'em') }));
    sc.querySelectorAll('.spines li').forEach(li =>
      rows.push({ label: null, text: clean(li.textContent) }));
    sc.querySelectorAll('.ledger').forEach(dl => {
      const dts = [...dl.querySelectorAll('dt')], dds = [...dl.querySelectorAll('dd')];
      dds.forEach((dd, k) => rows.push({
        label: clean(dts[k]?.textContent), text: minus(dd, 'small'),
        sub: clean(dd.querySelector('small')?.textContent) || null }));
    });
    return {
      n: i + 1, dur: parseInt(sc.dataset.dur, 10),
      world: sc.dataset.world, art: sc.dataset.art, act: sc.dataset.act,
      vo: clean(sc.dataset.vo),
      kicker: pick('.kicker'),
      headline: pick('.slab') || pick('.d1') || pick('.d2') || pick('.d3'),
      quote: pick('.quo'), attrib: pick('.attrib'),
      specimen: pick('.specimen'), formula: pick('.formula'),
      lede: pick('.lede'), note: pick('.note'), rows,
    };
  });
});
await browser.close();

let t = 0;
plates.forEach(p => { p.start = t; t += p.dur; });
const TOTAL = t;

const acts = [];
plates.forEach(p => {
  let a = acts.find(x => x.name === p.act);
  if (!a) acts.push(a = { name: p.act, dur: 0, from: p.n, to: p.n, start: p.start, plates: [] });
  a.dur += p.dur; a.to = p.n; a.plates.push(p);
});

const worldMs = plates.reduce((a, p) => (a[p.world] = (a[p.world] || 0) + p.dur, a), {});

/* ---------- reuse the sequence's embedded typefaces ---------- */
const src = fs.readFileSync(SRC, 'utf8');
const faces = src.match(/@font-face\{[^}]*\}/g);
if (!faces || faces.length < 3) {
  console.error('could not find the embedded @font-face rules in index.html');
  process.exit(1);
}

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const flat = s => String(s ?? '').replace(/\n/g, ' ');   // display lines read as one line
const tc  = ms => `${String(Math.floor(ms / 60000)).padStart(2,'0')}:${String(Math.round(ms % 60000 / 1000)).padStart(2,'0')}`;
const secs = ms => (ms / 1000).toFixed(1).replace(/\.0$/, '') + 's';
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pct = ms => (ms / TOTAL * 100);

/* the on-screen text of a plate, as a compact list of lines */
function onScreen(p) {
  const out = [];
  if (p.kicker)   out.push(['kicker', flat(p.kicker)]);
  if (p.specimen) out.push(['specimen', flat(p.specimen)]);
  if (p.headline) out.push(['display', flat(p.headline)]);
  if (p.formula)  out.push(['formula', flat(p.formula)]);
  if (p.quote)    out.push(['quote', '“' + flat(p.quote).replace(/^[“"]|[”"]$/g, '') + '”']);
  if (p.attrib)   out.push(['attrib', flat(p.attrib)]);
  p.rows.forEach(r => out.push(['row', (r.label ? r.label + '  ' : '') + flat(r.text) + (r.sub ? '  — ' + flat(r.sub) : '')]));
  if (p.lede)     out.push(['lede', p.lede]);   // newlines kept, rendered pre-line
  if (p.note)     out.push(['note', p.note]);
  return out;
}

const MOVES = [
  ['The name was a flag, not a description.',
   `August 1955. Four researchers — McCarthy, Minsky, Rochester and Shannon — need a title for a
    summer workshop at Dartmouth. The accurate options were already on the table: cybernetics,
    automata studies, complex information processing. McCarthy rejected all of them and coined a
    phrase that named the <em>destination</em> instead of the method.`],
  ['Both words are wrong.',
   `Everywhere else, “artificial” means a convincing substitute for the real thing — artificial
    flavour, turf, sweetener. But nothing here is imitation: the arithmetic is real, the output is
    real. And “intelligence” is the single most contested term in cognitive science, argued over for
    a century without resolution. We used it as a product category.`],
  ['Run the same decision on chemistry and it falls apart.',
   `In 1828 Friedrich Wöhler made urea from an inorganic salt, breaking vitalism — a bigger
    conceptual shock than anything a chatbot has managed. Chemistry called that <em>organic
    synthesis</em>. Had it instead named the whole field <em>Artificial Biology</em>, every result
    would have become a metaphysics debate — and the category error would be plain, because biology
    is a study, and you cannot manufacture a study.`],
  ['The goalposts move identically in both worlds.',
   `In AB-world, insulin from engineered yeast is “just fermentation,” PCR “just enzymes,” mRNA
    vaccines “just chemistry.” In ours, chess is “just tree search,” handwriting “just pattern
    matching,” translation and autocomplete “just software.” Nothing is ever AI once it works. No
    other discipline disowns its own results.`],
  ['Every other field named the mechanism.',
   `Aviation never called itself artificial flight; it named lift, thrust, aerofoil. Nobody built an
    artificial fish — they built a submarine, and “swim” stopped mattering. When biology really did
    start assembling living systems from parts, it chose <em>synthetic biology</em>: named for the
    method, not the ambition. Good names describe a mechanism. Bad names describe an ambition.`],
];

const SOURCES = [
  `McCarthy, Minsky, Rochester &amp; Shannon, <i>A Proposal for the Dartmouth Summer Research Project on Artificial Intelligence</i>, 31 August 1955 — origin of the term, and the “every aspect of learning” sentence.`,
  `McCarthy’s stated reasons for coining a new term — distancing the work from cybernetics and from Norbert Wiener — are recorded in later interviews and in Pamela McCorduck, <i>Machines Who Think</i>.`,
  `Arthur Samuel, “Some Studies in Machine Learning Using the Game of Checkers,” <i>IBM Journal of Research and Development</i>, 1959.`,
  `Friedrich Wöhler to Jöns Jacob Berzelius, 1828, on synthesising urea from ammonium cyanate.`,
  `Edsger W. Dijkstra, “The threats to computing science” (EWD898), 1984 — the submarine line.`,
  `“AI is whatever hasn’t been done yet” is commonly attributed to Larry Tesler, and is widely quoted in the misworded form “intelligence is whatever machines haven’t done yet.” Marked as attributed on plate 19.`,
  `Recombinant human insulin: Genentech, 1978; approved as Humulin, 1982.`,
];

/* ---------- the spine: one proportional bar, 30 plate segments ----------
   Act labels sit above narrow segments, so they carry a short form; the full
   name lives in the section heading below and in every segment's tooltip. */
const SHORT = {
  'Cold open': 'Open',
  'I — Provenance': 'I  Provenance',
  'II — The two words': 'II  Two words',
  'III — The analogy': 'III  Analogy',
  'IV — What everyone else did': 'IV  Other fields',
  'V — What to say instead': 'V  Instead',
  'End card': 'End',
};
const short = n => SHORT[n] || n;

const spine = acts.map(a => `
  <div class="act" style="flex:${a.dur} 1 0" data-jump="${slug(a.name)}" title="${esc(a.name)}">
    <div class="act-h">
      <span class="act-n">${esc(short(a.name))}</span>
      <span class="act-m">${a.from === a.to ? a.from : a.from + '–' + a.to} · ${secs(a.dur)}</span>
    </div>
    <div class="act-seg">
      ${a.plates.map(p => `<button type="button" class="pl w-${p.world}" style="flex:${p.dur} 1 0"
          data-go="p${p.n}"
          data-tip="Plate ${String(p.n).padStart(2,'0')} · ${tc(p.start)} · ${secs(p.dur)} · ${p.world} · ${esc(a.name)}"
          data-tip2="${esc(flat(p.headline || p.quote || p.kicker || p.specimen || ''))}"
          aria-label="Plate ${p.n}, ${tc(p.start)}, ${secs(p.dur)}, ${p.world} world, ${esc(a.name)}"></button>`).join('')}
    </div>
  </div>`).join('');

const plateRows = acts.map(a => `
  <section class="act-block" id="${slug(a.name)}">
    <h3 class="act-title"><span>${esc(a.name)}</span><em>${a.from === a.to ? 'plate ' + a.from : 'plates ' + a.from + '–' + a.to} · ${secs(a.dur)}</em></h3>
    ${a.plates.map(p => `
    <article class="plate w-${p.world}" id="p${p.n}">
      <div class="p-meta">
        <span class="p-n">${String(p.n).padStart(2,'0')}</span>
        <span class="p-tc">${tc(p.start)}</span>
        <span class="p-dur">${secs(p.dur)}</span>
        <span class="p-world"><i></i>${p.world}</span>
        <span class="p-art">${esc(p.art)}</span>
      </div>
      <div class="p-screen">
        ${onScreen(p).map(([k, v]) => `<p class="l-${k}">${esc(v)}</p>`).join('')}
      </div>
      <div class="p-vo"><span class="vo-tag">VO</span><p>${esc(p.vo)}</p></div>
    </article>`).join('')}
  </section>`).join('');

const hinge = [17, 18].map(n => {
  const p = plates[n - 1];
  return `<div class="hinge-col w-${p.world}">
    <span class="hinge-k">Plate ${n} · ${p.world === 'life' ? 'the imagined field' : 'ours'}</span>
    <p class="hinge-t">${esc(p.kicker)}</p>
    <ul>${p.rows.map(r => `<li><span>${esc(r.label)}</span>${esc(r.text)}</li>`).join('')}</ul>
    <p class="hinge-n">${esc(p.note)}</p>
  </div>`;
}).join('');

/* ---------- page ---------- */
const html = `<title>A Naming Error — the whole piece on one page</title>

<style>
${faces.slice(0, 3).join('\n')}

/* ============================================================
   One-sheet companion to the sequence. Same house identity, but
   a document rather than a film frame — so unlike index.html it
   is fully theme-aware.

   Chart marks are NOT the identity accents: they are the nearest
   steps that pass the categorical checks (lightness band, chroma
   floor, CVD separation, contrast) against each mode's surface.
   Identity violet #8B7FEE sits outside the light-mode contrast
   floor, and identity orange #E4783C sits above the dark-mode
   lightness ceiling of 0.67, so each mode gets its own snapped
   pair. Worst adjacent CVD separation is dE 26.2 (protan).
   ============================================================ */

:root{
  --bg:#F3F2F6;
  --surface:#FFFFFF;
  --surface-2:#EAE9F0;
  --ink:#14141A;
  --ink-2:#43454F;
  --ink-3:#71737F;
  --rule:rgba(20,20,26,.13);
  --machine:#6B5FD0;      /* validated light-mode steps */
  --life:#C25A1E;
  --rubine:#B3253F;
  --shadow:0 1px 2px rgba(20,20,26,.05), 0 8px 24px rgba(20,20,26,.06);

  --display:"Bodoni Moda",Didot,"Bodoni 72","Times New Roman",Times,serif;
  --mono:"Courier Prime","Courier New",Courier,monospace;
}
@media (prefers-color-scheme: dark){
  :root{
    --bg:#0B0C10; --surface:#111219; --surface-2:#191B23;
    --ink:#EDE7DA; --ink-2:#A8A296; --ink-3:#767A85;
    --rule:rgba(237,231,218,.14);
    --machine:#8B7FEE; --life:#D4723A;   /* validated dark-mode steps */
    --rubine:#D63E5C;
    --shadow:none;
  }
}
:root[data-theme="dark"]{
  --bg:#0B0C10; --surface:#111219; --surface-2:#191B23;
  --ink:#EDE7DA; --ink-2:#A8A296; --ink-3:#767A85;
  --rule:rgba(237,231,218,.14);
  --machine:#8B7FEE; --life:#D4723A;
  --rubine:#D63E5C;
  --shadow:none;
}
:root[data-theme="light"]{
  --bg:#F3F2F6; --surface:#FFFFFF; --surface-2:#EAE9F0;
  --ink:#14141A; --ink-2:#43454F; --ink-3:#71737F;
  --rule:rgba(20,20,26,.13);
  --machine:#6B5FD0; --life:#C25A1E;
  --rubine:#B3253F;
  --shadow:0 1px 2px rgba(20,20,26,.05), 0 8px 24px rgba(20,20,26,.06);
}

*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0; background:var(--bg); color:var(--ink);
  font-family:var(--mono); font-size:15px; line-height:1.6;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1180px; margin:0 auto; padding:0 28px 120px}

/* ---------- masthead ---------- */
.mast{padding:76px 0 30px; border-bottom:1px solid var(--rule)}
.eyebrow{
  font-size:11.5px; letter-spacing:.3em; text-transform:uppercase; color:var(--ink-3);
  display:flex; align-items:center; gap:14px; margin:0 0 26px;
}
.eyebrow::after{content:""; flex:1; height:1px; background:var(--rule)}
h1{
  font-family:var(--display); font-weight:400; font-size:clamp(44px,7.4vw,92px);
  line-height:1.02; letter-spacing:-.015em; margin:0 0 22px; text-wrap:balance;
  font-variation-settings:"opsz" 72;
}
/* low opsz keeps the strokes thick enough to survive at this size */
.thesis{
  font-family:var(--display); font-size:clamp(19px,2.3vw,26px); line-height:1.5;
  color:var(--ink-2); max-width:60ch; margin:0 0 34px; font-variation-settings:"opsz" 12;
}
.thesis b{color:var(--ink); font-weight:400; font-style:italic}

.stats{display:flex; flex-wrap:wrap; gap:10px}
.stat{
  background:var(--surface); border:1px solid var(--rule); box-shadow:var(--shadow);
  padding:14px 20px; min-width:112px;
}
.stat b{
  display:block; font-family:var(--display); font-size:34px; line-height:1;
  font-weight:400; letter-spacing:-.01em; font-variant-numeric:tabular-nums;
}
.stat span{display:block; font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--ink-3); margin-top:8px}

/* ---------- section furniture ---------- */
section{margin-top:66px}
h2{
  font-family:var(--display); font-weight:400; font-size:clamp(27px,3.6vw,38px);
  letter-spacing:-.012em; margin:0 0 8px; font-variation-settings:"opsz" 36;
}
.sub{color:var(--ink-3); font-size:13px; margin:0 0 26px; max-width:70ch}

/* ---------- the spine ---------- */
.legend{display:flex; gap:20px; align-items:center; margin:0 0 16px; font-size:11.5px;
  letter-spacing:.14em; text-transform:uppercase; color:var(--ink-2); flex-wrap:wrap}
.legend i{width:11px; height:11px; display:inline-block; margin-right:8px; border-radius:2px; vertical-align:-1px}
.legend .m i{background:var(--machine)} .legend .l i{background:var(--life)}

.spine{display:flex; gap:12px; align-items:flex-end; margin-bottom:10px}
.act{min-width:0}
.act-h{margin-bottom:9px; min-width:0}
.act-n{display:block; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase;
  color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.act-m{display:block; font-size:10.5px; color:var(--ink-3); white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis; font-variant-numeric:tabular-nums}
.act-seg{display:flex; gap:2px; height:46px}
.pl{
  border:0; padding:0; cursor:pointer; min-width:2px;
  border-radius:1px; transition:filter .15s, transform .15s;
}
/* rounded data-ends anchored to the run, not to every segment */
.act:first-child .pl:first-child{border-radius:4px 1px 1px 4px}
.act:last-child  .pl:last-child {border-radius:1px 4px 4px 1px}
.pl.w-machine{background:var(--machine)}
.pl.w-life{background:var(--life)}
.pl:hover,.pl:focus-visible{filter:brightness(1.18); transform:translateY(-3px); outline:none}
.pl:focus-visible{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--ink)}

.axis{display:flex; justify-content:space-between; font-size:10.5px; color:var(--ink-3);
  font-variant-numeric:tabular-nums; border-top:1px solid var(--rule); padding-top:7px}

#tip{
  position:fixed; z-index:60; pointer-events:none; opacity:0; transform:translateY(4px);
  transition:opacity .12s, transform .12s; max-width:330px;
  background:var(--ink); color:var(--bg); padding:10px 13px; font-size:12px; line-height:1.45;
  box-shadow:0 8px 30px rgba(0,0,0,.3);
}
#tip.on{opacity:1; transform:none}
#tip b{display:block; font-size:10.5px; letter-spacing:.16em; text-transform:uppercase; opacity:.72; margin-bottom:5px}

/* ---------- the five moves ---------- */
.moves{display:grid; gap:1px; background:var(--rule); border:1px solid var(--rule)}
.move{background:var(--bg); padding:26px 28px; display:grid; grid-template-columns:56px 1fr; gap:22px}
.move-n{font-family:var(--display); font-size:40px; line-height:.9; color:var(--ink-3); font-variant-numeric:tabular-nums}
.move h3{font-family:var(--display); font-weight:400; font-size:23px; line-height:1.25;
  margin:0 0 10px; letter-spacing:-.008em; font-variation-settings:"opsz" 18}
.move p{margin:0; color:var(--ink-2); font-size:14px; line-height:1.68; max-width:74ch}
.move em{font-style:italic; color:var(--ink)}

/* ---------- hinge ---------- */
.hinge{display:grid; grid-template-columns:1fr 1fr; gap:18px}
.hinge-col{border:1px solid var(--rule); background:var(--surface); box-shadow:var(--shadow); padding:24px 26px}
.hinge-col.w-life{border-top:3px solid var(--life)}
.hinge-col.w-machine{border-top:3px solid var(--machine)}
.hinge-k{font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--ink-3)}
.hinge-t{font-family:var(--display); font-size:21px; margin:10px 0 18px; font-variation-settings:"opsz" 16}
.hinge-col ul{list-style:none; margin:0 0 18px; padding:0; display:flex; flex-direction:column; gap:11px}
.hinge-col li{font-size:14px; color:var(--ink-2); display:flex; gap:14px}
.hinge-col li span{color:var(--ink-3); font-size:11px; min-width:5.4ch; padding-top:3px; font-variant-numeric:tabular-nums}
.hinge-n{margin:0; font-size:14px; color:var(--ink); border-top:1px solid var(--rule); padding-top:14px}

/* ---------- plate table ---------- */
.act-block{margin-top:44px; scroll-margin-top:20px}
.act-title{
  display:flex; align-items:baseline; gap:16px; margin:0 0 16px;
  font-size:11.5px; letter-spacing:.22em; text-transform:uppercase; font-weight:400;
  position:sticky; top:0; background:var(--bg); padding:12px 0; z-index:5;
  border-bottom:1px solid var(--rule);
}
.act-title em{font-style:normal; color:var(--ink-3); font-size:10.5px; letter-spacing:.14em}

.plate{
  display:grid; grid-template-columns:186px minmax(0,1fr) minmax(0,1.05fr);
  gap:26px; padding:20px 0; border-bottom:1px solid var(--rule); scroll-margin-top:70px;
}
.plate:target{background:var(--surface-2); box-shadow:0 0 0 12px var(--surface-2)}
.p-meta{display:flex; flex-direction:column; gap:5px; font-size:11px; color:var(--ink-3)}
.p-n{font-family:var(--display); font-size:31px; line-height:1; color:var(--ink); font-variant-numeric:tabular-nums}
.p-tc{font-variant-numeric:tabular-nums; color:var(--ink-2); letter-spacing:.08em}
.p-dur,.p-art{font-variant-numeric:tabular-nums}
.p-art{opacity:.75}
.p-world{display:flex; align-items:center; gap:7px; text-transform:uppercase; letter-spacing:.14em; font-size:10px}
.p-world i{width:9px; height:9px; border-radius:2px; display:inline-block}
.w-machine .p-world i{background:var(--machine)} .w-machine .p-world{color:var(--machine)}
.w-life .p-world i{background:var(--life)}       .w-life .p-world{color:var(--life)}

.p-screen p{margin:0 0 7px}
.l-display{font-family:var(--display); font-size:22px; line-height:1.24; color:var(--ink);
  letter-spacing:-.008em; font-variation-settings:"opsz" 18}
.l-quote{font-family:var(--display); font-style:italic; font-size:18px; line-height:1.4; color:var(--ink)}
.l-specimen{font-size:19px; color:var(--ink); text-decoration:line-through;
  text-decoration-color:var(--rubine); text-decoration-thickness:2px}
.l-formula{font-size:17px; color:var(--ink)}
.l-kicker{font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--ink-3)}
.l-attrib{font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-3)}
.l-row{font-size:13.5px; color:var(--ink-2); padding-left:14px; border-left:2px solid var(--rule)}
.l-lede,.l-note{font-size:13.5px; color:var(--ink-2); white-space:pre-line}

.p-vo{display:grid; grid-template-columns:30px 1fr; gap:12px; align-items:start}
.vo-tag{font-size:9.5px; letter-spacing:.16em; color:var(--ink-3); border:1px solid var(--rule);
  padding:3px 0; text-align:center; margin-top:3px}
/* Courier, not the didone. Bodoni Moda's hairlines fall below one device pixel
   at body sizes — an em dash is a pure horizontal hairline and disappears
   outright, and the VO lines are full of them. The display face stays on the
   large registers only, which is the same rule the sequence itself follows. */
.p-vo p{margin:0; font-size:13.5px; line-height:1.7; color:var(--ink-2); font-family:var(--mono)}

/* ---------- reference blocks ---------- */
.grid2{display:grid; grid-template-columns:repeat(auto-fit,minmax(290px,1fr)); gap:18px}
.card{border:1px solid var(--rule); background:var(--surface); box-shadow:var(--shadow); padding:22px 24px}
.card h3{font-size:11px; letter-spacing:.22em; text-transform:uppercase; color:var(--ink-3);
  margin:0 0 16px; font-weight:400}
.sw{display:flex; align-items:center; gap:13px; padding:8px 0; border-bottom:1px solid var(--rule); font-size:12.5px}
.sw:last-child{border-bottom:0}
.sw i{width:26px; height:26px; flex:none; border-radius:3px; border:1px solid var(--rule)}
.sw b{font-weight:400; color:var(--ink)}
.sw span{color:var(--ink-3); margin-left:auto; font-variant-numeric:tabular-nums; font-size:11px}
.kv{display:grid; grid-template-columns:auto 1fr; gap:9px 16px; font-size:12.5px; color:var(--ink-2)}
.kv dt{color:var(--ink-3); font-size:11px; letter-spacing:.1em; text-transform:uppercase; padding-top:2px}
.kv dd{margin:0}
kbd{font:inherit; font-size:11px; border:1px solid var(--rule); padding:1px 6px; color:var(--ink)}
pre{margin:0; overflow-x:auto; background:var(--surface-2); padding:13px 15px; font-size:12px;
  border:1px solid var(--rule); color:var(--ink-2)}
ol.src{margin:0; padding-left:20px; display:flex; flex-direction:column; gap:11px}
ol.src li{font-size:12.5px; line-height:1.62; color:var(--ink-2)}
ol.src i{font-style:italic}

footer{margin-top:76px; padding-top:22px; border-top:1px solid var(--rule);
  font-size:11px; color:var(--ink-3); display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap}

@media (max-width:900px){
  .plate{grid-template-columns:1fr; gap:14px}
  .p-meta{flex-direction:row; align-items:baseline; gap:14px; flex-wrap:wrap}
  .hinge{grid-template-columns:1fr}
  .spine{flex-wrap:wrap; gap:18px}
  .act{flex:1 1 100% !important}
  .move{grid-template-columns:1fr; gap:8px}
  .move-n{font-size:28px}
}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .pl,#tip{transition:none}
}
</style>

<div class="wrap">

  <header class="mast">
    <p class="eyebrow">Production one-sheet · ${plates.length} plates · ${tc(TOTAL)}</p>
    <h1>A Naming Error</h1>
    <p class="thesis">Every plate, cue and source in the sequence, on one page. The argument:
      <b>“artificial intelligence” names an ambition, not a mechanism</b> — shown by running the
      same naming decision on chemistry and watching it collapse into <b>Artificial Biology</b>.</p>
    <div class="stats">
      <div class="stat"><b>${plates.length}</b><span>Plates</span></div>
      <div class="stat"><b>${tc(TOTAL)}</b><span>Runtime</span></div>
      <div class="stat"><b>${acts.length}</b><span>Acts</span></div>
      <div class="stat"><b>${Math.round(worldMs.machine / TOTAL * 100)}<small style="font-size:18px">%</small></b><span>Machine world</span></div>
      <div class="stat"><b>${Math.round(worldMs.life / TOTAL * 100)}<small style="font-size:18px">%</small></b><span>Biology world</span></div>
    </div>
  </header>

  <section>
    <h2>The spine</h2>
    <p class="sub">Every plate, width proportional to its time on screen, coloured by which world it
      sits in. Hover a segment for its cue; click to jump to that plate below.</p>
    <div class="legend">
      <span class="m"><i></i>Machine world — ${secs(worldMs.machine)}</span>
      <span class="l"><i></i>Biology world — ${secs(worldMs.life)}</span>
    </div>
    <div class="spine">${spine}</div>
    <div class="axis"><span>00:00</span><span>${tc(TOTAL)}</span></div>
  </section>

  <section>
    <h2>The argument in five moves</h2>
    <p class="sub">The logic of the piece, independent of the plates.</p>
    <div class="moves">
      ${MOVES.map(([h, b], i) => `<div class="move">
        <div class="move-n">${String(i + 1).padStart(2, '0')}</div>
        <div><h3>${h}</h3><p>${b.replace(/\s+/g, ' ').trim()}</p></div>
      </div>`).join('')}
    </div>
  </section>

  <section>
    <h2>The hinge</h2>
    <p class="sub">Plates 17 and 18 run the identical layout twice — once in the imagined field, once
      in ours. Repeating the form rather than asserting the claim is what makes the goalpost-moving
      read as observed behaviour.</p>
    <div class="hinge">${hinge}</div>
  </section>

  <section>
    <h2>Every plate</h2>
    <p class="sub">On-screen text and the voiceover line for all ${plates.length} plates, with entry
      timecode and duration. This doubles as the table view of the chart above.</p>
    ${plateRows}
  </section>

  <section>
    <h2>Reference</h2>
    <div class="grid2">
      <div class="card">
        <h3>Palette</h3>
        <div class="sw"><i style="background:#07080A"></i><b>Ink</b> ground<span>#07080A</span></div>
        <div class="sw"><i style="background:#EDE7DA"></i><b>Bone</b> marks<span>#EDE7DA</span></div>
        <div class="sw"><i style="background:#8B7FEE"></i><b>Duplicator violet</b> machine<span>#8B7FEE</span></div>
        <div class="sw"><i style="background:#E4783C"></i><b>Dichromate orange</b> biology<span>#E4783C</span></div>
        <div class="sw"><i style="background:#D63E5C"></i><b>Rubine</b> corrections only<span>#D63E5C</span></div>
      </div>
      <div class="card">
        <h3>Type</h3>
        <dl class="kv">
          <dt>Display</dt><dd style="font-family:var(--display);font-size:16px">Bodoni Moda — every statement and pull quote</dd>
          <dt>Annotation</dt><dd>Courier Prime — every label, plate number and list</dd>
          <dt>In frame</dt><dd>No neutral sans anywhere, by design</dd>
          <dt>Embedded</dt><dd>Both faces inline as base64 woff2 (OFL)</dd>
        </dl>
      </div>
      <div class="card">
        <h3>Canvas art keys</h3>
        <dl class="kv">
          ${[...new Set(plates.map(p => p.art))].map(a => {
            const ns = plates.filter(p => p.art === a).map(p => p.n);
            return `<dt>${esc(a)}</dt><dd>plates ${ns.join(', ')}</dd>`;
          }).join('')}
        </dl>
      </div>
      <div class="card">
        <h3>Playback &amp; capture</h3>
        <dl class="kv">
          <dt>Controls</dt><dd>On-screen bar, or <kbd>space</kbd> <kbd>←</kbd> <kbd>→</kbd> <kbd>r</kbd> <kbd>f</kbd> <kbd>c</kbd> <kbd>s</kbd> <kbd>g</kbd></dd>
          <dt>Clean</dt><dd><kbd>c</kbd> strips plate number, rail, timecode and bar</dd>
          <dt>Stage</dt><dd>Authored 1920×1080, scales crisply to 4K</dd>
        </dl>
        <pre>node render-4k.mjs   # true 3840×2160 master</pre>
      </div>
    </div>
  </section>

  <section>
    <h2>Sources</h2>
    <p class="sub">Every factual claim in the sequence.</p>
    <div class="card"><ol class="src">${SOURCES.map(s => `<li>${s}</li>`).join('')}</ol></div>
  </section>

  <footer>
    <span>Generated from index.html — re-run <code>node build-onesheet.mjs</code> after editing any plate.</span>
    <span>${plates.length} plates · ${tc(TOTAL)} · ${acts.length} acts</span>
  </footer>
</div>

<div id="tip" role="status" aria-live="polite"></div>

<script>
(() => {
  const tip = document.getElementById('tip');
  let hide = null;
  const show = (el, e) => {
    clearTimeout(hide);
    tip.innerHTML = '<b>' + el.dataset.tip + '</b>' + (el.dataset.tip2 || '');
    tip.classList.add('on');
    const r = tip.getBoundingClientRect();
    const x = Math.min(Math.max(12, (e ? e.clientX : el.getBoundingClientRect().left) - r.width / 2),
                       innerWidth - r.width - 12);
    const b = el.getBoundingClientRect();
    const above = b.top > r.height + 18;
    tip.style.left = x + 'px';
    tip.style.top = (above ? b.top - r.height - 12 : b.bottom + 12) + 'px';
  };
  document.querySelectorAll('.pl').forEach(el => {
    el.addEventListener('pointerenter', e => show(el, e));
    el.addEventListener('pointermove',  e => show(el, e));
    el.addEventListener('focus',        () => show(el, null));
    el.addEventListener('pointerleave', () => { hide = setTimeout(() => tip.classList.remove('on'), 60); });
    el.addEventListener('blur',         () => tip.classList.remove('on'));
    el.addEventListener('click', () => {
      const t = document.getElementById(el.dataset.go);
      if (t) { history.replaceState(null, '', '#' + el.dataset.go); t.scrollIntoView({ block:'center' }); }
    });
  });
  document.querySelectorAll('.act-h').forEach(h => {
    h.style.cursor = 'pointer';
    h.addEventListener('click', () => {
      const t = document.getElementById(h.parentElement.dataset.jump);
      if (t) t.scrollIntoView({ block:'start' });
    });
  });
})();
</script>
`;

fs.writeFileSync(OUT, html);
console.log(`onesheet.html written — ${plates.length} plates, ${tc(TOTAL)}, ${acts.length} acts, ${(html.length/1024).toFixed(0)}KB`);
