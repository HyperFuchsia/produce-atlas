# Methodology & Evidence Governance

Produce Atlas follows one governing principle, borrowed from its own audit:
**evidence before spectacle.** Structural completeness (every record having a
full set of fields) is deliberately kept separate from research depth (a record
being individually authored and its claims independently sourced and reviewed).
This document describes how that separation is modeled and surfaced.

## Research maturity tiers

Every record carries a `maturity` label, shown as a badge in the list and the
detail panel and summarized in the in-app **Methodology & evidence** panel.

| Tier | Meaning | This edition |
|------|---------|--------------|
| **Flagship** | Carries a formal packet of individually source-linked claims. Expert review still pending. | 5 |
| **Authored** | Bespoke atlas record with a full origin/domestication/spread dossier and a plotted globe origin. | 46 |
| **Baseline** | A real edible species included for breadth: identity + family + specimen signature, but **not yet individually researched**. No origin is claimed, so it is not plotted on the globe. | ~200 |

A flagship record is **not** "more true" than an authored one — it is more
*traceable*. The tier communicates how far a record has been through the
evidence pipeline, nothing more.

### The two tiers, and why the globe stays honest

The **atlas** (flagship + authored) carries real, individually researched
origins and is plotted on the globe with dispersal arcs. The **baseline index**
is a searchable list of real edible species with identity, family, and a
generated specimen signature — but **no origin is asserted**, so those records
never appear on the globe and never fabricate a domestication story. This keeps
scale (breadth of species) strictly separate from research (depth), which is the
central discipline the project's audit demands. The index scales toward the full
Kew *World Checklist of Useful Plants* (~7,039 species) via
`scripts/import-species.mjs`; new rows always enter as **baseline**, never as
authored fact.

## Claim packets

The five flagship crops — **Apple, Banana, Potato, Tomato, Black Pepper** —
each carry four source-linked claims (identity, domestication, spread,
availability), for **20 claims total**. Each claim records:

- a plain-language statement,
- one or more `sourceIds` into the shared source registry (`src/data/sources.ts`),
- a `confidence` level (`high` / `medium` / `contested`), and
- a `review` status.

**All 20 claims currently ship as `review: "pending"`; there are 0 expert
approvals.** This is intentional and is stated in the UI, in the data, and here.
The number is asserted in an automated test so documentation cannot silently
drift away from the data.

## What the map does and does not claim

- **Origin markers are representative points** for a center of origin, not exact
  discovery sites. Every record sets `coordinatePrecision: "representative"`.
- **Spread arcs are historical corridors**, not reconstructions of every route
  or shipment.
- **Dates are approximate** years before present (BP), and for several crops are
  actively debated.
- **Edibility and safety notes are general reference only** — never food-safety
  or medical advice. Where a crop has a genuine caution (e.g. solanine in green
  potato, raw-bean lectins), it is stated on the record.

## Sources

Citations live in a single shared registry and are real, standard references in
archaeobotany, plant genetics, and food history (e.g. Zohary, Hopf & Weiss 2012;
Purugganan & Fuller 2009; Spooner et al. 2005; Perrier et al. 2011; POWO;
FAOSTAT). Per-page locators and formal expert review are outstanding work, not
claimed as done.

## Relationship to the audit

This layer implements the top-priority (P0–P2) recommendations of the
*Comprehensive Implementation Audit*: expose maturity everywhere, convert prose
into source-linked claims for the flagship crops, disclose representative
coordinates and corridors, add record-specific safety notes, and enforce these
invariants with automated tests and CI. It deliberately does **not** inflate the
record count — the audit's explicit warning is that visual completeness must not
outrun evidence.
