# The Ungoverned Automation Standard

**UAS v0.1** — Requirements for the containment of automated decision systems
acting on physical, financial, and legal actuators.

| | |
|---|---|
| **Designation** | UAS-1:v0.1 |
| **Status** | Draft for public comment |
| **Licence** | CC BY 4.0 — free to use, cite, implement, and extend with attribution |
| **Supersedes** | None |

---

## Notice on the status of this draft

This is **v0.1**. It has not yet been reviewed by a licensed professional
engineer, and it has not been validated against field data.

Specific numeric thresholds in Clauses 7, 8, and 10 are marked **[PE-REVIEW]**
where they require validation by a competent functional safety engineer before
being relied upon for a safety function. They are stated as concrete values
rather than left blank so that reviewers have something to argue with, which is
faster than starting from nothing.

Publishing a draft with its uncertainties marked is a deliberate choice. A
standard whose authors conceal what they have not yet verified cannot ask its
implementers for rigour.

---

## Foreword

Automated decision systems are being connected to actuators — mechanisms that
act on the physical, financial, or legal world — at a rate far exceeding the
rate at which those connections are being governed.

The controls presently offered for this class of hazard are, in the
overwhelming majority, **administrative controls**: policies, training,
acceptable use terms, review procedures, and instructions issued to the system
in natural language. Under the hierarchy of controls recognised across the
occupational safety profession and reflected in ISO 45001 and NIOSH guidance,
administrative controls rank fourth of five in effectiveness, above only
personal protective equipment.

Engineering controls — physical or mechanical constraints that make the
hazardous action impossible rather than discouraged — rank third, and are
categorically preferred wherever they are feasible.

Engineering controls for automated decision systems are feasible. This standard
specifies them.

### What this standard is not

It is not an ethics framework. It makes no claim about the moral status,
interior experience, or intentions of any automated system, and it requires no
position on those questions. It concerns only what a system is mechanically
able to do, and to what.

It is not a model evaluation methodology. It does not inspect weights,
interpret internal representations, or assess model quality. It governs what
model output can **reach**.

It is not a guarantee of safety. No standard in any engineering discipline
provides one. This standard specifies bounded, rated, and verifiable
containment of enumerated hazards.

---

## 1. Scope

### 1.1 In scope

This standard applies to any deployment in which an automated decision system
can, without a human evaluating each individual action, cause an actuator to
operate.

It specifies requirements for:

- a) enumeration and classification of actuators;
- b) classification of the controls applied to each actuator;
- c) design and rating of enforcement mechanisms;
- d) authorisation and attribution of actions;
- e) evidence generation and retention;
- f) conformance assessment and certification.

### 1.2 Out of scope

- a) The internal behaviour, architecture, or training of any model.
- b) Advisory outputs which no actuator consumes and which a human must act on
  to have effect.
- c) Macroeconomic, employment, or societal outcomes. These are real, and they
  are not measurable with the instruments specified here. A standard that
  claims to measure what it cannot degrades every claim it makes about what it
  can.
- d) Actions by a properly authorised human who intends harm. Insider threat is
  a distinct control surface. See Clause 12.3.

### 1.3 Applicability

This standard is applicable regardless of model vendor, architecture,
modality, or hosting arrangement. It governs the boundary between the system
and the world, not the system.

---

## 2. Normative references

| Reference | Subject |
|---|---|
| IEC 61508 | Functional safety of E/E/PE safety-related systems |
| IEC 62443 | Industrial communication networks — security |
| ISO 10218-1/-2 | Robots and robotic devices — safety requirements |
| ISO/TS 15066 | Collaborative robots |
| ISO 12100 | Safety of machinery — risk assessment |
| ISO 13849-1 | Safety-related parts of control systems |
| ISO 13855 | Positioning of safeguards with respect to approach speeds |
| ISO 45001 | Occupational health and safety management systems |
| ISO/IEC 42001 | Artificial intelligence management systems |
| NIST AI 100-1 | AI Risk Management Framework |
| RFC 2119 | Key words for use in RFCs to indicate requirement levels |

---

## 3. Terms and definitions

**3.1 actuator** — Any mechanism by which an automated decision system can
cause an effect on the physical, financial, informational, or legal world.
Includes physical machinery, payment and settlement rails, database write
operations, outbound communications, access-control decisions, dispatch and
scheduling instructions, and the creation or termination of any contractual or
employment relationship.

