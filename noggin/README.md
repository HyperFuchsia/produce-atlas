# Produce Atlas

A luminous being you can talk to. Name a food plant and it conjures a real one
into the room **at its true size**, then tells you far more about it than you
asked for. You can also reach in and pull at it — it is not as solid as it
looks.

Written from scratch in WebGL2 with **no dependencies and no toolchain**. Open
either file and it runs — nothing to install, no server required.

```
open noggin/play.html     # single self-contained file
open noggin/index.html    # the same thing, loaded as separate modules
```

Requires a browser with WebGL2 (Chrome/Edge/Firefox/Safari 15+).

## Using it

```
you   let's talk about an apple
him   Oh, an apple! Yes. Hold on, I will get one.
him   There it is. A real one — 7.2 cm long and 8 cm across — roughly a third
      of me. And that is exactly how big it is in here.
him   What would you like to know about apples?
```

Then ask follow-ups — it holds the subject, so you don't have to keep naming it:

| Ask | You get |
| --- | --- |
| `how big is it?` | dimensions in cm, measured against the being |
| `where is it from?` | origin and wild ancestor |
| `what family is it in?` | family and binomial |
| `is it a fruit?` | what it actually is, botanically |
| `what does it taste like?` | flavour, and the chemistry behind it |
| `more` | it will not stop |
| `help` | every specimen it holds |
| `clear` | sends it away |

Drag on it to pull the shell around, drag the background to orbit, wheel or
pinch to zoom.

## Scale

**One world unit is 10 cm**, and the being is about 23 cm across. Everything
inherits that: a 1.5 cm coffee cherry really is a speck beside it, a 34 cm
watermelon really is wider than the being itself, and the floor is ruled at one
line per 10 cm. The camera pulls back on its own to fit whatever arrives, and
each specimen is captioned with its real dimension.

Figures are typical specimens — a supermarket apple, not a prize one.

## It is not a language model

The runtime capabilities a published page can be granted are `downloads` and
`mcp`; there is no completion capability, and the content policy blocks every
external host. A page like this one cannot call a model at all.

So the brain is 26 curated entries. It matches a specimen, works out which
aspect you asked about, and answers from verified data. For an evidence-led
atlas that is arguably the better trade — a small set of checked answers beats a
large set of confident guesses — and when you ask for something outside the 26
it says so rather than inventing an answer.

## How the pieces work

**The specimens** are procedural. Each is a revolved radius profile plus
optional ribs, a bend, a stem, leaves, a leaf crown, or a scatter into a
cluster — enough vocabulary to make an apple, a banana, a carrot, a bunch of
grapes and a pineapple recognisable from one small data table. They render
through the same shader as the being and cast the same shadows.

**The being** is a soft body. Each vertex is sprung back to its rest position,
with a Laplacian coupling term diffusing displacement across the one-ring
neighbourhood:

```
d_i    = p_i - rest_i
lap_i  = mean(d_j for j in neighbours(i)) - d_i
a_i    = -k * d_i + c * lap_i
```

That coupling is what drags a smooth rubbery tube of surface along with a pulled
point instead of moving vertices one at a time. Grabbing floods **geodesic**
distance from the picked vertex (Dijkstra over rest edge lengths) rather than
euclidean, so a pull drags the surface that is actually connected to it rather
than whatever happens to sit nearby in space. A soft displacement ceiling and a
keep-out sphere stop a hard push folding the shell through itself.

**Its appearance** is a thin-film interference shell over a lit core. Film
thickness varies with view angle and drifts across the surface, so the hue
sweeps the way an oil film does — light through the middle, spectrum gathering
at the rim — wrapped in two halo rings turning on crossed axes.

It has no face, so **a bright focal point on the shell carries all of the
looking**. It slides to whatever has its attention: the specimen, your
viewpoint when you type, or somewhere across the room when the stage is empty.
Speech travels outward from that point as concentric rings, and pulling on the
shell stresses it into a glow along the strain.

**Rendering** is shadow depth → HDR scene → half-res bloom → ACES tonemap. The
scene target is sized independently of the canvas, and a controller trades
internal resolution to hold a 120 Hz budget. There is deliberately no readout;
it just stays smooth.

**Sound** is synthesised at runtime — no audio assets. Its voice is a blip per
few characters, pitched off the character being typed, and the release of a
stretch is a pitch sweep with a wobble on top.

## Building the single file

`play.html` is **generated** — don't edit it. `index.html` and `src/` are the
only source of truth.

```
node noggin/build.js                       # -> noggin/play.html
node noggin/build.js --fragment out.html   # body-only, for hosts that supply
                                           # their own document shell
```

The bundle makes zero external network requests, so it runs from `file://`, from
any static host, or inside a sandboxed frame with a strict content policy.

## Files

```
index.html        markup, styling
play.html         generated single-file bundle
build.js          zero-dependency bundler
src/math.js       vec3 / mat4 / PRNG
src/geometry.js   icosphere, adjacency, the being's shell and halo rings
src/softbody.js   the solver: springs, Laplacian coupling, grab, picking
src/produce.js    procedural specimen meshes, built at true scale
src/knowledge.js  the atlas: 26 food plants, shapes, dimensions, botany, facts
src/brain.js      intent matching and answers over the atlas
src/chat.js       the conversation surface
src/shaders.js    all GLSL ES 3.00
src/renderer.js   WebGL2 pipeline, render targets
src/audio.js      procedural sound
src/main.js       camera, input, frame loop, specimen staging
```
