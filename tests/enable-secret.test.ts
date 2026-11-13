/**
 * CERT-P0-1a: `enable secret`, the Password: prompt at `enable`, and that a secret never leaks — not into the CLI history,
 * output, error text, transcript echo, localStorage or export files. Everything runs through the real `executeLine`.
 * Certification: CCNA 200-301 v1.1 5.3 (device access control with local passwords: enable secret part only).
 */
import { describe, expect, it } from 'vitest';
import { ENABLE_ATTEMPTS, ENABLE_DENIED, PASSWORD_PROMPT, completeLine, executeLine, helpFor, promptFor, redactLine, type ExecResult } from '../src/core/cli/engine';
import { addDevice, emptyLab, getDevice } from '../src/core/lab';
import { buildCampusLab, buildInterVlanLab, buildSampleLab } from '../src/core/sample';
import {
  STORAGE_KEY, WORKSPACE_KEY, loadStored, loadWorkspace, parseImport, saveStored, saveWorkspace, serializeExport, validateLab,
} from '../src/core/persist';
import { TYPE5_RE, verifyType5 } from '../src/core/secret';
import type { DeviceKind, Lab } from '../src/core/types';

const SECRET = 'Cl4ss!Rm-7';

class T {
  lab: Lab = emptyLab('enable-secret');
  id = '';
  outs: ExecResult[] = [];
  constructor(kind: DeviceKind = 'cisco-router') {
    const r = addDevice(this.lab, kind, 0, 0);
    this.lab = r.lab;
    this.id = r.device.id;
  }
  get dev() { return getDevice(this.lab, this.id)!; }
  run(line: string) {
    const r = executeLine(this.lab, this.id, line);
    this.lab = r.lab;
    this.outs.push(r);
    return r;
  }
  runAll(...lines: string[]) { return lines.map((l) => this.run(l)); }
  /** User EXEC → set the secret → back to User EXEC */
  withSecret(secret = SECRET) {
    this.runAll('enable', 'configure terminal', `enable secret ${secret}`, 'end', 'disable');
    expect(this.dev.cli.mode).toBe('user');
    return this;
  }
  /** everything the learner or a file could ever see */
  visible() {
    return JSON.stringify({
      lab: this.lab, export: serializeExport(this.lab),
      out: this.outs.map((o) => [o.output, o.echo ?? null, o.hintTh ?? null, o.prompt]),
    });
  }
}

describe('CERT-P0-1a enable without a secret (original behaviour)', () => {
  it('enters Privileged EXEC directly, with no prompt and no security state', () => {
    const t = new T();
    const r = t.run('enable');
    expect(r.output).toEqual([]);
    expect(t.dev.cli.mode).toBe('priv');
    expect(promptFor(t.dev)).toBe(`${t.dev.name}#`);
    expect(t.dev.security).toBeUndefined();
    expect(t.dev.cli.pending).toBeUndefined();
  });
});

describe('CERT-P0-1a enable with a secret', () => {
  it('asks Password:, accepts the right secret and enters Privileged EXEC; the answer is masked and not kept', () => {
    const t = new T().withSecret();
    const r1 = t.run('enable');
    expect(r1.output).toEqual([]);
    expect(t.dev.cli.mode).toBe('user');
    expect(promptFor(t.dev)).toBe(PASSWORD_PROMPT);
    const before = t.dev.cli.history.length;
    const r2 = t.run(SECRET);
    expect(r2).toMatchObject({ ok: true, output: [], secretInput: true, echo: '', prompt: PASSWORD_PROMPT });
    expect(t.dev.cli.mode).toBe('priv');
    expect(t.dev.cli.pending).toBeUndefined();
    expect(t.dev.cli.history.length).toBe(before);
    expect(t.visible()).not.toContain(SECRET);
  });

  it('a wrong secret re-prompts; after the simulator limit it stays in User EXEC with a message that contains no input', () => {
    const t = new T().withSecret();
    t.run('enable');
    for (let i = 1; i < ENABLE_ATTEMPTS; i++) {
      const r = t.run(`wrong-${i}`);
      expect(r).toMatchObject({ ok: false, output: [], secretInput: true, echo: '' });
      expect(t.dev.cli.pending).toEqual({ kind: 'enable', attempts: i });
      expect(promptFor(t.dev)).toBe(PASSWORD_PROMPT);
    }
    const last = t.run(`wrong-${ENABLE_ATTEMPTS}`);
    expect(last.output).toEqual([ENABLE_DENIED]);
    expect(last.secretInput).toBe(true);
    expect(t.dev.cli.mode).toBe('user');
    expect(t.dev.cli.pending).toBeUndefined();
    expect(promptFor(t.dev)).toBe(`${t.dev.name}>`);
    expect(t.visible()).not.toMatch(/wrong-\d/);
  });

  it('the right secret after wrong ones still works, the attempt count restarts at each enable, and case matters', () => {
    const t = new T().withSecret();
    t.runAll('enable', 'nope', SECRET.toLowerCase());
    expect(t.dev.cli.pending?.attempts).toBe(2);
    t.run(SECRET);
    expect(t.dev.cli.mode).toBe('priv');
    t.runAll('disable', 'enable');
    expect(t.dev.cli.pending).toEqual({ kind: 'enable', attempts: 0 });
  });

  it('disable returns to User EXEC and the next enable asks again; an empty answer counts as a wrong one', () => {
    const t = new T().withSecret();
    t.runAll('enable', SECRET, 'disable');
    expect(t.dev.cli.mode).toBe('user');
    t.run('enable');
    expect(promptFor(t.dev)).toBe(PASSWORD_PROMPT);
    t.run('');
    expect(t.dev.cli.pending?.attempts).toBe(1);
  });

  it('a password answer is never a command: commands, ? and Tab do nothing while the prompt waits', () => {
    const t = new T().withSecret();
    t.run('enable');
    const history = [...t.dev.cli.history];
    expect(helpFor(t.dev, '?')).toEqual([]);
    expect(completeLine(t.dev, 'conf', t.lab)).toEqual({ value: 'conf', options: [] });
    const r = t.run('configure terminal');
    expect(r.output).toEqual([]);
    expect(t.dev.cli.mode).toBe('user');
    expect(t.run('show running-config?').output).toEqual([]);
    expect(t.dev.cli.history).toEqual(history); // answers are not commands and are not kept
  });

  it('works the same on the Catalyst switch and the ISP router', () => {
    for (const kind of ['cisco-switch', 'isp-router'] as DeviceKind[]) {
      const t = new T(kind).withSecret();
      t.runAll('enable', SECRET);
      expect(t.dev.cli.mode).toBe('priv');
    }
  });
});

