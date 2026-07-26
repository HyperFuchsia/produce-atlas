# Phosphor — Interface System 2.4

The interface system behind Produce Atlas.

It renders a late-1970s vector instrument display: emitted light on true
black, drawn entirely in stroke, with elevation expressed as brightness
rather than shadow. The reference is the *Alien* (1979) flight deck and the
Ron Cobb design language around it — displays that showed their own
construction, typography that was machine type, and a colour system where
each phosphor meant something.

The live specimen sheet is [`gallery.html`](gallery.html). The application is
[`../index.html`](../index.html).

---

## 1. The seven laws

Every decision resolves to one of these. A component that breaks one is wrong
even when it looks right.

**01 — Light is emitted, never reflected.**
The ground is `#000000`, an unlit phosphor. Every surface is defined by how
much light it emits above that, never by a fill or a tint. There is no
`#0a0a0a` "soft black" anywhere in the system.

**02 — Everything is a stroke.**
No fills, no radii. `--radius` is `0px` and is not a knob. A vector display
has no fill primitive and cannot cheaply draw a rounded rectangle, so 1979
didn't, so this doesn't.

**03 — Elevation is brightness.**
There are no drop shadows. Nothing is above anything else; it is brighter or
it is dimmer. Bloom — layered coloured `text-shadow` and `box-shadow` — is the
only depth cue, and it models phosphor scattering in the glass rather than an
object casting a shadow.

**04 — Emphasis is luminance, never weight or size.**
Six steps: `core`, `hi`, `base`, `mid`, `low`, `ghost`. Bolding a value to make
it matter more is not available in this system.

**05 — Colour is channel, not decoration.**
Five phosphors, each with a meaning. You do not mix them for visual interest —
you switch channel because the subject changed.

**06 — The chassis shows its own construction.**
Registration marks, tick rules, corner brackets, panel addresses and
coordinate stamps are visible. The instrument does not hide how it is built.
This chrome is deliberately non-functional and deliberately dim.

**07 — Motion is mechanical.**
Things step, sweep, snap and type. Nothing eases, springs or cross-fades — a
servo does not overshoot for charm, and a vector display cannot dissolve.

---

## 2. Channels

| Channel | Token prefix | Base | Meaning |
|---|---|---|---|
| P1 Viridian | `--p1-*` | `#22F07E` | Primary data — taxonomy, measurement, live values |
| P3 Amber | `--p3-*` | `#FF9E14` | Historical — deep time, provenance, caution |
| P4 Ice | `--p4-*` | `#5CB8F5` | Navigation and chassis — geometry, chrome, coordinates |
| PX Xeno | `--px-*` | `#FF5FD2` | The foreign — introduced range, non-native, anomaly |
| Alarm | `--al-*` | `#FF2E1F` | Critical only |

Each channel is a six-step luminance ramp: `core hi base mid low ghost`.

A container retunes its whole subtree by setting `data-channel`:

```html
<section data-channel="amber">
  <!-- every descendant now paints in P3 without knowing it -->
</section>
```

Components paint with `--ch-*`, never with `--p1-*` directly. That indirection
is what makes a component channel-agnostic.

The chassis is the exception: `--chassis-*` is permanently bound to ICE. The
instrument housing does not change colour when the readout does.

**Alarm is not an accent.** It means critical and nothing else. Using it for
emphasis is the single most damaging thing you can do to this system, because
it is the only signal that must never be ambiguous.

### Neutrals

There is no grey. What reads as neutral — panel borders, the lattice, inactive
chrome — is ice phosphor at 12–20% luminance, which biases the whole chassis
faintly cyan. That is a choice, not an inheritance.

---

## 3. Typography

Five voices. Every piece of text in the system is exactly one of them.

| Voice | Class | Size | Tracking | Use |
|---|---|---|---|---|
| Wordmark | `.t-title` | 15px | 0.62em | The mark only |
| Lead | `.t-lead` | 27px | 0.24em | Module headlines |
| Label | `.t-label` | 10px | 0.18em | Field labels, column heads, slugs |
| Data | `.t-data` / `.t-hero` | 19 / 40px | — | Numeric readout |
| Body | `.t-body` / `.t-fine` / `.t-micro` | 12 / 11 / 9px | — | Running text and captions |

