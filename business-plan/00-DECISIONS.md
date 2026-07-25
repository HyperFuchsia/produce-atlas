# Decisions Log — AI Liability Containment Firm

Status: **v1.0 — first pass, all open questions forced to a recommendation.**

Everything below is a recommendation with reasoning, not a mandate. Where I'm
uncertain I say so. Nine decisions were left open across the source material;
all nine are answered here.

---

## D-0. Target market — the question asked three times and never answered

**Recommendation: industrial and warehouse operations where AI touches physical
machinery. Beachhead = warehouse / fulfilment automation. Second wave =
discrete manufacturing.**

Not healthcare. Not financial services. Not frontier labs. Not generic
"enterprise LLM deployment."

### Why this sector and not the obvious ones

The doctrine assembled in the source material is a *safety engineering*
doctrine. It borrows its entire authority from boilers, cranes, reactors,
machine guards, SIL levels, and the hierarchy of controls. There is exactly one
sector where that vocabulary is already the native language of the buyer:
industrial operations.

Everywhere else you have to teach the framework before you can sell it. Here
you don't. An EHS director already believes engineering controls beat
administrative controls — it's on the wall of their office. You are not
converting them. You are telling them the AI their company just installed is
governed by a policy document instead of a guard, and watching their face
change.

Seven reasons this is the right beachhead:

1. **The framework is pre-sold.** Hierarchy of controls, lockout/tagout,
   machine guarding, SIL ratings, load charts, permit-to-work. Every concept in
   the doctrine already exists here under a different name.
2. **"Biological integrity" is literal, not rhetorical.** People lose hands to
   machines. That is the whole reason this sector's safety culture exists. The
   most awkward phrase in your material becomes the most natural one.
3. **Insurance is already structurally embedded.** Workers' comp, equipment
   breakdown, general liability. Carriers already send inspectors to these
   sites. The channel you need is already walking the floor — you are adding a
   line to an inspection that happens anyway.
4. **The buyer is reachable.** An EHS director or plant safety manager at a
   400-person facility takes meetings. A Fortune 500 Chief Risk Officer does
   not, and will not, until you have case studies and a credentialed signature.
5. **AI is genuinely arriving here right now** — autonomous mobile robots,
   collaborative robots, vision-based quality control, predictive maintenance
   scheduling, automated dispatch and slotting. Real actuators, real torque,
   real people standing next to them.
6. **Existing standards to anchor to**, so you are extending a body of law
   rather than inventing one: ISO 10218 and ISO/TS 15066 (industrial and
   collaborative robots), IEC 61508 / 62061 (functional safety), IEC 62443
   (industrial network segmentation), ANSI/RIA R15.06, OSHA 1910.212 (machine
   guarding) and 1910.147 (lockout/tagout).
7. **The competition is looking the other way.** The entire AI governance
   industry is focused on LLMs, bias, privacy, and white-collar workflows.
   Almost nobody is applying it where a misfire breaks a femur. That is an
   uncontested position and it is the one your doctrine was accidentally built
   for.

### Why not the alternatives

| Sector | Why not first |
|---|---|
| **Healthcare / clinical AI** | Best long-term fit — biological integrity is literal and FDA precedent is perfect. But entry requires clinical and regulatory credentials you don't have, sales cycles run 18–36 months, and a mistake is career-ending. Correct as wave three, suicidal as wave one. |
| **Financial services** | Huge compliance budgets, but the incumbent framework (SR 11-7 model risk management) is entrenched, mature, and staffed. You'd be a late entrant to a solved problem. Harm is also financial, not physical, which strips out your strongest argument. |
| **Frontier AI labs / big tech** | They are the adversary in your doctrine. They will not hire their critic, and they have larger internal safety teams than you will ever have. |
| **Generic enterprise LLM governance** | Crowded, commoditising fast, no physical actuators, weak liability hook, and you'd be competing with Big Four advisory practices on their turf. |

### The beachhead inside the beachhead

