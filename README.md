# Produce Atlas

An evidence-led interactive 3-D atlas tracing the scientific identity, origins,
domestication, historical movement, and global availability of food plants.

![Produce Atlas — interactive 3-D globe of food-plant origins](docs/preview.png)

## What it is

Produce Atlas renders the world's major food plants on an interactive globe.
Each crop is anchored to its **center of origin** (the domestication hearth) and
its **historical dispersal routes** are drawn as animated arcs. A detail panel
presents the scientific name, botanical family, wild progenitor, approximate
domestication date, the nature of the supporting evidence, and present-day
availability.

The dataset (`src/data/crops.ts`) follows the Vavilov centers-of-origin
framework as refined by modern archaeobotany and genetics. Dates are given as
approximate years before present (BP); dispersal legs summarise well-attested
movements rather than every route.

## Features

- **Premium 3-D globe** — a dark "data globe" with dotted landmasses, an
  atmospheric glow, graticules, and gentle auto-rotation (built on `globe.gl` /
  `three.js`).
- **Two-tier catalog** — a curated **atlas** of 51 major food plants with full
  origin/spread dossiers, plus a **baseline scientific index** of ~200 more real
  edible species (searchable, honestly labeled, no invented origins). ~255 total,
  across cereals, fruits, vegetables, legumes, roots & tubers, beverages,
  oil/sugar, herbs/spices, and nuts/seeds.
- **Specimen signatures** — every species gets a deterministic generative 2-D
  mark (a golden-angle phyllotactic form in its category colour); scales to
  thousands with no image assets.
- **Origin + spread visualisation** — glowing origin markers, pulsing rings, and
  animated dispersal arcs colour-coded by category.
- **Detail dossier** — glassmorphic panel with scientific identity,
  domestication summary, wild progenitor, evidence note, a spread timeline, and
  a present-day availability note.
- **Evidence-governance layer** — every record labeled by research **maturity**
  (flagship / authored / baseline); the five flagship crops carry formal
  **claim packets** of source-linked statements with per-claim confidence and
  review status, backed by a shared source registry. A **Methodology & evidence**
  panel makes the limits visible (representative coordinates, corridors not
  routes, approximate dates), and every record carries a record-specific
  **safety note**. See [METHODOLOGY.md](METHODOLOGY.md).
- **Filtering** — live search (name, family, region) and category chips.
- **Domestication horizon** — a time scrubber that reveals crops as their
  domestication date is reached.
- **Tested & CI-enforced** — a `vitest` data-integrity suite guards the schema
  and the disclosed maturity numbers; GitHub Actions runs typecheck, tests, and
  both builds on every push.
- **Responsive** and keyboard-accessible; respects `prefers-reduced-motion`.

## Tech stack

- [Vite](https://vitejs.dev/) + TypeScript (no framework — hand-rolled DOM)
- [globe.gl](https://github.com/vasturiano/globe.gl) + [three.js](https://threejs.org/) for the WebGL globe
- Self-contained: the countries GeoJSON is vendored under `public/data/`, so the
  app has **no runtime CDN or network dependency**.

## Getting started

```bash
npm install     # install dependencies
npm run dev     # start the dev server (http://localhost:5173)
npm test        # run the data-integrity test suite (vitest)
npm run build   # typecheck + production build to dist/
npm run preview # serve the production build locally

# Single, fully self-contained build (all JS/CSS/data inlined, no requests):
npx vite build --config vite.config.artifact.ts   # -> dist-artifact/index.html
```

## Project structure

```
index.html              App shell + premium boot screen
src/
  main.ts               State + orchestration (filters, selection, events)
  globe.ts              globe.gl setup and the imperative globe controller
  ui.ts                 DOM chrome + list/detail/claims/methodology renderers
  signature.ts          Procedural specimen-signature generator (canvas)
  data/
    crops.ts            Curated atlas dossiers (+ maturity, safety, claims)
    speciesIndex.ts     Baseline scientific index (real species, honestly labeled)
    species.generated.ts  Importer output slot (empty until an import runs)
    categories.ts       Category metadata + colour palette
    sources.ts          Shared source registry + maturity metadata
    countries.json      Natural Earth countries (bundled at build time)
    data.test.ts        Schema + maturity-summary integrity tests
  types.ts              Data model (crop, claim, source, maturity, index, safety)
  styles.css            Premium design system + evidence layer
scripts/import-species.mjs  CSV → baseline index (path to the full Kew list)
.github/workflows/ci.yml    Typecheck · test · build · artifact build
```

## Scaling the index

The baseline index is designed to grow to the full Kew *World Checklist of
Useful Plants* (~7,039 human-food species). Drop a CSV in and run the importer;
every row becomes a baseline record with its own specimen signature — no
hand-authoring, no invented origins:

```bash
node scripts/import-species.mjs path/to/species.csv --category vegetable
# writes src/data/species.generated.ts, which the app merges into the index
```

## Data & accuracy

Origin centers and dates reflect current mainstream scholarship but are
inherently approximate and, for several crops, actively debated. The atlas
deliberately distinguishes **structural completeness** from **research depth**:
of 21 records, 5 are flagship (source-linked claim packets, all with review
still pending — **0 expert approvals**) and 16 are individually authored. Treat
the atlas as an illustrative, evidence-led overview, not a primary source or a
specialist-reviewed encyclopedia. See [METHODOLOGY.md](METHODOLOGY.md) for the
full governance model.
