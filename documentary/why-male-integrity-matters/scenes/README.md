# Scene rebuild — WORK IN PROGRESS, NOT WORKING

Partial output of the scene rebuild onto `../anim-core.js`. **Stopped mid-run at the
user's request. Do not integrate this into the film as-is.**

## State

| File | Scenes | Status |
|---|---|---|
| `cluster-1.js` | 1, 2, 3 | written, **renders black** |
| `cluster-2.js` | 4, 5, 6 | written, **renders black** |
| clusters 3-7 | 7-20 | never started |

Both files parse, contain no `Math.random`, and the bench reports `ok` with no thrown
errors — but every frame comes out solid black. Something is wrong that the
error path does not catch: an unbalanced `CAM.begin()` without `CAM.end()`, a fill
covering the frame, or a transform pushing the drawing off-canvas. **Diagnose this
first**; the scene content has never actually been seen.

## Bench

Renders one scene at one timecode and reports errors:

    node shot.mjs <sceneNumber> <localTime> <out.png> [noguides]

`bench.html` loads the film's real helper prelude, the real `SCENES` timing and caption
data, `anim-core.js`, then every `cluster-*.js`. Guides show the safe area and the
y=912 line below which nothing may be drawn.

## Next steps

1. Find why the frames are black.
2. Verify scenes 1-6 against the direction brief in the audit documents.
3. Rebuild clusters 3-7 (scenes 7-20).
4. Splice the finished scenes into `../stick-figure-cut.html`, replacing the old `S{}`
   block, and add `anim-core.js` inline.
5. Re-render the MP4 — capture is real time, so budget ~19 minutes.
