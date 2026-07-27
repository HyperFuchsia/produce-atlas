# produce-atlas

An evidence-led interactive 3-D atlas tracing the scientific identity, origins, domestication,
historical movement, and global availability of food plants.

## Rachis — a 4.5-dimensional game

[`game/`](game/) holds **Rachis**, a puzzle game built on the atlas's subject matter: twelve
plates, each anchored to a real centre of crop domestication, in which you carry seeds back to
the places they came from.

Its 4.5 dimensions are three of space, one of time (rewind, and your past run keeps walking as
a body you can stand on), and a half — the wild ⇄ cultivated axis, which you can move along but
which has only two positions and no interior.

That last claim is proved rather than asserted: the test suite runs an exhaustive search of each
level's state space with the phase axis removed, and passes only when no solution exists. See
[`game/README.md`](game/README.md).

```
cd game
npm run check     # build, then verify every level is solvable and the half-dimension is load-bearing
npm run serve     # play at localhost:8123
```

No dependencies, at build time or runtime. The build inlines everything into a single HTML file.
