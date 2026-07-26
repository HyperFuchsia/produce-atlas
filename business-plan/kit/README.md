# Delivery Kit

Everything needed to run one paid engagement end to end.

| File | When it is used |
|---|---|
| [`engagement-scope.md`](engagement-scope.md) | Before. Defines deliverables, exclusions, client obligations. **Not a contract** — terms need an attorney. |
| [`field-guide.md`](field-guide.md) | On site. How to enumerate, classify, and test control claims. The operational core. |
| [`findings-letter.md`](findings-letter.md) | After scoring. One per non-conformance requiring a client decision. |
| [`certificate.md`](certificate.md) | On successful remediation. Includes the mandatory residual risk statement. |

## The sequence

```
scope signed
  → field guide, on site, 1.5–2.5 days
  → registry JSON
  → uas_score --report   (assessment report, generated)
  → findings letters     (one per non-conformance)
  → remediation          (client or third party — not the assessor, by default)
  → re-score
  → certificate + residual risk statement
```

## Generating the report

```bash
python3 ../standard/tools/uas_score.py site.registry.json --report > report.md
```

Findings are generated from the registry rather than written by hand, so
nothing is softened, dropped, or forgotten between the walk and the document.
It also means no finding can be quietly removed to keep a client comfortable —
which is the point of an inspection regime.

## What is still missing before you can invoice

Stated plainly, because the kit does not cover it and pretending otherwise
would be the exact overclaiming the doctrine forbids:

- [ ] Legal entity, bank account, EIN
- [ ] **Contract terms** — payment, liability limits, indemnity, IP, governing
      law. Attorney work, not template work.
- [ ] **E&O cover**, quoted against the corrected claims language (D-6)
- [ ] **Findings retention and privilege decision** (C-17) — before the first
      engagement, not after the first subpoena
- [ ] A licensed PE, for anything above Level 2 (D-7)

The first three are the difference between a method and a business.
