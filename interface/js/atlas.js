/* ==========================================================================
   PRODUCE ATLAS — APPLICATION
   --------------------------------------------------------------------------
   Wires the dataset to the instrument. The interface system knows nothing
   about botany; this file is the only place the two meet.
   ========================================================================== */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const app = {
  taxon: null,
  channel: 'viridian',
  filter: '',
  globe: null,
  log: null
};

/* -------------------------------------------------------------------------
   REGISTER — the scrolling taxon index
   ------------------------------------------------------------------------- */
function renderIndex() {
  const q = app.filter.trim().toLowerCase();
  const rows = TAXA.filter(t =>
    !q ||
    t.common.toLowerCase().includes(q) ||
    t.sci.toLowerCase().includes(q) ||
    t.family.toLowerCase().includes(q) ||
    t.origin.place.toLowerCase().includes(q)
  );

  const list = $('#register');
  list.innerHTML = rows.map((t, i) => `
    <button class="index__row" role="option" data-id="${t.id}"
            aria-selected="${app.taxon && app.taxon.id === t.id}">
      <span class="index__idx">${pad(TAXA.indexOf(t) + 1)}</span>
      <span class="index__name">${t.common}</span>
      <span class="index__yr">${fmtBP(t.domesticated)}</span>
      <span class="index__sci t-sci">${t.sci}</span>
    </button>`).join('');

  $('#register-count').textContent =
    `${pad(rows.length)} / ${pad(TAXA.length)} RECORDS`;

  $$('.index__row', list).forEach(el =>
    el.addEventListener('click', () => select(el.dataset.id)));

  if (!rows.length) {
    list.innerHTML =
      `<div class="module__body t-fine lum-low">NO RECORD MATCHES QUERY "${app.filter.toUpperCase()}"</div>`;
  }
}

/* -------------------------------------------------------------------------
   READOUT PANELS
   ------------------------------------------------------------------------- */
function renderIdentity(t) {
  const centre = VAVILOV_CENTRES.find(c => c.id === t.centre);
  $('#identity').innerHTML = `
    <div class="stack-4">
      <div class="readout">
        <span class="readout__label">
          <svg class="glyph"><use href="#g-genome"/></svg>Accepted name
        </span>
        <span class="readout__value t-sci" data-live>${t.sci}</span>
        <span class="readout__note">${t.family} · ${t.genome}</span>
      </div>

      <div class="readout">
        <span class="readout__label">
          <svg class="glyph"><use href="#g-progenitor"/></svg>Wild progenitor
        </span>
        <span class="readout__value t-sci" style="font-size:var(--t-body)" data-live>${t.progenitor}</span>
      </div>

      <div class="readout">
        <span class="readout__label">
          <svg class="glyph"><use href="#g-origin"/></svg>Centre of origin
        </span>
        <span class="readout__value" style="font-size:var(--t-body)" data-live>${t.origin.place}</span>
        <span class="readout__note">Vavilov ${t.centre} · ${centre ? centre.name : '—'} · ${fmtCoord(t.origin.lat, t.origin.lng)}</span>
      </div>

      <div class="tag-row">
        ${t.traits.map(x => `<span class="tag">${x}</span>`).join('')}
      </div>
    </div>`;
}

function renderDomestication(t) {
  const events = [
    { bp: t.domesticated, label: 'Domestication', kind: 'domestication' },
    ...t.dispersal.map(d => ({
      bp: Math.max(120, 1950 - d.year),
      label: d.place,
      kind: 'dispersal'
    }))
  ];

  const conf = { high: 'ok', moderate: 'warn', contested: 'crit' }[t.confidence];

  $('#domestication').innerHTML = `
    <div class="stack-4">
      <div class="row row--between">
        <div class="readout">
          <span class="readout__label">Domesticated</span>
          <span class="readout__value readout__value--xl" data-live>${(t.domesticated / 1000).toFixed(1)}</span>
          <span class="readout__note">thousand years before present</span>
        </div>
        <span class="lamp" data-state="${conf}">
          <span class="lamp__bulb"></span>${t.confidence} confidence
        </span>
      </div>

      ${eraRail(events)}

      <div class="legend">
        <span class="legend__item">
          <svg class="legend__key" viewBox="0 0 12 12"><rect x="5" y="0" width="2" height="12" fill="var(--ch-base)"/></svg>
          Domestication
        </span>
        <span class="legend__item">
          <svg class="legend__key" viewBox="0 0 12 12"><rect x="5" y="4" width="2" height="8" fill="var(--p3-base)"/></svg>
          Arrival
        </span>
      </div>

      <div class="rule"><svg class="glyph"><use href="#g-evidence"/></svg>Evidence</div>
      <p class="t-fine">${t.evidence}</p>
    </div>`;
}

