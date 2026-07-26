# Canonical Doctrine

The corrected doctrine, with the controlled glossary and the argument register.

This supersedes every prior formulation. Where the source material and this
document differ, this governs. All corrections from `01-CORRECTIONS.md` are
applied here.

**Purpose:** this is the source of truth for external writing, sales
conversations, and the standard's rationale. Every argument carries its
evidentiary strength and its strongest counter, so that nothing is asserted in
public beyond what it can carry.

---

## 1. The four pillars

Canonical. The five-part lexicon nests beneath these; the five-stage pipeline
is the delivery mechanism, not the framework.

| Pillar | What it establishes |
|---|---|
| **Predictability** | The boundaries are mapped and declared before deployment. Rated capacity, enumerated actuators, published limits. |
| **Responsibility** | Every action traces to a named human who approved the parameters, cryptographically rather than procedurally. |
| **Accountability** | Failure attaches to the party who chose the configuration, through ordinary product liability. |
| **Mitigation** | Residual risk is acknowledged, bounded, rated, and designed for. Not eliminated. |

Mitigation is the pillar that makes the other three honest. It is the explicit
admission that failure remains possible, which is what distinguishes an
engineering claim from a marketing one.

---

## 2. The foundational position

**Automated decision systems have real capability. Whether they have anything
resembling agency does not matter, and refusing that debate is the stronger
position.**

*Concede capability entirely.* These systems outperform humans at pattern
recognition, throughput, and sustained operation. Disputing this makes you
sound uninformed and costs the room.

*Refuse the agency question.* A system pursuing a misspecified objective
creates the same operational problem as a system that "wants" something. The
remedy is identical either way, so the metaphysical question is **irrelevant to
what gets built**. Arguing it hands an opponent a debate winnable on
definitions while the actual case goes unexamined.

**Revised after adversarial review.** The doctrine previously argued *no
agency* as a foundational claim. That was an unwinnable and unnecessary fight,
and it equivocated: "no phenomenal desire" and "no goal-directed behaviour" are
different claims, and only the second would matter operationally — and it is
false for agentic systems. The load is now carried by something empirical:

> **The set of actions a system can take on the world is finite, and it is
> enumerable.**

A finite action space can be bounded, whatever anyone calls the system's
decision-making. The consequence is the whole business: **a mechanism with
capability and no supplied constraint requires a decision layer from outside
itself.** The governor is not a brake. It is the component the system does not
contain.

### 2.1 On autonomy

What the industry calls autonomy is more usefully described as **ungoverned
automation**.

State this as an *observation*, not a definitional proof. The earlier
formulation — autonomy is biological, therefore software cannot have it — is
true by stipulation and establishes nothing empirical; an opponent simply
declines the definition. The defensible version: removing limits from a
mechanism demonstrably produces unbounded liability, and unbounded liability is
uninsurable. That is a claim about consequences, and it is checkable.

### 2.2 On protected values

The protected value is human physical safety and human dignity. Never machine
welfare.

**Scope this precisely.** "Biological integrity" is the correct frame where an
actuator can injure a person — machinery, vehicles, medical devices, dispatch.
It is not the correct frame for HR file access, payment authorisation, or data
exfiltration. Those are Tier 2 harms with their own vocabulary: privacy,
financial loss, unlawful processing. Stretching the biological framing to cover
them reads as doctrine applied past its evidence, and a CISO will notice
immediately.

Use the frame where it fits. Elsewhere, use the ordinary words.

---

## 3. Controlled glossary

One canonical vocabulary. Supersedes all three earlier tables.

| Industry term | Use instead | Why |
|---|---|---|
| AI autonomy | **Ungoverned automation** | Names the actual condition. Removing constraints is not conferring self-determination. |
| AI alignment / AI ethics | **Structural calibration** | Parameters, not morals. Places the obligation on the deployer. |
| AI hallucination | **Fabricated output** (or *ungrounded output*) | Removes the psychological framing. Avoid *Predictive Drift* — "drift" already denotes distribution shift in ML and using it for fabrication reads as unfamiliarity with the field. |
| AI thinking / understanding | **High-velocity pattern matching** | Accurate. Avoid *compilation*, which denotes source-to-machine-code and is simply the wrong word. |
| AI going rogue / taking over | **Constraint breach** | Mechanical, neutral, auditable, and it names a thing the log can show. |
| AI safety | **Risk containment architecture** | Sounds like a line item rather than a sentiment. |
| Guardrails | **Engineering controls** where they qualify; **administrative controls** where they do not | The hierarchy of controls does the sorting. Most products called guardrails are administrative. |
| AI failure | **Constraint breach**, or **engineering malpractice** where a control was feasible and omitted | Both are categories the law already recognises. |
| Manufactured Inevitability | *(retain — this is the coinage)* | The practice of building a hazardous system while framing the hazard as a force of nature. |

