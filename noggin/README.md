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

Skin returns two numbers, not one: relief, which bends the light, and tint,
which only says how pale the surface is there. An apple's stripes are pigment
with no depth at all, and while one value did both, feeding them to the bump
chopped the highlight into three mirror blobs.

Three things learned the hard way, all visible in the first attempt: patterns
finer than a pixel are not detail, they are static; view-angle terms — the
film, the sheen, the rim — must read the *geometric* normal, or every speckle
on an apple catches its own rainbow; and colour is authored in **linear light**,
where a saturated red arrives on screen as tomato soup, because the 1/2.2 at
the end of the composite flattens a 7:1 ratio into a 2.2:1 one. That last one
is measured off the rendered pixels rather than guessed at.

**The specimens** are procedural. Each is a revolved radius profile plus
optional ribs, a bend, a dimple at either end, a stem, leaves, a leaf crown, or
a scatter into a cluster — enough vocabulary to make an apple, a banana, a
carrot, a bunch of grapes and a pineapple recognisable from one small data
table. They render through the same shader as the being and cast the same
shadows.

**A bunch of grapes is the one specimen whose topology is genuinely not a
sphere**, so it gets solved twice from one arrangement. 190 berries are packed
into a tapering envelope with a minimum-distance rule, biased out towards the
skin of the bunch — the middle of a real bunch is stems, not fruit. The bunch
you can stand next to is built from those centres as real separate berries,
with real gaps. The being cannot have gaps, because it is one closed surface,
so what it wears is the *union* of the same berries: for each of its 10242
directions, the furthest point at which a ray from the middle leaves any berry.
A real bunch is packed tight enough that you rarely see through it, and a union
of packed spheres has exactly the lumpy silhouette and the creases that make a
bunch read as a bunch.

Three things had to be right, and each was wrong first:

- **Gaps need something to land on.** A direction threading between berries has
  no berry to hit, and the nearest berry's tangent point falls away so steeply
  that every berry became a spike. Now the packing envelope itself is the
  floor.
- **That floor has to sit exactly where the centres were packed to**, or each
  berry's cap ends in a cliff and the bunch grows a fringe of pegs.
- **Berries at different depths get stretched.** A radial field sees an
  off-shell berry obliquely and draws it as a finger. Packing them onto a shell
  keeps them face-on and round.

**Bloom** is the whole read on a grape — the pale wax it grows on itself, which
is why a bunch photographs slate blue rather than black and looks matte in a
bowl of otherwise shiny fruit. It is per-vertex paint rather than a shader
tint, because a scalar tint can only brighten and bloom has to *desaturate*: it
sits heaviest where a berry faces up and out, and the shader adds the patchiness
where berries have rubbed against each other and the near-black skin shows
through.

**A dimple is authored the way you would measure one**, because the alternative
was guessing at coefficients:

```js
dimple: {
  top:    { deepCm: 1.15, mouthCm: 3.4 },   /* the stem well */
  bottom: { deepCm: 0.55, mouthCm: 3.0 }    /* the calyx basin */
}
```

A radius profile alone cannot say "indented". Height is a straight function of
the polar angle, so a radius of zero at the pole gives a *point* — a teardrop,
never a well. The axis itself has to turn back. Near a pole, writing `u` for the
distance from it and `k = 1 - u/span`, the axis runs `y = (0.5 - u) - amp*k²`,
whose highest point is the rim; the depth and mouth of the resulting well
invert cleanly for `span` and `amp`, so the shape lands on the measurements by
construction. Denting the ends shortens the body and stretching it back to its
stated height deepens the dents again, so the two ends are solved together.
Measured off the built mesh, the apple comes out 7.20 cm tall and 8.04 cm wide
with a well 1.15 cm deep — which is the point of stating sizes in the first
place.

**It can be a face, and the face talks.** This is the one form that is not an
object, and the only one that keeps moving after it has arrived. It is still
the same body — the same 10242 vertices, the same solver — so the skull, brow,
nose, lips, cheeks, chin and jaw are all radial displacements you can reach in
and pull. Only three things are attached, each because a radial field genuinely
cannot express it: eyeballs (a second surface along the same ray as the socket),
ears (thin fins standing off the skull), and hair (its own volume).

