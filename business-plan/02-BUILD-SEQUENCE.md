# Build Sequence — First 18 Months

Constraints this plan is built around, stated plainly:

- Limited capital; resources are committed to family first
- Limited time; this starts as nights-and-weekends work
- No engineering, legal, or enterprise credentials yet
- No network into Fortune 500 risk functions
- The strongest assets are the doctrine itself, an unusually clear thesis, and
  direct lived experience of algorithmic harm

A plan that opens with "sell $300k audits to Fortune 500 CROs" fails against
those constraints on week one. This one is sequenced so that each phase is
funded by the phase before it and nothing requires capital you don't have.

**The strategic logic:** you cannot buy authority, so you publish your way into
it. The standard comes first, free. Everything else is downstream of being the
person who wrote the document other people cite.

---

## Phase 0 — Fix and Publish (Weeks 1–8)

**Goal:** exist as a citable authority. Spend zero dollars.

### 0.1 Correct the doctrine
Work through `01-CORRECTIONS.md` against the master blueprint. Non-negotiable
before anything is public — the overclaims are the items an expert uses to
dismiss you, and they are cheap to remove now and expensive to retract later.

### 0.2 Write **The Ungoverned Automation Standard v0.1**

Free. Public. Versioned. Citable. This is the single highest-leverage artifact
available to you and it costs only writing time.

Target 30–45 pages. Contents:

1. **Scope and definitions** — the controlled glossary, one canonical version
2. **The actuator inventory method** — how to enumerate every point where an
   automated system can act on the physical, financial, or legal world
3. **Control classification** — scoring each actuator's controls against the
   hierarchy of controls (engineering vs. administrative). This is your
   objective, defensible, benchmarkable metric.
4. **Trip tier specification** — alarm / trip / lockout, with response-time
   requirements
5. **Authorisation requirements** — cryptographic signing and the two-person
   rule for high-consequence actions
6. **Log and evidence requirements** — hash-chained, append-only, what must be
   captured per action
7. **Conformance levels** — Level 1 / 2 / 3, with explicit criteria
8. **Mapping annex** — clause-by-clause mapping to NIST AI RMF, ISO/IEC 42001,
   IEC 61508, ISO 10218 / ISO/TS 15066, IEC 62443, OSHA 1910.212

That annex is doing quiet, heavy work. It says: *this is not a new religion,
it is the existing safety canon applied to a new actuator class.* It is also
what lets a compliance officer justify the purchase internally.

### 0.3 Publish
Static site plus a public repository. Open licence (CC BY is fine). A
changelog. A version number. It should look like infrastructure, not marketing.

### 0.4 Ship the free self-assessment
A checklist — the pre-flight-checklist product. Ten to fifteen questions that
produce a crude control-hierarchy score. Free, no signup wall beyond an email.

Aviation checklists work because they are short and mandatory. Yours works
because it tells a plant manager, in four minutes, that eleven of their
fourteen AI-adjacent actuators are governed by nothing but a policy document.

That result is the sales call. You don't have to make the argument; their own
answers make it.

**Phase 0 exit criteria:** standard published, checklist live, corrections
applied. Cost: time only.

---

## Phase 1 — Authority and Evidence (Months 2–6)

**Goal:** three completed assessments and a citable reputation. Near-zero spend.

### 1.1 Publish relentlessly

The doctrine is genuinely good writing and it is differentiated. Nobody else in
AI governance is making the hierarchy-of-controls argument, and it is
devastating precisely because it is not an opinion — it is an existing
professional standard that already ranks the entire incumbent approach at tier
four.

Lead with the arguments that don't require anyone to accept your authority:

- *"Your AI safety programme is an administrative control"* — the hierarchy of
  controls piece. This is the flagship. Write it first.
- *"The kill switch already exists — it's pointed at your invoice"* — every
  vendor can cut off any customer instantly for non-payment. The mechanism the
  industry says is impossible is deployed and operating daily, aimed at
  revenue.
- *"Nobody spends $100bn on something they can't control"* — capital allocation
  as revealed preference.
- *"Machine guarding law already answers this"* — OSHA explicitly rejects
  training and warnings as a substitute for physical guards when a guard is
  feasible. The argument you're making was settled decades ago in another
  domain.
- *"11,000 deliveries, no email"* — the founder story. An automated system with
  an actuator wired straight to a livelihood, no governor, no attribution, no
  appeal. Most people selling AI governance have read about algorithmic harm.
  Tell it plainly and without self-pity; it is the most credible thing you own.

Channels, in priority order: written long-form under your own name → LinkedIn,
where the EHS and industrial safety community actually congregates → industry
publications (EHS Today, Occupational Health & Safety, Automation World, trade
press for warehousing and material handling) → video.

Note on video: it is the highest-effort and slowest-compounding channel of the
four. Do it because you want to, not because the business needs it in year one.

### 1.2 Get three pilot assessments

Free or near-free — $0 to $5k. You are buying case studies, not revenue.

Where to find them: local and regional warehouse, distribution, and light
manufacturing operators. Ideally sites already running AMRs, cobots, or vision
QC. Regional operators, not national accounts.

The approach that works: lead with the free checklist result, not with a
service pitch. "You scored 3 of 14. Here's what that means. I'll do the full
inventory for free if you'll let me publish it anonymised."

