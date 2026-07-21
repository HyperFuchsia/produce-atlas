import type { Crop, Claim } from "./types";
import { renderSignature } from "./signature";
import { CATEGORIES, CATEGORY_COLOR } from "./data/categories";
import { CROPS } from "./data/crops";
import {
  SOURCES,
  SOURCE_BY_ID,
  MATURITY,
  MATURITY_BY_ID,
} from "./data/sources";

/** Minimal HTML escaping for authored data rendered via innerHTML. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Format years-before-present into a readable era label. */
export function formatEra(bp: number): string {
  const year = 1950 - bp; // BP is measured from 1950
  if (year < 0) {
    const bce = Math.round(-year / 100) * 100;
    return `c. ${bce.toLocaleString()} BCE`;
  }
  const ce = Math.round(year / 50) * 50;
  return `c. ${ce.toLocaleString()} CE`;
}

export function formatBP(bp: number): string {
  if (bp >= 1000) return `${(bp / 1000).toFixed(bp % 1000 === 0 ? 0 : 1)}k`;
  return String(bp);
}

const svgSearch = `<svg class="search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>`;

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  contested: "Contested",
};
const CLAIM_KIND_LABEL: Record<string, string> = {
  identity: "Identity",
  domestication: "Domestication",
  spread: "Spread",
  availability: "Availability",
};

/** A small maturity badge (used in list rows and the detail header). */
function maturityBadge(m: string, opts: { compact?: boolean } = {}): string {
  const meta = MATURITY_BY_ID[m];
  if (!meta) return "";
  const label = opts.compact ? meta.short : meta.label;
  return `<span class="badge" data-maturity="${m}" style="--badge:${meta.color}" title="${esc(
    meta.note,
  )}"><span class="badge__dot"></span>${label}</span>`;
}

export interface UIRefs {
  searchInput: HTMLInputElement;
  filters: HTMLElement;
  list: HTMLElement;
  count: HTMLElement;
  detail: HTMLElement;
  detailScroll: HTMLElement;
  detailClose: HTMLButtonElement;
  timeRange: HTMLInputElement;
  timeVal: HTMLElement;
  resetBtn: HTMLButtonElement;
  tip: HTMLElement;
  methodBtn: HTMLButtonElement;
  methodPanel: HTMLElement;
  methodClose: HTMLButtonElement;
}

/** Build the entire chrome once and return element references. */
export function mountChrome(root: HTMLElement): UIRefs {
  const chips = CATEGORIES.map(
    (c) =>
      `<button class="chip" data-cat="${c.id}" style="color:${c.color}">
         <span class="chip__dot" style="background:${c.color}"></span>
         <span style="color:var(--ink-soft)">${c.label}</span>
       </button>`,
  ).join("");

  root.insertAdjacentHTML(
    "beforeend",
    `
    <header class="masthead">
      <div class="masthead__logo"><span></span></div>
      <div>
        <div class="masthead__title">PRODUCE ATLAS</div>
        <div class="masthead__sub">Origins &amp; spread of the world's food plants</div>
      </div>
    </header>

    <aside class="rail panel">
      <div class="rail__head">
        <span class="eyebrow">Food plants</span>
        <span class="rail__count" id="pa-count"></span>
      </div>
      <div class="search">
        ${svgSearch}
        <input id="pa-search" type="search" placeholder="Search name, family, region…" autocomplete="off" spellcheck="false" />
      </div>
      <div class="filters" id="pa-filters">${chips}</div>
      <div class="list" id="pa-list" role="listbox" aria-label="Food plants"></div>
    </aside>

    <section class="detail panel" id="pa-detail" aria-live="polite">
      <button class="detail__close" id="pa-detail-close" aria-label="Close details">✕</button>
      <div class="detail__scroll" id="pa-detail-scroll"></div>
    </section>

    <div class="timeaxis panel" id="pa-timeaxis">
      <span class="timeaxis__label">Domestication horizon</span>
      <input id="pa-time" type="range" min="0" max="11000" step="500" value="0" aria-label="Domestication horizon (years before present)" />
      <span class="timeaxis__label">≥ <span class="timeaxis__val" id="pa-time-val">present</span></span>
      <button class="ghost-btn" id="pa-reset">Reset</button>
    </div>

    <button class="method-btn" id="pa-method-btn" aria-haspopup="dialog">
      <span class="method-btn__dot"></span> Methodology &amp; evidence
    </button>

    ${methodologyOverlay()}

    <div class="tip" id="pa-tip"></div>
    `,
  );

  return {
    searchInput: root.querySelector("#pa-search")!,
    filters: root.querySelector("#pa-filters")!,
    list: root.querySelector("#pa-list")!,
    count: root.querySelector("#pa-count")!,
    detail: root.querySelector("#pa-detail")!,
    detailScroll: root.querySelector("#pa-detail-scroll")!,
    detailClose: root.querySelector("#pa-detail-close")!,
    timeRange: root.querySelector("#pa-time")!,
    timeVal: root.querySelector("#pa-time-val")!,
    resetBtn: root.querySelector("#pa-reset")!,
    tip: root.querySelector("#pa-tip")!,
    methodBtn: root.querySelector("#pa-method-btn")!,
    methodPanel: root.querySelector("#pa-method")!,
    methodClose: root.querySelector("#pa-method-close")!,
  };
}

