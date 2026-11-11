# `syns` plugin

The one to install. It installs and enables these, which can also be installed alone, and carries one program of its
own, for a computer of yours at your Syns live door.

| Plugin | What it does |
|:--|:--|
| [`syns-sync`](../syns-sync) | Installs the Syns CLI if it is missing; pulls on session start and syncs on every Stop. |
| [`syns-pages`](https://github.com/synsdev/syns-bb-plugin/tree/main/hosts/claude) | Lets agent-written pages read and write your Syns files (`syns.*`), through Unife Pages, which it brings in. |

Uninstalling `syns` leaves them installed; `claude plugin prune` removes the ones it brought in.

## A computer of your own at your door

`machine/machine.mjs` makes this computer one of your machines at your Syns live door, `https://<you>.syns.dev`:
its pages open at `https://<you>--<name>.syns.dev` from any browser you are signed in with. It is yours to run, in a
terminal of your own; nothing starts it by itself. It needs Node 22 or later, the Syns login on this computer
(`syns login`), and Unife Pages, which this plugin brings in. macOS and Linux.

```sh
node <plugin root>/machine/machine.mjs
```

The plugin root is `~/.claude/plugins/cache/syns/syns/<version>`, the version `claude plugin list` shows for
`syns@syns`. It takes no argument and no option, and refuses to run from inside an agent's session.

- **The address** comes from this computer's name, lowercased (`MacBook-Pro.local` is `macbook-pro`), given by your
  door once, when the computer first joins; `-2`, `-3` … when the name is taken. The program prints it first:
  `<you>--<name>.syns.dev`.
- **Then one line per event:** `Connected.`; `Not connected (<why>). Trying again.` and `Connected again after <n> s.`
  around a drop; `Woke after <n> s.` after the computer slept. It dials your door outward, one WebSocket, and listens
  on no port.
- **Stop it** with Ctrl-C: the computer then shows as not connected at your door, and is back when you start it again.
- **Disconnect** it on Machines at your door (`https://<you>.syns.dev/_machines`): the program prints
  `Disconnected at <you>.syns.dev.` and ends, and gives Unife Pages back the address settings it had. To join this
  computer again, sign in to Syns on it again (`syns login`) and start the program.
- It keeps `~/.syns-live/machine.json` (readable by you alone): this computer's id, its name and address, and the
  credential it connects with.
