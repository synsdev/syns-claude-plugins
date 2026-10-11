# `syns` plugin

The one to install. It has no code of its own: it installs and enables these, which can also be installed alone.

| Plugin | What it does |
|:--|:--|
| [`syns-sync`](../syns-sync) | Installs the Syns CLI if it is missing; pulls on session start and syncs on every Stop. |
| [`syns-pages`](https://github.com/synsdev/syns-bb-plugin/tree/main/hosts/claude) | Lets agent-written pages read and write your Syns files (`syns.*`), through Unife Pages, which it brings in. |

Uninstalling `syns` leaves them installed; `claude plugin prune` removes the ones it brought in.
