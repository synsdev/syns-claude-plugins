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
terminal of your own; nothing starts it by itself. macOS and Linux.

It needs, on this computer:

- Node 22 or later.
- To join your door, a Syns login made by `syns login` with Syns CLI 0.3.29 or later (`syns --version`), approved in
  your browser on the page that reads "asks to join `<you>.syns.dev` as `<name>`". No other login joins a computer to
  your door. With an older one the program prints "This computer's Syns login names no machine. Update the Syns CLI,
  then sign in to Syns again on this computer." and ends; with one that names no account, "The Syns login here names
  no account: sign in to Syns again."
- Unife Pages, which this plugin brings in.

```sh
node <plugin root>/machine/machine.mjs
```

The plugin root is `~/.claude/plugins/cache/syns/syns/<version>`, the version `claude plugin list` shows for
`syns@syns`. It takes no argument and no option, and refuses to run from inside an agent's session. The Claude Code
and Unife Pages paths here are the defaults: where you set `CLAUDE_CONFIG_DIR` or `UNIFE_PAGES_HOME`, they are under
those.

- **The address** comes from the name your `syns login` was approved under: this computer's name, lowercased
  (`MacBook-Pro.local` is `macbook-pro`). Your door gives it once, when the computer first joins; `-2`, `-3` … when
  the name is taken. The program prints it first: `<you>--<name>.syns.dev`.
- **It changes Unife Pages' settings**, `~/.unife-pages/settings.json`: it adds `https://<you>--<name>.syns.dev` to
  `remoteOrigins` and makes it the `publicOrigin`, and keeps every other setting. Then it restarts the Unife Pages
  daemon so that it reads them, or starts it if it is not running; a daemon already on these settings is left as it
  is. From then on your agents' page links are at `https://<you>--<name>.syns.dev`. While the program runs, a page
  asked for while the daemon is not running starts the daemon again.
- **Then one line per event:** `Connected.`; `Not connected (<why>). Trying again.` and `Connected again after <n> s.`
  around a drop; `Woke after <n> s.` after the computer slept. It dials your door outward, one WebSocket, and listens
  on no port.
- **Stop it** with Ctrl-C: the computer then shows as not connected at your door, and is back when you start it again.
  Unife Pages' settings stay as the program set them, so your agents' page links answer "`<name>` is not connected"
  until you start the program again or put the settings back.
- **Disconnect** it on Machines at your door (`https://<you>.syns.dev/_machines`): the program prints
  `Disconnected at <you>.syns.dev.`, puts Unife Pages' settings back as the next point says, restarts the daemon if it
  runs on them, and ends. Pressed while the program is stopped, this happens at its next start. To join this computer
  again once the program has printed that line and ended, run `syns login` on it again and start the program.
- **To put the settings back yourself**, stop the program first, then do what Disconnect does: in
  `~/.unife-pages/settings.json`, take the address `~/.syns-live/machine.json` keeps as `origin` out of
  `remoteOrigins`, and set `publicOrigin` back to the value it keeps as `publicOriginBefore` (where that is `null`,
  `null` or no `publicOrigin` at all), or remove it where `hadPublicOrigin` is `false` there. Then restart the
  daemon: `node <unife-pages root>/bin/unife-pages.js daemon stop`, then the same with `daemon start`. The Unife
  Pages root is `~/.claude/plugins/cache/syns/unife-pages/<version>`, the version `claude plugin list` shows for
  `unife-pages@syns`.
- It keeps `~/.syns-live/machine.json` (readable by you alone): this computer's id, its name and address, the
  credential it connects with, and the `publicOrigin` Unife Pages had before.