describe('CERT-P0-1a running-config and secret forms', () => {
  it('running-config shows only "enable secret 5 $1$…" (a hash of the secret), also after write memory', () => {
    const t = new T().withSecret();
    t.runAll('enable', SECRET, 'write memory');
    const run = t.run('show running-config').output;
    const line = run.find((l) => l.startsWith('enable secret'))!;
    expect(line).toMatch(/^enable secret 5 \$1\$[./0-9A-Za-z]{4}\$[./0-9A-Za-z]{22}$/);
    expect(verifyType5(SECRET, line.split(' ')[3])).toBe(true);
    expect(run.indexOf(line)).toBe(run.findIndex((l) => l.startsWith('hostname')) + 2);
    expect(t.run('show startup-config').output).toContain(line);
    expect(t.visible()).not.toContain(SECRET);
  });

  it('enable secret 0 <clear> hashes like the plain form; enable secret 5 <hash> keeps the hash; bad hashes and the history mask are refused', () => {
    const t = new T();
    t.runAll('enable', 'configure terminal', 'enable secret 0 zer0-form');
    expect(verifyType5('zer0-form', t.dev.security!.enableSecret!)).toBe(true);
    t.run('enable secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0');
    expect(t.dev.security!.enableSecret).toBe('$1$mERr$hx5rVt7rPNoS4wqbXKX7m0');
    for (const bad of ['enable secret 5 $1$mERr$short', 'enable secret 5 plain', 'enable secret ********', `enable secret ${'x'.repeat(65)}`]) {
      const r = t.run(bad);
      expect(r.ok, bad).toBe(false);
      expect(t.dev.security!.enableSecret).toBe('$1$mERr$hx5rVt7rPNoS4wqbXKX7m0');
    }
    t.runAll('end', 'disable', 'enable', 'cisco');
    expect(t.dev.cli.mode).toBe('priv'); // "cisco" is the clear text of that published type 5 example
  });

  it('no enable secret removes it: the line disappears and enable is direct again', () => {
    const t = new T().withSecret();
    t.runAll('enable', SECRET, 'configure terminal', 'no enable secret', 'end');
    expect(t.dev.security).toBeUndefined();
    expect(t.run('show running-config').output.some((l) => l.includes('secret'))).toBe(false);
    t.runAll('disable', 'enable');
    expect(t.dev.cli.mode).toBe('priv');
  });

  it('non-Cisco CLIs do not accept enable secret', () => {
    const ar = new T('aruba-switch');
    expect(ar.runAll('configure terminal', 'enable secret x1y2z3')[1].ok).toBe(false);
    expect(new T('pc').run('enable secret x1y2z3').ok).toBe(false);
  });
});

