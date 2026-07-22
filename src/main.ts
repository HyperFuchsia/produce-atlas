import "./styles.css";
import { CROPS } from "./data/crops";
import { INDEX_SPECIES } from "./data/speciesIndex";
import { CATEGORY_COLOR } from "./data/categories";
import type { Category, ListEntry } from "./types";
import { createGlobeWorld } from "./globeworld";
import { mountBackdrop } from "./backdrop";
import { buildChapters } from "./journey";
import { Ride } from "./ride";
import {
  mountChrome,
  renderGallery,
  renderCropSheet,
  renderSpeciesSheet,
} from "./ui";

const app = document.getElementById("app")!;
const globeEl = document.getElementById("globe")!;
const boot = document.getElementById("boot")!;
const ui = mountChrome(app);

const CROP_BY_ID = new Map(CROPS.map((c) => [c.id, c]));
const INDEX_BY_ID = new Map(INDEX_SPECIES.map((s) => [s.id, s]));
const ENTRIES: ListEntry[] = [
  ...CROPS.map((c): ListEntry => ({ id: c.id, name: c.name, scientificName: c.scientificName, family: c.family, category: c.category, maturity: c.maturity, glyph: c.glyph, plotted: true })),
  ...INDEX_SPECIES.map((s): ListEntry => ({ id: s.id, name: s.name, scientificName: s.scientificName, family: s.family, category: s.category, maturity: s.maturity, plotted: false })),
];

// -------------------------------------------------------------- globe
mountBackdrop();
const globe = createGlobeWorld(globeEl, (id) => selectCrop(id));
globe.setCrops(CROPS);

// -------------------------------------------------------------- selection + ride
let ride: Ride | null = null;
let selectedId: string | null = null;

function selectCrop(id: string, chapter = 0, updateHash = true): void {
  const crop = CROP_BY_ID.get(id);
  if (!crop) return;
  ride?.destroy();
  selectedId = id;
  const chapters = buildChapters(crop);
  globe.startJourney(crop, chapters);

  ride = new Ride(
    chapters,
    { caption: ui.cap, capBody: ui.capBody, capClose: ui.capClose, timeline: ui.timeline, play: ui.play, prev: ui.prev, next: ui.next, pace: ui.pace },
    { onReveal: (i) => globe.revealTo(chapters, i), onSeek: (i) => setHash(id, i) },
  );
  // Persistent identity — the crop's name and scientific name stay visible for
  // the whole journey, on every chapter and on mobile where the top bar title
  // is hidden. Set via textContent so any name is safe to render.
  ui.capIdent.innerHTML = "";
  const cropName = document.createElement("div");
  cropName.className = "cap__cropname";
  cropName.textContent = crop.name;
  const cropSci = document.createElement("div");
  cropSci.className = "cap__cropsci";
  cropSci.textContent = crop.scientificName;
  ui.capIdent.append(cropName, cropSci);

  ui.cap.hidden = false;
  ride.showCaption();
  if (chapter > 0) ride.seek(chapter);

  ui.dock.hidden = false;
  ui.hint.hidden = true;
  ui.title.textContent = `${crop.name} — Historical Lineage`;
  if (updateHash) setHash(id, chapter);
}

function deselect(): void {
  ride?.destroy();
  ride = null;
  selectedId = null;
  globe.endJourney();
  ui.dock.hidden = true;
  ui.hint.hidden = false;
  ui.title.textContent = "Origins World";
  history.replaceState(null, "", location.pathname + location.search);
}

ui.detailsBtn.addEventListener("click", () => {
  if (selectedId) openSheet(selectedId);
});

// -------------------------------------------------------------- sheet + produce-to-produce nav
/** Shared ordering: flagship, then authored, then baseline; alphabetical within. */
const bySort = (a: ListEntry, b: ListEntry): number => {
  const rank = (m: string) => (m === "flagship" ? 0 : m === "authored" ? 1 : 2);
  return rank(a.maturity) - rank(b.maturity) || a.name.localeCompare(b.name);
};
const ENTRIES_SORTED = [...ENTRIES].sort(bySort);
let navContext: ListEntry[] = ENTRIES_SORTED;
let navIndex = -1;

function openSheet(id: string, resetNav = true): void {
  const crop = CROP_BY_ID.get(id);
  const species = INDEX_BY_ID.get(id);
  if (crop) renderCropSheet(ui.sheetBody, crop);
  else if (species) renderSpeciesSheet(ui.sheetBody, species);
  else return;
  // Navigation context: flip within the current Explore filter when the record
  // belongs to it, otherwise across the whole collection. Kept stable while
  // stepping so prev/next don't jump around.
  if (resetNav) {
    const filtered = visibleEntries();
    navContext = filtered.some((e) => e.id === id) ? filtered : ENTRIES_SORTED;
  }
  navIndex = navContext.findIndex((e) => e.id === id);
  updateSheetNav();
  ui.sheetScrim.classList.add("is-open");
  ui.sheetScrim.scrollTop = 0;
  ui.sheetClose.focus();
}
function updateSheetNav(): void {
  const total = navContext.length;
  ui.sheetPos.textContent = navIndex >= 0 ? `${navIndex + 1} / ${total}` : "";
  ui.sheetPrev.disabled = navIndex <= 0;
  ui.sheetNext.disabled = navIndex < 0 || navIndex >= total - 1;
}
function sheetStep(d: number): void {
  if (navIndex < 0) return;
  const j = navIndex + d;
  if (j < 0 || j >= navContext.length) return;
  openSheet(navContext[j].id, false);
}
function closeSheet(): void { ui.sheetScrim.classList.remove("is-open"); }
ui.sheetClose.addEventListener("click", closeSheet);
ui.sheetPrev.addEventListener("click", () => sheetStep(-1));
ui.sheetNext.addEventListener("click", () => sheetStep(1));
ui.sheetScrim.addEventListener("click", (e) => { if (e.target === ui.sheetScrim) closeSheet(); });
// Swipe left/right to flip between specimens on touch devices.
let touchX = 0, touchY = 0;
ui.sheetScrim.addEventListener("touchstart", (e) => { const t = e.changedTouches[0]; touchX = t.clientX; touchY = t.clientY; }, { passive: true });
ui.sheetScrim.addEventListener("touchend", (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchX, dy = t.clientY - touchY;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) sheetStep(dx < 0 ? 1 : -1);
}, { passive: true });

