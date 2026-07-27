# NOGGIN — Zero-G Stretch Lab

A 3-D floating head you can grab and pull like the *Super Mario 64* title screen,
built as a real game: pull the face through floating rings against the clock.

Written from scratch in WebGL2 with **no dependencies and no toolchain**. Open
either file and it runs — nothing to install, no server required.

```
open noggin/play.html     # single self-contained file, no server needed
open noggin/index.html    # the same game, loaded as separate modules
```

Requires a browser with WebGL2 (Chrome/Edge/Firefox/Safari 15+).

## Building the single file

`play.html` is **generated** — don't edit it directly. `index.html` and `src/`
are the only source of truth. `build.js` inlines the modules into one file with
no dependencies and no toolchain:

```
node noggin/build.js                       # -> noggin/play.html
node noggin/build.js --fragment out.html   # body-only, for hosts that supply
                                           # their own document shell
```

The bundle makes zero external network requests, so it runs from `file://`, from
any static host, or inside a sandboxed frame with a strict content policy.

## Modes

- **Sandbox** — just the head. Pull it around, flick it, let it wobble.
- **Challenge** — 60 seconds. Rings spawn out of reach of the resting head, so the
  only way to reach one is to grab the face and stretch a piece of it through the
  aperture. Consecutive pops build a combo multiplier; smaller and further rings
  are worth more. Best score is saved to `localStorage`.

## He talks. Constantly.

He delivers unprompted botany facts in a speech bubble anchored to his head,
with a procedural babble voice blipping under the typing, and he does not stop
for anything. Sandbox, timed run, mid-wobble — he talks through all of it. The
only thing that shuts him up is a hand on his face.

Grab him and he is cut off mid-word. Let go and he restarts the exact same fact
from the beginning, prefaced with a complaint. You cannot skip a fact by
interrupting it, only make it take longer.

Two counters drive how bad he gets:

- **Lines delivered without interruption.** His sign-offs climb four tiers, from
  *"That is the kind of thing I know."* to *"I HAVE BEEN TALKING FOR A WHILE NOW
  AND I AM NOT SLOWING DOWN."* Past a couple of lines he also starts stapling a
  second fact onto the end of the first before you can get away — utterances
  grow from about 110 characters to nearly 400.
- **Times you have cut him off.** His complaints climb their own four tiers,
  from *"Rude."* to *"GRAB ME AGAIN. SEE WHAT HAPPENS. I WILL SIMPLY BEGIN
  AGAIN."*

During a timed run he also heckles your play, talking over his own sentence to
do it and then returning to the abandoned fact. The bubble goes translucent and
stays below the score bar there, but on a long rant it will cover part of the
playfield — that is the deal you accepted.

Every fact he states is true; he is obnoxious, not wrong. Press `T` (or the
`TALK` button) when you have had enough.

## Controls

| Action | Input |
| --- | --- |
| Stretch the face | drag on the head |
| Orbit | drag empty space, or right-drag |
| Zoom | wheel / pinch |
| Grab radius | `[` `]` or shift+wheel |
| Snap back | `space` / `R` |
| Quality preset | `1` `2` `3` |
| Output mode / HUD / floor | `K` / `H` / `G` |
| Fullscreen / mute | `F` / `M` |
| Start challenge / back to sandbox | `enter` / `esc` |

Touch works too: one finger stretches, two fingers orbit and pinch-zoom.

## How the stretching works

The head is simulated in local space as a **displacement field over the mesh
vertices**. Each vertex is pulled toward its rest position by a spring, while a
Laplacian coupling term diffuses displacement across the one-ring neighbourhood:

```
d_i    = p_i - rest_i
lap_i  = mean(d_j for j in neighbours(i)) - d_i
a_i    = -k * d_i + c * lap_i
```

The coupling term is what makes a single pulled point drag a smooth rubbery tube
of surface with it, and what makes the release wobble travel across the face
instead of snapping back vertex-by-vertex. Stiffness and damping are tuned to a
damping ratio near 0.2 — enough overshoot to read as rubber, few enough cycles
that the face is home in about a second.

