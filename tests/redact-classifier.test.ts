/**
 * CERT-P0-1b.1 — unit tests of the central credential classifier (src/core/cli/redact.ts).
 * Synthetic values only. Rows follow the approved redaction matrix (CERT_P0_1B_REDACTION_POLICY.md §5).
 */
import { describe, expect, it } from 'vitest';
import { MASK, classifyLine, redactLine, sanitizeHistoryEntry, sanitizeLab, scrubText } from '../src/core/cli/redact';
import { addDevice, emptyLab, getDevice } from '../src/core/lab';
import type { Vendor } from '../src/core/types';

const S = 'Sy9nTest#Alpha7';
const VENDORS: Vendor[] = ['cisco', 'aruba', 'pc', 'generic'];

/** [id, input, expected shown] — expected shown equals the input when nothing is secret */
const ROWS: [string, string, string][] = [
  ['B-01', `enable secret ${S}`, 'enable secret ********'],
  ['B-02', `ENABLE SECRET ${S}`, 'ENABLE SECRET ********'],
  ['B-03', `  enable   secret   ${S}`, '  enable   secret   ********'],
  ['B-04', `enable password ${S}`, 'enable password ********'],
  ['B-05', 'enable secret', 'enable secret'],
  ['B-06', `enable secret Invalid ${S}`, 'enable secret ********'],
  ['B-07', `username admin secret ${S}`, 'username admin secret ********'],
  ['B-09', `username admin password ${S}`, 'username admin password ********'],
  ['B-10', `username admin privilege 15 secret 0 ${S}`, 'username admin privilege 15 secret ********'],
  ['B-11', `username admin secrte ${S}`, 'username admin secrte ********'],
  ['B-11b', `username admin seecret ${S}`, 'username admin seecret ********'],
  ['B-12', 'username admin secret', 'username admin secret'],
  ['B-13', `password ${S}`, 'password ********'],
  ['B-13b', `password 7 ${S}`, 'password ********'],
  ['B-16', `snmp-server community ${S} RO`, 'snmp-server community ******** RO'],
  ['B-16b', `snmp-server community ${S}`, 'snmp-server community ********'],
  ['B-17', `net user bob ${S}`, 'net user bob ********'],
  ['B-17b', 'net user bob', 'net user bob'],
  ['B-18', `user admin group administrator password plaintext ${S}`, 'user admin group administrator password ********'],
  ['B-19', `username admin secret ${S}?`, 'username admin secret ********'],
  ['B-20', `no username admin secret ${S}`, 'no username admin secret ********'],
  ['B-21', `do enable secret ${S}`, 'do enable secret ********'],
  ['B-22', `username admin secret ${S} extra words`, 'username admin secret ********'],
  ['H-01', `snmp-server community "my ${S}" RO`, 'snmp-server community ********'],
  ['H-02', `username admin secret pässwörd-日本語-${S}`, 'username admin secret ********'],
  ['H-03', 'username admin secret a b c d', 'username admin secret ********'],
  ['H-04', `en sec ${S}`, 'en sec ********'],
  ['H-05', `ena s 0 ${S}`, 'ena s ********'],
  ['H-06', `enable secrte ${S}`, 'enable secrte ********'],
  ['H-07', 'username admin secret ********', 'username admin secret ********'],
];

/** ordinary lines that must stay readable (negative tests) */
const ORDINARY = [
  'show running-config', 'enable', 'disable', 'interface gi0/1', 'end', 'exit', 'hostname R9', 'ping 10.0.0.1', 'ipconfig /all',
  'username admin', 'no username admin', 'no password', 'no enable secret', 'line vty 0 4', 'line console 0', 'login local', 'login',
  'username admin nopassword', 'username admin privilege 15', 'description my password list', 'show running-config | include password',
  'show ip interface brief', 'configure terminal', 'ip route 10.0.0.0 255.0.0.0 10.1.1.1', 'switchport mode access', '', '   ',
];

