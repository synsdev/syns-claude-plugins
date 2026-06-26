# `plan-sharing` plugin

Coordinate Claude agents at plan time. When you approve a plan (`ExitPlanMode`) **inside a Syns repo**, the plugin saves
it to that repo's
`plans/` folder and warns if it overlaps another agent's plan in the same repo.

| Event          | Action                                                                                                                |
|:---------------|:----------------------------------------------------------------------------------------------------------------------|
| `ExitPlanMode` | If in a Syns repo: pull → write `plans/<slug>.md` → push → compare against the other `plans/*.md` → warn on conflict. |

## How it works

1. **Gate.** Resolves the repo root by walking up for `.syns.yaml`. Not a Syns repo → exit, no file written.
2. **Share.** `syns pull --if-repo`, write the approved plan to
   `plans/<slug>.md` (`<slug>` is the plan file's name, nothing else), then
   `syns push --if-repo` (one retry on a head-mismatch).
3. **Check.** If other `plans/*.md` exist, injects them as `additionalContext`
   with an instruction to compare and **stop & report if they conflict**
   (same files, duplicate work, contradictions). The running agent judges the overlap. `additionalContext` is quiet,
   model-facing context — it is not shown to you as a chat message — so the full peer plans are included for the model
   to weigh without extra file reads.

## Behavior contract

- **Not a Syns repo / `syns` absent / `jq` absent / no peers → silent no-op.**
- **Fail open.** Any infrastructure error ends silently and never blocks you from exiting plan mode.
- **Advisory.** `PostToolUse` runs after plan mode has exited, so the overlap guidance is injected as context telling
  the agent to stop and report — it cannot hard-veto the exit.
- **Filename is just `<slug>.md`.** Two agents whose plans derive the same slug share one file (last write wins). No
  metadata is stored in the plan file.

## Requirements

- `syns` CLI, authenticated, with access to the repo.
- `jq`.

Pairs naturally with the [`syns`](../syns) plugin, which pulls on session start and pushes on stop.
