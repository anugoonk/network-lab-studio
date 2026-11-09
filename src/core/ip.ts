/** IPv4 helpers (strict dotted-decimal). */
export function parseIp(s: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s.trim());
  if (!m) return null;
  let n = 0;
  for (let i = 1; i <= 4; i++) {
    const o = Number(m[i]);
    if (o > 255) return null;
    n = n * 256 + o;
  }
  return n;
}

export function ipToString(n: number): string {
  return [24, 16, 8, 0].map((sh) => Math.floor(n / 2 ** sh) % 256).join('.');
}

export function isValidMask(s: string): boolean {
  const n = parseIp(s);
  if (n === null || n === 0) return false;
  const inv = ~n >>> 0; // host bits must be 2^k - 1
  return (inv & (inv + 1)) === 0;
}

export function maskToPrefix(s: string): number {
  const n = parseIp(s) ?? 0;
  let c = 0;
  for (let i = 31; i >= 0; i--) if ((n >>> i) & 1) c++;
  return c;
}

export function networkOf(ip: string, mask: string): number | null {
  const a = parseIp(ip);
  const m = parseIp(mask);
  if (a === null || m === null) return null;
  return (a & m) >>> 0;
}

export function sameSubnet(ip1: string, ip2: string, mask: string): boolean {
  const n1 = networkOf(ip1, mask);
  const n2 = networkOf(ip2, mask);
  return n1 !== null && n1 === n2;
}

/** A usable unicast host address for the given mask (not network / broadcast, not 0.x, not >=224). */
export function isHostAddress(ip: string, mask: string): boolean {
  const a = parseIp(ip);
  const m = parseIp(mask);
  if (a === null || m === null) return false;
  if (a >>> 24 === 0 || a >>> 24 >= 224 || a >>> 24 === 127) return false;
  const net = (a & m) >>> 0;
  const bcast = (net | (~m >>> 0)) >>> 0;
  if (maskToPrefix(mask) >= 31) return true;
  return a !== net && a !== bcast;
}

export function subnetsOverlap(ip1: string, m1: string, ip2: string, m2: string): boolean {
  const p = Math.min(maskToPrefix(m1), maskToPrefix(m2));
  const mask = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
  const a = parseIp(ip1);
  const b = parseIp(ip2);
  if (a === null || b === null) return false;
  return ((a & mask) >>> 0) === ((b & mask) >>> 0);
}

export function prefixToMask(prefix: number): string {
  const n = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return ipToString(n);
}

/** "10.0.0.1/24" → { ip, mask } or null */
export function parseCidr(text: string): { ip: string; mask: string; prefix: number } | null {
  const m = /^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/.exec(text);
  if (!m || parseIp(m[1]) === null || Number(m[2]) > 32) return null;
  return { ip: m[1], mask: prefixToMask(Number(m[2])), prefix: Number(m[2]) };
}
