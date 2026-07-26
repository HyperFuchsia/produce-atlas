# DEEP SURVEY - the prompt

Everything the project is, compressed to the form you would hand to a capable
model with nothing else. FIDELITY.md is the enforced subset of this - the
clauses the build cycle's fidelity panel can cite to discard a branch. The
full brief, with the measured numbers and the reasoning, is published as an
artifact.

```
Build a space-horror adventure game as ONE self-contained HTML file — no
libraries, no external assets, no network requests, no build step. It runs on a
phone in portrait, operated with one thumb, at 60 fps.

THE LOOK is 1979 vector-phosphor CRT — cassette futurism, FUI, the Semiotic
Standard, the ALIEN flight deck. Absolute black ground. STROKE-ONLY: no fills,
no gradients, no textures, no images, no border-radius, no drop shadows.
Elevation is expressed as brightness, never as simulated depth; glow away from
a stroke is phosphor bloom and is correct. Monospaced, uppercase labels inside
stroked boxes, tabular figures, dot leaders. Colour is semantic and fixed: blue
chassis, green nominal, amber caution, red alarm, magenta contact, cyan label,
white readout.

EVERY MARK ON SCREEN MUST REPORT STATE. If a thing cannot answer "what does
this tell the operator", it does not ship. There is no decoration and no
atmosphere layer — the atmosphere is a consequence of the instruments being
honest. An instrument may lie only because it is damaged, and then the damage
is the readout.

MODEL THE DISPLAY, do not filter it: phosphor persistence (never clear the
canvas — paint translucent black so motion trails), beam jitter, horizontal
tear, half-res canvas-side bloom, scanlines, aperture grille, interlace roll,
phosphor grain. Scale jitter, tear and grain with hull damage from one fault
term, so the operator reads the hull off the picture.

THE WORLD IS REAL. Seventy-plus real stars with real RA, declination,
distance, spectral class and confirmed planet counts, converted at load to
equatorial Cartesian: x = r·cosδ·cosα, y = r·sinδ, z = r·cosδ·sinα. Project
in 3-D by hand onto a 2-D canvas. Everything derived is deterministic from
real data or from a seed the console displays.

THE GAME. You are one operator on a commercial lighter with a standing order,
an air supply, and an insurance policy void beyond 25 light years.

  NAVIGATION IS THE ANTAGONIST. A jump is bearing, elevation and range, and
  the vehicle goes exactly where those point. The catalogue is referenced to
  the origin; what you need is the displacement from HERE. Flying the
  catalogue heading misses by the length of your own position vector. Grade
  the miss: arrive clean, arrive through the system's halo taking debris,
  arrive where there is no star and be adrift, or do not arrive. It is a
  difficulty CURVE, never a wall — the computer can always fly a course; what
  the aliens teach is how tightly.

  LANGUAGE IS THE PROGRESSION. You cannot understand anything at first.
  Comprehension is counted glyphs, learned in the frequency order of what a
  culture actually transmits. Undecoded words stay in the sender's script
  mid-sentence, the speech synthesiser DROPS OUT on them, and replies you
  cannot phrase cannot be sent. Make the easiest language the furthest away,
  so the first thing you meet is the last thing you understand.

  YOU ARE THE VISITOR. Every culture was here first and owes you nothing.
  Courtesy is a resource; replies carry weight and the panel marks the costly
  ones before you send them. What they give — the navigation reductions that
  make astrogation possible at all — is given, never taken.

  TRANSMITTING IS WHAT KILLS YOU. Nothing hunts you until you broadcast. Every
  hail is a bearing. It moves when you move, it is never identified, and the
  plate says nothing about it until the sweep finds it.

  HAZARDS. Debris streams, meteor swarms and drifting hulks as capsules
  (segment + radius) seeded onto real routes. Test the corridor by integrating
  the chord inside each; damage is chord × density. A hazard you have found is
  drawn. A hazard you have not found is not drawn, is still in the corridor,
  and still in the damage sum.

TWO INSTRUMENTS, one at a time: a galaxy chart for deciding where to go, and a
near field for what you do once you arrive — the primary as a body, planets on
real orbits, and an approach with one dial (how deep into the well you go)
where yield rises all the way down and damage starts at a floor the console can
only estimate.

THE ALIENS are lathed 3-D surfaces, not drawings: a spine of control radii down
the midline and a per-race cross-section that departs from circular where the
anatomy does. Cut the mesh away over the eyes and mouth so features have black
to sit on. Nothing has an arm — limbs are chains that bend in their own frame,
the bend plane precessing, the oscillation lagging down the chain so motion
arrives at the tip late. Give them tentacles, mantis manipulators, machine
armatures. Never humanoid, cute, comic or grateful.

ALL SOUND IS SYNTHESISED — no samples. Give each culture different PHYSICS, not
a different waveform: stridulation, a struck inharmonic bar, a ring-modulated
gas bladder, a quantised oscillator bank. Read the English translation aloud
with a parallel formant synthesiser — glottal buzz plus hiss through three
resonant bandpasses, formants STEPPED not glided, flat pitch declination — the
topology of a Votrax SC-01. Let the bed hum run from power-on so its absence
can be the loudest thing you have.

HORROR IS PROCEDURE UNDER THREAT, in the register of ALIEN (1979): forms,
registries, standing orders and insurance clauses, and behind them something
that does not care. No jump scares, no gore, no twitch chase. Death is
possible, legible in hindsight, and final.

METHOD: measure, never assert — verify frame rate, layout overflow, audio
levels and physics with a headless browser at 390x844, 844x390 and 1280x900,
and quote the numbers. Comments explain WHY in plain prose, never restating the
code. Play whole runs rather than reasoning about the balance.

OUT OF SCOPE: multiplayer, accounts, telemetry, monetisation, photorealism,
raster art, shaders that abandon strokes, a graphics settings menu, difficulty
selectors, any framework, and narrative delivered as cutscene or voiceover.
```
