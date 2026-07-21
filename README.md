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
- **Curated crop library** — 20 major food plants across cereals, fruits,
  vegetables, legumes, roots & tubers, beverages, and oil/sugar crops.
- **Origin + spread visualisation** — glowing origin markers, pulsing rings, and
  animated dispersal arcs colour-coded by category.
- **Detail dossier** — glassmorphic panel with scientific identity,
  domestication summary, wild progenitor, evidence note, a spread timeline, and
  a present-day availability note.
- **Filtering** — live search (name, family, region) and category chips.
- **Domestication horizon** — a time scrubber that reveals crops as their
  domestication date is reached.
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
npm run build   # typecheck + production build to dist/
npm run preview # serve the production build locally
```

## Project structure

```
index.html              App shell + premium boot screen
public/data/            Vendored Natural Earth countries GeoJSON
src/
  main.ts               State + orchestration (filters, selection, events)
  globe.ts              globe.gl setup and the imperative globe controller
  ui.ts                 DOM chrome + list/detail renderers
  data/
    crops.ts            Curated, evidence-led food-plant dataset
    categories.ts       Category metadata + colour palette
  types.ts              Data model
  styles.css            Premium design system
```

## Data & accuracy

Origin centers and dates reflect current mainstream scholarship but are
inherently approximate and, for several crops, actively debated. Evidence notes
describe the *kind* of support (macrofossils, starch grains, genomics) rather
than citing individual studies. Treat the atlas as an illustrative overview, not
a primary source.
