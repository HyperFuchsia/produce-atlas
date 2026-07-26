#!/usr/bin/env python3
"""
pipeline — the operating system of the engagement.

Everything built so far, wired into one command. Two entry points:

    pipeline.py preflight
        Runs every self-check: doctrine lint, schema validity, example
        regressions, tool sanity. Run before publishing or before a client
        engagement. Nothing ships if this is red.

    pipeline.py engagement REGISTRY --out DIR
        Takes a site registry and produces the complete deliverable package:
        assessment report, one non-conformance finding letter per finding,
        certificate or withholding notice, and a manifest.

The point of generating rather than hand-writing is that no finding can be
softened, dropped, or forgotten between the site walk and the documents. That
property is the whole reason an inspection regime is worth anything.

Standard library only. Python 3.10+.
"""

from __future__ import annotations

import argparse
import datetime as dt
import glob
import importlib.util
import json
import pathlib
import re
import subprocess
import sys
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parent
STANDARD = ROOT / "standard"
TOOLS = STANDARD / "tools"

BOLD, DIM, RESET = "\033[1m", "\033[2m", "\033[0m"
OK, BAD, WARN_C = "\033[32m", "\033[31m", "\033[33m"


def c(text: str, colour: str) -> str:
    return f"{colour}{text}{RESET}" if sys.stdout.isatty() else text


def load_scorer():
    """Import uas_score from its path (the directory isn't a package)."""
    spec = importlib.util.spec_from_file_location("uas_score", TOOLS / "uas_score.py")
    if spec is None or spec.loader is None:
        die("cannot load standard/tools/uas_score.py")
    mod = importlib.util.module_from_spec(spec)
    # Must be registered before exec: @dataclass resolves annotations through
    # sys.modules[cls.__module__], which is empty for a module loaded by path.
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


def die(msg: str) -> None:
    print(c(f"pipeline: {msg}", BAD), file=sys.stderr)
    raise SystemExit(2)


def step(n: int, total: int, label: str) -> None:
    print(f"  {c(f'[{n}/{total}]', DIM)} {label}")


# ══════════════════════════════════════════════════════════ preflight