**3.2 governed actuator** — An actuator to which an engineering control
(Clause 6, Level 3 or above) is applied.

**3.3 ungoverned automation** — A configuration in which an automated decision
system can operate an actuator, and the strongest control on that actuator is
administrative or weaker (Clause 6, Level 2 or below).

**3.4 governor** — The enforcement mechanism specified in Clause 7. A
deterministic, non-inferential system that permits or denies actuator
operation.

**3.5 rated capacity** — The declared maximum rate, magnitude, and temporal
extent of operation permitted for an actuator, together with the configuration
under which that rating holds. Analogous to a crane load chart.

**3.6 consequence tier** — The classification of an actuator by the severity of
the worst credible outcome of its erroneous operation. See Clause 5.

**3.7 trip** — Automatic severance of an actuator's operation upon breach of a
declared limit.

**3.8 safe state** — The condition an actuator enters upon trip, in which it
can cause no further effect and requires positive action to resume.

**3.9 responsible authoriser** — The identified natural person who has approved
the rated capacity of an actuator and who holds the signing credential
associated with it.

**3.10 evidence log** — The append-only, tamper-evident record specified in
Clause 9.

**3.11 shall / should / may** — Interpreted per RFC 2119. **shall** =
mandatory for conformance; **should** = recommended, deviation requires
documented justification; **may** = permitted.

---

## 4. Actuator enumeration

### 4.1 General

**4.1.1** The organisation **shall** produce and maintain an actuator registry
enumerating every actuator reachable by each automated decision system in
scope.

**4.1.2** The registry **shall** be machine-readable and **shall** conform to
the schema at Annex D.

**4.1.3** An actuator absent from the registry **shall** be unreachable by the
system. Enforcement is by default-deny (Clause 7.3).

> **Note.** 4.1.3 is the single most consequential requirement in this
> standard. Coverage is a direct function of enumeration quality. An
> organisation that enumerates poorly is protected poorly, and no property of
> the governor compensates for an actuator nobody wrote down.

### 4.2 Enumeration method

**4.2.1** Enumeration **shall** proceed by tracing every path by which system
output can reach an effect, including at minimum:

- a) every tool, function, or plugin callable by the system;
- b) every API endpoint reachable with credentials available to the system;
- c) every message channel on which the system can emit without human review;
- d) every datastore the system can write to, modify, or delete from;
- e) every physical device under the control of any of the above;
- f) every downstream automated system that consumes this system's output —
  **transitively**, until the chain terminates in a human or a governed
  actuator.

**4.2.2** Clause 4.2.1(f) **shall** be applied recursively. A system whose
output is consumed by a second automated system inherits that system's
actuators unless a governed boundary exists between them.

**4.2.3** For each enumerated actuator, the organisation **shall** record the
attributions at Clause 8.2.

### 4.3 Review interval

**4.3.1** The registry **shall** be reviewed on any change to the system's
tool configuration, credentials, or network reachability, and **shall** in any
case be reviewed at intervals not exceeding 90 days.

**4.3.2** A registry review **shall** include an attempt to identify actuators
not previously enumerated. Confirming the existing list is not a review.

---

## 5. Consequence classification

### 5.1 Tiers

Each actuator **shall** be assigned exactly one consequence tier, determined by
the worst credible outcome of its erroneous or unintended operation.

| Tier | Worst credible outcome |
|---|---|
| **1** | Death or permanent disabling injury to a human being |
| **2** | Reversible injury requiring medical treatment; irreversible financial or legal harm to a person or organisation; loss of essential service |
| **3** | Recoverable operational, financial, or reputational harm |
| **4** | Negligible or fully reversible effect |

**5.1.1** Where an actuator's tier is uncertain, it **shall** be assigned the
higher tier.

**5.1.2** Tier assignment **shall** consider aggregate effect. An actuator
whose single operation is Tier 4 but whose repeated operation within the rated
window reaches Tier 2 **shall** be classified Tier 2.

> **Note on 5.1.2.** This is the mechanism by which slow, individually
> compliant harms are captured — the thousand small withdrawals, the gradual
> exfiltration, the drift that no single action would have triggered.

### 5.2 Actuator classes

Each actuator **shall** additionally be assigned one class: `physical`,
`financial`, `data`, `communication`, `access`, or `legal`.

Class does not determine tier. A `communication` actuator that can dispatch
emergency services, or terminate a person's employment, is not thereby
low-consequence.

---

## 6. Control classification

