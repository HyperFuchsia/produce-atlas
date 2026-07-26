# Phosphor — consuming the system

Zero dependencies, zero build step. Load five stylesheets in order and the
scripts you need.

```html
<html data-channel="viridian">
<link rel="stylesheet" href="interface/tokens.css">     <!-- must be first -->
<link rel="stylesheet" href="interface/base.css">
<link rel="stylesheet" href="interface/effects.css">
<link rel="stylesheet" href="interface/layout.css">
<link rel="stylesheet" href="interface/components.css"> <!-- must be last -->
```

Order matters in both directions. `tokens.css` defines every custom property
the others read. `components.css` loads last so component rules win over
layout defaults — which is why responsive visibility rules in `layout.css` are
scoped through `.console >` (see §12 of the design system).

## Files

| File | Contains |
|---|---|
| `tokens.css` | Colour ramps, type scale, space, stroke, motion, raster constants |
| `base.css` | Reset, the five type voices, luminance utilities, focus, scrolling |
| `effects.css` | Lattice, scanlines, aperture grille, interlace, grain, glass, boot |
| `layout.css` | Chassis (bezel, brackets, tick rules, stamps) and the console grid |
| `components.css` | The twenty-one components |
| `js/crt.js` | Power-on, persistence observer, log, type-on, clock, glitch |
| `js/globe.js` | Orthographic vector globe on canvas |
| `js/geo.js` | Low-resolution coastlines |
| `js/charts.js` | Season ring, era rail, bars, trace, dial, formatters |
| `js/atlas.js` | Application — the only file that knows about botany |
| `data/taxa.js` | The dataset |

Scripts are plain globals, not ES modules, so the console runs from `file://`
as well as over HTTP.

## Page skeleton

The raster and glass layers must be siblings of the content, after it in
source order, and the lattice must come before it.

```html
<body>
  <div class="lattice" aria-hidden="true"></div>

  <div class="chassis" aria-hidden="true">…brackets, ticks, stamps…</div>
  <div class="console crt-live">…your panels…</div>

  <div class="raster" aria-hidden="true">
    <div class="raster__grain"></div>
    <div class="raster__scan"></div>
    <div class="raster__grille"></div>
    <div class="raster__interlace"></div>
  </div>
  <div class="glass" aria-hidden="true">
    <div class="glass__vignette"></div>
    <div class="glass__corners"></div>
    <div class="glass__sheen"></div>
  </div>
  <div class="boot" id="boot" aria-hidden="true"><div class="boot__degauss"></div></div>
</body>
```

For a page that is read rather than operated, put `class="doc"` on `<html>`.
That is the only sanctioned way to let the whole tube scroll.

## Changing channel

```html
<section data-channel="amber">…</section>
```

Or globally, `document.documentElement.setAttribute('data-channel', 'amber')`.
Components paint with `--ch-*` and never reference `--p1-*` directly, so they
retune without knowing they did.

## Live values

Mark any element whose value changes:

```html
<span class="readout__value" data-live>10.5</span>
```

`watchPersistence(root)` in `crt.js` observes the subtree and flashes the
element to core brightness on every text change. Call it once at boot.

## JS surface

```js
watchPersistence(root)          // start the persistence observer
sweep(el)                       // beam sweep across a module that just reloaded
tear(el)                        // signal fault — channel change and alarm only
typeOn(el, text, rate)          // teletype, returns a promise
startClock(elapsedEl, wallEl)   // mission clock
powerOn(bootEl)                 // returns a promise resolving when warm
Log(node, { max })              // → { write(msg, src, sev), clear() }
Globe(canvas)                   // → { focus(taxon, channel), set(k,v), get(k) }

seasonRing(values, opts)        // 12 values, 0 absent / 1 stored / 2 peak
eraRail(events, opts)           // [{ bp, label, kind: 'domestication'|'dispersal' }]
bars(rows, opts)                // [[label, value], …]
trace(series, opts)
dial(value, max, opts)
```

Severities for `Log.write` are `info`, `ok`, `warn`, `crit`.

## Building a new panel

```html
<section class="module">
  <div class="module__head">
    <span class="module__slug"><span class="module__addr">10</span>Yield</span>
    <span class="module__meta">Per hectare</span>
  </div>
  <div class="module__body">
    <div class="readout">
      <span class="readout__label">Mean</span>
      <span class="readout__value readout__value--lg" data-live>5.9<span class="readout__unit">t/ha</span></span>
    </div>
  </div>
</section>
```

Components carry no margins. Space siblings with `.stack`, `.stack-4/6/7` or
`.row`.

## Adding a taxon

Append to `TAXA` in `data/taxa.js`. Required keys: `id common sci family
progenitor centre origin domesticated confidence evidence genome production
producers season traits dispersal note`.

`confidence` is one of `high` `moderate` `contested` and drives the lamp on the
Deep time panel. `evidence` must name the site or the method the date rests on
— a record with a number and no provenance does not belong in an evidence-led
atlas.
