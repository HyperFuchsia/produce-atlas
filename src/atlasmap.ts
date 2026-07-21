/**
 * Antique-style flat origins map. Replaces the 3-D globe with a quiet
 * equirectangular plate drawn from Natural Earth coastlines — ink land on
 * parchment — showing a crop's centre of origin and its dispersal arcs.
 * Pure SVG: crisp, light, and at home in the herbarium aesthetic.
 */
import countriesRaw from "./data/countries.json?raw";

const W = 360;
const H = 180;

type LngLat = [number, number];
const px = (lng: number) => lng + 180;
const py = (lat: number) => 90 - lat;

let landPath: string | null = null;

/** Build the (memoised) combined land path in equirectangular coords. */
function buildLandPath(): string {
  if (landPath !== null) return landPath;
  const geo = JSON.parse(countriesRaw) as { features?: any[] };
  const parts: string[] = [];
  const ring = (coords: LngLat[]) => {
    let d = "";
    for (let i = 0; i < coords.length; i++) {
      const [lng, lat] = coords[i];
      const x = px(lng).toFixed(1);
      const y = py(lat).toFixed(1);
      d += (i === 0 ? "M" : "L") + x + " " + y;
    }
    return d + "Z";
  };
  for (const f of geo.features || []) {
    if (f.properties?.ISO_A2 === "AQ") continue; // skip Antarctica
    const g = f.geometry;
    if (!g) continue;
    if (g.type === "Polygon") {
      for (const r of g.coordinates) parts.push(ring(r));
    } else if (g.type === "MultiPolygon") {
      for (const poly of g.coordinates) for (const r of poly) parts.push(ring(r));
    }
  }
  landPath = parts.join("");
  return landPath;
}

export interface MapLeg {
  coords: LngLat; // [lat, lng]
  to: string;
}

/**
 * Return SVG markup for a crop's origin plate.
 * @param origin  [lat, lng] of the centre of origin
 * @param legs    dispersal destinations
 * @param color   accent hex for markers/arcs
 */
export function renderOriginMap(
  origin: LngLat,
  legs: MapLeg[],
  color: string,
): string {
  const land = buildLandPath();
  const [oLat, oLng] = origin;
  const ox = px(oLng);
  const oy = py(oLat);

  // graticule every 30°
  let grat = "";
  for (let lng = -150; lng <= 150; lng += 30) grat += `M${px(lng)} 0V${H}`;
  for (let lat = -60; lat <= 60; lat += 30) grat += `M0 ${py(lat)}H${W}`;

  const arcs = legs
    .map((l) => {
      const [dLat, dLng] = l.coords;
      const dx = px(dLng);
      const dy = py(dLat);
      const mx = (ox + dx) / 2;
      const my = (oy + dy) / 2 - Math.hypot(dx - ox, dy - oy) * 0.28;
      return `<path d="M${ox.toFixed(1)} ${oy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${dx.toFixed(1)} ${dy.toFixed(1)}" fill="none" stroke="${color}" stroke-width="0.8" stroke-linecap="round" opacity="0.7"/>` +
        `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="1.4" fill="${color}" opacity="0.85"/>`;
    })
    .join("");

  return `
  <svg class="omap" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Origin and spread map">
    <path d="${grat}" class="omap__grat" />
    <path d="${land}" class="omap__land" />
    ${arcs}
    <circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="4.2" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.7"/>
    <circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="2.1" fill="${color}" />
  </svg>`;
}
