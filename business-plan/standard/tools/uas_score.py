#!/usr/bin/env python3
"""
uas_score — conformance scoring for UAS-1:v0.1

Reads an actuator registry, applies the demotion rules and conformance
criteria in the standard, and reports the achieved level with the findings
that blocked anything higher.

Reference implementation, informative. Where this disagrees with the
normative text, the text governs.

    uas_score REGISTRY.json [--json] [--strict]

Exit codes:
    0   Level 1 or better
    1   Non-conforming (no level achieved)
    2   Registry invalid / unreadable
    3   --strict and Level 3 not achieved

Standard library only. No dependencies.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from dataclasses import dataclass, field
from typing import Any

UAS_VERSION = "0.1"

# Clause 7.2 — all six required to claim an engineering control.
GOVERNOR_PROPERTIES = (
    "non_inferential",
    "independent_failure_domain",
    "resource_denial",
    "fail_closed",
    "deterministic",
    "inspectable_policy",
)

# Clause 7.8.2 — proof test intervals in days, by consequence tier.
PROOF_TEST_INTERVAL_DAYS = {1: 90, 2: 180, 3: 365}

# Clause 4.3.1
REGISTRY_REVIEW_INTERVAL_DAYS = 90

CRITICAL, MAJOR, MINOR, OBSERVATION = "critical", "major", "minor", "observation"
SEVERITY_ORDER = {CRITICAL: 0, MAJOR: 1, MINOR: 2, OBSERVATION: 3}


# ---------------------------------------------------------------- findings


@dataclass
class Finding:
    severity: str
    clause: str
    actuator: str | None
    observation: str
    remediation: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "severity": self.severity,
            "clause": self.clause,
            "actuator": self.actuator,
            "observation": self.observation,
            "remediation": self.remediation,
        }


@dataclass
class Report:
    deployment: str
    organisation: str
    registry_version: str
    total_actuators: int
    gar: float
    gar_by_tier: dict[int, float]
    counts_by_tier: dict[int, int]
    counts_by_level: dict[int, int]
    demotions: list[dict[str, Any]]
    findings: list[Finding]
    level: int  # 0 = non-conforming
    blocked_by: dict[int, list[str]] = field(default_factory=dict)


# ------------------------------------------------------------ registry I/O


def load_registry(path: str) -> dict[str, Any]:
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except FileNotFoundError:
        die(f"registry not found: {path}")
    except json.JSONDecodeError as exc:
        die(f"registry is not valid JSON: {exc}")

    if not isinstance(data, dict):
        die("registry root must be an object")
    if data.get("uas_version") != UAS_VERSION:
        die(
            f"registry declares uas_version "
            f"{data.get('uas_version')!r}, this tool implements {UAS_VERSION!r}"
        )
    if not isinstance(data.get("actuators"), list) or not data["actuators"]:
        die("registry must contain a non-empty 'actuators' array")

    return data


def die(msg: str) -> None:
    print(f"uas_score: {msg}", file=sys.stderr)
    raise SystemExit(2)


def parse_date(value: Any) -> dt.date | None:
    if not value or not isinstance(value, str):
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        return None


# ------------------------------------------------------------- the scoring


def effective_level(act: dict[str, Any], today: dt.date) -> tuple[int, str | None]:
    """
    Return the control level after applying the standard's demotion rules,
    with the reason if demoted.

    Two demotions apply:
      Clause 7.2   — a level 3 claim fails if any mandatory governor
                     property is absent or false.
      Clause 7.8.4 — a governor function never proof-tested is level 2
                     until it has been.
    """
    control = act.get("control") or {}
    claimed = control.get("level")
    if not isinstance(claimed, int):
        return 0, "no control level declared"

    if claimed != 3:
        return claimed, None

    props = control.get("governor_properties") or {}
    missing = [p for p in GOVERNOR_PROPERTIES if not props.get(p)]
    if missing:
        return 2, f"Clause 7.2 — missing governor properties: {', '.join(missing)}"

    verification = act.get("verification") or {}
    result = verification.get("proof_test_result")
    last = parse_date(verification.get("last_proof_test"))
    tier = act.get("consequence_tier")

    if result == "never" or last is None:
        return 2, "Clause 7.8.4 — governor function never proof-tested"
    if result == "fail":
        return 2, "Clause 7.8.4 — last proof test failed"

    # A lapsed test is a minor finding, not a demotion: the function was
    # demonstrated to work, the demonstration is merely stale.
    if isinstance(tier, int) and tier in PROOF_TEST_INTERVAL_DAYS:
        if (today - last).days > PROOF_TEST_INTERVAL_DAYS[tier]:
            return 3, None

    return 3, None


def score(registry: dict[str, Any], today: dt.date) -> Report:
    actuators = registry["actuators"]
    deployment = registry.get("deployment") or {}
    findings: list[Finding] = []
    demotions: list[dict[str, Any]] = []

    levels: dict[str, int] = {}
    tiers: dict[str, int] = {}

    for act in actuators:
        aid = act.get("id", "<unidentified>")
        tier = act.get("consequence_tier")
        if not isinstance(tier, int):
            findings.append(
                Finding(
                    MAJOR, "5.1", aid,
                    "No consequence tier assigned.",
                    "Assign a tier. Where uncertain, assign the higher (5.1.1).",
                )
            )
            tier = 1  # uncertain resolves upward
        tiers[aid] = tier

        lvl, reason = effective_level(act, today)
        levels[aid] = lvl
        if reason:
            claimed = (act.get("control") or {}).get("level")
            demotions.append(
                {"actuator": aid, "claimed": claimed, "effective": lvl, "reason": reason}
            )

        findings.extend(check_actuator(act, aid, tier, lvl, today))

    # ---- Clause 6.3 GAR
    total = len(actuators)
    governed = sum(1 for lvl in levels.values() if lvl >= 3)
    gar = governed / total if total else 0.0

    counts_by_tier: dict[int, int] = {}
    gar_by_tier: dict[int, float] = {}
    for t in (1, 2, 3, 4):
        ids = [a for a, tv in tiers.items() if tv == t]
        counts_by_tier[t] = len(ids)
        if ids:
            gar_by_tier[t] = sum(1 for a in ids if levels[a] >= 3) / len(ids)

    counts_by_level = {lv: sum(1 for x in levels.values() if x == lv) for lv in range(6)}

    # ---- registry review currency, Clause 4.3.1
    last_review = parse_date(deployment.get("last_review"))
    if last_review is None:
        findings.append(
            Finding(
                MINOR, "4.3.1", None,
                "No registry review date recorded.",
                "Record the date of last review.",
            )
        )
    elif (today - last_review).days > REGISTRY_REVIEW_INTERVAL_DAYS:
        findings.append(
            Finding(
                MINOR, "4.3.1", None,
                f"Registry review overdue by "
                f"{(today - last_review).days - REGISTRY_REVIEW_INTERVAL_DAYS} days.",
                "Perform a review including a search for unenumerated actuators (4.3.2).",
            )
        )

    level, blocked = conformance_level(actuators, levels, tiers, findings, last_review, today)

    return Report(
        deployment=deployment.get("id", "<unnamed>"),
        organisation=deployment.get("organisation", "<unnamed>"),
        registry_version=registry.get("registry_version", "<unversioned>"),
        total_actuators=total,
        gar=gar,
        gar_by_tier=gar_by_tier,
        counts_by_tier=counts_by_tier,
        counts_by_level=counts_by_level,
        demotions=demotions,
        findings=sorted(findings, key=lambda f: (SEVERITY_ORDER[f.severity], f.clause)),
        level=level,
        blocked_by=blocked,
    )


def check_actuator(
    act: dict[str, Any], aid: str, tier: int, lvl: int, today: dt.date
) -> list[Finding]:
    out: list[Finding] = []
    control = act.get("control") or {}
    prov = act.get("provenance") or {}
    verification = act.get("verification") or {}

    # Annex C — ungoverned high-consequence actuators
    if tier == 1 and lvl < 3:
        out.append(
            Finding(
                CRITICAL, "10.1(f)", aid,
                f"Tier 1 actuator at control level {lvl}. "
                f"A death-or-disabling-injury actuator is governed by "
                f"{'nothing' if lvl == 0 else 'an administrative control or weaker'}.",
                "Apply an engineering control conforming to Clause 7.2, "
                "or eliminate the path.",
            )
        )
    elif tier == 2 and lvl < 3:
        out.append(
            Finding(
                MAJOR, "10.2(a)", aid,
                f"Tier 2 actuator at control level {lvl}.",
                "Apply an engineering control conforming to Clause 7.2.",
            )
        )

    # Clause 8.2 — provenance completeness
    missing_prov = [
        k for k in ("built_by", "authorised_by", "operated_by", "funded_by")
        if not prov.get(k)
    ]
    if missing_prov:
        out.append(
            Finding(
                MINOR, "8.2", aid,
                f"Incomplete provenance: {', '.join(missing_prov)}.",
                "Record all four attributions.",
            )
        )

    # Clause 8.3 — signature requirement
    if tier in (1, 2) and not control.get("requires_signature"):
        out.append(
            Finding(
                MAJOR, "8.3.1", aid,
                f"Tier {tier} actuator does not require a cryptographic signature.",
                "Make a signature a precondition of execution (8.3.2).",
            )
        )

    # Clause 8.4 — two-person rule
    if tier == 1 and not control.get("two_person"):
        out.append(
            Finding(
                MAJOR, "8.4.1", aid,
                "Tier 1 actuator does not require two distinct authorisers.",
                "Implement the two-person rule. Required for Level 3.",
            )
        )

    # Clause 7.6.3 — statistical detection as sole control
    stat = control.get("statistical_detection") or {}
    if tier in (1, 2) and stat.get("enabled") and lvl < 3:
        out.append(
            Finding(
                MAJOR, "7.6.3", aid,
                "Statistical detection is the strongest control on a "
                f"tier {tier} actuator.",
                "Statistical detection may supplement but never substitute "
                "for rated-capacity enforcement.",
            )
        )
    if stat.get("enabled") and stat.get("false_positive_rate") is None:
        out.append(
            Finding(
                MINOR, "7.6.2", aid,
                "Statistical detection enabled with no rated false-positive rate.",
                "Measure and record the false-positive rate over a stated period.",
            )
        )

    # Clause 7.8 — proof testing currency
    last = parse_date(verification.get("last_proof_test"))
    if lvl >= 3 and tier in PROOF_TEST_INTERVAL_DAYS and last is not None:
        overdue = (today - last).days - PROOF_TEST_INTERVAL_DAYS[tier]
        if overdue > 0:
            out.append(
                Finding(
                    MINOR, "7.8.2", aid,
                    f"Proof test overdue by {overdue} days "
                    f"(tier {tier} interval is {PROOF_TEST_INTERVAL_DAYS[tier]} days).",
                    "Proof-test the governor function and record the result.",
                )
            )

    # Clause 7.7.3 — unmeasured response time
    if lvl >= 3 and verification.get("response_time_p99_ms") is None:
        out.append(
            Finding(
                MINOR, "7.7.3", aid,
                "Response time unmeasured. Reported as unmeasured, not estimated.",
                "Measure p99 response time. Required for Level 3.",
            )
        )

    # Clause 7.7.2 — physical actuators need ISO 13855 verification
    if act.get("class") == "physical" and lvl >= 3:
        if verification.get("iso13855_verified") is not True:
            out.append(
                Finding(
                    MAJOR, "7.7.2", aid,
                    "Physical actuator without verified ISO 13855 separation.",
                    "Verify total system response against approach speed, "
                    "by measurement.",
                )
            )

    # Clause 7.4 — rated capacity on governed actuators
    if lvl >= 3:
        rc = act.get("rated_capacity") or {}
        if not rc.get("max_rate"):
            out.append(
                Finding(
                    MAJOR, "7.4.1", aid,
                    "Governed actuator with no declared maximum rate.",
                    "Declare a rated capacity and have it approved.",
                )
            )
        elif not rc.get("configuration"):
            out.append(
                Finding(
                    MINOR, "7.4.2", aid,
                    "Rated capacity declared without its configuration. "
                    "A rating without its configuration is not a rating.",
                    "State the configuration under which the rating holds.",
                )
            )

    # Clause 7.5 — trip action
    if lvl >= 3 and not control.get("trip_action"):
        out.append(
            Finding(
                MINOR, "7.5.1", aid,
                "No trip action declared.",
                "Declare alarm, trip, or lockout.",
            )
        )
    if tier == 1 and control.get("trip_action") not in (None, "lockout"):
        out.append(
            Finding(
                MAJOR, "7.5.1", aid,
                f"Tier 1 actuator declares trip action "
                f"'{control.get('trip_action')}'; any tier 1 trip requires lockout.",
                "Set trip_action to 'lockout'.",
            )
        )

    return out


def conformance_level(
    actuators: list[dict[str, Any]],
    levels: dict[str, int],
    tiers: dict[str, int],
    findings: list[Finding],
    last_review: dt.date | None,
    today: dt.date,
) -> tuple[int, dict[int, list[str]]]:
    """Highest level achieved, and what blocked each level above it."""
    blocked: dict[int, list[str]] = {1: [], 2: [], 3: []}

    # ---- Level 1
    for act in actuators:
        aid = act.get("id", "<unidentified>")
        if not isinstance(act.get("consequence_tier"), int):
            blocked[1].append(f"{aid}: no consequence tier (5.1)")
        if not isinstance((act.get("control") or {}).get("level"), int):
            blocked[1].append(f"{aid}: no control level (6.1)")
        prov = act.get("provenance") or {}
        if not all(prov.get(k) for k in ("built_by", "authorised_by", "operated_by", "funded_by")):
            blocked[1].append(f"{aid}: incomplete provenance (8.2)")
    for aid, tier in tiers.items():
        if tier == 1 and levels[aid] < 3:
            blocked[1].append(f"{aid}: tier 1 actuator ungoverned (10.1(f))")

    # ---- Level 2
    for aid, tier in tiers.items():
        if tier in (1, 2) and levels[aid] < 3:
            blocked[2].append(f"{aid}: tier {tier} below control level 3 (10.2(a))")
    for act in actuators:
        aid = act.get("id", "<unidentified>")
        control = act.get("control") or {}
        if levels.get(aid, 0) >= 3:
            if not (act.get("rated_capacity") or {}).get("approved_by"):
                blocked[2].append(f"{aid}: rated capacity unapproved (10.2(c))")
            if not control.get("trip_action"):
                blocked[2].append(f"{aid}: no trip tier (10.2(d))")
        if tiers.get(aid) in (1, 2) and not control.get("requires_signature"):
            blocked[2].append(f"{aid}: no signature requirement (10.2(f))")
        verification = act.get("verification") or {}
        if levels.get(aid, 0) >= 3 and verification.get("proof_test_result") != "pass":
            blocked[2].append(f"{aid}: proof test not passed (10.2(g))")

    # ---- Level 3
    for act in actuators:
        aid = act.get("id", "<unidentified>")
        control = act.get("control") or {}
        verification = act.get("verification") or {}
        if tiers.get(aid) == 1 and not control.get("two_person"):
            blocked[3].append(f"{aid}: two-person rule absent (10.3(a))")
        if levels.get(aid, 0) >= 3 and verification.get("response_time_p99_ms") is None:
            blocked[3].append(f"{aid}: response time unmeasured (10.3(b))")
    if last_review is None or (today - last_review).days > REGISTRY_REVIEW_INTERVAL_DAYS:
        blocked[3].append("registry review not current (10.3(e))")
    # 10.3(c) independent verification and 10.3(d) PE signature are attested
    # outside the registry and cannot be established by this tool.
    blocked[3].append("independent verification and PE signature not assessable by tool (10.3(c),(d))")

    if blocked[1]:
        return 0, blocked
    if blocked[2]:
        return 1, blocked
    if blocked[3]:
        return 2, blocked
    return 3, blocked


# ------------------------------------------------------------------ output


def bar(value: float, width: int = 24) -> str:
    filled = round(value * width)
    return "█" * filled + "·" * (width - filled)


def render(report: Report) -> str:
    L = []
    w = 68
    L.append("═" * w)
    L.append("UAS-1:v0.1 CONFORMANCE REPORT")
    L.append("═" * w)
    L.append(f"Organisation      {report.organisation}")
    L.append(f"Deployment        {report.deployment}")
    L.append(f"Registry version  {report.registry_version}")
    L.append("")

    names = {0: "NON-CONFORMING", 1: "LEVEL 1 — Inventoried",
             2: "LEVEL 2 — Governed", 3: "LEVEL 3 — Certified"}
    L.append(f"  RESULT:  {names[report.level]}")
    L.append("")

    L.append("─" * w)
    L.append("GOVERNED ACTUATOR RATIO")
    L.append("─" * w)
    L.append(f"  Overall   {bar(report.gar)}  {report.gar:6.1%}   "
             f"({report.total_actuators} actuators)")
    L.append("")
    for t in (1, 2, 3, 4):
        n = report.counts_by_tier.get(t, 0)
        if not n:
            continue
        g = report.gar_by_tier.get(t, 0.0)
        flag = "  ◀ CRITICAL" if t == 1 and g < 1.0 else ""
        L.append(f"  Tier {t}    {bar(g)}  {g:6.1%}   (n={n}){flag}")
    L.append("")

    L.append("  Control levels:  " + "  ".join(
        f"L{lv}={report.counts_by_level.get(lv, 0)}" for lv in range(5, -1, -1)
    ))
    L.append("")

    if report.demotions:
        L.append("─" * w)
        L.append("DEMOTIONS APPLIED")
        L.append("─" * w)
        for d in report.demotions:
            L.append(f"  {d['actuator']}: claimed L{d['claimed']} → effective L{d['effective']}")
            L.append(f"      {d['reason']}")
        L.append("")

    if report.findings:
        L.append("─" * w)
        L.append(f"FINDINGS ({len(report.findings)})")
        L.append("─" * w)
        current = None
        for f in report.findings:
            if f.severity != current:
                current = f.severity
                L.append("")
                L.append(f"  {f.severity.upper()}")
            target = f"[{f.actuator}] " if f.actuator else ""
            L.append(f"    · {target}Clause {f.clause}")
            L.append(f"      {f.observation}")
            L.append(f"      → {f.remediation}")
        L.append("")

    nxt = report.level + 1
    if nxt <= 3 and report.blocked_by.get(nxt):
        L.append("─" * w)
        L.append(f"BLOCKING LEVEL {nxt}")
        L.append("─" * w)
        for item in dict.fromkeys(report.blocked_by[nxt]):
            L.append(f"  · {item}")
        L.append("")

    L.append("─" * w)
    L.append("No conformance level under this standard eliminates risk.")
    L.append("A Level 3 certificate requires a residual risk statement (10.5).")
    L.append("─" * w)
    return "\n".join(L)


def main() -> int:
    ap = argparse.ArgumentParser(
        prog="uas_score",
        description="Conformance scoring for UAS-1:v0.1.",
    )
    ap.add_argument("registry", help="path to actuator registry JSON")
    ap.add_argument("--json", action="store_true", help="emit machine-readable output")
    ap.add_argument("--strict", action="store_true",
                    help="exit non-zero unless Level 3 is achieved")
    ap.add_argument("--date", help="evaluate as of this date (YYYY-MM-DD), for testing")
    args = ap.parse_args()

    today = parse_date(args.date) or dt.date.today()
    report = score(load_registry(args.registry), today)

    if args.json:
        print(json.dumps({
            "uas_version": UAS_VERSION,
            "organisation": report.organisation,
            "deployment": report.deployment,
            "registry_version": report.registry_version,
            "conformance_level": report.level,
            "total_actuators": report.total_actuators,
            "gar": round(report.gar, 4),
            "gar_by_tier": {str(k): round(v, 4) for k, v in report.gar_by_tier.items()},
            "counts_by_tier": {str(k): v for k, v in report.counts_by_tier.items()},
            "counts_by_level": {str(k): v for k, v in report.counts_by_level.items()},
            "demotions": report.demotions,
            "findings": [f.as_dict() for f in report.findings],
            "blocked_by": {str(k): sorted(set(v)) for k, v in report.blocked_by.items()},
        }, indent=2))
    else:
        print(render(report))

    if args.strict and report.level < 3:
        return 3
    return 0 if report.level >= 1 else 1


if __name__ == "__main__":
    sys.exit(main())
