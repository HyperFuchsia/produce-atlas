import type { Crop, Claim, ListEntry, IndexSpecies } from "./types";
import { renderPlant } from "./plant";
import { renderOriginMap } from "./atlasmap";
import { CATEGORIES, CATEGORY_COLOR } from "./data/categories";
import { CROPS } from "./data/crops";
import { INDEX_SPECIES } from "./data/speciesIndex";
import { SOURCES, SOURCE_BY_ID, MATURITY, MATURITY_BY_ID } from "./data/sources";

const INK = "#2c2620";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatEra(bp: number): string {
  const year = 1950 - bp;
  if (year < 0) {
    const bce = Math.round(-year / 100) * 100;
    return `c. ${bce.toLocaleString()} BCE`;
  }
  return `c. ${(Math.round(year / 50) * 50).toLocaleString()} CE`;
}
export function formatBP(bp: number): string {
  if (bp >= 1000) return `${(bp / 1000).toFixed(bp % 1000 === 0 ? 0 : 1)}k`;
  return String(bp);
}

/** Stable specimen accession number from an id. */
function accession(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  return "№ " + String(1000 + (h % 8999));
}

const svgSearch = `<svg class="search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>`;

const CONFIDENCE_LABEL: Record<string, string> = { high: "High confidence", medium: "Medium confidence", contested: "Contested" };
const CLAIM_KIND_LABEL: Record<string, string> = { identity: "Identity", domestication: "Domestication", spread: "Spread", availability: "Availability" };

function maturityBadge(m: string): string {
  const meta = MATURITY_BY_ID[m];
  if (!meta) return "";
  return `<span class="badge" style="--badge:${meta.color}" title="${esc(meta.note)}"><span class="badge__dot"></span>${meta.short}</span>`;
}

export interface UIRefs {
  search: HTMLInputElement;
  filters: HTMLElement;
  count: HTMLElement;
  gallery: HTMLElement;
  sheetScrim: HTMLElement;
  sheetBody: HTMLElement;
  sheetClose: HTMLButtonElement;
  aboutBtn: HTMLButtonElement;
  methodPanel: HTMLElement;
  methodClose: HTMLButtonElement;
}

export function mountChrome(root: HTMLElement): UIRefs {
  const chips = CATEGORIES.map(
    (c) => `<button class="chip" data-cat="${c.id}"><span class="chip__dot" style="background:${c.color}"></span>${c.label}</button>`,
  ).join("");

  root.insertAdjacentHTML(
    "beforeend",
    `
    <header class="masthead">
      <div class="masthead__rule"></div>
      <div class="masthead__rule masthead__rule--thin"></div>
      <h1 class="masthead__title">Produce&nbsp;<em>Atlas</em></h1>
      <div class="masthead__sub">A Botanical Visualizer of the World's Food Plants</div>
      <div class="masthead__rule masthead__rule--thin"></div>
      <div class="masthead__rule"></div>
    </header>

    <div class="controls">
      <div class="search">
        ${svgSearch}
        <input id="pa-search" type="search" placeholder="Search name, genus, family…" autocomplete="off" spellcheck="false" />
      </div>
      <div class="filters" id="pa-filters">${chips}</div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin:-12px 0 16px"><span class="count" id="pa-count"></span></div>

    <section class="gallery" id="pa-gallery" aria-label="Specimen gallery"></section>

    <div class="footer">
      <button class="about-btn" id="pa-about" aria-haspopup="dialog"><span class="about-btn__leaf"></span> About &amp; methodology</button>
    </div>

    <div class="sheet-scrim" id="pa-sheet-scrim" role="dialog" aria-modal="true" aria-label="Specimen sheet">
      <article class="sheet">
        <button class="sheet__close" id="pa-sheet-close" aria-label="Close">✕</button>
        <div id="pa-sheet-body"></div>
      </article>
    </div>

    ${methodologyOverlay()}
    `,
  );

  return {
    search: root.querySelector("#pa-search")!,
    filters: root.querySelector("#pa-filters")!,
    count: root.querySelector("#pa-count")!,
    gallery: root.querySelector("#pa-gallery")!,
    sheetScrim: root.querySelector("#pa-sheet-scrim")!,
    sheetBody: root.querySelector("#pa-sheet-body")!,
    sheetClose: root.querySelector("#pa-sheet-close")!,
    aboutBtn: root.querySelector("#pa-about")!,
    methodPanel: root.querySelector("#pa-method")!,
    methodClose: root.querySelector("#pa-method-close")!,
  };
}

