# VISUAL BIBLE
### *Why Male Integrity Matters* — animation department reference

Companion to `SCREENPLAY.md`. This document is binding on look-dev, layout, animation, lighting, FX, and comp.

---

## 1. THE ONE-SENTENCE LOOK

**A photographed world that happens to be built** — physically-lit, physically-shot, hand-textured, and never once flat.

If a shot could have been produced by a motion-graphics template, it is wrong. If a shot looks like it was operated by a person standing in the space, it is right.

---

## 2. THE FOUR REGISTERS

The film cycles between four visual languages. **No two adjacent scenes share a register.** This is the single hardest rule in the production.

| Register | Scenes | Definition | Never |
|---|---|---|---|
| **VOLUMETRIC REAL** | 01, 09, 13, 18 | Stylized-realistic 3D. Full atmospherics, physical sky, spectral water, god-rays. Nature-documentary photography. | Never fully photoreal — skin, foliage, and cloth keep a slight hand-painted read |
| **PAINTED** | 02, 11, 17, 19 | Gouache & ink-wash textures projected onto simplified 3D. Paper tooth visible at 200%. Textures boil at 12 fps; geometry and camera run at 24. | Never cel-shaded, never outlined, never "anime" |
| **DIAGRAMMATIC** | 04, 05, 08, 12 | Luminous constructed geometry in volumetric negative space. Everything is *simulated* and self-lit. | Never a chart on a white background. Never a flat vector icon |
| **TABLEAU** | 03, 14, 15, 16, 20 | Sculptural chiaroscuro. Near-still compositions, one moving element, brutal light falloff. | Never symmetrical for its own sake; never a "poster" |

**Hybrids:** 06 (volumetric anatomical), 07 (tilt-shift diorama), 10 (architectural cutaway). Each is specified in-scene.

---

## 3. PALETTE

Colour is an argument in this film, never decoration.

### EMBER — human presence, continuity, care
`#F2A65A` `#C7622F` `#7A2E12` · 2400–3200 K
Assigned to: lit windows, firelight, skin, tungsten, load-bearing members, the filament.

### SLATE — systems, measurement, cost
`#8FA3B0` `#3E4F5C` `#182028` · 6500–9000 K
Assigned to: pre-dawn sky, monitor glow, institutional fluorescents, data structures, steel.

### VERDIGRIS — living systems, water, breath
`#5E9E8C` `#2F6B5E`
**Withheld until Scene 09.** Its first appearance must feel like a colour the film had been keeping from you. Never used before 6:20.

### The arc
| Scenes | State |
|---|---|
| 01–08 | EMBER isolated, small, surrounded by SLATE |
| 09–13 | VERDIGRIS enters and spreads; the three families share the frame |
| 15–16 | SLATE achieves near-total dominance — the cost sequence |
| 17–20 | All three resolve into a single warm field |

**Saturation ceiling:** no pixel exceeds 65% saturation anywhere in the film except the inspection lamps in S15 and the white-hot members in S12. Those two exceptions are the point.

---

## 4. THE FILAMENT

One warm line, 1–3 px at 4K, present in **every scene**, never explained, never remarked on.

| Scene | Form |
|---|---|
| 01 | Highlight on a wet balcony rail |
| 02 | Welding arc → afterimage → lamp cord → blind slat → monitor trace → horizon |
| 03 | Underline beneath the title |
| 04 | Warm bounce along the I-beam's lower edge |
| 05 | The first connection drawn (Biological→Neurological), one shade warmer than the rest |
| 06 | A single axon followed from eye to cortex |
| 07 | The circadian ribbon above the diorama |
| 08 | The warm travelling light attached to the camera |
| 09 | The specular thread on water, unbroken from droplet to sea |
| 10 | The building's electrical service riser |
| 11 | The kintsugi repair seam |
| 12 | The load path |
| 13 | The buried lattice beneath 12,000 years |
| 14 | Rim light across both wrists |
| 15 | Literal tungsten filaments in the inspection lamps |
| 16 | The backlit horizon |
| 17 | A root in turned earth (first shot only) |
| 18 | Delta channel, lightning leader, taproot, sunbeam, thalweg, terminator |
| 19 | A tram cable catching morning sun |
| 20 | Itself — drawn, named, extinguished |