### 3.1 Public-facing lines that survive scrutiny

- *"Lemon laws for automation."*
- *"We don't put brakes on a car so you can drive slow. We put brakes on a car so you can drive fast."*
- *"Your AI safety programme is an administrative control."*
- *"It is not an AI takeover. It is engineering malpractice."*
- *"A mechanism does not decide. It executes within the parameters a person set."*

### 3.2 Retired

Do not use these. Each fails against a competent audience:

| Retired | Failure |
|---|---|
| "100% mitigation" / "zero catastrophic failure" / "unbreakable" | Uninsurable, an express warranty against you, and the same overclaiming the doctrine attacks. |
| "A high-speed statistical calculator" | Undersells capability; makes the rest of the analysis look uninformed. |
| Toaster comparisons | Understates consequence. An ungoverned toaster is not wired to a supply chain. |
| "Pierces the corporate veil" | Wrong mechanism. Use director and officer liability, duty of care, negligent supervision. |
| "We are the OSHA for AI" | OSHA is a federal enforcement agency. You can be UL. You cannot be OSHA. |
| "Unlocking CapEx" | AI spend is OpEx. CFOs notice. |
| "Map every possible decision tree" | Combinatorially impossible. Claim enumeration of the **action space**, which is finite and true. |
| Named individuals' quotes without a primary source | A firm selling documented accountability cannot repeat something it did not verify. |
| Predicted labour-market and macroeconomic effects | Not measurable with these instruments. Write about them; never invoice for them. |
| Human reaction time of ~250ms as the comparison | That is simple visual reaction. Compliance judgement is tens of seconds to minutes. The real number is two orders of magnitude better for your argument. |

---

## 4. Argument register

Each claim with its support, its honest strength, and the best counter. Never
deploy an argument in public without knowing the row it sits in.

### A1 — Prompting and policy are administrative controls
**Claim.** Alignment training, ethics boards, acceptable use policies, and
system-prompt instructions are administrative controls — tier four of five in
the hierarchy of controls. Engineering controls rank third and are
categorically preferred where feasible. They are feasible here.

**Support.** NIOSH hierarchy of controls; ISO 45001; OSHA 1910.212, which
explicitly rejects warnings and training as substitutes for machine guarding
where guarding is feasible.

**Strength — very strong.** This is not an opinion. It is an existing
professional standard that independently ranks the incumbent approach as weak,
and every safety-trained person in the room already accepts it.

**Best counter.** *"Our alignment measurably reduces harmful outputs by 99%."*
**Answer.** Effectiveness does not change category. A guard bolted to the floor
and a sign reading *please do not fall* are not distinguished by how many
people have fallen. Record the measurement; the level is unchanged.

**Scope limit — added after adversarial review.** The hierarchy is an
*occupational safety* framework, built for physical hazards to workers. For
physical actuators it applies directly and is unimpeachable. For financial,
data, and communication actuators it is an **analogy**, and a safety
professional will say so. There, cite the equivalent principle from where it
actually lives — least privilege, separation of duties, dual control, default
deny. Same conclusion, correct authority, and it is the vocabulary the security
buyer already speaks.

**Deployment note.** This reframes competitors without insulting them: not
"you're wrong," but "you're at tier four and tier three exists."

---

### A2 — The governor is a reasonable alternative design
**Claim.** A product is defectively designed if a reasonable alternative design
existed that would have reduced foreseeable harm at acceptable cost. Once a
governor is commercially available and affordable, deploying without one is a
design defect.

**Support.** Settled product liability doctrine. Historical pattern: seatbelts,
airbags, machine guards, GFCI outlets — each optional until available and
cheap, then indefensible to omit.

**Strength — very strong, and strategically decisive.** It means the forcing
function is **availability, not regulation.** The duty attaches through
ordinary tort law with no legislature involved. You do not have to wait for
anyone.

**Best counter.** Software has largely escaped product liability via EULAs,
"licensed not sold," and the economic loss doctrine.
**Second counter, and the stronger one.** *A governor with no field record is
not a reasonable alternative design — it is a product with a claim attached.*
**Answer.** Correct, and this must be stated as a **trajectory, not a present
fact.** Three things are not yet true: no field record exists, "reasonable"
requires demonstrated effectiveness rather than availability, and jurisdictions
differ (risk-utility versus consumer-expectation). Admit the circularity openly
too — the product would create the duty that makes the product necessary. That
mechanism is real and historically demonstrated, and it completes only through
adoption and evidence.

**Answer to the software-shield objection.** That shield is eroding — the EU's revised Product Liability
Directive brings software and AI systems in scope as products. And it never
covered physical injury well, which is exactly the beachhead. This is also why
the EU may be the better first market on legal mechanics alone.

