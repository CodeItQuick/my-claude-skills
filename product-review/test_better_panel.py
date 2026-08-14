#!/usr/bin/env python3
"""Every role in role-profiles/, with its frontmatter, as test data.

This is a snapshot of the frontmatter of the 31 profiles, taken from the
files themselves. `role-profiles/_template.md` is excluded, because
`roles.load_roles` skips any filename that starts with an underscore.

The eight keys below are every key the profiles use. The shape is uniform,
so a test can read one key across all roles without a guard:

  file            the filename, which is not frontmatter but identifies the row
  role            the slug. Five files share the slug `executive`.
  accountability  None when the key is absent. Set only on `executive` files.
  posture         defensive or generative
  horizon         a list of now, soon, later
  vantage         internal, external, or strategic
  surface         the one artifact the role reads
  aliases         [] when the key is absent
  question        the key question of the role

Two values need care. `surface` is the literal string `"none"` for
`identity`, and `roles.Role` converts that to `""`. `aliases` and `horizon`
are lists in the frontmatter, and every other value is a string.
"""

import json
import os
import subprocess
import sys
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      "better_panel.py")

ROLES = [
    {
        "file": "ai-prompt-engineer.md",
        "role": "ai-prompt-engineer",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["now", "soon"],
        "vantage": "internal",
        "surface": "words",
        "aliases": ["prompt-engineer"],
        "question": "Is this prompt a reliable spec — or does it leave "
                    "enough ambiguity that the model will guess "
                    "inconsistently?",
    },
    {
        "file": "api-first-customer.md",
        "role": "api-first-customer",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["now"],
        "vantage": "external",
        "surface": "behavior",
        "aliases": [],
        "question": "Will the code I wrote against this API still produce "
                    "correct results?",
    },
    {
        "file": "customer-success.md",
        "role": "customer-success",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["soon"],
        "vantage": "external",
        "surface": "behavior",
        "aliases": ["cs"],
        "question": "Will existing customers still be able to do what they "
                    "came here to do?",
    },
    {
        "file": "data-platform-scout.md",
        "role": "data-platform-scout",
        "accountability": None,
        "posture": "generative",
        "horizon": ["later"],
        "vantage": "internal",
        "surface": "signals",
        "aliases": ["data-scout"],
        "question": "What did this make knowable, and what is unrecoverable "
                    "if we don't record it now?",
    },
    {
        "file": "designer-ux.md",
        "role": "designer-ux",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["soon"],
        "vantage": "external",
        "surface": "flow",
        "aliases": ["ux", "design"],
        "question": "Would someone who has never seen this know what to do?",
    },
    {
        "file": "developer-advocate.md",
        "role": "developer-advocate",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["soon"],
        "vantage": "external",
        "surface": "contract",
        "aliases": ["devrel", "advocate"],
        "question": "Would an external developer succeed with this, and would "
                    "they recommend it?",
    },
    {
        "file": "engineering-tech-lead.md",
        "role": "engineering-tech-lead",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["soon"],
        "vantage": "internal",
        "surface": "structure",
        "aliases": ["tech-lead", "eng-lead"],
        "question": "Is this the right approach?",
    },
    {
        "file": "executive-brand.md",
        "role": "executive",
        "accountability": "brand",
        "posture": "defensive",
        "horizon": ["now", "soon"],
        "vantage": "strategic",
        "surface": "words",
        "aliases": ["cmo", "brand-officer"],
        "question": "Do these words sound like us, and what do they commit "
                    "us to?",
    },
    {
        "file": "executive-compliance.md",
        "role": "executive",
        "accountability": "compliance",
        "posture": "defensive",
        "horizon": ["now"],
        "vantage": "strategic",
        "surface": "contract",
        "aliases": ["legal", "counsel", "gc"],
        "question": "Does this breach a commitment we have already made?",
    },
    {
        "file": "executive-foundation.md",
        "role": "executive",
        "accountability": "foundation",
        "posture": "defensive",
        "horizon": ["later"],
        "vantage": "strategic",
        "surface": "structure",
        "aliases": ["cto"],
        "question": "Are we building the right foundation?",
    },
    {
        "file": "executive-identity.md",
        "role": "executive",
        "accountability": "identity",
        "posture": "defensive",
        "horizon": ["later"],
        "vantage": "strategic",
        "surface": "none",
        "aliases": ["ceo", "founder"],
        "question": "Is this who we are? Is this the right investment?",
    },
    {
        "file": "executive-margin.md",
        "role": "executive",
        "accountability": "margin",
        "posture": "defensive",
        "horizon": ["soon", "later"],
        "vantage": "strategic",
        "surface": "signals",
        "aliases": ["cfo", "finance"],
        "question": "What does this cost to run, and does it affect revenue "
                    "correctly?",
    },
    {
        "file": "executive-revenue.md",
        "role": "executive",
        "accountability": "revenue",
        "posture": "defensive",
        "horizon": ["soon"],
        "vantage": "strategic",
        "surface": "pitch",
        "aliases": ["cro", "revenue-officer"],
        "question": "Does this change what we can sell, to whom, and at what "
                    "price?",
    },
    {
        "file": "growth-experimentation-lead.md",
        "role": "growth-experimentation-lead",
        "accountability": None,
        "posture": "generative",
        "horizon": ["soon"],
        "vantage": "external",
        "surface": "flow",
        "aliases": ["growth"],
        "question": "What experiment is now a config change rather than a "
                    "project?",
    },
    {
        "file": "innovation-lead.md",
        "role": "innovation-lead",
        "accountability": None,
        "posture": "generative",
        "horizon": ["later"],
        "vantage": "strategic",
        "surface": "structure",
        "aliases": [],
        "question": "What does this change make cheap that wasn't cheap "
                    "before?",
    },
    {
        "file": "integration-partner.md",
        "role": "integration-partner",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["now"],
        "vantage": "external",
        "surface": "contract",
        "aliases": [],
        "question": "Will my existing integration still work after this "
                    "ships?",
    },
    {
        "file": "launch-editor.md",
        "role": "launch-editor",
        "accountability": None,
        "posture": "generative",
        "horizon": ["now"],
        "vantage": "external",
        "surface": "words",
        "aliases": [],
        "question": "What just became true for users that nothing here tells "
                    "them?",
    },
    {
        "file": "marketing.md",
        "role": "marketing",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["later"],
        "vantage": "external",
        "surface": "pitch",
        "aliases": [],
        "question": "Does this make the product easier or harder to talk "
                    "about?",
    },
    {
        "file": "platform-capability-scout.md",
        "role": "platform-capability-scout",
        "accountability": None,
        "posture": "generative",
        "horizon": ["soon"],
        "vantage": "internal",
        "surface": "structure",
        "aliases": ["capability-scout"],
        "question": "What did this make available to the rest of the "
                    "codebase?",
    },
    {
        "file": "platform-devex.md",
        "role": "platform-devex",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["soon"],
        "vantage": "internal",
        "surface": "contract",
        "aliases": ["devex"],
        "question": "Does this make the platform better or harder to "
                    "maintain?",
    },
    {
        "file": "power-user.md",
        "role": "power-user",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["now"],
        "vantage": "external",
        "surface": "habit",
        "aliases": [],
        "question": "Did anything change about how I actually use this every "
                    "day?",
    },
    {
        "file": "product-manager.md",
        "role": "product-manager",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["soon"],
        "vantage": "strategic",
        "surface": "behavior",
        "aliases": ["pm"],
        "question": "Is this the right thing to build right now?",
    },
    {
        "file": "qa-sdet.md",
        "role": "qa-sdet",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["now"],
        "vantage": "internal",
        "surface": "behavior",
        "aliases": ["qa", "sdet"],
        "question": "Are the failure modes covered?",
    },
    {
        "file": "revenue-operations-analyst.md",
        "role": "revenue-operations-analyst",
        "accountability": None,
        "posture": "generative",
        "horizon": ["soon"],
        "vantage": "strategic",
        "surface": "signals",
        "aliases": ["revops"],
        "question": "What did this make countable, attributable, and "
                    "separable?",
    },
    {
        "file": "sales.md",
        "role": "sales",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["soon"],
        "vantage": "external",
        "surface": "pitch",
        "aliases": [],
        "question": "Does this help me win deals?",
    },
    {
        "file": "security.md",
        "role": "security",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["now"],
        "vantage": "internal",
        "surface": "contract",
        "aliases": [],
        "question": "Does this introduce an exploitable surface?",
    },
    {
        "file": "site-reliability-engineer.md",
        "role": "site-reliability-engineer",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["now"],
        "vantage": "internal",
        "surface": "signals",
        "aliases": ["sre"],
        "question": "When this breaks, will we know, and can we stop it?",
    },
    {
        "file": "support.md",
        "role": "support",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["now"],
        "vantage": "external",
        "surface": "words",
        "aliases": [],
        "question": "Will I get tickets about this?",
    },
    {
        "file": "technical-writer.md",
        "role": "technical-writer",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["soon"],
        "vantage": "external",
        "surface": "words",
        "aliases": ["writer", "docs"],
        "question": "Will a user who reads the docs be able to do what the "
                    "code now allows?",
    },
    {
        "file": "toolsmith.md",
        "role": "toolsmith",
        "accountability": None,
        "posture": "generative",
        "horizon": ["now"],
        "vantage": "internal",
        "surface": "flow",
        "aliases": [],
        "question": "What manual step did this just supply the last missing "
                    "input for?",
    },
    {
        "file": "trial-user.md",
        "role": "trial-user",
        "accountability": None,
        "posture": "defensive",
        "horizon": ["now"],
        "vantage": "external",
        "surface": "flow",
        "aliases": [],
        "question": "Can I get to value before I run out of patience?",
    },
]