**Continuity rule:** the filament must be spatially continuous *across every cut*. An editor scrubbing the timeline should see one unbroken line travel the whole film. Layout is responsible for matching its screen position frame-to-frame at each boundary.

---

## 5. CAMERA

### Virtual camera package
- **Lenses:** 18 / 24 / 35 / 40 / 50 / 85 / 100 macro / 135. Anamorphic-derived: 2× horizontal squeeze characteristics, oval bokeh, horizontal blue streak on specular hits above 8 stops over key.
- **Sensor:** 2.39:1 extraction from a 3-perf-equivalent full-frame. Slight barrel distortion at 18–24mm, uncorrected.
- **Shutter:** 180° (1/48s). Real motion blur, never post-vector-blur on fast geometry.
- **Breathing:** enabled and visible on every focus pull.
- **Grain:** 35mm-derived, 2% opacity, applied in linear before the display transform, per-channel with red slightly coarser.

### Movement doctrine
- Every move is **motivated by a body**. Low-frequency drift (±0.4°, ~6 s period) on all handheld-flavoured shots. Never high-frequency shake.
- Eases are asymmetric: slow-in over ~18 frames, slow-out over ~30. Nothing in this film starts or stops instantly except the S12 simulation camera and the S15 hard cuts.
- **Two scenes are locked off** (S03, S17) and one is fully static (S20). After sixteen scenes of movement, stillness is the strongest available move — protect it.
- **S12 breaks the doctrine on purpose:** orthographic projection, rail-mounted snap-orbits, zero handheld. The camera is software. At 9:22 it blends to a 40mm perspective and one degree of handheld returns — the simulation becomes a place, right as it fails.

### Focus
Focus is a narrative tool, not a look. Every rack is a decision about what the audience is being asked to notice. In S04 the depth of field is so shallow (≈4 mm at plane) that the word must be *assembled* by the viewer.

---

## 6. LIGHTING

- **Physical units only.** Lux and Kelvin, no arbitrary intensity values. Every source has a real size — area lights, never point lights, except emissive practicals.
- **One idea per scene.** Each scene's lighting states a single proposition:

| Scene | The proposition the light makes |
|---|---|
| 01 | Warmth is inside people, distributed, and small |
| 05 | Light physically leaves the room when one node dims |
| 07 | The lighting *is* the timeline — one sun crossing 30 m in 45 s |
| 08 | One warm travelling light in an ocean of cold information |
| 10 | Five institutions compared by their light, simultaneously |
| 12 | The scene is lit by strain — member emission is driven by stress value |
| 13 | Fire → oil → gas → incandescent → sodium → LED: each visibly cheaper and more reliable |
| 15 | Everyone lit from above only, so every eye is in shadow — until one man turns |
| 16 | Light passes through the gate freely, and so could anyone |
| 19 | No atmospheric effect at all. An ordinary good morning. The plainness is the point |

- **Volumetrics** in every VOLUMETRIC REAL and DIAGRAMMATIC scene. God-ray sampling at ≥128 steps — visible banding is a reshoot.
- **Falloff discipline:** inverse-square, never faked. S14's light dies within 30 cm of the hands and the background is genuinely dark, not black-crushed in comp.

---

## 7. ANIMATION

### Hands are the lead actors
Cast, model, and animate hands first. In S02, S11, S14 and S17 they carry the entire performance. Hand animation is on **1s** everywhere in the film, even where bodies are on 2s.