**No webfonts.** The Artifact CSP blocks font CDNs, and in any case the
authentic face for an instrument readout is whatever monospace the terminal
shipped with. The display voice is that same monospace tracked out hard — the
1979 title-sequence move, where letters sit so far apart they read as a row of
separate lights before they resolve into a word.

Rules that hold everywhere:

- All uppercase voices carry tracking, and pull it back with a negative
  `margin-right` so the optical block still aligns to the grid.
- `font-variant-numeric: tabular-nums` is set on `body` and never turned off.
- An instrument never prints a bare number. Units, sign and precision are part
  of the value: `10.5 ka BP`, not `10500`.
- Counters are zero-padded to a fixed width so they do not reflow as they
  climb.
- Italic is permitted in exactly one place — scientific names, where it is a
  nomenclatural requirement rather than a flourish.

---

## 4. Space and stroke

An 8px baseline cell and a 64px module lattice, both drawn. Because the grid is
visible, spacing that lands off-grid is legible as an error rather than merely
being slightly wrong.

- `--hair` / `--rule` = 1px, `--heavy` = 2px. Those are the three widths.
- `--radius` = 0px.
- Components never carry their own margins. Spacing comes from `.stack`,
  `.stack-4/6/7` and `.row`, so sibling gaps cannot collapse or double.

---

## 5. Motion

| Token | Value | Use |
|---|---|---|
| `--d-instant` | 60ms | Key press |
| `--d-quick` | 140ms | Hover, focus |
| `--d-state` | 240ms | Meter fill |
| `--d-sweep` | 900ms | Beam sweep across a redrawing module |
| `--d-persist` | 620ms | Phosphor decay after a value changes |
| `--d-boot` | 2600ms | Power-on |

Easing is `linear` or `steps()`. There is one soft curve in the system,
`--e-snap`, used only by the power-on sequence.

**Phosphor persistence is the signature motion.** Any element carrying
`data-live` flashes to core brightness when its text changes and decays back.
It is automatic — a `MutationObserver` in `crt.js` applies it, so components
never call it themselves and can never forget to.

**Reduced motion** zeroes every duration and stops the interlace, grain, boot
and glitch. It does not stop the raster, bloom or vignette: those are physical
properties of the hardware, not animation, and removing them would change what
the thing *is* rather than how much it moves.

---

## 6. The raster stack

The compositing layers that make the page a cathode-ray tube rather than a
picture of one, bottom to top:

| z | Layer | What it is |
|---|---|---|
| 0 | `.lattice` | The console grid, at two frequencies, masked to fall off at the edges |
| 10 | content | The interface |
| 60 | `.raster__scan` | Horizontal scanlines at `--scan-pitch` |
| 61 | `.raster__grille` | Vertical aperture-grille mask — the chromatic fringing on bright text |
| 62 | `.raster__interlace` | A soft band drifting down the tube every 7.5s |
| 63 | `.raster__grain` | Electron noise, a 128px tile jumping on a 6-step cycle |
| 70 | `.glass` | Vignette, corner falloff, specular sheen |
| 100 | `.boot` | Power-on |

Everything above the content is `pointer-events: none`. You are looking
*through* the tube, not at it.

On screens narrower than 720px the scan pitch opens from 3px to 4px: at
phone pixel density a 3px pitch turns into mush.

---

## 7. Components

Twenty-one, all in `components.css`, all shown in
[`gallery.html`](gallery.html).

`module` · `rule` · `readout` · `ledger` · `meter` · `dial` · `lamp` · `btn` ·
`chan` · `index` · `term` · `tag` · `viewport` · `legend` · `era` · `season` ·
`trace` · `glyph` · `progress` · `alert` · `bracketed`

Two carry design arguments worth stating:

**`lamp`** encodes state in shape as well as colour — square for ok, diamond
for warn, pulsing circle for critical, hollow for idle — so it survives
greyscale and colour-blind reading.

