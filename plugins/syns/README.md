# `syns` plugin

Two lifecycle hooks and one setup skill.

| Surface | Action |
|:--|:--|
| `SessionStart` | `syns pull --if-repo` — pulls if the session's working tree resolves to a Syns repo, no-op otherwise. |
| `Stop` | `syns push --if-repo -m "<your message>"` — pushes the working tree as a single commit. |
| `/syns-init` | Mines an existing project, proposes an agent-readable repository for local HTML review, runs a matched read-only comparison after approval, and adopts or privately publishes only the operations explicitly approved. An `owner/name` invocation joins that repository instead. |

`/syns-init` is packaged from the same canonical source as the hosted setup skill. Its generated `checksums.json` verifies the references, renderers, review assets, evaluation fixtures, and skill bytes.

The skill does not install lifecycle hooks or promise realtime synchronization. These two hooks remain the integration-owned transport behavior.

## Configuration

The `syns push` in Stop hook reads `$SYNS_PUSH_MESSAGE` env var for the commit message, falling back to `claude code session` if unset. Set the variable to customize.

## Behavior contract

- **Outside Syns repos: silent no-op.** No stdout, no stderr, exit 0.
- **Hooks never block Claude.** The CLI's exit-0 contract. This plugin adds no error-swallowing of its own.
- **Stop is per-turn.** A session with N model turns produces up to N commits (empty turns push nothing).