function renderMovement(t) {
  $('#movement').innerHTML = `
    <table class="ledger">
      <thead>
        <tr><th>Arrival</th><th>Year</th><th>Vector</th></tr>
      </thead>
      <tbody>
        ${t.dispersal.map(d => `
          <tr>
            <td>${d.place}</td>
            <td class="num">${fmtYear(d.year)}</td>
            <td class="dim">${d.mode}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderAvailability(t) {
  const peak = t.season.filter(v => v === 2).length;
  $('#availability').innerHTML = `
    <div class="row" style="align-items:center;gap:var(--s-6)">
      <div style="flex:0 0 160px">${seasonRing(t.season, { label: `${t.common} availability` })}</div>
      <div class="stack-4 grow">
        <div class="readout">
          <span class="readout__label">Local peak</span>
          <span class="readout__value readout__value--lg" data-live>${peak}<span class="readout__unit">months</span></span>
        </div>
        <div class="legend" style="flex-direction:column;gap:var(--s-3)">
          <span class="legend__item">
            <svg class="legend__key" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="none" stroke="var(--ch-base)" stroke-width="2.5"/></svg>
            Local harvest
          </span>
          <span class="legend__item">
            <svg class="legend__key" viewBox="0 0 12 12"><circle cx="6" cy="6" r="3.2" fill="none" stroke="var(--px-base)" stroke-width="2.5"/></svg>
            Stored or imported
          </span>
        </div>
        <p class="t-micro">Northern-hemisphere retail profile</p>
      </div>
    </div>`;
}

function renderOutput(t) {
  const topShare = t.producers[0][1] / t.production;
  $('#output').innerHTML = `
    <div class="row" style="align-items:flex-start;gap:var(--s-6)">
      <div class="stack-4 grow">
        <div class="readout">
          <span class="readout__label">Annual output</span>
          <span class="readout__value readout__value--lg" data-live>${fmtNum(t.production)}<span class="readout__unit">Mt</span></span>
        </div>
        ${bars(t.producers)}
      </div>
      <div style="flex:0 0 104px" class="stack-4">
        ${dial(topShare * 100, 100, {
          label: 'Share held by the largest producer',
          display: (topShare * 100).toFixed(0) + '%',
          unit: ''
        })}
        <p class="t-micro" style="text-align:center">${t.producers[0][0]}<br>share of world output</p>
      </div>
    </div>`;
}

function renderNote(t) {
  $('#note').innerHTML = `<p class="t-body">${t.note}</p>`;
}

/* -------------------------------------------------------------------------
   SELECTION
   ------------------------------------------------------------------------- */
function select(id, quiet) {
  const t = TAXA.find(x => x.id === id);
  if (!t || (app.taxon && app.taxon.id === id)) return;
  app.taxon = t;

  $$('.index__row').forEach(el =>
    el.setAttribute('aria-selected', String(el.dataset.id === id)));

  renderIdentity(t);
  renderDomestication(t);
  renderMovement(t);
  renderAvailability(t);
  renderOutput(t);
  renderNote(t);

  $('#vp-taxon').textContent = t.id;
  $('#vp-coord').textContent = fmtCoord(t.origin.lat, t.origin.lng);
  $('#vp-centre').textContent = `VAVILOV ${t.centre}`;
  $('#vp-legs').textContent = `${pad(t.dispersal.length)} LEGS PLOTTED`;

  $$('.module').forEach(sweep);
  app.globe.focus(t, app.channel);

  if (!quiet) {
    app.log.write(`RECORD ${t.id} — ${t.sci.toUpperCase()}`, 'REGISTER', 'ok');
    app.log.write(
      `ORIGIN ${fmtCoord(t.origin.lat, t.origin.lng)} · VAVILOV ${t.centre} · ` +
      `DOMESTICATION ${fmtBP(t.domesticated)}`, 'PLOT');
    if (t.confidence === 'contested') {
      app.log.write('DATE CONTESTED — NO SECURE ARCHAEOBOTANICAL HORIZON', 'AUDIT', 'warn');
    }
  }
}

/* -------------------------------------------------------------------------
   CHANNEL
   ------------------------------------------------------------------------- */
function setChannel(ch) {
  app.channel = ch;
  document.documentElement.setAttribute('data-channel', ch);
  $$('.chan__btn').forEach(b =>
    b.setAttribute('aria-selected', String(b.dataset.channel === ch)));
  tear($('.console'));
  app.globe.set('channel', ch);
  app.log.write(`DISPLAY CHANNEL → ${ch.toUpperCase()}`, 'TUBE');
}

/* -------------------------------------------------------------------------
   BOOT
   ------------------------------------------------------------------------- */
const BOOT_LINES = [
  ['TUBE',   'CRT WARM — 15.7 kHz HORIZONTAL, 60 Hz VERTICAL', 'info'],
  ['SYS',    'PHOSPHOR INTERFACE SYSTEM 2.4 — CHANNEL P1 VIRIDIAN', 'ok'],
  ['ATLAS',  'MOUNTING TAXON REGISTER', 'info'],
  ['ATLAS',  `${TAXA.length} RECORDS · ${VAVILOV_CENTRES.length} CENTRES OF ORIGIN · ${CORRIDORS.length} CORRIDORS`, 'info'],
  ['PLOT',   'ORTHOGRAPHIC PROJECTION LOCKED — GRATICULE 15°', 'info'],
  ['AUDIT',  'ALL AGES CALIBRATED BP · PRESENT = 1950 CE', 'ok'],
  ['SYS',    'READY', 'ok']
];

async function boot() {
  const term = $('#log');
  app.log = Log(term);

  app.globe = Globe($('#globe'));
  watchPersistence($('.console'));
  startClock($('#clock-elapsed'), $('#clock-wall'));

  renderIndex();

  await powerOn($('#boot'));

  const step = reducedMotion() ? 0 : 190;
  for (let i = 0; i < BOOT_LINES.length; i++) {
    const [src, msg, sev] = BOOT_LINES[i];
    app.log.write(msg, src, sev);
    if (step) await new Promise(r => setTimeout(r, step));
  }

  select('ZEA-MAY', true);
  app.log.write('RECORD ZEA-MAY — ZEA MAYS SUBSP. MAYS', 'REGISTER', 'ok');
}

/* -------------------------------------------------------------------------
   CONTROLS
   ------------------------------------------------------------------------- */
function bindControls() {
  $('#search').addEventListener('input', e => {
    app.filter = e.target.value;
    renderIndex();
  });

  $$('.chan__btn').forEach(b =>
    b.addEventListener('click', () => setChannel(b.dataset.channel)));

  $('#tool-spin').addEventListener('click', e => {
    const on = app.globe.get('autoSpin');
    app.globe.set('autoSpin', !on);
    e.currentTarget.dataset.on = String(!on);
    app.log.write(`AXIAL ROTATION ${!on ? 'ENGAGED' : 'HELD'}`, 'PLOT');
  });

  $('#tool-centres').addEventListener('click', e => {
    const on = app.globe.get('showCentres');
    app.globe.set('showCentres', !on);
    e.currentTarget.dataset.on = String(!on);
    app.log.write(`VAVILOV CENTRES ${!on ? 'SHOWN' : 'HIDDEN'}`, 'PLOT');
  });

  $('#tool-routes').addEventListener('click', e => {
    const on = app.globe.get('showRoutes');
    app.globe.set('showRoutes', !on);
    e.currentTarget.dataset.on = String(!on);
    app.log.write(`DISPERSAL VECTORS ${!on ? 'SHOWN' : 'HIDDEN'}`, 'PLOT');
  });

  /* Keyboard: arrow keys step the register, / focuses search, 1-5 switch
     channel. An instrument is operated by hand, not by mouse. */
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.key === '/') { e.preventDefault(); $('#search').focus(); return; }

    const idx = TAXA.findIndex(t => app.taxon && t.id === app.taxon.id);
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      select(TAXA[(idx + 1) % TAXA.length].id);
    }
    if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      select(TAXA[(idx - 1 + TAXA.length) % TAXA.length].id);
    }
    const chans = ['viridian', 'amber', 'ice', 'xeno'];
    if (/^[1-4]$/.test(e.key)) setChannel(chans[Number(e.key) - 1]);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindControls();
  boot();
});
