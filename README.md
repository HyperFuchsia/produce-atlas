# NEON VAULT

**One path. Infinite momentum.**

An endless runner about a kinetic courier named Marcus Vale, who moves through
the vertical megacity of New Lagos the only way the Conduit allows: forward.
Everything the city puts on that path gets vaulted, jumped, or dived through.

Built as a shippable iOS title — a real-time 3-D game in WebGL (three.js) and
TypeScript, with zero art or audio assets on disk, wrapped for the App Store
with Capacitor.

```bash
npm install
npm run dev        # play it at localhost:5173
```

---

## The game

**An angled view across an elevated platform.** The camera sits off the side of
the deck rather than dead behind it, so the platform recedes on a diagonal and
hazards travel toward Marcus rather than straight at the lens. An off-axis view
also reads *height* properly — the only axis this game asks you to judge. From
directly behind, a vault and a dive look far more alike than they should.

**Four verbs, two of them on the same finger.** Tap the top half of the screen
(or swipe up) to jump; hold longer to jump higher. Tap the bottom half (or
swipe down) to dive — a slide on the ground, a fast headfirst dive in the air.
Swipe left or right to change lane. Meet a barrier mid-jump and Marcus
hand-plants into an automatic vault.

**Three lanes.** Some walls are too tall to jump and too low to slide under, so
the only way past is beside them — and shard trails mark the safe line, which
makes the greedy read and the correct read the same read. Lane hazards compose
with the vertical ones: dodge, then vault; slide under a scanner that only
covers two lanes; jump a hole that only eats one.

**Wall running.** Some hazards refuse every other answer: a plasma field floods
the deck from edge to edge, twice too long to jump and twice too tall to slide.
The only line is the lane hard against the side wall, and taking it puts Marcus
up on the wall itself — horizontal, feet on the panel, the field tearing past
below. He rides it for score by the metre and drops back to the deck at the
lip, or bails early by swiping away. Mounting is automatic: the skill is the
lane read, made under pressure, and it is the one hazard where choosing the
right lane is the whole answer.

**Thirteen obstacle types**, each demanding a different read: lane walls,
vaultable barriers,
crate walls, scanner beams with a slide gap, hovering sentries, glass panels
that only a dive breaks, plasma gates that alternate high and low on a beat,
spring pads, elevated rails, narrow pylons, holes in the deck, run-up walls,
and deck-wide plasma fields.

**Flow.** Late vaults, close calls and shard chains fill the Flow meter. Fill
it and you enter Flow State: double score, extra speed, and one free hit.

**Four zones** cycle every 900 m — the Conduit, the Undercity in permanent
rain, the Solar Spine above the smog line, and the Void Line.

**Progression** is entirely on-device: six permanent upgrades, five outfits,
four trails, three rotating contracts, courier levels and a daily bonus.

## How it is built

```
src/
  engine/     loop, input, audio, haptics, storage, screen, maths, rng
  game/       simulation — player, world, spawner, patterns, missions, meta
  render/     pose solver + shared palette
  render3d/   scene, track, props, runner, particles, zone theming
  ui/         DOM menus, HUD, shop, settings
tests/        headless simulation + fairness tests
tools/        smoke test, icon generation, screenshots, single-file build
```

A few decisions worth knowing about:

**The simulation runs at a fixed 120 Hz and the renderer interpolates.** A
runner lives or dies on consistent physics: the same jump must clear the same
barrier on a 60 Hz phone and a 120 Hz iPad.

**The third axis is one number.** An obstacle carries a lateral centre and a
half-extent, and collision asks whether the runner's extent overlaps it.
Anything authored as full-width behaves exactly as it did before lanes existed
— which is why adding a whole movement axis did not disturb a single existing
pattern.

**Levels are authored in seconds, not metres.** Every distance in
`src/game/patterns.ts` is written as a fraction of a second of travel and
multiplied by the current run speed. As Marcus accelerates from 10 m/s to
25 m/s the course physically stretches with him, so a "tight double barrier"
stays exactly as tight in the only unit a player actually feels — time to
react. The generator sizes itself on *baseline* speed, never the boosted
speed, so a power-up can only ever make the Conduit easier.

**The simulation knows nothing about the renderer.** The world runs in metres
on a single forward axis; the view maps that onto −Z and adds a chase camera.
That separation is why the game could move from a 2-D side view to full 3-D
without touching the physics, the generator, or a single fairness test.

