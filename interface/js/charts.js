/* ==========================================================================
   PRODUCE ATLAS — INSTRUMENT CHARTS
   --------------------------------------------------------------------------
   Four chart types, each chosen because the data has that shape:

     seasonRing   a 12-month cycle, drawn as a cycle. A bar chart of the
                  months lies about December and January being far apart.
     eraRail      deep time on a log axis. Domestication events cluster in
                  the last twelve millennia; a linear axis spends most of
                  the tube on empty Pleistocene.
     bars         ranked production. Ordered, so a bar chart is honest.
     trace        a continuous series, drawn as an oscilloscope sweep with
                  the endpoint emphasised — on a scope that is where the
                  beam is now.

   All output is SVG built from strings: these are small, static, and the
   markup is the accessible description as well as the picture.
   ========================================================================== */

const SVGNS = 'http://www.w3.org/2000/svg';

/* -------------------------------------------------------------------------
   SEASON RING
   Twelve wedges on two radii. The outer band is local peak availability,
   the inner is stored or imported supply. Both are drawn as arc strokes,
   never as filled pie slices.
   ------------------------------------------------------------------------- */
function seasonRing(values, opts = {}) {
  const size = opts.size || 168;
  const c = size / 2;
  /* Radii leave room for a three-letter month code outside the outer band
     without the labels leaving the box. */
  const rOuter = size * 0.34;
  const rInner = size * 0.235;
  const gap = 2.5;                       // degrees of dark between wedges
  const seg = 360 / 12;

  const polar = (r, deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return [c + r * Math.cos(a), c + r * Math.sin(a)];
  };
  const arc = (r, from, to) => {
    const [x0, y0] = polar(r, from);
    const [x1, y1] = polar(r, to);
    const large = (to - from) > 180 ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };

  let out = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${opts.label || 'Availability by month'}">`;

  // reference rings + month spokes
  out += `<circle class="season__ring" cx="${c}" cy="${c}" r="${rOuter}"/>`;
  out += `<circle class="season__ring" cx="${c}" cy="${c}" r="${rInner}"/>`;
  for (let m = 0; m < 12; m++) {
    const [x0, y0] = polar(rInner - 5, m * seg);
    const [x1, y1] = polar(rOuter + 5, m * seg);
    out += `<line class="season__spoke" x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}"/>`;
  }

  // wedges
  values.forEach((v, m) => {
    if (!v) return;
    const from = m * seg + gap / 2;
    const to = (m + 1) * seg - gap / 2;
    const peak = v >= 2;
    out += `<path class="season__wedge${peak ? '' : ' season__wedge--import'}" d="${arc(peak ? rOuter : rInner, from, to)}"/>`;
  });

  /* Month codes, outside the ring. Single letters would be ambiguous —
     three months begin with J — so the full three-letter code is used and
     the ring is sized to hold it. */
  MONTHS.forEach((mo, m) => {
    const [x, y] = polar(rOuter + 15, m * seg + seg / 2);
    out += `<text class="season__mo" x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle">${mo}</text>`;
  });

  out += '</svg>';
  return out;
}

/* -------------------------------------------------------------------------
   ERA RAIL
   Log-scaled deep time. Ticks are placed at real epoch boundaries so the
   axis carries meaning beyond the crop being viewed.
   ------------------------------------------------------------------------- */
const ERA_MAX = 14000;   // cal BP, left edge — end of the Late Glacial
const ERA_MIN = 100;     // cal BP, right edge

function eraPosition(bp) {
  const clamped = Math.max(ERA_MIN, Math.min(ERA_MAX, bp));
  const t = (Math.log(ERA_MAX) - Math.log(clamped)) /
            (Math.log(ERA_MAX) - Math.log(ERA_MIN));
  return t * 100;   // percent from the left edge
}

/* Three epoch boundaries, not five. On a log axis the Pleistocene end
   compresses hard, and five marks collide into an unreadable smear before
   they carry any more meaning than three do. */
const ERA_MARKS = [
  { bp: 11700, label: 'Holocene' },
  { bp: 5000,  label: 'Bronze' },
  { bp: 500,   label: 'Columbian' }
];

function eraRail(events, opts = {}) {
  /* Marks alternate between two label rows. On a log axis the spacing
     between epochs is not under our control, so guaranteeing legibility
     has to come from the layout, not from hoping the labels are short. */
  const marks = ERA_MARKS.map((m, i) =>
    `<div class="era__mark" style="left:${eraPosition(m.bp).toFixed(2)}%;--row:${i % 2}">
       <span>${m.label}</span>
     </div>`).join('');

  /* Event heights stay under the 36px the track reserves below the label
     rows, so a bar can never grow into a label. */
  const evts = events.map(e => {
    const cls = e.kind === 'dispersal' ? 'era__event era__event--now' : 'era__event';
    /* -3px accounts for the cap dot each event draws above its own box. */
    const h = e.kind === 'dispersal' ? 18 : 30;
    return `<div class="${cls}" style="left:${eraPosition(e.bp).toFixed(2)}%;height:${h}px"
                 title="${e.label} — ${fmtBP(e.bp)}"></div>`;
  }).join('');

  return `
    <div class="era">
      <div class="era__track">
        <div class="era__grid"></div>
        ${marks}
        ${evts}
      </div>
      <div class="era__axis">
        <span>${(ERA_MAX / 1000).toFixed(0)} ka BP</span>
        <span class="lum-low">LOG SCALE</span>
        <span>${opts.rightLabel || 'PRESENT'}</span>
      </div>
    </div>`;
}

