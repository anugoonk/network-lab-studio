/**
 * CLI simulator engine. Parses a line against the command registry for the device's
 * kind + current mode, runs the handler on a working copy of the Lab, and either
 * returns the new Lab (success) or the untouched Lab (error). Nothing here ever
 * touches a host shell — input is only matched against the registry.
 */
import { PROFILES, shortPort } from '../profiles';
import { allAddresses } from '../network';
import { getDevice } from '../lab';
import { cdpMismatchLog } from '../trunkcheck';
import { verifyType5 } from '../secret';
import { ciscoRunningConfig } from './cisco';
import type { Device, Lab, Vendor } from '../types';
import { SPECS } from './registry';
import { classifyLine, scrubText } from './redact';
import {
  MODE_LABEL,
  MODE_PATH,
  PARAM_HELP,
  TOKEN_HELP,
  checkParam,
  type CommandSpec,
} from './spec';
import { tx } from '../../i18n';

export interface ExecResult {
  lab: Lab;
  output: string[];
  ok: boolean;
  /** prompt as it was when the line was typed */
  prompt: string;
  clear?: boolean;
  /** learner-facing hint (Thai), shown separately from device output */
  hintTh?: string;
  /** the line as it may be shown and kept (secrets masked); absent = the line as typed */
  echo?: string;
  /** the line answered a credential prompt: show nothing of it, keep nothing of it */
  secretInput?: boolean;
}

/** prompt shown while the console waits for a credential instead of a command */
export const PASSWORD_PROMPT = 'Password:';
/** prompt shown while the console waits for `erase` / `reload` to be confirmed (Enter, y or yes confirms; anything else cancels) */
export const CONFIRM_PROMPT = { erase: 'Continue? [confirm]', reload: 'Proceed with reload? [confirm]' } as const;
/** Simulator setting: wrong answers allowed at the enable prompt. Cisco's documentation consulted does not state the count. */
export const ENABLE_ATTEMPTS = 3;
/** Simulator wording (the exact IOS message could not be confirmed in Cisco's documentation); contains no input */
export const ENABLE_DENIED = '% Access denied (simulator): wrong enable secret entered 3 times';

/**
 * The line with every secret-bearing argument masked, for history, the transcript and error text.
 * Public API of the engine (tests and the Console use it); the rules — every vendor, every device, supported or not,
 * well-formed or not — live in ./redact, the one classifier shared with the persistence layer.
 * Masking more than needed is harmless; masking less would leak.
 */
export function redactLine(vendor: Vendor, line: string): string {
  return classifyLine(vendor, line).shown;
}

export function promptFor(dev: Device): string {
  const v = PROFILES[dev.kind].vendor;
  if (dev.cli.pending) return dev.cli.pending.kind === 'confirm' ? CONFIRM_PROMPT[dev.cli.pending.action ?? 'reload'] : PASSWORD_PROMPT;
  const n = dev.name;
  const m = dev.cli.mode;
  const range = m === 'config-if' && dev.cli.ctxRange && dev.cli.ctxRange.length > 1 ? dev.cli.ctxRange : undefined;
  if (v === 'pc') return 'C:\\>';
  if (v === 'cisco') {
    const t: Record<string, string> = {
      user: `${n}>`,
      priv: `${n}#`,
      config: `${n}(config)#`,
      'config-if': range ? `${n}(config-if-range)#` : `${n}(config-if)#`,
      'config-subif': `${n}(config-subif)#`,
      'config-svi': `${n}(config-if)#`,
      'config-vlan': `${n}(config-vlan)#`,
      'config-line': `${n}(config-line)#`,
    };
    return t[m] ?? `${n}#`;
  }
  const a: Record<string, string> = {
    priv: `${n}#`,
    config: `${n}(config)#`,
    'config-if': range ? `${n}(config-if-<${range[0]}-${range[range.length - 1]}>)#` : `${n}(config-if)#`,
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
      return tx('คำสั่งนี้ใช้ได้ใน mode: {0} (ตอนนี้อยู่ใน {1}) — วิธีเข้า: {2}', modes, MODE_LABEL[vendor][dev.cli.mode] ?? dev.cli.mode, path);
    }
  }
  const foreign = SPECS.filter((s) => s.vendor !== vendor);
  const rf = resolve(foreign, toks, dev, vendor, line, true);
  if ('spec' in rf) {
    const name = rf.spec.vendor === 'cisco' ? 'Cisco IOS' : rf.spec.vendor === 'aruba' ? 'Aruba AOS-CX' : 'PC';
    return tx('คำสั่งนี้เป็นคำสั่งของ {0} — อุปกรณ์นี้ใช้ CLI คนละระบบ จึงไม่รองรับ', name);
  }
  const sameVendorOtherType = SPECS.filter((s) => s.vendor === vendor && !s.deviceTypes.includes(dev.kind));
  if ('spec' in resolve(sameVendorOtherType, toks, dev, vendor, line, true)) {
    return tx('คำสั่งนี้ไม่รองรับกับอุปกรณ์ชนิดนี้ (เช่น คำสั่งของ router บน switch หรือกลับกัน)');
  }
  return tx('ไม่พบคำสั่งนี้ใน simulator — อยู่นอกขอบเขตของรุ่นแรก หรือ syntax ไม่ถูกต้อง (พิมพ์ ? เพื่อดูคำสั่งที่ใช้ได้ใน mode นี้)');
}

