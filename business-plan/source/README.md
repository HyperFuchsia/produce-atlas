# Source

## [`THE-CASE.md`](THE-CASE.md)

The founding argument as it was originally supplied, compiled into one
continuous document. Around a third of the source was verbatim repetition —
three documents recirculated several times — and that is removed. Nothing
substantive is dropped.

**This is not the same document as [`../04-DOCTRINE.md`](../04-DOCTRINE.md),
and the difference matters.**

| | `source/THE-CASE.md` | `04-DOCTRINE.md` |
|---|---|---|
| What it is | The argument, in its own voice | The operating rules for making it |
| Written for | Reading — an advisor, a partner, a prospective engineer | Working — checked before anything is published |
| Contains | The case, start to finish | Glossary, argument register, strength ratings, counters |
| Use it to | Explain the thesis to someone new | Decide whether a specific claim can be made in public |

Read `THE-CASE.md` to understand what the business is. Consult `04-DOCTRINE.md`
before writing anything external.

## [`CRITIQUE.md`](CRITIQUE.md)

The adversarial review that produced v2. Fifteen findings, each naming the
failure, how a hostile reader defeats it, and the fix applied.

Read it when tempted to restore a stronger-sounding version of a claim. Nearly
every finding was the same failure: **an argument that was strong enough,
pushed one step further than the evidence supported.** The capital-allocation
point was true and became a dilemma. The precedent stack was persuasive and
became "every time." The kill-switch line was sharp and became a proof.

Three findings were self-undermining — the document broke rules it set for
itself, which is the most expensive kind of error, because an opponent who
spots one gets to question everything else for free.

The findings are also propagated into [`../04-DOCTRINE.md`](../04-DOCTRINE.md),
so the argument register and the reading document cannot drift apart.

## Three editorial decisions

Recorded here so they are not mistaken for omissions, and so a future reader
does not helpfully restore them:

1. **Statements attributed to named individuals were removed.** None could be
   traced to a primary transcript. The argument does not depend on any of them,
   and the pattern they illustrated is argued directly from incentives and
   effects — which is both safer and harder to rebut.
2. **Absolute claims were bounded.** The source asserted completeness where no
   engineering discipline claims it. See correction C-1.
3. **A personal legal matter in the source is excluded entirely.** Named third
   parties, no bearing on the business.

The compiled document passes `tools/doctrine_lint.py`.
