# Private publication, integration boundaries, and joining

## CLI preflight

Route before installing or authenticating.

If a required CLI command is unavailable, install on macOS/Linux with:

```bash
curl -fsSL https://install.syns.dev/install.sh | sh
```

Do not call `syns --version`; it is not implemented. Use `syns --help` and `syns whoami`.

Authenticate only when an approved private push or a private pull requires it. `syns login` blocks while waiting; run it redirected in the background, surface its URL/code immediately, and poll `syns whoami`.

Never hardcode an owner. Read it from `syns whoami` after authentication.

## Private publication

Publication requires its own approval matching the exact staged/canonical tree digest, destination, owner/name, and `private` visibility.

Before first push:

- make sure the destination is the accepted wiki directory;
- verify no `.syns.yaml` exists there;
- check the name is not already occupied;
- preserve the complete local package if the push fails.

Then:

```bash
syns push <wiki-path> --name <name> --visibility private -m "wiki: initial version"
```

The first successful push writes `.syns.yaml`. Verify from inside the wiki with `syns status`. Only then add provenance such as `derived_from:` while preserving `owner` and `name`, and push that small provenance update.

A failed first push can still occupy a repository name in the current product. Report that limitation; do not retry under the same name indefinitely or hide it. A stale push must never use `--force`. Preserve local work and ask the user to resolve the operational failure outside the content-question budget.

Public visibility is a later, explicit operation and is not offered during setup.

## What setup does not configure

Do not ask whether to pull or push. Do not install lifecycle hooks. Automatic lifecycle transport belongs to the user's installed harness integration:

| Harness | Existing behavior | Caveat |
| --- | --- | --- |
| Claude Code plugin | `SessionStart` pulls; each `Stop` pushes | The plugin must already be installed; Stop is per turn |
| Codex plugin | startup/resume pulls; each `Stop` pushes | Bundled hooks require trust; first-session CLI bootstrap may only become available next session |
| Pi package | `session_start` pulls; `agent_settled` pushes | Login is interactive-only; failures are reported but do not fail the agent run |

The skill may report whether it found the integration. It does not promise hook success or configure trust.

For a reasoning repository kept beside a codebase, start lifecycle-enabled sessions from the wiki directory, because all three integrations resolve `.syns.yaml` from the current directory/ancestors. Give the agent an explicit path to the sibling codebase. Do not put `.syns.yaml` in their common parent; that would make code files part of the Syns repository.

## JOIN route

JOIN is selected by an explicit `owner/name` or exactly one valid `.syns.yaml` at the declared wiki root. Multiple/nested identities require an operational choice; never pick the first match.

For an explicit repository:

1. Choose an empty destination, defaulting to `./<repo-name>` unless the prompt names one.
2. Attempt the pull without login first; public repositories need no authentication.
3. If the repository is private and the pull fails for access, authenticate and retry once.
4. Refuse a non-empty destination. Never merge a remote wiki into unrelated local markdown.
5. Verify `.syns.yaml`, file count/digests where known, `STRUCTURE.md`, and the declared read order.
6. Print the local path, repository identity, first files to read, and integration status.
7. Stop. Do not redesign an existing team wiki during JOIN.

If the user explicitly asks to wire a sibling code project, show the exact marker-delimited `AGENTS.md`/`CLAUDE.md` adapter and obtain approval before writing it.

## Second-person demonstration

Prepare integration and repository access before the demo. Use two actual machines/accounts when available; otherwise label isolated checkouts as simulations and set separate `SYNS_CONFIG_DIR` and `SYNS_CACHE_DIR`.

Owner:

1. start an integrated session from the canonical wiki checkout;
2. make one small content update through the agent;
3. let the integration attempt its normal lifecycle push;
4. verify the new remote version explicitly.

Teammate:

1. invoke this skill with `owner/name` in an empty directory;
2. pull and verify the checkout;
3. start an integrated session from the joined wiki directory;
4. let its normal start hook pull;
5. run a read-only task whose answer depends on the owner's pushed update.

The truthful claim is: the second reader sees the update **after a successful push and a subsequent successful pull**. Do not say real-time, instant, fleet-wide, enforced, or automatically merged.
