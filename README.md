# produce-atlas
An evidence-led interactive 3-D atlas tracing the scientific identity, origins, domestication, historical movement, and global availability of food plants.

## QA-77 — The Quantum Fruit Machine (`index.html`)

Atlas Electronics' Quantum Determination Apparatus, rendered as an actual WebGL
scene: real geometry, physical materials, lights that cast shadows, and a camera
you orbit. **Drag to orbit, scroll or pinch to dolly, press OBSERVE (or the space
bar) to put matter to the apparatus.**

The design is the original one and not a reinterpretation of it — monochrome
throughout, an LCD display with 16 × 16 pixel sprites, the instrument strip under
it, the OBSERVE bar, and the Public Luck Authority service panel across the belly.
An intermediate rebuild drifted into navy, brass and printed paper reel strips and
mechanical drums. That machine is gone.

> **Where the rebuild stands.** Everything below the line marked *Carried over from
> the CSS build* describes behaviour that is **not currently in the page**. The
> earlier version faked three dimensions with CSS transforms and painted shading;
> it is preserved at commit `7af387e` and its specification is kept here because
> that substance is being reconnected to the new scene, not discarded. What the
> page does today is described immediately below.

### The scene

Built on three.js, bundled to a single IIFE and inlined, so `index.html` remains one
self-contained file with no network calls of any kind.

Physical materials are mostly reflection, and with nothing to reflect they render as
flat lambert no matter how many lights you add — which is precisely what the CSS
version could never fix. So the scene carries a procedural environment: a painted
equirectangular canvas run through `PMREMGenerator` so the roughness terms are
correct. It is neutral grey, because nothing on this machine is allowed to be a
colour. Tone mapping is ACES filmic; shadows are PCF soft from a 2048² directional
key, with a rim from behind right, a back fill from behind left and two side
kickers — an object you turn all the way round has to be lit all the way round.

### The display

An LCD, as it always was: a flat panel of pixels behind glass. Seven food-plant
sprites — cherry, grape, lemon, melon, plum, pear, fig — each a 16 × 16 bitmap,
each lit pixel drawn as its own small square with a gap around it, which is the
whole reason a segment display looks like one. Unlit pixels are drawn too, at
thirteen percent, because a real panel shows them faintly; at thirty percent the
whole field read as a pale square sitting behind every symbol.

Cell metrics come from the panel and not the other way round: the row height falls
out of the canvas size, the sprite is 88% of the row, and the pixel pitch follows.
Fixed at a guessed 176 px the sprites sat at two thirds of their cell with a margin
all round. Each sprite is pre-rendered to its own canvas and blitted, rather than
redrawing 256 rectangles per symbol per column per frame while three reels run.

Each column scrolls on a continuous position over the seven symbols, runs down,
over-travels by a sixth of a symbol and snaps back, staggered so they stop left to
right. A reel's resting position is congruent to its stop modulo seven by
construction.

### The cabinet

One upright box, 26 × 67 × 24 inches, not a body with a head balanced on it. The
original is a single slab whose whole front is a stack of plates, and the seam
where a separate head would meet it is the first thing that would give it away.
Polished corner posts down the front edges, a vent grille across the top.

Down the front: the ATLAS·ELECTRONICS header plate, two state windows, the display
in its well, the instrument strip, the message line, the OBSERVE bar with BURST /
RESET / FILE beside it, the notice rail, the determination-record and claim mouths,
and the Public Luck Authority service panel with its pressed seal. It is finished
all the way round — a hinged service door with a latch, an extract grille, a supply
inlet and a data plate on the back; louvres, a seam and a recessed carry bracket on
each flank.

Two extrusion traps, both of which cost a rebuild before they were understood.
`bevelSize` grows a profile *outward*, so feeding `ExtrudeGeometry` the finished
size makes every part 2 × bevel too big and everything mounted against it ends up
buried inside. And a frame whose border is thinner than 2 × bevel inverts — the
hole comes out larger than the outline, the shape triangulates into a filled slab,
and it renders as a black rectangle over whatever it was framing. That is exactly
what swallowed the service panel. `ring()` now clamps the bevel to 40% of the
border so it cannot happen again.

### The fall

