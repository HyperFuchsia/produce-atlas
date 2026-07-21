import type {
  Crop,
  JourneyChapter,
  ProductionRegion,
  MovementConfidence,
  EventType,
} from "./types";

/**
 * Journey enrichment for flagship crops — the "chapter" detail the visual
 * handoff asks for (mechanism, confidence, event type, modern reference, and a
 * note on what happened) plus a present-day production layer. Kept as an
 * overlay so the base records stay simple; runtime `buildChapters` merges it.
 *
 * Uses historical-language discipline: ancestral range / domestication centre /
 * documented movement — never "discovered".
 */
interface LegDetail {
  mechanism?: string;
  confidence?: MovementConfidence;
  eventType?: EventType;
  modernRef?: string;
  note?: string;
}
interface Overlay {
  ancestralNote?: string;
  datePrecision?: string;
  production?: ProductionRegion[];
  /** keyed by the leg's `to` label */
  legs?: Record<string, LegDetail>;
}

const OVERLAY: Record<string, Overlay> = {
  apple: {
    ancestralNote:
      "Ancestral range in the wild fruit forests of the Tian Shan (Malus sieversii).",
    datePrecision: "range",
    production: [
      { region: "China", coords: [34, 108] },
      { region: "United States", coords: [44, -120] },
      { region: "Europe", coords: [50, 10] },
      { region: "Türkiye", coords: [39, 35] },
    ],
    legs: {
      "Persia & the Near East": { mechanism: "Silk Road trade", confidence: "strong", eventType: "diversification", modernRef: "modern Iran", note: "Grafting and trade along early Silk Road routes broadened the cultivated apple." },
      "Greece & Rome": { mechanism: "cultivation", confidence: "strong", eventType: "cultivation", modernRef: "modern Italy", note: "Classical orchards propagated named varieties by grafting." },
      "Western Europe": { mechanism: "cultivation", confidence: "strong", eventType: "cultivation", modernRef: "modern France", note: "Roman and monastic orchards carried the apple across Europe." },
      "The Americas": { mechanism: "colonial transfer", confidence: "strong", eventType: "transfer", modernRef: "modern USA", note: "European settlers introduced apples to North America in the 17th century." },
    },
  },
  banana: {
    ancestralNote:
      "Ancestral range in the wild Musa acuminata of New Guinea and Island SE Asia.",
    datePrecision: "documented by",
    production: [
      { region: "India", coords: [20, 78] },
      { region: "Ecuador & Latin America", coords: [-1, -78] },
      { region: "Philippines", coords: [12, 122] },
      { region: "West & Central Africa", coords: [2, 20] },
    ],
    legs: {
      "Island Southeast Asia": { mechanism: "Austronesian migration", confidence: "strong", eventType: "cultivation", modernRef: "modern Indonesia", note: "Austronesian farming communities carried edible bananas across the islands." },
      "South Asia": { mechanism: "exchange network", confidence: "strong", eventType: "transfer", modernRef: "modern India", note: "Cultivation documented across South Asia by the first millennium BCE." },
      "East Africa": { mechanism: "Indian Ocean exchange", confidence: "modeled", eventType: "transfer", modernRef: "modern Uganda", note: "Phytolith evidence suggests early arrival in East Africa, though timing is debated." },
      "The Americas": { mechanism: "colonial transfer", confidence: "strong", eventType: "transfer", modernRef: "modern Colombia", note: "Introduced to the Caribbean and mainland Americas in the 16th century." },
    },
  },
  potato: {
    ancestralNote:
      "Ancestral range in the wild Solanum brevicaule complex of the high Andes.",
    datePrecision: "range",
    production: [
      { region: "China", coords: [34, 108] },
      { region: "India", coords: [26, 80] },
      { region: "Europe", coords: [52, 20] },
      { region: "North America", coords: [43, -95] },
    ],
    legs: {
      "Spain & Europe": { mechanism: "colonial transfer", confidence: "strong", eventType: "transfer", modernRef: "modern Spain", note: "Spanish ships carried Andean potatoes to Europe in the later 16th century." },
      "British Isles": { mechanism: "cultivation", confidence: "strong", eventType: "cultivation", modernRef: "modern Ireland", note: "The potato became a staple field crop across the British Isles." },
      "South & East Asia": { mechanism: "trade", confidence: "modeled", eventType: "transfer", modernRef: "modern India", note: "European trade routes carried the potato into Asia; exact timing varies by region." },
      "North America": { mechanism: "return migration", confidence: "strong", eventType: "transfer", modernRef: "modern USA", note: "Reintroduced to North America by European settlers in the 18th century." },
    },
  },
  tomato: {
    ancestralNote:
      "Ancestral range in wild cherry-type tomatoes of western South America.",
    datePrecision: "approximate",
    production: [
      { region: "China", coords: [34, 112] },
      { region: "India", coords: [22, 78] },
      { region: "Mediterranean", coords: [40, 15] },
      { region: "North America", coords: [37, -100] },
    ],
    legs: {
      "Spain & Italy": { mechanism: "colonial transfer", confidence: "strong", eventType: "transfer", modernRef: "modern Italy", note: "Carried to Iberia and Italy in the 16th century, first grown as a curiosity." },
      "Wider Europe": { mechanism: "cultivation", confidence: "strong", eventType: "cultivation", modernRef: "modern Germany", note: "Slowly adopted as food across Europe over the 17th–18th centuries." },
      "Middle East & Asia": { mechanism: "trade", confidence: "modeled", eventType: "transfer", modernRef: "modern India", note: "Spread eastward via trade; regional adoption dates are uncertain." },
    },
  },
  "black-pepper": {
    ancestralNote:
      "Ancestral range in the wild pepper vines of the Western Ghats.",
    datePrecision: "documented by",
    production: [
      { region: "Vietnam", coords: [12, 108] },
      { region: "India", coords: [10, 76] },
      { region: "Brazil", coords: [-3, -52] },
      { region: "Indonesia", coords: [-2, 118] },
    ],
    legs: {
      "Roman Mediterranean": { mechanism: "maritime trade", confidence: "strong", eventType: "transfer", modernRef: "modern Egypt/Italy", note: "Monsoon-driven Indian Ocean trade carried pepper to the Roman world." },
      "Island Southeast Asia": { mechanism: "cultivation", confidence: "strong", eventType: "cultivation", modernRef: "modern Indonesia", note: "Pepper cultivation established across maritime Southeast Asia." },
      "Medieval Europe": { mechanism: "exchange network", confidence: "strong", eventType: "transfer", modernRef: "modern Italy", note: "Venetian and Genoese merchants made pepper the spice of medieval commerce." },
      "Tropical Americas & Africa": { mechanism: "colonial transfer", confidence: "strong", eventType: "transfer", modernRef: "modern Brazil", note: "Planted across the colonial tropics from the 16th century onward." },
    },
  },
};