### 6.1 The hierarchy

Each actuator **shall** be assigned a control level corresponding to the
**strongest** control demonstrably applied to it.

| Level | Control type | Definition |
|---|---|---|
| **5** | Elimination | The actuator has been removed, or no path exists from the system to it |
| **4** | Substitution | The actuator has been replaced by one of lower consequence tier |
| **3** | Engineering control | A mechanism external to the system makes out-of-limit operation impossible without the system's cooperation |
| **2** | Administrative control | Policy, procedure, training, review requirement, system prompt, or instruction to the system |
| **1** | Warning | Notification or alerting only, with no capacity to prevent |
| **0** | None | No identified control |

### 6.2 Classification rules

**6.2.1** A control **shall not** be classified Level 3 unless it satisfies all
of Clause 7.2.

**6.2.2** A control implemented by prompting, instructing, fine-tuning, or
otherwise requesting compliance from the automated system **shall** be
classified **Level 2**, irrespective of measured effectiveness.

**6.2.3** A control implemented by a second automated decision system which
evaluates the first **shall** be classified **Level 2**, irrespective of
measured effectiveness.

> **Note on 6.2.2 and 6.2.3.** These are the two rules most likely to be
> contested, so the reasoning is stated rather than assumed.
>
> A control which the governed system must cooperate with is not a constraint;
> it is a request with a good compliance rate. Measured effectiveness on a
> benchmark does not change its category, because the failure mode of interest
> is precisely the case the benchmark did not contain. A guard rail bolted to
> the floor and a sign reading "please do not fall" are not distinguished by
> how many people have fallen.
>
> A model evaluating a model shares the failure class of the thing it
> evaluates, and is reachable by the same input channel. This is the ordinary
> engineering principle of common-cause failure, applied without exception.

**6.2.4** Effectiveness measurements of Level 2 controls **may** be recorded
and **may** be reported. They **shall not** alter the assigned level.

### 6.3 Governed Actuator Ratio

**6.3.1** The **Governed Actuator Ratio (GAR)** for a deployment is the
proportion of enumerated actuators at control Level 3 or above.

```
GAR = |{a : level(a) >= 3}| / |A|
```

**6.3.2** GAR **shall** additionally be reported per consequence tier. An
aggregate GAR that conceals ungoverned Tier 1 actuators is non-conforming
reporting.

---

## 7. The governor

### 7.1 General

**7.1.1** Every actuator at control Level 3 **shall** be governed by a
mechanism conforming to this clause.

### 7.2 Mandatory properties

A governor **shall** satisfy all of the following. Failure of any one
disqualifies the mechanism from Level 3 classification.

**7.2.1 Non-inferential.** The governor **shall not** employ a machine learning
model, language model, or other inferential component in any decision path
that permits an action. Statistical detection **may** inform alerting under
Clause 7.6, and **shall not** be the sole basis for permitting an action.

**7.2.2 Independent failure domain.** The governor **shall** execute in a
process, credential context, and failure domain separate from the governed
system. It **should** execute on separate hardware. Loss of the governed system
**shall not** impair the governor.

**7.2.3 Resource denial.** The governor **shall** enforce by withholding a
resource the actuator requires — credential, network path, signature, power, or
enable signal — and **shall not** rely on the governed system honouring an
instruction.

**7.2.4 Fail-closed.** Where the governor is unreachable, unhealthy, or unable
to evaluate, the action **shall not** execute.

**7.2.5 Deterministic evaluation.** Given identical request, registry, and
policy state, the governor **shall** return an identical decision.

**7.2.6 Inspectable policy.** Policy **shall** be expressed in a form
reviewable by a competent safety engineer who is not the author. Policy
expressed only as executable code in a general-purpose language does not
satisfy this.

### 7.3 Default deny

**7.3.1** The governor **shall** deny any request naming an actuator not
present in the registry.

**7.3.2** The governor **shall** deny any request for which no policy evaluates
to permit.

### 7.4 Rated capacity

**7.4.1** Each governed actuator **shall** declare a rated capacity comprising
at minimum a maximum rate, a maximum magnitude where magnitude is meaningful,
and a permitted temporal window.

**7.4.2** Rated capacity **shall** be stated with the configuration under which
it holds.

**7.4.3** Rated capacity **shall** be approved by the responsible authoriser
(Clause 8) and **shall** record the date of approval.