Landmarks are authored in centimetres from the centre of a head 23 cm tall and
15.5 cm wide, and follow the canonical construction — the face in equal thirds,
the eyes halfway down the whole head. The first attempt wrote them as raw
direction vectors, which are normalised before use, so every landmark drifted
toward the equator and the mouth sat three centimetres too high.

**Every feature of a face is a measurement in millimetres, and there is a test
that checks them.** This is not a stylistic commitment, it is the only workable
defence against caricature — and it was needed. The first version of this face
had knobs called `noseWide: 1.28` and `lipFull: 1.35`: numbers with no unit, no
source, and nothing to check them against. Measured, the nose they produced was
**79 mm across**. The widest nose on any living human is around 48. The lip
*colour* covered a patch 124 mm wide and 58 mm tall on a face 155 mm wide —
most of the lower half of it. Neither was visible in the source and neither was
intended; both are unambiguous once measured.

The entry now reads in millimetres — `alarWidth: 42`, `vermilionUpper: 11`,
`mouthWidth: 54` — taken from craniofacial anthropometry of adult men, using
the West-African-descent figures where the population means genuinely differ
and the plain adult male mean where they do not (which is most of the face).
`scratchpad/anthro.js` measures the *built mesh* and fails anything outside the
range a real face occupies:

```
alarWidth         40.5   human range 32-48   ok
noseProjection    18.7   human range 14-24   ok
vermilionUpper    11.5   human range  6-15   ok
mouthWidth        46.5   human range 45-62   ok
lipPaintWidth     48.0   human range 45-68   ok
bizygomatic      151.0   human range 125-155 ok
```

**Go under the floor and he takes the camera off you.** Orbit far enough down
and you drop through the ground, and underneath a scene there is nothing — the
floor is one-sided, the room has no basement, and what you get is a view of the
back of everything. Every 3-D thing has this problem and nearly all of them
solve it by quietly refusing to let you, which is honest and says nothing.

He solves it himself, and **he asks first**:

| under the floor | what happens |
| --- | --- |
| 1st time | *"Do not do that! You are breaking the immersion!"* Words only. The camera stays yours. |
| 2nd time | *"Again? There is nothing down there, man. I never built a downstairs."* Still words. |
| 3rd time | He stops asking. The camera halts, hands appear, one takes the lens and lifts you back above the ground. |
| after that | No more warnings. |

Reaching in and taking the camera off somebody the first time they wander
somewhere is a bouncer, not a person, and the whole point of him is that he is
a person about it. It also means the hands land as a surprise — nobody who has
been told twice expects to be picked up.

Only when he is wearing the face. A pineapple cannot do this, and the harness
checks that it doesn't try.

**The hands are earned, and then they stay.** A face arrives with none — a
pair floating beside a head from the start is scenery, and nobody notices
scenery. They are built the first time he needs them, which is the third time
you go under the floor, and from then on they are simply part of him for as
long as he is wearing that face: they drift at his sides and beat on the words
he leans on. Putting them away after each grab made them a special effect that
fires and resets. Leaving them means the third strike permanently changes what
he looks like, and everything he says afterwards has hands behind it.

**And the palms face the wrong way.** Outward, away from him, which is not how
anybody holds their hands. That is a real mistake and it is left in on purpose,
because the moment somebody notices is worth more than the mistake costs: type
the word **hand** anywhere in the box and — before you press send, before you
have finished the sentence — he stops, looks down at one hand, then the other,
says *"I am sorry — my hands were facing the wrong way"*, and turns them round.
You never get to tell him. He gets there first, once per face.

That is also why the hands sit in **world space** rather than in his frame.
Parented to him they turned when he turned and stayed forever in the corner of
his eye, so he could never look *at* them — and your hands do not swing round
when you turn your head either.

They gesture on `chat.emphasis` — the same spike on stressed words the sphere's
swell already rides. One number that already existed, and it is the difference
between a face with hands near it and a face that is talking to you.

They are their own props rather than part of the head's trimming, because they
have to move independently of it.

They are built from adult-male measurements like everything else: 189 mm wrist
to middle fingertip, 107 mm of that palm, 89 mm across the knuckles, fingers of
75, 82, 76 and 60 mm dividing into phalanges at roughly 45 / 27 / 28 per cent.

