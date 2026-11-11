// A computer of your own at your Syns live door. It ships in the `syns` plugin for Claude Code; you run it in a terminal
// of your own: `node <plugin root>/machine/machine.mjs`. It takes no argument and no option. It joins your door with the
// Syns login on this computer (once), declares the address the door gives it to the Unife Pages daemon here, and dials
// the door: one WebSocket, outbound, over which the door relays your signed-in browsers' requests to the daemon. It
// listens on no port. It stays in the foreground, prints one line per event, and ends on Ctrl-C. Node 22 or later; no
// dependency.
//
// It keeps ~/.syns-live/machine.json (0600): this computer's machine id, the name and address the door gave it, and
// the credential it dials with. It ends there when you press Disconnect on Machines, or when the Syns login here is
// gone or is another account's.

import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { CLOSE, HB, HB_ACK, KEY_RE, MAX_CHUNK, PROTOCOL, WINDOW, decode, encode } from "./frames.mjs";

const say = (line) => console.log(line);
const fail = (line) => { console.log(line); process.exit(1); };

// ---- who may run it, and where things are: every path from the environment (HOME and the variables their owners define) ----
if (process.env.CLAUDE_CODE_SESSION_ID !== undefined) fail("This program is yours to run: start it in a terminal of your own, not from an agent.");
const major = Number(process.versions.node.split(".")[0]);
if (!(major >= 22) || typeof WebSocket !== "function") fail(`This program needs Node 22 or later; this is Node ${process.versions.node}.`);
const HOME = process.env.HOME;
if (!HOME || !path.isAbsolute(HOME)) fail("HOME is not set to a folder.");
const set = (name) => (process.env[name] ? process.env[name] : null);
const STATE_DIR = path.join(HOME, ".syns-live");
const STATE = path.join(STATE_DIR, "machine.json");
const UNIFE_HOME = set("UNIFE_PAGES_HOME") ?? path.join(HOME, ".unife-pages");
const SETTINGS = path.join(UNIFE_HOME, "settings.json");
/** The syns CLI's login: SYNS_CONFIG_DIR, else the platform's configuration folder (the CLI's `dirs::config_dir`). */
const SYNS_LOGIN = path.join(set("SYNS_CONFIG_DIR") ?? (process.platform === "darwin"
  ? path.join(HOME, "Library", "Application Support", "syns")
  : path.join(set("XDG_CONFIG_HOME") && path.isAbsolute(process.env.XDG_CONFIG_HOME) ? process.env.XDG_CONFIG_HOME : path.join(HOME, ".config"), "syns")), "credentials.json");
const ZONE = "syns.dev";
// The door's rule for a person: a username it serves, never one of the zone's own hosts.
const RESERVED = new Set(["www", "staging", "install", "api", "docs", "agents", "app", "admin", "mail", "send", "dev", "syns", "live", "status", "account", "bb", "auth", "login", "help", "support", "blog"]);
const isPerson = (u) => typeof u === "string" && /^[a-z0-9][a-z0-9-]{0,38}$/.test(u) && !u.includes("--") && !RESERVED.has(u);
const sha256 = (s) => createHash("sha256").update(s).digest("base64url");

