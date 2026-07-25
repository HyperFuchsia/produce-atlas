# produce-atlas
An evidence-led interactive 3-D atlas tracing the scientific identity, origins, domestication, historical movement, and global availability of food plants.

## The Fruit Machine (`index.html`)

A three-reel fruit machine with no gambling in it: nothing is staked, nothing is
paid, and there is no currency, credit or wager anywhere in the app. Instead it
measures your luck against what probability predicts.

- **Seven species** on each reel — sweet cherry, lemon, olive, common fig, grape,
  pomegranate and vanilla — at weights 6/5/5/4/3/2/1.
- **Exact probabilities**, enumerated from those weights when the page loads and
  printed in the key. Two alike or better lands 45.0% of spins; three alike, 1 in 31.
- **Luck index** — hits are binomial, so your count is scored as
  `(hits − expected) ÷ standard deviation`. Zero is average luck, +2σ is the top
  few percent. It needs eight spins before it reports anything.
- **Drift chart** tracking cumulative hits above or below expectation.

Single self-contained file, no build step and no dependencies — open `index.html`
in a browser. Session statistics persist in `localStorage`; light and dark themes,
reduced-motion and keyboard (space to spin) are all supported.
