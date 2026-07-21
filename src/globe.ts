import Globe, { type GlobeInstance } from "globe.gl";
import * as THREE from "three";
import type { Crop } from "./types";
import { CATEGORY_COLOR } from "./data/categories";

export interface PointDatum {
  crop: Crop;
  lat: number;
  lng: number;
  color: string;
}

export interface ArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: [string, string];
}

export interface RingDatum {
  lat: number;
  lng: number;
  color: string;
}

export interface LabelDatum {
  lat: number;
  lng: number;
  text: string;
  color: string;
  size: number;
}

export interface GlobeController {
  setPoints(points: PointDatum[]): void;
  focus(crop: Crop | null): void;
  onHover(cb: (crop: Crop | null, x: number, y: number) => void): void;
  onSelect(cb: (crop: Crop) => void): void;
  resume(): void;
}

const hexColor = (v: number) => `rgba(120,140,170,${v})`;

export async function createGlobe(
  el: HTMLElement,
  baseUrl: string,
): Promise<GlobeController> {
  const world = new Globe(el)
    .backgroundColor("rgba(0,0,0,0)")
    .showGlobe(true)
    .showGraticules(true)
    .showAtmosphere(true)
    .atmosphereColor("#4a6fb0")
    .atmosphereAltitude(0.26)
    .pointOfView({ lat: 22, lng: 20, altitude: 2.6 });

  // Deep, matte ocean sphere.
  const mat = world.globeMaterial() as THREE.MeshPhongMaterial;
  mat.color = new THREE.Color("#0a1526");
  mat.emissive = new THREE.Color("#050a14");
  mat.emissiveIntensity = 0.9;
  mat.shininess = 6;

  // Soften default lighting and add a warm rim for depth.
  const rim = new THREE.DirectionalLight(0xffe6b0, 0.55);
  rim.position.set(-1, 0.4, -0.8);
  world.scene().add(rim);

  // Dotted land — premium "data globe" look.
  try {
    const res = await fetch(`${baseUrl}data/countries.geojson`);
    const geo = await res.json();
    const features = (geo.features || []).filter(
      (f: any) => f.properties?.ISO_A2 !== "AQ", // drop Antarctica clutter
    );
    world
      .hexPolygonsData(features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.32)
      .hexPolygonUseDots(true)
      .hexPolygonColor(() => hexColor(0.55))
      .hexPolygonAltitude(0.006);
  } catch {
    /* land layer is decorative; ignore fetch failures */
  }

  // Controls: gentle auto-rotation until the user engages.
  const controls = world.controls() as any;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.28;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 140;
  controls.maxDistance = 600;
  const stopSpin = () => (controls.autoRotate = false);
  el.addEventListener("pointerdown", stopSpin);
  el.addEventListener("wheel", stopSpin, { passive: true });

  // ---- Layer configuration --------------------------------------------
  world
    .pointsData([])
    .pointLat((d: any) => d.lat)
    .pointLng((d: any) => d.lng)
    .pointColor((d: any) => d.color)
    .pointAltitude(0.012)
    .pointRadius(0.34)
    .pointsMerge(false)
    .pointResolution(18)
    .pointsTransitionDuration(700);

  world
    .arcColor((d: any) => d.color)
    .arcAltitudeAutoScale(0.42)
    .arcStroke(0.45)
    .arcDashLength(0.55)
    .arcDashGap(0.35)
    .arcDashInitialGap(() => Math.random())
    .arcDashAnimateTime(2600)
    .arcsTransitionDuration(400)
    .arcsData([]);

  world
    .ringColor((d: any) => (t: number) => {
      // fade the pulse ring out as it expands
      const base = d.color as string;
      return base + colorAlpha(1 - t);
    })
    .ringMaxRadius(5)
    .ringPropagationSpeed(2.4)
    .ringRepeatPeriod(900)
    .ringAltitude(0.014)
    .ringsData([]);

  world
    .labelLat((d: any) => d.lat)
    .labelLng((d: any) => d.lng)
    .labelText((d: any) => d.text)
    .labelColor((d: any) => d.color)
    .labelSize((d: any) => d.size)
    .labelDotRadius(0.24)
    .labelResolution(2)
    .labelAltitude(0.014)
    .labelsData([]);

  // Resize handling
  const resize = () => world.width(el.clientWidth).height(el.clientHeight);
  resize();
  window.addEventListener("resize", resize);

  // ---- Public controller ----------------------------------------------
  let points: PointDatum[] = [];
  let selected: Crop | null = null;

  const applyPoints = () => world.pointsData(points as any);

  const controller: GlobeController = {
    setPoints(next) {
      points = next;
      applyPoints();
      // keep focus layers consistent with the visible set
      if (selected && !points.some((p) => p.crop.id === selected!.id)) {
        controller.focus(null);
      }
    },

    focus(crop) {
      selected = crop;
      if (!crop) {
        world.arcsData([]).ringsData([]).labelsData([]);
        return;
      }
      controls.autoRotate = false;

      const color = CATEGORY_COLOR[crop.category];
      const arcs: ArcDatum[] = crop.spread.map((leg) => ({
        startLat: crop.origin[0],
        startLng: crop.origin[1],
        endLat: leg.coords[0],
        endLng: leg.coords[1],
        color: [color, hexColor(0.15)],
      }));
      const rings: RingDatum[] = [
        { lat: crop.origin[0], lng: crop.origin[1], color },
      ];
      const labels: LabelDatum[] = [
        {
          lat: crop.origin[0],
          lng: crop.origin[1],
          text: crop.name,
          color: "#f4f1ea",
          size: 1.15,
        },
        ...crop.spread.map((leg) => ({
          lat: leg.coords[0],
          lng: leg.coords[1],
          text: leg.to,
          color: "rgba(244,241,234,0.65)",
          size: 0.7,
        })),
      ];

      world.arcsData(arcs as any).ringsData(rings as any).labelsData(labels as any);
      world.pointOfView(
        { lat: crop.origin[0], lng: crop.origin[1], altitude: 1.9 },
        1200,
      );
    },

    onHover(cb) {
      world.onPointHover((pt: any, prev: any) => {
        el.style.cursor = pt ? "pointer" : "grab";
        if (pt) {
          const { x, y } = screenXY(world, pt.lat, pt.lng);
          cb(pt.crop, x, y);
        } else if (prev) {
          cb(null, 0, 0);
        }
      });
    },

    onSelect(cb) {
      world.onPointClick((pt: any) => {
        if (pt?.crop) cb(pt.crop);
      });
    },

    resume() {
      controls.autoRotate = true;
    },
  };

  el.style.cursor = "grab";
  return controller;
}

/** two-hex-digit alpha suffix for #rrggbb -> #rrggbbaa */
function colorAlpha(t: number): string {
  const a = Math.max(0, Math.min(1, t));
  return Math.round(a * 255)
    .toString(16)
    .padStart(2, "0");
}

/** Project a lat/lng to screen pixels for tooltip placement. */
function screenXY(world: GlobeInstance, lat: number, lng: number) {
  const coords = (world as any).getScreenCoords?.(lat, lng, 0.012);
  if (coords) return { x: coords.x, y: coords.y };
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}