### 1.3 Attach the credentialed three

Start these conversations in month two, not month twelve. They take time and
they gate everything in Phase 2.

- **Licensed PE with functional safety background** (TÜV FS Eng or equivalent).
  Find them at IEEE, ISA, or ASSP chapter meetings. The pitch: a new actuator
  class with no standard and no inspection regime, and you've written the
  first draft.
- **Product liability attorney.** The design-defect argument is genuinely
  interesting to this bar. Pitch it as a novel application, because it is one.
- **Insurance broker or underwriter** in equipment breakdown or workers' comp.
  Warmest intro available: your own commercial broker, if you have one.

Advisory equity or per-engagement fees. Nobody is salaried in year one.

**Phase 1 exit criteria:** three anonymised case studies with before/after
control-hierarchy scores, one named PE willing to sign, standard cited by at
least one third party.

---

## Phase 2 — First Revenue and the Governor (Months 6–12)

**Goal:** $75k–$150k booked. Governor v0 running in one production environment.

### 2.1 Start charging
Pricing per `00-DECISIONS.md` D-9. Assessment $12k–$25k, full engagement with
certification $30k–$45k.

The proposal opens with the utilisation delta, not the risk. Fear has no budget
code; capacity does. *"You've spent $340k on automation you're running at
partial capacity because nobody can tell your insurer what happens when it
misfires. Here's what full capacity is worth, and here's what it costs to
unlock it."*

### 2.2 Build Governor v0

Minimum viable, buildable by one competent engineer in eight to twelve weeks.
Full specification in `03-PRODUCT-SPEC.md`. The non-negotiable properties:

- **Not an AI.** Deterministic rules. This is the moat — every competing
  guardrail product is itself a model, therefore probabilistic and
  prompt-injectable. Yours cannot be argued with because it isn't listening.
- **Out-of-band.** Separate process, separate credentials, separate failure
  domain. Control rods drop by gravity; the safety layer must not share fate
  with the system it governs.
- **Resource-denying, not instruction-giving.** Cut the fuel line. Never ask
  the failing component to stop.

Build it open-core: the policy engine and actuator gate open source, the
certification tooling, evidence pipeline, and managed service commercial. Open
source here is a distribution and credibility strategy, not charity — it is how
the standard becomes the default.

### 2.3 Formalise
Entity, E&O quote against the corrected claims language, engagement terms
reviewed by the attorney including the findings-retention and non-conformance
process from `01-CORRECTIONS.md` C-17.

**Phase 2 exit criteria:** first paid certification issued under a PE
signature, governor running in one production environment, E&O bound.

---

## Phase 3 — The Insurer Channel (Months 12–18)

**Goal:** one carrier or MGA offering a premium credit for certified
deployments. This is the flywheel ignition and it is the whole game.

Everything before this is preparation for one conversation.

### 3.1 The pitch to carriers

Target equipment breakdown, workers' comp, and general liability writers with
industrial books. Hartford Steam Boiler's descendants are the obvious first
call — it is literally the business they invented.

The pitch:

> You are writing exposure on automated systems you cannot currently
> distinguish from each other. A site running governed automation and a site
> running ungoverned automation carry materially different loss profiles and
> you are pricing them identically because there is no inspection standard.
>
> Here is the standard. Here are N sites assessed against it. Here is the
> control-hierarchy score distribution. Give a premium credit for certified
> sites and you select for the better risk.

### 3.2 Why this changes everything

Once one carrier credits certification:

- **You stop selling.** Clients arrive because their broker sent them.
- **Authority is settled.** The insurer's requirement is the credential; nobody
  audits your right to audit.
- **Independence resolves.** Inspect-and-underwrite is a structure with 160
  years of precedent behind it.
- **Pricing power inverts.** Certification becomes cheaper than the premium
  differential, which makes it free in the buyer's arithmetic.

This is the boiler sequence exactly: voluntary inspection → insurance
requirement → building code → law. It started with one insurer who wanted
better loss data.

**Phase 3 exit criteria:** one carrier relationship producing inbound referrals.

---

## What success looks like at month 18

- A published standard with outside citations
- 8–15 completed assessments across warehouse and light manufacturing
- $150k–$400k cumulative revenue
- Governor v0 in production at three or more sites, generating recurring licence revenue
- One carrier relationship producing inbound
- A named PE, attorney, and broker attached
- E&O bound at a sustainable premium

That is a real company. It is not a Fortune 500 consultancy yet — that is
year three, and it is reached by having done this first, not by skipping it.

---

## What to explicitly not do

- **Don't pitch Fortune 500 CROs in year one.** No case studies, no signature,
  no credibility. You get one meeting per logo and you'd waste it.
- **Don't build the governor before the standard.** The standard defines what
  the governor enforces. Reversed, you build a product with no specification.
- **Don't take the plaintiff-side money** however good it looks. It forecloses
  everything else. (D-1.)
- **Don't name individuals in public content** until every quote traces to a
  primary source. (C-5.) Attack the pattern, the incentive structure, and the
  economics — all three are better arguments anyway, and none are actionable.
- **Don't promise 100% of anything.** (C-1.)
- **Don't chase generic LLM governance.** Crowded, commoditising, and it throws
  away the only advantage you have — a doctrine built for physical actuators.
