# syns-claude-plugins

A [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin marketplace for
the [Syns](https://syns.dev) multi-agent development platform.

## What's in here

| Plugin | Description |
|:--|:--|
| [`syns`](./plugins/syns) | **The one to install.** No code of its own; installs the three below. |
| [`syns-sync`](./plugins/syns-sync) | Installs the Syns CLI if it is missing; pulls on session start and syncs on every Stop. |
| [`plan-sharing`](./plugins/plan-sharing) | Saves each approved plan into the current Syns repo's `plans/` folder and warns when it overlaps another agent's plan. |
| [`syns-pages`](https://github.com/synsdev/syns-bb-plugin/tree/main/hosts/claude) | Agent-written pages read and write your Syns files (`syns.*`). Code in `synsdev/syns-bb-plugin`; brings in `unife-pages`. |
| [`unife-pages`](https://github.com/unifedev/unife-pages) | The page every session writes for you. Code in `unifedev/unife-pages`. |

## Install

One command, from nothing:

```sh
claude plugin install syns --marketplace synsdev/syns-claude-plugins
```

Then `/reload-plugins`, or start a new session. Each plugin also installs alone, for example
`claude plugin install syns-sync --marketplace synsdev/syns-claude-plugins`.

## Upgrading from 0.4

Until 0.4 the marketplace was `syns-claude-plugins` and `syns` was the hooks plugin. A plain update turns `syns` into
the bundle without its dependencies, and syncing stops. Instead, once:

```sh
claude plugin marketplace remove syns-claude-plugins   # also removes syns@ and plan-sharing@syns-claude-plugins
rm -rf ~/.claude/plugins/marketplaces/syns             # only if a marketplace update already ran; harmless otherwise
claude plugin install syns --marketplace synsdev/syns-claude-plugins
```

Then `/reload-plugins`, or start a new session.

## Development

```bash
node --test "test/*.test.mjs"
```

The tests run each hook line from `plugins/syns-sync/hooks/hooks.json` through every POSIX shell on the machine against a stand-in `syns`.

## License

MIT. See [LICENSE](./LICENSE).
