# Engagement Scope — Skeleton

**This is a scope document, not a contract.** It defines what is delivered,
what is excluded, and what the client must provide. Payment terms, liability
limits, indemnities, IP, and governing law must be drafted by an attorney —
see D-6 and D-7. Do not send this to a client as a standalone agreement.

---

## 1. Parties and site

| | |
|---|---|
| Client | |
| Site | |
| Systems in scope | *(name each automated decision system)* |
| Assessment window | |
| Assessor | |

## 2. Standard applied

UAS-1:v0.1, *The Ungoverned Automation Standard*. The client acknowledges this
standard is a public draft, that thresholds marked `[PE-REVIEW]` are pending
engineering validation, and that it is applied as a structured assessment
method rather than as an accredited certification scheme.

State this plainly. A client who learns it later has been misled; a client who
is told up front usually does not care, because the method is what they are
buying.

## 3. Deliverables

- [ ] **Actuator registry** — machine-readable, schema-valid, covering every
      enumerated point at which an in-scope system can act on the physical,
      financial, informational, or legal world
- [ ] **Conformance assessment report** — generated from the registry: GAR
      overall and per consequence tier, controls claimed but not credited, and
      all findings with clause references and remediation windows
- [ ] **Remediation blueprint** *(engagement type B only)* — the specific
      architectural changes required to reach the next conformance level, with
      indicative effort
- [ ] **Close-out walkthrough** — one session with operations and engineering

## 4. Explicitly out of scope

The client should read this section twice. It is the honest part.

- Model quality, accuracy, bias, or fairness within rated capacity
- Any actuator not enumerated during the assessment
- Malicious action by a properly authorised human. Clause 8 makes such action
  attributable; it does not prevent it
- Macroeconomic, employment, or labour-market impact
- Remediation work itself. Referred to a third party by default (D-2); where
  the assessor performs it, that fact is disclosed on any certificate issued
- Legal advice of any kind

## 5. Client obligations

Access is the schedule risk on every engagement. Name the people, not the
departments.

- [ ] Tool, plugin, and function configuration for each in-scope system
- [ ] Credentials inventory for each system
- [ ] Existing machinery risk assessments and the site safety file
- [ ] Escorted floor access during operating hours
- [ ] Named availability: operations lead, controls engineering, and whoever
      owns the systems' integrations
- [ ] A named recipient for findings

## 6. Findings handling

- Findings are delivered **privately to the client** and to no other party.
- The assessor does not disclose findings to any regulator, insurer, or third
  party except where the client consents in writing or disclosure is compelled
  by law (Clause 11.2.3).
- Where remediation is declined, no certificate is issued or an existing one is
  withdrawn. **Enforcement operates through the absence of a certificate, never
  through disclosure.**

> **Flag for the attorney:** an assessment enumerating foreseeable harms is
> discoverable. Retention period, privilege arrangements where available, and
> what survives the engagement all need deciding here — before the first
> engagement, not after the first subpoena. See correction C-17.

## 7. Conformance levels attainable

| Level | Attainable under this engagement |
|---|---|
| 1 — Inventoried | Yes |
| 2 — Governed | Yes, subject to findings |
| 3 — Certified | **No.** Requires independent verification and the signature of a licensed professional engineer competent in functional safety |

Level 3 is stated as unattainable because it currently is. Say so in the first
meeting rather than the last.

## 8. Commercial

| | |
|---|---|
| Engagement type | A — inventory + scoring · B — full assessment + blueprint |
| Fee | |
| Expenses | |
| Payment schedule | *(attorney)* |

## 9. Signatures

| | Client | Assessor |
|---|---|---|
| Name | | |
| Role | | |
| Date | | |
