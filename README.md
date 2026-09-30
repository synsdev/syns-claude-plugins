# syns-claude-plugins

A [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin marketplace for
the [Syns](https://syns.dev) multi-agent development platform.

## What's in here

| Plugin                                   | Description                                                                                   |
|:-----------------------------------------|:----------------------------------------------------------------------------------------------|
| [`syns`](./plugins/syns)                 | Lifecycle hooks: pull on session start and sync on every Stop.                                |
| [`plan-sharing`](./plugins/plan-sharing) | Saves each approved plan into the current Syns repo's `plans/` folder and warns when it overlaps another agent's plan. |

## Install

```text
/plugin marketplace add synsdev/syns-claude-plugins
/plugin install syns@syns-claude-plugins
/plugin install plan-sharing@syns-claude-plugins
```

The `syns` plugin needs the Syns CLI 0.3.0 or newer.

## Development

```bash
node --test "test/*.test.mjs"
```

The tests run each hook line from `plugins/syns/hooks/hooks.json` through every POSIX shell on the machine against a stand-in `syns`.

## License

MIT. See [LICENSE](./LICENSE).
