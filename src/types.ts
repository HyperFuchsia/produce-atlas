/** Data model for the Produce Atlas. */

export type Category =
  | "cereal"
  | "fruit"
  | "vegetable"
  | "legume"
  | "tuber"
  | "beverage"
  | "oil";

/** A single leg of a crop's historical dispersal, drawn as a globe arc. */
export interface SpreadLeg {
  /** Destination region label (e.g. "Mediterranean Basin"). */
  to: string;
  /** [latitude, longitude] of the destination. */
  coords: [number, number];
  /** Human-readable period for this leg (e.g. "16th c. CE"). */
  period: string;
  /** Draw order — lower legs animate/rank first. */
  order: number;
}

export interface Crop {
  id: string;
  /** Common name. */
  name: string;
  /** Binomial scientific name (rendered italic). */
  scientificName: string;
  /** Botanical family. */
  family: string;
  category: Category;
  /** Single glyph used in list + marker labels. */
  glyph: string;
  /** Name of the domestication hearth / Vavilov-style center of origin. */
  originCenter: string;
  /** Modern-day region the center sits in. */
  originRegion: string;
  /** [latitude, longitude] of the center of origin. */
  origin: [number, number];
  /** Approximate years before present that domestication began. */
  domesticatedBP: number;
  /** Short domestication summary. */
  domestication: string;
  /** The wild progenitor species / lineage. */
  progenitor: string;
  /** One-line note on the nature of the evidence (archaeobotanical/genetic). */
  evidence: string;
  /** Note on present-day global availability / production. */
  availability: string;
  /** Historical dispersal legs from the center of origin. */
  spread: SpreadLeg[];
}

export interface CategoryMeta {
  id: Category;
  label: string;
  color: string;
}