/** Unife Pages' CLI: UNIFE_PAGES_PLUGIN_ROOT, else the newest unife-pages in Claude Code's plugin cache. */
function unifeCli() {
  const root = set("UNIFE_PAGES_PLUGIN_ROOT");
  if (root) return fs.existsSync(path.join(root, "bin", "unife-pages.js")) ? path.join(root, "bin", "unife-pages.js") : null;
  const config = set("CLAUDE_CONFIG_DIR") && path.isAbsolute(process.env.CLAUDE_CONFIG_DIR) ? process.env.CLAUDE_CONFIG_DIR : path.join(HOME, ".claude");
  const cache = path.join(config, "plugins", "cache");
  const found = [];
  for (const market of fs.existsSync(cache) ? fs.readdirSync(cache) : []) {
    const dir = path.join(cache, market, "unife-pages");
    for (const v of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (fs.existsSync(path.join(dir, v, "bin", "unife-pages.js"))) found.push({ v, cli: path.join(dir, v, "bin", "unife-pages.js") });
  }
  found.sort((a, b) => a.v.localeCompare(b.v, undefined, { numeric: true }));
  return found.at(-1)?.cli ?? null;
}
const CLI = unifeCli();
if (!CLI) fail("Unife Pages is not installed on this computer: install the Syns plugins for Claude Code first.");

// ---- this computer's state ----
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
function writeJson(p, value, mode) {
  const tmp = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", { mode });
  fs.chmodSync(tmp, mode);
  fs.renameSync(tmp, p);
}
let state = readJson(STATE) ?? {};
function save() {
  fs.mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
  fs.chmodSync(STATE_DIR, 0o700);
  writeJson(STATE, state, 0o600);
}
if (typeof state.id !== "string" || !/^[A-Za-z0-9_-]{22}$/.test(state.id)) { state = { id: randomBytes(16).toString("base64url") }; save(); }
/** The Syns login here: `{ token, username }`, or null. */
function synsLogin() {
  const j = readJson(SYNS_LOGIN);
  return j && typeof j.token === "string" && j.token ? { token: j.token, username: typeof j.username === "string" && j.username ? j.username : null } : null;
}

// ---- the daemon's settings, and its restart ----
/**
 * The daemon's settings: none yet is `{}`; a file that does not read as an object is never rewritten (`null`). The
 * listener is read from the last settings that did read, so a file being edited never sends a request elsewhere.
 */
function settings() {
  if (!fs.existsSync(SETTINGS)) return {};
  const j = readJson(SETTINGS);
  return j && typeof j === "object" && !Array.isArray(j) ? j : null;
}
let listening = null;
function listener() {
  const s = settings();
  if (s || !listening) {
    const l = s?.listen ?? {};
    listening = { host: l.host === "::1" ? "::1" : "127.0.0.1", port: Number.isInteger(l.port) ? l.port : 7341 };
  }
  return listening;
}
const unreadable = () => `Unife Pages' settings.json does not read as JSON; nothing was changed in it. Fix it, then start this again.`;
const run = (args) => new Promise((resolve) => {
  execFile(process.execPath, [CLI, ...args], { env: process.env, timeout: 120_000 }, (e, stdout, stderr) => resolve({ ok: !e, stdout: String(stdout), stderr: String(stderr) }));
});
/** What the daemon answers under a Host: 200 (it serves it), 421 (it does not), or 0 (it does not answer). */
const health = (host) => new Promise((resolve) => {
  const { host: at, port } = listener();
  const r = http.get({ host: at, port, path: "/health", headers: { host }, agent: false, timeout: 5000 }, (res) => { res.resume(); resolve(res.statusCode ?? 0); });
  r.on("timeout", () => r.destroy());
  r.on("error", () => resolve(0));
});
/** The daemon's settings, every other key kept, the file replaced whole. */
function declare(origin) {
  const s = settings();
  if (!s) fail(unreadable());
  // The daemon's own publicOrigin from before the join, kept here and put back when this computer leaves the door.
  if (s.publicOrigin !== origin) { state.publicOriginBefore = s.publicOrigin ?? null; state.hadPublicOrigin = "publicOrigin" in s; }
  s.remoteOrigins = [...new Set([...(Array.isArray(s.remoteOrigins) ? s.remoteOrigins : []).filter((o) => o !== origin), origin])];
  s.publicOrigin = origin;
  fs.mkdirSync(UNIFE_HOME, { recursive: true });
  writeJson(SETTINGS, s, fs.existsSync(SETTINGS) ? fs.statSync(SETTINGS).mode & 0o777 : 0o600);
}
function undeclare(origin) {
  const s = settings();
  if (!fs.existsSync(SETTINGS)) return;
  if (!s) { say(unreadable()); return; }
  s.remoteOrigins = (Array.isArray(s.remoteOrigins) ? s.remoteOrigins : []).filter((o) => o !== origin);
  if (s.publicOrigin === origin) {
    if (state.hadPublicOrigin) s.publicOrigin = state.publicOriginBefore ?? null; else delete s.publicOrigin;
  }
  writeJson(SETTINGS, s, fs.statSync(SETTINGS).mode & 0o777);
}
/**
 * The daemon reads its settings once, at its start: it restarts only when it does not already answer as `want` says.
 * Declared (`want` true): 200 under the public Host is loaded, 421 is running on older settings (stop, then start), no
 * answer is not running (start). Left (`want` false): 200 is still declared (stop, then start).
 */
async function reload(host, want) {
  const now = await health(host);
  if (want ? now === 200 : now !== 200) return;
  if (now !== 0) {
    const stop = await run(["daemon", "stop"]);
    if (!stop.ok) say(`Unife Pages did not stop: ${stop.stderr.trim().split("\n")[0] ?? ""}`);
  }
  if (want || now !== 0) {
    const start = await run(["daemon", "start"]);
    if (!start.ok) say(`Unife Pages did not start: ${(start.stderr || start.stdout).trim().split("\n")[0] ?? ""}`);
  }
}

// ---- leaving a door: Disconnect, the account changed, no Syns login ----
const doorOf = (u) => `${u}.${ZONE}`;
async function leave() {
  // A settings file that does not read is left as it is, and the daemon with it.
  if (state.origin && settings()) { undeclare(state.origin); await reload(new URL(state.origin).host, false); }
  else if (state.origin) say(unreadable());
  state = { id: state.id };
  save();
}

// ---- start ----
const login = synsLogin();
if (!login) {
  if (state.credential) await leave();
  fail("No Syns login on this computer.");
}
if (login.username !== null && !isPerson(login.username)) fail(`The Syns login here is ${JSON.stringify(login.username)}, which has no address at ${ZONE}.`);
if (state.gone) {
  if (sha256(login.token) === state.gone.token) {
    say(`Disconnected at ${doorOf(state.gone.username)}. Sign in to Syns again on this computer to join it again.`);
    process.exit(0);
  }
  state = { id: state.id }; save();
}
if (state.credential && login.username !== null && login.username !== state.username) {
  // Another account is signed in to Syns here: this computer is at that account's door now, not the first one's.
  await leave();
}
if (!state.credential && login.username === null) fail("The Syns login here names no account: sign in to Syns again.");

const backoff = (attempt) => Math.min(30_000, 1000 * 2 ** attempt) * (0.8 + Math.random() * 0.4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (!state.credential) {
  for (let attempt = 0; ; attempt++) {
    const r = await join(login.username);
    if (r === "joined") break;
    if (attempt === 0) say(`Not connected (${r}). Trying again.`);
    await sleep(backoff(Math.min(attempt, 5)));
  }
}
const USERNAME = state.username, NAME = state.name, LABEL = `${USERNAME}--${NAME}`, HOST = `${LABEL}.${ZONE}`, ORIGIN = `https://${HOST}`;
say(HOST);
state.origin = ORIGIN;
declare(ORIGIN);
save();
await reload(HOST, true);

/**
 * Join the door once: the Syns token goes to that address and no other, and no redirect is followed. Answers
 * "joined", or why it did not for a moment; a refusal ends the program.
 */
async function join(username) {
  let r;
  try {
    const token = synsLogin()?.token;
    if (!token) fail("No Syns login on this computer.");
    r = await fetch(`https://${doorOf(username)}/_machines/join`, {
      method: "POST", redirect: "manual", signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ id: state.id, name: os.hostname() || "machine" }),
    });
  } catch (e) { return `couldn't reach ${doorOf(username)}: ${e?.cause?.code ?? e?.message ?? e}`; }
  if (r.status >= 300 && r.status < 400) fail(`${doorOf(username)} answered the join with a redirect, which is not followed.`);
  if (r.status === 401) fail("Syns did not take the login on this computer: sign in to Syns again.");
  if (r.status === 403) fail(`The Syns login here is not ${doorOf(username)}'s.`);
  if (r.status === 409 || r.status === 400) fail((await r.text().catch(() => "")).trim() || `${doorOf(username)} refused the join (${r.status}).`);
  if (!r.ok) return `the join answered ${r.status}`;
  const j = await r.json().catch(() => null);
  if (!j || typeof j.name !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(j.name) || typeof j.credential !== "string" || !KEY_RE.test(j.credential)) return "the join's answer was not one";
  state = { ...state, username, name: j.name, credential: j.credential };
  save();
  return "joined";
}

