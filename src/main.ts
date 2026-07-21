import "./styles.css";
import { CROPS } from "./data/crops";
import { INDEX_SPECIES } from "./data/speciesIndex";
import { CATEGORY_COLOR } from "./data/categories";
import type { Crop, Category, ListEntry } from "./types";
import { createGlobe, type PointDatum } from "./globe";
import {
  mountChrome,
  renderList,
  renderDetail,
  renderBaselineDetail,
  formatBP,
} from "./ui";
import countriesRaw from "./data/countries.json?raw";

const countries = JSON.parse(countriesRaw) as { features?: any[] };

const app = document.getElementById("app")!;
const globeEl = document.getElementById("globe")!;
const boot = document.getElementById("boot")!;
const bootStatus = document.getElementById("boot-status");

const ui = mountChrome(app);

// -------------------------------------------------------------- state
const state = {
  activeCategories: new Set<Category>(
    Object.keys(CATEGORY_COLOR) as Category[],
  ),
  query: "",
  timeBP: 0,
  selectedId: null as string | null,
};

// Unified lookup + entry model across both tiers.
const CROP_BY_ID = new Map(CROPS.map((c) => [c.id, c]));
const INDEX_BY_ID = new Map(INDEX_SPECIES.map((s) => [s.id, s]));

const ENTRIES: ListEntry[] = [
  ...CROPS.map(
    (c): ListEntry => ({
      id: c.id,
      name: c.name,
      scientificName: c.scientificName,
      family: c.family,
      category: c.category,
      maturity: c.maturity,
      glyph: c.glyph,
      plotted: true,
    }),
  ),
  ...INDEX_SPECIES.map(
    (s): ListEntry => ({
      id: s.id,
      name: s.name,
      scientificName: s.scientificName,
      family: s.family,
      category: s.category,
      maturity: s.maturity,
      plotted: false,
    }),
  ),
];

function entryMatchesTime(id: string): boolean {
  // Baseline entries have no date, so the domestication horizon never hides
  // them; atlas records honour it.
  const crop = CROP_BY_ID.get(id);
  return !crop || crop.domesticatedBP >= state.timeBP;
}

function visibleEntries(): ListEntry[] {
  const q = state.query.trim().toLowerCase();
  return ENTRIES.filter((e) => {
    if (!state.activeCategories.has(e.category)) return false;
    if (!entryMatchesTime(e.id)) return false;
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      e.scientificName.toLowerCase().includes(q) ||
      e.family.toLowerCase().includes(q)
    );
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function visiblePlottedCrops(entries: ListEntry[]): Crop[] {
  const out: Crop[] = [];
  for (const e of entries) {
    const c = CROP_BY_ID.get(e.id);
    if (c) out.push(c);
  }
  return out;
}

// -------------------------------------------------------------- globe
const controller = createGlobe(globeEl, countries);

controller.onHover((crop, x, y) => {
  if (!crop) {
    ui.tip.classList.remove("is-on");
    return;
  }
  ui.tip.innerHTML = `<strong>${crop.glyph} ${crop.name}</strong><em>${crop.scientificName}</em>`;
  ui.tip.style.left = `${x}px`;
  ui.tip.style.top = `${y}px`;
  ui.tip.classList.add("is-on");
});

controller.onSelect((crop) => select(crop.id));

// -------------------------------------------------------------- sync
function pointsFor(crops: Crop[]): PointDatum[] {
  return crops.map((c) => ({
    crop: c,
    lat: c.origin[0],
    lng: c.origin[1],
    color: CATEGORY_COLOR[c.category],
  }));
}

function refresh(): void {
  const entries = visibleEntries();
  ui.count.textContent = `${entries.length} / ${ENTRIES.length}`;
  renderList(ui.list, entries, state.selectedId);
  controller.setPoints(pointsFor(visiblePlottedCrops(entries)));
  // if the selected record fell out of view, close the panel
  if (state.selectedId && !entries.some((e) => e.id === state.selectedId)) {
    closeDetail();
  }
}

function select(id: string): void {
  const crop = CROP_BY_ID.get(id);
  const species = INDEX_BY_ID.get(id);
  if (!crop && !species) return;
  state.selectedId = id;
  renderList(ui.list, visibleEntries(), id);

  if (crop) {
    renderDetail(ui.detailScroll, crop);
    controller.focus(crop);
  } else if (species) {
    renderBaselineDetail(ui.detailScroll, species);
    controller.focus(null); // no origin to fly to
    controller.resume();
  }
  ui.detailScroll.scrollTop = 0;
  ui.detail.classList.add("is-open");
  ui.tip.classList.remove("is-on");
}

function closeDetail(): void {
  state.selectedId = null;
  ui.detail.classList.remove("is-open");
  controller.focus(null);
  controller.resume();
  renderList(ui.list, visibleEntries(), null);
}

// -------------------------------------------------------------- events
ui.searchInput.addEventListener("input", () => {
  state.query = ui.searchInput.value;
  refresh();
});

ui.filters.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest(".chip") as HTMLElement | null;
  if (!btn) return;
  const cat = btn.dataset.cat as Category;
  if (state.activeCategories.has(cat)) {
    // don't allow zero categories — toggling the last one re-selects all
    if (state.activeCategories.size === 1) {
      state.activeCategories = new Set(
        Object.keys(CATEGORY_COLOR) as Category[],
      );
    } else {
      state.activeCategories.delete(cat);
    }
  } else {
    state.activeCategories.add(cat);
  }
  syncChips();
  refresh();
});

function syncChips(): void {
  ui.filters.querySelectorAll<HTMLElement>(".chip").forEach((chip) => {
    const cat = chip.dataset.cat as Category;
    chip.classList.toggle("is-off", !state.activeCategories.has(cat));
  });
}

ui.list.addEventListener("click", (e) => {
  const row = (e.target as HTMLElement).closest(".crop") as HTMLElement | null;
  if (row?.dataset.id) select(row.dataset.id);
});
ui.list.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const row = (e.target as HTMLElement).closest(".crop") as HTMLElement | null;
  if (row?.dataset.id) {
    e.preventDefault();
    select(row.dataset.id);
  }
});

ui.detailClose.addEventListener("click", closeDetail);

ui.timeRange.addEventListener("input", () => {
  state.timeBP = Number(ui.timeRange.value);
  ui.timeVal.textContent =
    state.timeBP === 0 ? "present" : `${formatBP(state.timeBP)} BP`;
  refresh();
});

ui.resetBtn.addEventListener("click", () => {
  state.activeCategories = new Set(Object.keys(CATEGORY_COLOR) as Category[]);
  state.query = "";
  state.timeBP = 0;
  ui.searchInput.value = "";
  ui.timeRange.value = "0";
  ui.timeVal.textContent = "present";
  syncChips();
  closeDetail();
  refresh();
});

// Methodology overlay
function openMethod(): void {
  ui.methodPanel.hidden = false;
  ui.tip.classList.remove("is-on");
  ui.methodClose.focus();
}
function closeMethod(): void {
  ui.methodPanel.hidden = true;
  ui.methodBtn.focus();
}
ui.methodBtn.addEventListener("click", openMethod);
ui.methodClose.addEventListener("click", closeMethod);
ui.methodPanel.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).dataset.close !== undefined) closeMethod();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!ui.methodPanel.hidden) closeMethod();
  else if (state.selectedId) closeDetail();
});

// -------------------------------------------------------------- boot out
refresh();

if (bootStatus) bootStatus.textContent = "Ready";
window.setTimeout(() => boot.classList.add("is-hidden"), 650);
