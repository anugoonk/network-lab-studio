/**
 * CLI simulator engine. Parses a line against the command registry for the device's
 * kind + current mode, runs the handler on a working copy of the Lab, and either
 * returns the new Lab (success) or the untouched Lab (error). Nothing here ever
 * touches a host shell — input is only matched against the registry.
 */
import { PROFILES } from '../profiles';
import { getDevice } from '../lab';
import type { Device, Lab, Vendor } from '../types';
import { SPECS } from './registry';
import {
  MODE_LABEL,
  MODE_PATH,
  PARAM_HELP,
  TOKEN_HELP,
  checkParam,
  type CommandSpec,
} from './spec';

export interface ExecResult {
  lab: Lab;
  output: string[];
  ok: boolean;
  /** prompt as it was when the line was typed */
  prompt: string;
  clear?: boolean;
  /** learner-facing hint (Thai), shown separately from device output */
  hintTh?: string;
}

export function promptFor(dev: Device): string {
  const v = PROFILES[dev.kind].vendor;
  const n = dev.name;
  const m = dev.cli.mode;
  if (v === 'pc') return 'C:\\>';
  if (v === 'cisco') {
    const t: Record<string, string> = {
      user: `${n}>`,
      priv: `${n}#`,
      config: `${n}(config)#`,
      'config-if': `${n}(config-if)#`,
      'config-subif': `${n}(config-subif)#`,
      'config-svi': `${n}(config-if)#`,
      'config-vlan': `${n}(config-vlan)#`,
    };
    return t[m] ?? `${n}#`;
  }
  const a: Record<string, string> = {
    priv: `${n}#`,
    config: `${n}(config)#`,
    'config-if': `${n}(config-if)#`,
    'config-svi': `${n}(config-if-vlan)#`,
    'config-vlan': `${n}(config-vlan-${dev.cli.ctxVlan ?? ''})#`,
  };
  return a[m] ?? `${n}#`;
}

// ───────── tokenizing & matching ─────────

interface RawTok {
  text: string;
  start: number;
}
interface Cand {
  spec: CommandSpec;
  pos: number;
  args: string[];
  textDone?: boolean;
}

