# syns-claude-plugins

A [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin marketplace for
the [Syns](https://syns.dev) multi-agent development platform.

## What's in here

| Plugin | Description |
|:--|:--|
| [`syns`](./plugins/syns) | **The one to install.** No code of its own; installs the ones below. |
| [`syns-sync`](./plugins/syns-sync) | Installs the Syns CLI if it is missing; pulls on session start and syncs on every Stop. |
| [`syns-pages`](https://github.com/synsdev/syns-bb-plugin/tree/main/hosts/claude) | Agent-written pages read and write your Syns files (`syns.*`). Code in `synsdev/syns-bb-plugin`; brings in `unife-pages`. |
| [`unife-pages`](https://github.com/unifedev/unife-pages) | The page every session writes for you. Code in `unifedev/unife-pages`. |

## Install

One command, from nothing:

```sh
claude plugin install syns --marketplace synsdev/syns-claude-plugins
```

Then start a new session: `/reload-plugins` starts the page, but the page instruction reaches only a new session.
Each plugin also installs alone, for example
`claude plugin install syns-sync --marketplace synsdev/syns-claude-plugins`.

## Development

```bash
node --test "test/*.test.mjs"
```

The tests run each hook line from `plugins/syns-sync/hooks/hooks.json` through every POSIX shell on the machine against a stand-in `syns`.

## License

MIT. See [LICENSE](./LICENSE).
