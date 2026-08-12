#!/usr/bin/env python3
"""Validate a proposed panel before any role runs.

Usage:
    python3 panel.py --intent readiness|direction \
        --surfaces contract,signals \
        --role qa-sdet --role executive:margin

The judgment is declared by the caller. This script only holds the caller
to the consequences of that judgment:

  * `--intent`  classifies the question. It gates the generative posture and
    the `identity` accountability, neither of which can be justified by the
    diff alone.
  * `--surfaces` names what the diff actually touches. An executive is seated
    only when the diff contains the surface their accountability reads.

Exit 0 prints the panel and the profiles to read. Exit 1 lists every
violation.

`--list` prints the roles by square and exits.
"""

import argparse
import os
import sys

import roles as roles_mod

# Panel rules live in roles.py, the one rulebook both scripts enforce.
MAX_PANEL = roles_mod.MAX_PANEL
MIN_PANEL = roles_mod.MIN_PANEL
SINGLE_PANEL = roles_mod.SINGLE_PANEL
MAX_GENERATIVE = roles_mod.MAX_GENERATIVE
READINESS_SAFE_GENERATIVE = roles_mod.READINESS_SAFE_GENERATIVE


class Seat:
    def __init__(self, slug, accountability, role):
        self.slug = slug
        self.accountability = accountability
        self.role = role

    @property
    def name(self):
        if self.accountability:
            return f"{self.slug}:{self.accountability}"
        return self.slug

    @property
    def spec(self):
        if self.accountability:
            return self.role.accountabilities[self.accountability]
        return {"horizons": self.role.horizons, "surface": self.role.surface}

    @property
    def is_executive(self):
        return bool(self.accountability)

    @property
    def profile(self):
        return self.role.profiles.get(self.accountability)


def seat_roles(specs, known, errors):
    seats = []
    for spec in specs:
        slug, accountability = roles_mod.resolve(spec, known)
        if not slug:
            errors.append(f"--role {spec}: no profile matches")
            continue
        role = known[slug]
        if role.is_open_set and not accountability:
            names = ", ".join(sorted(role.accountabilities))
            errors.append(f"--role {spec}: '{slug}' needs an accountability "
                          f"({names}), as in {slug}:margin")
            continue
        if accountability and not role.is_open_set:
            errors.append(f"--role {spec}: '{slug}' takes no accountability")
            continue
        if accountability and accountability not in role.accountabilities:
            names = ", ".join(sorted(role.accountabilities))
            errors.append(
                f"--role {spec}: '{slug}' has no accountability "
                f"'{accountability}'. Defined: {names}. To add one, create "
                f"role-profiles/{slug}-{accountability}.md with frontmatter.")
            continue
        seats.append(Seat(slug, accountability, role))
    return seats


def check_panel(seats, intent, surfaces, single=False):
    errors = []

    names = [s.name for s in seats]
    for name in set(names):
        if names.count(name) > 1:
            errors.append(f"{name} is seated more than once")

    # --single serves the `--role=<name>` flag, where the user asked for one
    # named reviewer. Coverage is not the goal, so the floor drops to 1.
    floor = SINGLE_PANEL if single else MIN_PANEL
    if not floor <= len(seats) <= MAX_PANEL:
        was = "role is" if len(seats) == 1 else "roles are"
        errors.append(f"a panel is {floor} to {MAX_PANEL} roles, "
                      f"but {len(seats)} {was} seated")
    if single and len(seats) > 1:
        errors.append("--single seats exactly one role, but "
                      f"{len(seats)} are named")

    practitioners = [s for s in seats if not s.is_executive]
    executives = [s for s in seats if s.is_executive]

    # An all-executive panel cannot cite the diff, and the evidence rule
    # would suppress its findings anyway. Under --single the user named the
    # one seat, so the rule is a tautology they already accepted.
    if executives and not practitioners and not single:
        errors.append("no practitioner on the panel: at least one role must "
                      "read the diff directly")

    # Two practitioners matching on all four axes see the same thing.
    squares = {}
    for seat in practitioners:
        squares.setdefault(seat.role.square(), []).append(seat.name)
    for square, members in squares.items():
        if len(members) > 1:
            errors.append(f"redundant on all four axes "
                          f"({'/'.join([square[0], '+'.join(square[1]),
                                        square[2], square[3]])}): "
                          f"{', '.join(sorted(members))}")

    # Executives are separated by accountability, never by axes.
    seen = {}
    for seat in executives:
        seen.setdefault(seat.accountability, []).append(seat.name)
    for accountability, members in seen.items():
        if len(members) > 1:
            errors.append(f"accountability '{accountability}' is seated "
                          f"{len(members)} times")

    # Surface gating. The count of executives falls out of the diff.
    for seat in executives:
        surface = seat.spec["surface"]
        if not surface:
            if intent != "direction":
                errors.append(
                    f"{seat.name}: this accountability reads no surface in "
                    f"the diff, so it needs --intent direction")
        elif surfaces and surface not in surfaces:
            errors.append(
                f"{seat.name}: reads '{surface}', which --surfaces does not "
                f"list ({', '.join(sorted(surfaces))})")
        elif not surfaces:
            errors.append(f"{seat.name}: --surfaces is required to seat "
                          "an executive")

    surfaceless = [s for s in executives if not s.spec["surface"]]
    if len(surfaceless) > 1:
        errors.append("at most one accountability without a surface: "
                      + ", ".join(sorted(s.name for s in surfaceless)))

    # Generative posture. Every one of these rules balances a generative role
    # against the defensive panel around it, so none of them applies when the
    # user asked for one named role and there is no panel to balance.
    generative = [s for s in seats if s.role.posture == "generative"]
    defensive = [s for s in seats if s.role.posture == "defensive"]
    if not single:
        if len(generative) > MAX_GENERATIVE:
            errors.append(f"at most {MAX_GENERATIVE} generative roles, "
                          f"but {len(generative)} are seated")
        if generative and len(generative) > len(defensive):
            errors.append(f"{len(generative)} generative outnumber "
                          f"{len(defensive)} defensive: add a defensive role "
                          f"or drop a generative one")
        if intent == "readiness":
            for seat in generative:
                if seat.slug not in READINESS_SAFE_GENERATIVE:
                    errors.append(f"{seat.name}: generative roles need "
                                  "--intent direction")

    # Declared exclusions the axes do not capture.
    seated = {s.slug for s in seats}
    for left, right in roles_mod.EXCLUSIVE_PAIRS:
        if left in seated and right in seated:
            errors.append(f"{left} and {right} never run on the same panel")

    return errors