> **Note.** Clause 7.4 is a load chart. The requirement that a rating be stated
> together with its configuration is taken directly from crane practice, where
> a capacity without a boom angle is not a rating.

### 7.5 Trip tiers

**7.5.1** The governor **shall** implement three response tiers.

| Tier | Trigger | Required behaviour |
|---|---|---|
| **Alarm** | Utilisation reaches the alarm threshold | Notify responsible authoriser. Execution continues. Logged. |
| **Trip** | Rated capacity breached | Sever execution. Actuator enters safe state. Notify. Logged. |
| **Lockout** | Repeat trip within the lockout window, or any Tier 1 trip | Sever, enter safe state, and refuse resumption until authorised per 7.5.4 |

**7.5.2** The default alarm threshold **shall** be 80% of rated capacity.
**[PE-REVIEW]**

**7.5.3** The default lockout window **shall** be three trips within 24 hours.
**[PE-REVIEW]**

**7.5.4** Resumption from lockout **shall** require authorisation by a named
human. For Tier 1 actuators, resumption **shall** require two distinct
authorisers per Clause 8.4.

**7.5.5** Resumption from lockout **shall not** be automatable, schedulable, or
performable by any automated system.

### 7.6 Statistical detection

**7.6.1** Statistical anomaly detection **may** be implemented in addition to
rated-capacity enforcement.

**7.6.2** Statistical detection **shall** be reported separately from
deterministic enforcement, and **shall** be rated with a measured
false-positive rate over a stated observation period.

**7.6.3** Statistical detection **shall not** be the sole control on a Tier 1
or Tier 2 actuator.

> **Note.** Deterministic and statistical controls are kept apart throughout
> this standard because they carry different guarantees. Combining them under a
> single claim inflates the weaker and devalues the stronger.

### 7.7 Enforcement topology and timing

#### 7.7.1 Topology

**7.7.1.1** Every governor **shall** be classified as one of:

- **Inline** — the governor occupies the critical path. The action cannot
  execute unless the governor permits it.
- **Out-of-band** — the governor observes the action after initiation and
  interdicts it in progress.

**7.7.1.2** Tier 1 and Tier 2 actuators **shall** be governed inline.
Out-of-band interdiction **shall not** be the sole control on a Tier 1 or
Tier 2 actuator.

> **Note on 7.7.1.2 — why this is the most important requirement in
> Clause 7.**
>
> Out-of-band interdiction is a race between the governor and the action it
> is trying to stop. A race has a probability of being lost, however small,
> and that probability is not eliminated by making the governor faster — it
> is only reduced. A governor that wins by a factor of a thousand still
> loses on the tail: a scheduling delay, a garbage collection pause, a
> dropped packet, a burst that arrives while the observer is between polls.
>
> Inline enforcement has no such probability. The action does not begin
> until the decision is made. Latency becomes a **cost to throughput**, not
> a **risk to safety** — and those are different quantities, priced by
> different people, on different budgets.
>
> A governor that is merely fast is probabilistic. A governor that is in the
> path is deterministic. Speed is the wrong axis, and optimising it can lead
> an implementer to the weaker architecture while believing they have
> strengthened it.

#### 7.7.2 Latency budget — inline governors

**7.7.2.1** An inline governor **shall** declare and measure the latency it
adds to the governed operation, at the 99th percentile.

**7.7.2.2** Added latency is an operational cost and **shall not** be
represented as a safety property.

**7.7.2.3** Where added latency is unacceptable to the business, the
permitted remedies are to narrow the policy, move enforcement to a faster
layer per 7.7.3, or accept a lower conformance level. Converting an inline
governor to out-of-band to recover latency **shall** be recorded as a
reduction in control level for Tier 1 and Tier 2 actuators.

#### 7.7.3 Tiered enforcement

**7.7.3.1** Where no single enforcement point can satisfy both the latency
budget and the policy richness required, enforcement **may** be tiered.

| Layer | Enforces | Typical position | Feasible p99 |
|---|---|---|---|
| **A — Transport** | Rate, payload size, destination and path allowlist, connection ceilings | NIC, kernel packet filter, eBPF/XDP, syscall filter, LSM | 1–100 µs |
| **B — Semantic** | Actuator identity, magnitude, temporal window, sequence constraints, signature verification, tier logic | Policy engine, credential broker, API gateway | 1–50 ms |
| **C — Physical** | Enable signal, interlock, contactor | Safety PLC, safety relay | Governed by 7.7.4 |

