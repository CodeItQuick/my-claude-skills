#!/usr/bin/env python3
"""Tests for panel.py.

Run from this directory:

    python3 test_panel.py

The rules under test are about panel composition, so almost every test
builds its own roles instead of reading role-profiles/. A rule test then
fails when the rule changes, not when a profile changes. The CLI tests at
the bottom are the exception. They run the real script over the real
profiles, so they cover the wiring the unit tests skip.
"""

import os
import subprocess
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import panel  # noqa: E402
import roles as roles_mod  # noqa: E402

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "panel.py")


def practitioner(slug, posture="defensive", horizon=("now",),
                 vantage="internal", surface="behavior"):
    """A closed-set role, seated by its axes."""
    role = roles_mod.Role(slug, {
        "posture": posture,
        "horizon": list(horizon),
        "vantage": vantage,
        "surface": surface,
    })
    role.profiles[None] = f"role-profiles/{slug}.md"
    return role


def open_set(slug="executive", posture="defensive", vantage="strategic",
             **accountabilities):
    """An open-set role. Each keyword is `name=surface`, or `name=None`.

    `None` means the accountability reads no surface in the diff.
    """
    role = roles_mod.Role(slug, {"posture": posture, "vantage": vantage})
    for name, surface in accountabilities.items():
        role.add_accountability(
            name,
            {"horizon": ["soon"], "surface": surface or "none"},
            f"role-profiles/{slug}-{name}.md")
    return role


def seat(role, accountability=None):
    return panel.Seat(role.slug, accountability, role)


def two_practitioners():
    """The smallest legal panel, for tests that only need a floor."""
    return [seat(practitioner("qa-sdet")),
            seat(practitioner("support", surface="words"))]


class MatchMixin:
    def assertHasError(self, errors, fragment):
        joined = "\n".join(errors)
        self.assertIn(fragment, joined)

    def assertNoError(self, errors, fragment):
        joined = "\n".join(errors)
        self.assertNotIn(fragment, joined)


class SeatTest(unittest.TestCase):
    def test_practitioner_name_is_the_slug(self):
        self.assertEqual(seat(practitioner("qa-sdet")).name, "qa-sdet")

    def test_executive_name_carries_the_accountability(self):
        role = open_set(margin="signals")
        self.assertEqual(seat(role, "margin").name, "executive:margin")

    def test_practitioner_spec_comes_from_the_role(self):
        spec = seat(practitioner("qa-sdet")).spec
        self.assertEqual(spec, {"horizons": ("now",), "surface": "behavior"})

    def test_executive_spec_comes_from_the_accountability(self):
        role = open_set(margin="signals", revenue="pitch")
        self.assertEqual(seat(role, "margin").spec["surface"], "signals")
        self.assertEqual(seat(role, "revenue").spec["surface"], "pitch")

    def test_only_an_accountability_makes_a_seat_executive(self):
        self.assertFalse(seat(practitioner("qa-sdet")).is_executive)
        self.assertTrue(seat(open_set(margin="signals"), "margin")
                        .is_executive)

    def test_profile_path_follows_the_accountability(self):
        self.assertEqual(seat(practitioner("qa-sdet")).profile,
                         "role-profiles/qa-sdet.md")
        role = open_set(margin="signals")
        self.assertEqual(seat(role, "margin").profile,
                         "role-profiles/executive-margin.md")


