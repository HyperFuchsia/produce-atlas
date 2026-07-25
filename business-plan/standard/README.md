# The Ungoverned Automation Standard

**UAS-1:v0.1** — draft for public comment. CC BY 4.0.

Requirements for the containment of automated decision systems acting on
physical, financial, and legal actuators.

---

## The argument in one paragraph

The controls currently offered for automated decision systems are, almost
without exception, **administrative controls**: policies, training, acceptable
use terms, review procedures, and instructions issued to the system in natural
language. Under the hierarchy of controls — recognised across the occupational
safety profession, reflected in ISO 45001 and NIOSH guidance, and taught in
every safety certification — administrative controls rank fourth of five in
effectiveness, above only PPE. **Engineering controls** rank third and are
categorically preferred wherever feasible. Engineering controls for automated
decision systems are feasible. This standard specifies them.

---

## Contents

| Path | What it is |
|---|---|
| [`UAS-v0.1.md`](UAS-v0.1.md) | The standard. Normative. |
| [`schema/actuator-registry.schema.json`](schema/actuator-registry.schema.json) | JSON Schema for the actuator registry. Normative (Annex D). |
| [`tools/uas_score.py`](tools/uas_score.py) | Reference conformance scorer. Informative. |
| [`examples/warehouse-amr.registry.json`](examples/warehouse-amr.registry.json) | Worked example — mid-market fulfilment site, pre-assessment. |
| [`examples/warehouse-amr-remediated.registry.json`](examples/warehouse-amr-remediated.registry.json) | Same site, post-remediation. |

---

## Quick start

```bash
python3 tools/uas_score.py examples/warehouse-amr.registry.json
```

No dependencies. Python 3.10+.

```
--json      machine-readable output
--strict    exit non-zero unless Level 3 is achieved
--date      evaluate as of a given date (testing)
```

Exit codes: `0` Level 1+ · `1` non-conforming · `2` registry unreadable ·
`3` `--strict` and Level 3 not achieved.

Validating a registry against the schema:

```bash
pip install jsonschema
python3 -c "import json,jsonschema;jsonschema.validate(
  json.load(open('examples/warehouse-amr.registry.json')),
  json.load(open('schema/actuator-registry.schema.json')))"
```

---

## The worked example, before and after

Same distribution centre. Eight actuators: an AMR fleet sharing aisles with
pickers, a sortation conveyor, dock door restraints, workforce assignment,
carrier payments, yard slotting, driver messaging, and inventory adjustment.

**Pre-assessment**

```
RESULT:  NON-CONFORMING
Overall GAR   37.5%      Tier 1  33.3%  ◀ CRITICAL
13 findings — 2 critical, 9 major, 2 minor
```

**Post-remediation**

```
RESULT:  LEVEL 2 — Governed
Overall GAR   87.5%      Tier 1 100.0%   Tier 2 100.0%
1 finding — 1 minor (proof test lapsed)
Blocking Level 3: independent verification and PE signature
```

Three things in that example are worth reading the JSON for, because each is a
finding the site would not have produced on its own:

**A claimed engineering control that isn't one.** The conveyor speed limiter
was implemented inside the SCADA bridge — the same process, the same failure
domain, as the integration it governs. It fails Clause 7.2.2, so the scorer
demotes it from Level 3 to Level 2, which converts it into a *critical* finding
because the actuator is Tier 1. Remediation moved it to a dedicated safety PLC
on a separate network segment. Nothing about the rule changed; the thing
enforcing it stopped sharing fate with the thing it enforced against.

**A Tier 1 actuator governed by a procedure.** Dock restraint release was
protected by an SOP requiring visual confirmation. That is an administrative
control on a mechanism that can drop a forklift and its operator off a loading
dock. It was also unattributed — nobody could say who had authorised it.
Remediation was a physical interlock: presence detection wired into the door
control circuit, so the model may request release and cannot cause it.

**Transitive inheritance.** Yard slot assignment writes data. In isolation it
looks like a Tier 4 actuator. But its output was consumed by the dock door with
no governed boundary between them, so under Clause 4.2.2 it inherited Tier 2.
This is the class of exposure that enumeration exists to find, and it is
invisible to any assessment that stops at the first hop.

---

## Design decisions worth stating

**Prompting is a Level 2 control, whatever it measures.** Clause 6.2.2 fixes
the classification of any control the governed system must cooperate with,
regardless of benchmark performance. A guard bolted to the floor and a sign
reading *please do not fall* are not distinguished by how many people have
fallen. Measured effectiveness may be recorded; it does not change the level.

**A model checking a model is also Level 2.** Clause 6.2.3. Common-cause
failure, applied without exception: the checker shares the failure class of
the thing it checks and is reachable through the same input channel.

**Deterministic and statistical controls never share a claim.** Hard limits are
guaranteed. Anomaly detection is rated with a false-positive rate. Merging them
inflates the weaker and devalues the stronger, so Clause 7.6 keeps them apart
and forbids statistical detection as the sole control on Tier 1 or Tier 2.

**An untested trip is a belief about a trip.** Clause 7.8.4 demotes any
never-proof-tested governor function to Level 2. Untested safety functions are
the most common finding in mature safety programmes in every other industry.

**The registry must be able to represent non-compliance.** The schema permits
null attributions and unmeasured rates, because an unattributed actuator is
exactly what an assessment exists to surface. A registry format that can only
express conformance is useless as an assessment artifact. Both example files
validate against the schema; one of them is deeply non-conforming.

**The tool refuses to certify.** `uas_score` will take a deployment to Level 2
and stop. Level 3 requires independent verification and the signature of a
licensed professional engineer, and the scorer reports that as a blocker it
cannot clear rather than quietly ignoring it.

---

## What this standard does not do

- It says nothing about model quality, accuracy, or fairness within rated capacity.
- It provides no assurance about actuators nobody enumerated — and enumeration
  is done by people.
- It does not address an authorised human who intends harm. Clause 8 makes such
  action attributable; it does not prevent it.
- **It does not eliminate risk.** Clause 10.5.2 forbids any certificate issued
  under it from claiming otherwise. Every discipline in the normative
  references publishes a residual figure; so does this one.

---

## Status and how to argue with it

This is v0.1. It has not been reviewed by a licensed professional engineer and
has not been validated against field data.

Numeric thresholds requiring engineering validation are marked **[PE-REVIEW]**
in the text — the 80% alarm threshold, the three-trips-in-24-hours lockout
window, the 100 ms digital response ceiling, the proof test intervals, and the
90-day standing authorisation limit. They are stated as concrete values rather
than left blank so reviewers have something specific to disagree with, which is
faster than starting from nothing.

Open items for v0.2 are listed in Annex E.

A standard whose authors conceal what they have not verified cannot credibly
ask its implementers for rigour.
