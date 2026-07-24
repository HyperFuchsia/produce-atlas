# NEON VAULT

**One path. Infinite momentum.**

An endless runner about a kinetic courier named Marcus Vale, who moves through
the vertical megacity of New Lagos the only way the Conduit allows: forward.
Everything the city puts on that path gets vaulted, jumped, or dived through.

Built as a shippable iOS title — Canvas 2D, TypeScript, zero art or audio
assets, ~35 kB gzipped, wrapped for the App Store with Capacitor.

```bash
npm install
npm run dev        # play it at localhost:5173
```

---

## The game

**Three verbs.** Tap the top half of the screen to jump; hold longer to jump
higher. Tap the bottom half to dive — a slide on the ground, a fast headfirst
dive in the air. Meet a barrier mid-jump and Marcus hand-plants into an
automatic vault. That is the entire control scheme.

**Ten obstacle types**, each demanding a different read: vaultable barriers,
crate walls, scanner beams with a slide gap, hovering sentries, glass panels
that only a dive breaks, plasma gates that alternate high and low on a beat,
spring pads, elevated rails, narrow pylons, and holes in the deck.

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
  render/     background, character, props, fx, palette, renderer
  ui/         DOM menus, HUD, shop, settings
tests/        headless simulation + fairness tests
tools/        smoke test, icon generation, dev screenshots
```

A few decisions worth knowing about:

**The simulation runs at a fixed 120 Hz and the renderer interpolates.** A
runner lives or dies on consistent physics: the same jump must clear the same
barrier on a 60 Hz phone and a 120 Hz iPad.

**Levels are authored in seconds, not metres.** Every distance in
`src/game/patterns.ts` is written as a fraction of a second of travel and
multiplied by the current run speed. As Marcus accelerates from 10 m/s to
25 m/s the course physically stretches with him, so a "tight double barrier"
stays exactly as tight in the only unit a player actually feels — time to
react. The generator sizes itself on *baseline* speed, never the boosted
speed, so a power-up can only ever make the Conduit easier.

**Marcus is drawn, not animated.** He is a small skeleton solved with forward
kinematics and inked with paths every frame, so his pose blends continuously
with the physics, he recolours instantly for every outfit, and he costs a few
hundred bytes instead of a sprite atlas.

**All audio is synthesised at runtime.** Every sound effect is built from
oscillators and filtered noise, and the music is a look-ahead scheduled synth
loop whose tempo and layer count follow the run's intensity.

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
pylon rows with no legal landing spot).

`npm run smoke` boots the built game in a real browser, plays a kilometre
through the attract bot, and asserts frame rate, progression, every menu, the
pause/revive/results flow, portrait layout, and zero console errors.

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

`dev/character.html` renders Marcus at print scale in every animation state —
open it with `npm run dev` when tuning the character art.

## Licence

All code and art in this repository is original.