The apparatus does not arrive new. It arrives mid-cycle, falling, having been in
service somewhere else — two reels already down on the same symbol and the third
crawling toward it the way a reel does when a machine wants you to watch. It lands
one stop short. A third of a symbol: near enough to see the melon entering the
window, not near enough to count. Then it comes apart, and that is where the ten
parts on the floor come from.

Thirty metres in six seconds, arriving at about eight metres a second. A camera
that tracks a falling object perfectly shows no fall at all — the object sits dead
still in frame and only the tumble moves — so the motion has to come from what the
camera passes on the way down. A field of six hundred streaks hangs still in the
world and gets recycled once it is above you, lengthening with speed; fourteen
tokens the machine is shedding tumble alongside, falling slightly slower so they
drift up out of frame; the field of view widens fifteen degrees as it accelerates;
the camera shakes on two frequencies rather than white noise, because random per
frame reads as a broken renderer and a beat reads as something hitting something.
The viewer is falling too and not quite keeping up: the cabinet pulls away through
the middle of the drop and is caught again at the floor. Impact spikes the
exposure and rings the shake down over a second.

The reel choreography is stateful rather than scripted frame by frame: two reels
run at eleven symbols a second and ease onto the match at 1.9 and 3.2 seconds, the
third drops into a decelerating crawl at 3.7 and is still moving when the machine
hits.

One animator handles both directions. Parts fly off the machine when it lands and
back onto it during assembly, and the only difference is which pose is the
destination and how high the arc is.

Tapping, or the space bar, cuts the cold open short.

### The commissioning

The apparatus does not arrive. It arrives in ten assemblies on the floor with a
build schedule, and only once the schedule is discharged does anything on it have
power.

The cabinet is built as ten groups rather than one heap of meshes — plinth,
carcass, display unit, header plate, instrument strip, control band, interlock
band, lever, service panel, coin tray. Every mesh goes in through one funnel that
routes it to whichever assembly is open, and an assembly is find-or-create because
none of them is one contiguous run of code: the carcass picks up its flanks and its
back several hundred lines after the front of it. Once everything is built, each
group's origin moves to the middle of what it contains — until that happens the
children carry absolute coordinates and the group's origin is the machine's, a
metre away, so laying a part down would swing it round the cabinet rather than turn
it over.

Form QA-77/A runs in order. The part wanted next lifts clear of the floor and bobs,
because a schedule you cannot read off the floor is a schedule you cannot follow;
reaching for any other is refused three different ways. Each part reports as it
seats — the carcass will not be moved again, the instrument strip has nothing to
measure, the lever is not connected to anything.

Nothing is lit until it is built: every emissive surface registers itself and runs
at zero, so the plates read as printing on metal and the display is a dead panel
with its symbols only ghosted in it. When the last part goes on, supply comes up
over two seconds, the work light over the floor fades out, the camera tips up from
looking down at a workshop to looking at a machine, and the interlock takes over.

The camera frames whatever is still on the floor and tightens as the floor clears.
It targets the middle of what is actually there in all three axes — pinned to the
spot the cabinet will eventually occupy, it framed an empty patch of floor and
pushed the parts, which are laid out in front of that spot, into one corner. A
pinch or a scroll hands the viewer the wheel and it stops following.

### The attendance interlock

Starting the apparatus is not a button. It is a form, and the form is the point.
Seven steps, each of them a real control on the cabinet, all of them in order:

1. **The attendance key**, turned ninety degrees. *"ATTENDANCE RECORDED. YOU ARE
   PRESENT AT T+12.4S."*
2. **Three declaration toggles** — I ATTEND, UNPAID, AWARE. *"DECLARED: I AM AWARE
   THAT NOTHING FOLLOWS FROM THIS."*
3. **The stamp press**, a hinged arm swung down onto its pad.
4. **The docket**, which extrudes from the record mouth carrying a serial number
   and the stamp, and has to be taken. *"RETAIN IT. IT ENTITLES YOU TO NOTHING."*
5. **The lever** — chrome, on the flank, where a fruit machine's lever belongs.
   It is not connected to anything. There is a stamped plate beside it that says
   so, and it is still step five of seven.
6. **The cover**, a smoked flap hinged over the OBSERVE bar.
7. **OBSERVE**, which is the part that works.

Out of sequence is refused rather than ignored, and says so three different ways.
The cover physically blocks OBSERVE, so that step refuses itself without any state
to consult. BURST requires a second attendant, and there is one of you.

