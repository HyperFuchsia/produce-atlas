import type { Crop } from "./types";
import { CATEGORIES, CATEGORY_COLOR } from "./data/categories";

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
      <input id="pa-time" type="range" min="0" max="11000" step="500" value="0" />
      <span class="timeaxis__label">≥ <span class="timeaxis__val" id="pa-time-val">present</span></span>
      <button class="ghost-btn" id="pa-reset">Reset</button>
    </div>

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
      return `
      <div class="crop${active}" role="option" tabindex="0" data-id="${c.id}"
           style="--cat:${color};animation-delay:${Math.min(i * 22, 400)}ms">
        <div class="crop__glyph">${c.glyph}</div>
        <div class="crop__body">
          <div class="crop__name">${c.name}</div>
          <div class="crop__sci">${c.scientificName}</div>
        </div>
        <div class="crop__region">${c.originRegion}</div>
      </div>`;
    })
    .join("");
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
        <div class="leg__to">${leg.to}</div>
        <div class="leg__period">${leg.period}</div>
      </div>`,
    )
    .join("");

  container.innerHTML = `
    <div class="detail__cat">
      <span class="chip__dot" style="background:${color};box-shadow:0 0 8px ${color}"></span>
      <span>${catLabel}</span>
    </div>
    <div class="detail__glyph">${c.glyph}</div>
    <h1 class="detail__name">${c.name}</h1>
    <div class="detail__sci">${c.scientificName}</div>
    <div class="detail__family">Family · ${c.family}</div>

    <div class="stats">
      <div class="stat">
        <div class="stat__k">Center of origin</div>
        <div class="stat__v">${c.originCenter}</div>
      </div>
      <div class="stat">
        <div class="stat__k">Domesticated</div>
        <div class="stat__v"><em>~${formatBP(c.domesticatedBP)} BP</em><br><span style="font-size:11.5px;color:var(--ink-mute)">${formatEra(
          c.domesticatedBP,
        )}</span></div>
      </div>
    </div>

    <div class="section">
      <span class="eyebrow">Domestication</span>
      <p class="lede">${c.domestication}</p>
    </div>

    <div class="section">
      <span class="eyebrow">Wild progenitor</span>
      <p style="font-family:var(--font-serif);font-style:italic;color:var(--ink)">${c.progenitor}</p>
    </div>

    <div class="section">
      <span class="eyebrow">Evidence</span>
      <p class="evidence">${c.evidence}</p>
    </div>

    <div class="section">
      <span class="eyebrow">Historical spread</span>
      <div class="spread">${legs}</div>
    </div>

    <div class="section">
      <span class="eyebrow">Today</span>
      <p>${c.availability}</p>
    </div>

    <div class="detail__hint">Glowing arcs on the globe trace this crop's journey from its hearth.</div>
  `;
}
