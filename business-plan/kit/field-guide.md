# Field Guide — Running an Assessment

How to walk into a site and leave with a complete actuator registry.

This is the operational core of the business. Everything else — the standard,
the scorer, the certificate — depends on the enumeration being right, and the
enumeration happens here, on foot, asking people questions.

**Time on site:** 1.5–2.5 days for a single facility.
**Output:** a registry JSON that validates against the schema and scores.

---

## Before you arrive

Ask for these in advance. If they can't produce them, that is itself a finding
worth noting.

- [ ] A list of every AI, ML, or automated decision system in use at the site
- [ ] Network diagram, if one exists
- [ ] The tool/function/plugin configuration for each system
- [ ] Credentials inventory: what accounts do these systems hold?
- [ ] Existing risk assessments — ISO 12100, machinery risk assessments, JSAs
- [ ] The safety file: interlock schedules, e-stop maps, LOTO procedures
- [ ] Who to walk the floor with. You need **operations**, not just IT.

Do not accept a vendor's feature list as the tool configuration. Ask for the
actual config.

---

## The rule that governs everything

> **You are not looking for AI. You are looking for the points where something
> automated can cause an effect, and then asking what stops it.**

People will show you their AI projects. Those are usually the governed ones —
they're new, visible, and someone was nervous about them. The findings are
almost always in the boring integrations nobody thinks of as AI: the scheduler,
the slotting engine, the WMS rule that auto-closes a load.

---

## Stage 1 — Enumerate

### 1.1 The four questions

Ask these of **every** system, every time. They are deposition questions, which
is exactly why they work in a meeting.

1. **Who built the path from this system to that thing?**
2. **Who approved the limits it runs under?**
3. **Who is accountable for operating it?**
4. **Whose budget paid for it?**

The fourth is the one people answer honestly without realising what it
establishes. A purchase authorisation is documented intent with a signature on
it, and it is very hard to argue an outcome was unforeseeable when someone
approved the invoice that built the path to it.

Record all four per actuator. A blank is a finding, not an omission — write the
blank down.

### 1.2 Trace every path

Work through each system and enumerate:

- [ ] Every tool, function, or plugin it can call
- [ ] Every API endpoint reachable with credentials it holds
- [ ] Every channel it can emit on without human review
- [ ] Every datastore it can write to, modify, or delete from
- [ ] Every physical device downstream of any of the above
- [ ] **Every automated system that consumes its output**

### 1.3 Follow the chain — this is where the findings are

That last item is Clause 4.2.2 and it produces the findings nobody expects.

A slotting engine that only writes data looks harmless. If its output feeds a
dock door with no governed boundary between them, it **inherits** the dock
door's tier. The data write is now a Tier 2 actuator because a forklift can
fall off a dock at the end of the chain.

**Keep asking "and then what reads that?" until the answer is a human or a
governed actuator.** Most assessments stop at the first hop. The value is in
hops two and three.

### 1.4 Walk the floor

Do not do this from a conference room. Half the actuators are not in any
diagram.

- Follow the conveyor to where people put hands on it
- Find the shared aisles where robots and pickers cross
- Look at the dock, the doors, the restraints, the gates
- Ask an operator: *"what does it do that surprises you?"* — then ask *"has it
  ever done something you had to undo?"*

Operators know the failure modes. They have usually reported them and been told
it's expected behaviour.

---

## Stage 2 — Classify

### 2.1 Consequence tier

For each actuator: **what is the worst credible outcome if this operates when
it shouldn't, or at the wrong magnitude?**

| Tier | Outcome |
|---|---|
| 1 | Death or permanent disabling injury |
| 2 | Reversible injury needing treatment; irreversible financial or legal harm; loss of essential service |
| 3 | Recoverable operational, financial, or reputational harm |
| 4 | Negligible or fully reversible |

Two rules that are easy to skip:

- **Uncertain resolves upward** (5.1.1). If the room is arguing between 1 and 2,
  it is 1.
- **Check aggregate separately** (5.1.2). A single operation may be Tier 4 while
  a shift's worth is Tier 2. Ergonomic rate targets are the standard example: no
  single assignment injures anyone; eight hours of them does.

### 2.2 Control level

Ask: **what stops it?** Then classify what they describe.

| Level | What you heard |
|---|---|
| 5 | "It can't reach that any more, we removed the integration" |
| 4 | "It only touches the low-consequence version now" |
| 3 | "There's an interlock / a separate service / the gateway rejects it" |
| 2 | "It's in the SOP" · "we told the model not to" · "there's a review step" · "the prompt says" |
| 1 | "It emails someone" |
| 0 | *(silence, or "good question")* |

**The two rules that decide most cases:**

- Anything implemented by **instructing the system** is Level 2, whatever its
  measured effectiveness (6.2.2).
- Anything implemented by **a second model checking the first** is Level 2
  (6.2.3).

### 2.3 Test the Level 3 claims

Most Level 3 claims fail one of the six properties. Work the list out loud:

| Property | The question that exposes it |
|---|---|
| Non-inferential | Is there a model anywhere in the permit path? |
| Independent failure domain | **What process does the check run in?** |
| Resource denial | Does it revoke access, or does it ask nicely? |
| Fail-closed | If the check is down, does the action still go through? |
| Deterministic | Same input, same answer, always? |
| Inspectable policy | Can a safety engineer who didn't write it read the rules? |

The second question catches the most. A rate limiter living inside the same
SCADA bridge it governs is not an independent control — it dies with its
subject. That single question has produced a critical finding in every worked
example so far, and people are always surprised, because the rule itself was
correct. The rule was never the problem.

### 2.4 The question they can't answer

> **"Has that check ever been tested by deliberately trying to exceed the
> limit?"**

Usually no. Clause 7.8.4 then demotes it to Level 2 until it has been, because
an untested trip is a belief about a trip. This is the most common finding in
mature safety programmes in every other industry, and there is no reason to
expect this one to differ.

---

## Stage 3 — Score and report

```bash
python3 standard/tools/uas_score.py site.registry.json            # console
python3 standard/tools/uas_score.py site.registry.json --report   # deliverable
```

Findings are generated from the registry, not written by hand. Nothing gets
softened between the walk and the document, and nobody can quietly drop a
finding to keep a client comfortable.

---

## How to deliver bad news

Most first assessments come back non-conforming with Tier 1 criticals. The
client is not the person who built the problem, and if you present it as an
indictment they will defend rather than fix.

**Say this:**

> Your controls are the same controls everybody has. They're policies and
> procedures, and they're written well. The issue is that a policy is a tier-four
> control on a hazard that needs a tier-three one — and you already know that,
> because you'd never guard a press brake with a memo. Nobody has applied the
> rule you already follow to this new class of equipment. That's the whole
> finding.

Then show them the remediation blueprint, and be specific about cost. In the
worked example, two of three critical findings were fixed by **moving an
existing control** rather than buying anything — the rule was already correct,
it just lived in the wrong process. That is usually true, and saying so early
is what keeps the conversation about engineering instead of about blame.

---

## Field discipline

- **Write down blanks.** "Authoriser: not established" is the finding.
- **Never estimate a measurement.** Unmeasured is reported as unmeasured
  (7.7.7.2). Do not accept a vendor datasheet as a measured response time.
- **Photograph the interlocks.** You will not remember which cabinet.
- **Get the registry reviewed by the operations lead before you leave site.**
  They will find two actuators you missed. That review is worth more than an
  extra day of your own tracing.
- **Do not remediate while assessing.** You will be tempted. It compromises the
  assessment and it is what D-2 exists to prevent.
