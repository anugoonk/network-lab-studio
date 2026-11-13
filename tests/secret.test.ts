/**
 * CERT-P0-1a: type-5 (MD5-crypt) secrets. The vectors were produced with OpenSSL 3.5 `openssl passwd -1 -salt <salt> <pw>`,
 * an independent implementation of the same "$1$" algorithm; `$1$mERr$hx5rVt7rPNoS4wqbXKX7m0` is the widely published
 * type-5 form of "cisco".
 */
import { describe, expect, it } from 'vitest';
import { TYPE5_RE, hashType5, md5, md5crypt, newSalt, verifyType5 } from '../src/core/secret';

const VECTORS: [string, string, string][] = [
  ['cisco', 'mERr', '$1$mERr$hx5rVt7rPNoS4wqbXKX7m0'],
  ['class', 'abcd', '$1$abcd$8jqYy27Wek90Tm6oQKdzX0'],
  ['Sup3r-S3cret!', 'Zx9a', '$1$Zx9a$Iqnv6vMc519M1WUf.whxk/'],
  ['a', '1234', '$1$1234$tfMnpKq1TrdCjrQgkS9qA1'],
  ['averyveryverylongpassword-0123456789', 'saltsalt', '$1$saltsalt$IXheL/LrWWO6CjshsJk3d/'],
  ['P@ss w0rd', './Az', '$1$./Az$wNl8CpRO6YLltUohPgPFz0'],
];

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('CERT-P0-1a type-5 secret (MD5-crypt)', () => {
  it('MD5 matches the RFC 1321 test suite', () => {
    const e = new TextEncoder();
    expect(hex(md5(e.encode('')))).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(hex(md5(e.encode('abc')))).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(hex(md5(e.encode('message digest')))).toBe('f96b697d7cb7938d525a2f31aaf161d0');
    expect(hex(md5(e.encode('12345678901234567890123456789012345678901234567890123456789012345678901234567890'))))
      .toBe('57edf4a22be3c955ac49da2e2107b67a');
  });

  it.each(VECTORS)('md5crypt(%s, %s) equals the OpenSSL $1$ output', (pw, salt, expected) => {
    expect(md5crypt(pw, salt)).toBe(expected);
    expect(TYPE5_RE.test(expected)).toBe(true);
  });

  it('verifies only the right password, and rejects malformed stored values', () => {
    for (const [pw, , stored] of VECTORS) {
      expect(verifyType5(pw, stored)).toBe(true);
      expect(verifyType5(`${pw}x`, stored)).toBe(false);
      expect(verifyType5(pw.toUpperCase() === pw ? pw.toLowerCase() : pw.toUpperCase(), stored)).toBe(pw.toUpperCase() === pw.toLowerCase());
    }
    expect(verifyType5('cisco', '$1$mERr$short')).toBe(false);
    expect(verifyType5('cisco', 'cisco')).toBe(false);
  });

  it('new hashes use a random 4-character salt, never contain the password, and verify', () => {
    const salts = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const pw = `pw-${i}-${Math.random().toString(36).slice(2)}`;
      const h = hashType5(pw);
      expect(h).toMatch(TYPE5_RE);
      expect(h.split('$')[2]).toHaveLength(4);
      expect(h).not.toContain(pw);
      expect(verifyType5(pw, h)).toBe(true);
      salts.add(newSalt());
    }
    expect(salts.size).toBeGreaterThan(15);
  });
});