class SeatRolesTest(unittest.TestCase, MatchMixin):
    def setUp(self):
        self.known = {
            "qa-sdet": practitioner("qa-sdet"),
            "executive": open_set(margin="signals", identity=None),
        }

    def seat_them(self, *specs):
        errors = []
        seats = panel.seat_roles(list(specs), self.known, errors)
        return seats, errors

    def test_a_known_role_is_seated(self):
        seats, errors = self.seat_them("qa-sdet", "executive:margin")
        self.assertEqual([s.name for s in seats],
                         ["qa-sdet", "executive:margin"])
        self.assertEqual(errors, [])

    def test_an_unknown_role_is_rejected(self):
        seats, errors = self.seat_them("nonesuch")
        self.assertEqual(seats, [])
        self.assertHasError(errors, "--role nonesuch: no profile matches")

    def test_an_open_set_role_needs_an_accountability(self):
        seats, errors = self.seat_them("executive")
        self.assertEqual(seats, [])
        self.assertHasError(errors, "needs an accountability")
        self.assertHasError(errors, "identity, margin")

    def test_a_closed_role_takes_no_accountability(self):
        seats, errors = self.seat_them("qa-sdet:margin")
        self.assertEqual(seats, [])
        self.assertHasError(errors, "'qa-sdet' takes no accountability")

    def test_an_undefined_accountability_names_the_file_to_create(self):
        seats, errors = self.seat_them("executive:growth")
        self.assertEqual(seats, [])
        self.assertHasError(errors, "has no accountability 'growth'")
        self.assertHasError(errors, "role-profiles/executive-growth.md")

    def test_one_bad_role_does_not_drop_the_good_ones(self):
        seats, errors = self.seat_them("qa-sdet", "nonesuch")
        self.assertEqual([s.name for s in seats], ["qa-sdet"])
        self.assertEqual(len(errors), 1)


class PanelSizeTest(unittest.TestCase, MatchMixin):
    def test_the_floor_is_two_roles(self):
        errors = panel.check_panel([seat(practitioner("qa-sdet"))],
                                   "readiness", set())
        self.assertHasError(errors, "a panel is 2 to 4 roles, "
                                    "but 1 role is seated")

    def test_the_ceiling_is_four_roles(self):
        seats = [seat(practitioner(f"role-{i}", surface=s)) for i, s in
                 enumerate(("behavior", "words", "flow", "habit", "pitch"))]
        errors = panel.check_panel(seats, "readiness", set())
        self.assertHasError(errors, "but 5 roles are seated")

    def test_a_panel_of_two_passes(self):
        errors = panel.check_panel(two_practitioners(), "readiness", set())
        self.assertEqual(errors, [])

    def test_single_drops_the_floor_to_one(self):
        errors = panel.check_panel([seat(practitioner("qa-sdet"))],
                                   "readiness", set(), single=True)
        self.assertEqual(errors, [])

    def test_single_refuses_a_second_role(self):
        errors = panel.check_panel(two_practitioners(), "readiness", set(),
                                   single=True)
        self.assertHasError(errors, "--single seats exactly one role, "
                                    "but 2 are named")

    def test_a_role_is_seated_only_once(self):
        role = practitioner("qa-sdet")
        errors = panel.check_panel([seat(role), seat(role)], "readiness",
                                   set())
        self.assertHasError(errors, "qa-sdet is seated more than once")


class PractitionerRuleTest(unittest.TestCase, MatchMixin):
    def test_an_all_executive_panel_is_rejected(self):
        role = open_set(margin="signals", revenue="pitch")
        seats = [seat(role, "margin"), seat(role, "revenue")]
        errors = panel.check_panel(seats, "readiness", {"signals", "pitch"})
        self.assertHasError(errors, "no practitioner on the panel")

    def test_one_practitioner_satisfies_the_rule(self):
        role = open_set(margin="signals")
        seats = [seat(practitioner("qa-sdet")), seat(role, "margin")]
        errors = panel.check_panel(seats, "readiness",
                                   {"signals", "behavior"})
        self.assertEqual(errors, [])

    def test_single_waives_the_practitioner_rule(self):
        role = open_set(margin="signals")
        errors = panel.check_panel([seat(role, "margin")], "readiness",
                                   {"signals"}, single=True)
        self.assertEqual(errors, [])


