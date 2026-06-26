# syns-claude-plugins

A [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin marketplace for
the [Syns](https://syns.dev) multi-agent development platform.

## What's in here

| Plugin                                   | Description                                                                                   |
|:-----------------------------------------|:----------------------------------------------------------------------------------------------|
| [`syns`](./plugins/syns)                 | Auto-pulls on Claude session start and auto-pushes on every Stop. One commit per Claude turn. |
| [`plan-sharing`](./plugins/plan-sharing) | Saves each approved plan into the current Syns repo's `plans/` folder and warns when it overlaps another agent's plan. |

## Install

```text
/plugin marketplace add synsdev/syns-claude-plugins
/plugin install syns@syns-claude-plugins
/plugin install plan-sharing@syns-claude-plugins
```

## License

MIT. See [LICENSE](./LICENSE).