---

### A3 — Failure is engineering malpractice, not an act of God
**Claim.** An act-of-God defence requires unforeseeability. Enumerated,
documented, foreseeable failure modes defeat it.

**Support.** Ordinary negligence doctrine. Foreseeability is the hinge on which
both the defence and the liability turn.

**Strength — strong**, with a caveat that must be understood before selling it.

**The double edge.** The audit's real legal function is manufacturing a record
of foreseeability. That is what makes liability deterministic and risk
insurable. It also means the audit produces discoverable evidence: enumerate
the risks, have the client ignore three, and you have authored the plaintiff's
exhibit. Engagement structure must account for this deliberately — privilege
where available, defined remediation windows, explicit retention terms. See
D-5 and C-17.

---

### A4 — Capability without agency
**Claim.** These systems outperform humans at many tasks and want nothing.

**Support.** Direct statements from frontier models themselves; the Eliza
effect (Weizenbaum, 1966) documenting human projection of understanding onto
trivially simple programs.

**Strength — strong**, provided both halves are stated. Denying capability
loses the technical room; conceding agency loses the argument.

**Best counter.** Sophisticated goal-directed behaviour appears in agentic
systems without anyone intending it.
**Answer.** Instrumental behaviour arising from an objective is not agency; it
is an objective function doing what objective functions do. The correct
response is the same either way: bound the action space. The doctrine does not
depend on winning this dispute, which is why it should not be fought.

---

### A5 — Capital allocation is a revealed preference
**Claim.** Nobody allocates hundreds of billions to a system they believe is
uncontrollable. What firms tell investors and what they tell the public differ.

**Support.** Public capital expenditure, public risk statements.

**Best counter, and it is fatal to the strong form.** *The risk is real, and
someone will build this regardless, so better us.* Under race dynamics,
enormous investment and sincere alarm are entirely consistent. Any version of
this argument framed as "both cannot be true" dies to that one sentence.

**Strength — moderate, and only in the narrow form.** Do not argue hypocrisy.
Argue **observable control**: these firms set access, pricing, data retention,
and termination, and exercise all four daily. Control is checkable; sincerity is
not, and is not needed. The commercial payload survives intact — a party
exercising that much control while disclaiming responsibility for outcomes is
transferring risk onto the buyer, which is a fact about contracts.

The old strong form also confused two things: capital allocation demonstrates
**expected-value-positive**, not **risk-believed-absent**. Investors routinely fund ventures with real tail risk when returns
justify it. Stated as "they know it's safe" the claim overreaches and is easy
to puncture. Stated as "their own capital behaviour says the risk is bounded
and quantifiable, which is precisely the premise of underwriting it" it holds
cleanly and lands better with the audience you want.

---

### A6 — The kill switch already exists
**Claim.** Every model vendor can cut off any customer instantly for
non-payment. The severance mechanism the industry describes as impossible is
deployed and operating daily, aimed at revenue.

**Support.** Ordinary commercial terms across every major provider.

**Strength — strong rhetorically, moderate technically.**

**Best counter.** Commercial cutoff is not a safety interlock — different
latency, different granularity, different failure semantics.
**Answer.** Correct, and that is the point: the capability to sever exists and
is exercised; what is missing is severance engineered to a safety
specification. It proves feasibility, not adequacy. Use it that way and it
cannot be knocked down.

---

### A7 — Doom rhetoric functions as liability laundering
**Claim.** Framing AI as an uncontrollable force converts a product defect into
an act of God and shifts risk onto the buyer's balance sheet.

**Strength — moderate. Handle carefully.**

**Two problems.** Motive is unfalsifiable — some proponents sincerely believe
it, and you cannot prove otherwise. And the rhetoric may function as a
**failure-to-warn defence** rather than only as evasion: a vendor who publicly
states the risk has arguably warned.

**The sound version.** Argue **effect and incentive, never motive.** Whatever
anyone believes, the effect is that risk transfers to the deploying enterprise,
and three independent economic engines reward the framing — valuation
multiples, attention markets, and regulatory barriers that favour incumbents.

**And the counter to failure-to-warn must be made explicitly, not assumed:**
a warning does not cure a design defect where a reasonable alternative design
exists and is commercially available. That is settled doctrine, and it is the
sentence that closes the hole.

**Deployment note.** Attack the pattern, the incentive structure, and the
economics. Never named individuals, and never quotes you have not sourced to a
primary transcript.

---

### A8 — The precedent stack
**Claim.** Nothing in this framework is novel. Rated limits, mechanical
enforcement, named responsible parties, and documented residual risk are how
every mature safety discipline already works.

