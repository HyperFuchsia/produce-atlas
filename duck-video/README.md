# Trucker Duck

A 9-second animated short: a duck sprints down a highway, spins into a flash of
light, and comes out the other side as a trucker duck who leans out of his rig
and says **"I'll talk you later"** before pulling away.

![still](out/poster.png)

Output: `out/trucker-duck.mp4` — 1280x720, 30 fps, H.264 + AAC.

## How it is made

This is *not* a diffusion/text-to-video model. Every frame is drawn
procedurally with Pillow and every sound is synthesised with numpy — so the
short is fully deterministic and reproducible from source.

- **`make_duck_video.py`** — the animation. Vector shapes are drawn into a
  1280x720 logical coordinate space at 2x supersampling and downsampled with
  Lanczos for anti-aliasing. The duck is a rigged puppet: the legs are posed by
  a two-bone IK solver driven by a stride-cycle foot path, and the body, head,
  wings and tail hang off a leaning torso transform. Parallax backgrounds are
  pre-rendered as seamlessly tiling strips and scrolled per layer.
- **`duck_audio.py`** — the soundtrack. Footsteps, wind, the transformation
  whoosh, a chugging diesel idle and a two-tone air horn are built from
  filtered noise and oscillators. The closing line is spoken by a formant
  synthesiser: a glottal pulse train with a pitch contour, shaped by
  three two-pole resonators per syllable tracking the vowel targets of
  "I'll / talk / you / la / ter", with a ring-modulated rasp for the duck
  timbre.

## Beat sheet

| time | beat |
|------|------|
| 0.00–3.60s | flat-out sprint, dust, speed lines, rushing parallax |
| 3.60–4.35s | wind-up and spin into a blur, energy ring, gears, sparks |
| 4.35–4.75s | white blast |
| 4.75–5.55s | trucker duck lands; the rig rolls in under him |
| 5.55–8.00s | he waves out the window and delivers the line |
| 8.00–9.00s | air horn, and the rig accelerates away |

## Running it

```bash
pip install pillow numpy imageio-ffmpeg
python3 make_duck_video.py                    # -> out/trucker-duck.mp4
python3 make_duck_video.py stills 90 120 205  # dump single frames to inspect
```

`imageio-ffmpeg` supplies a bundled ffmpeg binary; a system `ffmpeg` on `PATH`
works too. Text uses Outfit Bold if present and falls back to DejaVu Sans Bold,
so no font files are vendored here.

Timing, staging and palette all live in named constants at the top of
`make_duck_video.py` — change `T_*` to re-cut the beats, or `LINE` to change
what he says.