describe('CERT-P0-1a no secret leaks', () => {
  it('history, echo and errors are masked for the command, its abbreviations, typos, help and do/no forms', () => {
    const t = new T();
    t.runAll('enable', 'configure terminal');
    const lines = [
      `enable secret ${SECRET}`, `en sec ${SECRET}`, `enable secrte ${SECRET}`, `ena s 0 ${SECRET}`, `e secret ${SECRET}`,
      `no enable secret ${SECRET}`, `do enable secret ${SECRET}`, `enable secret ${SECRET}?`, `enable secret ${SECRET} extra`,
    ];
    for (const l of lines) {
      const r = t.run(l);
      expect(r.echo, l).toBeDefined();
      expect(r.echo, l).not.toContain(SECRET);
    }
    expect(t.dev.cli.history.join('\n')).not.toContain(SECRET);
    expect(t.dev.cli.history).toContain('enable secret ********');
    expect(t.visible()).not.toContain(SECRET);
  });

  it('redaction leaves ordinary lines and other vendors alone', () => {
    for (const l of ['show running-config', 'enable', 'interface gi0/1', 'end', 'hostname R9']) expect(redactLine('cisco', l)).toBe(l);
    expect(redactLine('aruba', 'enable secret abc')).toBe('enable secret abc');
  });

  it('localStorage and the workspace hold the hash, never the secret or a pending prompt; reload drops the prompt', () => {
    const t = new T().withSecret();
    t.run('enable'); // prompt open
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    saveStored({ lab: t.lab, savedSig: null }, storage);
    saveWorkspace({ activeId: 'a', entries: [{ id: 'a', name: 'x', updatedAt: 1, savedSig: null, lab: t.lab }] }, storage);
    for (const key of [STORAGE_KEY, WORKSPACE_KEY]) {
      const raw = mem.get(key)!;
      expect(raw).not.toContain(SECRET);
      expect(raw).not.toContain('pending');
      expect(raw).toMatch(/\$1\$/);
    }
    const back = loadStored(storage)!.lab;
    expect(getDevice(back, t.id)!.cli.pending).toBeUndefined();
    expect(getDevice(back, t.id)!.cli.mode).toBe('user');
    expect(getDevice(loadWorkspace(storage)!.entries[0].lab, t.id)!.security!.enableSecret).toBe(t.dev.security!.enableSecret);
  });

  it('export → import keeps the secret working; a pending prompt in a file is dropped', () => {
    const t = new T().withSecret();
    t.run('enable');
    const text = serializeExport(t.lab);
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain('pending');
    const r = parseImport(text);
    if (!r.ok) throw new Error(r.error);
    const crafted = structuredClone(t.lab);
    getDevice(crafted, t.id)!.cli.pending = { kind: 'enable', attempts: 2 };
    const v = validateLab(crafted);
    if (!v.ok) throw new Error(v.error);
    expect(getDevice(v.lab, t.id)!.cli.pending).toBeUndefined();
    let lab = r.lab;
    for (const l of ['enable', SECRET]) lab = executeLine(lab, t.id, l).lab;
    expect(getDevice(lab, t.id)!.cli.mode).toBe('priv');
  });

  it('a file cannot smuggle a clear-text or non-Cisco enable secret', () => {
    const t = new T().withSecret();
    const plain = structuredClone(t.lab);
    getDevice(plain, t.id)!.security = { enableSecret: 'cisco' };
    expect(validateLab(plain).ok).toBe(false);
    const ar = new T('aruba-switch');
    getDevice(ar.lab, ar.id)!.security = { enableSecret: '$1$mERr$hx5rVt7rPNoS4wqbXKX7m0' };
    expect(validateLab(ar.lab).ok).toBe(false);
  });

  it('randomised: 40 random secrets through set / enable / wrong answers / show / export never appear anywhere visible', () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%^&*-_=+.,:;~';
    let seed = 20261113;
    const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed % n; };
    for (let i = 0; i < 40; i++) {
      const secret = `Q${Array.from({ length: 8 + rnd(16) }, () => chars[rnd(chars.length)]).join('')}`;
      const t = new T(i % 2 ? 'cisco-switch' : 'cisco-router');
      t.runAll('enable', 'configure terminal', i % 3 ? `enable secret ${secret}` : `ena sec 0 ${secret}` /* "en" is ambiguous (enable/end) in config mode */, 'do show running-config', 'end', 'disable');
      t.runAll('enable', `${secret}x`, secret, 'show running-config', 'write memory');
      expect(t.dev.cli.mode).toBe('priv');
      expect(TYPE5_RE.test(t.dev.security!.enableSecret!)).toBe(true);
      expect(t.visible(), secret).not.toContain(secret);
    }
  });
});

describe('CERT-P0-1a legacy Labs', () => {
  it('sample Labs (no security field) validate, export and import byte-identically, and enable is unchanged', () => {
    for (const lab of [buildSampleLab(), buildInterVlanLab(), buildCampusLab()]) {
      expect(lab.devices.every((d) => d.security === undefined)).toBe(true);
      const text = serializeExport(lab);
      expect(text).not.toContain('security');
      const r = parseImport(text);
      if (!r.ok) throw new Error(r.error);
      expect(r.lab).toEqual(lab);
      const cisco = lab.devices.find((d) => d.kind === 'cisco-router' || d.kind === 'cisco-switch');
      if (cisco && cisco.cli.mode === 'user') expect(getDevice(executeLine(lab, cisco.id, 'enable').lab, cisco.id)!.cli.mode).toBe('priv');
    }
  });
});
