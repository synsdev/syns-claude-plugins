# `syns` plugin

Two hooks. That's all.

| Event          | Action                                                                                                |
|:---------------|:------------------------------------------------------------------------------------------------------|
| `SessionStart` | `syns pull --if-repo` — pulls if the session's working tree resolves to a Syns repo, no-op otherwise. |
| `Stop`         | `syns push --if-repo -m "<your message>"` — pushes the working tree as a single commit.               |

## Configuration

One field, prompted on first install:

| Key            | Type   | Default               | What it does                        |
|:---------------|:-------|:----------------------|:------------------------------------|
| `push_message` | string | `claude code session` | Commit message for every auto-push. |

## Behavior contract

- **Outside Syns repos: silent no-op.** No stdout, no stderr, exit 0.
- **Hooks never block Claude.** The CLI's exit-0 contract. This plugin adds no error-swallowing of its own.
- **Stop is per-turn.** A session with N model turns produces up to N commit (empty turns push nothing).