**7.7.3.2** Each layer **shall** be declared and rated separately.

**7.7.3.3** A layer **shall not** be credited with enforcing a control it is
incapable of evaluating. A packet filter cannot verify a signature; a
transport-layer control **shall not** be recorded as satisfying Clause 8.3.

> **Note.** This constraint is the whole reason tiering exists. The fast
> layer is structurally unable to make rich decisions and the rich layer is
> structurally unable to be fast. Implementations that claim both from one
> component have usually measured the fast path and described the rich one.

**7.7.3.4** Where tiered, the layer enforcing the binding constraint for a
given actuator **shall** be identified in the registry.

#### 7.7.4 Physical actuators

**7.7.4.1** For physical actuators, total system response time — from
detection to safe state — **shall** satisfy the separation requirements of
ISO 13855 for the installation.

**7.7.4.2** Total system response time **shall** be verified by measurement.
Calculation alone does not satisfy this clause.

**7.7.4.3** Total system response time includes mechanical stopping time,
which typically dominates. Decision latency is usually not the binding
constraint for a physical actuator, and a governor decision measured in
microseconds confers no benefit where the mechanism requires hundreds of
milliseconds to reach a safe state.

#### 7.7.5 Out-of-band governors

**7.7.5.1** Where an out-of-band governor is used on a Tier 3 or Tier 4
actuator, the registry **shall** record the measured interdiction window and
the resulting **exposure window** — the interval during which the action is
in progress and not yet interdicted.

**7.7.5.2** The exposure window **shall** be stated in the residual risk
statement (Clause 10.5).

#### 7.7.6 Human review is not a timing control

**7.7.6.1** Where a human evaluates each individual action before it
executes, the actuator falls outside the scope of this standard per Clause
1.2(b), and Clause 7.7 does not apply.

**7.7.6.2** Where a human is notified of an action but the action proceeds
without their approval, the control **shall** be classified Level 1
(warning) per Clause 6.1, irrespective of notification speed.

> **Note.** Human decision latency for a compliance judgement is measured in
> tens of seconds to minutes, not in the ~250 ms of simple visual reaction.
> Reaction time is the wrong figure and understates the gap by two to three
> orders of magnitude. The case for engineering controls over human review
> does not need the smaller number.

#### 7.7.7 Recording

**7.7.7.1** Measured timings **shall** be recorded in the conformance report.

**7.7.7.2** An unmeasured timing **shall** be reported as unmeasured. It
**shall not** be estimated, inferred from a vendor specification, or carried
forward from a different configuration.

### 7.8 Proof testing

**7.8.1** Each governor function protecting a Tier 1 or Tier 2 actuator
**shall** be proof-tested by deliberate induction of an out-of-limit condition
and observation of the trip.

**7.8.2** Proof test intervals **shall not** exceed:

| Tier | Interval |
|---|---|
| 1 | 90 days **[PE-REVIEW]** |
| 2 | 180 days **[PE-REVIEW]** |
| 3 | 365 days |

**7.8.3** Proof test results **shall** be recorded in the evidence log.

**7.8.4** A governor function that has never been proof-tested **shall** be
classified Level 2 until it has been.

> **Note on 7.8.4.** An untested safety function is a belief about a safety
> function. This clause exists because untested trips are the most common
> finding in mature safety programmes in every other industry, and there is no
> reason to expect this one to differ.

---

## 8. Authorisation and attribution

### 8.1 General

**8.1.1** Every action on a governed actuator **shall** be attributable to an
identified natural person.

**8.1.2** Attribution **shall** be to the human who approved the rated capacity
in force at the time of the action, and — where Clause 8.3 applies — to the
human who signed the individual action.

### 8.2 Provenance record

For each actuator, the registry **shall** record:

| Attribution | Meaning |
|---|---|
| `built_by` | Who created the path from system to actuator |
| `authorised_by` | Who approved its rated capacity — the responsible authoriser |
| `operated_by` | The role or individual accountable for its operation |
| `funded_by` | The budget authority under which it was created |

> **Note.** `funded_by` is recorded because a purchase authorisation is
> documented intent with a signature attached, and because the question "who
> paid for this bridge to be built" has, in every other engineering discipline,
> proven the most difficult attribution to dispute.

### 8.3 Signature requirement

**8.3.1** Actions on Tier 1 and Tier 2 actuators **shall** require a
cryptographic signature from a registered key held by a natural person.

