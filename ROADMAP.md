# DEEP SURVEY — ROADMAP

**This file is the queue, and it is yours.** A build cycle takes the topmost
unchecked item whose `blocked-by` is satisfied and builds that one thing. It
does not add to this list, reorder it, or skip ahead — if it thinks something
is missing it says so in the pull request and leaves the file alone.

Every cycle is judged against `FIDELITY.md` by a panel that can discard the
branch. Read that file before proposing anything.

### Format

```
- [ ] <id> · <what to build> · blocked-by: <ids, or empty>
```

A cycle ticks its own box in its own pull request, so the box is only truly
ticked once you have merged it.

---

## QUEUE

### A — the console is not yet honest at every size

- [x] A1 · Star names truncate in the readout tiles — POSITION reads "PROXIMA CI". Fit, abbreviate or ticker them at every width. · blocked-by:
- [ ] A2 · The comms panel in landscape gives the face a 134px canvas. A creature is unreadable at that size; rebalance the grid so landscape gets a usable portrait. · blocked-by:
- [ ] A3 · The operations log is hidden below 820px, so a phone player never learns why anything happened to them. Give it somewhere to live in portrait. · blocked-by:
- [ ] A4 · Long star names overflow the chart labels at small field sizes; the collision system drops them instead of shortening them. · blocked-by:

### B — the field is too quiet to be frightening

- [ ] B1 · The pursuer has no sound of its own. It must be audible before it is visible; the bed already cuts out when it is close, so the sound has to occupy that silence rather than fill it. · blocked-by:
- [ ] B2 · Hazard density is measurably too sparse: 20 capsules put a hazard in only ~10.6% of real legs. A design review measured 39 capsules at ~21% contact, 11.9% grazing inside 0.35 ly, 0.23% instantly fatal. Retune, re-measure, and report the distribution. · blocked-by:
- [ ] B3 · In-corridor events: a hazard met mid-jump should be survivable by reacting, not only by having plotted around it. One key, one decision, no new render pass. · blocked-by: B2
- [ ] B4 · Hazards never change. A stream should be able to be crossed safely once and lethally later, and the survey should be able to go stale. · blocked-by: B2
- [ ] B5 · The pursuer is one object with one behaviour. Give it states — searching, closing, holding station — that the operator can read off the scope and plan against. · blocked-by: B1

### C — the languages are four costumes on one grammar

- [ ] C1 · Give each culture's script a different STRUCTURE, not just different glyphs: one syllabic, one with word-final markers, one positional, one with no redundancy at all. Keep it word-local so transcription stays deterministic and the existing decoder still works. · blocked-by:
- [ ] C2 · Comprehension is one number per culture. Split it: content words, grammar, and numerals decode on different curves, so partial comprehension is qualitatively different rather than just less. · blocked-by: C1
- [ ] C3 · The dialogue trees are four nodes deep and say the same things every run. Give each culture material that only opens at high comprehension and high standing — the things they will only say to someone who can actually hear them. · blocked-by: C2
- [ ] C4 · Standing is invisible until you read the header. Make a culture's disposition legible in how it transmits: signal discipline, how much it repeats, whether it waits for you. · blocked-by:
- [ ] C5 · The pursuer should be hailable exactly once. No language, no tree, one entry, and it should be worse than silence. · blocked-by: B1, B5

### D — the run has no memory and no shape

- [ ] D1 · An end-of-run archive. A second run starts knowing what the first learned about the field and the approach floors, but never starts with the reductions. Persistence buys speed, never power. · blocked-by:
- [ ] D2 · The standing order is the same every run. Generate it from the catalogue: which cultures, which systems, what the company wants this time — in the register of Form 22-B. · blocked-by: D1
- [ ] D3 · There is one ending. Add the others the fiction already implies: filed and returned, returned having understood nothing, and never filed at all. · blocked-by: D2
- [ ] D4 · Derelicts are a resource with a label. Make them somebody's last run — a recoverable log in their own hand, decodable at the comprehension you have. · blocked-by: C1

### E — the vessel is a number, not a machine

- [ ] E1 · Hull is a single scalar. Split it into the subsystems the console already displays — array, processor, drive, life support — so damage is legible as which instrument stopped telling the truth. · blocked-by:
- [ ] E2 · Repair is instant and free at a rock. Make it a procedure with a cost, in the register of the approach panel. · blocked-by: E1
- [ ] E3 · Power is unmodelled. The tube, the array and the drive all draw from something; give the operator the routing decision. · blocked-by: E1
- [ ] E4 · The boot self-test reports subsystems that do not exist yet. Once E1 lands, make the self-test tell the truth about them. · blocked-by: E1

### H — found while building the conn, not yet fixed

