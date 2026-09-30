# Changelog

All notable changes to `syns-claude-plugins` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] — 2026-09-30

### Removed

- The syns-init skill. Setting up Syns is now https://syns.app/skill.md, which any agent reads with nothing installed.

## [0.3.1] — 2026-09-14

### Changed

- The finish hook sends the agent back once per turn, keyed on `stop_hook_active`, for a resolution. If the agent stops again in the same turn with the resolution unfinished, the hook reports it instead of blocking again, and the next prompt starts over. Before, an agent that declined a resolution was blocked on every stop, until the host gave up.

## [0.3.0] — 2026-09-13

### Changed

- `syns` plugin: `Stop` runs `syns sync --if-repo` instead of `syns push`. It brings in the repository head and publishes the whole folder; where the head moved, it prepares a resolution instead of refusing.
- Only a resolution continues Claude:
  - `Stop` exits `2` with the CLI's instruction.
  - `SessionStart` puts a pending resolution into Claude's context before new work.
- Synced, no changes and the no-repository skip print nothing. Every other failure is shown to the user with the CLI's own line, and Claude is not continued.
- Every publication carries published-by provenance: `SYNS_INTEGRATION=claude-code`, `SYNS_RUN` (the session id) and `SYNS_TRIGGER` (`start` or `finish`).
  - `SessionStart` writes the same defaults, with `SYNS_TRIGGER=agent`, to `CLAUDE_ENV_FILE`, so Claude's own `syns` commands carry them too.
  - Each value is a default only: one set in the environment wins.
- Both hooks remain single command lines in `hooks/hooks.json`. `SessionStart` now installs the CLI and pulls in one command, because Claude Code runs a group's hooks in parallel.

### Removed

- `SYNS_PUSH_MESSAGE`: `syns sync` takes no commit message.

### Requires

- Syns CLI 0.3.0 or newer.

## [0.2.1]

### Added

- `/syns-init` in the `syns` plugin: mines an existing project, proposes a repository through a digest-bound local HTML review, stages and compares it with matched read-only tasks, and adopts or privately publishes only separately approved operations. An explicit `owner/name` joins an existing repository.
- The skill's hosted and plugin distributions are generated from the same canonical source and carry verifiable package checksums.
- `plan-sharing` plugin: coordinates agents at plan time. On `ExitPlanMode`, when inside a Syns repo, it saves the
  approved plan to that repo's own `plans/<slug>.md`. If other agents' plans exist in that folder, it injects them as
  `additionalContext` and asks the running agent to compare and stop & report on conflict (same files, duplicate work,
  contradictions). Outside a Syns repo the plugin does nothing.

## [0.1.0] — 2026-05-25

First public release. One plugin, two hooks.

### Added

- `syns` plugin with `SessionStart` and `Stop` hooks that invoke `syns pull --if-repo` and `syns push --if-repo`.
  Outside a Syns repo every hook is a silent no-op; inside a Syns repo every Claude turn becomes one commit on the
  server.
- First-session bootstrap inlined in the `SessionStart` hook: if `syns` isn't on the user's `PATH`, runs
  `curl -fsSL https://install.syns.dev/install.sh | sh` to install it.
- Stop hook reads the commit message from `$SYNS_PUSH_MESSAGE` and falls back to `claude code session` when the variable
  is unset. Set the variable to customize.

### Known limitations

- macOS and Linux only. Windows users can install the CLI manually via Scoop; the hook commands themselves don't yet run
  under PowerShell.

[0.4.0]: https://github.com/synsdev/syns-claude-plugins/releases/tag/v0.4.0
[0.3.1]: https://github.com/synsdev/syns-claude-plugins/releases/tag/v0.3.1
[0.3.0]: https://github.com/synsdev/syns-claude-plugins/releases/tag/v0.3.0
[0.1.0]: https://github.com/synsdev/syns-claude-plugins/releases/tag/v0.1.0
