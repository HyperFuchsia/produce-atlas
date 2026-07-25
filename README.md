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
  **Leggett–Garg K** = 2C₁−C₂ test of your hit sequence against macrorealism (K ≤ 1).

### Why the luck index cannot be gamed

Match count minus its running expectation is a martingale: each spin's probability
is taken from the state as it stood immediately before that spin, so the conditional
variances add — Σp(1−p) — even though Zeno makes consecutive spins strongly
correlated. Freezing the reels raises matches and expectation equally. Better, a
locked reel has p near 0 or 1, so it contributes almost no variance, which is why
the index unlocks on accumulated evidence (Σp(1−p) ≥ 3) rather than on spin count.

### Everything else

Matrix glyph rain and a rotating tesseract (16 vertices, 32 edges, turned in the xw
and zw planes, projected 4→3→2) sit behind the device; the hypercube's rate is tied
to the live coherence. Reel symbols are hand-drawn 16×16 LCD sprites, counters are
true seven-segment, and the beeps are square-wave piezo.

Single self-contained file, no build step and no dependencies — open `index.html`.
Session statistics persist in `localStorage`; keyboard (space to observe) and
`prefers-reduced-motion` are supported, and `window.QA77` exposes the live state
vector for poking at from the console.
