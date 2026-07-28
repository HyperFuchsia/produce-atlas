# The case for this

A running record of what is being built and why it should beat a box you type
into that types back. Kept current: every time something ships, it gets added
to the log at the bottom with the argument it is supposed to serve. If a thing
cannot be tied to the argument, that is worth knowing before it is built.

---

## 1. The thesis

**The answer is always the same shape as the question.**

Ask a chat model what a pineapple is and you get a paragraph. Ask what the
fourth dimension looks like and you get a paragraph about how hard it is to
picture — which is the single thing a paragraph is worst at. Ask whether
something is a solid, a liquid or a gas and you get a paragraph listing three
definitions you already knew.

The model is not wrong in any of those cases. It knows the answer. It hands you
the least useful available form of it, every time, because text is the only
form it has.

**This is the other option: the reply is not a description of the thing, it is
the thing.** To scale, in the room, lit, and you can grab it.

## 2. What is actually wrong with text-in / text-out

Not "it's boring" — that is a taste argument and it loses to "it works". The
specific, defensible problems:

| Problem | What it costs |
| --- | --- |
| **Uniform output shape** | Spatial, physical and scale questions get the worst possible answer format. A paragraph cannot show you a tesseract rotating. |
| **No scale intuition** | "About 8 cm across" means nothing. Standing next to it means everything. Text cannot do this at all. |
| **No verification surface** | You read a claim and either trust it or don't. Watching a thing fall on the floor is self-evidencing in a way a sentence is not. |
| **Zero incidental discovery** | A text box teaches you nothing about what else it can do. A world invites poking. |
| **Interaction floor of one bit** | You type, it replies. There is nothing else to do. Nothing rewards curiosity between turns. |
| **Nothing to come back for** | Once you know what it says, you know what it says. |

The last two are the commercial ones. Engagement in a text box is entirely a
function of having a task. Remove the task and there is no reason to open it.

## 3. The mechanism

One idea, applied consistently: **naming something is the whole instruction,
and the response is a change to the world rather than a description of one.**

- Type `pineapple` → it becomes a pineapple. Crown, ribs, 18 cm, grabbable.
- Ask `what is a pineapple?` → same thing, plus the botany, said while wearing it.
- Ask `what does the fourth dimension look like?` → it builds up from a point
  to a line to a square to a cube, then becomes a tesseract's 3-D shadow,
  genuinely rotating through *w*.
- Ask `what are you?` → it turns to stone and drops on the floor, melts into a
  puddle, boils off into a cloud, reassembles, and *then* says it can be
  anything. The claim rests on something you watched, not on an adjective.

The consistency matters more than any individual trick. There is no command
list, no mode switch, no "try asking me to…". Everything is the same gesture.

## 4. Why the demonstration beats the description

Three properties text does not have:

1. **Self-evidencing.** "I am adaptable" is a claim. Becoming a rock, a puddle
   and a cloud in fourteen seconds is a demonstration. One is disputable and
   one is not.
2. **Scale is felt, not read.** Everything is at true size against a body of
   known width, on a floor ruled at one line per 10 cm.
3. **Between-turn interaction.** You can grab it, stretch it, orbit it, and it
   notices. There is something to do while you are thinking.

## 5. The defensible bits

What would be hard to copy by adding a feature to an existing chat product:

- **Morph, not mesh swap.** Every form is projected onto the being's own
  topology, so the solver never stops running and the change wobbles into place
  instead of cutting. It is the same body throughout — that is what makes the
  "I can be anything" claim land rather than reading as a slideshow.
- **The physics is real.** The drop is gravity against a real floor. The squash
  is the solver. The tesseract is a genuine 4-D rotation projected down. Faking
  any of these would show immediately in motion.
- **Zero dependencies, zero toolchain, one file.** It runs from `file://`, from
  any static host, inside a sandboxed frame with a strict content policy. There
  is no install, no build, no server, no account. Distribution cost is a link.
- **It notices you.** Play with it without typing and it offers to help, then
  reaches in and stretches it alongside you — a second real grab on the same
  solver, not an animation.

## 6. Honest limitations

A case that hides these is worth nothing.

- **There is no language model here.** A published artifact page cannot call
  one: the available runtime capabilities are downloads and MCP, there is no
  completion capability, and the content policy blocks every external host. The
  brain is 26 curated entries and an intent matcher.
- **So the vocabulary is small** — 26 food plants, a growing set of made
  things, and 3 routines. It answers well inside that and admits ignorance
  outside it rather than inventing.
