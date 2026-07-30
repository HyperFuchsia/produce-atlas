# Why Money Isn't Real

A two-minute stick-figure explainer in 3-D, 1920×1080 at 30fps, drawn entirely in code.

`index.html` is the animation: a single self-contained page carrying a small software 3-D
engine — perspective camera, depth-sorted polygons, Lambert shading — that draws all 120
seconds to a 2-D canvas as a pure function of time. There is no WebGL and no 3-D library;
form is carried by real geometry and occlusion, and the hand-drawn look survives because
the renderer inks actual silhouette and crease edges rather than faking outlines.

`render/capture.mjs` steps that same function frame by frame in headless Chromium and pipes
the frames into ffmpeg, so the exported video is pixel-identical to what plays in the browser.

```
money-isnt-real/
├── index.html              the animation + a scrubbable player
├── dist/
│   └── money-isnt-real.mp4 the rendered video (H.264, 1080p30, silent)
├── script/
│   ├── narration.md        the script with timecodes, plus sources for every claim
│   └── captions.srt        subtitles (generated, matches the burnt-in captions)
└── render/
    ├── capture.mjs         frame capture → ffmpeg → mp4
    ├── shots.mjs           grab stills at given timestamps, for checking composition
    ├── bench.mjs           compare frame-capture methods
    └── engine-test.html    scratch harness for the 3-D core
```

## Watching it

Open `dist/money-isnt-real.mp4` in any player, or open `index.html` in a browser to
scrub through it — space bar plays and pauses, arrow keys jump five seconds, and the
slider seeks anywhere.

## Re-rendering

Needs `ffmpeg` and Playwright's Chromium.

```sh
node render/capture.mjs                       # → dist/money-isnt-real.mp4 + captions.srt
node render/capture.mjs --fps 60 --scale 2    # 4K60, much slower
node render/capture.mjs --from 53 --to 68 --out /tmp/scene.mp4   # one scene only
node render/shots.mjs 19 47 91                # stills at 0:19, 0:47, 1:31
```

Frames are read off the canvas with `toDataURL` rather than screenshotted (roughly 13×
faster), and the timeline is split across parallel workers whose segments are concatenated
without re-encoding. Tune with `--workers`, `--preset` and `--crf`; `render/bench.mjs`
compares the capture methods if you want to check the tradeoff on your own machine.

If Playwright is installed globally rather than in this folder, point Node at it:
`NODE_PATH=/path/to/global/node_modules node render/capture.mjs`.

## Audio

The video has no audio track. The narration is burnt in as captions and also lives in
`script/narration.md`, timed to the animation, if you want to record a voiceover:

```sh
ffmpeg -i dist/money-isnt-real.mp4 -i voiceover.wav \
       -c:v copy -c:a aac -shortest dist/money-isnt-real-vo.mp4
```

## How the 3-D works

Everything lives in `index.html`.

**The engine.** `beginScene(eye, target, fov)` sets a look-at camera; `draw(mesh, matrix,
opts)` transforms a mesh to world space, culls back faces, clips against the near plane and
pushes shaded triangles into a queue; `flush()` sorts that queue back-to-front and paints it.
Because triangles, edges, and text-on-surfaces all share one depth-sorted queue, a banknote
can occlude its own printing and a pillar can pass in front of a figure correctly.

**Ink, not outlines.** Every mesh precomputes its edge list with each edge's two adjacent
faces and a crease flag. At draw time an edge is stroked only if it is a silhouette (its two
faces disagree about facing the camera) or a hard crease. Those strokes get the same
hand-drawn wobble as the 2-D original, seeded from the edge's identity and an 8fps tick so
lines "boil" like paper animation instead of buzzing every frame. Fills stay deliberately
dark and low-contrast, which keeps the ink dominant and stops low-poly curves reading as
facets.

**Modelling.** `capsule`, `tubeMesh`, `sphereMesh`, `boxMesh`, `torusMesh` and `discMesh`
build primitives; `extrudeMesh` turns any 2-D profile into a solid via ear-clipping, which
is how the fish, shoe and loaf keep their drawn silhouettes. Limbs are true capsules built
per length so they have one clean outline rather than a chain of visible joints.

**Figures.** `figure3d({pos, yaw, armR, legL, …})` places a stick figure with feet at `pos`.
Limbs are posed with `[pitch, yaw]` pairs in degrees — pitch 0 is straight down, yaw 90
points along the figure's local +Z — and the call returns its hand and head positions in
world space so props can be attached to a pose. Faces are drawn as marks projected onto the
head sphere, so they turn with the head and vanish when it faces away.

**Text in the scene.** `quadText(origin, u, v, …)` maps a 2-D drawing onto a 3-D quad and
queues it at the right depth. That is how denominations print on banknotes, `BANK` sits on
the building, and the ledger's rows type themselves onto a floating panel.

**Timing.** `SCENES` is `[start, end, drawFunction]`; each scene function receives time
measured from its own start, so retiming means editing one number. `CAPTIONS` is
`[start, end, text]` and is the single source of truth for both the on-screen captions and
the generated `.srt`. `win(t, a, b)` is the fade envelope used everywhere, and `A(alpha, fn)`
draws at that alpha.

Nothing uses `Math.random`, which is what makes frame capture reproducible. Keep 2-D overlay
content between y=170 and y=890: the chapter label sits above that and the caption band below.

## Accuracy

Every factual claim on screen is listed in `script/narration.md` with its source. The
title is a hook; the video lands the accurate version of the claim — money has no
intrinsic physical value and isn't a natural object, but it is a real social institution
with real consequences, closer to the rules of a game than to a rock.
