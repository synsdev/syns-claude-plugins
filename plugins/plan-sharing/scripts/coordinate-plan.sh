#!/usr/bin/env bash
# PostToolUse(ExitPlanMode): share the approved plan inside the current Syns
# repo; if other agents have plans in that repo's plans/ folder, inject them as
# context so the agent checks for conflicts before implementing.
#
set -uo pipefail

command -v syns >/dev/null 2>&1 || exit 0
command -v jq   >/dev/null 2>&1 || exit 0

INPUT="$(cat)"
PLAN="$(jq -r '.tool_input.plan // empty'              <<<"$INPUT")"
PLAN_FILE="$(jq -r '.tool_input.planFilePath // empty' <<<"$INPUT")"
CWD="$(jq -r '.cwd // empty'                            <<<"$INPUT")"
[ -n "$PLAN" ] || exit 0       # // empty keeps a missing plan as "" (not "null")
[ -n "$CWD" ]  || CWD="$PWD"

# Gate: walk up for .syns.yaml. Not a Syns repo -> do nothing. Also locates the
# repo root, so plans land in one place regardless of which subdir we're in.
ROOT="$(cd "$CWD" 2>/dev/null && pwd)" || exit 0
while [ "$ROOT" != "/" ] && [ ! -f "$ROOT/.syns.yaml" ]; do ROOT="$(dirname "$ROOT")"; done
[ -f "$ROOT/.syns.yaml" ] || exit 0
cd "$ROOT" || exit 0

# Filename is just <slug>.md, derived from the plan file's name.
SLUG="$(basename "${PLAN_FILE:-plan}" .md | tr '[:upper:]' '[:lower:]' \
        | sed -E 's#[^a-z0-9._-]+#-#g; s#^-+##; s#-+$##' | cut -c1-120)"
[ -n "$SLUG" ] || SLUG="plan"
REL="plans/${SLUG}.md"

save() { mkdir -p plans && printf '%s\n' "$PLAN" >"$REL"; }

# pull (before) -> write -> push (after), retrying once on a head-mismatch.
syns pull --if-repo >/dev/null 2>&1 || true
save || exit 0
if ! syns push --if-repo -m "plan: $SLUG" >/dev/null 2>&1; then
  syns pull --if-repo >/dev/null 2>&1 || true   # refresh deletes our file,
  save                                          # so rewrite it,
  syns push --if-repo -m "plan: $SLUG" >/dev/null 2>&1 || true
fi

# Gather the other plans (everything in plans/ except our own file).
OTHERS=""; count=0
while IFS= read -r f; do
  [ "$f" = "$REL" ] && continue       # find emits plans/<slug>.md
  OTHERS="${OTHERS}
===== $(basename "$f") =====
$(cut -c1-4000 "$f")
"
  count=$((count + 1))
  [ "$count" -ge 8 ] && break
done < <(find plans -maxdepth 1 -type f -name '*.md' 2>/dev/null)
[ "$count" -gt 0 ] || exit 0          # no peers -> nothing to compare

# Inject the peer plans as context (additionalContext is quiet, model-facing —
# not shown to the user) for the agent to judge overlap.
CTX="There are ${count} other plan(s) in this repo's plans/ folder. Compare them against the plan you just approved:
${OTHERS}

If your plan would edit the same files incompatibly, duplicate work, or contradict another plan, do NOT implement — stop and report the conflict to the user. Otherwise proceed."
jq -n --arg c "${CTX:0:9500}" \
  '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$c}}'