- **The morph only expresses what fits one closed sphere.** Anything that is
  really two volumes — a car's body and its glasshouse — needs the second one
  attached separately, and attached parts are rigid, so they do not deform when
  you pull the being around. Good enough at rest, visibly a seam if you stretch
  it. Genuinely different topology — a bunch of grapes — is approximated by the
  *union* of its parts, which turns out to cost less than it sounds: a bunch is
  packed tight enough that the gaps between berries are creases rather than
  holes, so a closed surface through them is very nearly the real thing.
- **This is the demo, not the product.** The product claim is that *any* model
  could drive this layer. Nothing here proves that integration is cheap.

## 7. What would prove or kill it

- **Prove:** hand it to someone with no instructions and watch whether they type
  a second thing without being prompted. The whole thesis is that a world
  invites poking and a text box does not.
- **Prove:** ask ten people what the fourth dimension looks like, half here and
  half in a chat box, and ask them to explain it back an hour later.
- **Kill:** if people treat it as a toy they open once. Novelty that does not
  convert to a second session is not a product, and the honest response would
  be to find the task this is genuinely better at rather than argue.

## 8. Open questions

- Which of the three routines is the one people show other people? That is the
  one to build more of.
- Does the vocabulary need to be large, or does it need to be *deep*? Twenty-six
  things you can interrogate properly may beat a thousand you cannot.
- Is the right unit a standalone page, or a rendering layer any assistant can
  emit into?

---

## Log

Newest last. Each entry: what shipped, and which part of the argument it is for.

**The being, stretchable, at true scale.** — §4.2 scale is felt. A soft body
with real geodesic grab falloff, and a room ruled at 10 cm so size means
something.

**26 curated entries with real botany.** — §6. Deliberately small and checked.
It says it does not know rather than guessing, which is the only defensible
position without a model behind it.

**Become-anything, as a morph of rest positions.** — §5 defensibility. Same
topology, solver running throughout. This is the load-bearing trick.

**The fourth-dimension routine.** — §1 thesis, in its purest form. The question
text is worst at, answered by the thing text cannot do: 0-D to 4-D, ending in a
real 4-D rotation projected to three.

**The solid / liquid / gas routine.** — §4.1 self-evidencing. It stops floating,
turns to stone, falls on the floor, asks what you think, and does not wait for
your answer.

**Naming something is the whole instruction.** — §3 consistency. Every phrasing
collapses to one gesture. No command list to learn, so there is nothing to
teach and nothing to forget.

**Stems, leaves and crowns attached separately.** — §6 limitation, partly
retired. A pineapple without its crown is not recognisable, and the flagship
interaction has to be recognisable.

**It gets bored and joins in.** — §4.3 between-turn interaction. The only
feature here that has no equivalent in a chat box at all: it does something
when you are *not* talking to it.

**"What are you" is a demonstration, not a paragraph.** — §1 and §4.1 together.
This was the sharpest available test of the thesis, because giving the generic
AI-assistant answer here is precisely the failure the whole project is arguing
against. It runs the three states and only then says it can be anything.

**A perfect sphere at rest, rippling when it speaks.** — §4.1 self-evidencing,
at the smallest possible scale. A flawless resting shape means every departure
from it carries information: pulled, morphed, or talking. Speech is a real
geometric wave radiating from the focal point, not a shader trick painted on
top, so you can see it is speaking from across the room with the sound off.

**The ground stopped being a suggestion.** — §5 "the physics is real". The floor
contact only constrained the body's centre, so a landing squash pushed its own
underside through the ground and a melt sank into it. Both are the kind of
detail that decides whether a viewer reads the scene as simulated or as
animated, and getting it wrong undoes the argument the routine exists to make.
Now every vertex is constrained against the plane, with friction, so a puddle
grips a surface it is resting on.

**Speaking is a swell, not a shudder.** — §4.1 self-evidencing. The first
version rippled hard enough to read as a membrane under stress rather than as a
voice. Now it breathes, harder on the stressed words, and goes completely still
the moment it is wearing a form — which quietly makes a second point: the
motion belongs to the being, not to whatever it is currently pretending to be.

**It is not only plants.** — §3 consistency, and the first real test of it.
"I can be anything" does not survive the first person typing "car", and the
first thing anyone types once they notice it changes shape is not in a botany
textbook. A car needed a shape that is not a solid of revolution, a scale
twenty times the being's own, and an honest answer to "what is it" that does
not invent a botany for a machine. All three were worth having anyway: the hull
generalises to anything lofted, anything too big to hover now rests on the
ground without being told to, and the room grows with its subject. Adding the
next thing is a table entry.