describe('classifyLine — redaction matrix', () => {
  it.each(ROWS)('%s', (_id, input, shown) => {
    for (const v of VENDORS) {
      const r = classifyLine(v, input);
      expect(r.shown, `${v}`).toBe(shown);
      expect(r.shown).not.toContain(S);
      expect(r.masked).toBe(shown !== input);
    }
  });

  it('is vendor independent', () => {
    for (const [, input] of ROWS) {
      const base = classifyLine('cisco', input);
      for (const v of VENDORS) expect(classifyLine(v, input)).toEqual(base);
    }
  });

  it('leaves ordinary commands untouched (no over-masking)', () => {
    for (const l of ORDINARY) {
      const r = classifyLine('cisco', l);
      expect(r.shown, l).toBe(l);
      expect(r.masked).toBe(false);
      expect(r.secrets).toEqual([]);
    }
  });

  it('reports the masked values so that error text can be scrubbed', () => {
    expect(classifyLine('cisco', `snmp-server community ${S} RO`).secrets).toEqual([S]);
    expect(classifyLine('cisco', `username admin secret ${S}`).secrets).toEqual([S]);
    expect(classifyLine('cisco', `username admin secret a b`).secrets).toEqual(['a b']);
  });

  it('never throws and masks nothing for degenerate input', () => {
    for (const l of ['', ' ', '\t', '\u0000', 'do', 'no', 'do no', 'enable', 'username', 'password', '?', '  enable secret X']) {
      expect(() => classifyLine('cisco', l), JSON.stringify(l)).not.toThrow();
    }
    // a no-break space is whitespace for the tokenizer, so the form is still recognised
    expect(classifyLine('cisco', '  enable secret Xyz').shown).not.toContain('Xyz');
  });

  it('is idempotent: re-classifying a shown line changes nothing', () => {
    for (const [, input] of ROWS) {
      const once = classifyLine('cisco', input).shown;
      expect(classifyLine('cisco', once).shown).toBe(once);
      expect(sanitizeHistoryEntry(once)).toBe(once);
    }
  });

  it('property: 200 random secrets never survive in any form', () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const alphabet = 'abcXYZ0189#!$%&*()-_=+[]{};:,.<>/\\|~`"\'é日本';
    const forms = (s: string) => [
      `enable secret ${s}`, `enable password ${s}`, `username u secret ${s}`, `username u password ${s}`, `username u privilege 15 secret 0 ${s}`,
      `password ${s}`, `snmp-server community ${s} RO`, `net user bob ${s}`, `user u group g password plaintext ${s}`, `no username u secret ${s}`,
    ];
    for (let n = 0; n < 200; n++) {
      let body = '';
      for (let k = 0; k < 8 + Math.floor(rnd() * 10); k++) body += alphabet[Math.floor(rnd() * alphabet.length)];
      const secret = `Zz${body}`;
      for (const f of forms(secret)) expect(classifyLine('cisco', f).shown.includes(secret), `form ${f.split(' ')[0]}`).toBe(false);
    }
  });

  it('exports the mask marker and a wrapper compatible with the former redactLine', () => {
    expect(MASK).toBe('********');
    for (const v of VENDORS) expect(redactLine(v, `enable secret ${S}`)).toBe('enable secret ********');
    expect(redactLine('cisco', 'show running-config')).toBe('show running-config');
  });
});

describe('scrubText — error/hint text', () => {
  it('replaces the whole raw line by the shown line, and masked values only as whole tokens', () => {
    const r = classifyLine('cisco', `username admin secret ${S}`);
    const raw = `username admin secret ${S}`;
    expect(scrubText(`% Ambiguous command:  "${raw}"`, raw, r)).toBe('% Ambiguous command:  "username admin secret ********"');
    expect(scrubText(`bad token '${S}' here`, raw, r)).toBe(`bad token '${MASK}' here`);
    expect(scrubText(`${S}`, raw, r)).toBe(MASK);
  });

  it('does not corrupt unrelated words when the secret is very short', () => {
    const raw = 'username admin secret a';
    const r = classifyLine('cisco', raw);
    expect(scrubText('% Invalid input detected at the marker. Ambiguous command: a', raw, r)).toBe(`% Invalid input detected at the marker. Ambiguous command: ${MASK}`);
    expect(scrubText('% Ambiguous', raw, r)).toBe('% Ambiguous');
  });

  it('handles a secret in the middle of the command', () => {
    const raw = `snmp-server community ${S} RO`;
    const r = classifyLine('cisco', raw);
    expect(scrubText(`error near "${S}" RO`, raw, r)).toBe(`error near "${MASK}" RO`);
    expect(scrubText(`% Ambiguous command:  "${raw}"`, raw, r)).toBe('% Ambiguous command:  "snmp-server community ******** RO"');
  });

  it('is a no-op for unmasked lines', () => {
    const r = classifyLine('cisco', 'show runn');
    expect(scrubText('% Ambiguous command:  "show runn"', 'show runn', r)).toBe('% Ambiguous command:  "show runn"');
  });
});

describe('sanitizeLab', () => {
  function labWith(history: string[]) {
    const r = addDevice(emptyLab('t'), 'cisco-router', 0, 0);
    const lab = structuredClone(r.lab);
    getDevice(lab, r.device.id)!.cli.history = history;
    return lab;
  }
  it('returns the same object when nothing needs masking', () => {
    const lab = labWith(['enable', 'show running-config']);
    const r = sanitizeLab(lab);
    expect(r.lab).toBe(lab);
    expect(r.count).toBe(0);
  });
  it('masks only recognised entries, keeps order, counts them, and does not mutate the input', () => {
    const lab = labWith(['enable', `username a secret ${S}`, 'hostname R1', `password ${S}`]);
    const r = sanitizeLab(lab);
    expect(r.count).toBe(2);
    expect(r.lab.devices[0].cli.history).toEqual(['enable', 'username a secret ********', 'hostname R1', 'password ********']);
    expect(lab.devices[0].cli.history[1]).toContain(S);
    expect(r.lab.devices[0].id).toBe(lab.devices[0].id);
  });
});
