#!/usr/bin/env python3
"""Validate, sort, render, and log a product-review panel run.

Usage:
    python3 emit.py --question "..." --role qa-sdet=reason [--role ...] \
        [--format report|jsonl] < findings.jsonl

An executive seat carries its accountability: --role executive:margin=reason

Findings arrive on stdin as JSONL, one object per line:
    {"criticality": "Blocking", "role": "security", "posture": "defensive",
     "observation": "...", "reasoning": "..."}

The script exits non-zero and prints every violation when a rule fails.
Nothing is logged and nothing is rendered unless all findings pass.
"""

import argparse
import datetime
import json
import os
import re
import sys

import roles as roles_mod

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILE_DIR = os.path.join(SCRIPT_DIR, "role-profiles")
LOG_DIR = os.path.join(SCRIPT_DIR, "logs")
CONFIG_FILE = os.path.join(SCRIPT_DIR, "config.json")

CRITICALITY_ORDER = {"Blocking": 0, "Suggested": 1, "Opportunity": 2}
POSTURE_OF = {"Blocking": "defensive", "Suggested": "defensive",
              "Opportunity": "generative"}
REQUIRED = ("criticality", "role", "posture", "observation", "reasoning")
SENTENCE_BREAK = re.compile(r"[.?!]\s+[A-Z(`]")
EMPTY_ROW = "| — | — | No concerns raised. | — |"


def known_roles():
    """Every seatable name, including each executive accountability."""
    names = set()
    for slug, role in roles_mod.load_roles().items():
        if role.is_open_set:
            names.update(f"{slug}:{a}" for a in role.accountabilities)
        else:
            names.add(slug)
    return names


def check_finding(finding, index, roles):
    """Return a list of rule violations for one finding."""
    errors = []
    where = f"finding {index}"

    for field in REQUIRED:
        if not str(finding.get(field, "")).strip():
            errors.append(f"{where}: field '{field}' is missing or empty")
    if errors:
        return errors

    criticality = finding["criticality"]
    posture = finding["posture"]
    role = finding["role"]

    if criticality not in CRITICALITY_ORDER:
        errors.append(f"{where}: criticality '{criticality}' is not "
                      "Blocking, Suggested, or Opportunity")
    elif POSTURE_OF[criticality] != posture:
        errors.append(f"{where}: criticality '{criticality}' needs posture "
                      f"'{POSTURE_OF[criticality]}', but the posture is "
                      f"'{posture}'")

    if posture not in ("defensive", "generative"):
        errors.append(f"{where}: posture '{posture}' is not defensive "
                      "or generative")

    if roles and role not in roles:
        errors.append(f"{where}: role '{role}' has no profile in "
                      "role-profiles/")

    for field in ("observation", "reasoning"):
        text = finding[field]
        if "\n" in text:
            errors.append(f"{where}: {field} spans more than one line")
        if "|" in text:
            errors.append(f"{where}: {field} contains '|', which breaks "
                          "the table")
        if SENTENCE_BREAK.search(text):
            errors.append(f"{where}: {field} is more than one sentence")

    return errors


def render_report(findings, question):
    lines = [f"**Panel review — {question}**", "",
             "| Criticality | Role | Observation | Reasoning |",
             "|---|---|---|---|"]
    if not findings:
        lines.append(EMPTY_ROW)
    for f in findings:
        lines.append(f"| {f['criticality']} | {f['role']} | "
                     f"{f['observation']} | {f['reasoning']} |")
    return "\n".join(lines)


def render_jsonl(findings):
    return "\n".join(json.dumps(f, ensure_ascii=False) for f in findings)


def log_run(question, roles, findings):
    try:
        if not json.load(open(CONFIG_FILE)).get("logging", False):
            return None
    except (FileNotFoundError, json.JSONDecodeError):
        return None

    counts = {"blocking": 0, "suggested": 0, "opportunity": 0}
    for f in findings:
        counts[f["criticality"].lower()] += 1

    entry = {
        "timestamp": datetime.datetime.now().strftime("%H:%M"),
        "question": question,
        "roles": roles,
        "findings": findings,
        "counts": counts,
    }

    os.makedirs(LOG_DIR, exist_ok=True)
    log_file = os.path.join(
        LOG_DIR, datetime.date.today().strftime("%Y-%m-%d") + ".jsonl")
    with open(log_file, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return log_file, counts


def main():
    # The table uses em-dashes. Windows consoles default to cp1252.
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--question", required=True,
                        help="the question the panel answered")
    parser.add_argument("--role", action="append", default=[],
                        metavar="NAME[=REASON]",
                        help="a seated role and why it was chosen, as "
                             "qa-sdet=reason or executive:margin=reason; "
                             "repeat for each role")
    parser.add_argument("--format", choices=("report", "jsonl"),
                        default="report", help="output format")
    args = parser.parse_args()

    roles = known_roles()
    errors = []

    panel = []
    for spec in args.role:
        name, _, reason = spec.partition("=")
        name = name.strip()
        if roles and name not in roles:
            errors.append(f"--role {name}: not a seatable role")
        panel.append({"role": name, "reason": reason.strip()})

    # SINGLE_PANEL, not MIN_PANEL: a --single run legitimately seats one role,
    # and this script cannot see that flag. panel.py holds the stricter line.
    if not roles_mod.SINGLE_PANEL <= len(panel) <= roles_mod.MAX_PANEL:
        errors.append(f"a panel is {roles_mod.SINGLE_PANEL} to "
                      f"{roles_mod.MAX_PANEL} roles, but {len(panel)} "
                      f"were given")

    findings = []
    for number, line in enumerate(sys.stdin, start=1):
        line = line.strip()
        if not line:
            continue
        try:
            finding = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"line {number}: invalid JSON ({exc.msg})")
            continue
        errors.extend(check_finding(finding, number, roles))
        findings.append(finding)

    chosen = {p["role"] for p in panel}
    for f in findings:
        if f.get("role") and f["role"] not in chosen:
            errors.append(f"finding by '{f['role']}', which is not "
                          "on the panel")

    if errors:
        print("Rejected. Correct these violations and run again:",
              file=sys.stderr)
        for error in dict.fromkeys(errors):
            print(f"  - {error}", file=sys.stderr)
        return 1

    findings.sort(key=lambda f: CRITICALITY_ORDER[f["criticality"]])

    if args.format == "jsonl":
        print(render_jsonl(findings))
    else:
        print(render_report(findings, args.question))

    logged = log_run(args.question, panel, findings)
    if logged:
        path, counts = logged
        print(f"\n[logged to {path}: {counts['blocking']} Blocking, "
              f"{counts['suggested']} Suggested, "
              f"{counts['opportunity']} Opportunity]", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())