# Changelog

All notable changes to `syns-claude-plugins` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

[0.1.0]: https://github.com/synsdev/syns-claude-plugins/releases/tag/v0.1.0
