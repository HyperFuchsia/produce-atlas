# AI Liability Containment Firm — Working Business Plan

> **Note on repo location:** this directory is unrelated to `produce-atlas`
> (a 3-D food plant atlas). It was created here because this session's working
> branch pointed at this repository. It should probably move to its own repo.

Working thesis, in one line:

> AI is an industrial tool, not a wild animal. We install the hard-coded
> governor that contains the liability — so you can run it at full capacity
> instead of paying a permanent tax on manufactured fear.

---

## Documents

| File | Contents |
|---|---|
| [`00-DECISIONS.md`](00-DECISIONS.md) | Eleven open questions, each forced to a recommendation. Start here. |
| [`01-CORRECTIONS.md`](01-CORRECTIONS.md) | What failed scrutiny in the source doctrine, and why. All items now applied — retained as the reasoning record. |
| [`02-BUILD-SEQUENCE.md`](02-BUILD-SEQUENCE.md) | Month 0–18 operating plan, sequenced against real constraints. |
| [`03-PRODUCT-SPEC.md`](03-PRODUCT-SPEC.md) | The Digital Governor, v0. Buildable specification. |
| [`04-DOCTRINE.md`](04-DOCTRINE.md) | **Canonical.** Four pillars, controlled glossary, and the argument register — every claim with its evidentiary strength and its strongest counter. Source of truth for all external writing. |
| [`standard/`](standard/) | UAS-1:v0.1 — the standard, registry schema, conformance scorer, worked examples. |
| [`kit/`](kit/) | **Delivery kit.** Everything to run one paid engagement: field guide, engagement scope, findings letter, certificate. |
| [`checklist.html`](checklist.html) | Free 4-minute self-assessment. The funnel — runs entirely client-side. |
| [`plan.html`](plan.html) | Visual business layout. **Internal** — shows a prospect you have no customers. |
| [`tools/doctrine_lint.py`](tools/doctrine_lint.py) | Enforces the §5 language rules mechanically. Run before publishing anything. |

```bash
python3 business-plan/tools/doctrine_lint.py     # 0 clean · 1 violations · 2 nothing scanned
```

The linter exists because C-1 observes that the pull toward "100%" resurfaces
in every draft — it is what a nervous buyer wants to hear. A written rule
against overclaiming is an administrative control. This is the engineering one.
It understands negation, so the sentence that *forbids* the claim doesn't trip
it, and it scopes negation per sentence so one can't launder the next.

---

## The five decisions that matter most

1. **Target warehouse and industrial automation, not Fortune 500 AI governance.**
   The doctrine is a safety engineering doctrine. Sell it where safety
   engineering is already the native language and where "biological integrity"
   means a hand in a machine rather than a metaphor.

2. **Publish the standard free, before selling anything.** You cannot buy
   authority. OWASP is the model, not UL — UL had insurers from day one and you
   don't, yet.

3. **Insurers are the channel, not a customer segment.** Once one carrier
   credits certification, clients arrive via their broker and the authority
   problem solves itself. Hartford Steam Boiler, 1866: inspect and underwrite.

4. **Cut every "100%" claim.** They are uninsurable, they are express
   warranties against you, and they are the same overclaiming the doctrine
   exists to attack. Bounded and rated is stronger *and* sellable.

5. **The signature on the certificate must belong to someone licensed.** A
   certification body's entire product is the credibility of a signature.

---

## The strongest assets in the source material

Ranked by how much commercial work they do:

1. **The Hierarchy of Controls argument.** Alignment training, ethics boards,
   and acceptable use policies are *administrative controls* — tier four of
   five in a ranking every safety professional already accepts as settled. The
   governor is an *engineering control*, tier three. This is not rhetoric; it
   is an existing professional standard that independently rates the entire
   incumbent approach as weak. Strongest argument available, by a distance.

2. **Design defect and the reasonable alternative design.** A product is
   defectively designed if a reasonable alternative design existed that would
   have reduced foreseeable harm at acceptable cost. The governor *is* that
   alternative design. Once it exists and is affordable, omitting it becomes
   indefensible — no new regulation required. Seatbelts, airbags, machine
   guards, GFCI outlets all followed this exact path.

3. **"It is not an AI takeover — it is engineering malpractice."** Reclassifies
   AI failure into a category that law and insurance already know how to price.

4. **"We don't put brakes on a car so you can drive slow. We put brakes on a
   car so you can drive fast."** Flips the sale from cost centre to profit
   centre, which changes who signs and what they'll pay.

5. **The actuator inventory.** Converts unbounded institutional dread into a
   finite, countable register. A finite register is the only thing anyone will
   underwrite.

6. **Manufactured Inevitability.** Names a real pattern that currently has no
   name.

7. **The kill switch already exists — it's pointed at the invoice.** Every
   vendor can cut off any customer instantly for non-payment. The mechanism the
   industry calls impossible is deployed and operating daily, aimed at revenue.

---

## Precedent stack

Nothing here is novel, and that is the pitch. Every one of these says the same
thing: rated limits, mechanically enforced, named responsible party,
documented.

| Domain | Instrument | What it contributes |
|---|---|---|
| Steam boilers | ASME BPVC, Hartford Steam Boiler (1866) | The business model itself: inspect + underwrite |
| Cranes | Load charts, operator certification | Rated capacity; the named liable operator |
| Nuclear | SCRAM, defence in depth, Price-Anderson | Passive fail-safe; liability architecture as market enabler |
| Aviation | DO-178C, pre-flight checklists | Design assurance levels; cheap high-compliance controls |
| Process industry | IEC 61508 SIL | Rated residual risk — including the safety system's own |
| Machine safety | OSHA 1910.212, ISO 10218 | Guards beat warnings, as enforcement law |
| Occupational safety | Hierarchy of controls | Engineering controls formally outrank administrative ones |
| Civil / flood | Design load, safety factor | Publish a rating, not a prophecy |
| AI | NIST AI RMF, ISO/IEC 42001 | Define the *what*, supply no *how* — that gap is the business |

---

## Status

First pass. Open items that still need work:

- Entity structure and jurisdiction
- Detailed financial model
- The standard document itself (Phase 0.2 — the actual next deliverable)
- Competitive landscape mapped in detail
- Named prospect list for the beachhead
