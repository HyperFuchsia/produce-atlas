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
- **Curated crop library** — 21 major food plants across cereals, fruits,
  vegetables, legumes, roots & tubers, beverages, oil/sugar, and herbs/spices.
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
  data/
    crops.ts            Curated food-plant dataset (+ maturity, safety, claims)
    categories.ts       Category metadata + colour palette
    sources.ts          Shared source registry + maturity metadata
    countries.json      Natural Earth countries (bundled at build time)
    data.test.ts        Schema + maturity-summary integrity tests
  types.ts              Data model (crop, claim, source, maturity, safety)
  styles.css            Premium design system + evidence layer
.github/workflows/ci.yml  Typecheck · test · build · artifact build
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