class RedundancyTest(unittest.TestCase, MatchMixin):
    def test_two_practitioners_on_one_square_are_redundant(self):
        seats = [seat(practitioner("qa-sdet")),
                 seat(practitioner("api-first-customer"))]
        errors = panel.check_panel(seats, "readiness", set())
        self.assertHasError(errors, "redundant on all four axes")
        self.assertHasError(errors, "api-first-customer, qa-sdet")

    def test_one_differing_axis_is_enough(self):
        seats = [seat(practitioner("qa-sdet")),
                 seat(practitioner("support", vantage="external"))]
        errors = panel.check_panel(seats, "readiness", set())
        self.assertEqual(errors, [])

    def test_executives_are_not_compared_on_axes(self):
        role = open_set(margin="signals", foundation="structure")
        seats = [seat(practitioner("qa-sdet")), seat(role, "margin"),
                 seat(role, "foundation")]
        errors = panel.check_panel(seats, "readiness",
                                   {"signals", "structure", "behavior"})
        self.assertEqual(errors, [])

    def test_one_accountability_is_seated_once(self):
        # Two open sets that share an accountability name. The seat names
        # differ, so only the accountability rule can catch this.
        board = open_set("board", margin="signals")
        exec_role = open_set(margin="signals")
        seats = [seat(practitioner("qa-sdet")), seat(board, "margin"),
                 seat(exec_role, "margin")]
        errors = panel.check_panel(seats, "readiness",
                                   {"signals", "behavior"})
        self.assertHasError(errors, "accountability 'margin' is seated "
                                    "2 times")


class SurfaceGateTest(unittest.TestCase, MatchMixin):
    def setUp(self):
        self.role = open_set(margin="signals", identity=None,
                             foundation=None)

    def panel_with(self, *seats_, intent="readiness", surfaces=()):
        seats = [seat(practitioner("qa-sdet"))] + list(seats_)
        return panel.check_panel(seats, intent, set(surfaces))

    def test_an_executive_needs_the_surface_in_the_diff(self):
        errors = self.panel_with(seat(self.role, "margin"),
                                 surfaces=("behavior",))
        self.assertHasError(errors, "executive:margin: reads 'signals', "
                                    "which --surfaces does not list")

    def test_the_surface_in_the_diff_seats_the_executive(self):
        errors = self.panel_with(seat(self.role, "margin"),
                                 surfaces=("behavior", "signals"))
        self.assertEqual(errors, [])

    def test_an_executive_needs_surfaces_at_all(self):
        errors = self.panel_with(seat(self.role, "margin"))
        self.assertHasError(errors, "--surfaces is required to seat "
                                    "an executive")

    def test_a_surfaceless_accountability_needs_intent_direction(self):
        errors = self.panel_with(seat(self.role, "identity"),
                                 surfaces=("behavior",))
        self.assertHasError(errors, "executive:identity: this accountability "
                                    "reads no surface in the diff")

    def test_intent_direction_seats_a_surfaceless_accountability(self):
        errors = self.panel_with(seat(self.role, "identity"),
                                 intent="direction", surfaces=("behavior",))
        self.assertEqual(errors, [])

    def test_at_most_one_surfaceless_accountability(self):
        errors = self.panel_with(seat(self.role, "identity"),
                                 seat(self.role, "foundation"),
                                 intent="direction", surfaces=("behavior",))
        self.assertHasError(errors, "at most one accountability without "
                                    "a surface: executive:foundation, "
                                    "executive:identity")