// ---- the connection ----
let ws = null, connectedOnce = false, outageSince = 0, lastAck = 0, probeUntil = 0, attempt = 0, openedAt = 0, redialTimer = null, ending = false;
const streams = new Map();
function outage(why) {
  if (!outageSince) { outageSince = Date.now(); say(`Not connected (${why}). Trying again.`); }
}
function drop(why, at = "backoff") {
  const old = ws;
  ws = null;
  probeUntil = 0; // the wake's question was the old socket's
  for (const s of streams.values()) s.abort();
  streams.clear();
  if (old) { try { old.close(1000); } catch { /* gone */ } }
  outage(why);
  if (Date.now() - openedAt >= 60_000) attempt = 0;
  schedule(at === "now" ? 0 : backoff(Math.min(attempt++, 5)));
}
function schedule(ms) { clearTimeout(redialTimer); redialTimer = setTimeout(dial, ms); }
async function revoked() {
  ending = true;
  try { ws?.close(1000); } catch { /* gone */ }
  say(`Disconnected at ${doorOf(USERNAME)}.`);
  const t = synsLogin()?.token;
  const keep = { username: USERNAME, token: t ? sha256(t) : null };
  await leave();
  state.gone = keep;
  save();
  process.exit(0);
}
/** After a dial that failed before it opened: was it refused (401: the credential is no longer this address's) or did it not arrive? */
async function refused() {
  try {
    const r = await fetch(`${ORIGIN}/_dial`, { method: "POST", redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { authorization: `Bearer ${state.credential}` } });
    return r.status === 401;
  } catch { return false; }
}
// One dial at a time: a socket that has not opened, or the question after one that failed, is waited for.
let asking = false;
function dial() {
  if (ending || ws || asking) return;
  let opened = false, settled = false;
  // Node's own client, with the credential as `Authorization: Bearer` on the upgrade (undici's headers form):
  // Workers Logs mask that header, and keep an offered protocol whole (M4).
  const sock = new WebSocket(`wss://${HOST}/_dial`, { protocols: [PROTOCOL], headers: { authorization: `Bearer ${state.credential}` } });
  sock.binaryType = "arraybuffer";
  ws = sock;
  /**
   * A dial that did not open: at `error` (Node 22 gives that alone), at `close`, or at the give-up 15 s after it began,
   * whichever comes first. The client does not say why, so the door is asked: only its 401 is a revoke.
   */
  const notOpened = async (why) => {
    if (opened || settled || ws !== sock) return;
    settled = true;
    clearTimeout(giveUp);
    ws = null;
    try { sock.close(); } catch { /* not open */ }
    asking = true;
    const no = await refused();
    asking = false;
    if (ending || ws) return;
    if (no) return revoked();
    outage(why);
    schedule(backoff(Math.min(attempt++, 5)));
  };
  // A path that dies after the connection is made answers nothing: given up after 15 s.
  const giveUp = setTimeout(() => notOpened("the door did not answer the dial"), 15_000);
  sock.addEventListener("open", () => {
    clearTimeout(giveUp);
    if (ws !== sock || settled) return;
    // A new socket owes no answer to a question asked on another one (VERIFY.md P4).
    opened = true; openedAt = Date.now(); lastAck = Date.now(); probeUntil = 0;
    if (!connectedOnce) say("Connected.");
    else if (outageSince) say(`Connected again after ${Math.round((Date.now() - outageSince) / 1000)} s.`);
    connectedOnce = true; outageSince = 0;
  });
  sock.addEventListener("message", (e) => {
    if (ws !== sock) return;
    if (typeof e.data === "string") { if (e.data === HB_ACK) { lastAck = Date.now(); probeUntil = 0; } return; }
    const f = decode(e.data);
    if (f) onFrame(f);
  });
  sock.addEventListener("error", () => { if (!opened) void notOpened("the door could not be reached"); });
  sock.addEventListener("close", (e) => {
    clearTimeout(giveUp);
    if (!opened) return void notOpened("the door could not be reached");
    if (ws !== sock || ending) return;
    if (e.code === CLOSE.replaced) { ending = true; say("Another copy of this program connected as this computer."); process.exit(0); }
    if (e.code === CLOSE.revoked) return void revoked();
    drop(`the connection closed (${e.code})`);
  });
}
const send = (f) => { try { ws?.send(encode(f)); } catch { /* the close event says so */ } };

