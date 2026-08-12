#!/usr/bin/env python3
"""Load role definitions from the frontmatter of each file in role-profiles/.

Every profile carries its own axes, so the profile is the single source of
truth. Nothing else in the skill stores a role's posture, horizon, vantage,
or surface.

A practitioner profile:

    ---
    role: qa-sdet
    posture: defensive
    horizon: [now]
    vantage: internal
    surface: behavior
    question: "Are the failure modes covered?"
    ---

`executive` is the one open set. Executives are not separated by the axes —
every executive reads the whole change — so they carry an `accountability`
instead, one file per accountability:

    ---
    role: executive
    accountability: margin
    posture: defensive
    horizon: [soon, later]
    vantage: strategic
    surface: signals
    ---

The loader folds every such file into one `executive` role. A panel names a
seat as `executive:margin`. To add a COO, drop in `executive-execution.md`.
No code changes.
"""

import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILE_DIR = os.path.join(SCRIPT_DIR, "role-profiles")

POSTURES = ("defensive", "generative")
HORIZONS = ("now", "soon", "later")
VANTAGES = ("internal", "external", "strategic")
SURFACES = ("contract", "behavior", "flow", "habit",
            "words", "pitch", "signals", "structure")

# --- Panel rules -----------------------------------------------------------
# Every rule about panel composition lives here, so panel.py and emit.py
# enforce one rulebook instead of each keeping its own copy.

MAX_PANEL = 4
# The floor for an ordinary panel, where coverage is the goal.
MIN_PANEL = 2
# The absolute floor. Only a --single run may go this low, and only because
# the user named the one role. emit.py cannot see that flag, so it validates
# against this bound and lets panel.py hold the stricter line.
SINGLE_PANEL = 1

MAX_GENERATIVE = 2
# Its findings expire at release rather than becoming a backlog, so it is a
# ship question even in a readiness review.
READINESS_SAFE_GENERATIVE = ("launch-editor",)

# Roles whose findings duplicate each other for reasons the axes do not
# capture. Declared, not derived.
EXCLUSIVE_PAIRS = (("platform-capability-scout", "toolsmith"),)


class Role:
    def __init__(self, slug, meta):
        self.slug = slug
        self.posture = meta.get("posture", "")
        self.vantage = meta.get("vantage", "")
        self.question = meta.get("question", "")
        self.aliases = tuple(meta.get("aliases", ()))
        self.horizons = tuple(meta.get("horizon", ()))
        self.surface = "" if meta.get("surface") == "none" else meta.get(
            "surface", "")
        self.accountabilities = {}
        self.profiles = {}

    def add_accountability(self, name, meta, path):
        surface = meta.get("surface", "")
        self.accountabilities[name] = {
            "horizons": tuple(meta.get("horizon", ())),
            "surface": "" if surface == "none" else surface,
            "question": meta.get("question", ""),
            "aliases": tuple(meta.get("aliases", ())),
        }
        self.profiles[name] = path

    @property
    def is_open_set(self):
        """True when the role is seated by accountability, not by axes."""
        return bool(self.accountabilities)

    def square(self):
        """The axis tuple used to detect two redundant practitioners."""
        if self.is_open_set:
            return None
        return (self.posture, self.horizons, self.vantage, self.surface)

    def __repr__(self):
        return f"<Role {self.slug}>"


def parse_frontmatter(text):
    """Parse the restricted subset of YAML the profiles use.

    Scalars and single-line lists only. No dependency on PyYAML, matching
    the rest of the skill.
    """
    match = re.match(r"^---\r?\n(.*?)\r?\n---", text, re.S)
    if not match:
        return {}
    meta = {}
    for line in match.group(1).split("\n"):
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            meta[key] = [v.strip() for v in inner.split(",") if v.strip()]
        else:
            meta[key] = value.strip('"').strip("'")
    return meta


def load_roles(profile_dir=PROFILE_DIR):
    """Return {slug: Role} for every profile that declares frontmatter.

    Files that share a `role` and each declare an `accountability` fold into
    a single open-set role.
    """
    roles = {}
    if not os.path.isdir(profile_dir):
        return roles
    for filename in sorted(os.listdir(profile_dir)):
        if not filename.endswith(".md") or filename.startswith("_"):
            continue
        path = os.path.join(profile_dir, filename)
        with open(path, encoding="utf-8") as handle:
            meta = parse_frontmatter(handle.read())
        slug = meta.get("role")
        if not slug:
            # Silence here would make the profile invisible to the panel with
            # no sign that it exists. Say so instead.
            print(f"warning: role-profiles/{filename} declares no 'role:' key "
                  f"in frontmatter, so it cannot be seated. See _template.md.",
                  file=sys.stderr)
            continue
        accountability = meta.get("accountability")
        if accountability:
            role = roles.setdefault(slug, Role(slug, meta))
            role.add_accountability(accountability, meta, path)
        else:
            role = Role(slug, meta)
            role.profiles[None] = path
            roles[slug] = role
    return roles


def resolve(name, roles):
    """Resolve a user-supplied name to a slug. Deterministic, not fuzzy-guessed.

    Returns (slug, accountability) or (None, None) when nothing matches.
    """
    name = name.strip().lower()
    base, _, accountability = name.partition(":")

    if base in roles:
        return base, accountability or None

    # A bare accountability or its alias, such as "margin" or "cfo".
    for slug, role in roles.items():
        for acct, spec in role.accountabilities.items():
            if base == acct or base in spec["aliases"]:
                return slug, acct

    for slug, role in roles.items():
        if base in role.aliases:
            return slug, accountability or None

    prefix = [s for s in roles if s.startswith(base)]
    if len(prefix) == 1:
        return prefix[0], accountability or None

    parts = [s for s in roles if base in s.split("-")]
    if len(parts) == 1:
        return parts[0], accountability or None

    return None, None


def validate_definitions(roles):
    """Check the frontmatter itself. Returns a list of problems."""
    errors = []
    for slug, role in roles.items():
        if role.posture not in POSTURES:
            errors.append(f"{slug}: posture '{role.posture}' is not "
                          f"one of {', '.join(POSTURES)}")
        if role.vantage not in VANTAGES:
            errors.append(f"{slug}: vantage '{role.vantage}' is not "
                          f"one of {', '.join(VANTAGES)}")
        if role.is_open_set:
            for name, spec in role.accountabilities.items():
                if spec["surface"] and spec["surface"] not in SURFACES:
                    errors.append(f"{slug}:{name}: surface "
                                  f"'{spec['surface']}' is not known")
                for horizon in spec["horizons"]:
                    if horizon not in HORIZONS:
                        errors.append(f"{slug}:{name}: horizon "
                                      f"'{horizon}' is not known")
            continue
        if role.surface not in SURFACES:
            errors.append(f"{slug}: surface '{role.surface}' is not "
                          f"one of {', '.join(SURFACES)}")
        if not role.horizons:
            errors.append(f"{slug}: no horizon")
        for horizon in role.horizons:
            if horizon not in HORIZONS:
                errors.append(f"{slug}: horizon '{horizon}' is not known")
    return errors