Start with **warehouse and fulfilment automation**, specifically sites running
autonomous mobile robots or automated storage and retrieval alongside human
workers. High injury rates, high insurance cost, rapid AI adoption, mid-market
operators who are reachable, and a safety case that is trivially easy to make
because the robots and the people share a floor.

---

## D-1. Insider or adversary — audit clients, or arm plaintiffs

**Recommendation: insider. Unambiguously. Drop the plaintiff-side litigation
revenue line entirely.**

You cannot sell pre-deployment audits to companies while selling forensic
evidence to the lawyers suing those companies. No general counsel approves that
engagement, and the Predictive Negligence Notice makes it worse — you would be
manufacturing the exhibit and then selling expert testimony to interpret it.

Both are real businesses. The insider business is larger, recurring, and
compounding. The adversary business is high-margin, high-profile, and
permanently locks you out of every enterprise account in the sector.

Pick insider. Revisit in year five from a position of strength, and if you do,
do it through a legally separate entity with different branding and no shared
personnel.

---

## D-2. Independence — you cannot certify, sell the remedy, and license the product

**Recommendation: adopt the Hartford Steam Boiler structure — inspect and carry
risk — rather than the Big Four structure of audit-then-consult.**

Three viable structures, in order of preference:

1. **Inspect + underwrite (HSB model, 1866).** You inspect; an insurer prices
   the risk; you eventually share in the underwriting result. Skin in the game
   is what makes the inspection credible. This is the strongest structure and
   the one your material keeps circling without naming.
2. **Certify + license, remediation referred out.** You audit and you license
   the governor, but remediation engineering is performed by partner firms you
   don't own. Clean enough to survive scrutiny.
3. **Full stack (audit + remediate + license).** Fastest revenue, and it is
   what the source material currently describes. It is also what Andersen did,
   and Sarbanes-Oxley exists because of what happened next.

Start at (2) because it is achievable immediately. Build deliberately toward
(1). Never (3).

---

## D-3. Naming

**Recommendation: retire "Dignity" from anything client-facing. Keep it in the
doctrine.**

In current AI discourse "dignity" signals AI ethics, model welfare, and
rights-for-systems — precisely the school of thought this firm exists to
demolish. A safety director hearing "Dignity Embedded Lab" pattern-matches to
an ethics consultancy and stops listening before you reach the actuator
inventory.

Meanwhile the strong, uncontested names are already sitting in your material:

- **Ungoverned Automation** — the category you're naming
- **Deterministic Liability Containment** — the service
- **The Digital Governor** — the product
- **Lemon Laws for Automation** — the public campaign line
- **Manufactured Inevitability** — the thing you're against

Firm name should be plain and structural. Something in the family of
*Governor Labs*, *Constraint Systems*, *Actuator Safety Group*. Boring is
correct here; certification bodies are supposed to sound like infrastructure.

Keep "human dignity" as the stated protected value inside the standard
document, where the definition can sit right next to it.

---

## D-4. Authority — where the certification's credibility comes from

**Recommendation: publish the standard free and open, before selling anything.
The OWASP model, not the UL model.**

UL had insurers behind it from day one. You don't, yet. The reachable version
of the same play is OWASP: publish something genuinely useful for free, let it
get adopted as the reference, and let a services industry grow on top of it —
including yours.

Concretely: **The Ungoverned Automation Standard, v0.1** — a free, public,
citable document defining the actuator inventory method, the control hierarchy
scoring, the trip tiers, and the certification criteria. Published openly,
versioned, with a changelog, and licensed for anyone to use.

This is the single highest-leverage, lowest-capital action available to you,
and it should happen before any sales activity at all. It costs writing time.
It buys the only thing you cannot otherwise purchase: the right to be cited.

---

## D-5. The Predictive Negligence Notice — who receives it

**Recommendation: client-only at first, contractually escalating to the insurer
on the client's own consent, and never to a regulator or plaintiff unilaterally.**

The notice only has teeth if it can reach someone other than the client. But if
clients believe it can escape unilaterally, nobody hires you.

The resolution is to make escalation a term the client agrees to in advance as
the price of certification:

