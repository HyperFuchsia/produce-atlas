# Produce Atlas — 3-D Information Space

Throw information in; it comes back as cinematic, animated typography flying
above an 80s sunset ocean.

Paste (or drop) any text into the composer and the space typesets it into real
extruded 3-D glyphs, arranges them into a sequence of cards strung along a
flight path over the water, and flies you through them — each card arriving with
its own choreography, casting a coloured light column on the sea beneath it.

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # static bundle in dist/
```

## How the text becomes a 3-D animation

```
raw text
  → parse.js      structure  (titles, headings, bullets, stats, quotes, key/value)
  → compose.js    typesetting (wrap, pack into cards, place every glyph)
  → textStage.js  meshes      (extruded geometry + per-glyph material)
  → animations.js choreography (where each glyph comes from, and when)
  → director.js   camera       (flight path, dwell, parallax)
```

### 1. Structure, from whatever you paste

No markup is required — plain prose still lands with a hierarchy. When light
Markdown-ish hints happen to be present they are honoured:

| You write | You get |
| --- | --- |
| `# Heading` / `Heading` on its own line / `ALL CAPS` | a headline card, with a neon rule under it |
| the first heading (or a short first line) | the opening title card |
| `- item` / `* item` / `1. item` | a list that unfolds line by line, each with a spinning marker |
| `Origin: Western South America` | a small tracked-out label above a display-weight value |
| a lone `7000`, `88%`, `€2.4bn` | a hero statistic, punched out in gold |
| `> quoted line` | a quote that rides in on the swell |
| `---` | a divider |

Everything else is body copy. Emphasis, links and code ticks are stripped —
this is a stage, not a document viewer.

### 2. Typesetting

Two SIL Open Font License faces are converted to three.js typeface JSON at build
time (`npm run fonts`) — **Orbitron Bold** for display and **Rajdhani SemiBold**
for text. Each character becomes an `ExtrudeGeometry` at em size 1, cached and
shared across every occurrence, recentred on its own bounding box so it can be
spun about its middle. Lines are wrapped, packed into cards that fit the reading
frame, and every glyph gets an absolute placement.

### 3. Choreography

Seven reveal styles, chosen per card automatically or pinned from the UI:

- **surface** — type rises out of the water, straightening as it clears the swell
- **swarm** — characters converge from a sphere of scattered debris
- **unfold** — each glyph hinges down out of edge-on, like a split-flap board
- **ignite** — letters punch out of nothing in reading order
- **tide** — a swell passes along each line and leaves the type behind it
- **descend** — type drops in and settles with a small bounce
- **warp** — characters streak in from behind the viewer

Each glyph carries its own start state, delay and easing, flashes as it lands,
then keeps a barely-there idle sway. On exit the card breaks apart and drifts
away. Titles are polished chrome that mirror the sunset; body copy is softer and
slightly self-lit so it stays readable when backlit.

### 4. The world

The background is not a backdrop — it is lit by the same sun the type reflects.

- **Sky** — one GLSL function draws the gradient, the slatted sun, the stretched
  cloud belt and the star field. The same function is baked into a pre-filtered
  environment map, which is what the chrome type actually reflects.
- **Ocean** — three travelling swells displace a viewer-following mesh; shorter
  ripples live per-pixel in the normal. The sun column on the water is the sky
  function sampled along the reflection vector, so sea and sky can never drift
  out of step. A neon grid scrolls across it, anti-aliased in screen space.
- **Light columns** — every visible card pushes a coloured, shimmering streak
  onto the water below it, aimed at the camera.
- **Horizon ridge**, **drifting motes**, and a grade pass with radial chromatic
  aberration, CRT scanlines, grain and a vignette finish it off.

Three palettes ship: **Miami Sunset**, **Neon Void**, **Aqua Dusk**. Switching
one re-bakes the environment map, so reflections follow.

## Controls

| | |
| --- | --- |
| <kbd>Space</kbd> / <kbd>→</kbd> | next card |
| <kbd>←</kbd> | previous card |
| <kbd>R</kbd> | replay the current reveal |
| <kbd>P</kbd> | pause / resume autoplay |
| <kbd>H</kbd> | hide the interface |
| <kbd>F</kbd> | fullscreen |
| <kbd>⌘/Ctrl</kbd> + <kbd>Enter</kbd> | materialize the composer text |

Drop a `.txt` or `.md` file anywhere on the page to load it. Moving the mouse
parallaxes the camera. Text, palette, reveal style and pace persist locally.

## Layout

```
index.html            shell + composer markup
src/
  main.js             boot, the frame loop, adaptive quality
  config.js           palettes, type scale, world and camera tuning
  sample.js           the opening content
  style.css           interface
  world/
    sky.js            gradient dome + environment bake
    ocean.js          waves, reflections, grid, light columns
    scenery.js        light rig, drifting motes, horizon ridge
    shaders/sky.glsl.js   the sky function, shared by dome and ocean
  text/
    typeface.js       font loading, glyph geometry cache, metrics
    parse.js          text -> typed blocks
    compose.js        blocks -> laid-out cards
    materials.js      per-role material recipes
  stage/
    textStage.js      cards -> meshes, timelines, disposal
    animations.js     reveal and exit choreography
    director.js       camera flight and pacing
    path.js           where cards sit and where they are read from
  postfx/composer.js  bloom + grade
  ui/controls.js      composer, HUD, keyboard, drag-and-drop
scripts/
  build-fonts.mjs     TTF -> three.js typeface JSON
  shoot.mjs           headless screenshots at chosen moments
  smoke.mjs           end-to-end checks
```

## Performance notes

Only the active card and its immediate neighbours are ever built; the rest are
descriptors in memory. Glyph geometry is shared, so a page of text costs one
geometry per distinct character. If frames run consistently late the pixel ratio
drops and bloom is switched off automatically.

## Development helpers

Both helpers drive a real browser, so point `CHROME_PATH` at a Chromium build if
Playwright's own download is not available:

```bash
npm run build && npx vite preview --port 4173 &

# frames at chosen moments in the flight (the harness owns the clock, so this
# works even under software rendering)
node scripts/shoot.mjs shots --times=3.5,10,22,30 --ui=off --palette=miami

# end-to-end checks: composing, navigation, every reveal style, palette
# switching, awkward input, a long unattended run, resize
node scripts/smoke.mjs
```

### Regenerating the fonts

The generated typeface JSON is tracked; the source TTFs are not. To rebuild:

```bash
mkdir -p fonts-src
curl -sSL -o fonts-src/Orbitron-Variable.ttf \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/orbitron/Orbitron%5Bwght%5D.ttf"
python3 -m fontTools.varLib.instancer fonts-src/Orbitron-Variable.ttf wght=700 \
  -o fonts-src/Orbitron-Bold.ttf                      # needs `pip install fonttools`
curl -sSL -o fonts-src/Rajdhani-SemiBold.ttf \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/rajdhani/Rajdhani-SemiBold.ttf"
npm run fonts
```

Both faces are SIL Open Font License 1.1; the license texts sit beside the
generated JSON in `public/fonts/`.