Three things carry it:

- **A relaxed hand is never flat.** Every joint sits at some flexion at rest —
  about 20° at the knuckle, 40° at the middle joint, 15° at the last — and the
  amount increases from index to little, so the fingertips fall along a curve.
  Flat fingers are what mannequins have.
- **A palm is flat, and capsules are round.** Built from overlapping
  ellipsoids it stayed a heap of overlapping ellipsoids with every one of them
  visible. It is one revolved profile squashed to 31% in Z — a single surface
  with no seams — and only the parts that genuinely stand off it are added on
  top: the thenar pad, the hypothenar, the knuckles.
- **Palms are lighter than the backs of hands.** True of everyone, and leaving
  it out is most of why a monochrome hand reads as a prop.

**The hair is its own volume, not the skull with a coat of paint.** The first
version offset the head surface by a constant, which gives a slightly larger
head — a swimming cap. A picked afro holds a round silhouette that is nearly
independent of the skull inside it, so the shell aims at a *sphere of its own*,
fitted to stand `hairMm` off the crown, and dives inside the head at the
hairline so the transition is hidden.

Four things had to be true, and each was wrong first:

- **Coils are discrete clumps, not smooth undulation** — so the displacement
  is cellular noise (distance to the nearest of one point per grid cell),
  rounded with a smoothstep. Left linear it built a cone on every clump and
  the head grew spines.
- **Clumps have to break the outline**, which needs vertices small enough to
  hold them: subdiv 6, about 2.4 mm apart, for clumps around 8 mm.
- **Displace along the surface normal, not the ray from the head's centre.**
  Where the shell is steep the radial direction runs nearly *along* it, so
  clumps stretched into streaks and the face wore a slicked collar.
- **The underside of the hair is the darkest part of it.** Occlusion is baked
  from how far each vertex's normal points away from the head; without it the
  wall between the hairline and the outside of the mass lit up as a fan of
  pale spokes.

Two further things are colour rather than shape, and both are markers of the
caricature tradition rather than of any face: **lip contrast on darker skin is
low**, so the lips here are defined by the edge of the vermilion and barely at
all by its colour; and **sclera is not white** on anyone, so the eyes are a
soft grey-ivory. Difference between populations is real and belongs in the
data. Exaggerating it is the failure, and the guard against it is arithmetic.

The mouth is driven by the letters themselves. It speaks by typing, so the
characters arrive one at a time as they are said, and each maps to two numbers:
how far the jaw drops, and whether the lips are pursed or spread. What matters
most is that the closures land — `m`, `b` and `p` are the only sounds English
makes with the lips fully shut, and a mouth that stays open through "somebody"
reads as a puppet at once. The poses are built once, when it becomes the face,
and blended per frame over the ~5600 vertices any of them actually move; the
solver then chases the blend, which is where the slight lag in the lips comes
from. It blinks by bulging its own eyelids forward over the eyeballs, so a blink
needs no extra geometry. And it turns to face the camera as you orbit, because
a face that will not look at you is worse than no face.

**A face is flesh on bone, and nothing else here is.** The being is
deliberately underdamped — the wobble is most of its charm, and the speech
ripple is its voice. Both are wrong on a face. The ripple was already gated off
by the morph, but the solver was not: a jaw dropping on every syllable fed the
Laplacian coupling, and the skull rippled **four centimetres** while it talked.
Forms can now carry their own physics, and a face is sprung stiff and damped
near critical. Measured across 3933 vertices of skull and forehead while it
speaks a full sentence: **zero movement.** The jaw and the lips move; nothing
else does. States of matter still override it — turning to stone replaces what
you are made of.

**Known limit: 10242 vertices over a 23 cm head is 3.5 mm between them.** Lip
edges, nostril rims and eyelid margins are 1–3 mm features, so they come out
soft however they are authored. The face is deliberately stylised rather than
detailed, and that is the reason — not a stylistic preference. The eyes in
particular are shaped to the opening rather than clipped by the lids, because
the lid margin that would do the clipping is finer than the mesh. The honest
fix is a shader-side detail pass drawing those lines at pixel resolution, the
way the pineapple's lattice is drawn.

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