// --- lazy plant drawing (only draw specimens as they scroll into view) -----
let plantObserver: IntersectionObserver | null = null;

function drawCanvas(cv: HTMLCanvasElement, size: number): void {
  if (cv.dataset.drawn) return;
  renderPlant(cv, cv.dataset.seed!, {
    color: cv.dataset.color!,
    category: cv.dataset.category!,
    ink: INK,
    size,
  });
  cv.dataset.drawn = "1";
}

export function renderGallery(
  container: HTMLElement,
  entries: ListEntry[],
): void {
  plantObserver?.disconnect();
  if (entries.length === 0) {
    container.innerHTML = `<div class="gallery__empty">No specimens match these filters.</div>`;
    return;
  }
  container.innerHTML = entries
    .map((e, i) => {
      const color = CATEGORY_COLOR[e.category];
      return `
      <div class="specimen" role="button" tabindex="0" data-id="${e.id}" style="animation-delay:${Math.min(i * 8, 240)}ms">
        <span class="specimen__no">${accession(e.id)}</span>
        <div class="specimen__plate">
          <canvas data-seed="${e.id}" data-color="${color}" data-category="${e.category}" aria-hidden="true"></canvas>
        </div>
        <div class="specimen__name">${esc(e.name)}<span class="mdot" style="background:${MATURITY_BY_ID[e.maturity]?.color}"></span></div>
        <div class="specimen__sci">${esc(e.scientificName)}</div>
        <div class="specimen__fam">${esc(e.family)}</div>
      </div>`;
    })
    .join("");

  plantObserver = new IntersectionObserver(
    (rows) => {
      for (const r of rows) {
        if (r.isIntersecting) {
          const cv = r.target.querySelector<HTMLCanvasElement>("canvas");
          if (cv) drawCanvas(cv, 170);
          plantObserver!.unobserve(r.target);
        }
      }
    },
    { rootMargin: "200px" },
  );
  container.querySelectorAll(".specimen").forEach((el) => plantObserver!.observe(el));
}

// --- specimen sheet --------------------------------------------------------
function claimRow(claim: Claim): string {
  const refs = claim.sourceIds
    .map((id) => {
      const idx = SOURCES.findIndex((s) => s.id === id);
      return idx >= 0 ? `<span class="ref" title="${esc(SOURCE_BY_ID[id]?.citation ?? id)}">${idx + 1}</span>` : "";
    })
    .join("");
  return `
    <div class="claim" data-confidence="${claim.confidence}">
      <div class="claim__head">
        <span class="claim__kind">${CLAIM_KIND_LABEL[claim.kind] ?? claim.kind}</span>
        <span class="claim__meta">
          <span class="claim__conf" data-conf="${claim.confidence}">${CONFIDENCE_LABEL[claim.confidence] ?? claim.confidence}</span>
          <span class="claim__review">${claim.review === "pending" ? "Review pending" : claim.review}</span>
        </span>
      </div>
      <p class="claim__text">${esc(claim.statement)} ${refs}</p>
    </div>`;
}

function plateBlock(id: string, name: string, sci: string, fam: string): string {
  return `
    <div>
      <div class="plate">
        <div class="plate__frame"></div>
        <canvas id="pa-plate" aria-hidden="true"></canvas>
      </div>
      <div class="label-block">
        <div class="label-block__row"><span class="label">Herbarium</span><span class="label-block__no">${accession(id)}</span></div>
        <div style="font-size:17px;font-weight:600;margin-top:4px">${esc(name)}</div>
        <div class="sci" style="color:var(--green)">${esc(sci)}</div>
        <div class="specimen__fam" style="margin-top:5px">${esc(fam)}</div>
      </div>
    </div>`;
}