/** Render the crop list for the current filtered set. */
export function renderList(
  container: HTMLElement,
  crops: Crop[],
  activeId: string | null,
): void {
  if (crops.length === 0) {
    container.innerHTML = `<div style="padding:24px 8px;color:var(--ink-faint);font-size:13px">No plants match these filters.</div>`;
    return;
  }
  container.innerHTML = crops
    .map((c, i) => {
      const color = CATEGORY_COLOR[c.category];
      const active = c.id === activeId ? " is-active" : "";
      const flag =
        c.maturity === "flagship"
          ? `<span class="crop__flag" title="Flagship — carries a source-linked claim packet">◆</span>`
          : "";
      return `
      <div class="crop${active}" role="option" tabindex="0" data-id="${c.id}"
           style="--cat:${color};animation-delay:${Math.min(i * 22, 400)}ms">
        <div class="crop__glyph">${c.glyph}</div>
        <div class="crop__body">
          <div class="crop__name">${esc(c.name)} ${flag}</div>
          <div class="crop__sci">${esc(c.scientificName)}</div>
        </div>
        <div class="crop__region">${esc(c.originRegion)}</div>
      </div>`;
    })
    .join("");
}

function claimRow(claim: Claim): string {
  const refs = claim.sourceIds
    .map((id) => {
      const idx = SOURCES.findIndex((s) => s.id === id);
      return idx >= 0
        ? `<span class="ref" title="${esc(SOURCE_BY_ID[id]?.citation ?? id)}">${idx + 1}</span>`
        : "";
    })
    .join("");
  return `
    <div class="claim" data-confidence="${claim.confidence}">
      <div class="claim__head">
        <span class="claim__kind">${CLAIM_KIND_LABEL[claim.kind] ?? claim.kind}</span>
        <span class="claim__meta">
          <span class="claim__conf" data-conf="${claim.confidence}">${CONFIDENCE_LABEL[claim.confidence] ?? claim.confidence}</span>
          <span class="claim__review" data-review="${claim.review}">${claim.review === "pending" ? "Review pending" : claim.review}</span>
        </span>
      </div>
      <p class="claim__text">${esc(claim.statement)} ${refs}</p>
    </div>`;
}

/** Render the detail panel content for a selected crop. */
export function renderDetail(container: HTMLElement, c: Crop): void {
  const color = CATEGORY_COLOR[c.category];
  const catLabel =
    CATEGORIES.find((k) => k.id === c.category)?.label ?? c.category;

  const legs = c.spread
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(
      (leg) => `
      <div class="leg" style="--cat:${color}">
        <span class="leg__dot"></span>
        <div class="leg__to">${esc(leg.to)}</div>
        <div class="leg__period">${esc(leg.period)}</div>
      </div>`,
    )
    .join("");

  // Claim packet (flagship only) + the sources it draws on.
  let claimsSection = "";
  if (c.claims && c.claims.length) {
    const usedIds = [...new Set(c.claims.flatMap((cl) => cl.sourceIds))];
    const refsList = usedIds
      .map((id) => {
        const idx = SOURCES.findIndex((s) => s.id === id);
        return `<li><span class="ref">${idx + 1}</span> ${esc(SOURCE_BY_ID[id]?.citation ?? id)}</li>`;
      })
      .join("");
    claimsSection = `
    <div class="section">
      <span class="eyebrow">Claim packet · ${c.claims.length} source-linked claims</span>
      <div class="claims">${c.claims.map(claimRow).join("")}</div>
      <div class="refs">
        <div class="refs__title">References</div>
        <ol class="refs__list">${refsList}</ol>
      </div>
    </div>`;
  }

  const cautionRow = c.safety.cautionParts
    ? `<div class="safety__row safety__row--warn"><span class="safety__k">Caution</span><span>${esc(
        c.safety.cautionParts,
      )}</span></div>`
    : "";

  container.innerHTML = `
    <div class="detail__topline">
      <div class="detail__cat">
        <span class="chip__dot" style="background:${color};box-shadow:0 0 8px ${color}"></span>
        <span>${catLabel}</span>
      </div>
      ${maturityBadge(c.maturity)}
    </div>
    <div class="detail__hero">
      <canvas class="detail__sig" aria-hidden="true"></canvas>
      <div class="detail__glyph">${c.glyph}</div>
    </div>
    <h1 class="detail__name">${esc(c.name)}</h1>
    <div class="detail__sci">${esc(c.scientificName)}</div>
    <div class="detail__family">Family · ${esc(c.family)}</div>

    <div class="stats">
      <div class="stat">
        <div class="stat__k">Center of origin</div>
        <div class="stat__v">${esc(c.originCenter)}</div>
        <div class="stat__note">Representative point · not an exact discovery site</div>
      </div>
      <div class="stat">
        <div class="stat__k">Domesticated</div>
        <div class="stat__v"><em>~${formatBP(c.domesticatedBP)} BP</em></div>
        <div class="stat__note">${formatEra(c.domesticatedBP)} · approximate</div>
      </div>
    </div>

    <div class="section">
      <span class="eyebrow">Domestication</span>
      <p class="lede">${esc(c.domestication)}</p>
    </div>

    <div class="section">
      <span class="eyebrow">Wild progenitor</span>
      <p style="font-family:var(--font-serif);font-style:italic;color:var(--ink)">${esc(c.progenitor)}</p>
    </div>

    <div class="section">
      <span class="eyebrow">Evidence</span>
      <p class="evidence">${esc(c.evidence)}</p>
    </div>

    ${claimsSection}

    <div class="section">
      <span class="eyebrow">Historical spread</span>
      <p class="section__caption">Corridors, not reconstructions of every shipment.</p>
      <div class="spread">${legs}</div>
    </div>

    <div class="section">
      <span class="eyebrow">Today</span>
      <p>${esc(c.availability)}</p>
    </div>

    <div class="section">
      <span class="eyebrow">Edibility &amp; safety</span>
      <div class="safety">
        <div class="safety__row"><span class="safety__k">Eaten</span><span>${esc(c.safety.edibleParts)}</span></div>
        ${cautionRow}
        <p class="safety__note">${esc(c.safety.note)}</p>
        <p class="safety__disc">General reference only — not food-safety or medical advice.</p>
      </div>
    </div>
  `;

  // Draw the procedural specimen signature into the hero canvas.
  const sig = container.querySelector<HTMLCanvasElement>(".detail__sig");
  if (sig) renderSignature(sig, c.id, { color, size: 132 });
}