**The camera holds the subject, whatever size it is.** — §4.2 scale is felt.
Scale only lands if you can see the thing. An absolute hand zoom was survivable
while everything was fruit-sized and broke completely at 4.5 m — one notch of
the wheel put you inside the car with no way out. Zoom is now a factor against
what the subject needs, with limits that scale, and the idle rotation stops
once it is wearing a form: a slowly pitching car moved its own lowest point by
metres, so it rode up and down against the ground and the camera chased it
forever. Measured to zero drift once the subject settles.

**Skin and paint.** — §4.2, and honestly §1 too. A thing at true scale still
has to be recognisable as itself, and a smooth flat-coloured solid is not: it
reads as a placeholder for the thing rather than as the thing. Procedural skin
and per-vertex paint cost no assets, which keeps the whole argument about
distribution ("cost is a link") intact — and the pineapple in particular goes
from an unidentifiable yellow barrel to unmistakable.

**The apple is an apple.** — §4.2, and the sharpest test of it available,
because the apple is the first thing anyone types. Three separate faults, none
of which was guessable and all of which were found by measuring:

1. *A radius profile cannot say "indented".* Height is a straight function of
   the polar angle, so a radius of zero at the pole gives a point — the apple
   was a teardrop with a stem stuck through it. The axis has to turn back on
   itself. Dimples are now authored as **depth and mouth width in centimetres**
   and solved for, which is the difference between a number a person can check
   against fruit on the table and a coefficient they can only guess at. The
   first attempt guessed, and produced a bucket.
2. *One number cannot be both relief and pigment.* Apple stripes have no depth,
   and driving the bump with them put three hard mirror blobs on the shoulder.
3. *Colour is authored in linear light.* The 1/2.2 at the end of the composite
   turns a 7:1 red into 2.2:1, so the deepest red in the table arrived on
   screen as tomato soup at (211, 96, 70). Reading the actual pixels instead of
   trusting the swatch got it to (212, 38, 26).

Worth logging as a group because they share a moral, and it is the one this
project keeps relearning: **at true scale you cannot fake it, and you cannot
eyeball it either.** Every one of these was invisible in the source and
obvious in a render, and each fix was verified against a measurement rather
than an opinion. The claim in §4.2 is that scale is *felt* — that only pays
off if the thing at that scale survives being looked at closely.

Still outstanding, and worth knowing: the other twenty-five entries have their
colours authored against the wrong assumption too, so they are all a little
paler and a little less saturated than intended. Fixing that is a sweep with a
verification pass per specimen, not a one-line change.

**It can be a face, and the face talks.** — §1 and §3, and the first thing here
that argues about *itself*. Everything before this was the being demonstrating
something about the world. A face demonstrates something about the being: that
the sphere you have been talking to is a default, not a limit. That is not a
claim a sphere can make about itself in text without sounding like marketing —
"I could look like anything" is worth nothing — and it takes about two seconds
to make by doing it.

It also sharpens §5. The load-bearing trick was always "morph, not mesh swap",
and a face is where that stops being a technical detail: swap in a head model
and you have a chat product with an avatar, which is a thing that already
exists and is not interesting. Morph the same 10242 vertices you were just
pulling on into a face that then talks with them — and which you can still
reach in and pull by the nose — is a different claim entirely. The mouth is
driven by the letters as they are typed, so the speech and the shape are the
same event rather than two systems kept in sync.

And it inverts §4.1's rule about stillness in a way worth writing down. Every
other form goes completely still, because motion belongs to the being and not
to what it is pretending to be. A face is the exception, and for a reason that
supports the rule rather than breaking it: on a face, the motion of speaking
*does* belong to the form.

Which turned out to have a second half, missed the first time. Stopping the
being's *ripple* was not enough, because the being's **springiness** is also
its own and not the face's. The solver is deliberately underdamped — that
wobble is most of what makes the sphere feel alive — and with a face on, the
jaw dropping on every syllable spread four centimetres of ripple across the
skull. It looked like a rubber mask being talked through. Forms now carry
their own physics, and a face is stiff and near-critically damped: measured
across 3933 vertices of skull and forehead through a full spoken sentence,
zero movement. The right rule is sharper than "it goes still" — **whatever it
becomes brings its own physics, and the being's belongs to the being.**

**Grapes, which are not a shape but an arrangement.** — §6, the limitation
above, partly retired. Every other specimen is one connected thing and grapes
are not, so this was the case that was supposed to stay an approximation
forever. It does not have to. One packing of 190 berries feeds both the bunch
you stand next to — real separate berries, real gaps — and the union of the
same berries, which is what the being wears. A bunch is dense enough that a
closed surface through it loses almost nothing.

