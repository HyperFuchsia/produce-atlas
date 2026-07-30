# produce-atlas
An evidence-led interactive 3-D atlas tracing the scientific identity, origins, domestication, historical movement, and global availability of food plants.

## QA-77 — The Quantum Fruit Machine (`index.html`)

A handheld LCD game in the style of an early-80s pocket console, with no gambling
in it: no currency, credits, wagers or payouts exist anywhere in the app. A lever
and four rubber keys, seven food-plant species held in superposition, and a running
measurement of your luck against what the amplitudes predicted.

### The physics is real, not decoration

- **State.** Reel one is a 7-dimensional complex state vector; reels two and three
  share a single 49-dimensional one. Between observations both evolve under a fixed
  unitary — two-level rotations on a ring plus per-site phases — so the odds are
  never the same twice. Norm is preserved to machine precision.
- **Born rule.** Pulling the lever measures: p(i) ∝ |ψᵢ|²·ηᵢ, with η a per-species
  detector efficiency, then the reel collapses onto the observed state.
- **Quantum Zeno effect.** Collapse leaves a reel in one basis state, so a fast
  second observation repeats it. Measured: p(repeat) = 0.98 at a 0.25 s gap, 0.62 at
  1 s, 0.33 by 2 s, with a partial revival near 20 s (recurrence in a finite system).
  Burst ×10 sits deep in that regime and the reels visibly stick.
- **Entanglement.** Reels two and three are coupled by a phase that does not
  separate into f(j)+g(k). The meter is 1−Tr ρ² of one reel's reduced state; it is
  zero the instant you measure and climbs back toward 0.84 as the state re-entangles.
- **l₁ coherence** (Baumgratz, Cramer & Plenio 2014) on reel one, and a
  **Leggett–Garg K** test of your hit sequence against macrorealism. Averaged over
  aligned triples, K = 1 − 4f where f is the fraction of triples that alternate, so
  the bound K ≤ 1 holds by construction (verified over 300,000 random sequences:
  max 1.000, fair-coin mean 0.00, perfect alternation −3).

### Why the luck index cannot be gamed

Match count minus its running expectation is a martingale: each spin's probability
is taken from the state as it stood immediately before that spin, so the conditional
variances add — Σp(1−p) — even though Zeno makes consecutive spins strongly
correlated. Freezing the reels raises matches and expectation equally. Better, a
locked reel has p near 0 or 1, so it contributes almost no variance, which is why
the index unlocks on accumulated evidence (Σp(1−p) ≥ 3) rather than on spin count.

### Filing a matter

The apparatus is operated as a small bureau. You file a question on **Form QA-77/B**
and it is given a case number; the lever then observes the apparatus, and the
**majority of the three reels** issues a determination — each species carries a fixed
disposition (granted, denied, deferred, referred, partially granted, inadmissible,
exceptional relief). Three different species produce **no determination at all**,
which happens on most filings and is why the register fills with matters that must
be refiled.

Every certificate prints two exact probabilities, enumerated over all 343
configurations of the joint state as it stood at the instant of observation: the
chance of that determination, and the chance of that precise configuration. The
dispositions plus the no-determination case sum to 1 exactly. Determinations can be
copied out as plain-text certificates and appealed without limit; an appeal refiles
the identical matter under a new case number and is determined by the same procedure
with the same probabilities, so appeals succeed at exactly the rate first filings do.

The certificate carries the only honest finding on the page: the determination
concerns the apparatus, has no relationship to the matter filed, and no inference may
be drawn. The apparatus never reads the question.

### Responsible-use commitments

A full-width disclaimer heads the operating manual, in three parts: **none of it is
real** (not hardware, not a measuring instrument, not a fortune teller — luck is not
a quantity anyone possesses, so nothing here can read or predict it), **built to be
put down** (no currency, credits, wagers, prizes, payouts, streaks, daily bonus,
countdowns, notifications, leaderboards or unlocks — nothing is lost by closing the
tab), and **your time is the only stake**. A session clock runs in the header as the
page's only honest score, and every quarter hour the LCD says so out loud.

### Presentation

Monochrome throughout — a dark bureau interior with light paper documents (the
filing form, the certificate, the notice). Serif for prose, monospace for every
label and figure. No colour is used to carry meaning anywhere.

### The cabinet

A full-height standing slot machine, 404 × 960 × 300, built from six CSS 3D faces
and turnable through a complete circle. **Drag it to orbit** with momentum, use the
arrow keys when it has focus, or the Front / Back / Side / Reset presets; a
double-click restores the default three-quarter view and the live yaw and pitch are
reported beneath it. The whole cabinet scales to fit whatever width the page has.

Top to bottom the front carries a lit **marquee**, a **schedule of dispositions**
printed on the paytable glass (each species, its disposition and its detector
efficiency, generated from the same table the machine decides by), the **reel
window** with payline arrows, the **display band** of status flags, message line and
seven-segment counters, a **control deck** sloping toward the player on a real 52°
rotation with the four keys standing proud of it, the **belly glass** carrying the
office seal and the notice, and a **certificate tray** at the base that jumps to the
latest determination. The lever is mounted on the right flank at deck height.

The back is modelled too: rating plate, compliance mark reading *not a measuring
instrument, not for use in evidence*, a ribbed access panel, power inlet, vents and
four slotted screws. The sides carry vent grilles and the lever boss; the caps carry
vents and feet.

The reels are true drums — each face rides a cylinder via `translateZ(-r) rotateX(a)
translateZ(r)`, so the rest pose is the identity transform, and the next species is
swapped in while the current face is edge-on.

### Interface

Powers on with a real LCD segment test — every pixel and flag lit, then blank, then
ready. The lever can be pressed or **dragged down** like the real thing, releasing
short of the catch to abandon the pull. Three alike inverts the reel cells twice at
about 3 Hz, which is how a 1-bit panel cheers. Reset asks twice before clearing a
log. Every instrument on the panel is a button that explains itself inline, the
drift chart is readable with the arrow keys, and the reels carry live ARIA labels.
Keyboard throughout: **space** observe, **B** burst, **S** sound, **R** reset.

An issued certificate scrolls itself into view; any past certificate can be reopened
from the register; a docked strip follows you down the page with the pending case and
an Observe control once the apparatus scrolls away; filing hands focus to the lever;
and a print stylesheet reduces the page to the certificate alone.

### Everything else

Matrix glyph rain and a rotating tesseract (16 vertices, 32 edges, turned in the xw
and zw planes, projected 4→3→2) sit behind the device; the hypercube's rate is tied
to the live coherence. Reel symbols are hand-drawn 16×16 LCD sprites, counters are
true seven-segment, and the beeps are square-wave piezo.

Single self-contained file, no build step and no dependencies — open `index.html`.
No network calls and no collection of any kind; session statistics persist in `localStorage` on the user's own machine and Reset clears them.
keyboard (space to observe) and
`prefers-reduced-motion` are supported, and `window.QA77` exposes the live state
vector for poking at from the console.