export function productionFor(crop: Crop): ProductionRegion[] {
  return OVERLAY[crop.id]?.production ?? [];
}

/**
 * Build the ordered chapters for a crop's journey: an origin chapter (ancestry
 * + domestication) followed by each dispersal leg, and a closing present-day
 * production chapter when production data exists.
 */
export function buildChapters(crop: Crop): JourneyChapter[] {
  const ov = OVERLAY[crop.id];
  const legs = crop.spread.slice().sort((a, b) => a.order - b.order);
  const production = ov?.production ?? [];
  const total = 1 + legs.length + (production.length ? 1 : 0);
  const chapters: JourneyChapter[] = [];

  // Chapter 0 — origin: ancestry + domestication
  const ancestry = ov?.ancestralNote ?? `Wild progenitor: ${crop.progenitor}.`;
  chapters.push({
    index: 0,
    total,
    title: crop.originCenter,
    modernRef: crop.originRegion,
    period: `~${crop.domesticatedBP.toLocaleString()} BP`,
    precision: ov?.datePrecision ?? "approximate",
    eventType: "domestication",
    confidence: "strong",
    mechanism: "human selection",
    note: `${ancestry} ${crop.domestication}`,
    coords: crop.origin,
    from: crop.origin,
  });

  // Movement chapters
  legs.forEach((leg, i) => {
    const d = ov?.legs?.[leg.to];
    const parent =
      leg.from !== undefined && leg.from > 0
        ? legs[leg.from - 1]?.coords ?? crop.origin
        : crop.origin;
    chapters.push({
      index: i + 1,
      total,
      title: leg.to,
      modernRef: d?.modernRef,
      period: leg.period,
      precision: undefined,
      eventType: d?.eventType ?? leg.eventType ?? "transfer",
      confidence: d?.confidence ?? leg.confidence ?? "strong",
      mechanism: d?.mechanism ?? leg.mechanism,
      note: d?.note ?? leg.note ?? `Historical movement to ${leg.to}, ${leg.period}.`,
      coords: leg.coords,
      from: parent,
    });
  });

  // Closing production chapter
  if (production.length) {
    const c = production.reduce(
      (a, p) => [a[0] + p.coords[0], a[1] + p.coords[1]] as [number, number],
      [0, 0] as [number, number],
    );
    const centroid: [number, number] = [c[0] / production.length, c[1] / production.length];
    chapters.push({
      index: chapters.length,
      total,
      title: "Present-day production",
      period: "today",
      eventType: "production",
      confidence: "strong",
      note: crop.availability,
      coords: centroid,
      from: centroid,
    });
  }

  return chapters;
}
