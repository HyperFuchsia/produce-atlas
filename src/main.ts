import "./styles.css";
import { CROPS } from "./data/crops";
import { CATEGORY_COLOR } from "./data/categories";
import type { Crop, Category } from "./types";
import { createGlobe, type PointDatum } from "./globe";
import { mountChrome, renderList, renderDetail, formatBP } from "./ui";

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

function visibleCrops(): Crop[] {
  const q = state.query.trim().toLowerCase();
  return CROPS.filter((c) => {
    if (!state.activeCategories.has(c.category)) return false;
    if (c.domesticatedBP < state.timeBP) return false;
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.scientificName.toLowerCase().includes(q) ||
      c.family.toLowerCase().includes(q) ||
      c.originRegion.toLowerCase().includes(q) ||
      c.originCenter.toLowerCase().includes(q)
    );
  }).sort((a, b) => a.name.localeCompare(b.name));
}

// -------------------------------------------------------------- globe
const controller = await createGlobe(globeEl, import.meta.env.BASE_URL);

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
  const crops = visibleCrops();
  ui.count.textContent = `${crops.length} / ${CROPS.length}`;
  renderList(ui.list, crops, state.selectedId);
  controller.setPoints(pointsFor(crops));
  // if the selected crop fell out of view, close the panel
  if (state.selectedId && !crops.some((c) => c.id === state.selectedId)) {
    closeDetail();
  }
}

function select(id: string): void {
  const crop = CROPS.find((c) => c.id === id);
  if (!crop) return;
  state.selectedId = id;
  renderList(ui.list, visibleCrops(), id);
  renderDetail(ui.detailScroll, crop);
  ui.detail.classList.add("is-open");
  controller.focus(crop);
  ui.tip.classList.remove("is-on");
}

function closeDetail(): void {
  state.selectedId = null;
  ui.detail.classList.remove("is-open");
  controller.focus(null);
  controller.resume();
  renderList(ui.list, visibleCrops(), null);
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

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.selectedId) closeDetail();
});

// -------------------------------------------------------------- boot out
refresh();

if (bootStatus) bootStatus.textContent = "Ready";
window.setTimeout(() => boot.classList.add("is-hidden"), 650);
