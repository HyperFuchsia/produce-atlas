# produce-atlas
An evidence-led interactive 3-D atlas tracing the scientific identity, origins, domestication, historical movement, and global availability of food plants.

## QA-77 — The Quantum Fruit Machine (`index.html`)

A standing slot machine rendered as an actual WebGL scene: real geometry, physical
materials, lights that cast shadows, and a camera you orbit. **Drag to orbit, scroll
to dolly, click the lever (or press space) to observe.**

> **Where the rebuild stands.** Everything below the line marked *Carried over from
> the CSS build* describes behaviour that is **not currently in the page**. The
> earlier version faked three dimensions with CSS transforms and painted shading; it
> is preserved at commit `7af387e` and its specification is kept here because that
> substance is being reconnected to the new scene, not discarded. What the page does
> today is the cabinet, the reels and the spin — described immediately below.

### The scene

Built on three.js, bundled to a single IIFE and inlined, so `index.html` remains one
self-contained file with no network calls of any kind.

Physical materials are mostly reflection, and with nothing to reflect they render as
flat lambert no matter how many lights you add — which is precisely what the CSS
version could never fix. So the scene carries a procedural environment: a painted
equirectangular canvas (cool sky, a warm softbox high on the left, a second cooler
source behind the right, a floor bounce) run through `PMREMGenerator` so the
roughness terms are correct. Tone mapping is ACES filmic; shadows are PCF soft from a
2048² directional key, with a cool rim from behind right and a weak frontal fill.

Point lights inside the cabinet are set in the hundredths. That is not a mistake:
illuminance falls off with the square of distance, and a lamp four centimetres behind
a reel strip at intensity 0.30 delivers roughly thirty times the key's illuminance,
which clipped the entire window to a featureless white slab.

### The reels

Three cylinders on a shared horizontal axis, seen through a hole. The curvature is
the point — symbols compress toward the top and bottom of the window and only the
middle row is square-on — and it is the one thing a scrolling list of tiles can never
produce, which is what every previous attempt was.

Each drum carries an eleven-stop strip drawn to canvas: seven glyphs in a different
order per drum, aged paper, hairlines between stops, and the stop number printed
small at the edge as on a real strip. The strip is drawn sideways, because a
cylinder's texture *u* runs around the circumference and its *v* runs along the axis
— so on the front face canvas +x reads as up the screen and canvas +y reads as across
to the right, and every glyph is laid down through a quarter turn.

Where a stop lands is derived rather than tuned. Three's cylinder puts texture
coordinate *u* = 0 at +Z, and after the quarter turn that lays the axis along X,
spinning by `rotation.x = a` carries the point at *u* to the front when `a = 2πu`.
Stop *i* is centred at *u* = (i + ½)/11, so its landing angle is exactly
`2π(i + ½)/11` plus any number of whole turns. Each drum runs up, eases out,
over-travels by a seventh of a stop and snaps back — the settle you can hear on a
real machine — over a duration staggered so they stop left to right.

### The cabinet

74 × 30 × 26 inches, modelled to scale in metres. No edge anywhere is sharp: every
part is an extruded rounded rectangle with a bevel, and that radius catching the
light is most of what says *made object*. The bevel is compensated for, because
`bevelSize` grows the profile *outward*: feed `ExtrudeGeometry` the finished size
and every part comes out 2 × bevel too big. That put the body's flank at 0.393 m
instead of 0.381, and every fitting placed against it — louvres, seams, the lifting
handle — ended up buried inside the panel it was supposed to sit on.

The head is one continuous fascia with a genuine rectangular hole extruded into it,
not four panels arranged around a gap. Built the second way — which is how it was
built first — the seams land on the face of the machine and the head reads as a stack
of trays. The carcass behind it (crown, shelf, two posts, back wall) can then be
plain boxes, because no joint in it is ever visible.

Both lit panels are dark ground with pale lettering rather than the reverse: a
backlit sign that is mostly light surface has no headroom before it clips, and the
first marquee came out as a blank white rectangle for exactly that reason. The
marquee carries the bureau's name; the belly glass carries its seal and the schedule
of dispositions. Round them out: a chromed bezel and a thin pane over the drums, a
printed payline at the middle row, a notice rail, coin and claim mouths, a coin tray
you can see into, panel reveals and a keyed service lock, side louvres, and a
four-key control deck with legends under a brass observe bar.