### Micro-behaviour over expression
No character in this film "acts." Performance lives in:
- weight transfer and counterbalance
- two-stage motions (take the weight with the forearm, *then* move the hand)
- behaviour that is not directed at anyone (the researcher checking a number he didn't need to check)
- **peripheral behaviour** — S10's five office workers not-looking at an interview is the most important animation in the scene

### Fatigue as an animatable parameter (S07)
Establish a baseline posture, then degrade measurably across the scene:
| Parameter | Start | End |
|---|---|---|
| Shoulder height | baseline | −4 cm |
| Blink rate | 15 / min | 26 / min |
| Head-turn latency | baseline | +6 frames |
| Standing micro-sway | baseline | ×2.2 amplitude |

No single parameter will be consciously noticed. The sum will be felt entirely.

### Aging as animation, not modelling (S17)
Stride length shortens; the two-stage sit appears in decade four; the hand rests on the tree for balance from decade five. Cross-dissolves land on **matched poses** so the man ages inside a single gesture — reaching up to prune at 30 becomes reaching up to prune at 70, same arm, same angle, different body.

### Crowd casting (S19)
~60 distinct characters, each with a complete non-looping behaviour. Age 6–90. Visible disability present and framed as neither tragedy nor inspiration. Women and men in roughly equal number throughout. **No character composed as "the subject."** The camera favours nobody — that is the argument.

---

## 8. FX & SIMULATION

| Element | Requirement |
|---|---|
| **Particles** | In every volumetric scene. Always motivated by a light source. Density such that individual motes resolve at 100% zoom. Particles are the film's proof that air exists |
| **Fog** | S01's inversion layer has a hard density gradient with height — building tops emerge from a lake of vapour |
| **Water (S09)** | Genuine spectral absorption. Long wavelengths die with depth; that is *why* deep water is VERDIGRIS. Real caustics on the stream bed. Whitewater bursts at 240 fps |
| **Cloth** | Simulated, never keyframed. S01's bedsheets and S16's queue clothing carry the scenes' physicality |
| **Structural sim (S12)** | An actual FEA-style solve, or a solve faithful enough to survive an engineer's eye. Stress values drive member emission colour directly. The crack propagates grain-by-grain at 1/16 speed and **stops** three-quarters through |
| **Morphs (S18)** | Geometry morphs, not cross-dissolves. Camera motion must be the same *type* on both sides so the eye cannot find the seam |
| **Time-lapse (S17)** | 3-second cross-dissolve chains with geometry morphing beneath — growth is continuous, never stepped |

---

## 9. TYPOGRAPHY

- **One family.** A humanist serif with high stroke contrast (ref: Freight Text Pro, Lyon Text).
- 34 pt body, tracked +12, **lower-left**. Centred only in S03 and S20.
- Cross-dissolve in over 18 frames, hold, cross-dissolve out. **Type never animates by letter.** No kinetic typography, no counters, no wipes.
- In S03 and S20 the type is a **physical object**: 4 mm thickness, lit by a real grazing source, casting a contact shadow. It was placed there by someone.
- **One exception in the entire film:** the monospaced technical HUD in S12. Its foreignness is the meaning — that scene is the only one narrated by a machine.

---

## 10. COMP & DELIVERY

- ACES working space. Linear throughout; grain, glow, and lens artefacts applied before the display transform.
- Bloom is optical, derived from a measured lens flare profile — never a screen-blurred luminance pass.
- **No LUT-driven "cinematic" grade.** Colour separation is achieved in lighting, not in the grade. If the palette isn't reading before comp, relight.
- Delivery: HDR (PQ, 1000 nit) master with an SDR trim. Black in S20 is true 0 nit; the fade to black completes exactly at 15:00:00.
- Audio: 5.1 and stereo folds. Dialogue (narration) bus at −27 LUFS relative; programme loudness −24 LKFS. The S12 silence is genuine digital silence on all buses except the room-tone stem, which also mutes.

---

## 11. THINGS THAT WILL RUIN THIS FILM

1. Any shot that could have been made from a template.
2. Icons. There are no icons in this film. Every abstract idea is given a material, a light, and a physics.
3. Symmetrical hero compositions of men. The subject is ordinariness; monumentalising it inverts the thesis.
4. Red as an alarm colour in S08. There is no red in that scene.
5. Depicting suicide, self-harm, or workplace death representationally. S08's abstraction is a safeguarding decision.
6. A male choir. The film's subject makes that instrument unusable — S18's choir is explicitly mixed.
7. Slow-motion on anything human. The film uses slow motion exactly twice, both on non-human material (S04's grain boundary, S12's crack).
8. Letting S12's bridge collapse. It must not collapse. The film is about the condition immediately before failure, which is where most people actually live.
9. Explaining the filament.
10. Any frame that is trying to win an argument. The film's authority comes entirely from its restraint.