/** Fill the sheet for a fully-authored atlas crop. */
export function renderCropSheet(body: HTMLElement, c: Crop): void {
  const color = CATEGORY_COLOR[c.category];
  const catLabel = CATEGORIES.find((k) => k.id === c.category)?.label ?? c.category;

  const legs = c.spread.slice().sort((a, b) => a.order - b.order)
    .map((l) => `<div class="leg"><span class="leg__to">${esc(l.to)}</span><span class="leg__period">${esc(l.period)}</span></div>`)
    .join("");

  let claimsSection = "";
  if (c.claims?.length) {
    const usedIds = [...new Set(c.claims.flatMap((cl) => cl.sourceIds))];
    const refsList = usedIds.map((id) => {
      const idx = SOURCES.findIndex((s) => s.id === id);
      return `<li><span class="ref">${idx + 1}</span> ${esc(SOURCE_BY_ID[id]?.citation ?? id)}</li>`;
    }).join("");
    claimsSection = `
      <div class="section">
        <span class="label">Claim packet · ${c.claims.length} source-linked claims</span>
        <div class="claims">${c.claims.map(claimRow).join("")}</div>
        <ul class="refs__list">${refsList}</ul>
      </div>`;
  }

  const cautionRow = c.safety.cautionParts
    ? `<div class="safety__row safety__row--warn"><span class="safety__k">Caution</span><span>${esc(c.safety.cautionParts)}</span></div>`
    : "";

  const mapLegs = c.spread.map((l) => ({ coords: l.coords, to: l.to }));

  body.innerHTML = `
    <div class="sheet__grid">
      <div>${plateBlock(c.id, c.name, c.scientificName, c.family)}</div>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding-right:36px">
          <span class="sheet__cat"><span class="chip__dot" style="width:9px;height:9px;background:${color}"></span><span class="label">${catLabel}</span></span>
          ${maturityBadge(c.maturity)}
        </div>
        <h2 class="sheet__name">${esc(c.name)}</h2>
        <div class="sheet__sci">${esc(c.scientificName)}</div>
        <div class="sheet__fam">Family · ${esc(c.family)}</div>

        ${renderOriginMap(c.origin, mapLegs, color)}
        <div class="map-cap">Centre of origin (ringed) &amp; historical dispersal — representative, not exact</div>

        <div class="stats">
          <div class="stat"><span class="label">Centre of origin</span><div class="stat__v">${esc(c.originCenter)}</div><div class="stat__note">${esc(c.originRegion)}</div></div>
          <div class="stat"><span class="label">Domesticated</span><div class="stat__v"><em>~${formatBP(c.domesticatedBP)} BP</em></div><div class="stat__note">${formatEra(c.domesticatedBP)} · approximate</div></div>
        </div>

        <div class="section"><span class="label">Domestication</span><p>${esc(c.domestication)}</p></div>
        <div class="section"><span class="label">Wild progenitor</span><p class="prog" style="color:var(--green)">${esc(c.progenitor)}</p></div>
        <div class="section"><span class="label">Evidence</span><p class="evidence">${esc(c.evidence)}</p></div>
        ${claimsSection}
        <div class="section">
          <span class="label">Historical spread</span>
          <p class="caption">Corridors, not reconstructions of every route.</p>
          <div class="spread">${legs}</div>
        </div>
        <div class="section"><span class="label">Today</span><p>${esc(c.availability)}</p></div>
        <div class="section">
          <span class="label">Edibility &amp; safety</span>
          <div class="safety">
            <div class="safety__row"><span class="safety__k">Eaten</span><span>${esc(c.safety.edibleParts)}</span></div>
            ${cautionRow}
            <p class="safety__note">${esc(c.safety.note)}</p>
            <p class="safety__disc">General reference only — not food-safety or medical advice.</p>
          </div>
        </div>
      </div>
    </div>`;

  const plate = body.querySelector<HTMLCanvasElement>("#pa-plate");
  if (plate) renderPlant(plate, c.id, { color, category: c.category, ink: INK, size: 300 });
}

