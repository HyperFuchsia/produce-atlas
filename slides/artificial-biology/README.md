# A Naming Error

A 30-plate cinematic sequence arguing that **"artificial intelligence" is a bad name**, using a
counterfactual — *what if chemistry had called itself "Artificial Biology"?* — to make the absurdity
visible.

Built to be **screen-recorded for YouTube**, not presented in a room. There are no bullet points,
nothing is centered, and no slide ever "flies in."

Open `index.html` in a browser. No build step, no dependencies, no network access required — both
typefaces are embedded in the file.

---

## Playing it

There's a control bar along the bottom — **prev · play/pause · next · restart · fullscreen · clean ·
script** — so the piece is fully operable with the mouse. Clicking anywhere on the frame also toggles
play/pause. The bar fades out after a few seconds of stillness while playing, and reappears on any
mouse movement; it stays put whenever the piece is paused.

The keyboard shortcuts below do the same things, but note that **an embedded page receives no key
events until you click it once** to give it focus. That's why the buttons exist.

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

**Suggested capture routine:** fullscreen (`F`) → `C` to hide the apparatus → `R` to restart → record.
The mouse cursor and the key hints both auto-hide after ~2.5s of stillness, so nothing leaks into
the frame.

### Resolution

The piece is authored in a 1920×1080 coordinate space and the stage is transform-scaled to whatever
the viewport gives it, so **type and vector work re-rasterise crisply at any output size, 4K
included** — there is no fixed-resolution bitmap anywhere in the design.

The one exception is the `<canvas>` backing the generated art, whose backing store is real pixels.
It is re-allocated at the true device resolution on load and on resize, so it reaches 3840×2160 by
either route a viewer gets to 4K:

| Viewport | devicePixelRatio | Canvas backing |
| --- | --- | --- |
| 3840×2160 | 1 | 3840×2160 |
| 1920×1080 | 2 *(Retina / scaled 4K)* | 3840×2160 |
| 1920×1080 | 1 | 1920×1080 |
| smaller window | 1 | 1920×1080 |

Film grain holds its texel size constant in device pixels rather than scaling with the frame, so 4K
gets *finer* grain, the way a faster film stock would — not the same grain blown up.

## Rendering a true 4K master

A screen recording can never contain more pixels than the display it was taken from, so if you don't
have a 4K panel — or you just want a clean master with no compositor noise and no dropped frames —
render it offline instead:

```bash
npm i playwright
node render-4k.mjs                       # -> a-naming-error-2160p.mp4
```

This drives the page frame by frame in headless Chromium at `deviceScaleFactor: 2` and pipes frames
straight into ffmpeg. Every CSS animation is pinned to an exact `currentTime` and the canvas clock is
derived from the global timeline, so a given frame index always renders identically — re-running
produces byte-identical frames.

| Option | Default | |
| --- | --- | --- |
| `--out <path>` | derived from codec | output file |
| `--fps 30` | 30 | frame rate |
| `--height 2160` | 2160 | use `1080` for a 1080p master |
| `--plates 1-6` | all | render a subset, 1-indexed inclusive |
| `--frames png\|jpeg` | png | capture format |
| `--codec h264\|prores\|vp9\|vp8` | h264 | |
| `--workers N` | cores−1, max 6 | parallel renderers |
| `--apparatus` | off | keep plate number / rail / timecode in frame |
| `--chrome`, `--ffmpeg` | | explicit binaries |

**You need a full ffmpeg** — `brew install ffmpeg` or `apt install ffmpeg`. Do *not* point it at the
copy bundled with Playwright: that is built with `--disable-everything` and has no PNG decoder, no
libx264 and no mp4 muxer. The script checks up front and tells you exactly what's missing rather
than failing halfway.

**Timing.** PNG capture at 4K costs roughly 4s per frame per worker — that's Chromium's PNG encoder,
not the page — so a full 4:40 run at 30fps is about 2.5 core-hours: roughly 40 minutes on 8 cores.
`--frames jpeg` is about 4× faster and fine for previews, but JPEG chroma subsampling softens crisp
type on dark grounds, which is precisely this piece's worst case. Keep PNG for anything you'll
actually upload.

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
