# The Digital Governor — v0 Specification

Working name: **Governor**. Buildable by one competent engineer in 8–12 weeks.

---

## Design axioms

These are not preferences. Violating any one of them collapses the product's
central claim, which is that the safety layer is a constraint rather than a
request.

### A-1. The governor is not an AI
Deterministic rules only. No model in the enforcement path.

This is the moat. Nearly every competing guardrail product — classifier
filters, LLM judges, constitutional checkers, safety models grading other
models — is itself a model. That makes it probabilistic, defeasible, and
prompt-injectable: an attacker who can talk to the system can often talk to its
guard. Yours cannot be argued with because it is not listening.

### A-2. The governor does not share fate with what it governs
Separate process. Separate credentials. Separate failure domain. Ideally
separate host.

Control rods drop by gravity when power is lost. A safety layer that runs
in-process, on the same infrastructure, using the same credentials, is not a
fail-safe — it is a suggestion that dies with its subject.

### A-3. Deny the resource; never instruct the failure
A mechanical governor cuts the fuel line. It does not send the engine a polite
request to slow down.

The governor revokes capability — credentials, network path, rate budget,
actuator access. It never depends on the governed system's cooperation.

### A-4. Fail closed
Governor unreachable, unhealthy, or uncertain → the action does not execute.

Availability is explicitly subordinate to safety. This must be stated in the
sales conversation, because it is a real operational cost and the buyer should
choose it knowingly.

### A-6. Inline, not fast
The governor sits **on the critical path**. The action does not begin until the
decision exists.

The tempting alternative is an extremely fast out-of-band governor that
interdicts actions already in flight — microsecond severance against
millisecond execution, a thousandfold margin. It is a race, and a race has a
loss probability that speed reduces but never eliminates: a scheduling delay, a
GC pause, a dropped packet, a burst arriving between polls.

Inline enforcement has no such probability. Latency becomes a **cost to
throughput**, not a **risk to safety** — different quantities, different
budgets, different people signing. Sell it as the former.

Out-of-band interdiction is permitted for Tier 3 and Tier 4 actuators, where
the exposure window must be measured and declared. Never as the sole control on
Tier 1 or Tier 2.

### A-7. Tiered enforcement, honestly labelled
The fast layer is structurally dumb and the rich layer is structurally slow.

| Layer | Enforces | Position | p99 |
|---|---|---|---|
| Transport | rate, payload size, destination allowlist | eBPF/XDP, packet filter, seccomp, LSM | 1–100 µs |
| Semantic | actuator identity, magnitude, window, sequence, signature | policy engine, credential broker | 1–50 ms |
| Physical | enable signal, interlock, contactor | safety PLC / relay | per ISO 13855 |

A layer is never credited with a control it cannot evaluate. A packet filter
cannot verify a signature. Products claiming microsecond enforcement of rich
policy have measured the fast path and described the rich one — and that is a
specific, checkable claim you can use against competitors.

For physical actuators, mechanical stopping time dominates. A microsecond
decision confers nothing on a conveyor that needs 800 ms to reach a safe state.

### A-5. Deterministic and statistical controls are separate tiers
Hard limits are guaranteed. Anomaly detection is rated with a false-positive
rate. They never ship under one claim. (See `01-CORRECTIONS.md` C-2.)

---

## Architecture

```
   AI system  ──────►  ACTUATOR GATE  ──────►  real-world actuator
  (any model,          (Governor, out-of-band)     (robot, API, payment,
   any vendor)                 │                    dispatch, DB write)
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              Actuator     Policy      Evidence
              Registry     Engine        Log
             (inventory)  (Tier 1/2)  (hash-chained)
                               │
                               ▼
                    Alarm → Trip → Lockout
```

The gate is the enforcement point and it is the entire product. Everything else
supports it.

---

## Components

### 1. Actuator Registry

The audit's output, rendered as machine-readable configuration. This is the
bridge between the assessment service and the software product — the thing that
makes the two halves one business.

Each registered actuator declares:

| Field | Purpose |
|---|---|
| `id`, `description` | Identity |
| `class` | physical / financial / data / communication / legal |
| `consequence_tier` | 1–4. Tier 1 = human physical harm |
| `rated_capacity` | The load chart. Max rate, max magnitude, permitted window |
| `authorised_by` | Named human. Signing key ID |
| `built_by`, `authorised_on` | Provenance. Who built the bridge, when |
| `trip_action` | alarm / trip / lockout |
| `requires_signature` | bool. True for consequence tier 1–2 |
| `two_person` | bool. True for tier 1 |

An actuator not in the registry is not reachable. **Default deny.** That single
property is most of the security model, and it is why the enumeration work in
the assessment is not optional paperwork — it is the configuration.

### 2. Policy Engine