// -------------------------------------------------------------- explore gallery
const filterState = { activeCategories: new Set<Category>(Object.keys(CATEGORY_COLOR) as Category[]), query: "" };
function visibleEntries(): ListEntry[] {
  const q = filterState.query.trim().toLowerCase();
  return ENTRIES.filter((e) => {
    if (!filterState.activeCategories.has(e.category)) return false;
    if (!q) return true;
    return e.name.toLowerCase().includes(q) || e.scientificName.toLowerCase().includes(q) || e.family.toLowerCase().includes(q);
  }).sort(bySort);
}
function refreshGallery(): void {
  const entries = visibleEntries();
  ui.count.textContent = `${entries.length} of ${ENTRIES.length} specimens`;
  renderGallery(ui.gallery, entries);
}
function openExplore(): void {
  refreshGallery();
  ui.exploreScrim.classList.add("is-open");
  ui.search.focus();
}
function closeExplore(): void { ui.exploreScrim.classList.remove("is-open"); }

ui.exploreBtn.addEventListener("click", openExplore);
ui.exploreClose.addEventListener("click", closeExplore);
ui.search.addEventListener("input", () => { filterState.query = ui.search.value; refreshGallery(); });
ui.filters.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest(".chip") as HTMLElement | null;
  if (!btn) return;
  const cat = btn.dataset.cat as Category;
  const all = new Set(Object.keys(CATEGORY_COLOR) as Category[]);
  if (filterState.activeCategories.has(cat)) {
    if (filterState.activeCategories.size === all.size) filterState.activeCategories = new Set([cat]);
    else if (filterState.activeCategories.size === 1) filterState.activeCategories = all;
    else filterState.activeCategories.delete(cat);
  } else filterState.activeCategories.add(cat);
  const isAll = filterState.activeCategories.size === all.size;
  ui.filters.querySelectorAll<HTMLElement>(".chip").forEach((c) => c.classList.toggle("is-off", !isAll && !filterState.activeCategories.has(c.dataset.cat as Category)));
  refreshGallery();
});
ui.gallery.addEventListener("click", (e) => onGalleryPick(e));
ui.gallery.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onGalleryPick(e); } });
function onGalleryPick(e: Event): void {
  const card = (e.target as HTMLElement).closest(".specimen") as HTMLElement | null;
  const id = card?.dataset.id;
  if (!id) return;
  if (CROP_BY_ID.has(id)) { closeExplore(); selectCrop(id); }
  else openSheet(id);
}

// -------------------------------------------------------------- about / home
ui.aboutBtn.addEventListener("click", () => { ui.methodPanel.hidden = false; ui.methodClose.focus(); });
ui.methodClose.addEventListener("click", () => { ui.methodPanel.hidden = true; });
ui.methodPanel.addEventListener("click", (e) => { if ((e.target as HTMLElement).dataset.close !== undefined) ui.methodPanel.hidden = true; });
ui.homeBtn.addEventListener("click", () => { closeExplore(); closeSheet(); deselect(); });

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!ui.methodPanel.hidden) ui.methodPanel.hidden = true;
    else if (ui.sheetScrim.classList.contains("is-open")) closeSheet();
    else if (ui.exploreScrim.classList.contains("is-open")) closeExplore();
    else if (selectedId) deselect();
    return;
  }
  // Arrow keys flip between specimens while the reading sheet is open.
  if (ui.sheetScrim.classList.contains("is-open")) {
    if (e.key === "ArrowLeft") { e.preventDefault(); sheetStep(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); sheetStep(1); }
  }
});

// -------------------------------------------------------------- URL sync
function setHash(id: string, chapter: number): void {
  const h = chapter > 0 ? `#${id}/${chapter}` : `#${id}`;
  if (location.hash !== h) history.replaceState(null, "", h);
}
function openFromHash(): void {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (!raw) return;
  const [id, ch] = raw.split("/");
  if (CROP_BY_ID.has(id)) selectCrop(id, Number(ch) || 0, false);
  else if (INDEX_BY_ID.has(id)) openSheet(id);
}
window.addEventListener("hashchange", openFromHash);

// -------------------------------------------------------------- boot
openFromHash();
window.setTimeout(() => boot.classList.add("is-hidden"), 900);