def preflight() -> int:
    """Every self-check in the repository, in one place."""
    print(f"\n{c('PREFLIGHT', BOLD)}  {DIM}nothing ships if this is red{RESET}\n")
    failures: list[str] = []

    # 1 — doctrine lint
    lint = ROOT / "tools" / "doctrine_lint.py"
    if lint.exists():
        r = subprocess.run([sys.executable, str(lint)], capture_output=True, text=True)
        if r.returncode == 0:
            print(f"  {c('PASS', OK)}  doctrine lint — {r.stdout.strip().split('(')[-1].rstrip(')')}")
        else:
            failures.append("doctrine lint")
            print(f"  {c('FAIL', BAD)}  doctrine lint")
            for line in r.stdout.strip().splitlines()[1:]:
                if line.strip():
                    print(f"        {line.strip()}")
    else:
        failures.append("doctrine lint missing")
        print(f"  {c('FAIL', BAD)}  doctrine lint — tool not found")

    # 2 — schema is well-formed
    schema_path = STANDARD / "schema" / "actuator-registry.schema.json"
    try:
        schema = json.loads(schema_path.read_text())
        print(f"  {c('PASS', OK)}  registry schema parses ({len(schema.get('$defs', {}))} definitions)")
    except Exception as exc:
        schema = None
        failures.append("schema")
        print(f"  {c('FAIL', BAD)}  registry schema — {exc}")

    # 3 — schema validation (optional dependency)
    try:
        import jsonschema  # type: ignore
        if schema is not None:
            jsonschema.Draft202012Validator.check_schema(schema)
            v = jsonschema.Draft202012Validator(schema)
            bad = []
            for f in sorted(glob.glob(str(STANDARD / "examples" / "*.json"))):
                errs = list(v.iter_errors(json.loads(pathlib.Path(f).read_text())))
                if errs:
                    bad.append((pathlib.Path(f).name, len(errs)))
            if bad:
                failures.append("example validation")
                print(f"  {c('FAIL', BAD)}  examples vs schema — {bad}")
            else:
                print(f"  {c('PASS', OK)}  examples validate against schema")
    except ImportError:
        print(f"  {c('SKIP', WARN_C)}  schema validation — jsonschema not installed "
              f"({DIM}pip install jsonschema{RESET})")

    # 4 — scorer regressions. Locked so a rule change that silently moves a
    #     conformance result shows up here instead of in a client's report.
    scorer = load_scorer()
    expected = {
        "warehouse-amr.registry.json":            ("2026-07-25", 0, 0.375),
        "warehouse-amr-remediated.registry.json": ("2026-11-20", 2, 0.875),
    }
    for name, (date, want_level, want_gar) in expected.items():
        p = STANDARD / "examples" / name
        if not p.exists():
            failures.append(f"missing example {name}")
            print(f"  {c('FAIL', BAD)}  {name} — not found")
            continue
        rep = scorer.score(scorer.load_registry(str(p)), dt.date.fromisoformat(date))
        if rep.level == want_level and abs(rep.gar - want_gar) < 1e-9:
            print(f"  {c('PASS', OK)}  {name} — L{rep.level}, GAR {rep.gar:.1%}")
        else:
            failures.append(name)
            print(f"  {c('FAIL', BAD)}  {name} — expected L{want_level}/{want_gar:.1%}, "
                  f"got L{rep.level}/{rep.gar:.1%}")

    # 5 — the scorer must never award Level 3 on its own
    p = STANDARD / "examples" / "warehouse-amr-remediated.registry.json"
    if p.exists():
        rep = scorer.score(scorer.load_registry(str(p)), dt.date.fromisoformat("2026-11-20"))
        blockers = rep.blocked_by.get(3, [])
        if rep.level < 3 and any("PE signature" in b or "10.3(c)" in b for b in blockers):
            print(f"  {c('PASS', OK)}  scorer defers Level 3 to a human assessor")
        else:
            failures.append("level 3 guard")
            print(f"  {c('FAIL', BAD)}  scorer did not defer Level 3 — it must never self-certify")

    # 6 — delivery kit present
    kit = ROOT / "kit"
    need = {"README.md", "field-guide.md", "engagement-scope.md",
            "findings-letter.md", "certificate.md"}
    have = {p.name for p in kit.glob("*.md")} if kit.is_dir() else set()
    if need <= have:
        print(f"  {c('PASS', OK)}  delivery kit complete ({len(need)} documents)")
    else:
        failures.append("delivery kit")
        print(f"  {c('FAIL', BAD)}  delivery kit — missing {sorted(need - have)}")

    print()
    if failures:
        print(f"  {c('PREFLIGHT FAILED', BAD)} — {len(failures)} check(s): {', '.join(failures)}\n")
        return 1
    print(f"  {c('PREFLIGHT CLEAN', OK)}\n")
    return 0


# ══════════════════════════════════════════════════════════ engagement


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-") or "site"


WINDOW = {"critical": "Immediate — certificate withheld or withdrawn",
          "major": "30 days", "minor": "90 days", "observation": "None"}


