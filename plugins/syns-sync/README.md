# `syns-sync` plugin

Install it alone with `claude plugin install syns-sync --marketplace synsdev/syns-claude-plugins`, or with everything through `syns`.

Two lifecycle hooks. The plugin ships no skill: setting up Syns is [syns.app/skill.md](https://syns.app/skill.md), which any agent reads with nothing installed.

| Surface | Action |
|:--|:--|
| `SessionStart` | Installs `syns` if it is missing, then `syns pull --if-repo` — brings the folder to the repository head without discarding local work. |
| `Stop` | `syns sync --if-repo` — brings in the head and publishes everything written in the folder. |

## What the hooks do with the result

Each hook is one command line in `hooks/hooks.json`, with no script behind it. It runs the command a person would run, and only turns the CLI's exit code into Claude Code's hook answer:

| `syns` exits | `SessionStart` | `Stop` |
|:--|:--|:--|
| `0`: synced, no changes, or not a Syns folder | nothing | nothing |
| `4`: resolution required | the CLI's instruction goes into Claude's context, asking it to finish the resolution before new work | exit `2`: Claude is sent back with the CLI's instruction |
| anything else: a credential or permission failure, an unreachable server, a validation failure, attention required | the CLI's own line, shown to you | the CLI's own line, shown to you (`ctrl+o`); Claude is not continued |

The instruction tells Claude what advanced, what is preserved and how to finish, and nothing publishes past a moved head until Claude runs `syns resolution continue`. Stop sends Claude back once per turn. If Claude stops again in the same turn with the resolution unfinished, the hook shows you the instruction instead of blocking again, and your next prompt starts over.

## Provenance

Every publication records who published it. The hooks set `SYNS_INTEGRATION=claude-code`, `SYNS_RUN` (the session id) and `SYNS_TRIGGER` (`start` or `finish`). `SessionStart` also writes the same defaults, with `SYNS_TRIGGER=agent`, to Claude Code's `CLAUDE_ENV_FILE`. As a result, a `syns` command Claude runs itself, such as `syns resolution continue`, carries them too.

Each of these values is only a default: a value you set in your environment always wins. `SYNS_TASK`, if you set it, is sent alongside them.

## Requirements

- Syns CLI 0.3.0 or newer. An older CLI answers `Stop` with `unrecognized subcommand 'sync'`; run `syns upgrade`.
- macOS and Linux. The hook lines are POSIX shell.

## Behavior contract

- **Outside Syns repos: silent no-op.** No stdout, no stderr, exit 0.
- **A successful pull or sync prints nothing.**
- **Only a resolution continues Claude.** Every other failure is shown to you and ends the turn normally.
- **Stop is per-turn.** Each turn publishes what the folder holds at that moment, edits from other writers included; a turn that changed nothing publishes nothing.
- **`SYNS_PUSH_MESSAGE` is no longer read.** `syns sync` takes no commit message.
