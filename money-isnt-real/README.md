# Why Money Isn't Real

A two-minute stick-figure explainer, 1920×1080 at 30fps, drawn entirely in code.

`index.html` is the animation: a single self-contained page that draws all 120 seconds
to a canvas as a pure function of time. `render/capture.mjs` steps that same function
frame by frame in headless Chromium and pipes the frames into ffmpeg, so the exported
video is pixel-identical to what plays in the browser.

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
    └── bench.mjs           compare frame-capture methods
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

The full render takes about five minutes on four cores. Frames are read off the canvas
with `toDataURL` rather than screenshotted (roughly 13× faster), and the timeline is split
across parallel workers whose segments are concatenated without re-encoding. Tune with
`--workers`, `--preset` and `--crf`; `render/bench.mjs` compares the capture methods if you
want to check the tradeoff on your own machine.

If Playwright is installed globally rather than in this folder, point Node at it:
`NODE_PATH=/path/to/global/node_modules node render/capture.mjs`.

## Audio

The video has no audio track. The narration is burnt in as captions and also lives in
`script/narration.md`, timed to the animation, if you want to record a voiceover:

```sh
ffmpeg -i dist/money-isnt-real.mp4 -i voiceover.wav \
       -c:v copy -c:a aac -shortest dist/money-isnt-real-vo.mp4
```

## Editing the animation

Everything lives in `index.html`.

- **`CAPTIONS`** — `[start, end, text]`, the single source of truth for both the on-screen
  captions and the generated `.srt`. Change a line here and the subtitles follow.
- **`SCENES`** — `[start, end, drawFunction]`. Each scene function receives time measured
  from its own start, so scenes can be retimed by editing one number.
- **`figure({...})`** — the stick figure. Feet sit at `(x, y)`; limbs are posed with
  `[shoulderAngle, elbowAngle]` in degrees, where 90 is straight down. It returns the page
  coordinates of both hands so props can be attached to a pose (that's how the banknote
  stays in someone's hand while the arm moves).
- **`win(t, a, b)`** — the fade envelope used everywhere: 0 before `a`, 1 between, 0 after
  `b`, with soft edges. Wrap anything in `A(alpha, () => …)` to draw it at that alpha.
- **Rough drawing** — `rline`, `rrect`, `rcircle` add a hand-drawn wobble seeded from a
  hash of the coordinates and the current 1/8-second tick, so lines "boil" like paper
  animation instead of buzzing every frame. Nothing uses `Math.random`, which is what
  makes frame capture reproducible.

Keep drawings between y=170 and y=890: the chapter label sits above that and the caption
band below it.

## Accuracy

Every factual claim on screen is listed in `script/narration.md` with its source. The
title is a hook; the video lands the accurate version of the claim — money has no
intrinsic physical value and isn't a natural object, but it is a real social institution
with real consequences, closer to the rules of a game than to a rock.
