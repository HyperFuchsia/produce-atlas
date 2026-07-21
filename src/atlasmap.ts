/**
 * Antique-style flat journey map. Ink land on parchment (from Natural Earth
 * coastlines) carrying four *distinct* layers, per the visual handoff:
 *   - ancestral range / earliest evidence  → gold halo at the origin
 *   - domestication centre                 → amber concentric rings
 *   - historical movement                  → routes (solid = strong evidence,
 *                                             dashed = modeled/uncertain)
 *   - present-day production               → soft green regions (separate layer)
 *
 * Movement legs are drawn once and revealed chapter-by-chapter via CSS
 * stroke-dashoffset — the flat-map analogue of a camera gliding along the arc.
 */
import countriesRaw from "./data/countries.json?raw";
import type { JourneyChapter, ProductionRegion } from "./types";

const W = 360;
const H = 180;
const px = (lng: number) => lng + 180;
const py = (lat: number) => 90 - lat;

let landPath: string | null = null;
function buildLandPath(): string {
  if (landPath !== null) return landPath;
  const geo = JSON.parse(countriesRaw) as { features?: any[] };
  const parts: string[] = [];
  const ring = (coords: [number, number][]) => {
    let d = "";
    for (let i = 0; i < coords.length; i++) {
      d += (i === 0 ? "M" : "L") + px(coords[i][0]).toFixed(1) + " " + py(coords[i][1]).toFixed(1);
    }
    return d + "Z";
  };
  for (const f of geo.features || []) {
    if (f.properties?.ISO_A2 === "AQ") continue;
    const g = f.geometry;
    if (!g) continue;
    if (g.type === "Polygon") for (const r of g.coordinates) parts.push(ring(r));
    else if (g.type === "MultiPolygon") for (const poly of g.coordinates) for (const r of poly) parts.push(ring(r));
  }
  landPath = parts.join("");
  return landPath;
}

function arc(from: [number, number], to: [number, number]): string {
  const ox = px(from[1]), oy = py(from[0]);
  const dx = px(to[1]), dy = py(to[0]);
  const mx = (ox + dx) / 2;
  const my = (oy + dy) / 2 - Math.hypot(dx - ox, dy - oy) * 0.28;
  return `M${ox.toFixed(1)} ${oy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${dx.toFixed(1)} ${dy.toFixed(1)}`;
}

/**
 * Full journey-map SVG. All movement legs are present but hidden; call
 * `applyReveal` to show chapters up to a given index.
 */
export function renderJourneyMap(
  chapters: JourneyChapter[],
  production: ProductionRegion[],
  color: string,
): string {
  const land = buildLandPath();
  const origin = chapters[0]?.coords ?? [0, 0];
  const ox = px(origin[1]).toFixed(1);
  const oy = py(origin[0]).toFixed(1);

  let grat = "";
  for (let lng = -150; lng <= 150; lng += 30) grat += `M${px(lng)} 0V${H}`;
  for (let lat = -60; lat <= 60; lat += 30) grat += `M0 ${py(lat)}H${W}`;

  const prod = production
    .map((p) => `<circle cx="${px(p.coords[1]).toFixed(1)}" cy="${py(p.coords[0]).toFixed(1)}" r="9" class="omap__prod-r"/>`)
    .join("");

  const movement = chapters
    .filter((c) => c.index >= 1 && c.eventType !== "production")
    .map((c) => {
      const dashed = c.confidence === "modeled";
      const dx = px(c.coords[1]).toFixed(1);
      const dy = py(c.coords[0]).toFixed(1);
      return `<path class="oleg${dashed ? " oleg--modeled" : ""}" data-ch="${c.index}" d="${arc(c.from, c.coords)}" pathLength="1" style="stroke:${color}"/>` +
        `<circle class="odest" data-ch="${c.index}" cx="${dx}" cy="${dy}" r="1.6" style="fill:${color}"/>`;
    })
    .join("");

  return `
  <svg class="jmap" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Journey map" style="--accent:${color}">
    <path d="${grat}" class="omap__grat"/>
    <path d="${land}" class="omap__land"/>
    <g class="omap__prod">${prod}</g>
    ${movement}
    <g class="omap__origin">
      <circle cx="${ox}" cy="${oy}" r="7" class="omap__halo"/>
      <circle cx="${ox}" cy="${oy}" r="4.4" class="omap__ring"/>
      <circle cx="${ox}" cy="${oy}" r="2.6" class="omap__ring"/>
      <circle cx="${ox}" cy="${oy}" r="1.9" style="fill:${color}"/>
    </g>
  </svg>`;
}

/** Reveal chapters 1..revealIndex; toggle production; highlight the current leg. */
export function applyReveal(
  svg: SVGSVGElement,
  chapters: JourneyChapter[],
  revealIndex: number,
): void {
  const prodChapter = chapters.find((c) => c.eventType === "production");
  const prodOn = prodChapter ? revealIndex >= prodChapter.index : false;
  svg.querySelector(".omap__prod")?.classList.toggle("is-on", prodOn);

  svg.querySelectorAll<SVGPathElement>(".oleg").forEach((p) => {
    const ch = Number(p.dataset.ch);
    p.classList.toggle("is-drawn", ch <= revealIndex);
    p.classList.toggle("is-current", ch === revealIndex);
  });
  svg.querySelectorAll<SVGCircleElement>(".odest").forEach((c) => {
    const ch = Number(c.dataset.ch);
    c.classList.toggle("is-on", ch <= revealIndex);
    c.classList.toggle("is-current", ch === revealIndex);
  });
}
