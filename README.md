# WILDBOUND — Amber Edition

A 2.5D pixel creature-collecting RPG in the spirit of early-2000s handheld games,
built from scratch for the browser. Wander a hand-built region, wade through tall
grass, meet the KINDRED, bond with them, and follow the road north into the
HOLLOW to find what has been sleeping at the bottom of it.

Everything you see and hear is generated at runtime — there are no image or
audio files anywhere in this repository. Sprites are drawn from hand-authored
pixel data and shaded procedurally; the soundtrack is a small chiptune synth
built on the Web Audio API.

**No dependencies. No framework.** Plain ES modules and one canvas. The only
build step is optional: it inlines the game into a single file you can open
without a server.

---

## Play

**The quickest way:** open `dist/wildbound.html`. It is the whole game inlined
into one file — no server, no install, no network. Double-click it.

To run from source instead:

```bash
npm start          # serves the folder on http://localhost:8080
npm run build      # regenerate dist/wildbound.html after editing src/
```

Any static server works (`python3 -m http.server`, `npx serve`, GitHub Pages).
A server is only needed for the `src/` version, because ES modules will not load
over `file://` — which is exactly why the single-file build exists.

### Controls

| Action | Keyboard | Touch / Gamepad |
| --- | --- | --- |
| Move | Arrow keys / WASD | on-screen D-pad / stick |
| Confirm | `Z` / `Space` | **A** / gamepad A |
| Cancel, back | `X` / `Esc` | **B** / gamepad B |
| Menu | `Enter` / `Tab` | **MENU** / Start |
| Run | hold `Shift` | **RUN** / Select |
| Mute | `M` | — |

On-screen controls appear automatically on touch devices, and gamepads are
polled if one is connected.

---

## What's in it

**The world.** Seven maps: a home, two houses, Yarrow's study, the Rest Hall,
Hearthstead town, a long meadow route, and the Hollow. Grid movement with
smooth tweening, running, one-way ledge hops, tall-grass encounters, door and
edge warps, wandering NPCs, readable signs, ground pickups, and trainers who
spot you down a line of sight and walk over to say so.

**The 2.5D presentation.** The overworld is a top-down tile grid, but everything
with height — trees, buildings, cliff faces, signs, furniture — is a tall
billboard sprite that is y-sorted against the player, so you walk *behind*
things and they occlude you correctly. Buildings are drawn procedurally with a
sloped shingled roof and a shaded front wall; tall grass draws a second pass of
blades *over* whoever is standing in it; the Hollow is lit by a dithered light
radius that follows you.

**Battles.** Turn-based, Gen-3-shaped: a nine-type effectiveness chart, physical
and special split, IVs, stat stages, STAB, criticals, accuracy, PP, burn /
paralysis / sleep, flinching, drain and recoil, priority moves, speed ordering,
switching, running, and a faithful capture formula with shake counts. Sprites
slide in, lunge on physical hits, throw typed projectiles on special ones, flash
white when struck, and slump when they faint. XP is shared between participants,
levels raise stats, new moves prompt you to forget an old one, and creatures
evolve on the spot after the battle ends.

**18 species** across three evolution lines and five singles, each with base
stats, a learnset, a catch rate, and a Wildbook entry.

**Screens.** Title with save slot, name entry, pause menu, party with
reordering, per-creature summary (dex entry / stats / moves), bag with in-battle
use, a shop, the Wildbook, and localStorage saving.

---

## Layout

```
index.html            the shell — canvas, touch controls, boot overlay
src/
  main.js             boot + the global debug handle
  core/               loop, input (keyboard/touch/gamepad), canvas, audio,
                      coroutines, RNG, constants
  gfx/                the entire art pipeline:
    monart.js         the cel-shading engine: primitives, tone quantisation,
                      contact shadows, rim light, tinted outlines
    font.js           hand-drawn 5x8 bitmap font, proportional, cached per colour
    terrain.js        procedurally textured 16x16 tiles
    props.js          trees, rocks, bushes, furniture — same shading engine
    buildings.js      procedural houses with sloped roofs
    chars.js          16x24 walkers, palette-swapped per NPC
    monrecipes.js     18 species described as lists of shaded primitives
    battlebg.js       battle backdrops and perspective platforms
    ui.js             windows, bars, cursors, type chips
  data/               types, moves, species, items
  game/               state + save, creature model, damage/capture maths,
                      dialogue, state stack
  world/              tilemap building (pre-rendered ground, dithered material
                      transitions, collision) and the map definitions
  states/             title, overworld, battle, menu, party, bag, shop,
                      summary, wildbook
tools/                headless Chromium harnesses used to develop the art,
                      plus bundle.mjs (the single-file build)
```

### Notes on a couple of the more interesting bits

- **Ground is pre-rendered.** On map load the whole tile grid is composited into
  one canvas, including dithered transitions between materials (grass bleeding
  onto dirt, foam where water meets land, skirting where a wall meets a floor).
  Drawing the world is then a single `drawImage` plus the animated water tiles
  and the sorted sprite list.
- **Creatures are recipes, not bitmaps.** Each species is a list of shaded
  primitives — superellipses, tapered capsules, polygons, ribbons, flames,
  leaves — lit from one direction and then finished by three passes that do the
  actual work: lighting quantised into four hard tone bands (cel shading, never
  dithered), a 1px contact shadow wherever a later shape overlaps an earlier one
  so limbs separate from bodies, and a silhouette outline tinted from whatever
  it touches and weighted heavier underneath. A rim light picks out the lit edge,
  and shapes flagged `fur` scallop their own outline into clumps so nothing reads
  as a smooth ellipse. The same recipe produces the front sprite, the mirrored
  back sprite (face parts dropped), and the half-scale party icon, so nothing
  ever goes out of sync. The overworld props run through the same engine.
- **Scripts are generators.** Cutscenes, dialogue and the entire battle flow are
  written as generator functions that yield tasks (`wait`, `tween`, `say`,
  `selectAction`), driven by a ~40-line coroutine runner. The battle reads
  top-to-bottom instead of as a state machine.

---

## Development

```bash
node tools/tour.mjs ./shots main      # boot, walk out of the house, into town
node tools/tour.mjs ./shots battle    # trigger a wild battle and fight a turn
node tools/tour.mjs ./shots menus     # party, summary, bag, wildbook
node tools/tour.mjs ./shots world     # every map
node tools/tour.mjs ./shots capture   # throw an orb
node tools/tour.mjs ./shots trainer   # get spotted by a trainer
node tools/tour.mjs ./shots shop      # buy something
```

Each scenario drives the real game in headless Chromium, screenshots the canvas
at each beat, and reports any console errors. `tools/artcheck.html` renders a
contact sheet of every tile, prop, building, walker and creature.

The game exposes `window.__wildbound` for poking at from the console:
`give('emberet', 20)`, `party()`, `warp('hollow', 12, 16)`, `G`.

---

*Wildbound is an original work. The KINDRED, the region, the type chart, the
music and every pixel here were made for this project.*