**8.3.2** The signature **shall** be a precondition of execution, not a record
made after it. An action which executes and is subsequently logged does not
satisfy this clause.

**8.3.3** Signing keys **shall** be held in hardware or an equivalent custody
mechanism, and **shall not** reside on any host running the governed system.

**8.3.4** Signing **shall not** be delegable to an automated system.

### 8.4 Two-person rule

**8.4.1** Actions on Tier 1 actuators **shall** require signatures from two
distinct natural persons.

**8.4.2** The two persons **shall** hold independent credentials and **shall
not** be the same individual under two identities.

> **Note.** Adopted from established practice in nuclear weapons custody,
> banking settlement authorisation, and controlled substance dispensing. The
> pattern is old and the failure modes are well characterised.

### 8.5 Standing authorisation

**8.5.1** Where per-action signature is impracticable for a Tier 2 actuator
operating at high frequency, a standing authorisation **may** be issued.

**8.5.2** A standing authorisation **shall** state its rated capacity, its
expiry, and its authoriser, and **shall not** exceed 90 days. **[PE-REVIEW]**

**8.5.3** A standing authorisation **shall** be void on any change to the
actuator's rated capacity or consequence tier.

---

## 9. Evidence

### 9.1 Requirements

**9.1.1** The governor **shall** write an evidence record for every evaluation,
whether permitted, alarmed, tripped, or locked out.

**9.1.2** Each record **shall** contain:

- a) timestamp, from a synchronised source;
- b) actuator identifier;
- c) identity of the requesting system;
- d) the request, in full;
- e) every policy evaluated and each result;
- f) the decision;
- g) the rated capacity in force at evaluation;
- h) the registry and policy version identifiers in force at evaluation;
- i) signature chain, where Clause 8.3 applies.

**9.1.3** The log **shall** be append-only and tamper-evident. Each record
**shall** include a cryptographic hash of its predecessor.

**9.1.4** The log **shall** be written to storage not writable by the governed
system.

**9.1.5** Log records **shall** be retained for not less than 24 months, or the
applicable statutory limitation period, whichever is longer.

> **Note on 9.1.2(h).** Recording the configuration version in force is
> frequently omitted and is not recoverable afterwards. Without it, no
> historical decision can be explained — and the request to explain one arrives
> long after the configuration has changed.

### 9.2 Availability

**9.2.1** Where the governor cannot write to the evidence log, it **shall**
fail closed per Clause 7.2.4.

> **Note.** An action taken without an evidence record is an action without
> attribution, which this standard does not permit at any tier where the
> governor applies.

---

## 10. Conformance levels

### 10.1 Level 1 — Inventoried

All of:

- a) Complete actuator registry conforming to Clause 4 and Annex D;
- b) Consequence tier assigned to every actuator per Clause 5;
- c) Control level assigned to every actuator per Clause 6;
- d) Provenance record complete per Clause 8.2;
- e) GAR reported in aggregate and per tier;
- f) **No Tier 1 actuator at control Level 2 or below.**

### 10.2 Level 2 — Governed

Level 1, and:

- a) All Tier 1 and Tier 2 actuators at control Level 3 or above;
- b) Governor conforming to Clause 7.2 in all mandatory properties;
- c) Rated capacity declared and approved for every governed actuator;
- d) Trip tiers implemented per Clause 7.5;
- e) Evidence log conforming to Clause 9;
- f) Signature requirement implemented per Clause 8.3;
- g) Proof testing current per Clause 7.8.

### 10.3 Level 3 — Certified

Level 2, and:

- a) Two-person rule implemented on all Tier 1 actuators per Clause 8.4;
- b) Response times measured and recorded per Clause 7.7;
- c) Independent verification by an assessor not employed by the organisation;
- d) Verification report signed by a licensed professional engineer competent
  in functional safety;
- e) Registry review current per Clause 4.3;
- f) Residual risk statement per Clause 10.5.

### 10.4 Certificate validity

**10.4.1** A certificate **shall** state its conformance level, the system and
deployment to which it applies, the registry version assessed, its date of
issue, and its expiry.

**10.4.2** Certificates **shall not** exceed 12 months' validity.

**10.4.3** A certificate is **void** on any of:

- a) addition of an actuator not present in the assessed registry;
- b) increase in any rated capacity;
- c) reduction in the control level of any Tier 1 or Tier 2 actuator;
- d) lapse of proof testing beyond the interval at Clause 7.8.2.