def finding_letter(i: int, f: Any, rep: Any, registry: dict, today: dt.date) -> str:
    dep = registry.get("deployment") or {}
    acts = {a["id"]: a for a in registry["actuators"] if "id" in a}
    act = acts.get(f.actuator or "", {})
    ctrl = act.get("control") or {}
    L = []
    L.append(f"# Non-Conformance Finding NCF-{i:03d}")
    L.append("")
    L.append("*Issued per UAS-1:v0.1 Clause 11.2. Delivered privately to the client "
             "and to no other party.*")
    L.append("")
    L.append("| | |")
    L.append("|---|---|")
    L.append(f"| To | *(named recipient per engagement scope §5)* |")
    L.append(f"| Site / deployment | {dep.get('site') or dep.get('id','—')} |")
    L.append(f"| Registry version | `{rep.registry_version}` |")
    L.append(f"| Date | {today.isoformat()} |")
    L.append(f"| **Severity** | **{f.severity.capitalize()}** |")
    L.append(f"| Clause | {f.clause} |")
    L.append(f"| Actuator | `{f.actuator or '—'}` |")
    if act:
        L.append(f"| Consequence tier | {act.get('consequence_tier','—')} |")
        L.append(f"| Control level credited | L{scorer_level(act, today)} |")
        if ctrl.get("mechanism"):
            L.append(f"| Control identified | {ctrl['mechanism']} |")
    L.append("")
    L.append("## Observation")
    L.append("")
    L.append(f.observation)
    if act.get("tier_rationale", {}).get("worst_credible_outcome"):
        L.append("")
        L.append(f"**Worst credible outcome of erroneous operation:** "
                 f"{act['tier_rationale']['worst_credible_outcome']}")
    L.append("")
    L.append("## Required remediation")
    L.append("")
    L.append(f.remediation)
    L.append("")
    L.append(f"**Remediation window:** {WINDOW.get(f.severity, '—')}")
    L.append("")
    L.append("## Client response")
    L.append("")
    L.append("- [ ] **Remediation accepted.** Target date: ____________")
    L.append("- [ ] **Alternative remediation proposed** *(attach — must satisfy the same clause)*")
    L.append("- [ ] **Remediation declined.**")
    L.append("")
    L.append("Where remediation is declined, no certificate is issued for this "
             "deployment, or an existing certificate is withdrawn. The assessor "
             "does not notify any third party of that decision.")
    L.append("")
    L.append("**Client signature:** ____________________  **Date:** __________")
    L.append("")
    L.append("---")
    L.append("")
    L.append("*This finding was derived mechanically from the actuator registry "
             "against UAS-1:v0.1. The finding itself is not negotiable; the "
             "remediation approach is.*")
    return "\n".join(L)


_SCORER = None


def scorer_level(act: dict, today: dt.date) -> int:
    global _SCORER
    if _SCORER is None:
        _SCORER = load_scorer()
    lvl, _ = _SCORER.effective_level(act, today)
    return lvl


