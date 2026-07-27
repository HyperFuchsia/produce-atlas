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
- **The morph only expresses what fits one closed sphere.** Stems, leaves and
  crowns are attached separately; anything with genuinely different topology
  (a bunch of grapes, say) becomes an approximation.
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