// ───────── help (?) ─────────

export function helpFor(dev: Device, input: string): string[] {
  if (dev.cli.pending) return [];
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

// ───────── tab completion ─────────

export interface Completion {
  /** the new text for the input box (unchanged when nothing could be completed) */
  value: string;
  /** keywords that could follow, when the typed text matches more than one */
  options: string[];
}

/**
 * Tab key: completes the last word to the only keyword that fits, or to the longest prefix common to the candidates.
 * Besides keywords it completes interface names, existing VLAN IDs and (for `ping`) the IPv4 addresses configured in the Lab.
 */
export function completeLine(dev: Device, input: string, lab?: Lab): Completion {
  const none: Completion = { value: input, options: [] };
  if (!PROFILES[dev.kind].hasCli || dev.cli.pending) return none;
  const vendor = PROFILES[dev.kind].vendor;
  const endsWithSpace = input === '' || /\s$/.test(input);
  const toks = tokenize(input, vendor);
  const partial = endsWithSpace ? null : toks.pop()!;
  let cands: Cand[] = specsFor(dev).map((spec) => ({ spec, pos: 0, args: [] }));
  for (const tok of toks) {
    const r = advance(cands, tok, dev, vendor, input, false);
    if (r.err) return none;
    cands = r.cands;
  }
  const words = new Map<string, string>(); // lower-case -> as written in the registry
  for (const c of cands) {
    if (c.textDone || c.pos >= c.spec.tokens.length) continue;
    const t = c.spec.tokens[c.pos];
    const want = partial?.text.toLowerCase() ?? '';
    const offer = (w: string, alias?: string) => {
      if (partial && !w.toLowerCase().startsWith(want) && !(alias && alias.toLowerCase().startsWith(want))) return;
      if (!words.has(w.toLowerCase())) words.set(w.toLowerCase(), w);
    };
    if (t.lit !== undefined) offer(t.lit);
    else if (t.ptype === 'iface' || t.ptype === 'ifrange') {
      if (t.ptype === 'iface') for (const i of dev.ifaces) offer(i.name, vendor === 'cisco' ? shortPort(i.name) : undefined);
    } else if (t.ptype === 'vlan') for (const v of dev.vlans) offer(String(v.id));
    else if (lab && c.spec.id.endsWith('.ping')) {
      for (const a of allAddresses(lab)) if (a.device.id !== dev.id) offer(a.ifc.ip);
    }
  }
  if (!words.size) return none;
  const list = [...words.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const head = partial ? input.slice(0, partial.start) : input;
  if (list.length === 1) return { value: `${head}${list[0]} `, options: [] };
  let common = list[0];
  for (const w of list) {
    let k = 0;
    while (k < common.length && k < w.length && common[k].toLowerCase() === w[k].toLowerCase()) k++;
    common = common.slice(0, k);
  }
  const typed = partial?.text ?? '';
  if (common.length > typed.length) return { value: `${head}${common}`, options: [] };
  return { value: input, options: list };
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
    dev.cli.ctxRange = saved.ctxRange;
    if (saved.ctxLine !== undefined) dev.cli.ctxLine = saved.ctxLine;
    else delete dev.cli.ctxLine;
    return inner;
  }
  const range = dev.cli.mode === 'config-if' ? dev.cli.ctxRange : undefined;
  if (range && range.length > 1) {
    // `interface range`: an ordinary interface command runs once per port; a command that changes mode/context (exit, end,
    // interface …) runs once and leaves the range. Any error rejects the whole command (the caller discards the working copy).
    let lines: string[] = [];
    for (let k = 0; k < range.length; k++) {
      dev.cli.ctxIface = range[k];
      const res = r.spec.run({ lab, dev, args: r.args, line }) ?? {};
      if (res.error) {
        dev.cli.ctxIface = range[0];
        return { ok: false, output: res.error };
      }
      if (k === 0) {
        lines = res.lines ?? [];
        if (res.mode !== undefined || res.ctxIface !== undefined || res.ctxVlan !== undefined) {
          dev.cli.ctxRange = res.ctxRange;
          if (res.mode) dev.cli.mode = res.mode;
          if (res.ctxIface !== undefined) dev.cli.ctxIface = res.ctxIface;
          if (res.ctxVlan !== undefined) dev.cli.ctxVlan = res.ctxVlan;
          return { ok: true, output: lines, clear: res.clear };
        }
      }
    }
    dev.cli.ctxIface = range[0];
    return { ok: true, output: lines };
  }
  const res = r.spec.run({ lab, dev, args: r.args, line }) ?? {};
  if (res.error) return { ok: false, output: res.error };
  if (res.mode !== undefined || res.ctxIface !== undefined || res.ctxVlan !== undefined) dev.cli.ctxRange = res.ctxRange;
  if (res.mode) dev.cli.mode = res.mode;
  if (res.mode && res.mode !== 'config-line') delete dev.cli.ctxLine;
  if (res.ctxLine !== undefined) dev.cli.ctxLine = res.ctxLine;
  if (res.ctxIface !== undefined) dev.cli.ctxIface = res.ctxIface;
  if (res.ctxVlan !== undefined) dev.cli.ctxVlan = res.ctxVlan;
  return { ok: true, output: res.lines ?? [], clear: res.clear };
}

function pushHistory(dev: Device, line: string) {
  dev.cli.history.push(line);
  if (dev.cli.history.length > 100) dev.cli.history.shift();
}

/**
 * The console asked for a credential: the line is the answer, never a command. Nothing of it is kept or shown —
 * not in history, output, hints or the returned Lab — and `?`, Tab and abbreviations have no meaning here.
 */
function answerPrompt(lab: Lab, deviceId: string, rawLine: string): ExecResult {
  const work = structuredClone(lab);
  const dev = getDevice(work, deviceId)!;
  if (dev.cli.pending?.kind === 'confirm') return answerConfirm(work, dev, rawLine);
  const attempts = (dev.cli.pending?.attempts ?? 0) + 1;
  const stored = dev.security?.enableSecret;
  const base = { prompt: PASSWORD_PROMPT, echo: '', secretInput: true } as const;
  if (stored && verifyType5(rawLine.trim(), stored)) {
    delete dev.cli.pending;
    dev.cli.mode = 'priv';
    return { ...base, lab: work, output: [], ok: true };
  }
  if (stored && attempts < ENABLE_ATTEMPTS) {
    dev.cli.pending = { kind: 'enable', attempts };
    return { ...base, lab: work, output: [], ok: false };
  }
  delete dev.cli.pending; // stays in User EXEC
  return {
    ...base, lab: work, output: [ENABLE_DENIED], ok: false,
    hintTh: tx('ใส่ enable secret ผิด {0} ครั้ง — ยังอยู่ใน User EXEC (พิมพ์ enable เพื่อลองใหม่)', String(ENABLE_ATTEMPTS)),
  };
}

/** Answer to `erase` / `reload`: Enter, y or yes confirms, anything else cancels. Not a credential — shown and kept like a command answer, but not added to the history. */
function answerConfirm(work: Lab, dev: Device, rawLine: string): ExecResult {
  const pending = { action: dev.cli.pending?.action ?? 'reload' };
  const prompt = CONFIRM_PROMPT[pending.action];
  const answer = rawLine.trim().toLowerCase();
  delete dev.cli.pending;
  // only a recognised answer is echoed: text typed here is never a credential, but nothing unexpected is kept either
  const shownAnswer = ["", "y", "yes", "n", "no"].includes(answer) ? answer : "";
  if (answer !== '' && answer !== 'y' && answer !== 'yes') return { lab: work, output: [], ok: true, prompt, echo: shownAnswer };
  if (pending.action === 'erase') {
    dev.startupConfig = null;
    return { lab: work, output: ['[OK]', 'Erase of nvram: complete'], ok: true, prompt, echo: shownAnswer };
  }
  const unsaved = dev.startupConfig !== ciscoRunningConfig(dev).join('\n');
  dev.cli.mode = 'user';
  dev.cli.ctxIface = null;
  dev.cli.ctxVlan = null;
  delete dev.cli.ctxRange;
  delete dev.cli.ctxLine;
  const motd = dev.mgmt?.banners?.motd;
  return {
    lab: work,
    ok: true,
    prompt,
    echo: shownAnswer,
    output: [
      '*** System reloading (simulated) ***',
      'Simulator: only this console session was reset (back to User EXEC).',
      'Simulator: the running-config was NOT discarded and the startup-config was not re-applied' + (unsaved ? ' — unsaved changes are kept here, a real device would lose them.' : '.'),
      ...(motd !== undefined ? ['', motd] : []),
    ],
  };
}

// executeLine masks every line with classifyLine BEFORE the command is resolved, so unsupported, malformed and
// foreign-vendor commands are masked too; only the masked line reaches the history, and error and hint text are scrubbed.
// A prompt answer (answerPrompt) shows and keeps nothing of what was typed.
export function executeLine(lab: Lab, deviceId: string, rawLine: string): ExecResult {
  const dev0 = getDevice(lab, deviceId);
  if (!dev0) return { lab, output: ['Device not found'], ok: false, prompt: '' };
  const prompt = promptFor(dev0);
  if (!PROFILES[dev0.kind].hasCli) {
    // no CLI to run it, but the caller still echoes the line into the transcript: hand back it masked
    const shown0 = redactLine(PROFILES[dev0.kind].vendor, rawLine.trim());
    return { lab, output: [tx('{0} ไม่มี Console ในโปรแกรมนี้ (วาดและต่อสายเท่านั้น)', PROFILES[dev0.kind].label)], ok: false, prompt, ...(shown0 !== rawLine.trim() ? { echo: shown0 } : {}) };
  }
  if (dev0.cli.pending) return answerPrompt(lab, deviceId, rawLine);
  const vendor = PROFILES[dev0.kind].vendor;
  const line = rawLine.trim();
  if (line === '') return { lab, output: [], ok: true, prompt };
  // decided before the command is resolved, whatever happens to it: unsupported, malformed or foreign commands are masked too
  const red = classifyLine(vendor, line);
  const shown = red.shown;
  const masked = red.masked;
  // a masked line's secret part must not come back through any error text either
  const scrub = (out: string[]) => (masked ? out.map((o) => scrubText(o, line, red)) : out);
  const echo = masked ? { echo: shown } : {};

  if (line.endsWith('?')) {
    return { lab, output: helpFor(dev0, line), ok: true, prompt, ...echo };
  }

  const work = structuredClone(lab);
  const dev = getDevice(work, deviceId)!;
  const res = runOne(work, dev, line);
  if (!res.ok) {
    // keep the Lab unchanged except for command history
    const safe = structuredClone(lab);
    pushHistory(getDevice(safe, deviceId)!, shown);
    return { lab: safe, output: scrub(res.output), ok: false, prompt, hintTh: res.hintTh === undefined ? undefined : scrub([res.hintTh])[0], ...echo };
  }
  pushHistory(dev, shown);
  // a Cisco switch logs (via CDP) a native VLAN mismatch the command has just created on one of its trunks
  const syslog = cdpMismatchLog(lab, work, deviceId);
  return { lab: work, output: scrub(syslog.length ? [...res.output, ...syslog] : res.output), ok: true, prompt, clear: res.clear, ...echo };
}