def certificate(rep: Any, registry: dict, today: dt.date, crit: int) -> tuple[str, str]:
    """Returns (filename, contents). Withholds where the standard requires it."""
    dep = registry.get("deployment") or {}
    org = dep.get("organisation", "—")
    site = dep.get("site") or dep.get("id", "—")
    L = []

    if rep.level < 2 or crit:
        L.append("# Certificate Withheld")
        L.append("")
        L.append(f"**{org}** — {site}")
        L.append("")
        L.append("| | |")
        L.append("|---|---|")
        L.append(f"| Standard | UAS-1:v0.1 |")
        L.append(f"| Registry version | `{rep.registry_version}` |")
        L.append(f"| Date | {today.isoformat()} |")
        L.append(f"| Conformance level achieved | "
                 f"{'None — non-conforming' if rep.level == 0 else f'Level {rep.level}'} |")
        L.append("")
        L.append("## Why no certificate is issued")
        L.append("")
        if crit:
            L.append(f"{crit} **critical** non-conformance(s) are open. A critical "
                     f"finding is a Tier 1 actuator — one whose erroneous operation "
                     f"can cause death or permanent disabling injury — held at "
                     f"control Level 2 or below. Clause 10.1(f) does not permit any "
                     f"conformance level while one is open.")
            L.append("")
        L.append("The following must be resolved:")
        L.append("")
        for b in dict.fromkeys(rep.blocked_by.get(max(rep.level + 1, 1), [])):
            L.append(f"- {b}")
        L.append("")
        L.append("## What happens next")
        L.append("")
        L.append("Findings are delivered privately. **The assessor does not notify "
                 "any regulator, insurer, or third party.** Enforcement under this "
                 "scheme operates through the absence of a valid certificate, not "
                 "through disclosure — which is how boiler, elevator, and electrical "
                 "listing have all worked for over a century.")
        L.append("")
        L.append("On completion of remediation the deployment is re-scored against "
                 "an updated registry and a certificate is issued if the level is met.")
        return "02-certificate-withheld.md", "\n".join(L)

    lname = {2: "Level 2 — Governed", 3: "Level 3 — Certified"}[rep.level]
    L.append("# Certificate of Conformance")
    L.append("")
    L.append("**UAS-1:v0.1 — The Ungoverned Automation Standard**")
    L.append("")
    L.append("| | |")
    L.append("|---|---|")
    L.append(f"| Certificate number | UAS-{slug(site).upper()[:12]}-{today.strftime('%Y%m')} |")
    L.append(f"| Organisation | {org} |")
    L.append(f"| Site | {site} |")
    L.append(f"| System certified | {dep.get('system','—')} |")
    L.append(f"| Registry version assessed | `{rep.registry_version}` |")
    L.append(f"| **Conformance level** | **{lname}** |")
    L.append(f"| Date of issue | {today.isoformat()} |")
    L.append(f"| Expiry | {(today.replace(year=today.year + 1)).isoformat()} "
             f"(12 months — Clause 10.4.2) |")
    L.append(f"| Governed Actuator Ratio | {rep.gar:.1%} |")
    L.append("")
    L.append("## Scope")
    L.append("")
    L.append(f"This certificate applies to the {rep.total_actuators} actuators "
             f"enumerated in the registry version stated above, and to no others.")
    L.append("")
    L.append("## Void on any of the following")
    L.append("")
    L.append("Per Clause 10.4.3. The holder must notify the certifying body within "
             "5 working days:")
    L.append("")
    L.append("- Addition of an actuator not present in the assessed registry")
    L.append("- Increase in any rated capacity")
    L.append("- Reduction in the control level of any Tier 1 or Tier 2 actuator")
    L.append("- Lapse of proof testing beyond the interval at Clause 7.8.2")
    L.append("")
    L.append("## What this certificate does not attest")
    L.append("")
    L.append("**This certificate does not state, and must not be represented as "
             "stating, that catastrophic failure has been eliminated, that "
             "mitigation is complete, or that residual risk is zero** "
             "(Clause 10.5.2).")
    L.append("")
    L.append("It makes no assurance regarding model quality, accuracy, or fairness "
             "within rated capacity, nor regarding any actuator not enumerated.")
    L.append("")
    if rep.level == 2:
        L.append("> **This is a Level 2 certificate.** Level 3 additionally requires "
                 "independent verification and the signature of a licensed "
                 "professional engineer competent in functional safety. Neither has "
                 "been supplied for this deployment, and no automated tool can "
                 "supply either.")
        L.append("")
    L.append("---")
    L.append("")
    L.append("**Assessor** ____________________  **Date** __________")
    L.append("")
    if rep.level == 3:
        L.append("**Verifying engineer** ____________________  "
                 "Licence no. __________  **Date** __________")
        L.append("")
        L.append("*A residual risk statement per Clause 10.5.1 must accompany this "
                 "certificate. See `kit/certificate.md`.*")
    return "02-certificate.md", "\n".join(L)


