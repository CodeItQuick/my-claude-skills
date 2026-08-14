#!/usr/bin/env python3
"""Report every role eligible to sit on a panel for one change.

Usage:
    python3 panel.py --intent readiness --surfaces contract,signals

The caller declares what the diff touches. This script answers who may
read it, and never who should. The response contract:

  * stdout is one JSON object
  * `practitioners` and `executives` hold every eligible role, never a cut
    panel
  * each entry carries `role` and `question`. `role` is the seat name, as
    `slug` or `slug:accountability`. `question` is copied from the
    frontmatter, so the caller can judge relevance without opening a
    profile.
  * exit 0 means the input was usable, whatever the size of the result

The steps below are the whole design. Read them before changing anything.
"""

import argparse
import json
import sys

import roles as roles_mod

# How to find the eligible roles. This script does not choose a panel. It
# reports every role that may sit on one. The caller then cuts the list,
# and seats at most five. That division is deliberate:
#
#   the script  answers what the frontmatter can decide. Mechanical, and
#               the same answer every run.
#   the caller  answers what only the diff can decide. Whether this change
#               holds anything for a given eligible role.
#
# So no step below judges what the diff is about. Every step is
# mechanical. Two worked examples run through the steps, and they are the
# two cases in test_panel.py:
#
#   A  --intent readiness --surfaces contract,signals
#   B  --intent readiness --surfaces words
#
# (1) Load every role and its frontmatter. Each role carries posture,
#     horizon, vantage, surface, and question. An executive carries an
#     accountability instead of a distinct square.
#
# (2) Keep the roles whose `surface` is in --surfaces. A role that reads an
#     artifact the diff does not contain has nothing to cite. This is the
#     only filter that uses the diff.
#     A keeps developer-advocate, integration-partner, platform-devex,
#     security, executive:compliance for `contract`, and
#     data-platform-scout, revenue-operations-analyst,
#     site-reliability-engineer, executive:margin for `signals`.
#     B keeps ai-prompt-engineer, launch-editor, support,
#     technical-writer, executive:brand.
#
# (3) Apply --intent to the posture. `intent` is not stored on a role. It
#     gates which posture may sit. Under `readiness`, drop every generative
#     role. Under `direction`, keep both.
#     A drops data-platform-scout and revenue-operations-analyst.
#     B drops launch-editor.
#
# (4) Split the survivors. A role with no accountability is a
#     practitioner. A role with one is an executive.
#     A: five practitioners, two executives.
#     B: three practitioners, one executive.
#
# (5) Report every survivor as an object with two keys. `role` is the seat
#     name, as `slug` or `slug:accountability`. `question` is the question
#     from the frontmatter, copied word for word. The caller cuts roles by
#     reading these questions, so a paraphrase would send the cut against
#     the wrong standard.
#
# (6) Do not rank the survivors, and do not cut the list. A has seven
#     eligible roles for at most five seats, and B has four. Both are
#     correct answers. Cutting needs the diff, which this script never
#     reads.
#
# (7) Print the JSON response and exit 0, whatever the size of the result.
#     Exit 1 only when the input is unusable: an unknown surface, an
#     unknown intent, or no eligible role at all. An eligible list too
#     large to seat is the normal case, not a failure.
#
# The `identity` accountability stays the one exception. It reads no
# surface, so step 2 never keeps it. Add it in step 4 when --intent is
# `direction`, and never otherwise.
#
# The cut itself is not this script's work, and none of its rules live
# here. The relevance test, the cap of five, the practitioner floor, one
# seat per accountability, and the excluded pairs all belong in skill.md,
# where the caller reads them.


def entry(name, question):
    """One eligible role, in the shape step 5 fixes."""
    return {"role": name, "question": question}


def eligible(known, intent, surfaces):
    """Steps 2 to 4. Returns (practitioners, executives), each sorted.

    The two filters are surface and posture, in that order. Nothing else
    removes a role, because nothing else can be decided without the diff.
    """
    practitioners = []
    executives = []
    for slug, role in sorted(known.items()):
        # Step 3. A generative role reads the diff for what should exist
        # next, which is a direction question, never a ship question.
        if intent == "readiness" and role.posture == "generative":
            continue
        if not role.is_open_set:
            # Step 2 and step 4, for a role seated by its axes.
            if role.surface in surfaces:
                practitioners.append(entry(slug, role.question))
            continue
        for accountability, spec in sorted(role.accountabilities.items()):
            name = f"{slug}:{accountability}"
            if spec["surface"]:
                if spec["surface"] in surfaces:
                    executives.append(entry(name, spec["question"]))
            elif intent == "direction":
                # The identity exception. It reads no surface, so the diff
                # can never justify it, and only a direction question can.
                executives.append(entry(name, spec["question"]))
    return practitioners, executives


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--intent", choices=("readiness", "direction"),
                        default="readiness",
                        help="what the question asks for")
    parser.add_argument("--surfaces", default="",
                        help="comma-separated surfaces the diff touches")
    args = parser.parse_args()

    # Step 1.
    known = roles_mod.load_roles()
    broken = roles_mod.validate_definitions(known)
    if broken:
        print("Broken role definitions:", file=sys.stderr)
        for problem in broken:
            print(f"  - {problem}", file=sys.stderr)
        return 2

    surfaces = {s.strip() for s in args.surfaces.split(",") if s.strip()}
    unknown = sorted(surfaces - set(roles_mod.SURFACES))
    if unknown or not surfaces:
        print("Unusable input. Correct these and run again:", file=sys.stderr)
        for surface in unknown:
            print(f"  - --surfaces: '{surface}' is not a known surface",
                  file=sys.stderr)
        if not surfaces:
            print("  - --surfaces: name at least one surface of the diff",
                  file=sys.stderr)
        return 1

    # Steps 2 to 4.
    practitioners, executives = eligible(known, args.intent, surfaces)

    # Step 7. An empty result is unusable, because no panel can follow it.
    if not practitioners and not executives:
        print(f"No role reads {', '.join(sorted(surfaces))} under "
              f"--intent {args.intent}.", file=sys.stderr)
        return 1

    # Steps 5 and 6. Every survivor, unranked and uncut.
    print(json.dumps({
        "intent": args.intent,
        "surfaces": sorted(surfaces),
        "practitioners": practitioners,
        "executives": executives,
    }, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())