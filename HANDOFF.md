# Produce Atlas — Handoff

_Last updated: 2026-07-21_

## Update — evidence-governance layer (toward "v33")

In response to the *Comprehensive Implementation Audit*, this increment builds
toward the audited platform by implementing its top-priority (P0–P2) items on
the real codebase — **without** inflating the record count (the audit's explicit
warning). "Evidence before spectacle."

- **Data model** extended (`src/types.ts`): `Maturity` tier, `Source`, `Claim`,
  `Safety`, and `coordinatePrecision` on every `Crop`. Added a `spice` category.
- **Source registry** (`src/data/sources.ts`): real archaeobotany / genetics /
  food-history references + maturity metadata.
- **Records**: every crop now labeled by maturity and given a record-specific
  safety note. Added **Black Pepper** as the 5th flagship. The five flagship
  crops (Apple, Banana, Potato, Tomato, Black Pepper) carry **claim packets** —
  20 source-linked claims total, **all review-pending, 0 approvals** (matches the
  audit's disclosed shape exactly).
- **UI** (`src/ui.ts`, `src/styles.css`): maturity badges (list + detail),
  flagship markers, a **claim packet** section with per-claim confidence, review
  status, and numbered references; representative-coordinate + "corridors not
  routes" disclosures; a safety section; and a **Methodology & evidence** overlay
  ("Evidence before spectacle") with a 21/5/20/0 summary, maturity tiers, and the
  full source registry.
- **Tests + CI**: `src/data/data.test.ts` (12 vitest cases) validates schema,
  coordinate ranges, claim-source resolution, and the disclosed maturity numbers
  so docs can't drift from data. `.github/workflows/ci.yml` runs typecheck →
  test → build → artifact build on every push (audit rated "no enforced CI" a
  High risk).
- **Docs**: added `METHODOLOGY.md`; updated README.
- Artifact republished (same URL) with the evidence layer.

_Not yet done (later audit priorities): expert review of claims, per-page source
locators, Core-300/WCUPS-scale expansion, specimen 3-D pages, real-device perf
matrix, observability. These remain deliberately open rather than faked._

---


## Update — self-contained build + hosted artifact

Follow-up work so the app can run with **zero external requests** and be embedded
as a standalone page:

- Map data is now **bundled at build time** instead of fetched at runtime.
  `src/data/countries.json` is imported via `?raw` and parsed in `main.ts`;
  `createGlobe()` takes the parsed GeoJSON directly (no `fetch`, no
  `import.meta.env`). Removed the old `public/data/` copy and the preload link.
  Also removed the last top-level `await` so the app runs as a plain inline
  script.
- Added `vite.config.artifact.ts` (+ dev dep `vite-plugin-singlefile`) which
  emits a single, fully-inlined `dist-artifact/index.html`
  (`npx vite build --config vite.config.artifact.ts`).
- Verified the single-file output renders from `file://` with **no external
  requests and no console errors**, and works when wrapped in a bare document
  (the embedding case).
- Published it as an interactive Artifact the user can open directly.

The normal multi-file build (`npm run build` → `dist/`) is unchanged and still
the target for a normal static deploy.

## Session summary

The repository previously contained **only** a two-line `README.md` (no prior
application code was present on any branch, despite the note about earlier Codex
work). This session bootstrapped the full application and delivered an
**extremely premium interactive 3-D atlas** of food-plant origins and spread.

## What was completed this session

### Project scaffold
- Initialised a **Vite + TypeScript** project (no UI framework — hand-rolled DOM
  for full control over the design).
- Added `package.json` scripts (`dev`, `build`, `preview`), `tsconfig.json`
  (strict), `vite.config.ts` (`base: "./"` for subpath hosting), `.gitignore`,
  and `src/vite-env.d.ts`.
- Dependencies: `three`, `globe.gl` (runtime); `typescript`, `vite`,
  `@types/three` (dev). Playwright was used only for verification and was
  **removed** from the manifest afterwards.

### Data model (evidence-led)
- `src/types.ts` — typed `Crop` / `SpreadLeg` / `Category` model.
- `src/data/crops.ts` — **20 curated food plants** with scientific name, family,
  center of origin (Vavilov framework), coordinates, domestication date (BP),
  wild progenitor, an evidence note (macrofossils / starch grains / genomics),
  present-day availability, and 3–5 historical dispersal legs each.
- `src/data/categories.ts` — 7 categories with a warm botanical colour palette.

### Premium UI / UX
- `src/styles.css` — a complete dark, editorial, glassmorphic **design system**:
  custom tokens, serif display + sans UI type, an animated boot/loading screen,
  a cinematic vignette, glass panels, category chips, a crop list with reveal
  animations, a detail dossier, a time scrubber, tooltips, focus states, full
  responsive layout, and `prefers-reduced-motion` support.
- `src/globe.ts` — `globe.gl` / `three.js` controller: dotted-land "data globe",
  atmospheric glow, graticules, gentle auto-rotate, colour-coded origin points,
  pulsing origin rings, animated dispersal arcs, and fly-to camera on select.
- `src/ui.ts` — builds the DOM chrome and renders the list + detail panel;
  includes BP→era formatting.
- `src/main.ts` — state + orchestration: search, category filtering,
  domestication-horizon time filter, selection, keyboard access, boot-out.
- `index.html` — app shell, inline SVG favicon, premium first-paint boot screen.

### Self-contained assets
- Vendored the **Natural Earth countries GeoJSON** to `public/data/countries.geojson`
  (from the installed `three-globe` example data) so the app has **no runtime
  CDN/network dependency**.

### Verification
- `npm run build` passes (strict typecheck + Vite build, 0 errors).
- Rendered the production build in headless Chromium and captured screenshots of
  the overview, an active selection with spread arcs (Maize), and category
  colour-coding (Coffee). No console errors. `docs/preview.png` is the hero shot.

## How to run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + dist/
npm run preview  # serve dist/
```

## Notes, caveats, and possible next steps

- **Bundle size**: the JS bundle is ~1.9 MB (543 kB gzip) because `three.js` is
  bundled. Acceptable for this app; could be trimmed with code-splitting or a
  slimmer globe renderer if needed.
- **Data accuracy**: origin centers/dates reflect mainstream scholarship but are
  approximate and, for some crops, debated. Evidence notes describe the *kind*
  of support rather than citing individual studies. Not a primary source.
- **Ideas for future work**: expand the dataset (more crops, secondary centers,
  per-leg citations); add a true chronological "play" animation of spread over
  time; per-crop reference links; a light theme; unit tests for the filter
  pipeline; clustering/labels when many origins overlap.

## Not saved / out of scope
- Nothing intended for the repo was left unsaved. Temporary verification files
  (screenshot script, screenshots outside `docs/`) were scratch-only and were
  **not** committed; `node_modules/` and `dist/` are intentionally gitignored.
