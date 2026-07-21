#!/usr/bin/env node
/**
 * Import a species checklist (CSV) into the baseline index.
 *
 * This is the path to scale the atlas toward the full Kew "World Checklist of
 * Useful Plants" (~7,039 human-food species) without hand-authoring: drop a
 * CSV in and every row becomes a baseline record with its own specimen
 * signature, honestly labeled — no invented origin stories.
 *
 * Usage:
 *   node scripts/import-species.mjs <file.csv> [--category <default>]
 *
 * The CSV needs a header row. Recognised columns (case-insensitive):
 *   name | common | commonName        -> common name (falls back to species)
 *   scientificName | species | taxon  -> binomial (required)
 *   family                            -> botanical family
 *   category                          -> one of the atlas categories (optional)
 *
 * Rows without a scientific name are skipped. Output is written to
 * src/data/species.generated.ts, which the app merges into the index.
 */
import { readFileSync, writeFileSync } from "node:fs";

const CATEGORIES = new Set([
  "cereal", "fruit", "vegetable", "legume", "tuber",
  "beverage", "oil", "spice", "nut",
]);

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const catFlag = args.indexOf("--category");
const defaultCategory = catFlag >= 0 ? args[catFlag + 1] : "vegetable";

if (!file) {
  console.error("Usage: node scripts/import-species.mjs <file.csv> [--category <default>]");
  process.exit(1);
}
if (!CATEGORIES.has(defaultCategory)) {
  console.error(`Unknown default category "${defaultCategory}". One of: ${[...CATEGORIES].join(", ")}`);
  process.exit(1);
}

// Minimal RFC-4180-ish CSV parser (handles quotes and embedded commas).
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const text = readFileSync(file, "utf8");
const rows = parseCSV(text);
if (rows.length < 2) { console.error("No data rows found."); process.exit(1); }

const header = rows[0].map((h) => h.trim().toLowerCase());
const col = (...names) => {
  for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; }
  return -1;
};
const iName = col("name", "common", "commonname", "common_name");
const iSci = col("scientificname", "scientific_name", "species", "taxon", "binomial");
const iFam = col("family");
const iCat = col("category");

if (iSci < 0) { console.error("CSV must have a scientificName/species column."); process.exit(1); }

const out = [];
const seen = new Set();
let skipped = 0;
for (const r of rows.slice(1)) {
  const sci = (r[iSci] || "").trim();
  if (!sci) { skipped++; continue; }
  const key = sci.toLowerCase();
  if (seen.has(key)) { skipped++; continue; }
  seen.add(key);
  const name = (iName >= 0 && r[iName]?.trim()) || sci;
  const family = (iFam >= 0 && r[iFam]?.trim()) || "Unknown";
  let category = (iCat >= 0 && r[iCat]?.trim().toLowerCase()) || defaultCategory;
  if (!CATEGORIES.has(category)) category = defaultCategory;
  out.push([name, sci, family, category]);
}

const body = out
  .map(([n, s, f, c]) => `  [${JSON.stringify(n)}, ${JSON.stringify(s)}, ${JSON.stringify(f)}, ${JSON.stringify(c)}],`)
  .join("\n");

const contents = `import type { Category } from "../types";

/**
 * Machine-generated baseline rows, produced by scripts/import-species.mjs.
 * Do not edit by hand — re-run the importer to regenerate.
 * Generated from: ${file}
 */
export const GENERATED_ROWS: [
  name: string,
  scientificName: string,
  family: string,
  category: Category,
][] = [
${body}
];
`;

writeFileSync("src/data/species.generated.ts", contents);
console.log(`Imported ${out.length} species (${skipped} skipped) -> src/data/species.generated.ts`);