/** The methodology / evidence overlay (governance made visible). */
function methodologyOverlay(): string {
  const counts: Record<string, number> = {};
  for (const c of CROPS) counts[c.maturity] = (counts[c.maturity] ?? 0) + 1;
  const totalClaims = CROPS.reduce((n, c) => n + (c.claims?.length ?? 0), 0);
  const approved = CROPS.reduce(
    (n, c) => n + (c.claims?.filter((cl) => cl.review === "approved").length ?? 0),
    0,
  );

  const tiers = MATURITY.map(
    (m) => `
    <div class="mtier" style="--badge:${m.color}">
      <div class="mtier__head">
        <span class="badge__dot"></span>
        <span class="mtier__label">${m.label}</span>
        <span class="mtier__count">${counts[m.id] ?? 0}</span>
      </div>
      <p class="mtier__note">${esc(m.note)}</p>
    </div>`,
  ).join("");

  const sourceList = SOURCES.map(
    (s, i) =>
      `<li><span class="ref">${i + 1}</span> ${esc(s.citation)}</li>`,
  ).join("");

  return `
  <div class="methodology" id="pa-method" role="dialog" aria-modal="true" aria-label="Methodology and evidence" hidden>
    <div class="methodology__scrim" data-close></div>
    <div class="methodology__card panel">
      <button class="detail__close" id="pa-method-close" aria-label="Close">✕</button>
      <span class="eyebrow">How to read this atlas</span>
      <h2 class="methodology__title">Evidence before spectacle</h2>
      <p class="methodology__lede">
        Structural completeness is not the same as researched depth. Every record has a full
        set of fields, but only some are individually authored, and only a few carry a formal
        packet of source-linked claims. This panel makes those limits visible.
      </p>

      <div class="mstats">
        <div class="mstat"><div class="mstat__v">${CROPS.length}</div><div class="mstat__k">Records</div></div>
        <div class="mstat"><div class="mstat__v">${counts["flagship"] ?? 0}</div><div class="mstat__k">Flagship packets</div></div>
        <div class="mstat"><div class="mstat__v">${totalClaims}</div><div class="mstat__k">Source-linked claims</div></div>
        <div class="mstat"><div class="mstat__v">${approved}</div><div class="mstat__k">Expert-approved</div></div>
      </div>

      <span class="eyebrow">Research maturity</span>
      <div class="mtiers">${tiers}</div>

      <span class="eyebrow">What the map does and does not claim</span>
      <ul class="mdisclose">
        <li>Origin markers are <strong>representative points</strong> for a center of origin, not exact discovery sites.</li>
        <li>Spread arcs are <strong>historical corridors</strong>, not reconstructions of every route or shipment.</li>
        <li>Dates are <strong>approximate</strong> years before present and are, for several crops, actively debated.</li>
        <li>Edibility notes are <strong>general reference</strong>, never food-safety or medical advice.</li>
      </ul>

      <span class="eyebrow">Source registry</span>
      <ol class="refs__list refs__list--full">${sourceList}</ol>
    </div>
  </div>`;
}