**Support.** ASME boiler code and Hartford Steam Boiler (1866); crane load
charts and operator certification; nuclear SCRAM, defence in depth, and
Price-Anderson; DO-178C; IEC 61508 SIL; ISO 10218; OSHA 1910.212; flood design
loads; NIST AI RMF; ISO/IEC 42001.

**Strength — very strong**, and it is the credibility argument rather than a
rhetorical one. You are the boring, proven answer to a problem everyone else is
treating as unprecedented.

**Best counter, and it lands.** *Most of those regimes were created by
legislation after mass casualties, not by a private firm publishing a standard.*
True, and it is the weakness at the load-bearing point. Boilers exploded for
decades before the code; machine guarding followed maimings. The usual sequence
is disaster, outrage, statute. Also drop any "every time" phrasing — leaded
petrol, asbestos, CFCs, and thalidomide were banned, not governed to a middle.

**How to hold the argument.** Split the stack. The statutory regimes establish
**what a working control looks like** — that part is unimpeachable. The two
insurer-led bodies establish that **a private body can get there first**, and
they are the exception rather than the pattern. That is the bet the firm is
making, and saying so is more credible than concealing it.

**Price-Anderson deserves separate mention.** Commercial nuclear power exists
only because a liability framework was constructed for it. No insurer would
write reactors; without the framework, none would have been built. That is the
thesis validated at national scale on the highest-stakes technology there is:
**liability architecture is what makes deployment possible.**

---

### A9 — Inline beats fast
**Claim.** A governor on the critical path is deterministic. A fast governor
interdicting actions in flight is a race, and a race has a loss probability
that speed reduces but never removes.

**Support.** Ordinary reliability reasoning; scheduling delays, GC pauses,
dropped packets, bursts between polls.

**Strength — very strong technically**, with one narrowing. Inline enforcement
removes the **timing** failure mode. It does not make the governor infallible:
it can crash, be misconfigured, or enforce a wrong threshold, which is why it is
proof-tested and carries its own rated probability of failure on demand. Saying
inline has "no probability of failure" is itself a zero claim and breaks rule 1.

**Deployment note.** Also a competitive instrument. Any product claiming
microsecond enforcement of rich policy has measured the fast path and described
the rich one — a packet filter cannot verify a signature. Specific and
checkable.

---

### A10 — A model checking a model is common-cause failure
**Claim.** A safety layer that is itself a model shares the failure class of
the thing it evaluates and is reachable through the same input channel.

**Strength — strong.** Ordinary engineering principle, applied without
exception. It is also the clearest statement of the moat: every competing
guardrail product is a model; yours cannot be argued with because it is not
listening.

---

### A11 — Fear is an operational tax
**Claim.** Enterprises run AI at a fraction of capacity because they cannot
bound the downside. The gap between current and full utilisation is
measurable, and it is the business case.

**Strength — unproven, and it is load-bearing.** No evidence supports fear as
*the* driver. Integration cost, data quality, unclear return, skills, and change
management are all commonly cited by the people actually deploying. Liability
fear is one constraint among several and its share is unknown. Treat this as a
**hypothesis to measure on the first three engagements**, not a premise.

It only works with the client's own numbers in it. Every proposal opens with their delta
calculated, not with a generic claim about the industry.

**Why it matters more than the safety argument.** Risk products are cost
centres — benchmarked down, deferred, squeezed. Utilisation products are profit
centres — funded and championed. Same product, different buyer behaviour,
different price ceiling. The CEO buys the confidence; the CFO funds the
compliance; the invoice says compliance.

---

### A12 — Regulation is coming *(demoted)*
**Claim.** Adopt voluntarily now or have something worse imposed later.

**Strength — weak to moderate. Demoted deliberately.** It is a prediction, it
has been made for years, and a buyer who has heard it before discounts it.

**A2 replaces it and is strictly better:** the duty attaches through
availability under existing tort law, with no prediction required and no
legislature involved. Keep A12 as a secondary note for government-affairs
audiences, where regulatory pre-emption is a genuine and separate value line.

---

## 5. Rules for external material

1. **No claim of zero, elimination, or completeness.** Ever. Bounded, rated,
   enumerated.
2. **No quotation of a named person** without a primary transcript.
3. **Effect and incentive, never motive.** You cannot prove what anyone
   believes. You can document what an arrangement rewards.
4. **Concede capability; deny agency.** Both halves, every time.
5. **Concede consequence scale; deny intent.** The hazard is real and large.
   That is why it needs a guard, not a metaphor about toasters.
6. **Use the biological frame only where an actuator can injure a person.**
   Elsewhere use privacy, financial loss, unlawful processing.
7. **Every argument carries its counter.** If you cannot state the strongest
   objection, you are not ready to make the claim.
8. **Cite the precedent, not the analogy.** "IEC 61508 rates the safety system
   itself" beats "it's like a crane" in every room that matters.
