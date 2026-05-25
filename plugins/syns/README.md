# `syns` plugin

Two hooks. That's all.

| Event          | Action                                                                                                |
|:---------------|:------------------------------------------------------------------------------------------------------|
| `SessionStart` | `syns pull --if-repo` — pulls if the session's working tree resolves to a Syns repo, no-op otherwise. |
| `Stop`         | `syns push --if-repo -m "<your message>"` — pushes the working tree as a single commit.               |

## Configuration

The `syns push` in Stop hook reads `$SYNS_PUSH_MESSAGE` env var for the commit message, falling back to `claude code session` if unset. Set the variable to customize.

## Behavior contract

- **Outside Syns repos: silent no-op.** No stdout, no stderr, exit 0.
- **Hooks never block Claude.** The CLI's exit-0 contract. This plugin adds no error-swallowing of its own.
- **Stop is per-turn.** A session with N model turns produces up to N commits (empty turns push nothing).