// The heartbeat every 20 s; no answer for 60 s drops the socket. A clock that jumped (the computer slept) asks at once
// and drops after 5 s without an answer.
let tick = Date.now(), beat = Date.now();
setInterval(() => {
  const now = Date.now();
  const gap = now - tick;
  tick = now;
  if (gap > 21_000) {
    say(`Woke after ${Math.floor(gap / 1000)} s.`);
    if (ws?.readyState === WebSocket.OPEN) { probeUntil = now + 5000; try { ws.send(HB); } catch { /* closing */ } }
    else if (!ending && !ws && !asking) { attempt = 0; schedule(0); } // a dial under way is left to finish
    return;
  }
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  if (probeUntil) { if (now > probeUntil) drop("no answer from the door after the computer woke", "now"); return; }
  if (now - lastAck > 60_000) return drop("no answer from the door for 60 s");
  if (now - beat >= 20_000) { beat = now; try { ws.send(HB); } catch { /* closing */ } }
}, 1000);

// Ctrl-C: the socket is closed, its close let out (a second at most), and the program ends. The daemon's settings stay.
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  ending = true;
  const open = ws;
  if (!open || open.readyState !== WebSocket.OPEN) process.exit(0);
  open.addEventListener("close", () => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
  try { open.close(1000); } catch { process.exit(0); }
});
dial();