- Findings are delivered to the client, privately, with a remediation window.
- If the client remediates, they get the certificate.
- If the client declines to remediate, the certificate is withheld or
  withdrawn — and *withdrawal is what the insurer sees.*

You never have to send anything to a regulator. **The absence of a current
certificate is the signal.** That is exactly how boiler inspection, elevator
inspection, and UL listing all work, and it is enforceable without you ever
acting as an informant against a paying client.

Rename the artifact accordingly. "Predictive Negligence Notice" sounds like a
threat letter. **Non-Conformance Finding** is the industry-standard term, means
the same thing, and doesn't make general counsel refuse the engagement.

---

## D-6. Your own liability and insurability

**Recommendation: treat E&O cover as a gating item, and let it discipline the
claims language.**

A firm that certifies a system which later injures someone is a defendant.
Before the first paid engagement you need professional liability / E&O cover,
and underwriters will price it against the promises in your marketing.

This is why the overclaim problem (see `01-CORRECTIONS.md`) is not a stylistic
issue. "100% mitigation" and "zero catastrophic failure" are the sentences that
either make your own cover unaffordable or void it. Bounded, rated language is
what makes you insurable, which is what makes you credible, which is what makes
the certificate worth anything.

Practical sequence: write the standard with bounded language → get a broker to
quote E&O against it → let the quote tell you whether the claims are defensible.
The insurance market will grade your rigour for free, before any client does.

---

## D-7. Credentials and staffing

**Recommendation: the founder owns the thesis, the standard, and the go-to-
market. The signature on every certificate belongs to someone licensed.**

A certification body's entire product is the credibility of a signature. Before
the first paid certification you need three people attached, not necessarily
employed:

1. **A licensed professional engineer** with functional safety experience
   (TÜV FS Eng certification or equivalent). They sign. They carry personal
   professional liability, which is exactly why the signature is worth
   something.
2. **A product liability attorney.** Reviews the standard, the engagement
   terms, the non-conformance process, and the claims language.
3. **An insurance broker or underwriter** in equipment breakdown or workers'
   comp. Your channel, and your reality check on what carriers will actually
   credit.

None of these need to be full-time or salaried at the start. Advisory equity,
per-engagement fees, or a referral relationship all work. What matters is that
the names exist before the first invoice.

This is not a gap in the plan — it is the plan. The founder's job is to build
the thing those three people are willing to put their names on.

---

## D-8. Scope boundaries

**Recommendation: cut labour-market and economic-dignity claims from the
service scope. Keep them in the public writing.**

The material repeatedly extends scope to "collapsing a local job market" and
"economic dignity." You cannot instrument those with the same tools that
measure a threshold breach, you cannot defend a quantified forecast of them in
court, and attempting to sell them makes the physical-safety claims look
equally speculative.

**In scope:** physical harm to humans, equipment damage, unauthorised action
execution, data exfiltration, financial transactions, regulatory breach — every
one of which terminates at a specific, enumerable actuator.

**Out of scope as a paid deliverable:** macroeconomic impact, employment
effects, societal outcomes.

Write about them. Don't invoice for them.

---

## D-9. Pricing

**Recommendation: $12k–$45k for a first-wave facility assessment. Not
$150k–$500k.**

The pricing in the source material is Big Four Fortune 500 pricing, and it
assumes a brand you don't have yet. Mid-market industrial safety assessments
clear in the low tens of thousands. Quote $300k to a plant manager and the
meeting ends.

Indicative ladder:

| Offering | Price | Notes |
|---|---|---|
| Actuator inventory + control-hierarchy scoring, single facility | $12k–$25k | The wedge. Two to three weeks. |
| Full assessment + remediation blueprint + certification | $30k–$45k | Adds the trip design and the certificate. |
| Governor licence | $2k–$8k / month / site | Recurring. The actual business. |
| Recertification | $8k–$15k / year | Annual, like every other inspection regime. |
| Enterprise multi-site programme | $150k+ | Year two, once case studies exist. |

The Fortune 500 numbers in the source material are not wrong. They are just
year three.