- [ ] H1 · Hazards live in the light-year frame and so do not exist inside a system. The conn crosses 6 AU of real space with nothing in it but worlds; debris, dust and wrecks belong in there too, at AU scale, and the survey should have to find them. · blocked-by: B2
- [ ] H2 · A raider is drawn in the conn at its true bearing but its range is quoted in light years, because that is the frame it closes in. Inside a system that reads as a unit mismatch. Decide whether hostiles get in-system positions or whether the readout should say so plainly. · blocked-by:
- [ ] H3 · There is no reason to fly manually. The governed approach is strictly better than hand-flying, so the manual controls are a trap with no upside. Give hand-flying something it can do that ALIGN cannot — a hazard to thread, a body ALIGN will not take you to, a reason to point somewhere other than at the target. · blocked-by: H1
- [ ] H4 · Air is the only cost of flight. A drive that never breaks and never runs out of anything makes a fifty-second crossing free in every way that matters except the clock. · blocked-by: E3

### G — found while building the hostiles, not yet fixed

- [ ] G1 · An open contest panel suppresses both the ENGAGE hail and any hostile hail, so a contest the operator walks away from silently changes what the primary control does. Measured: ENGAGE routed away from a culture it should have hailed, and a raider sat at 0.0 ly unable to open a channel. · blocked-by:
- [ ] G2 · Refusing two wreckers back to back cost 100% → 29% hull in two arrivals (10-26% from boarding plus 12-22% of plating). Survivable, and intended to hurt, but it has never been measured against a distribution — establish the curve and decide if it is the one we want. · blocked-by:
- [ ] G3 · Raider dialogue is one line per outcome per kind: four kinds × four lines. It does not know what you are carrying, whether you have met this kind before, or that you paid last time. Make what they say a function of the manifest they can see. · blocked-by:

### F — it has to survive being played

- [ ] F1 · The file is 284 kB and growing with every cycle. Establish a size and frame budget, measure it, and report the delta in every pull request from then on. · blocked-by:
- [ ] F2 · No reduced-motion path. The CRT composite, the sparkle and the roll are the whole aesthetic; find the version of them that is safe for someone who cannot take it. · blocked-by:
- [ ] F3 · Colour carries meaning and there is no colourblind-safe reading of it. Semantics must survive without hue. · blocked-by:
- [ ] F4 · Audio is on or off. It needs a level, and the level needs to be an instrument like everything else. · blocked-by:
- [ ] F5 · There is no automated regression suite. Every cycle re-writes the same Playwright harness and deletes it. Build the harness once, keep it, and have every cycle run it. · blocked-by:

## DONE

- [x] Real stellar neighbourhood replacing the single planet
- [x] Three-dimensional alien busts with per-race anatomy
- [x] Four alien voices and a formant synthesiser reading the translation
- [x] Plotted jumps, hazard corridors, language ladder, the pursuer
- [x] Near-field system view, planetary approach, courtesy and reductions
- [x] Appendages, silhouettes, mesh occlusion over features
- [x] Everything on the plate reports state
- [x] ENGAGE: one-key travel and a computer that always gets you there
- [x] Cultural contests — tally, hold, precedence, continuation
- [x] Hostiles: four kinds, on the scope, with their own dialogue and demands
- [x] The conn: first-person flight in a system, and planets reached by flying

---

## HOUSE RULES FOR A BUILD CYCLE

Not suggestions. A cycle that breaks one has failed even if the feature works.

1. **One item per cycle.** Take the top unblocked line. Do not batch.
2. **Never push to `main`, never merge.** Branch off the current head of
   `claude/80s-scifi-interface-vywhr3`, open a pull request. The merge is not
   yours to do.
3. **`FIDELITY.md` outranks this file.** An item that cannot be built without
   violating the charter is not built; say so in the pull request.
4. **Measure, do not assert.** Every claim comes from a number produced this
   cycle. "Should be faster" is not a result; "60 → 47 fps at 1280×900" is.
5. **Verify at 390×844, 844×390 and 1280×900** with Playwright, headless
   Chromium at `/opt/pw-browsers/chromium`: page errors, console errors,
   horizontal overflow, frame rate.
6. **Leave a clean tree.** Delete every temporary script. A stop hook enforces
   it.
7. **`node orbital/build.mjs`** before finishing; zero document-shell tags.
8. **Say what you did not do.** Ship the part that works and state the rest.

---

## GATE RECORD

Cycles that were stopped, and why. Kept here rather than in a log nobody
reads, because the point of a gate is that its refusals are visible.

- **A1, first attempt — stopped before Verify.** A design agent edited
  `orbital/index.html` in the operator's working tree and left six temporary
  scripts and four screenshots behind. Design is advisory; the change had not
  been weighed against the other two designs, had not been verified, and had
  not been near the fidelity panel. Reverted. The workflow was the fault, not
  the agent: only the Build phase now has write authority, Build asserts it is
  not in the operator's tree before it starts, and the cycle refuses to ship if
  that assertion turns out to be wrong.