**Tier 1 — hard limits (deterministic, guaranteed).**
- Rate ceilings — actions per unit time, per actuator
- Magnitude ceilings — max transaction value, max torque, max speed, max rows
- Temporal windows — permitted hours, permitted days
- Sequence constraints — action B forbidden without prior state A
- Budget ceilings — compute, spend, token, egress
- Scope constraints — permitted paths, endpoints, recipients, record sets

Implementation: an existing policy engine (OPA/Rego is the obvious candidate)
or a small typed rule DSL. Do not write a novel language. The rules must be
readable by a safety engineer who does not code — that readability is a
certification requirement, not a nicety.

**Tier 2 — anomaly detection (statistical, rated).**
- Rate-of-change deviation from a learned baseline
- Latency deviation outside a configured window
- Volume anomaly (the 100 → 10,000 invoices case)

Tier 2 never trips a tier-1 actuator on its own. It raises an alarm and can
quarantine output pending human review. Keeping this boundary rigid is what
preserves the determinism claim.

### 3. Authorisation Layer

For consequence tier 1–2 actuators, execution requires a cryptographic
signature from a registered human key. Not a log entry written after the fact —
a **signing requirement** that makes the action cryptographically impossible
without the key.

This produces genuine non-repudiation, which is the only form of the
accountability claim that survives cross-examination intact.

**Two-person rule** for tier 1: two independent keys, two distinct humans.
Precedent is well established — nuclear weapons handling, banking wire
authorisation, pharmacy controlled substances.

Keys in an HSM or equivalent. A key that lives on the same host as the AI
system defeats the entire mechanism.

### 4. Evidence Log

Append-only, hash-chained. Per action:

- Timestamp, actuator ID, requesting system identity
- Full request payload
- Every policy evaluated and its result
- Decision: permitted / alarmed / tripped / locked out
- Signature chain where applicable
- Rated capacity in force at evaluation time, and the config version

Two requirements that are easy to skip and expensive to retrofit:

1. **Write to storage the governed system cannot reach.** A log the AI can
   modify is not evidence.
2. **Record the config version in force at decision time.** Without it you
   cannot reconstruct why a decision was made six months later, which is
   exactly when someone will ask.

### 5. Trip Tiers

| Tier | Trigger | Behaviour |
|---|---|---|
| **Alarm** | Approaching threshold (e.g. 80%) | Notify. Execution continues. Logged. |
| **Trip** | Threshold breached | Sever execution. Enter safe state. Notify. |
| **Lockout** | Repeat trip, or tier-1 breach | Sever and refuse restart until two-person authorisation |

Standard industrial practice. Names chosen deliberately so a plant engineer
recognises them immediately.

---

## Deployment patterns

**Pattern A — API proxy (default).** Governor sits between the AI system's
tool-calling layer and downstream APIs. Lowest friction, covers most
digital actuators.

**Pattern B — Credential broker.** The AI system holds no long-lived
credentials. The governor issues short-lived, narrowly-scoped tokens per
approved action. Stronger, since it denies the resource rather than filtering
the request (A-3).

**Pattern C — Physical interlock.** For tier-1 physical actuators, the governor
drives a safety relay or safety PLC in series with the existing e-stop
circuit. This is the version that satisfies the hierarchy of controls as a
genuine engineering control, and it is what differentiates you from every
software-only competitor in the market.

Pattern C requires the PE signature and functional safety competence. It is
also the highest-value and least contested work available to you.

---

## What v0 does not do

State this explicitly in every proposal. Scope honesty is a differentiator in a
market built on overclaiming.

- Does not inspect model internals or interpret weights
- Does not detect fabricated output as a semantic matter — it governs what
  fabricated output can *reach*
- Does not prevent an authorised human from setting a harmful limit
  (the malicious-insider case is a separate control surface and is out of scope
  for v0)
- Does not cover actuators absent from the registry — **which is precisely why
  the enumeration is the product**

That last point deserves emphasis in the sales conversation rather than
burial. Coverage is a function of assessment quality, and saying so out loud is
what makes the guarantee credible.

---

## Build order

1. Actuator registry schema + loader
2. Gate with default-deny and Tier 1 rate/magnitude limits
3. Hash-chained evidence log
4. Trip tiers and notification
5. Signing requirement and two-person rule
6. Credential broker (Pattern B)
7. Tier 2 anomaly detection
8. Physical interlock reference design (Pattern C, with the PE)

Steps 1–4 are a demonstrable product. Steps 5–6 are what an underwriter cares
about. Step 8 is what nobody else in the market has.

---

## Open-core split

**Open source:** registry schema, policy engine, gate, evidence log format.
Distribution and credibility strategy — this is how the standard becomes the
default, and it is very hard to argue a safety standard should be proprietary.

**Commercial:** certification tooling, managed evidence pipeline, conformance
testing, the certificate itself, Pattern C engineering, and support.

The certificate is the product. The code is the argument.
