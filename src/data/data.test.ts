import { describe, it, expect } from "vitest";
import { CROPS } from "./crops";
import { INDEX_SPECIES } from "./speciesIndex";
import { CATEGORIES } from "./categories";
import { SOURCES, SOURCE_BY_ID, MATURITY } from "./sources";
import type { Category, Maturity } from "../types";

const CATEGORY_IDS = new Set<Category>(CATEGORIES.map((c) => c.id));
const MATURITY_IDS = new Set<Maturity>(MATURITY.map((m) => m.id));
const CLAIM_KINDS = new Set(["identity", "domestication", "spread", "availability"]);
const CONFIDENCE = new Set(["high", "medium", "contested"]);
const REVIEW = new Set(["pending", "approved", "revise"]);

describe("crop records — structural integrity", () => {
  it("has a stable, unique id and name for every record", () => {
    const ids = CROPS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CROPS) {
      expect(c.id).toMatch(/^[a-z0-9-]+$/);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.scientificName.length).toBeGreaterThan(0);
      expect(c.family.length).toBeGreaterThan(0);
    }
  });

  it("uses only declared categories", () => {
    for (const c of CROPS) expect(CATEGORY_IDS.has(c.category)).toBe(true);
  });

  it("places origin and every spread leg at valid coordinates", () => {
    const validLat = (n: number) => n >= -90 && n <= 90;
    const validLng = (n: number) => n >= -180 && n <= 180;
    for (const c of CROPS) {
      expect(validLat(c.origin[0]) && validLng(c.origin[1])).toBe(true);
      for (const leg of c.spread) {
        expect(validLat(leg.coords[0]) && validLng(leg.coords[1])).toBe(true);
      }
    }
  });

  it("keeps domestication dates within the Holocene envelope", () => {
    for (const c of CROPS) {
      expect(c.domesticatedBP).toBeGreaterThan(0);
      expect(c.domesticatedBP).toBeLessThanOrEqual(12000);
    }
  });

  it("orders spread legs with distinct, positive order values", () => {
    for (const c of CROPS) {
      const orders = c.spread.map((l) => l.order);
      expect(new Set(orders).size).toBe(orders.length);
      for (const o of orders) expect(o).toBeGreaterThan(0);
    }
  });
});

describe("evidence-governance layer", () => {
  it("labels maturity and marks coordinates as representative on every record", () => {
    for (const c of CROPS) {
      expect(MATURITY_IDS.has(c.maturity)).toBe(true);
      expect(c.coordinatePrecision).toBe("representative");
    }
  });

  it("gives every record a safety note with an edible part", () => {
    for (const c of CROPS) {
      expect(c.safety).toBeTruthy();
      expect(c.safety.edibleParts.length).toBeGreaterThan(0);
      expect(c.safety.note.length).toBeGreaterThan(0);
    }
  });

  it("attaches a claim packet to flagship records only", () => {
    for (const c of CROPS) {
      if (c.maturity === "flagship") {
        expect(c.claims && c.claims.length).toBeGreaterThan(0);
      } else {
        expect(c.claims === undefined || c.claims.length === 0).toBe(true);
      }
    }
  });

  it("resolves every claim source id against the registry", () => {
    for (const c of CROPS) {
      for (const claim of c.claims ?? []) {
        expect(CLAIM_KINDS.has(claim.kind)).toBe(true);
        expect(CONFIDENCE.has(claim.confidence)).toBe(true);
        expect(REVIEW.has(claim.review)).toBe(true);
        expect(claim.sourceIds.length).toBeGreaterThan(0);
        for (const sid of claim.sourceIds) {
          expect(SOURCE_BY_ID[sid], `unknown source ${sid}`).toBeTruthy();
        }
      }
    }
  });

  it("uses globally unique claim ids", () => {
    const claimIds = CROPS.flatMap((c) => c.claims ?? []).map((cl) => cl.id);
    expect(new Set(claimIds).size).toBe(claimIds.length);
  });
});

describe("baseline species index", () => {
  it("gives every index species the required fields and a valid category", () => {
    for (const s of INDEX_SPECIES) {
      expect(s.id).toMatch(/^idx-[a-z0-9-]+$/);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.scientificName.length).toBeGreaterThan(0);
      expect(s.family.length).toBeGreaterThan(0);
      expect(CATEGORY_IDS.has(s.category)).toBe(true);
      expect(s.maturity).toBe("baseline");
    }
  });

  it("uses ids that are globally unique across both tiers", () => {
    const ids = [...CROPS.map((c) => c.id), ...INDEX_SPECIES.map((s) => s.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never shadows a fully-authored atlas record's species", () => {
    const atlasSci = new Set(CROPS.map((c) => c.scientificName.toLowerCase()));
    for (const s of INDEX_SPECIES) {
      expect(atlasSci.has(s.scientificName.toLowerCase())).toBe(false);
    }
  });

  it("has unique scientific names within the index", () => {
    const sci = INDEX_SPECIES.map((s) => s.scientificName.toLowerCase());
    expect(new Set(sci).size).toBe(sci.length);
  });
});

describe("published maturity summary (guards against overclaim)", () => {
  const flagship = CROPS.filter((c) => c.maturity === "flagship");
  const claims = CROPS.flatMap((c) => c.claims ?? []);

  it("matches the disclosed shape: 5 flagship packets, 20 claims, 0 approvals", () => {
    // These numbers are quoted in the methodology panel and docs; keep them honest.
    expect(flagship.length).toBe(5);
    expect(claims.length).toBe(20);
    expect(claims.filter((c) => c.review === "approved").length).toBe(0);
  });

  it("has no orphaned or duplicated sources in the registry", () => {
    const ids = SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const used = new Set(claims.flatMap((c) => c.sourceIds));
    for (const id of used) expect(ids).toContain(id);
  });
});
