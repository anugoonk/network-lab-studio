/**
 * Cisco IOS "type 5" secrets for the simulator: MD5-crypt ("$1$<salt>$<hash>", the FreeBSD/PHK algorithm).
 * Cisco documents type 5 as MD5 and shows the "$1$" form; byte compatibility of this implementation is checked in
 * tests/secret.test.ts against OpenSSL `openssl passwd -1` vectors (not against a physical device).
 *
 * Educational use only: MD5-crypt is a weak, legacy hash. It is used here because it is what a type-5 line looks like,
 * not to protect anything — every Lab lives in the learner's own browser and export files.
 * Synchronous on purpose: the CLI engine is a pure synchronous function (WebCrypto digests are async).
 */

// ───────── MD5 (RFC 1321) ─────────

const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

export function md5(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const padLen = ((data.length + 8) >> 6) * 64 + 64;
  const buf = new Uint8Array(padLen);
  buf.set(data);
  buf[data.length] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(padLen - 8, bitLen >>> 0, true);
  dv.setUint32(padLen - 4, Math.floor(bitLen / 2 ** 32), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let off = 0; off < padLen; off += 64) {
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number, g: number;
      if (i < 16) { f = (b & c) | (~b & d); g = i; }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      const tmp = d;
      d = c;
      c = b;
      const x = (a + f + K[i] + dv.getUint32(off + g * 4, true)) >>> 0;
      b = (b + ((x << S[i]) | (x >>> (32 - S[i])))) >>> 0;
      a = tmp;
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
  }
  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((w, i) => ov.setUint32(i * 4, w, true));
  return out;
}

// ───────── MD5-crypt ─────────

const ITOA64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const enc = new TextEncoder();
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

/** "$1$<salt>$<22 chars>" — salt 1-8 chars of [./0-9A-Za-z]; Cisco uses 4 */
export const TYPE5_RE = /^\$1\$[./0-9A-Za-z]{1,8}\$[./0-9A-Za-z]{22}$/;
const SALT_RE = /^[./0-9A-Za-z]{1,8}$/;

export function md5crypt(password: string, salt: string): string {
  if (!SALT_RE.test(salt)) throw new Error('invalid salt');
  const pw = enc.encode(password);
  const sl = enc.encode(salt);
  const magic = enc.encode('$1$');
  let alt = md5(concat(pw, sl, pw));
  const parts: Uint8Array[] = [pw, magic, sl];
  for (let n = pw.length; n > 0; n -= 16) parts.push(alt.subarray(0, Math.min(16, n)));
  for (let i = pw.length; i; i >>= 1) parts.push(i & 1 ? new Uint8Array([0]) : pw.subarray(0, 1));
  let fin = md5(concat(...parts));
  for (let i = 0; i < 1000; i++) {
    const p: Uint8Array[] = [];
    p.push(i & 1 ? pw : fin);
    if (i % 3) p.push(sl);
    if (i % 7) p.push(pw);
    p.push(i & 1 ? fin : pw);
    fin = md5(concat(...p));
  }
  alt = fin;
  let s = '';
  const to64 = (v: number, n: number) => { for (let k = 0; k < n; k++) { s += ITOA64[v & 0x3f]; v >>= 6; } };
  to64((alt[0] << 16) | (alt[6] << 8) | alt[12], 4);
  to64((alt[1] << 16) | (alt[7] << 8) | alt[13], 4);
  to64((alt[2] << 16) | (alt[8] << 8) | alt[14], 4);
  to64((alt[3] << 16) | (alt[9] << 8) | alt[15], 4);
  to64((alt[4] << 16) | (alt[10] << 8) | alt[5], 4);
  to64(alt[11], 2);
  return `$1$${salt}$${s}`;
}

/** a fresh random 4-character Cisco-style salt */
export function newSalt(): string {
  const bytes = new Uint8Array(4);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ITOA64[b & 0x3f]).join('');
}

export function hashType5(password: string, salt: string = newSalt()): string {
  return md5crypt(password, salt);
}

/** true when `password` matches the stored type-5 string; constant-time comparison of the encoded hash */
export function verifyType5(password: string, stored: string): boolean {
  if (!TYPE5_RE.test(stored)) return false;
  const salt = stored.split('$')[2];
  const calc = md5crypt(password, salt);
  let diff = calc.length ^ stored.length;
  for (let i = 0; i < Math.max(calc.length, stored.length); i++) diff |= (calc.charCodeAt(i) || 0) ^ (stored.charCodeAt(i) || 0);
  return diff === 0;
}
