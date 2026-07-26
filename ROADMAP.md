# DEEP SURVEY — ROADMAP

**This file is the queue, and it is yours.** A build cycle takes the topmost
item in `## QUEUE` whose `blocked-by` is empty and builds that one thing. It
does not add to this list, reorder it, or skip ahead — if it thinks something
is missing it says so in the pull request and leaves the file alone.

To change what gets built next, move a line. To stop something being built,
delete it or give it a `blocked-by`.

### Format

```
- [ ] <id> · <one line of what to build> · blocked-by: <id or empty>
```

`- [x]` marks it done. A cycle checks the box in its own PR, so the box is
only ticked once you have merged it.

---

## QUEUE

- [ ] R1 · Star names truncate in the readout tiles — POSITION shows "PROXIMA CI". Fit or abbreviate them properly at every width. · blocked-by:
- [ ] R2 · The comms panel in landscape gives the face a 134px canvas, which is too small to read a creature in. Rebalance that grid. · blocked-by:
- [ ] R3 · The operations log is hidden on phones, so a phone player never learns why anything happened to them. Give it somewhere to live. · blocked-by:
- [ ] R4 · The pursuer has no sound of its own. It should be audible before it is visible, and the bed already cuts out when it is close. · blocked-by:
- [ ] R5 · Give each culture's script a different *structure*, not just different glyphs — one syllabic, one with word-final markers, one positional. Keep it word-local so transcription stays deterministic. · blocked-by:
- [ ] R6 · Hazard field is measurably too sparse: 20 capsules put a hazard in only ~10.6% of real legs. A design review measured 39 capsules at ~21% contact with 0.23% instantly fatal. Retune and re-measure. · blocked-by:
- [ ] R7 · In-corridor events: a hazard met mid-jump should be survivable by reacting, not only by having plotted around it. One key, one decision, no new render pass. · blocked-by: R6
- [ ] R8 · An end-of-run archive: a second run should start knowing what the first one learned about the field and the floors, without starting with the reductions. Persistence buys speed, never power. · blocked-by:
- [ ] R9 · The pursuer should be hailable once. It has no language and no dialogue tree — one entry, and it should be worse than silence. · blocked-by: R4
- [ ] R10 · Audio has no level control, only on/off. · blocked-by:

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

These are not suggestions. A cycle that breaks one of them has failed even if
the feature works.

1. **One item per cycle.** Take the top unblocked line. Do not batch.
2. **Never push to `main`, never merge.** Work on a fresh branch off the
   current head of `claude/80s-scifi-interface-vywhr3` and open a pull
   request. The merge is not yours to do.
3. **Measure, do not assert.** Every claim in the PR body must come from a
   number you produced this cycle. "Should be faster" is not a result;
   "60 → 47 fps at 1280×900" is.
4. **Verify at 390×844, 844×390 and 1280×900** with Playwright, headless
   Chromium at `/opt/pw-browsers/chromium`. Check console errors, horizontal
   overflow and frame rate. Delete every temporary script before finishing —
   a stop hook enforces a clean tree.
5. **`node orbital/build.mjs` before finishing**, and confirm the fragment has
   zero document-shell tags.
6. **The aesthetic is not negotiable.** Absolute black, stroke-only, no fills,
   no border radius, no drop shadows, elevation as brightness, monospaced
   uppercase labels. Everything on screen reports state; nothing decorates.
   All sound synthesised, no samples, no external assets, one file.
7. **Say what you did not do.** If the item was larger than one cycle, ship
   the part that works and state plainly what is left.
