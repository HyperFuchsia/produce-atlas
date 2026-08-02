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

A full-height standing slot machine, 420 × 1036 × 364, built from six CSS 3D faces
and turnable through a complete circle. **Drag it to orbit** with momentum, use the
arrow keys when it has focus, or the Front / Back / Side / Reset presets; a
double-click restores the default three-quarter view and the live yaw and pitch are
reported beneath it. The whole cabinet scales to fit whatever width the page has.

Each face is built as a centred cube — translated back half the depth, rotated, then
pushed out half the width — so all six outer surfaces point outwards and none are
culled by `backface-visibility`. The data plate on the right flank reads unmirrored,
which is the proof. The whole shell is then pushed forward half a depth so it turns
about its own axis rather than swinging around its front glass, and the fit takes the
resulting perspective magnification back out. A world-fixed key light shades each
face from its own normal against the live orbit, so the lit side stays lit.

Materially it is painted steel, not flat fill: a specular band raked across the front
with the outer inches falling into shadow, two polished corner posts standing at the
front edges, a machined bezel around the reel window, and pressed recesses in the
flanks that are dark along the top inner edge and bright along the bottom — which is
what makes an eye read a recess rather than a rectangle. The flanks' outer edges take
a cool rim so the silhouette survives a dark room. Three panels are lit and throw
light onto the paint around them: the marquee, the reel window and the lower notice
rail. Over the drums is glass — a specular sweep that travels as you orbit, a soft
reflection of the room high on the pane — and each reel cell is shaded as a drum
face, lit across its crown and falling off at both shoulders.

**Grounding.** At a 14° camera a real floor plane is edge-on and carries nothing, so
the machine is grounded the way a product render does it at that angle: a hard
contact core, a soft ambient shadow, and a reflection of the lit panels coming back
up off the floor — all in the plane of the page, and all sized from the machine's own
footprint as it turns, `w·|cos yaw| + d·|sin yaw|`.

### The receipt

The apparatus is glass, machined metal and a 49-dimensional state vector, and the one
thing it hands you is 58 mm of thermal paper. Every observation prints one, and it
comes **out of the machine**: the paper feeds from the printer mouth in the cabinet's
own front face, hangs down over the belly glass to the plinth, and turns with the
cabinet when you orbit it. Click it once to be taken to the readable copy, again to
tear it off. The head is not in good repair: the roll never feeds square, one band across the
paper is faint where the platen ran cold, a scattering of characters simply failed to
fire, and the printer clock runs behind the apparatus clock — so about one receipt in
four is stamped as having been printed *before* the observation it records.

**The figures are all real**, taken at the instant of observation: the payline with
taxon and common name; p(this configuration), p(any match this spin) and p(all three
alike); the detection probability of all seven species with η already applied, each
with a bar; l₁ coherence, entanglement, the interval since the last observation and
whether that puts it in the Zeno regime; the Leggett–Garg K; the running record with
its expectation, its Σp(1−p) evidence and the luck index (withheld in as many words
when there is too little evidence); and the matter, its determination, its exact
probability and its file number when one was filed. Then the disclaimer, the session
clock, the roll metreage, and a barcode of the receipt number that no reader on earth
wants.

**The arithmetic is checked, not asserted.** `math.js` recomputes every probability
the receipt prints — p(any match), p(all three alike), p(this configuration) and all
seven detection probabilities — straight from the raw complex amplitudes on
`window.QA77`, using code that shares no line with the page's own, capturing the state
and firing the observation in the same tick so the vectors cannot evolve between them.
Across six observations that is 66 independent checks, and they agree to within
6×10⁻⁵. The seven dispositions plus the no-determination case sum to 1.000000000000.
The paper says why this matters: *luck is not a quantity and cannot be measured; every
figure above can be, and was, and says nothing about yours.*

**Copy text** and **Save as .txt** give the clean, complete text — what is on the
paper is only what the head managed to lay down. **Print** reduces the page to the
receipt alone. **Tear off** detaches it, and the machine notes that it has not kept a
copy. Leave one uncollected and the next one says so.

### The attendance interlock

The apparatus will not observe until it is satisfied that an observer exists. The
brass plate on the control deck — worn to the shape of a hand — is the primary
control: **press and hold** it, and while it is held the machine reads you and reports
what it read (*surface temperature 36.4 °C, consistent with an operator*; *two hands
detected, one is not accounted for*). Release and it observes. Release before it has
registered and the attendance is withdrawn and nothing happens.

The readings are invented; it has no sensor, it is a button. The plate has always
recorded more hands than the machine has spins, and the difference is exact: three
from before you arrived, plus every time it has **registered a hand that is not
there** — which it does roughly once every six minutes, says so on the LCD, and then
observes without you.

The hold is deliberately short (420 ms). It is an interlock, not a tease: nothing
here builds anticipation before a result. The lever, the space bar, Enter on the
plate and the docked Observe control all still work and none of them make you wait.

### The apparatus is not quite right

Deliberately, and Schedule D on the page says so in full. The cabinet holds a pose
exactly and then, every ten seconds or so, is a fraction of a degree somewhere else;
its reflection is a beat behind it; the seal in the belly glass turns once every nine
minutes. The rating plate and the flank plate change their serial numbers while they
are turned away from the camera, and the service record on the back counts up whether
or not you pull the lever — the apparatus was running before the page opened and does
not stop when it closes. Occasionally a lamp lights for nothing, a second payline
appears on a machine that has one, a character in the message line gives way, and a
reel reports **state 8**, which is not in the basis. The register has always held
**QA-77/0000**: a matter you did not file, withheld, deferred, not open to appeal. If
you leave it alone it will eventually tell you so, four times, and then stop. Come
back later and it knows you were here.

**Four things are exempt and stay true:** the physics, the printed probabilities, the
register's arithmetic, and the session clock. State 8 is a display artefact only —
the outcome recorded, counted and certified is the one the Born rule produced. None
of it is a hook: the drift holds still between shifts so the keys stay a stable
target, the idle lines are written to be off-putting and do not repeat, and
`prefers-reduced-motion` stops all of it. The manual states plainly that the machine
has not noticed you and cannot, and that nothing here is a sign.

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
