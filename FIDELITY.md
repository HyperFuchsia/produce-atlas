# FIDELITY — what DEEP SURVEY is, and what it is not

This is the charter. Every build cycle is judged against it by a panel with
authority to **kill** work outright — not to request changes, to discard the
branch. Work that violates a MUST is rejected even when it is well made, even
when it satisfies its roadmap item, even when it is what someone asked for.

Drift is the only real failure mode of continuous automation. This file is the
thing that stops it.

---

## 1. WHAT IT IS

A 1979 vector-phosphor console. The operator is one person on a commercial
lighter with a standing order, an air supply, and a licence that stops
covering them at twenty-five light years. They cannot understand anything out
here yet, and the things that could teach them were all here first.

The register is ALIEN (1979): **bureaucratic procedure under existential
threat**. Forms, registries, standing orders, insurance clauses — and behind
them something that does not care. Dread comes from procedure continuing while
the situation does not.

---

## 2. MUST — violating any of these is a kill

### 2.1 The display is emitted light on true black
- **MUST** be stroke-only. No filled shapes, no gradients, no textures, no
  images. The only permitted fills are single-pixel phosphor specks, sub-pixel
  detail inside an instrument (ommatidia, a scan bar), and the CRT composite.
- **MUST NOT** use `border-radius`, `box-shadow` as a drop shadow, or any
  shadow that implies a light source. Glow away from a stroke is phosphor
  bloom and is permitted; a shadow beneath an element is not.
- **MUST** express elevation and importance as brightness, never as depth
  simulation.
- **MUST** be monospaced, uppercase for labels, tabular figures for numbers.

### 2.2 Everything reports state
- Every mark on screen **MUST** carry information. If a thing cannot answer
  "what does this tell the operator", it does not ship.
- Colour **MUST** be semantic and consistent: blue chassis, green graticule
  and nominal, amber vehicle and caution, red hazard and alarm, magenta
  contact, cyan label, white readout.
- **MUST NOT** add decoration, flourish, filler animation, or an element whose
  purpose is atmosphere alone. The atmosphere is a consequence of the
  instruments being honest, not a layer on top of them.
- An instrument **MUST NOT** lie to make the operator feel better. It may lie
  because it is damaged, and then the damage is the readout.

### 2.3 It is one self-contained file
- **MUST** remain a single HTML file with no external assets, no libraries, no
  network requests, no fonts to fetch. A strict CSP blocks all of it anyway.
- All sound **MUST** be synthesised in Web Audio. No samples, ever.
- All geometry **MUST** be procedural. No modelled assets, no sprite sheets
  beyond the hand-written bitmaps already in the file.

### 2.4 The data is real
- The star catalogue **MUST** stay real: real names, real right ascension,
  declination, distance, spectral class and confirmed planet counts.
- Derived content (systems, hazard fields) **MUST** be deterministic from real
  data or from a displayed seed. The operator can always ask why something is
  where it is and get an answer.
- **MUST NOT** invent astronomy that contradicts the catalogue.

### 2.5 It is a horror game about being the visitor
- The cultures were here first. The operator is the unregistered party.
- **MUST NOT** make the aliens humanoid, cute, comic, or grateful.
- **MUST NOT** use a jump scare, a chase sequence with twitch inputs, gore, or
  a monster that behaves like a video-game enemy. The pursuer is a return on a
  scope that gets closer.
- Death **MUST** be possible, legible in hindsight, and final for that run.

### 2.6 It is played one-handed on a phone
- Every action **MUST** be reachable by thumb in portrait at 390×844.
- **MUST NOT** require a keyboard, a hover state, a right-click, or precision
  finer than a 34px target.
- **MUST** hold 60 fps at 390×844, 844×390 and 1280×900, and **MUST NOT**
  produce horizontal overflow at any of them.

### 2.7 The maths is real and it is a curve, not a wall
- Navigation **MUST** stay genuine vector geometry against the real catalogue.
- **MUST NOT** replace a computation with a dice roll.
- A new operator **MUST** always be able to travel. Difficulty is expressed as
  precision, damage and time — never as being unable to act.

---

## 3. SHOULD — a panel may kill for these if the violation is flagrant

- Prose comments explaining **why**, in the voice of the file. Not restatements
  of the code, not banners, not decoration.
- New systems attach to what exists rather than sitting beside it.
- Text in the console's register: terse, procedural, uppercase labels, no
  exclamation, no second person cheerleading. "ARRIVAL THROUGH HALO", not
  "Nice landing!".
- Numbers in commit messages and pull requests come from measurements taken
  that cycle.
- Nothing is added that the operator cannot discover from the console itself.

---

## 4. EXPLICITLY OUT OF SCOPE

Proposals in these directions are killed on sight and should not be added to
the roadmap:

- Multiplayer, accounts, leaderboards, telemetry, analytics.
- Monetisation of any kind.
- Photorealism, raster art, 3-D model formats, shader-based rendering that
  abandons strokes.
- A settings menu of graphical options. The console has the toggles it has.
- Difficulty selectors. Difficulty is what the operator has learned.
- Any framework, bundler, build step beyond `orbital/build.mjs`.
- Narrative delivered as cutscene, voiceover recording, or non-diegetic text.

---

## 5. HOW THE GATE WORKS

Three judges read the charter and the diff. Each returns PASS or KILL with
specific citations. **Two KILL votes discard the branch.** A killed cycle
writes its reason to `REJECTED.md` so the operator can see what the automation
refused and why — a gate that rejects silently is indistinguishable from a
gate that is broken.

A judge **MUST** cite the clause. "Feels off" is not a kill. "Adds
`border-radius: 4px` to `.opt`, violating 2.1" is.

A judge **MUST NOT** kill for scope, taste, or a better idea it has. Those go
in the pull request body as notes. The gate exists for one thing: keeping the
work faithful to what this is.
