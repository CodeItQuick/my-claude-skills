#!/usr/bin/env bash
# Usage: echo '<json>' | bash log.sh
# Input JSON shape:
#   {
#     "question": "...",
#     "roles": [{"role": "...", "reason": "..."}],
#     "findings": [{"criticality": "...", "role": "...", "observation": "...", "reasoning": "..."}]
#   }

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).json"
CONFIG_FILE="$SCRIPT_DIR/config.json"

PRODUCT_REVIEW_INPUT=$(cat)
export PRODUCT_REVIEW_INPUT
export CONFIG_FILE

python3 - "$LOG_FILE" <<'PYEOF'
import sys, json, datetime, os

config_file = os.environ["CONFIG_FILE"]
try:
    config = json.load(open(config_file))
    if not config.get("logging", False):
        sys.exit(0)
except FileNotFoundError:
    sys.exit(0)

log_file = sys.argv[1]
input_data = json.loads(os.environ["PRODUCT_REVIEW_INPUT"])

timestamp = datetime.datetime.now().strftime("%H:%M")
findings = input_data.get("findings", [])
blocking = sum(1 for f in findings if f.get("criticality") == "Blocking")
suggested = sum(1 for f in findings if f.get("criticality") == "Suggested")

entry = {
    "timestamp": timestamp,
    "question": input_data.get("question", ""),
    "roles": input_data.get("roles", []),
    "findings": findings,
    "counts": {"blocking": blocking, "suggested": suggested}
}

try:
    with open(log_file, "r") as f:
        log = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    log = []

log.append(entry)

with open(log_file, "w") as f:
    json.dump(log, f, indent=2)

print(f"Logged to {log_file} ({blocking} Blocking, {suggested} Suggested)")
PYEOF