class GenerativePostureTest(unittest.TestCase, MatchMixin):
    def generative(self, slug, surface="flow"):
        return seat(practitioner(slug, posture="generative", surface=surface))

    def test_at_most_two_generative_roles(self):
        seats = [self.generative("toolsmith"),
                 self.generative("innovation-lead", surface="structure"),
                 self.generative("launch-editor", surface="words"),
                 seat(practitioner("qa-sdet"))]
        errors = panel.check_panel(seats, "direction", set())
        self.assertHasError(errors, "at most 2 generative roles, "
                                    "but 3 are seated")

    def test_generative_roles_never_outnumber_defensive_ones(self):
        seats = [self.generative("toolsmith"),
                 self.generative("innovation-lead", surface="structure"),
                 seat(practitioner("qa-sdet"))]
        errors = panel.check_panel(seats, "direction", set())
        self.assertHasError(errors, "2 generative outnumber 1 defensive")

    def test_an_even_split_is_allowed(self):
        seats = [self.generative("toolsmith"), seat(practitioner("qa-sdet"))]
        errors = panel.check_panel(seats, "direction", set())
        self.assertEqual(errors, [])

    def test_a_readiness_review_refuses_a_generative_role(self):
        seats = [self.generative("toolsmith"), seat(practitioner("qa-sdet"))]
        errors = panel.check_panel(seats, "readiness", set())
        self.assertHasError(errors, "toolsmith: generative roles need "
                                    "--intent direction")

    def test_a_readiness_safe_generative_role_stays(self):
        seats = [self.generative("launch-editor", surface="words"),
                 seat(practitioner("qa-sdet"))]
        errors = panel.check_panel(seats, "readiness", set())
        self.assertEqual(errors, [])

    def test_single_waives_every_balance_rule(self):
        errors = panel.check_panel([self.generative("toolsmith")],
                                   "readiness", set(), single=True)
        self.assertEqual(errors, [])


class ExclusivePairTest(unittest.TestCase, MatchMixin):
    def test_a_declared_pair_never_shares_a_panel(self):
        left, right = roles_mod.EXCLUSIVE_PAIRS[0]
        seats = [seat(practitioner(left, surface="structure")),
                 seat(practitioner(right, surface="flow"))]
        errors = panel.check_panel(seats, "direction", set())
        self.assertHasError(errors,
                            f"{left} and {right} never run on the same panel")

    def test_one_of_the_pair_is_fine(self):
        left, _ = roles_mod.EXCLUSIVE_PAIRS[0]
        seats = [seat(practitioner(left, surface="structure")),
                 seat(practitioner("qa-sdet"))]
        errors = panel.check_panel(seats, "direction", set())
        self.assertEqual(errors, [])


class CommandLineTest(unittest.TestCase):
    """End-to-end runs against the real role-profiles/ directory."""

    def run_panel(self, *args):
        return subprocess.run([sys.executable, SCRIPT, *args],
                              capture_output=True, text=True,
                              encoding="utf-8")

    def test_list_exits_zero_and_prints_the_squares(self):
        result = self.run_panel("--list")
        self.assertEqual(result.returncode, 0)
        self.assertIn("DEFENSIVE", result.stdout)
        self.assertIn("GENERATIVE", result.stdout)
        self.assertIn("EXECUTIVE (seated by accountability)", result.stdout)

    def test_a_valid_panel_prints_the_profiles_to_read(self):
        result = self.run_panel("--role", "qa-sdet",
                                "--role", "product-manager")
        self.assertEqual(result.returncode, 0)
        self.assertIn("Panel accepted (readiness)", result.stdout)
        self.assertIn("qa-sdet.md", result.stdout)
        self.assertIn("product-manager.md", result.stdout)

    def test_single_labels_the_output_differently(self):
        result = self.run_panel("--single", "--role", "qa-sdet")
        self.assertEqual(result.returncode, 0)
        self.assertIn("Single role. Read these profiles:", result.stdout)

    def test_an_unknown_surface_is_rejected(self):
        result = self.run_panel("--role", "qa-sdet",
                                "--role", "product-manager",
                                "--surfaces", "contract,nonesuch")
        self.assertEqual(result.returncode, 1)
        self.assertIn("'nonesuch' is not a known surface", result.stderr)

    def test_a_rejected_panel_reports_on_stderr(self):
        result = self.run_panel("--role", "qa-sdet")
        self.assertEqual(result.returncode, 1)
        self.assertIn("Panel rejected", result.stderr)
        self.assertEqual(result.stdout, "")

    def test_an_unknown_intent_is_refused_by_the_parser(self):
        result = self.run_panel("--role", "qa-sdet", "--intent", "vibes")
        self.assertEqual(result.returncode, 2)

    def test_errors_are_printed_once(self):
        result = self.run_panel("--role", "nonesuch", "--role", "nonesuch")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stderr.count("no profile matches"), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)