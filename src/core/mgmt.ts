/**
 * Management configuration of Cisco IOS devices (SR-CLI-11): local users, console/VTY lines, banners.
 * Educational simulator only: nothing here authenticates anyone. Credentials are stored as derived type-5 strings and are
 * never kept in clear text. A line/user `password` is printed as `password 7 <token>`; the token is the stored hash without
 * its `$1$…$` framing — a SIMULATED stand-in, NOT a real (reversible) Cisco type 7 string.
 */
import { TYPE5_RE, hashType5 } from './secret';
import type { Device, DeviceMgmt, LineConfig, LineId, LocalUser } from './types';

export const USER_RE = /^[A-Za-z0-9._@-]{1,32}$/;
export const MAX_USERS = 50;
export const BANNER_MAX = 500;
/** simulator bound for a typed credential */
export const CRED_MAX = 64;
export const EXEC_DEFAULT = { min: 10, sec: 0 };

export const LINE_LABEL: Record<LineId, string> = { console: 'line con 0', vty04: 'line vty 0 4', vty015: 'line vty 0 15' };
export const LINE_ORDER: LineId[] = ['console', 'vty04', 'vty015'];

/** the `password 7 <token>` token of a stored type-5 string: its salt and hash joined, without `$1$` and `$` */
export function tokenOf(type5: string): string {
  return type5.slice(3).replace('$', '');
}
/** a type-5 string from a printed token (salt 1-8 characters + 22 hash characters), or null */
export function type5FromToken(token: string): string | null {
  if (!/^[./0-9A-Za-z]{23,30}$/.test(token)) return null;
  const s = `$1$${token.slice(0, token.length - 22)}$${token.slice(-22)}`;
  return TYPE5_RE.test(s) ? s : null;
}

/** a typed clear-text credential as the stored derived string (the caller has checked the length and the masked-history value) */
export const derive = (clear: string) => hashType5(clear);

export function lineCfg(dev: Device, id: LineId): LineConfig | undefined {
  return dev.mgmt?.[id];
}

/** edits (creating when needed) one line's config; an emptied line and an emptied `mgmt` are removed (original device shape) */
export function editLine(dev: Device, id: LineId, f: (c: LineConfig) => void): void {
  const mgmt: DeviceMgmt = { ...(dev.mgmt ?? {}) };
  const cfg: LineConfig = { ...(mgmt[id] ?? {}) };
  f(cfg);
  for (const k of Object.keys(cfg) as (keyof LineConfig)[]) if (cfg[k] === undefined) delete cfg[k];
  if (Object.keys(cfg).length) mgmt[id] = cfg;
  else delete mgmt[id];
  setMgmt(dev, mgmt);
}

export function editBanner(dev: Device, kind: 'motd' | 'login', text: string | null): void {
  const mgmt: DeviceMgmt = { ...(dev.mgmt ?? {}) };
  const banners = { ...(mgmt.banners ?? {}) };
  if (text === null) delete banners[kind];
  else banners[kind] = text;
  if (Object.keys(banners).length) mgmt.banners = banners;
  else delete mgmt.banners;
  setMgmt(dev, mgmt);
}

function setMgmt(dev: Device, mgmt: DeviceMgmt): void {
  if (Object.keys(mgmt).length) dev.mgmt = mgmt;
  else delete dev.mgmt;
}

export function setUser(dev: Device, u: LocalUser): void {
  const users = [...(dev.security?.users ?? [])];
  const at = users.findIndex((x) => x.name === u.name);
  if (at >= 0) users[at] = u;
  else users.push(u);
  dev.security = { ...dev.security, users };
}

/** false when no such user */
export function removeUser(dev: Device, name: string): boolean {
  const users = dev.security?.users ?? [];
  if (!users.some((u) => u.name === name)) return false;
  const rest = users.filter((u) => u.name !== name);
  const sec = { ...dev.security };
  if (rest.length) sec.users = rest;
  else delete sec.users;
  if (Object.keys(sec).length) dev.security = sec;
  else delete dev.security;
  return true;
}

/**
 * Splits `<delim>text<delim>` (the part of a `banner` line after the keyword). The delimiter is the first character
 * (not a letter, digit or space); the text ends at the next delimiter and nothing may follow it.
 */
export function parseBanner(raw: string): { text: string } | { error: string } {
  const d = raw[0];
  if (!d || /[A-Za-z0-9\s]/.test(d)) return { error: 'delimiter' };
  const end = raw.indexOf(d, 1);
  if (end < 0) return { error: 'unterminated' };
  if (raw.slice(end + 1).trim() !== '') return { error: 'trailing' };
  const text = raw.slice(1, end);
  if (!text.trim()) return { error: 'empty' };
  if (text.length > BANNER_MAX) return { error: 'long' };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(text)) return { error: 'control' };
  return { text };
}

const userLine = (u: LocalUser) =>
  `username ${u.name}${u.privilege !== undefined ? ` privilege ${u.privilege}` : ''}` +
  (u.secret ? ` secret 5 ${u.secret}` : '') +
  (u.password ? ` password 7 ${tokenOf(u.password)}` : '');

/** `username` lines of the running-config, in the order they were configured */
export function renderUsers(dev: Device): string[] {
  return (dev.security?.users ?? []).map(userLine);
}

/** banner and line blocks of the running-config (IOS puts them after the interfaces, just before `end`) */
export function renderMgmt(dev: Device): string[] {
  const m = dev.mgmt;
  if (!m) return [];
  const out: string[] = [];
  if (m.banners?.login !== undefined) out.push(`banner login ^C${m.banners.login}^C`, '!');
  if (m.banners?.motd !== undefined) out.push(`banner motd ^C${m.banners.motd}^C`, '!');
  for (const id of LINE_ORDER) {
    const c = m[id];
    if (!c) continue;
    out.push(LINE_LABEL[id]);
    if (c.execTimeout && (c.execTimeout.min !== EXEC_DEFAULT.min || c.execTimeout.sec !== EXEC_DEFAULT.sec)) {
      out.push(` exec-timeout ${c.execTimeout.min} ${c.execTimeout.sec}`);
    }
    if (c.password) out.push(` password 7 ${tokenOf(c.password)}`);
    if (c.login) out.push(c.login === 'local' ? ' login local' : ' login');
    if (c.transport) out.push(` transport input ${c.transport}`);
    out.push('!');
  }
  return out;
}