# The script reports eligibility, not a seating. It returns every role that
# may sit, and the caller cuts the list to five or fewer. So these
# constants are not panels. They are the full set of valid options for one
# input, and each one is larger than the panel it will become.

# `--intent readiness --surfaces contract,signals`.
#
#   developer-advocate          contract, soon/external — the developer who adopts
#   integration-partner         contract, now/external  — the caller who breaks
#   platform-devex              contract, soon/internal — the platform that carries it
#   security                    contract, now/internal  — the exploitable surface
#   site-reliability-engineer   signals,  now/internal  — the operator on call
#   executive:compliance        contract                — the obligation already made
#   executive:margin            signals                 — the cost of running it
#
# Seven valid roles for at most five seats, so the caller must cut two.
# `data-platform-scout` and `revenue-operations-analyst` also read
# `signals`, and both are generative, so the readiness intent drops them.
ELIGIBLE_CONTRACT_SIGNALS = {
    "practitioners": [
        "developer-advocate",
        "integration-partner",
        "platform-devex",
        "security",
        "site-reliability-engineer",
    ],
    "executives": [
        "executive:compliance",
        "executive:margin",
    ],
}

# `--intent readiness --surfaces words`.
#
#   ai-prompt-engineer  words, now+soon/internal — the prompts as a spec
#   support             words, now/external      — the tickets this causes
#   technical-writer    words, soon/external     — the docs this contradicts
#   executive:brand     words                    — what the wording commits us to
#
# Four valid roles for five seats, so the caller cuts nothing. That is the
# contrast with the case above, and the reason both cases are here.
# `launch-editor` also reads `words`, and it is generative, so the
# readiness intent drops it. `executive:brand` is the only accountability
# that reads `words`.
ELIGIBLE_WORDS = {
    "practitioners": [
        "ai-prompt-engineer",
        "support",
        "technical-writer",
    ],
    "executives": [
        "executive:brand",
    ],
}


