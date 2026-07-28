# Produce Atlas

**Say a word, and the thing you named is standing in the room.**

```
you   pineapple
it    A pineapple. Watch.
```

And it *is* one. Not a picture of one, not a paragraph about one — the being
you were talking to a second ago is now a pineapple, 18 cm tall, crown and all,
and you can reach in and squash it.

## Why bother

Every chat interface built so far is the same interface: you put text in a box,
and text comes back. That was remarkable in 2022. In 2026 it is a text field.
You can bolt features onto it forever — memory, tools, longer context — and it
is still a text field, and text fields get old.

The problem is not that the answers are bad. It is that **the answer is always
the same shape as the question.** Ask what a pineapple is and you get a
paragraph. Ask what the fourth dimension looks like and you get a paragraph
about how hard it is to picture — which is the one thing a paragraph is worst
at. The model knows the answer and hands you the least useful possible form of
it.

This is the other option. The reply is not a description of the thing, it *is*
the thing: to scale, in the room, lit, and pullable. Ask about a pineapple and
it becomes a pineapple. Ask what the fourth dimension looks like and it walks
you from a point to a line to a square to a cube and then turns itself into a
tesseract's shadow. Ask whether it is a solid, and it turns to stone and falls
on the floor.

None of that is a feature bolted onto a chat box. It is what happens when the
answer is allowed to have a shape.

The full argument — what it is for, what it is measured against, what would
disprove it, and a running log of what has shipped and why — lives in
[CASE.md](CASE.md).

Written from scratch in WebGL2 with **no dependencies and no toolchain**. Open
either file and it runs — nothing to install, no server required.

```
open noggin/play.html     # single self-contained file
open noggin/index.html    # the same thing, loaded as separate modules
```

Requires a browser with WebGL2 (Chrome/Edge/Firefox/Safari 15+).

## Naming something is the whole instruction

There is no command to learn. Anything that names something it knows makes it
become that thing, and every one of these does the same:

```
pineapple                    what is a pineapple?
tell me about pineapples     how big is a pineapple?
become a pineapple           is a pineapple a berry?
```

A question is just the same instruction with something to answer attached — it
becomes the pineapple *and* tells you it is a collective fruit, dozens of
flowers fused into one body. Then it holds the subject, so `where is it from?`
works without naming it again, and it answers as the thing it currently is.

If you want the old behaviour — the specimen standing *beside* it, so the two
can be compared at true scale — say so: `show me a watermelon next to you`.
And `be yourself again` puts it back.

### It is not only plants

```
you   car
it    Easy. Watch this.
it    There. A car — 450 cm long and 180 cm across — wider than I usually am.
      Which is a lot to be.
```

At **true scale**, which is the point: 4.5 metres of car against a being that is
23 cm across. It stands on the ground rather than hovering, the camera pulls
back to forty-odd units to hold it, the shadow map and the floor grow with it,
and the floor coarsens from one line per 10 cm to one per metre so the room
still reads at that distance. Nothing about that is special-cased for cars —
anything too big to hover rests on the ground on its own.

A car is not a solid of revolution, so it is a **hull**: lofted along its own
length with separate roofline and floorpan curves and a superellipse
cross-section, which is a rounded rectangle when you want one. Sections narrow
as they rise — tumblehome — because a constant-width section is a loaf.

But a car is **two volumes**, the body and the narrower glasshouse sitting on
it, and one cross-section per station cannot be two widths at once however it
is tapered. So the cabin is its own lofted shell in glass rather than paint,
riding along with the wheels and hubs on the same mechanism that carries a
pineapple's crown. Dark glass above a coloured body is most of what "car" looks
like from any distance; wheels are the rest.

And it does not pretend to have a botany. Ask what it is and it says it is a
machine — no ancestor, no wild relative, somebody drew it. The plant answers are
only worth trusting because the atlas does not make things up, and that has to
survive the atlas growing.

This works because every specimen can be projected onto the being's own
icosphere topology — polar angle picks the profile parameter, azimuth picks the
way round — so taking a form is a **morph of rest positions**, not a mesh swap.
Same vertex count, same adjacency, solver running throughout, which is why the
change wobbles its way there instead of snapping. It keeps a little
interference along the rim the whole time, so it never stops being itself.

