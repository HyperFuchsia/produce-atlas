# Rachis

A 4.5-dimensional puzzle game about the domestication of food plants.

The *rachis* is the stalk that holds grain on a cereal plant. Wild cereals shatter — the rachis
snaps and scatters the seed. Every domesticated cereal descends from plants that could not do
that, and so had to be carried. You are what carries them.

Twelve plates, each anchored to a real centre of domestication. Push each seed onto its origin
plot.

## The dimension count

There is no standard definition of "4.5D", so this one is stated plainly and then enforced by
the test suite rather than asserted in a README.

| Axis | Amount | Why |
|---|---|---|
| `x, y, z` | 3 | Space. All three are freely traversable, and the camera orbits so you can see that. |
| `t` | 1 | Time. Rewind to tick zero and your finished run stays in the world, replaying its recorded moves as a solid body you can stand on. |
| `Φ` | ½ | Wild ⇄ cultivated. A real axis — you move along it, and terrain solidity depends on where you are — but it has exactly two positions and no interior. Every point on it is an endpoint. |
| | **4½** | |

The half is the one you cannot stand in the middle of.

By analogy: 2.5D means 3D presentation over 2D gameplay — a claim about a dimension that is
present but not fully available. Here the phase axis is present in the simulation, in the move
set, and in the win condition, but it is two-valued. That is the same kind of claim, made about
the fifth axis instead of the third.

## Rules

Terrain comes in three kinds. **Bedrock** is solid in both phases. **Thicket** is solid only
while wild. **Terrace** is solid only while cultivated. Flipping the phase never moves a block —
it changes which blocks are *there*.

A tick resolves in a fixed order, and the order is part of the game:

1. Actors act, oldest ghost first, the live courier **last**. The courier moving last is what
   lets you follow a ghost into the cell it just vacated.
2. Each action fully resolves before the next actor acts, so a phase flip mid-tick is seen by
   every actor after it.
3. Gravity runs once, globally, iterated to a fixed point from the lowest mover upward.
4. Loss is checked, then victory.

Couriers pass **through** each other but stand **on** each other, and walking into a past self
climbs onto their shoulders. The asymmetry is deliberate: mutual blocking would deadlock the
shared spawn cell on every rewind, and "my own past self is in the doorway" is the least
forgiving failure a time-loop game can hand a player. Seeds, by contrast, block everything and
get pushed.

Flipping into ground that is about to become solid ejects you upward. That is not a safety
valve — it is the main way you gain height. Stand where a terrace will be, flip, and the ground
lifts you.

## Verification

`npm run check` builds the bundle and runs the suite. The tests that matter are the ones that
try to make the game's central claim false:

- Every level ships a recorded solution, and each one is replayed against the simulation and
  must reach a win. No level is shipped on the strength of having looked solvable.
- Levels that claim to need the **phase** axis are run through an exhaustive breadth-first
  search of their entire reachable state space **with flipping removed**. The test passes only
  if the search terminates having found nothing. Eight levels are proved unsolvable this way.
- Levels that claim to need the **time** axis get the same treatment against the no-rewind
  subspace. Five levels are proved unsolvable in a single run.
- Levels that claim *not* to need time are proved solvable in one run, so the loop budget is
  never quietly load-bearing where the design says it is not.

The search reports whether it exhausted the space or hit its node cap, and a test that only hit
the cap fails rather than passing on a weaker claim.

```
npm run check       # build + full suite
npm test            # suite only
node tools/solve.mjs        # shortest loop-free solution per level, and necessity of the flip
node tools/solve.mjs bund   # one level
```

`tools/solve.mjs` is also the authoring tool: the solutions for the loop-free plates are derived
from it rather than typed by hand.

## Layout

```
src/sim.js       the rules — pure, deterministic, no DOM. Runs identically in node and browser.
src/levels.js    twelve plates: layout, crop record, recorded solution
src/render.js    orthographic voxel renderer, painter's algorithm, phase crossfade
src/gfx.js       projection and colour maths
src/audio.js     WebAudio synthesis — no samples, nothing fetched
src/main.js      input, tweening, chrome
src/index.html   the only copy of the markup; the build derives the bundle from it
tools/build.mjs  dependency-free inliner → one self-contained HTML file
tools/solve.mjs  BFS solver and necessity prover
test/            the suite described above
```

## Building and running

No dependencies, at build time or runtime.

```
npm run build     # → dist/rachis.html      (body-only, for embedding)
                  # → dist/standalone.html  (complete document, open it straight off disk)
npm run serve     # dev server with unbundled modules at localhost:8123
```

The output is one file with every byte inlined — no CDN, no fonts fetched, no network at
runtime — so it survives a strict content security policy.

## Controls

Arrow keys or WASD move, relative to the camera. Space flips the phase. `R` rewinds, `Z` undoes,
`Q`/`E` orbit, `Enter` restarts, `Esc` opens the plate index. Drag to orbit; touch devices get
an on-screen pad.

Directions are stored in world space, not screen space, so a recording stays valid after you
turn the camera mid-loop.

## A note on the dates

Domestication was a process spread over centuries, not an event with a date. Where the
literature gives a range or is actively contested, the interface shows the range and says
`contested` rather than picking a round number — the crop records carry a confidence field for
exactly this reason. Several of the ranges here are wide because the evidence is.
