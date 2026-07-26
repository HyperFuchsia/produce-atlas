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

- [ ] A1 · Star names truncate in the readout tiles — POSITION reads "PROXIMA CI". Fit, abbreviate or ticker them at every width. · blocked-by:
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
