# A Naming Error

A 30-plate cinematic sequence arguing that **"artificial intelligence" is a bad name**, using a
counterfactual — *what if chemistry had called itself "Artificial Biology"?* — to make the absurdity
visible.

Built to be **screen-recorded for YouTube**, not presented in a room. There are no bullet points,
nothing is centered, and no slide ever "flies in."

Open `index.html` in a browser. No build step, no dependencies, no network access required — both
typefaces are embedded in the file.

---

## Recording it

| Key | Action |
| --- | --- |
| `Space` | play / pause (also click anywhere on the frame) |
| `←` `→` | step between plates |
| `Home` / `End` | first / last plate |
| `R` | restart from plate 01 and play |
| `F` | fullscreen |
| `C` | **clean mode** — strips the plate number, rail, timecode and progress bar |
| `S` | voiceover script panel |
| `G` | title-safe / action-safe / rule-of-thirds guides |

The stage is a fixed **1920 × 1080** frame, letterboxed and scaled to fit whatever window you give it.
At a 1920×1080 viewport the scale is exactly 1:1, so a 1080p capture is pixel-perfect with no resampling.

**Suggested capture routine:** fullscreen (`F`) on a 1080p display → `C` to hide the apparatus → `R` to
restart → record. The mouse cursor and the key hints both auto-hide after ~2.5s of stillness, so
nothing leaks into the frame.

Total runtime is **4:40** of visuals. Narration will naturally run longer than the on-screen beats, so
either read at a relaxed pace against the timings or record voice first and stretch the per-plate
durations to match (see below).

## The script

Press `S` for the full voiceover script, timecoded per plate, with the current plate highlighted as
it plays. **Copy script** puts the whole thing on your clipboard as timecoded text; **Copy timings**
gives you a tab-separated `timecode / duration / act` table to paste into an editor.

Sources for every factual claim are listed at the bottom of that panel.

## Structure

| Plates | Act | Beat |
| --- | --- | --- |
| 01–02 | Cold open | The term, struck through |
| 03–06 | I — Provenance | Dartmouth 1955; the names McCarthy rejected; a flag, not a description |
| 07–10 | II — The two words | "Artificial" implies a fake; "intelligence" has no agreed definition |
| 11–21 | III — The analogy | Wöhler 1828 → the *Artificial Biology* counterfactual → the goalposts move in both worlds |
| 22–25 | IV — What everyone else did | Aviation, submarines, synthetic biology — named for mechanism |
| 26–30 | V — What to say instead | The actual mechanism; honest names; why the name has stakes |

The hinge is plates 17 and 18: the **same layout, twice** — once in the biology world, once in ours —
so the goalpost-moving reads as identical behaviour rather than as an argument being asserted.

---

## Design notes

Two worlds share one ground, and the accent swaps between them on a 1.2s crossfade:

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#07080A` | ground — near-black, biased blue |
| `--bone` | `#EDE7DA` | marks — paper white, never pure `#fff` |
| `--duplicator` | `#8B7FEE` | **machine** world — spirit-duplicator aniline violet, the ink a 1955 grant proposal was actually run off in |
| `--dichromate` | `#E4783C` | **life** world — potassium dichromate orange, from chemical plate work |
| `--rubine` | `#D63E5C` | correction marks *only* — never used for anything else |

**Type is two faces, both embedded as base64 woff2** (SIL Open Font License):

- **Bodoni Moda** — a true didone, period-correct for both 1828 chemical plates and 1950s title
  pages. Carries every statement and every pull quote. Used at large sizes only, where its hairlines
  stay thick enough to survive 1080p encoding.
- **Courier Prime** — the typewriter of the grant proposal. Carries every label, plate number,
  annotation, list and lede.

There is deliberately **no neutral sans anywhere in frame**. A grotesque would have been the generic
choice; the didone/typewriter pair with nothing in between is what makes it read as a scientific
document rather than a deck. (A sans is used in the script panel, which is UI and never recorded.)

The visual conceit throughout is **a document being corrected in real time** — because the argument is
about a name, the correction marks land on words: strikes draw themselves through rejected terms, a
hand-drawn ellipse rings the one that stuck.

Backgrounds are generated on a single `<canvas>` with one render loop, keyed off the live plate —
mimeographed typescript, a urea lattice, receding goalposts, a loss surface, colony plates. Nothing
is a stock image, so nothing needs licensing.

The piece commits to a single dark visual world rather than offering a light theme: it's a film
frame, and a theme toggle mid-capture would be a defect, not a feature.

---

## Editing the content

Each plate is one `<section class="scene">` carrying its own direction:

```html
<section class="scene"
         data-dur="9500"          <!-- milliseconds on screen -->
         data-world="life"        <!-- machine | life — drives the accent -->
         data-art="lattice"       <!-- canvas renderer for this plate -->
         data-act="III — The analogy"
         data-vo="Spoken line for this plate.">
```

Changing `data-dur` is all it takes to re-time the sequence against a recorded voice track — the
timecodes, progress bar, and script panel all recompute from it.

`data-art` accepts: `noise`, `proposal`, `lattice`, `network`, `tokens`, `cells`, `goalpost`,
`flock`, `sonar`, `loss`.

Reveal timing uses `--d` (milliseconds) on any `.rv` / `.rv-l` / `.rv-f` element, `--sd` on a
`.strike` or `.circle` for when the correction mark lands, and `data-stagger` on a `.split` heading
for per-word delay.

### Using your own images

Every background is procedural, but if you want photography or stills behind a plate, add an image
layer to that section and let the canvas sit underneath:

```html
<section class="scene" data-art="noise" ...>
  <img src="plate-12.jpg" alt="" class="bg">
  ...
</section>
```

```css
.bg{position:absolute; inset:0; width:100%; height:100%; object-fit:cover;
    opacity:.32; filter:grayscale(1) contrast(1.1); z-index:3}
.is-live .bg{animation:kenburns 12s ease-out both}
@keyframes kenburns{from{transform:scale(1.06) translate(1%,1%)} to{transform:scale(1.14)}}
```

Keep them desaturated and under ~35% opacity or they'll fight the type. Note that if you publish this
as a hosted artifact, external image URLs are blocked — embed images as `data:` URIs, the way the
fonts already are.
