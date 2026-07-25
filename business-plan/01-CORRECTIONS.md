# Corrections Required Before Anything Is Published

The doctrine assembled in the source material is strong. These are the specific
items that will fail on contact with an engineer, a lawyer, or an underwriter.
Every one of them is a small edit with a large consequence.

Fix these **at the source** — in the master blueprint — because everything
downstream inherits from it.

---

## Critical — these create legal exposure for you

### C-1. The "100%" claim (appears at least three times)

> "Engineered the chance of catastrophic failure down to zero."
> "We guarantee 100% mitigation."
> "It will never cause a database wipe, a privacy breach, or physical harm."

**Why it fails four ways:**

1. **No safety discipline claims it.** IEC 61508 SIL levels are probability
   bands — SIL 3 is 10⁻⁷ to 10⁻⁸ failures per hour. DO-178C assigns design
   assurance levels. Medical device standards quantify residual risk. Every
   framework you borrow authority from publishes a number, and the number is
   never zero.
2. **It is uninsurable.** Underwriters price distributions. "Zero" gives them
   nothing to work with, which makes it worthless to the buyer persona your
   whole channel strategy depends on.
3. **It is an express warranty.** Say it in a sales meeting and the first
   incident makes you a co-defendant with your own words as the opening
   exhibit.
4. **It contradicts the doctrine.** The entire thesis is that the industry
   overclaims to sell product. This is the same sin in the other direction, and
   an engineering-literate buyer catches it in the first meeting.

**Replacement:**

> Guaranteed mitigation for enumerated failure modes, across governed
> actuators, within a stated response time, at a rated reliability.

Four qualifiers, all of which an underwriter needs anyway — and all of which
are only satisfiable by doing the assessment work first. The bounding language
is a revenue driver, not a retreat.

**Watch for this recurring.** The pull toward "100%" will resurface in every
draft, because it is what a nervous buyer wants to hear.

### C-2. Separate deterministic controls from statistical ones

Threshold rules are deterministic. Anomaly detection and latency triggers are
**statistical** — they have false positive and false negative rates.

If both ship under one "purely deterministic" banner, a technical buyer finds
the seam and the entire determinism claim wobbles. Split them explicitly:

- **Tier 1 — Hard limits.** Deterministic, guaranteed, rated.
- **Tier 2 — Anomaly detection.** Statistical, tuned, rated with a false-
  positive rate.

This also gives you natural product tiering and a natural upsell.

### C-3. "Legally binding auditing seal"

A private firm's seal is not legally binding. It is contractually binding and
evidentially powerful, which is entirely sufficient. Claiming otherwise is
misrepresentation by a firm whose product is legal precision.

### C-4. "Pierces the corporate veil"

Veil-piercing reaches *shareholders* for *corporate obligations*. It is not the
mechanism for executive negligence liability.

Correct concepts: personal liability of directors and officers, breach of the
duty of care, negligent supervision, and D&O coverage.

### C-5. Unverified public statements attributed to named individuals

The source material quotes a specific interview by a named public figure with
specific figures and phrases. I cannot verify it, and the drop containing it
shows signs of unsourced generation.

A firm selling documented, court-defensible accountability cannot be caught
repeating something a chatbot produced. **Every quotation from a named person
must trace to a primary transcript before it appears in any external
material.** Anything that can't be sourced gets cut.

The arguments do not depend on it. Every structural claim in the doctrine
stands without any individual's quotes.

---

## Important — these cost credibility with technical buyers

### C-6. "Predictive Drift" collides with existing ML terminology

*Drift* already means data drift / concept drift — distribution shift over
time, monitored daily by every MLOps team alive. Using it for hallucination
reads as someone who doesn't know the field.

**Use instead:** *Fabricated Output* or *Ungrounded Output*. Same deflationary
effect, no collision. (*Confabulation* is also available with existing
literature behind it.)

### C-7. "High-Velocity Compilation" misuses a precise term

Compilation is source → machine code. Inference is not compilation.

**Use instead:** *High-Velocity Pattern Matching* or *Statistical Inference at
Scale*.

### C-8. "You can be UL, you cannot be OSHA"

OSHA is a federal enforcement agency with statutory authority. UL is a private
laboratory whose standards became de facto mandatory through insurer and
building-code adoption. Only one of those is a company you can start.

### C-9. "Unlocking CapEx"

AI spend is overwhelmingly OpEx. What you unlock is revenue and productivity
from an existing operating expense. You are pitching CFOs; they notice
immediately.

### C-10. "Map every possible decision tree"

Combinatorially impossible for a generative model.

**Claim instead:** enumerate the **action space** — which is finite, because it
is the actuator inventory — rather than the output space, which is not. The
true claim is also the sufficient one.

### C-11. "A high-speed statistical calculator"

Fine for a boardroom, wrong in a technical room. It undersells capability in a
way that makes the rest of your analysis look uninformed.

The stronger version is already in your material: **concede capability
entirely, deny agency entirely.** "It will outperform your analysts. It wants
nothing." That survives any audience.

### C-12. "Toaster" comparisons understate consequence

An ungoverned toaster isn't wired to a supply chain. The doctrine needs to
concede *consequence scale* while denying *intent*. Otherwise a risk officer
correctly concludes you are minimising the hazard you're selling protection
against.

---

## Structural inconsistencies to reconcile

### C-13. Framework count drift

Three pillars, then five lexicon pillars, then four pillars. All compatible,
none canonical.

**Settle on:** four pillars (Predictability, Responsibility, Accountability,
Mitigation) as the spine → the lexicon as vocabulary nested beneath them → the
five-stage pipeline as the delivery mechanism.

### C-14. Zero-state vs. safe downgrade

The material says both. Resolve with the industrial three-tier standard already
implied elsewhere in your own notes:

- **Alarm** — threshold approached, human notified, execution continues
- **Trip** — threshold breached, execution severed, safe state entered
- **Lockout** — repeat or high-consequence breach, restart requires
  two-person authorisation

### C-15. Three competing glossaries

Vocabulary tables appear in at least three separate documents with different
terms. A standards body owns its vocabulary. Merge into one controlled glossary
and version it.

### C-16. The doom-narrative-as-legal-warning problem

Uncomfortable and unaddressed: vendor statements about catastrophic risk may
function as a **failure-to-warn defence**, not only as liability evasion. If a
vendor publicly states the risk, they have arguably warned.

You need an explicit counter before this is said in public. The counter is
sound and should be written down: **a warning does not cure a design defect
when a reasonable alternative design exists and is commercially available.**
That is settled product liability doctrine. But it has to be made in the open,
not assumed.

### C-17. The audit creates discoverable evidence

An audit enumerating foreseeable harms is discoverable. Audit a client, list
the risks, they ignore three, and you have authored the plaintiff's exhibit.

This is not a reason to avoid the business — it is precisely what gives the
product teeth. But engagement structure has to account for it deliberately:
privilege arrangements where available, defined remediation windows, explicit
findings-retention terms, and clear rules on what survives the engagement.

Decide this with the product liability attorney (D-7) before the first
engagement, not after the first subpoena.