class ReadinessPanelTest(unittest.TestCase):
    """`better_panel.py` returns eligibility. These tests hold it to that."""

    def run_script(self, surfaces, intent="readiness"):
        result = subprocess.run(
            [sys.executable, SCRIPT,
             "--intent", intent,
             "--surfaces", surfaces],
            capture_output=True, text=True, encoding="utf-8")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(result.stdout.strip(),
                        "better_panel.py printed nothing")
        return json.loads(result.stdout)

    def names(self, entries):
        return sorted(entry["role"] for entry in entries)

    def assertQuestionsMatchProfiles(self, entries):
        """The `question` of each entry is the one in the frontmatter.

        The caller cuts roles by reading these, so a paraphrase here would
        send the cut against the wrong standard.
        """
        known = {}
        for row in ROLES:
            name = row["role"]
            if row["accountability"]:
                name = f"{name}:{row['accountability']}"
            known[name] = row["question"]
        for entry in entries:
            self.assertIn("question", entry, entry["role"])
            self.assertEqual(entry["question"], known[entry["role"]],
                             entry["role"])

# The question behind this input:
#
#   "The /v1/exports endpoint now requires a new OAuth scope, drops two
#    fields from the response, and runs behind a per-account rate limiter
#    that meters usage. Can this ship?"
#
# "Can this ship?" makes it readiness rather than direction. The change
# then declares two surfaces, and each one makes its own roles eligible:
#
#   contract  the new scope, the dropped fields, the endpoint signature
#   signals   the meter, the rate-limit counters, what the limiter emits
#
# Seven roles are eligible and at most five may sit. The script reports all
# seven. The caller decides which two to drop, because that decision needs
# the question above, which the script never sees.

    def test_contract_and_signals_lists_every_eligible_role(self):
        response = self.run_script("contract,signals")

        self.assertEqual(self.names(response["practitioners"]),
                         ELIGIBLE_CONTRACT_SIGNALS["practitioners"])
        self.assertEqual(self.names(response["executives"]),
                         ELIGIBLE_CONTRACT_SIGNALS["executives"])
        # The list is larger than a panel. That is the normal case, and the
        # script must not cut it down itself.
        self.assertEqual(len(response["practitioners"])
                         + len(response["executives"]), 7)
        # Each entry carries its question, so the caller can cut on
        # relevance without opening a profile.
        self.assertQuestionsMatchProfiles(response["practitioners"])
        self.assertQuestionsMatchProfiles(response["executives"])

# The question behind this input:
#
#   "The error messages and empty states in the upload flow are rewritten.
#    Can this ship?"
#
# "Can this ship?" makes it readiness again. Nothing here changes a
# signature, a meter, or a module boundary, so the change declares one
# surface:
#
#   words  the error strings, the empty-state copy, the labels
#
# Four roles are eligible, so the caller cuts nothing. The eligible set
# follows the surfaces: a `words` diff carries nothing that `margin` or
# `compliance` can read, so neither appears.

    def test_words_only_lists_every_eligible_role(self):
        response = self.run_script("words")

        self.assertEqual(self.names(response["practitioners"]),
                         ELIGIBLE_WORDS["practitioners"])
        self.assertEqual(self.names(response["executives"]),
                         ELIGIBLE_WORDS["executives"])
        self.assertQuestionsMatchProfiles(response["practitioners"])
        self.assertQuestionsMatchProfiles(response["executives"])
        # The executives follow the surfaces.
        for name in ("executive:margin", "executive:compliance"):
            self.assertNotIn(name, self.names(response["executives"]))
        # The intent gate drops the generative role that reads `words`.
        self.assertNotIn("launch-editor", self.names(
            response["practitioners"]))


if __name__ == "__main__":
    unittest.main(verbosity=2)