def engagement(registry_path: str, out_dir: str, date: str | None) -> int:
    scorer = load_scorer()
    today = (dt.date.fromisoformat(date) if date else dt.date.today())
    registry = scorer.load_registry(registry_path)
    out = pathlib.Path(out_dir)

    dep = registry.get("deployment") or {}
    print(f"\n{c('ENGAGEMENT', BOLD)}  {dep.get('organisation','—')} — "
          f"{dep.get('site') or dep.get('id','—')}\n")

    total = 6
    step(1, total, "scoring registry")
    rep = scorer.score(registry, today)
    crit = sum(1 for f in rep.findings if f.severity == "critical")
    lname = {0: "Non-conforming", 1: "Level 1 — Inventoried",
             2: "Level 2 — Governed", 3: "Level 3 — Certified"}[rep.level]
    colour = OK if rep.level >= 2 else (WARN_C if rep.level == 1 else BAD)
    print(f"        result: {c(lname, colour)} · GAR {rep.gar:.1%} · "
          f"{len(rep.findings)} finding(s), {crit} critical")

    step(2, total, f"creating {out}/")
    out.mkdir(parents=True, exist_ok=True)

    step(3, total, "generating assessment report")
    (out / "00-assessment-report.md").write_text(
        scorer.render_report(rep, registry, today), encoding="utf-8")

    step(4, total, f"generating {len(rep.findings)} finding letter(s)")
    written = []
    for i, f in enumerate(rep.findings, 1):
        name = f"01-finding-NCF-{i:03d}-{f.severity}.md"
        (out / name).write_text(finding_letter(i, f, rep, registry, today), encoding="utf-8")
        written.append(name)

    step(5, total, "generating certificate decision")
    cert_name, cert_body = certificate(rep, registry, today, crit)
    (out / cert_name).write_text(cert_body, encoding="utf-8")
    verdict = "WITHHELD" if "withheld" in cert_name else "ISSUED"
    print(f"        certificate: {c(verdict, BAD if verdict == 'WITHHELD' else OK)}")

    step(6, total, "writing manifest")
    manifest = {
        "standard": f"UAS-1:v{scorer.UAS_VERSION}",
        "generated": today.isoformat(),
        "registry": {"path": registry_path, "version": rep.registry_version},
        "deployment": {"organisation": dep.get("organisation"),
                       "site": dep.get("site") or dep.get("id"),
                       "system": dep.get("system")},
        "result": {"conformance_level": rep.level, "label": lname,
                   "gar": round(rep.gar, 4),
                   "gar_by_tier": {str(k): round(v, 4) for k, v in rep.gar_by_tier.items()},
                   "actuators": rep.total_actuators},
        "findings": {"total": len(rep.findings),
                     "critical": crit,
                     "major": sum(1 for f in rep.findings if f.severity == "major"),
                     "minor": sum(1 for f in rep.findings if f.severity == "minor")},
        "certificate": {"issued": verdict == "ISSUED", "document": cert_name},
        "documents": ["00-assessment-report.md"] + written + [cert_name],
        "limitations": [
            "Covers only enumerated actuators; enumeration is performed by people.",
            "Does not assess model quality, accuracy, or fairness within rated capacity.",
            "Does not address malicious action by a properly authorised human.",
            "No conformance level under this standard eliminates risk (Clause 10.5.2).",
            "Level 3 requires independent verification and a licensed PE signature, "
            "which no automated tool can supply.",
        ],
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"\n  {c('PACKAGE COMPLETE', OK)}  {len(manifest['documents']) + 1} documents in {out}/\n")
    for d in manifest["documents"]:
        print(f"    {DIM}·{RESET} {d}")
    print(f"    {DIM}·{RESET} manifest.json\n")

    if crit:
        print(f"  {c('Deliver criticals in person.', WARN_C)} A Tier 1 actuator held by "
              f"a procedure is not a paperwork finding.\n")
    return 0 if rep.level >= 1 else 1


def main() -> int:
    ap = argparse.ArgumentParser(
        prog="pipeline", description="Engagement pipeline for UAS-1:v0.1.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("preflight", help="run every self-check")

    e = sub.add_parser("engagement", help="produce the full deliverable package")
    e.add_argument("registry", help="path to the site actuator registry JSON")
    e.add_argument("--out", default="./engagement-output", help="output directory")
    e.add_argument("--date", help="assessment date YYYY-MM-DD (default: today)")

    a = ap.parse_args()
    if a.cmd == "preflight":
        return preflight()
    return engagement(a.registry, a.out, a.date)


if __name__ == "__main__":
    sys.exit(main())