Worth logging because it is the first time the *"same body"* constraint bought
something rather than costing something. The union is not a workaround for the
sphere; it is why you can grab a bunch of grapes by one berry and pull the
whole thing out of shape, which no mesh-swap avatar can do.

And bloom is the lesson from the apple again, arriving somewhere new: what
identifies a grape is not its shape, it is the pale wax on it. Get the shape
perfect and leave the wax off and you have a bag of glass beads. Most of the
recognisability of a fruit lives on its surface, and this is now three for
three — pineapple, apple, grape.

**He takes the camera off you.** — §4.3, between-turn interaction, and the
furthest it has gone. Orbit under the floor and there is nothing there; every
3-D scene has this hole and nearly all of them handle it by clamping the
camera so you cannot find it. That is the correct engineering answer and it
communicates nothing.

Because he has hands, there is a better one available. The bug is not hidden,
it is *acknowledged by the character* — which converts the one moment where the
illusion would break into the one moment he admits you are in the room.

And he asks first. Twice. Reaching in and taking the camera off somebody the
first time they wander somewhere is a bouncer, not a person, and the argument
being made here is that there is a person in the room. Two warnings, then he
stops asking — which is also the only structure under which the hands land as
a surprise, because nobody who has been told twice expects to be picked up.
The hands do not exist until that moment — a pair floating beside a head from
the start is scenery, and nobody notices scenery — and once they are out they
stay out. That last part matters more than it sounds: it means the third
strike permanently changes what he looks like. You did that. Everything he
says for the rest of the session has hands behind it, and they are there
because of something you chose to keep doing after being asked twice not to.
Consequence that persists is a thing a text box cannot offer at all. It is also the only place here where anything
addresses the camera directly, and it is deliberately the only place, because
the trick works once and stops working the third time.

Worth logging against §5, defensibility, rather than as a gag. A chat product
cannot have this. It needs a body with hands, a camera whose position is part
of the simulation, and something that already knows how to speak — and the
cost of building it, given all three, was one state machine and an afternoon.
That is what an interaction moat looks like from the inside.

**He apologises for his own hands before you can mention them.** — §4.3, and
the sharpest version of it yet. The palms face outward, which is wrong, and it
is left wrong on purpose: he is watching the input box, and the moment the word
"hand" appears in it — mid-sentence, before send — he stops, checks both hands,
apologises and turns them round.

Worth logging because of what it costs to copy. It needs a body whose flaws are
visible, a character who can be embarrassed by them, and a read on what you are
typing *before you commit to it*. A chat product has the last one and nothing
to do with it. Here it turns a modelling error into the most human beat in the
whole thing — and the beat only exists *because* the error does, which is a
strange and useful thing to know about building this way.

**The face is measured, and there is a test that says so.** — §6, and the most
important entry in this log. The first version of the face had knobs called
`noseWide: 1.28` and `lipFull: 1.35`. Numbers with no unit and no source, which
is exactly the kind of number you can talk yourself into. Measured, the nose
they built was **79 mm across** — the widest real human nose is about 48 — and
the lip *colour* covered 124 × 58 mm of a 155 mm face. Nobody intended either.
Both are caricature, and intent does not enter into it.

The lesson is not "be careful". It is that **a stylistic knob cannot be
audited and a measurement can.** `alarWidth: 42` is either right or wrong,
anyone can look it up, and a script measures the built mesh and fails if
anything lands outside the range a real face occupies. That converts a
question of taste — which nobody can settle, and on which the project would
have been judged — into arithmetic, which anybody can check.

Worth stating plainly because it bears on §1. This project's whole argument is
that showing beats telling. The corollary nobody puts on the slide is that
showing carries a responsibility telling does not: a paragraph about facial
anatomy cannot be a caricature, and a face can. A rendering layer that claims
to answer questions by *becoming things* has to be able to prove that what it
became is accurate — not assert it, prove it. The anthropometric harness is
that proof for faces, and the same discipline is why the apple's dimple is in
centimetres and the grape bunch measures 11 cm.

Honest about where it landed: the face is stylised and soft, and the eyes are
the weakest part of it. That is a resolution limit rather than a taste
decision — 10242 vertices over a 23 cm head is 3.5 mm between them, and a lip
edge or an eyelid margin is 1–3 mm. It cost seven rebuilds and every one of the
faults was invisible in the source and obvious in a render: landmarks written
as direction vectors instead of centimetres, pores asked for at a size smaller
than a pixel, a hairline flat enough to read as a hood, lids that swallowed the
eyes whole. Same moral as the apple, which is starting to look like the moral
of the whole project: **you cannot eyeball it, and at true scale you cannot
fake it either.**
