import "./styles.css";
import { CROPS } from "./data/crops";
import { INDEX_SPECIES } from "./data/speciesIndex";
import { CATEGORY_COLOR } from "./data/categories";
import type { Category, ListEntry } from "./types";
import {
  mountChrome,
  renderGallery,
  renderCropSheet,
  renderSpeciesSheet,
} from "./ui";

const app = document.getElementById("app")!;
const boot = document.getElementById("boot")!;
const ui = mountChrome(app);

// -------------------------------------------------------------- data
const CROP_BY_ID = new Map(CROPS.map((c) => [c.id, c]));
const INDEX_BY_ID = new Map(INDEX_SPECIES.map((s) => [s.id, s]));

const ENTRIES: ListEntry[] = [
  ...CROPS.map((c): ListEntry => ({
    id: c.id, name: c.name, scientificName: c.scientificName, family: c.family,
    category: c.category, maturity: c.maturity, glyph: c.glyph, plotted: true,
  })),
  ...INDEX_SPECIES.map((s): ListEntry => ({
    id: s.id, name: s.name, scientificName: s.scientificName, family: s.family,
    category: s.category, maturity: s.maturity, plotted: false,
  })),
];

// -------------------------------------------------------------- state
const state = {
  activeCategories: new Set<Category>(Object.keys(CATEGORY_COLOR) as Category[]),
  query: "",
};

function visibleEntries(): ListEntry[] {
  const q = state.query.trim().toLowerCase();
  return ENTRIES.filter((e) => {
    if (!state.activeCategories.has(e.category)) return false;
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      e.scientificName.toLowerCase().includes(q) ||
      e.family.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    // authored/flagship first (they carry the full story), then alphabetical
    const rank = (m: string) => (m === "flagship" ? 0 : m === "authored" ? 1 : 2);
    const r = rank(a.maturity) - rank(b.maturity);
    return r !== 0 ? r : a.name.localeCompare(b.name);
  });
}

function refresh(): void {
  const entries = visibleEntries();
  ui.count.textContent = `${entries.length} of ${ENTRIES.length} specimens`;
  renderGallery(ui.gallery, entries);
}

// -------------------------------------------------------------- sheet
function openSheet(id: string): void {
  const crop = CROP_BY_ID.get(id);
  const species = INDEX_BY_ID.get(id);
  if (crop) renderCropSheet(ui.sheetBody, crop);
  else if (species) renderSpeciesSheet(ui.sheetBody, species);
  else return;
  ui.sheetScrim.classList.add("is-open");
  ui.sheetBody.parentElement!.scrollTop = 0;
  ui.sheetClose.focus();
  document.body.style.overflow = "hidden";
}
function closeSheet(): void {
  ui.sheetScrim.classList.remove("is-open");
  document.body.style.overflow = "";
}

// -------------------------------------------------------------- events
ui.search.addEventListener("input", () => {
  state.query = ui.search.value;
  refresh();
});

ui.filters.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest(".chip") as HTMLElement | null;
  if (!btn) return;
  const cat = btn.dataset.cat as Category;
  const all = new Set(Object.keys(CATEGORY_COLOR) as Category[]);
  if (state.activeCategories.has(cat)) {
    if (state.activeCategories.size === all.size) {
      // first click isolates this category
      state.activeCategories = new Set([cat]);
    } else if (state.activeCategories.size === 1) {
      state.activeCategories = all; // toggling the isolated one restores all
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
  const all = state.activeCategories.size === Object.keys(CATEGORY_COLOR).length;
  ui.filters.querySelectorAll<HTMLElement>(".chip").forEach((chip) => {
    const cat = chip.dataset.cat as Category;
    chip.classList.toggle("is-off", !all && !state.activeCategories.has(cat));
  });
}

ui.gallery.addEventListener("click", (e) => {
  const card = (e.target as HTMLElement).closest(".specimen") as HTMLElement | null;
  if (card?.dataset.id) openSheet(card.dataset.id);
});
ui.gallery.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const card = (e.target as HTMLElement).closest(".specimen") as HTMLElement | null;
  if (card?.dataset.id) { e.preventDefault(); openSheet(card.dataset.id); }
});

ui.sheetClose.addEventListener("click", closeSheet);
ui.sheetScrim.addEventListener("click", (e) => {
  if (e.target === ui.sheetScrim) closeSheet();
});

// Methodology / about
ui.aboutBtn.addEventListener("click", () => {
  ui.methodPanel.hidden = false;
  ui.methodClose.focus();
});
ui.methodClose.addEventListener("click", () => {
  ui.methodPanel.hidden = true;
  ui.aboutBtn.focus();
});
ui.methodPanel.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).dataset.close !== undefined) ui.methodPanel.hidden = true;
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!ui.methodPanel.hidden) ui.methodPanel.hidden = true;
  else if (ui.sheetScrim.classList.contains("is-open")) closeSheet();
});

// -------------------------------------------------------------- boot
refresh();
window.setTimeout(() => boot.classList.add("is-hidden"), 500);
