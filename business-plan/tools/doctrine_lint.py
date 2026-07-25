#!/usr/bin/env python3
"""
doctrine_lint — mechanical enforcement of the rules in 04-DOCTRINE.md §5.

A written rule against overclaiming is an administrative control. This is the
engineering control: it fails, rather than reminding someone to be careful.

C-1 in 01-CORRECTIONS.md notes that the pull toward "100%" resurfaces in every
draft, because it is what a nervous buyer wants to hear. That is exactly the
class of recurring human error a control is supposed to absorb.

    python3 business-plan/tools/doctrine_lint.py [--path DIR]

Exit 0 clean, 1 violations found, 2 nothing scanned.
Standard library only.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

# Files whose job is to discuss the retired language. Occurrences here are
# citations, not usage.
META_FILES = {"01-CORRECTIONS.md", "04-DOCTRINE.md"}

# Retired vocabulary — 04-DOCTRINE.md §3.2
RETIRED = [
    (r"predictive drift", "use 'fabricated output' — 'drift' already denotes distribution shift in ML"),
    (r"high[- ]velocity compilation", "use 'high-velocity pattern matching' — inference is not compilation"),
    (r"pierc\w* the corporate veil", "wrong mechanism — use director/officer liability, duty of care"),
    (r"unlocking capex", "AI spend is OpEx"),
    (r"osha for ai", "OSHA is a federal enforcement agency; you can be UL"),
    (r"statistical calculator", "undersells capability — concede capability, deny agency"),
    (r"every possible decision tree", "combinatorially impossible — claim the action space, which is finite"),
]

# Absolute claims — 04-DOCTRINE.md §5 rule 1, standard Clause 10.5.2.
# The single most consequential rule: these are uninsurable, they are express
# warranties, and they are the overclaiming the doctrine exists to attack.
ABSOLUTE = [
    (r"100\s*%\s*(mitigation|prevention|safe|secure|reliab\w+)", "no claim of completeness"),
    (r"zero\s+(catastrophic|risk|failure|chance)", "residual risk is bounded and rated, never zero"),
    (r"\beliminat\w+\s+(the\s+)?(risk|failure|possibility)", "risk is bounded, not eliminated"),
    (r"\bunbreakable\b", "no absolute claims"),
    (r"\bnever\s+fails?\b", "no absolute claims"),
    (r"\bguarantee\w*\s+(safety|no\s|zero)", "guarantee mitigation of enumerated modes, not safety"),
    (r"\bfoolproof\b", "no absolute claims"),
    (r"\bcompletely\s+(safe|prevents?|eliminat\w+)", "no absolute claims"),
]

# §5 rule 2 — a named person plus a quoted string is a sourcing risk.
QUOTED_ATTRIBUTION = re.compile(
    r"\b(said|stated|told|claimed|according to)\b[^.\n]{0,60}[\"“]", re.I
)


NEGATION = re.compile(
    r"\b(no|not|never|nothing|none|cannot|can't|won't|shall not|does not|"
    r"do not|doesn't|don't|without|forbid\w*|prohibit\w*|refus\w*|"
    r"disclaim\w*|nor)\b",
    re.I,
)


def is_negated(line: str, match: re.Match) -> bool:
    """True if the claim is being denied rather than made.

    'No conformance level eliminates risk' must not be flagged as an absolute
    claim — it is the sentence that prevents one. Scoped to the current
    sentence so a negation two sentences earlier does not launder a real claim.
    """
    before = line[: match.start()]
    sentence_start = max(
        (before.rfind(p) for p in (". ", "! ", "? ", "; ", ": ", "— ", "—")),
        default=-1,
    )
    return bool(NEGATION.search(before[sentence_start + 1 :]))


def is_quoted(line: str, match: re.Match) -> bool:
    """True if the match sits inside quotation marks, a table cell listing
    retired terms, or a markdown blockquote — i.e. it is being cited."""
    s, e = match.span()
    before, after = line[:s], line[e:]
    if before.count('"') % 2 or before.count("“") > before.count("”"):
        return True
    for q in ('"', "'", "“", "”", "`", "*"):
        if before.rstrip().endswith(q) and after.lstrip().startswith(tuple('"\'“”`*,.)')):
            return True
    return line.lstrip().startswith((">", "|"))


def scan(root: pathlib.Path) -> tuple[list[str], int]:
    violations: list[str] = []
    files = sorted(root.rglob("*.md"))

    for path in files:
        rel = str(path.relative_to(root))
        meta = pathlib.Path(rel).name in META_FILES

        for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            for pattern, why in ABSOLUTE:
                for m in re.finditer(pattern, line, re.I):
                    if meta or is_quoted(line, m) or is_negated(line, m):
                        continue
                    violations.append(
                        f"{rel}:{n}  ABSOLUTE CLAIM  {m.group(0)!r}\n"
                        f"    {why}"
                    )
            if meta:
                continue
            for pattern, why in RETIRED:
                for m in re.finditer(pattern, line, re.I):
                    if is_quoted(line, m):
                        continue
                    violations.append(
                        f"{rel}:{n}  RETIRED TERM  {m.group(0)!r}\n"
                        f"    {why}"
                    )
            if QUOTED_ATTRIBUTION.search(line):
                violations.append(
                    f"{rel}:{n}  SOURCING  quoted statement attributed to a person\n"
                    f"    §5 rule 2 — verify against a primary transcript or cut"
                )

    # broken internal links
    for path in files:
        rel = str(path.relative_to(root))
        for link in re.findall(r"\]\(([^)#]+\.(?:md|json|py))\)", path.read_text(encoding="utf-8")):
            if not (path.parent / link).exists():
                violations.append(f"{rel}  BROKEN LINK  {link}")

    return violations, len(files)


def main() -> int:
    ap = argparse.ArgumentParser(prog="doctrine_lint")
    ap.add_argument("--path", default=str(pathlib.Path(__file__).resolve().parent.parent))
    args = ap.parse_args()

    root = pathlib.Path(args.path)
    if not root.is_dir():
        print(f"doctrine_lint: not a directory: {root}", file=sys.stderr)
        return 2

    violations, n = scan(root)
    if not n:
        print("doctrine_lint: no markdown found", file=sys.stderr)
        return 2

    if violations:
        print(f"doctrine_lint: {len(violations)} violation(s) across {n} file(s)\n")
        for v in violations:
            print(f"  {v}\n")
        return 1

    print(f"doctrine_lint: clean ({n} files)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
