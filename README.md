# produce-atlas
An evidence-led interactive 3-D atlas tracing the scientific identity, origins, domestication, historical movement, and global availability of food plants.

## Jumping Jammers

A rhythm-based jumping game: a boy and his dog work a street-corner boombox, and "Beat Crate" cues roll in on the beat for you to tap/click/space to jump over exactly on time. Land inside the timing window to build combos and chase a high score as the tempo climbs from a chill 100 BPM to a frantic 170+.

It's a single self-contained `index.html` — HTML5 Canvas for rendering, the Web Audio API for the synthesized backing track and sound effects, no external assets or build step.

**Play it:** open `index.html` directly in a browser, or serve it locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

**Controls:** Space / ArrowUp / click / tap to jump (hold through the wide gaps). `P` or `Esc` to pause. `R` to retry after Game Over.