Grabbing floods **geodesic** distance outward from the picked vertex (Dijkstra
over rest edge lengths) rather than euclidean distance, so pulling the nose tip
doesn't drag the lip that happens to sit nearby in space. Vertices inside the
radius become kinematic with a smoothstep falloff, and their induced motion is
blended into their velocity, so releasing a fast drag flicks the surface.

Two constraints keep it from breaking: a soft displacement ceiling with an
elastic knee, and a keep-out sphere at the core so a hard inward push cannot
fold the face through the back of the skull.

The eyes, ears, brows and hair curl are **not** part of the simulated topology.
They are skinned to the head's displacement field through precomputed
nearest-vertex weights, so they ride along with whatever the face does. Because
that skinning only translates them, their normals are computed once at build
time and never recomputed — which is also why per-frame normal work covers only
the head's triangles.

The head itself is procedural: an icosphere displaced by a set of anisotropic
gaussian features (nose, brow ridge, cheeks, chin, eye sockets, lips, jaw taper),
with the facial detail that geometry reads too softly — lips, nose tip, ear
cartilage, cheek flush — carried in vertex colour.

## How the 4K / 120 fps side works

The scene renders into an HDR (`RGBA16F`) offscreen target whose size is
**decoupled from the canvas backing store**. That separation is the whole trick:
the canvas can be a true 3840×2160 while the internal target scales down to hold
the frame budget, and the composite pass upscales on the way out.

- **Output modes** (`K`): `AUTO` (capped device pixel ratio), `4K` (forces a
  3840×2160 backing store regardless of window size), `NATIVE` (raw DPR).
- **Adaptive resolution** targets a configurable frame budget — 60/120/144/165/240.
  It measures real GPU time via `EXT_disjoint_timer_query_webgl2` where available
  and falls back to CPU frame time. Changes are quantised and gated behind a
  20-frame hold so the render targets aren't reallocated on every wobble.
- **Physics is decoupled from rendering** at a fixed 240 Hz. At 120 fps that lands
  on exactly two substeps per frame. On a machine that can't hold the target the
  step widens rather than dropping simulated time, so the rubber keeps behaving in
  real time instead of going slow-motion.
- Streaming vertex data alternates between two buffers, so a per-frame write never
  lands on the buffer the GPU is still reading.

The HUD reports all of it live: fps, CPU frame time, GPU time, soft-body time,
backing store, render target, scale, megapixels shaded, and GPU headroom.

Pipeline per frame: shadow depth → HDR scene (optionally 4× MSAA, resolved) →
bloom prefilter and separable blur at half res → ACES tonemap, vignette,
chromatic aberration and dither to the default framebuffer.

## Verified behaviour

Checked in headless Chromium (the numbers below come from a software rasterizer,
so treat the timings as an upper bound, not a benchmark):

- 4K path allocates 3840×2160 with a complete framebuffer, renders a full frame
  with zero GL errors, and reads back as a real shaded image.
- Adaptive controller drops 3840 → 2304 px wide under simulated overload and
  recovers to 3840 when the load clears.
- Release settles from a 1.66-unit pull to 0.03 within 1.5 s of simulated time,
  with a single strong overshoot.
- Rings spawn, score, build combos, expire, and end the round; best score
  persists.
- All three quality presets rebuild the mesh and GPU resources cleanly.

## Files

```
index.html        markup, HUD, styling
play.html         generated single-file bundle (build.js output)
build.js          zero-dependency bundler
src/math.js       vec3 / mat4 / PRNG
src/geometry.js   icosphere, adjacency, head sculpt, character build, skin binding
src/softbody.js   the solver: springs, Laplacian coupling, grab, picking
src/chatter.js    the monologue: fact pool, typing, interruption
src/shaders.js    all GLSL ES 3.00
src/renderer.js   WebGL2 pipeline, render targets, GPU timing
src/audio.js      procedural SFX (no audio assets)
src/game.js       rings, scoring, particles, screen shake
src/main.js       camera, input, frame pacing, adaptive resolution, HUD
```

Sound is synthesised at runtime — the stretch voice tracks how far you're
pulling, and the release boing's pitch sweep and wobble scale with it.