/** Fill the sheet for a baseline index species. */
export function renderSpeciesSheet(body: HTMLElement, sp: IndexSpecies): void {
  const color = CATEGORY_COLOR[sp.category];
  const catLabel = CATEGORIES.find((k) => k.id === sp.category)?.label ?? sp.category;

  body.innerHTML = `
    <div class="sheet__grid">
      <div>${plateBlock(sp.id, sp.name, sp.scientificName, sp.family)}</div>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding-right:36px">
          <span class="sheet__cat"><span class="chip__dot" style="width:9px;height:9px;background:${color}"></span><span class="label">${catLabel}</span></span>
          ${maturityBadge(sp.maturity)}
        </div>
        <h2 class="sheet__name">${esc(sp.name)}</h2>
        <div class="sheet__sci">${esc(sp.scientificName)}</div>
        <div class="sheet__fam">Family · ${esc(sp.family)}</div>

        <div class="section">
          <span class="label">Baseline record</span>
          <p class="baseline-note">A real edible species included for breadth of coverage. It has
          <strong>not yet been individually researched</strong> for its centre of origin, domestication,
          or historical spread — so no origin is mapped and no claims are made.</p>
        </div>
        <div class="section">
          <span class="label">Specimen illustration</span>
          <p class="caption">A deterministic generative plate unique to this species — an interpretive
          botanical signature, not an exact reconstruction.</p>
        </div>
        <p class="sheet__hint">Promote to an authored record to add its origin, spread, and evidence.</p>
      </div>
    </div>`;

  const plate = body.querySelector<HTMLCanvasElement>("#pa-plate");
  if (plate) renderPlant(plate, sp.id, { color, category: sp.category, ink: INK, size: 300 });
}

// --- methodology overlay ---------------------------------------------------
function methodologyOverlay(): string {
  const counts: Record<string, number> = {};
  for (const c of CROPS) counts[c.maturity] = (counts[c.maturity] ?? 0) + 1;
  counts["baseline"] = (counts["baseline"] ?? 0) + INDEX_SPECIES.length;
  const total = CROPS.length + INDEX_SPECIES.length;
  const totalClaims = CROPS.reduce((n, c) => n + (c.claims?.length ?? 0), 0);
  const approved = CROPS.reduce((n, c) => n + (c.claims?.filter((cl) => cl.review === "approved").length ?? 0), 0);

  const tiers = MATURITY.map(
    (m) => `
    <div class="mtier" style="--badge:${m.color}">
      <div class="mtier__head"><span class="badge__dot"></span><span class="mtier__label">${m.label}</span><span class="mtier__count">${counts[m.id] ?? 0}</span></div>
      <p class="mtier__note">${esc(m.note)}</p>
    </div>`,
  ).join("");

  const sourceList = SOURCES.map((s, i) => `<li><span class="ref">${i + 1}</span> ${esc(s.citation)}</li>`).join("");

  return `
  <div class="methodology" id="pa-method" role="dialog" aria-modal="true" aria-label="About and methodology" hidden>
    <div class="methodology__scrim" data-close></div>
    <div class="methodology__card">
      <button class="sheet__close" id="pa-method-close" aria-label="Close">✕</button>
      <span class="label">How to read this atlas</span>
      <h2 class="methodology__title">Evidence before spectacle</h2>
      <p class="methodology__lede">Every specimen is drawn as a generative botanical plate. But structural
      completeness is not researched depth: only some records are individually authored, and only a few carry a
      formal packet of source-linked claims. This atlas keeps those limits visible.</p>

      <span class="label">The collection</span>
      <div class="mstats">
        <div class="mstat"><div class="mstat__v">${total}</div><div class="mstat__k">Specimens</div></div>
        <div class="mstat"><div class="mstat__v">${counts["flagship"] ?? 0}</div><div class="mstat__k">Flagship packets</div></div>
        <div class="mstat"><div class="mstat__v">${totalClaims}</div><div class="mstat__k">Source-linked claims</div></div>
        <div class="mstat"><div class="mstat__v">${approved}</div><div class="mstat__k">Expert-approved</div></div>
      </div>

      <span class="label">Research maturity</span>
      <div class="mtiers">${tiers}</div>

      <span class="label">What the plates and maps do and do not claim</span>
      <ul class="mdisclose">
        <li>Botanical plates are <strong>generative signatures</strong>, not exact botanical reconstructions.</li>
        <li>Origin markers are <strong>representative points</strong> for a centre of origin, not exact sites.</li>
        <li>Spread arcs are <strong>historical corridors</strong>, not reconstructions of every route.</li>
        <li>Dates are <strong>approximate</strong>, and for several crops actively debated.</li>
        <li>Edibility notes are <strong>general reference</strong>, never food-safety or medical advice.</li>
      </ul>

      <span class="label">Source registry</span>
      <ul class="refs__list">${sourceList}</ul>
    </div>
  </div>`;
}
