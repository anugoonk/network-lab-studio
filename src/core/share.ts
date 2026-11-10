/**
 * Share a Lab as a link: the exported JSON is deflated and base64url-encoded into the URL *fragment* (`#lab=…`).
 * The fragment never leaves the browser (it is not sent to the server), and nothing here executes the content — a link
 * is opened exactly like an imported file: validated by the same schema, then added as a new Lab.
 */
import { parseImport, serializeExport, type ParseResult } from './persist';
import type { Lab } from './types';

export const SHARE_PREFIX = 'lab=';
/** the decoded text of a link may not exceed this (a limit against "zip bombs") */
export const SHARE_MAX_BYTES = 5 * 1024 * 1024;
/** above this many characters many chat apps / browsers start to cut links */
export const SHARE_LONG_LINK = 8000;

const hasStreams = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, limit: number): Promise<Uint8Array | null> {
  const writer = stream.writable.getWriter();
  // not awaited before reading: both ends of a TransformStream must make progress together
  void writer.write(bytes as BufferSource).then(() => writer.close()).catch(() => undefined);
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** The fragment (without the leading `#`): `lab=v1.<deflate-raw, base64url>` — or `v0.` (uncompressed) where streams are missing. */
export async function encodeShare(lab: Lab): Promise<string> {
  const json = new TextEncoder().encode(serializeExport(lab));
  if (hasStreams()) {
    const z = await pipe(json, new CompressionStream('deflate-raw'), SHARE_MAX_BYTES);
    if (z) return `${SHARE_PREFIX}v1.${toBase64Url(z)}`;
  }
  return `${SHARE_PREFIX}v0.${toBase64Url(json)}`;
}

/** `lab=…` fragment → the JSON text of the exported Lab. */
export async function decodeShare(fragment: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const bad = { ok: false as const, error: 'ลิงก์แชร์ไม่ถูกต้องหรือถูกตัดไม่ครบ' };
  const body = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  const m = /^lab=(v[01])\.(.+)$/.exec(body);
  if (!m) return bad;
  const bytes = fromBase64Url(m[2]);
  if (!bytes || bytes.length === 0) return bad;
  let raw: Uint8Array | null = bytes;
  if (m[1] === 'v1') {
    if (!hasStreams()) return { ok: false, error: 'เบราว์เซอร์นี้เปิดลิงก์แชร์แบบบีบอัดไม่ได้ (ต้องใช้เบราว์เซอร์รุ่นใหม่)' };
    raw = await pipe(bytes, new DecompressionStream('deflate-raw'), SHARE_MAX_BYTES);
  } else if (bytes.length > SHARE_MAX_BYTES) raw = null;
  if (!raw) return bad;
  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(raw) };
  } catch {
    return bad;
  }
}

/** Decodes and validates a link in one step (same checks as importing a file). */
export async function parseShare(fragment: string): Promise<ParseResult> {
  const d = await decodeShare(fragment);
  return d.ok ? parseImport(d.text) : d;
}

/** the fragment of `location.hash` when it is a share link, else null */
export function shareFragmentOf(hash: string): string | null {
  return hash.startsWith(`#${SHARE_PREFIX}`) ? hash.slice(1) : null;
}
