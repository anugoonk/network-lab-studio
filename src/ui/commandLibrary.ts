/**
 * Command Library view model (UI-CL01): filtering, mode/device options, examples and clipboard over the existing registry.
 *
 * The commands stay in core/cli (SPECS). This module only reads them — it never adds, removes or rewrites a command — so the
 * parser, `?` help, README table and the library keep showing exactly the same list.
 */
import type { CommandSpec, Topic } from '../core/cli/spec';
import { MODE_LABEL, MODE_PATH, exampleFor } from '../core/cli/spec';
import { PROFILES } from '../core/profiles';
import type { CliMode, DeviceKind, Vendor } from '../core/types';
import { tx } from '../i18n';

export interface LibraryFilters {
  q: string;
  vendor: Vendor | '';
  kind: DeviceKind | '';
  mode: CliMode | '';
  topic: Topic | '';
}
export const NO_FILTERS: LibraryFilters = { q: '', vendor: '', kind: '', mode: '', topic: '' };

export const hasActiveFilters = (f: LibraryFilters): boolean => f.q.trim() !== '' || !!f.vendor || !!f.kind || !!f.mode || !!f.topic;

export const vendorName = (v: Vendor): string => (v === 'cisco' ? 'Cisco IOS' : v === 'aruba' ? 'Aruba AOS-CX' : v === 'pc' ? 'PC' : tx('ไม่มี CLI'));

/** the same search/filter rules as before UI-CL01: every word of the query must appear somewhere in the command's text */
export function filterCommands(specs: readonly CommandSpec[], f: LibraryFilters): CommandSpec[] {
  const needle = f.q.trim().toLowerCase();
  return specs.filter((s) => {
    if (f.vendor && s.vendor !== f.vendor) return false;
    if (f.kind && !s.deviceTypes.includes(f.kind)) return false;
    if (f.mode && !s.modes.includes(f.mode)) return false;
    if (f.topic && s.topic !== f.topic) return false;
    if (!needle) return true;
    const hay = [s.syntax, s.descTh, s.helpEn, vendorName(s.vendor), s.vendor, ...s.deviceTypes.map((k) => PROFILES[k].label), s.topic, s.verify, s.verifyTh]
      .join(' ')
      .toLowerCase();
    return needle.split(/\s+/).every((w) => hay.includes(w));
  });
}

const MODE_ORDER: CliMode[] = ['user', 'priv', 'config', 'config-if', 'config-subif', 'config-svi', 'config-vlan', 'pc'];
const MODE_NAME: Record<CliMode, string> = {
  user: 'User EXEC',
  priv: 'Privileged EXEC / Manager',
  config: 'Global config',
  'config-if': 'Interface config',
  'config-subif': 'Sub-interface config',
  'config-svi': 'VLAN interface (SVI) config',
  'config-vlan': 'VLAN config',
  pc: 'PC terminal',
};

/** every mode that at least one command uses — so no command becomes unreachable through the mode filter */
export function modeOptions(specs: readonly CommandSpec[]): { mode: CliMode; label: string }[] {
  const used = new Set(specs.flatMap((s) => s.modes));
  return MODE_ORDER.filter((m) => used.has(m)).map((m) => ({ mode: m, label: `${m} — ${MODE_NAME[m]}` }));
}

/** device kinds that at least one command supports, in catalog order */
export function kindOptions(specs: readonly CommandSpec[]): { kind: DeviceKind; label: string }[] {
  const used = new Set(specs.flatMap((s) => s.deviceTypes));
  return (Object.keys(PROFILES) as DeviceKind[]).filter((k) => used.has(k)).map((k) => ({ kind: k, label: PROFILES[k].label }));
}

/** the mode(s) a command runs in, with how to get there from power-on (vendor-specific prompt and path) */
export function modeSteps(spec: CommandSpec): { mode: CliMode; label: string; path: string }[] {
  return spec.modes.map((m) => ({ mode: m, label: MODE_LABEL[spec.vendor][m] ?? m, path: MODE_PATH[spec.vendor][m] ?? '' }));
}

/** distinct runnable examples, each with the device kinds it applies to */
export function exampleGroups(spec: CommandSpec): { text: string; kinds: DeviceKind[] }[] {
  const groups: { text: string; kinds: DeviceKind[] }[] = [];
  for (const k of spec.deviceTypes) {
    const text = exampleFor(spec, k);
    const g = groups.find((x) => x.text === text);
    if (g) g.kinds.push(k);
    else groups.push({ text, kinds: [k] });
  }
  return groups;
}

/** the example that "Put in Console" / "Copy" use: the target device's own example when it supports the command */
export function primaryExample(spec: CommandSpec, targetKind?: DeviceKind): string {
  return targetKind && spec.deviceTypes.includes(targetKind) ? exampleFor(spec, targetKind) : exampleFor(spec, spec.deviceTypes[0]);
}

/** index after an arrow key, clamped to the list (no wrap-around); -1 when the list is empty */
export function moveIndex(current: number, delta: number, length: number): number {
  if (length === 0) return -1;
  if (current < 0) return delta > 0 ? 0 : length - 1;
  return Math.min(length - 1, Math.max(0, current + delta));
}

export type CopyResult = 'ok' | 'denied' | 'unavailable' | 'failed';

interface ClipboardLike {
  writeText?: (text: string) => Promise<void>;
}

/**
 * Copy text with the asynchronous Clipboard API only. Reports what really happened: no fallback that could pretend success
 * (no document.execCommand('copy'), no hidden text areas).
 */
export async function copyText(text: string, clipboard: ClipboardLike | undefined, secureContext: boolean): Promise<CopyResult> {
  if (!secureContext || !clipboard || typeof clipboard.writeText !== 'function') return 'unavailable';
  try {
    await clipboard.writeText(text);
    return 'ok';
  } catch (e) {
    const name = (e as { name?: string } | null)?.name;
    return name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed';
  }
}

export function copyMessage(r: CopyResult, text: string): string {
  switch (r) {
    case 'ok':
      return tx('คัดลอกแล้ว: {0}', text);
    case 'denied':
      return tx('คัดลอกไม่สำเร็จ — เบราว์เซอร์ไม่อนุญาตให้เข้าถึง clipboard ให้เลือกข้อความตัวอย่างแล้วกด Ctrl+C');
    case 'unavailable':
      return tx('คัดลอกไม่สำเร็จ — เบราว์เซอร์นี้ไม่รองรับการคัดลอกอัตโนมัติ ให้เลือกข้อความตัวอย่างแล้วกด Ctrl+C');
    case 'failed':
      return tx('คัดลอกไม่สำเร็จ — ให้เลือกข้อความตัวอย่างแล้วกด Ctrl+C');
  }
}