function tokenize(line: string, vendor: Vendor): RawTok[] {
  const out: RawTok[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push({ text: m[0], start: m.index });
  if (vendor !== 'cisco') return out;
  // "gi 0/1" -> "gi0/1"
  const merged: RawTok[] = [];
  for (let i = 0; i < out.length; i++) {
    const t = out[i];
    const nx = out[i + 1];
    if (
      nx &&
      /^[A-Za-z]+$/.test(t.text) &&
      ['gigabitethernet', 'fastethernet'].some((p) => p.startsWith(t.text.toLowerCase())) &&
      /^\d+(\/\d+)*(\.\d+)?$/.test(nx.text)
    ) {
      merged.push({ text: t.text + nx.text, start: t.start });
      i++;
    } else merged.push(t);
  }
  return merged;
}

type AdvanceErr = 'invalid' | 'ambiguous';

function advance(
  cands: Cand[],
  tok: RawTok,
  dev: Device,
  vendor: Vendor,
  line: string,
  lenient: boolean,
): { cands: Cand[]; err?: AdvanceErr } {
  const lower = tok.text.toLowerCase();
  const absorb = cands.filter((c) => c.textDone);
  const lit: Cand[] = [];
  const prm: Cand[] = [];
  for (const c of cands) {
    if (c.textDone) continue;
    const t = c.spec.tokens[c.pos];
    if (!t) continue;
    if (t.lit !== undefined) {
      if (t.lit.toLowerCase().startsWith(lower)) lit.push(c);
    } else prm.push(c);
  }
  let chosen: Cand[] = [];
  if (lit.length) {
    const exact = lit.filter((c) => c.spec.tokens[c.pos].lit!.toLowerCase() === lower);
    const use = exact.length ? exact : lit;
    const distinct = new Set(use.map((c) => c.spec.tokens[c.pos].lit!.toLowerCase()));
    if (distinct.size > 1 && absorb.length === 0) return { cands: [], err: 'ambiguous' };
    chosen = use.map((c) => ({ ...c, pos: c.pos + 1 }));
  } else {
    for (const c of prm) {
      const t = c.spec.tokens[c.pos];
      if (t.ptype === 'text') {
        chosen.push({ ...c, pos: c.pos + 1, args: [...c.args, line.slice(tok.start).trim()], textDone: true });
        continue;
      }
      const v = lenient ? tok.text : checkParam(t.ptype!, tok.text, dev, vendor);
      if (v !== null) chosen.push({ ...c, pos: c.pos + 1, args: [...c.args, v] });
    }
  }
  chosen.push(...absorb);
  if (!chosen.length) return { cands: [], err: 'invalid' };
  return { cands: chosen };
}

type Resolved =
  | { spec: CommandSpec; args: string[] }
  | { err: AdvanceErr | 'incomplete'; tok?: RawTok };

function resolve(specs: CommandSpec[], toks: RawTok[], dev: Device, vendor: Vendor, line: string, lenient = false): Resolved {
  let cands: Cand[] = specs.map((spec) => ({ spec, pos: 0, args: [] }));
  for (const tok of toks) {
    const r = advance(cands, tok, dev, vendor, line, lenient);
    if (r.err) return { err: r.err, tok };
    cands = r.cands;
  }
  const done = cands.find((c) => c.pos >= c.spec.tokens.length);
  if (done) return { spec: done.spec, args: done.args };
  return { err: 'incomplete' };
}

function specsFor(dev: Device): CommandSpec[] {
  return SPECS.filter((s) => s.deviceTypes.includes(dev.kind) && s.modes.includes(dev.cli.mode));
}

// ───────── error text per vendor ─────────

function formatError(vendor: Vendor, err: AdvanceErr | 'incomplete', prompt: string, line: string, tok?: RawTok): string[] {
  if (vendor === 'cisco') {
    if (err === 'incomplete') return ['% Incomplete command.'];
    if (err === 'ambiguous') return [`% Ambiguous command:  "${line}"`];
    return [`${' '.repeat(prompt.length + (tok?.start ?? 0))}^`, "% Invalid input detected at '^' marker."];
  }
  if (vendor === 'aruba') {
    if (err === 'incomplete') return ['% Command incomplete.'];
    if (err === 'ambiguous') return ['% Ambiguous command.'];
    return ['% Unknown command.'];
  }
  if (err === 'incomplete') return ['The syntax of the command is incorrect.'];
  return [`'${tok?.text ?? line}' is not recognized as an internal or external command,`, 'operable program or batch file.'];
}

/** Thai hint explaining why a command was rejected (kept out of the device's own output). */
function hintFor(dev: Device, line: string, vendor: Vendor): string | undefined {
  const toks = tokenize(line, vendor);
  if (!toks.length) return undefined;
  const ok = (specs: CommandSpec[]) => 'spec' in resolve(specs, toks, dev, vendor, line, true);
  const mine = SPECS.filter((s) => s.deviceTypes.includes(dev.kind));
  const otherModes = mine.filter((s) => !s.modes.includes(dev.cli.mode));
  if (ok(otherModes)) {
    const r = resolve(otherModes, toks, dev, vendor, line, true);
    if ('spec' in r) {
      const modes = r.spec.modes.map((m) => MODE_LABEL[vendor][m] ?? m).join(' / ');
      const path = MODE_PATH[vendor][r.spec.modes[0]] ?? '';
      return `คำสั่งนี้ใช้ได้ใน mode: ${modes} (ตอนนี้อยู่ใน ${MODE_LABEL[vendor][dev.cli.mode] ?? dev.cli.mode}) — วิธีเข้า: ${path}`;
    }
  }
  const foreign = SPECS.filter((s) => s.vendor !== vendor);
  const rf = resolve(foreign, toks, dev, vendor, line, true);
  if ('spec' in rf) {
    const name = rf.spec.vendor === 'cisco' ? 'Cisco IOS' : rf.spec.vendor === 'aruba' ? 'Aruba AOS-CX' : 'PC';
    return `คำสั่งนี้เป็นคำสั่งของ ${name} — อุปกรณ์นี้ใช้ CLI คนละระบบ จึงไม่รองรับ`;
  }
  const sameVendorOtherType = SPECS.filter((s) => s.vendor === vendor && !s.deviceTypes.includes(dev.kind));
  if ('spec' in resolve(sameVendorOtherType, toks, dev, vendor, line, true)) {
    return 'คำสั่งนี้ไม่รองรับกับอุปกรณ์ชนิดนี้ (เช่น คำสั่งของ router บน switch หรือกลับกัน)';
  }
  return 'ไม่พบคำสั่งนี้ใน simulator — อยู่นอกขอบเขตของรุ่นแรก หรือ syntax ไม่ถูกต้อง (พิมพ์ ? เพื่อดูคำสั่งที่ใช้ได้ใน mode นี้)';
}

// ───────── help (?) ─────────

export function helpFor(dev: Device, input: string): string[] {
  const vendor = PROFILES[dev.kind].vendor;
  const body = input.replace(/\?\s*$/, '');
  const endsWithSpace = body === '' || /\s$/.test(body);
  const toks = tokenize(body.trim(), vendor);
  const partial = endsWithSpace ? null : toks.pop()!;
  const specs = specsFor(dev);
  let cands: Cand[] = specs.map((spec) => ({ spec, pos: 0, args: [] }));
  for (const tok of toks) {
    const r = advance(cands, tok, dev, vendor, body, false);
    if (r.err) return vendor === 'cisco' ? ['% Unrecognized command'] : ['% Unknown command.'];
    cands = r.cands;
  }
  const items = new Map<string, string>();
  for (const c of cands) {
    if (c.textDone || c.pos >= c.spec.tokens.length) {
      if (!partial) items.set('<cr>', '');
      continue;
    }
    const t = c.spec.tokens[c.pos];
    const last = c.pos === c.spec.tokens.length - 1;
    if (t.lit !== undefined) {
      if (partial && !t.lit.toLowerCase().startsWith(partial.text.toLowerCase())) continue;
      if (!items.has(t.lit)) items.set(t.lit, last ? c.spec.helpEn : TOKEN_HELP[t.lit.toLowerCase()] ?? '');
    } else if (!partial) {
      items.set(`<${t.name}>`, PARAM_HELP[t.name!] ?? '');
    }
  }
  if (!items.size) return vendor === 'cisco' ? ['% Unrecognized command'] : ['% Unknown command.'];
  const keys = [...items.keys()].sort((a, b) => (a === '<cr>' ? 1 : b === '<cr>' ? -1 : a.localeCompare(b)));
  return keys.map((k) => `  ${k.padEnd(16)}${items.get(k)}`.trimEnd());
}

// ───────── execution ─────────

interface One {
  ok: boolean;
  output: string[];
  clear?: boolean;
  hintTh?: string;
}

function runOne(lab: Lab, dev: Device, line: string): One {
  const vendor = PROFILES[dev.kind].vendor;
  const prompt = promptFor(dev);
  const toks = tokenize(line, vendor);
  const r = resolve(specsFor(dev), toks, dev, vendor, line);
  if ('err' in r) {
    return {
      ok: false,
      output: formatError(vendor, r.err, prompt, line, r.tok),
      hintTh: hintFor(dev, line, vendor),
    };
  }
  if (r.spec.special === 'do') {
    const saved = { ...dev.cli };
    dev.cli.mode = 'priv';
    const inner = runOne(lab, dev, r.args[0]);
    dev.cli.mode = saved.mode;
    dev.cli.ctxIface = saved.ctxIface;
    dev.cli.ctxVlan = saved.ctxVlan;
    return inner;
  }
  const res = r.spec.run({ lab, dev, args: r.args, line }) ?? {};
  if (res.error) return { ok: false, output: res.error };
  if (res.mode) dev.cli.mode = res.mode;
  if (res.ctxIface !== undefined) dev.cli.ctxIface = res.ctxIface;
  if (res.ctxVlan !== undefined) dev.cli.ctxVlan = res.ctxVlan;
  return { ok: true, output: res.lines ?? [], clear: res.clear };
}

function pushHistory(dev: Device, line: string) {
  dev.cli.history.push(line);
  if (dev.cli.history.length > 100) dev.cli.history.shift();
}

export function executeLine(lab: Lab, deviceId: string, rawLine: string): ExecResult {
  const dev0 = getDevice(lab, deviceId);
  if (!dev0) return { lab, output: ['Device not found'], ok: false, prompt: '' };
  const prompt = promptFor(dev0);
  const line = rawLine.trim();
  if (line === '') return { lab, output: [], ok: true, prompt };

  if (line.endsWith('?')) {
    return { lab, output: helpFor(dev0, line), ok: true, prompt };
  }

  const work = structuredClone(lab);
  const dev = getDevice(work, deviceId)!;
  const res = runOne(work, dev, line);
  if (!res.ok) {
    // keep the Lab unchanged except for command history
    const safe = structuredClone(lab);
    pushHistory(getDevice(safe, deviceId)!, line);
    return { lab: safe, output: res.output, ok: false, prompt, hintTh: res.hintTh };
  }
  pushHistory(dev, line);
  return { lab: work, output: res.output, ok: true, prompt, clear: res.clear };
}
