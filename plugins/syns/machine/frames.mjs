// The pipe between the door and a machine of the person's own: one WebSocket, dialed by the machine, carrying binary
// frames. One implementation, imported by the Worker (src/) and by the program (machine/machine.mjs): Node 22 and the
// Workers runtime alike, no dependency.
//
// A frame is 5 bytes of header, then the payload: byte 0 its type, bytes 1 to 4 its stream id (unsigned, big-endian).
// Text messages are the heartbeat alone (HB, answered HB_ACK by the door's object without waking it).

/** The one protocol the machine offers and the door answers. The credential travels as `Authorization: Bearer` (M4). */
export const PROTOCOL = "syns-live.1";
/** A credential: 32 random bytes, base64url. */
export const KEY_RE = /^[A-Za-z0-9_-]{43}$/;
export const HB = "hb";
export const HB_ACK = "hb-ack";
/** How the door closes a machine's connection: a frame it cannot read; another connection took its place; Disconnect. */
export const CLOSE = { unreadable: 4000, replaced: 4001, revoked: 4003 };

export const HEADER = 5;
/** A frame over this is not read: the connection is closed. */
export const MAX_FRAME = 1024 * 1024;
/** The most of a body one frame carries. */
export const MAX_CHUNK = 512 * 1024;
/** Each stream's body, either way, moves under this window, opened again by the receiving end as it hands bytes on. */
export const WINDOW = 1024 * 1024;

export const TYPE = { open: 1, body: 2, end: 3, head: 4, window: 5, close: 6, ask: 7, answer: 8 };
const NAME = Object.fromEntries(Object.entries(TYPE).map(([k, v]) => [v, k]));
/** What the door sends a machine. */
export const FROM_DOOR = new Set(["open", "body", "end", "window", "close", "ask"]);
/** What a machine sends the door. */
export const FROM_MACHINE = new Set(["head", "body", "end", "window", "close", "answer"]);
/** What a request's own stream may carry from the Worker: never `ask`, which only the Worker's own stream for it carries. */
export const FROM_REQUEST = new Set(["open", "body", "end", "window", "close"]);

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const isPairs = (h) => Array.isArray(h) && h.length <= 1000 && h.every((p) => Array.isArray(p) && p.length === 2 && typeof p[0] === "string" && typeof p[1] === "string");
const isStream = (n) => Number.isInteger(n) && n >= 0 && n <= 0xffffffff;

/**
 * The bytes of a frame, given it as an object: `{ type, stream, ... }` with, by type,
 * open `{ method, path, headers, body }`, body `{ data }`, end `{}`, head `{ status, headers }`, window `{ bytes }`,
 * close `{ code, reason }`, ask `{ kind }`, answer `{ cookies }` or `{ error }`. Headers are `[name, value]` pairs.
 */
export function encode(f) {
  const type = TYPE[f.type];
  if (!type || !isStream(f.stream)) throw new Error(`not a frame: ${f.type} ${f.stream}`);
  let payload;
  switch (f.type) {
    case "body": payload = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data); break;
    case "end": payload = new Uint8Array(0); break;
    case "window": payload = new Uint8Array(4); new DataView(payload.buffer).setUint32(0, f.bytes); break;
    case "open": payload = encoder.encode(JSON.stringify({ method: f.method, path: f.path, headers: f.headers, body: f.body })); break;
    case "head": payload = encoder.encode(JSON.stringify({ status: f.status, headers: f.headers })); break;
    case "close": payload = encoder.encode(JSON.stringify({ code: f.code, reason: f.reason })); break;
    case "ask": payload = encoder.encode(JSON.stringify({ kind: f.kind })); break;
    case "answer": payload = encoder.encode(JSON.stringify(f.error !== undefined ? { error: f.error } : { cookies: f.cookies })); break;
  }
  const out = new Uint8Array(HEADER + payload.length);
  out[0] = type;
  new DataView(out.buffer).setUint32(1, f.stream);
  out.set(payload, HEADER);
  return out;
}

/** The type and stream id of a frame's bytes, without reading its payload; null when it is no frame. */
export function peek(bytes) {
  const b = toBytes(bytes);
  if (!b || b.length < HEADER || b.length > MAX_FRAME || !NAME[b[0]]) return null;
  return { type: NAME[b[0]], stream: new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(1) };
}
/** The same bytes with another stream id. */
export function restamp(bytes, stream) {
  const b = new Uint8Array(toBytes(bytes));
  new DataView(b.buffer).setUint32(1, stream);
  return b;
}

/**
 * A frame's bytes as an object (the shape `encode` takes), or null when they are no frame: under 5 bytes, over 1 MiB,
 * of an unknown type, or whose payload is not that type's.
 */
export function decode(bytes) {
  const b = toBytes(bytes);
  const p = peek(b);
  if (!p) return null;
  const payload = b.subarray(HEADER);
  const { type, stream } = p;
  if (type === "body") return { type, stream, data: payload };
  if (type === "end") return payload.length === 0 ? { type, stream } : null;
  if (type === "window") {
    if (payload.length !== 4) return null;
    const n = new DataView(payload.buffer, payload.byteOffset, 4).getUint32(0);
    return n > 0 ? { type, stream, bytes: n } : null;
  }
  let j;
  try { j = JSON.parse(decoder.decode(payload)); } catch { return null; }
  if (!j || typeof j !== "object" || Array.isArray(j)) return null;
  switch (type) {
    case "open":
      return typeof j.method === "string" && typeof j.path === "string" && isPairs(j.headers) && typeof j.body === "boolean"
        ? { type, stream, method: j.method, path: j.path, headers: j.headers, body: j.body } : null;
    case "head":
      return Number.isInteger(j.status) && isPairs(j.headers) ? { type, stream, status: j.status, headers: j.headers } : null;
    case "close":
      return Number.isInteger(j.code) && typeof j.reason === "string" ? { type, stream, code: j.code, reason: j.reason } : null;
    case "ask":
      return j.kind === "reader" ? { type, stream, kind: j.kind } : null;
    case "answer":
      if (typeof j.error === "string") return { type, stream, error: j.error };
      return Array.isArray(j.cookies) && j.cookies.length <= 20 && j.cookies.every((c) => typeof c === "string") ? { type, stream, cookies: j.cookies } : null;
  }
  return null;
}

function toBytes(x) {
  if (x instanceof Uint8Array) return x;
  if (x instanceof ArrayBuffer) return new Uint8Array(x);
  if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
  return null;
}