/* -------------------------------------------------------------------------
   RANKED BARS
   ------------------------------------------------------------------------- */
function bars(rows, opts = {}) {
  const max = Math.max(...rows.map(r => r[1]));
  const unit = opts.unit || 'Mt';
  return rows.map(([label, value]) => `
    <div class="meter">
      <div class="meter__head">
        <span>${label}</span>
        <span class="meter__val">${fmtNum(value)}<span class="readout__unit">${unit}</span></span>
      </div>
      <div class="meter__track">
        <div class="meter__fill" style="transform:scaleX(${(value / max).toFixed(4)})"></div>
      </div>
    </div>`).join('');
}

/* -------------------------------------------------------------------------
   TRACE — oscilloscope line
   ------------------------------------------------------------------------- */
function trace(series, opts = {}) {
  const w = opts.width || 280;
  const h = opts.height || 72;
  const pad = 4;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = (max - min) || 1;

  const pts = series.map((v, i) => {
    const x = pad + (i / (series.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y];
  });

  const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const grid = [0.25, 0.5, 0.75].map(f =>
    `<line class="trace__grid" x1="0" y1="${(h * f).toFixed(1)}" x2="${w}" y2="${(h * f).toFixed(1)}"/>`
  ).join('');
  const head = pts[pts.length - 1];

  return `
    <div class="trace">
      <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${opts.label || 'Series'}">
        ${grid}
        <path class="trace__line" d="${d}"/>
        <circle class="trace__head" cx="${head[0].toFixed(1)}" cy="${head[1].toFixed(1)}" r="2.6"/>
      </svg>
    </div>`;
}

/* -------------------------------------------------------------------------
   DIAL — single-value radial gauge
   ------------------------------------------------------------------------- */
function dial(value, max, opts = {}) {
  const size = opts.size || 108;
  const c = size / 2;
  const r = size * 0.40;
  const sweep = 270;                      // degrees of usable arc
  const circ = 2 * Math.PI * r;
  const arcLen = circ * (sweep / 360);
  const frac = Math.max(0, Math.min(1, value / max));

  const ticks = [];
  for (let i = 0; i <= 6; i++) {
    const a = (-225 + (sweep / 6) * i) * Math.PI / 180;
    ticks.push(`<line class="dial__ticks"
      x1="${(c + Math.cos(a) * (r + 4)).toFixed(1)}" y1="${(c + Math.sin(a) * (r + 4)).toFixed(1)}"
      x2="${(c + Math.cos(a) * (r + 9)).toFixed(1)}" y2="${(c + Math.sin(a) * (r + 9)).toFixed(1)}"/>`);
  }

  return `
    <div class="dial">
      <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${opts.label || 'Gauge'}: ${value} of ${max}">
        <g transform="rotate(135 ${c} ${c})">
          <circle class="dial__track" cx="${c}" cy="${c}" r="${r}"
                  stroke-dasharray="${arcLen.toFixed(2)} ${circ.toFixed(2)}"/>
          <circle class="dial__arc" cx="${c}" cy="${c}" r="${r}"
                  stroke-dasharray="${(arcLen * frac).toFixed(2)} ${circ.toFixed(2)}"/>
        </g>
        ${ticks.join('')}
      </svg>
      <div class="dial__center">
        <span class="t-data">${opts.display != null ? opts.display : value}</span>
        <span class="t-micro">${opts.unit || ''}</span>
      </div>
    </div>`;
}

/* -------------------------------------------------------------------------
   FORMATTERS
   An instrument never prints a bare number. Units, sign and precision are
   part of the value.
   ------------------------------------------------------------------------- */
function fmtBP(bp) {
  if (bp >= 1000) return `${(bp / 1000).toFixed(1)} ka BP`;
  return `${bp} BP`;
}

function fmtNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(2) + 'k';
  if (n >= 100)  return n.toFixed(0);
  if (n >= 10)   return n.toFixed(1);
  return n.toFixed(2);
}

function fmtYear(y) {
  if (y < 0) return `${Math.abs(y)} BCE`;
  return `${y} CE`;
}

function pad(n, width = 2) {
  return String(n).padStart(width, '0');
}