// ---- a request from the door, to the daemon on loopback ----
const HOP = new Set(["connection", "keep-alive", "proxy-connection", "te", "trailer", "transfer-encoding", "upgrade", "host", "content-length", "expect"]);
const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
let daemonStartedAt = 0;
function plain(stream, status, text) {
  send({ type: "head", stream, status, headers: [["content-type", "text/plain; charset=utf-8"], ["cache-control", "no-store"]] });
  send({ type: "body", stream, data: new TextEncoder().encode(text) });
  send({ type: "end", stream });
}
function onFrame(f) {
  if (f.type === "ask") return void mint(f.stream);
  if (f.type === "open") return open(f);
  const s = streams.get(f.stream);
  if (!s) return;
  if (f.type === "body") s.body(f.data);
  else if (f.type === "end") s.end();
  else if (f.type === "window") s.window(f.bytes);
  else if (f.type === "close") { s.abort(); streams.delete(f.stream); }
}
/**
 * One stream: one request the program frames itself, on a connection of its own to the daemon's listener, under this
 * machine's own Host. Nothing of the frame chooses where it goes: the path must begin with `/`, the method be a token,
 * and no hop-by-hop header passes.
 */
function open(f) {
  const id = f.stream;
  if (!TOKEN.test(f.method) || !f.path.startsWith("/")) return plain(id, 400, "Not a request this machine takes.");
  // Hop-by-hop headers, and any the request's Connection header names, never reach the daemon.
  const named = new Set(f.headers.filter(([k]) => k.toLowerCase() === "connection").flatMap(([, v]) => v.split(",").map((t) => t.trim().toLowerCase())));
  const headers = [];
  for (const [k, v] of f.headers) if (!HOP.has(k.toLowerCase()) && !named.has(k.toLowerCase())) headers.push(k, v);
  headers.push("host", HOST);
  // A body is always chunked, whatever the method: Node sends a GET's or a DELETE's body unframed otherwise, and its
  // bytes could be read as a second request.
  if (f.body) headers.push("transfer-encoding", "chunked");
  const { host, port } = listener();
  let req;
  try { req = http.request({ host, port, method: f.method, path: f.path, headers, agent: false, setHost: false }); }
  catch { return plain(id, 400, "Not a request this machine takes."); }
  let given = 0, taken = 0, credit = WINDOW, res = null, done = false, ended = false;
  const pending = [];
  const flush = () => {
    while (pending.length && credit > 0 && !done) {
      const n = Math.min(credit, MAX_CHUNK, pending[0].length);
      send({ type: "body", stream: id, data: pending[0].subarray(0, n) });
      credit -= n;
      if (n === pending[0].length) pending.shift(); else pending[0] = pending[0].subarray(n);
    }
    if (done || !res) return;
    if (pending.length) res.pause();
    else if (ended) { done = true; streams.delete(id); send({ type: "end", stream: id }); }
    else res.resume();
  };
  const s = {
    body(data) {
      given += data.length;
      if (given - taken > WINDOW) { s.abort(); streams.delete(id); send({ type: "close", stream: id, code: 400, reason: "past the window" }); return; }
      req.write(Buffer.from(data), () => { taken += data.length; if (data.length) send({ type: "window", stream: id, bytes: data.length }); });
    },
    end() { req.end(); },
    window(n) { credit += n; flush(); },
    abort() { done = true; req.destroy(); res?.destroy(); },
  };
  streams.set(id, s);
  req.on("response", (r) => {
    res = r;
    if (done) return r.destroy();
    const pairs = [];
    for (let i = 0; i < r.rawHeaders.length; i += 2) pairs.push([r.rawHeaders[i], r.rawHeaders[i + 1]]);
    send({ type: "head", stream: id, status: r.statusCode ?? 502, headers: pairs });
    // The answer's body goes under the window the door opens as the browser reads: never a byte past it.
    r.on("data", (chunk) => { pending.push(chunk); flush(); });
    r.on("end", () => { ended = true; flush(); });
    r.on("error", () => { if (!done) { done = true; streams.delete(id); send({ type: "close", stream: id, code: 502, reason: "the answer broke off" }); } });
  });
  req.on("error", (e) => {
    if (done) return;
    done = true;
    streams.delete(id);
    if (res) return send({ type: "close", stream: id, code: 502, reason: "the answer broke off" });
    if (e.code === "ECONNREFUSED") {
      plain(id, 502, `Pages is not running on ${NAME}.`);
      if (Date.now() - daemonStartedAt > 60_000) { daemonStartedAt = Date.now(); void run(["daemon", "start"]); }
      return;
    }
    send({ type: "close", stream: id, code: 502, reason: "the request did not reach Pages" });
  });
  if (!f.body) req.end();
}

// ---- the reader sign-in: minted and redeemed here, one at a time; only the reader cookie goes back ----
let minting = Promise.resolve();
function mint(stream) {
  minting = minting.then(async () => {
    const out = await run(["open", "--print", "--origin", ORIGIN]);
    const link = out.ok ? out.stdout.trim().split("\n").pop() : "";
    if (!link.startsWith(`${ORIGIN}/open?t=`)) return send({ type: "answer", stream, error: "no sign-in link" });
    const at = new URL(link);
    const cookies = await new Promise((resolve) => {
      const { host, port } = listener();
      const r = http.get({ host, port, path: at.pathname + at.search, headers: { host: HOST }, agent: false, timeout: 10_000 }, (res) => {
        res.resume();
        const set = res.headers["set-cookie"] ?? [];
        resolve(res.statusCode === 303 ? set.filter((c) => c.startsWith("unife_reader=")) : []); // the reader cookie alone
      });
      r.on("timeout", () => r.destroy());
      r.on("error", () => resolve([]));
    });
    send(cookies.length ? { type: "answer", stream, cookies } : { type: "answer", stream, error: "the sign-in link was not taken" });
  }).catch(() => send({ type: "answer", stream, error: "the sign-in failed" }));
}