What a closed sphere cannot express — a stem, leaves, a pineapple's crown — is
built separately in the same local frame and rides its transform, growing out
of the body as the morph lands.

## It gets bored

Pull it around for a while without typing anything and it makes an offer:

```
it    Would you like me to help you with that?
```

Then a cursor hand flies in from off-screen, hooks a finger into the shell, and
starts stretching it alongside you. *"You looked like you were having too much
fun doing this on your own, so I wanted to join."*

It is a real second grab on the solver, not an animation played over the top —
which is why the two pulls fight over the same shell the way two hands would.
Type anything and it lets go, slightly embarrassed.

## Ask what it is

```
you   what are you?
it    What am I. Easier to show you.
it    Solid.
```

It stops floating, goes dark and heavy, and drops on the floor. Then `Liquid.`
and it slumps into a puddle. Then `Gas.` and it boils off into a cloud. Then it
reassembles and says the only line it has earned: *"So: I can be anything. And
I am here for anything."*

The claim rests on something you just watched, not on an adjective. Answering
that question with a paragraph about being a helpful AI assistant is exactly
the failure this whole thing is arguing against.

## Ask what it is made of

```
you   are you a solid, liquid or gas?
it    Solid, liquid or gas.
```

Then it stops floating. Goes dark, goes heavy, and **drops** — a real fall, on
gravity, landing on the actual floor with a squash and a thud that shakes the
frame. From down there it asks *"What do you think now?"*, waits exactly long
enough for you to start answering, and cuts you off: *"No. Do not answer. I was
not finished."* Then it slumps into a puddle, boils off into a cloud, and
reassembles.

Each state is a different physical object, not a costume:

| | shape | body | look |
| --- | --- | --- | --- |
| **solid** | unchanged | stiff, settles in a beat | dark, no glow, and the light it was casting on the floor goes out with it |
| **liquid** | a wide domed puddle with an uneven rim | slack and heavily coupled, so the wobble travels | wet, still glistening |
| **gas** | a lumpy cloud, twice its own size | loose | additive, mottled, thinning to nothing at the edge — no silhouette |

**The ground is solid.** Every vertex is constrained against the floor plane in
world space, not just the body's centre — which is the difference between a
landing that flattens against the ground and one that posts its own underside
through it, and between a melt that spreads on the floor and one that sinks
into it. Contacting vertices lose their downward velocity and bleed their
sideways velocity, so a puddle grips where a rock slides. Drag the being down
into the floor by hand and it squashes against it.

**Boiling off is a plume, not a balloon.** A flat puddle inflating into a
sphere is the wrong gesture entirely, so while it is changing state the mass is
drawn upward and pinched inward, seething at a higher frequency than settled
vapour does, and only opens out once it has left the ground.

The line after the drop is not on a timer. It waits on the body: the script
holds until the being actually lands, so the joke keeps its timing however long
the fall takes.

## Ask it to explain something

Because it can take any shape, it can also *be* the explanation. Ask about the
fourth dimension and it does not describe one — it builds up to it.

```
you   what does the fourth dimension look like?
it    Zero dimensions. A point. It has a position and nothing else.
it    Drag that point along one direction and it sweeps out a line...
```

It becomes each one as it says it: a point, a line, a square, a cube, and then —
because there is no fourth direction to point at — it shrinks to a seed at the
centre of a **tesseract**, drawn as 16 corners and 32 edges rotating in the *xw*
and *yw* planes and projected down to three dimensions from the *w* axis. That
projection is the whole lesson: corners further along *w* land closer to the
middle, which is exactly why the inner cube looks small when it is not.

Both routines run off the same table. A routine is data — an ordered list of
steps, each one a line of narration plus what the scene should do while it is
spoken:

```js
{ text: 'Drag the square at a right angle to both of those...',
  form: 'cube',      /* morph the being ('self' returns it)  */
  phase: 'solid',    /* change what it is made of            */
  wire: true,        /* switch the wireframe overlay on/off  */
  hold: 'land',      /* wait for the scene, not for a clock  */
  gap: 2.2 }         /* pause after the line, in seconds     */
```

