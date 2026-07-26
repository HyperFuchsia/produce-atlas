# produce-atlas

An evidence-led interactive 3-D atlas tracing the scientific identity, origins,
domestication, historical movement, and global availability of food plants.

Rendered on **Phosphor**, a high-fidelity interface system modelled on the
late-1970s vector instrument display — the *Alien* flight deck and the Ron Cobb
design language around it. Emitted light on true black, everything drawn in
stroke, elevation expressed as brightness rather than shadow.

## Run it

No build step, no dependencies.

```
python3 -m http.server 8000
```

- `index.html` — the origins console
- `docs/gallery.html` — the component gallery and specimen sheet
- `docs/design-system.md` — the written specification

The scripts are plain globals rather than ES modules, so opening `index.html`
straight off disk works too.

## Using the console

| | |
|---|---|
| `↑` `↓` or `j` `k` | Step the register |
| `/` | Focus search |
| `1`–`4` | Switch display channel — P1 viridian, P3 amber, P4 ice, PX xeno |
| Drag the globe | Slew the projection |

The globe shows the selected crop's centre of origin as a struck reticle, its
Vavilov centre as a bracketed box, and each documented dispersal leg as a
great-circle arc with marching dashes.

## Layout

```
index.html               the console
interface/
  tokens.css             colour ramps, type, space, stroke, motion, raster
  base.css               reset, the five type voices, focus, scrolling
  effects.css            lattice, scanlines, grille, interlace, grain, glass
  layout.css             chassis and console grid
  components.css         the twenty-one components
  js/crt.js              power-on, persistence, log, clock, glitch
  js/globe.js            orthographic vector globe
  js/geo.js              low-resolution coastlines
  js/charts.js           season ring, era rail, bars, trace, dial
  js/atlas.js            application wiring
  data/taxa.js           the dataset
  README.md              how to consume the system
docs/
  design-system.md       the specification
  gallery.html           live specimen sheet
build/inline.mjs         flattens the site into self-contained single files
```

## The data

Eighteen taxa, eleven Vavilov centres of origin, ninety dispersal legs.

Every figure is real. Domestication ages are calibrated years before present
(cal BP, present = 1950) drawn from archaeobotanical or archaeogenomic
evidence, and each record names the site or method the claim rests on.
Production figures are FAO annual output. Where a date is contested — tomato,
avocado, sugarcane, arabica — the record says so in its `confidence` field and
the interface renders that state rather than hiding it behind a single
confident number.

Seasonality is a Northern-Hemisphere retail availability profile, distinguishing
local harvest from stored or imported supply.

## Building single-file bundles

```
node build/inline.mjs
```

Writes to `dist/` (git-ignored): `console.html` and `gallery.html` as complete
standalone documents, plus `artifact-*.html` fragments for hosts that supply
their own document shell. All four run offline with zero external requests.

## Design notes

The interface system is documented in full in
[`docs/design-system.md`](docs/design-system.md). The short version:

- **One theme, deliberately.** There is no light mode because there is no
  ambient light — the display is a cathode-ray tube in a dark compartment.
- **Colour is channel, not decoration.** Five phosphors, each with a meaning.
  Alarm red means critical and is used for nothing else.
- **Emphasis is luminance.** Six brightness steps replace bold, size and colour
  accents entirely.
- **No fills, no radii, no drop shadows.** A vector display has none of them.
- **`prefers-reduced-motion`** stops the movement but not the hardware: the
  raster, bloom and vignette are physical properties of the tube.