**Marcus is solved, not animated.** He is a small skeleton of joint angles
driven by live physics — vertical speed, air time, how long a state has been
held — so his pose blends continuously with what the simulation is doing
rather than playing back fixed clips. The 3-D build feeds those identical
angles into a hierarchy of meshes, and he recolours instantly for every outfit.

**The city is never spawned.** Deck tiles, buildings, gantries, billboards and
pit markers all live in fixed-size instanced meshes whose instances are
re-placed each frame from a sliding window of slot indices, with every
variation derived from a hash of the index. The result is an infinite,
deterministic city at constant memory and, at the time of writing, **~95 draw
calls and 12k triangles** for the whole scene.

**Bloom is not decoration.** The whole look is emissive strips against
near-black; without a bloom pass the neon reads as flat coloured tape. It runs
at half resolution — which is where a blur belongs anyway — and is the first
thing the quality governor drops.

**All audio is synthesised at runtime.** Every sound effect is built from
oscillators and filtered noise, and the music is a look-ahead scheduled synth
loop whose tempo and layer count follow the run's intensity.

**Colour is information.** The Conduit's key light is cyan, and cyan light on
brown skin renders olive — so Marcus's skin, hair and beard carry more of their
own colour than the scene's, and he reads the same under every zone. The same
rule applies to hazard tape: a blocking face is unlit so its gold never shifts
with the lighting.

**Nothing leaves the device.** No network calls, no analytics, no accounts —
which is also why the App Store privacy answer is simply "Data Not Collected".

## Verifying it

```bash
npm test           # headless simulation + fairness tests
npm run build      # typecheck + production bundle
npm run smoke      # plays the built game in Chromium, writes screenshots/
```

`npm test` runs the physics and generator invariants: a slide must fit under
every beam and a standing runner must not, no pit may be wider than a jump can
clear, no two solid obstacles may occupy the same space, entity lists stay
bounded forever, and a rule-based bot must survive 90-second windows of real
generated course. That last test is the one that matters — it is how the
unfair cases got found and fixed (spring pads that acted as walls, sentries
that dipped below slide height, gates that flipped while you were airborne,
pylon rows with no legal landing spot, and — once lanes arrived — a bot that
would sidestep into a wall standing just beyond its scan, then strand itself
when the only gap was two lanes away). The wall run was the newest catch: the
bot judged a plasma field jumpable because it checked the field's *height*
against a jump and never its *length*, so it kept sprinting into a twenty-metre
hazard. Teaching the oracle that a jump also has a horizontal reach took the
death count from sixteen to zero, and now a sampling run clears ninety-odd wall
sections and two kilometres of wall without dying once.

`npm run smoke` boots the built game in a real browser, plays a kilometre
through the attract bot, and asserts progression, every menu, the
pause/revive/results flow, portrait layout, the render budget, and zero console
errors.

A note on frame rate: CI here has no GPU, so WebGL falls back to a software
rasterizer and the measured fps describes that rasterizer, not the game. The
smoke test therefore reports fps and *asserts* on draw calls and triangles —
the numbers that actually predict device performance. On real hardware a
~95-call, 12k-triangle scene is not a demanding frame.

## Shipping to the App Store

See **[docs/APP_STORE.md](docs/APP_STORE.md)** for the full checklist —
bundle ID, signing, icons, privacy answers, listing copy and upload steps.
The short version:

```bash
npm run build
npx cap add ios      # once, on a Mac
npm run ios:sync
npm run ios:open     # → Xcode → Archive → Distribute
```

## Tuning it

Everything that decides how the game *feels* lives in `src/game/tuning.ts` —
gravity, jump velocity, the hold window, slide duration, vault grab distance,
the speed curve, score values, upgrade costs and every outfit palette. The
pattern library in `src/game/patterns.ts` is a flat list of chunk builders;
adding a new obstacle arrangement means adding one entry with a difficulty
threshold and a weight curve.

`npm run single-file` packs the whole game into one self-contained HTML file
that runs from a hosted page, a `file://` URL or a USB stick, and verifies it
end to end. `node tools/shoot.mjs <out.png> [w] [h] [ms]` grabs a gameplay
frame for eyeballing changes.

## Licence

All code and art in this repository is original.