`src/concepts.js` holds the forms, the phrases that trigger each routine, and
the steps. There are two so far; adding a third is adding an entry to that
table, not writing code.

## Follow-ups

It holds the subject, so you never have to name it twice:

| Ask | You get |
| --- | --- |
| `how big is it?` | dimensions in cm, measured against its usual size |
| `where is it from?` | origin and wild ancestor |
| `what family is it in?` | family and binomial |
| `is it a fruit?` | what it actually is, botanically |
| `what does it taste like?` | flavour, and the chemistry behind it |
| `more` | it will not stop |
| `help` | everything it can be |
| `be yourself again` | back to the orb |

Drag on it to pull the shell around, drag the background to orbit, wheel or
pinch to zoom.

**Zooming sets a factor, not a distance.** The subject can change size by a
factor of twenty in the middle of a sentence, so an absolute zoom either
ignores that entirely or drops you inside whatever just arrived. The camera
works out how far back the current subject needs, and your zoom scales that —
with the limits scaled too, so you can always get close enough to inspect it
and far enough to see all of it. A large change of subject also relaxes the
factor back toward neutral, so the new thing arrives framed and your preference
survives as a nudge rather than as an instruction.

And it settles. Once the subject stops changing, the camera stops moving.

**The scene owns the screen.** There is no panel: the conversation is a
transient band of text along the bottom that dissolves once read, and the only
permanent chrome is a single input. Starter prompts appear when the field is
focused and empty, and nothing else. Together the fixed interface covers under
3% of the viewport.

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

**Skin is procedural too, and there are no textures anywhere.** Every surface
is a function of position evaluated in the shader: oil-gland pits on citrus,
the diamond lattice of fused fruitlets on a pineapple, achenes sitting in their
own dimples on a strawberry, lenticels on an apple. They bump the lighting
through screen-space derivatives, because the surface has no UVs and never
will, and they fade out as the feature size approaches a pixel — mipmapping,
arrived at without a mip.

**And the body is painted per vertex.** One flat colour per specimen was most
of why they read as plastic: a real apple is red where it saw the sun and
yellow-green underneath, a banana browns at both ends. The paint travels with
the morph, so it arrives with the shape.

Two things learned the hard way, both visible in the first attempt: patterns
finer than a pixel are not detail, they are static; and view-angle terms — the
film, the sheen, the rim — must read the *geometric* normal, or every speckle
on an apple catches its own rainbow.

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
at the rim. Nothing else surrounds it: there is the being and the room, and
that is the entire cast.

**At rest it is an exact sphere** — no lobing, no wobble, nothing to soften it.
Everything that disturbs that shape does so for a reason, which is what makes
each disturbance mean something.

**Speaking swells it.** A steady breath of a couple of percent while a line
runs, and a bigger one — up to about eight — where the line has weight behind
it. Emphasis is read straight off the punctuation and the capitals, which is
enough to land the swell on the words that carry the sentence without any
analysis of the words themselves. A sphere with no face has this instead of a
mouth. Underneath it there is a whisper of surface ripple, just enough that a
growing sphere does not read as a balloon being inflated.

**And it stops completely once it is wearing something.** An apple does not
breathe, and neither does a rock. The swell is the being's own tell, so
anything it has become holds still.

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
src/geometry.js   icosphere, adjacency, the being's shell, the cursor hand
src/softbody.js   the solver: springs, Laplacian coupling, grab, picking
src/produce.js    procedural specimen meshes, built at true scale
src/knowledge.js  the atlas: 26 food plants, shapes, dimensions, botany, facts
src/things.js     everything else it can be, registered separately
src/concepts.js   routines it acts out, and the tesseract's 4-D projection
src/brain.js      intent matching and answers over the atlas
src/chat.js       the conversation surface
src/shaders.js    all GLSL ES 3.00
src/renderer.js   WebGL2 pipeline, render targets
src/audio.js      procedural sound
src/main.js       camera, input, frame loop, specimen staging
```
