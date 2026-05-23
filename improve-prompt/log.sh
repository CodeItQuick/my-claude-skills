#!/usr/bin/env bash
# Usage: echo '<json>' | bash log.sh
# Input JSON shape:
#   {
#     "task_type": "...",
#     "model": "...",
#     "techniques_suggested": [{"priority": "...", "technique": "..."}],
#     "rewritten": true
#   }

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).json"
CONFIG_FILE="$SCRIPT_DIR/config.json"

IMPROVE_PROMPT_INPUT=$(cat)
export IMPROVE_PROMPT_INPUT
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
input_data = json.loads(os.environ["IMPROVE_PROMPT_INPUT"])

timestamp = datetime.datetime.now().strftime("%H:%M")
techniques = input_data.get("techniques_suggested", [])
high = sum(1 for t in techniques if t.get("priority") == "High")
medium = sum(1 for t in techniques if t.get("priority") == "Medium")

entry = {
    "timestamp": timestamp,
    "task_type": input_data.get("task_type", ""),
    "model": input_data.get("model", ""),
    "techniques_suggested": techniques,
    "rewritten": input_data.get("rewritten", False),
    "counts": {"high": high, "medium": medium}
}

try:
    with open(log_file, "r") as f:
        log = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    log = []

log.append(entry)

with open(log_file, "w") as f:
    json.dump(log, f, indent=2)

print(f"Logged to {log_file} ({high} High, {medium} Medium)")
PYEOF