/** Data model for the Produce Atlas. */

export type Category =
  | "cereal"
  | "fruit"
  | "vegetable"
  | "legume"
  | "tuber"
  | "beverage"
  | "oil"
  | "spice"
  | "nut";

/** How well-supported a movement is — controls solid vs dashed routes. */
export type MovementConfidence = "strong" | "modeled";

/** The kind of historical event a chapter records. */
export type EventType =
  | "ancestry"
  | "domestication"
  | "cultivation"
  | "transfer"
  | "diversification"
  | "production";

/**
 * A single leg of a crop's historical dispersal. Beyond geometry it can carry
 * the "chapter" fields the visual handoff asks for: mechanism, confidence,
 * event type, and a note on what happened. All optional so existing records
 * degrade gracefully.
 */
export interface SpreadLeg {
  /** Destination region label (historical region preferred). */
  to: string;
  /** [latitude, longitude] of the destination. */
  coords: [number, number];
  /** Human-readable period for this leg (e.g. "16th c. CE"). */
  period: string;
  /** Draw order — lower legs animate/rank first. */
  order: number;
  /**
   * Index of the stop this leg departs from (0 = origin, 1 = first leg, …).
   * Enables branching routes; defaults to the origin when omitted.
   */
  from?: number;
  /** Movement mechanism: trade, migration, colonial transfer, exchange, … */
  mechanism?: string;
  /** Evidence strength; `modeled`/uncertain corridors render dashed. */
  confidence?: MovementConfidence;
  /** Event classification for the chapter label. */
  eventType?: EventType;
  /** Modern geographic reference (e.g. "modern Spain"). */
  modernRef?: string;
  /** What happened here and why the stop matters. */
  note?: string;
}

/** A present-day production region (a distinct layer from historical routes). */
export interface ProductionRegion {
  region: string;
  coords: [number, number];
}

export interface CategoryMeta {
  id: Category;
  label: string;
  color: string;
}

export interface CategoryMeta {
  id: Category;
  label: string;
  color: string;
}

/**
 * A lightweight baseline-index record: a real edible species identified by
 * name, scientific name, and family, but not yet individually researched for
 * origin and spread. No origin is claimed, so it is not plotted on the globe.
 * This is the audit's "baseline" tier — breadth, honestly labeled.
 */
export interface IndexSpecies {
  id: string;
  name: string;
  scientificName: string;
  family: string;
  category: Category;
  maturity: "baseline";
}

/** Unified shape the list + search operate over (atlas crops and index alike). */
export interface ListEntry {
  id: string;
  name: string;
  scientificName: string;
  family: string;
  category: Category;
  maturity: Maturity;
  /** Emoji glyph for atlas records; undefined for baseline (uses a dot). */
  glyph?: string;
  /** True when the record has a real origin and appears on the globe. */
  plotted: boolean;
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

/**
 * One section of a crop's long-form dossier — the "unabridged" narrative layer
 * that sits alongside the terse structured fields. Sections are rendered in
 * order and can carry their own source references so the deep history stays
 * accountable, not anecdotal.
 */
export interface DossierSection {
  /** Section heading, e.g. "The wild ancestor". */
  heading: string;
  /** Long-form paragraphs, rendered in order. */
  paragraphs: string[];
  /** Optional source-registry ids supporting this section. */
  sourceIds?: string[];
}

/** Record-specific edibility / safety note (never medical advice). */
export interface Safety {
  edibleParts: string;
  /** Parts to avoid, or "" when none noteworthy. */
  cautionParts: string;
  note: string;
}

/** A botanical relative or notable hybrid — the crop's "family counterparts". */
export interface Relative {
  /** Common name, e.g. "Plum" or "Plumcot". */
  name: string;
  /** Relationship in a few words, e.g. "same genus (Prunus)" or "apricot × plum hybrid". */
  note?: string;
}

/**
 * Horticultural profile — the practical, garden-and-market facts that sit
 * beside the history: how the plant seeds and is propagated, when it grows and
 * is harvested, and its botanical kin (siblings in the same genus/family and
 * the hybrids between them). All fields are plain reference data; the season is
 * given as a general guide and necessarily varies by climate and hemisphere.
 */
export interface FieldProfile {
  /** Seeds & propagation: seed type/number, and how the crop is grown. */
  seeds: string;
  /** Growing / harvest season (with hemisphere/climate caveat where relevant). */
  season: string;
  /** Botanical kin and notable hybrids — the "family counterparts". */
  relatives?: Relative[];
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
  /**
   * Long-form, unabridged history — the deep narrative layer. Present on
   * records that have been researched in depth; absent records fall back to
   * the terse structured fields.
   */
  dossier?: DossierSection[];
  /**
   * Horticultural profile — seeds & propagation, growing season, and
   * botanical kin. Practical reference data alongside the history.
   */
  field?: FieldProfile;

  // ---- Journey layer (visual handoff) -------------------------------------
  /**
   * Ancestral range / earliest-evidence note, distinct from domestication.
   * When present it seeds the ancestry chapter; otherwise `progenitor` is used.
   */
  ancestralNote?: string;
  /** Precision qualifier for the domestication date (approximate/range/by …). */
  datePrecision?: string;
  /**
   * Present-day production regions — a layer separate from historical routes.
   * Representative points, not a production census.
   */
  production?: ProductionRegion[];
}

/**
 * A resolved "chapter" in a crop's journey — the unit the ride and timeline
 * step through. Built at runtime from the crop's origin + spread legs.
 */
export interface JourneyChapter {
  index: number;
  total: number;
  title: string;
  modernRef?: string;
  period: string;
  precision?: string;
  eventType: EventType;
  confidence: MovementConfidence;
  mechanism?: string;
  note: string;
  coords: [number, number];
  from: [number, number];
}