It is an object you can turn all the way round, so it is finished all the way
round: a hinged service door with a latch, an extract grille, a supply inlet, a fuse
carrier and a data plate on the back; louvres, a waist seam, a door edge and a
lifting handle on each flank. The light rig follows from that — a warm key from the
front left, a cool rim from behind right, a back fill from behind left and two side
kickers — because with a front key alone the other three quarters render as
silhouette with no surface in them.

The camera frames the machine rather than sitting at a fixed distance. It projects
the eight corners of the bounding box and takes the distance at which the last of
them fits, so a phone in portrait — where the horizontal field is a third of the
vertical one — gets a dolly back instead of a crop.

### Verification

`window.QA77` exposes the scene, camera, orbit state, drums, strip orders and the
landing-angle function. The spin is checked headlessly against it: over six
consecutive spins every drum's resting angle matched `landingAngle(stop)` to within
1e-9 modulo a whole turn, and the symbol reported to the read-out matched the one the
strip order puts on the payline. Zero failures, no console errors. Framing is checked
the same way: at 390 × 800 all eight bounding-box corners project inside the frame.

---

*Carried over from the CSS build — specification, not current behaviour:*

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

### The receipt

The apparatus is glass, machined metal and a 49-dimensional state vector, and the one
thing it hands you is 58 mm of thermal paper. Every observation prints one, and it
comes **out of the machine**: the paper feeds from the printer mouth in the cabinet's
own front face, hangs down over the belly glass to the plinth, and turns with the
cabinet when you orbit it.

**You cannot read it until it has been collected.** The paper hangs in the printer,
and when you click it a **white glove with three fingers and nobody in it** floats up
out of the dark, closes on the record, takes it off the machine, brings it round to
face you and holds it up long enough to read every line before letting you have it.

It is not your hand either; on the machine's own account it is the second one, the one
the attendance plate keeps reporting: *two hands detected, one is not accounted for.*
It is a cartoon glove of the inflated-vinyl kind — an open palm, three splayed
fingers with bulbous tips, one long tube of a thumb off the left of the hand, and a
loose ring of a cuff — drawn from a reference and rendered rather than illustrated.
**There is not one stroke anywhere in it:** an outline is what makes a glove read as a
drawing, so the whole form is carried by shading instead.

**It is one closed path.** Palm, three fingers and thumb are a single silhouette —
not a union of capsules, cylinders or blobs — and every piece of shading is clipped
inside it. That is the whole reason it holds together: with one outline there is no
join to come apart, no primitive to float free, no doubled geometry and no accidental
gap, and the silhouette reads before any material is applied.

Four digits total, as the reference has: three fingers pointing up — tallest, slightly
shorter, shortest and leaning out — each with a thick rounded end, and one thumb
extending to the viewer's left with a deep web between it and the first finger. The
palm faces the camera and stays visible; the hand is turned only four degrees, enough
to read thickness and no more. The wrist points down and one flattened oval cuff sits
centred beneath it, not crossing the hand. Three shallow curved palm creases, incised
as a dark groove with a lit lip below, and nothing else — no nails, no knuckles, no
markings.

The material is warm ivory satin: a broad ramp with a soft key from the upper left,
one specular per swelling following its form, a core shadow turning each toward the
right, and shade pooled in the three valleys. A warm rim runs the upper-left edge and
a cool blue rim the right, masked to their own sides, and the collector carries its
own cobalt-and-violet pool so that cool rim has something to come from.

The glove has a permanent slow float, and the three fingers are hinged at their own
knuckles and foreshorten rather than swing as they curl. The choreography runs as five stepped
beats — approach, grip, take, present, release — each timed on its own and composed
from custom properties so no two beats fight over the same transform. In the present
beat the record is re-set at a larger type size rather than scaled up, computed from
its real line count so the whole of it fits the stage however long it happens to be;
the glove holds it by one bottom corner so it stands up and to the side rather than
hiding the glove behind its own work; and the grip is placed from where the curled
fingertips actually land in the artwork. The held tilt is kept under two degrees,
because a wide sheet rotated any further shears its right-hand column of figures past
a whole line and stops reading as a column.

Nothing is withheld: the record is complete and yours the moment the glove is gone,
and `prefers-reduced-motion` goes straight to it.

The head is not in good repair: the roll never feeds square, one band across the
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
