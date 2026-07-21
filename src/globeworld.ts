import Globe, { type GlobeInstance } from "globe.gl";
import type { Crop, JourneyChapter } from "./types";
import { CATEGORY_COLOR } from "./data/categories";
import { renderPlant } from "./plant";
import dayTex from "./assets/earth-day.jpg";
import bumpTex from "./assets/earth-bump.png";
import skyTex from "./assets/night-sky.png";

/** Layer colours, matching the concept art. */
export const LAYER = {
  origin: "#f0a838", // wild origin — gold
  domestication: "#b884e6", // domestication — violet
  spread: "#4bc4e6", // historical movement — cyan
  production: "#74c56a", // modern production — green
};

type Marker =
  | { kind: "crop"; crop: Crop }
  | { kind: "stop"; chapter: JourneyChapter; color: string };

export interface GlobeWorld {
  setCrops(crops: Crop[]): void;
  focus(lat: number, lng: number, altitude?: number, ms?: number): void;
  startJourney(crop: Crop, chapters: JourneyChapter[]): void;
  revealTo(chapters: JourneyChapter[], index: number): void;
  endJourney(): void;
}

export function createGlobeWorld(
  el: HTMLElement,
  onSelect: (id: string) => void,
): GlobeWorld {
  const world: GlobeInstance = new Globe(el)
    .globeImageUrl(dayTex)
    .bumpImageUrl(bumpTex)
    .backgroundImageUrl(skyTex)
    .showAtmosphere(true)
    .atmosphereColor("#8fb7ff")
    .atmosphereAltitude(0.2)
    .pointOfView({ lat: 24, lng: 24, altitude: 2.5 });

  const controls = world.controls() as any;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.25;
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minDistance = 180;
  controls.maxDistance = 700;
  el.addEventListener("pointerdown", () => (controls.autoRotate = false));

  let crops: Crop[] = [];
  let selected: Crop | null = null;

  // ---- HTML markers (produce pins + numbered stops share one layer) ----
  world
    .htmlElementsData([])
    .htmlLat((d: any) => (d.kind === "crop" ? d.crop.origin[0] : d.chapter.coords[0]))
    .htmlLng((d: any) => (d.kind === "crop" ? d.crop.origin[1] : d.chapter.coords[1]))
    .htmlElement((d: any) => buildMarker(d, onSelect));

  // ---- Arc layer (dispersal routes) ----
  world
    .arcColor((a: any) => a.color)
    .arcAltitudeAutoScale(0.45)
    .arcStroke((a: any) => (a.dashed ? 0.5 : 0.7))
    .arcDashLength((a: any) => (a.dashed ? 0.4 : 1))
    .arcDashGap((a: any) => (a.dashed ? 0.25 : 0))
    .arcDashInitialGap(1)
    .arcDashAnimateTime(1400)
    .arcsTransitionDuration(1000)
    .arcsData([]);

  // ---- Ring pulse at the active stop ----
  world
    .ringColor((r: any) => () => r.color)
    .ringMaxRadius(3.2)
    .ringPropagationSpeed(1.6)
    .ringRepeatPeriod(700)
    .ringsData([]);

  const resize = () => world.width(el.clientWidth).height(el.clientHeight);
  resize();
  window.addEventListener("resize", resize);

  function renderMarkers(data: Marker[]): void {
    world.htmlElementsData(data as any);
  }

  return {
    setCrops(next) {
      crops = next;
      if (!selected) renderMarkers(crops.map((c) => ({ kind: "crop", crop: c })));
    },

    focus(lat, lng, altitude = 1.9, ms = 1200) {
      controls.autoRotate = false;
      world.pointOfView({ lat, lng, altitude }, ms);
    },

    startJourney(crop, chapters) {
      selected = crop;
      controls.autoRotate = false;
      // only the selected crop's pin + its numbered stops remain
      const markers: Marker[] = [{ kind: "crop", crop }];
      for (const ch of chapters) {
        if (ch.index === 0) continue; // origin shares the crop pin
        markers.push({ kind: "stop", chapter: ch, color: layerColor(ch) });
      }
      renderMarkers(markers);
      world.arcsData([]).ringsData([]);
    },

    revealTo(chapters, index) {
      const arcs = chapters
        .filter((c) => c.index >= 1 && c.index <= index && c.eventType !== "production")
        .map((c) => ({
          startLat: c.from[0], startLng: c.from[1],
          endLat: c.coords[0], endLng: c.coords[1],
          color: layerColor(c),
          dashed: c.confidence === "modeled",
        }));
      world.arcsData(arcs);

      const cur = chapters[index];
      if (cur) {
        world.ringsData([{ lat: cur.coords[0], lng: cur.coords[1], color: layerColor(cur) }]);
        const far = index > 0 && dist(cur.from, cur.coords) > 60;
        world.pointOfView({ lat: cur.coords[0], lng: cur.coords[1], altitude: far ? 2.3 : 1.75 }, 1400);
      }
      // highlight the current numbered stop
      el.querySelectorAll<HTMLElement>(".gstop").forEach((s) => {
        s.classList.toggle("is-current", Number(s.dataset.i) === index);
        s.classList.toggle("is-past", Number(s.dataset.i) < index);
      });
    },

    endJourney() {
      selected = null;
      world.arcsData([]).ringsData([]);
      renderMarkers(crops.map((c) => ({ kind: "crop", crop: c })));
      controls.autoRotate = true;
      world.pointOfView({ altitude: 2.5 }, 1000);
    },
  };
}

function layerColor(ch: JourneyChapter): string {
  if (ch.eventType === "production") return LAYER.production;
  if (ch.eventType === "domestication" || ch.eventType === "ancestry") return LAYER.domestication;
  return LAYER.spread;
}

function dist(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function buildMarker(d: Marker, onSelect: (id: string) => void): HTMLElement {
  if (d.kind === "crop") {
    const color = CATEGORY_COLOR[d.crop.category];
    const wrap = document.createElement("div");
    wrap.className = "gpin";
    wrap.dataset.id = d.crop.id;
    wrap.style.setProperty("--cat", color);
    wrap.innerHTML = `
      <div class="gpin__tag"><canvas class="gpin__plate"></canvas></div>
      <div class="gpin__stem"></div>
      <div class="gpin__base"></div>`;
    // The botanical plate is the icon — the herbarium illustration on the Earth.
    const cv = wrap.querySelector<HTMLCanvasElement>("canvas")!;
    renderPlant(cv, d.crop.id, { color, category: d.crop.category, ink: "#2c2620", size: 58 });
    wrap.title = `${d.crop.name} — ${d.crop.scientificName}`;
    wrap.addEventListener("click", (e) => { e.stopPropagation(); onSelect(d.crop.id); });
    return wrap;
  }
  // numbered stop
  const s = document.createElement("div");
  s.className = "gstop";
  s.dataset.i = String(d.chapter.index);
  s.style.setProperty("--c", d.color);
  s.textContent = String(d.chapter.index + 1);
  return s;
}