The state window tracks STEP n OF 7. After every observation the key turns back,
the toggles drop and the cover closes, and a beat later the message line says the
interlock has reset. It always does.

Every moving part runs on the same helper: a number easing from 0 to 1 and a
function that decides what it means. The space bar works whichever control is next
— nine presses from a cold start, because step two is three separate toggles —
which is the only mercy in the arrangement.

### The coin dispenser

The apparatus dispenses one token per observation. It dispenses it whatever the
reels did, because a payout that depended on the result would be a payout, and it
says so out loud: *"ONE (1) TOKEN DISPENSED. THE OUTCOME DID NOT AFFECT THIS."*
Three alike gets you the same token as three of nothing.

Tokens come in three sizes — **MINOR** at 21 mm with a single rim line, **COMMON**
at 29 mm with a double rim, **PRINCIPAL** at 38 mm with a double rim and a ring of
28 pips — and they are issued in strict rotation, because that is the order the
hopper was loaded in and nothing else about the apparatus gets to decide it either.
The plate on the tray lip carries the running breakdown and, beneath it, the line
the whole arrangement needs: *THE CLASSES ARE NOT DENOMINATIONS · ALL TOKENS ARE OF
NO VALUE.* It has to say that, because three sizes of coin is precisely what a
denomination looks like.

All three are struck NO VALUE on both faces, with PUBLIC LUCK AUTHORITY round the
rim and the class below. Both faces, because a cylinder's bottom cap carries its
top cap's UVs seen from the other side, so a single texture on both came out
mirrored and every coin that landed tails-up read ETULAV ON.

It falls: out of the chute, tumbling, bouncing off the tray floor at a third of its
speed, rattling off the lip and the cheeks if it arrives too fast, and lying flat
where it stops. Not a physics engine — a coin, a floor and three walls — but it
lands somewhere different every time. A bounce that keeps a third of its speed
converges, but nothing in the arithmetic promises it converges *soon*, and on a
coarse frame step a coin can skitter indefinitely; anything still in the air after
a second and a half is put down.

The tray holds eighteen. Past that: *"PERIODIC AUDIT. ONE (1) TOKEN RECLAIMED."* —
the only mechanism in the apparatus that removes anything. Click the tray and you
surrender the lot, and the issue record is unchanged, because giving them back does
not undo having been given them. The counter on the lip only goes up.

There is no hood over the cup. The first one was 57 mm deep, and from any angle a
person would actually stand at, its shadow covered the whole floor and every coin
in it. A real coin tray is an open cup for the same reason.

### The instruments read something

The coherence bar collapses to nothing when you observe and creeps back over about
eight seconds. OBS and MATCH count. LUCK stays `- - -` until twelve observations
and then reports the departure of the match count from what the apparatus expected,
in standard deviations: each reel is uniform over seven symbols, so three alike is
1/49 per observation, and the figure is (matched − np) / √(np(1−p)). The session
clock is the page's only honest score.

### Verification

`window.QA77` exposes the scene, camera, orbit state, reels, sprites, register and
interlock.
The spin is checked headlessly against it: over six consecutive observations every
reel's resting position was congruent to its stop modulo seven, the symbol reported
to the read-out matched the sprite the stop names, and the register's observation
count tracked. Zero failures, no console errors. Framing is checked the same way —
at 390 × 800 all eight bounding-box corners project inside the frame — and so is
touch: a pinch dollies, a drag orbits without pressing a key. The interlock is
checked end to end — the stamp refused before the key is turned, OBSERVE refused
mid-form, all eight transitions landing on the right step, the reset firing after
the observation, and the space bar walking a cold machine to the spin in exactly
nine presses. The dispenser too: six tokens all reaching rest inside the tray,
the cap holding at eighteen while the issue record keeps counting, surrender
emptying the tray without touching the record, and one full observation yielding
exactly one token. The classes are checked too: strict rotation over six
dispenses, an even split across the three, three distinct radii, and each class
resting on its own half-thickness.

The camera frames the machine rather than sitting at a fixed distance. It projects
the eight corners of the bounding box and takes the distance at which the last of
them fits, so a phone in portrait — where the horizontal field is a third of the
vertical one — gets a dolly back instead of a crop.

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