def print_list(known):
    for posture in ("defensive", "generative"):
        print(posture.upper())
        rows = [r for r in known.values()
                if r.posture == posture and not r.is_open_set]
        for vantage in ("internal", "external", "strategic"):
            for horizon in ("now", "soon", "later"):
                hits = [f"{r.slug}({r.surface})" for r in sorted(
                    rows, key=lambda r: r.slug)
                    if r.vantage == vantage and horizon in r.horizons]
                if hits:
                    print(f"  {horizon:6}/{vantage:9} " + "  ".join(hits))
        print()
    for role in known.values():
        if role.is_open_set:
            print(f"{role.slug.upper()} (seated by accountability)")
            for name, spec in sorted(role.accountabilities.items()):
                surface = spec["surface"] or "— no diff surface"
                print(f"  {name:11} {'+'.join(spec['horizons']):11} {surface}")

    # Two roles sharing a square can never sit on the same panel, so an
    # author adding a role needs to see the clash here.
    squares = {}
    for role in known.values():
        if not role.is_open_set:
            squares.setdefault(role.square(), []).append(role.slug)
    clashes = {k: v for k, v in squares.items() if len(v) > 1}
    print()
    if clashes:
        print("COLLISIONS (these roles can never share a panel)")
        for square, members in clashes.items():
            print(f"  {square[0]}/{'+'.join(square[1])}/{square[2]}/"
                  f"{square[3]}: {', '.join(sorted(members))}")
    else:
        print("No collisions: every role differs from every other "
              "on at least one axis.")


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--role", action="append", default=[],
                        metavar="SLUG[:ACCOUNTABILITY]")
    parser.add_argument("--intent", choices=("readiness", "direction"),
                        default="readiness",
                        help="what the question asks for")
    parser.add_argument("--surfaces", default="",
                        help="comma-separated surfaces the diff touches")
    parser.add_argument("--list", action="store_true",
                        help="print the roles by square and exit")
    parser.add_argument("--single", action="store_true",
                        help="seat exactly one named role, for the "
                             "--role=<name> flag. Drops the panel floor to 1 "
                             "and skips the rules that balance one role "
                             "against the rest of a panel.")
    args = parser.parse_args()

    known = roles_mod.load_roles()
    broken = roles_mod.validate_definitions(known)
    if broken:
        print("Broken role definitions:", file=sys.stderr)
        for problem in broken:
            print(f"  - {problem}", file=sys.stderr)
        return 2

    if args.list:
        print_list(known)
        return 0

    surfaces = {s.strip() for s in args.surfaces.split(",") if s.strip()}
    unknown = surfaces - set(roles_mod.SURFACES)
    errors = [f"--surfaces: '{s}' is not a known surface" for s in
              sorted(unknown)]

    seats = seat_roles(args.role, known, errors)
    if not errors or seats:
        errors.extend(check_panel(seats, args.intent, surfaces,
                                  single=args.single))

    if errors:
        print("Panel rejected. Correct these and run again:", file=sys.stderr)
        for error in dict.fromkeys(errors):
            print(f"  - {error}", file=sys.stderr)
        return 1

    label = "Single role" if args.single else f"Panel accepted ({args.intent})"
    print(f"{label}. Read these profiles:")
    for seat in seats:
        spec = seat.spec
        surface = spec["surface"] or "no diff surface"
        print(f"  {seat.name:32} {seat.role.posture:10} "
              f"{'+'.join(spec['horizons']):11} {seat.role.vantage:10} "
              f"{surface:10} {os.path.relpath(seat.profile)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())