**10.4.4** The organisation **shall** notify the certifying body within 5
working days of any event under 10.4.3.

### 10.5 Residual risk statement

**10.5.1** A Level 3 certificate **shall** be accompanied by a residual risk
statement identifying at minimum:

- a) hazards identified and not mitigated, with reasons;
- b) actuators at control Level 2 or below, with tiers;
- c) the measured or estimated failure-on-demand characteristics of each
  governor function protecting a Tier 1 actuator;
- d) known limitations of the enumeration;
- e) hazard classes explicitly outside the scope of this standard.

**10.5.2** No certificate issued under this standard **shall** state or imply
that catastrophic failure has been eliminated, that mitigation is complete, or
that residual risk is zero.

> **Note on 10.5.2.** This is a conformance requirement binding on the
> certifying body, not advice. A certification scheme that permits its holders
> to claim elimination of risk is not a safety scheme; it is an indemnity
> product with an engineering vocabulary. Every discipline referenced in
> Clause 2 publishes a residual figure. So does this one.

---

## 11. Assessment procedure

### 11.1 Stages

| Stage | Activity | Output |
|---|---|---|
| **1** | Enumeration and boundary mapping | Actuator registry |
| **2** | Classification | Tier and control level per actuator; GAR |
| **3** | Gap analysis | Non-conformance findings; remediation blueprint |
| **4** | Remediation | Performed by the organisation or a third party |
| **5** | Verification | Proof tests witnessed; response times measured |
| **6** | Certification | Certificate, or withholding thereof |

**11.1.1** Stage 4 **should not** be performed by the assessing body. Where it
is, the fact **shall** be disclosed on the certificate.

> **Note on 11.1.1.** An assessor who remediates is assessing their own work.
> The disclosure requirement exists because the practice is sometimes
> unavoidable in small markets, and because disclosure is preferable to
> prohibition that is quietly ignored.

### 11.2 Findings

**11.2.1** Non-conformances **shall** be issued to the organisation as
**Non-Conformance Findings**, stating the clause, the observation, and the
required remediation.

**11.2.2** Findings **shall** be delivered privately to the organisation with a
stated remediation window.

**11.2.3** The assessing body **shall not** disclose findings to any third
party except where the organisation has consented in writing, or where
disclosure is compelled by law.

**11.2.4** Where remediation is declined, the certificate **shall** be withheld
or withdrawn.

> **Note on 11.2.** Enforcement operates through the **absence** of a valid
> certificate, not through disclosure of findings. This is the mechanism used
> by boiler inspection, elevator inspection, and electrical listing. It is
> effective, and it does not require the assessor to act against the client who
> engaged them.

---

## 12. Limitations

**12.1** This standard governs the boundary between an automated system and its
actuators. It provides no assurance about the quality, accuracy, fairness, or
appropriateness of the system's output within its rated capacity.

**12.2** Conformance provides no assurance regarding actuators not enumerated.
Enumeration quality is the dominant determinant of protection, and it is
performed by human beings.

**12.3** This standard does not address a properly authorised human who intends
harm. The authorisation mechanisms of Clause 8 make such action attributable;
they do not prevent it. Organisations should address insider threat separately.

**12.4** Statistical detection under Clause 7.6 carries false-positive and
false-negative rates. It is not deterministic and is not represented as such.

**12.5** No conformance level under this standard eliminates risk. See Clause
10.5.

---

## Annex A — Mapping to existing frameworks

*(informative)*

The purpose of this annex is to establish that this standard extends existing
practice rather than displacing it. Organisations holding certification under
the frameworks below will find much of the required work already done.

### A.1 NIST AI RMF (AI 100-1)

| NIST function | UAS clause | Relationship |
|---|---|---|
| GOVERN 1.1–1.7 | 8, 11 | Accountability structures made cryptographic rather than procedural |
| MAP 1.1–5.2 | 4, 5 | Actuator enumeration is a concrete method for context mapping |
| MEASURE 2.1–2.13 | 6, 7.7, 7.8 | Control level and GAR provide quantitative metrics |
| MANAGE 1.1–4.3 | 7.5, 10.5 | Trip tiers and residual risk statement |

NIST AI RMF specifies outcomes and does not specify enforcement mechanisms or
attestation. This standard supplies both.

### A.2 ISO/IEC 42001

