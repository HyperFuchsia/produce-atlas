/** Data model for the Produce Atlas. */

export type Category =
  | "cereal"
  | "fruit"
  | "vegetable"
  | "legume"
  | "tuber"
  | "beverage"
  | "oil"
  | "spice";

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

export interface CategoryMeta {
  id: Category;
  label: string;
  color: string;
}

/**
 * Research maturity of a record. The audit's first principle is "expose
 * maturity everywhere" — a structurally complete record is not the same as an
 * independently researched, specialist-reviewed one.
 *
 * - `flagship`  — carries a formal claim packet (source-linked claims).
 * - `authored`  — bespoke, individually written, but no formal claim packet yet.
 * - `baseline`  — expanded from shared templates (none present yet).
 */
export type Maturity = "flagship" | "authored" | "baseline";

export interface MaturityMeta {
  id: Maturity;
  label: string;
  short: string;
  color: string;
  note: string;
}

/** A citable reference in the shared source registry. */
export interface Source {
  id: string;
  /** Full human-readable citation. */
  citation: string;
  /** Kind of source, for the reader's calibration. */
  kind: "book" | "journal" | "database" | "report";
  year: number;
}

export type ClaimKind =
  | "identity"
  | "domestication"
  | "spread"
  | "availability";

export type Confidence = "high" | "medium" | "contested";

export type ReviewStatus = "pending" | "approved" | "revise";

/**
 * A single source-linked assertion about a crop. Claim packets are how the
 * atlas converts prose into individually traceable, reviewable statements.
 */
export interface Claim {
  id: string;
  kind: ClaimKind;
  statement: string;
  /** IDs into the source registry that support this statement. */
  sourceIds: string[];
  confidence: Confidence;
  /** Expert-review state. All packets currently ship as `pending`. */
  review: ReviewStatus;
}

/** Record-specific edibility / safety note (never medical advice). */
export interface Safety {
  edibleParts: string;
  /** Parts to avoid, or "" when none noteworthy. */
  cautionParts: string;
  note: string;
}

export interface Crop {
  id: string;
  name: string;
  scientificName: string;
  family: string;
  category: Category;
  glyph: string;
  originCenter: string;
  originRegion: string;
  origin: [number, number];
  domesticatedBP: number;
  domestication: string;
  progenitor: string;
  evidence: string;
  availability: string;
  spread: SpreadLeg[];

  // ---- Evidence-governance layer ------------------------------------------
  /** Research maturity tier (see `Maturity`). */
  maturity: Maturity;
  /**
   * Origin coordinates are a representative point for the center of origin,
   * not an exact discovery site. Always true in this dataset; surfaced so the
   * map never implies false precision.
   */
  coordinatePrecision: "representative";
  /** Record-specific edibility / safety note. */
  safety: Safety;
  /** Formal claim packet — present only for `flagship` records. */
  claims?: Claim[];
}