**`meter`** fills in discrete cells rather than a smooth bar, because a segment
display has a finite number of segments. The gaps are cut with a repeating
mask, not drawn as separate elements.

### Chart forms

Each chart type exists because the data has that shape:

- **`seasonRing`** — a 12-month cycle drawn as a cycle. A bar chart of the
  months lies about December and January being far apart.
- **`eraRail`** — deep time on a log axis. Domestication events cluster in the
  last twelve millennia; a linear axis spends most of the tube on empty
  Pleistocene. Epoch labels alternate between two rows, because on a log axis
  label spacing is not under the designer's control.
- **`bars`** — ranked production. Ordered data, so a bar chart is honest.
- **`trace`** — a continuous series with an emphasised endpoint, which on a
  scope is where the beam is now.

---

## 8. The globe

`globe.js` draws an orthographic projection on a 2-D canvas, stroke-only with
additive bloom. Points on the far hemisphere are culled rather than hidden, so
paths break at the limb exactly as a plotter's pen would lift.

Dispersal legs are interpolated as great circles. A trade route is a path over
a sphere, and drawing it as a straight screen line would be a lie about the
geometry. Dashes march along each arc so direction reads without an arrowhead,
which at this scale would be two pixels.

Coastlines in `geo.js` are deliberately low-resolution. That is not a
compromise: a 1979 vector display plotted a few hundred points per frame, and
the coastline it drew was recognisably the world at exactly this fidelity.
Adding vertices would make the globe *less* accurate to what it is imitating.

---

## 9. Semiotic standard

Ron Cobb drew both the Nostromo's displays and its warning-label iconography.
This system carries its own icon set on the same logic: a fixed 24-unit grid,
stroke only, one idea per glyph, legible at 12px.

Fourteen glyphs, shipped as an inline SVG sprite:
centre of origin · wild progenitor · domestication · dispersal vector ·
genome · seasonality · output · evidence · locate · toxic raw ·
maritime route · overland route · clonal propagation · power.

---

## 10. Accessibility

Committing to a single dark theme is a design decision the subject earns; the
usual obligations still apply.

- Keyboard focus is a struck phosphor — the element goes to core brightness
  and gains an outline. Never removed, never a bare `outline: none`.
- The register is a `listbox` of `option` buttons; `aria-selected` tracks the
  live record.
- The log is `role="log" aria-live="polite"`, so appended lines are announced
  without stealing focus.
- Channel tabs are a real `tablist`; the alert is strobe-suppressed under
  reduced motion.
- State is never carried by colour alone — see `lamp`, and the severity
  prefixes in the terminal.
- The console is operable from the keyboard alone: `↑ ↓` or `j k` step the
  register, `/` focuses search, `1`–`4` switch channel, `Esc` leaves the field.

`prefers-reduced-motion` is honoured in `tokens.css` (durations to zero),
`effects.css` (animations off, boot skipped) and in JS (`typeOn` resolves
immediately, the globe slew is instant).

---

## 11. Practice

**Do**

- Raise luminance to emphasise. Core is the loudest thing available.
- Switch channel when the subject changes — history to amber, geometry to ice.
- Print units with every number and zero-pad every counter.
- Let modules scroll internally; the chassis holds still.
- Encode state in shape as well as colour.
- Mark a contested figure as contested, on the panel, not in a footnote.

**Don't**

- Add a drop shadow. There is no light source and nothing is above anything.
- Fill a shape or round a corner. Both are outside the display's vocabulary.
- Use alarm phosphor for emphasis.
- Cross-fade between states. A vector display redraws; it does not dissolve.
- Run the glitch ambiently — a fault that never stops signifies nothing.
- Bold a value to make it matter more. That is what luminance is for.

---

## 12. Known cascade hazard

`components.css` loads after `layout.css`, and `.module { display: flex }` ties
on specificity with a bare `.console__log { display: none }`. Source order
means the component rule wins and the "hidden" panel keeps claiming a grid
track. Responsive visibility rules are therefore scoped through the grid
container — `.console > .console__log` — which is also the honest selector,
since visibility at a breakpoint is a decision the console makes about its
children.

If you add a panel that hides at a breakpoint, scope it the same way.