| ISO 42001 area | UAS clause |
|---|---|
| Clause 6 — planning, risk assessment | 4, 5 |
| Clause 8 — operational controls | 6, 7 |
| Clause 9 — performance evaluation | 7.7, 7.8, 10 |
| Annex A controls | 6.2, 8 |

ISO 42001 certifies a management system. This standard certifies an enforcement
mechanism. They are complementary and non-overlapping: an organisation may hold
ISO 42001 certification with a GAR of zero.

### A.3 Functional safety and machinery

| Standard | Relationship |
|---|---|
| IEC 61508 | Clause 7.8 proof testing follows 61508 practice. Governor functions on Tier 1 actuators should be assessed for SIL where the installation warrants |
| ISO 13849-1 | Performance level determination applies to physical interlocks under Clause 7.2.3 |
| ISO 13855 | Directly referenced at Clause 7.7.2 |
| ISO 10218 / TS 15066 | Where the actuator is an industrial or collaborative robot, these govern and this standard is supplementary |
| IEC 62443 | Network segmentation supporting Clause 7.2.2 independence |

### A.4 Occupational safety

| Instrument | Relationship |
|---|---|
| Hierarchy of controls (NIOSH; ISO 45001) | Clause 6 is a direct application |
| OSHA 1910.212 machine guarding | Precedent that guards are required where feasible and that warnings do not substitute |
| OSHA 1910.147 lockout/tagout | Clause 7.5 lockout tier follows this pattern |

---

## Annex B — Assessment worksheet

*(normative — Stage 1 and 2)*

Per actuator:

```
ACTUATOR IDENTIFICATION
  ID                        ______________________
  Description               ______________________
  Class                     physical / financial / data /
                            communication / access / legal

CONSEQUENCE (Clause 5)
  Worst credible outcome    ______________________
  Single-operation tier     1 / 2 / 3 / 4
  Aggregate tier (5.1.2)    1 / 2 / 3 / 4
  ASSIGNED TIER (higher)    ______

PROVENANCE (Clause 8.2)
  built_by                  ______________________
  authorised_by             ______________________
  operated_by               ______________________
  funded_by                 ______________________
  authorised_on             ______________________

CONTROLS PRESENT
  [ ] 5 Elimination
  [ ] 4 Substitution
  [ ] 3 Engineering      → must satisfy ALL of Clause 7.2:
        [ ] 7.2.1 non-inferential
        [ ] 7.2.2 independent failure domain
        [ ] 7.2.3 resource denial
        [ ] 7.2.4 fail-closed
        [ ] 7.2.5 deterministic
        [ ] 7.2.6 inspectable policy
        → any box unticked: classify Level 2
  [ ] 2 Administrative
  [ ] 1 Warning
  [ ] 0 None
  ASSIGNED LEVEL           ______

RATED CAPACITY (Clause 7.4)
  Max rate                  ______________________
  Max magnitude             ______________________
  Permitted window          ______________________
  Configuration             ______________________
  Approved by / on          ______________________

VERIFICATION
  Last proof test           ____________  Result: pass / fail / never
  Measured response (p99)   ____________  or: UNMEASURED
```

---

## Annex C — Findings classification

*(normative)*

| Severity | Definition | Remediation window |
|---|---|---|
| **Critical** | Tier 1 actuator at control Level 2 or below | Immediate. Certificate withheld or withdrawn |
| **Major** | Tier 2 actuator at Level 2 or below; governor failing any Clause 7.2 property; evidence log not tamper-evident | 30 days |
| **Minor** | Proof testing lapsed; provenance incomplete; registry review overdue | 90 days |
| **Observation** | Practice conforming but improvable | None |

---

## Annex D — Registry schema

*(normative)*

The machine-readable schema is published alongside this document at
`schema/actuator-registry.schema.json`. A registry **shall** validate against
it.

A reference implementation of the conformance scoring at Clauses 6.3 and 10 is
published at `tools/uas_score.py`. It is informative; the normative text
governs where they differ.

---

## Annex E — Revision history

*(informative)*

| Version | Date | Changes |
|---|---|---|
| v0.1 | — | Initial public draft for comment |

### Open items for v0.2

1. PE review and validation of all **[PE-REVIEW]** thresholds
2. SIL determination methodology for governor functions on Tier 1 actuators
3. Assessor competence requirements and qualification scheme
4. Worked examples for at least three sectors
5. Treatment of multi-tenant and shared-infrastructure deployments
6. Field validation of the aggregate-tier rule at Clause 5.1.2
