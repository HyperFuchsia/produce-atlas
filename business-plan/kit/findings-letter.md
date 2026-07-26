# Non-Conformance Finding — Template

Issued per UAS-1:v0.1 Clause 11.2. Delivered privately to the client. Not
copied to any third party.

Note the name: **Non-Conformance Finding**, not "Predictive Negligence Notice".
The latter reads as a threat letter and general counsel will refuse the
engagement over it. This is the standard term across every inspection regime,
it means exactly the same thing, and it survives being forwarded internally.

---

**To:** *(named recipient per engagement scope §5)*
**From:** *(assessor)*
**Date:**
**Site / deployment:**
**Registry version:**
**Finding reference:** NCF-____

---

## Finding

| | |
|---|---|
| Severity | Critical / Major / Minor |
| Clause | |
| Actuator | |
| Consequence tier | |
| Control level credited | |

### Observation

*What was found. Factual, specific, no characterisation of anyone's conduct.*

> Example — *The trailer restraint release actuator (`dock.door.release`) can be
> operated by the fleet coordination system without a person evaluating each
> release. The control identified is a standard operating procedure requiring
> visual confirmation. No interlock inhibits release while the trailer interior
> is occupied. No authoriser for its operating limits could be established.*

### Why this is a non-conformance

*Cite the clause and state the requirement. Let the standard carry it — you are
reporting against a published rule, not offering an opinion.*

> Example — *Clause 10.1(f) requires that no Tier 1 actuator sit at control
> Level 2 or below. A standard operating procedure is an administrative control
> (Clause 6.1, Level 2). The worst credible outcome of erroneous operation is a
> forklift and its operator falling from the dock, which is Tier 1 under
> Clause 5.1.*

### Required remediation

*What would satisfy the clause. Specific enough to cost.*

> Example — *An engineering control conforming to Clause 7.2: presence
> detection interlocked with the door control circuit such that release is
> physically inhibited while the trailer interior is occupied. The system may
> request release; it must not be able to cause it.*

### Remediation window

| Severity | Window |
|---|---|
| Critical | Immediate. Certificate withheld or withdrawn until resolved |
| Major | 30 days |
| Minor | 90 days |

---

## Client response

- [ ] **Remediation accepted.** Target date: ______
- [ ] **Alternative remediation proposed.** *(attach — must satisfy the same clause)*
- [ ] **Remediation declined.**

Where remediation is declined, no certificate is issued for this deployment, or
an existing certificate is withdrawn. The assessor does not notify any third
party of that decision.

**Client signature:** ____________________  **Date:** __________

---

*Findings in this letter are generated mechanically from the actuator registry
against UAS-1:v0.1. They are not editorial and they are not negotiable as
findings — only the remediation approach is open to discussion.*
