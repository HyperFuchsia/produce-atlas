import Globe, { type GlobeInstance } from "globe.gl";
import * as THREE from "three";
import type { Crop, JourneyChapter } from "./types";
import { CATEGORY_COLOR } from "./data/categories";
import countriesRaw from "./data/countries.json?raw";

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

/**
 * Draw an equirectangular BOTANICAL map texture — parchment ocean, soft sage
 * illustrated continents, ink coastlines, and a faint graticule — the same
 * herbarium aesthetic as the field guide, wrapped onto the 3-D sphere (no
 * satellite imagery).
 */
function generateEarthTexture(): THREE.CanvasTexture {
  const W = 2048, H = 1024;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  const X = (lng: number) => ((lng + 180) / 360) * W;
  const Y = (lat: number) => ((90 - lat) / 180) * H;

  // Parchment ocean with a soft warm wash
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#efe6d2");
  g.addColorStop(0.5, "#e9dfc9");
  g.addColorStop(1, "#e4d8bf");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Faint graticule (illustrated-map ruling)
  ctx.strokeStyle = "rgba(74,64,48,0.10)";
  ctx.lineWidth = 1;
  for (let lng = -150; lng <= 150; lng += 30) { ctx.beginPath(); ctx.moveTo(X(lng), 0); ctx.lineTo(X(lng), H); ctx.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { ctx.beginPath(); ctx.moveTo(0, Y(lat)); ctx.lineTo(W, Y(lat)); ctx.stroke(); }

  const geo = JSON.parse(countriesRaw) as { features?: any[] };
  const drawRing = (coords: [number, number][], close: boolean) => {
    for (let i = 0; i < coords.length; i++) {
      const x = X(coords[i][0]); const y = Y(coords[i][1]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    if (close) ctx.closePath();
  };
  const eachPolygon = (fn: (rings: [number, number][][]) => void) => {
    for (const f of geo.features || []) {
      const gm = f.geometry; if (!gm) continue;
      if (gm.type === "Polygon") fn(gm.coordinates);
      else if (gm.type === "MultiPolygon") for (const poly of gm.coordinates) fn(poly);
    }
  };

  // Land fill (soft sage) — drawn per polygon so holes read acceptably
  ctx.fillStyle = "#aeba98";
  eachPolygon((rings) => { ctx.beginPath(); for (const r of rings) drawRing(r, true); ctx.fill("evenodd"); });
  // A second, slightly deeper sage stipple for subtle relief
  ctx.fillStyle = "rgba(122,140,104,0.16)";
  eachPolygon((rings) => { ctx.beginPath(); drawRing(rings[0], true); ctx.fill(); });
  // Ink coastlines
  ctx.strokeStyle = "rgba(70,58,42,0.5)";
  ctx.lineWidth = 1;
  eachPolygon((rings) => { for (const r of rings) { ctx.beginPath(); drawRing(r, true); ctx.stroke(); } });

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createGlobeWorld(
  el: HTMLElement,
  onSelect: (id: string) => void,
): GlobeWorld {
  const world: GlobeInstance = new Globe(el)
    .backgroundColor("#181712")
    .showAtmosphere(true)
    .atmosphereColor("#d8cca4")
    .atmosphereAltitude(0.16)
    .pointOfView({ lat: 24, lng: 24, altitude: 2.5 });

  // Botanical illustrated globe surface (no satellite texture)
  const mat = world.globeMaterial() as THREE.MeshPhongMaterial;
  mat.map = generateEarthTexture();
  mat.color = new THREE.Color(0xffffff);
  mat.bumpScale = 0;
  mat.shininess = 2;
  mat.specular = new THREE.Color(0x0a0a08);
  mat.needsUpdate = true;

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
    const wrap = document.createElement("div");
    wrap.className = "gpin";
    wrap.dataset.id = d.crop.id;
    wrap.style.setProperty("--cat", CATEGORY_COLOR[d.crop.category]);
    wrap.innerHTML = `
      <div class="gpin__icon">${d.crop.glyph}</div>
      <div class="gpin__stem"></div>
      <div class="gpin__base"></div>`;
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
