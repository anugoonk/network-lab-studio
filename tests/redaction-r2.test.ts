/**
 * CERT-P0-1b.1-R2 — regression tests for the findings of the independent review R1 (R1-01, R1-02, R1-04, R1-05, R1-06, R1-09).
 * Synthetic values only. Every vector here failed (leaked, over-masked or miscounted) against the R1 implementation.
 */
import { describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { MASK, WITHHELD, classifyLine, sanitizeLab, sanitizeUntrusted } from '../src/core/cli/redact';
import { addDevice, emptyLab, getDevice } from '../src/core/lab';
import { REJECTED_KEY, WORKSPACE_KEY, STORAGE_KEY, loadRejected, loadWorkspaceDetailed, parseImport, rejectedBundle, saveRejected, saveStored, saveWorkspace, serializeExport } from '../src/core/persist';
import { encodeShare, decodeShare } from '../src/core/share';
import { useStore } from '../src/store';
import type { Lab } from '../src/core/types';

const X = 'ZpQ7rv9Xw';

function memStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}
const all = (s: ReturnType<typeof memStorage>) => [...s.m.values()].join('\n');

describe('R1-01 malformed / glued credential keywords on username lines', () => {
  const LEAKY = [
    `username admin sceret ${X}`,
    `username admin s3cret ${X}`,
    `username admin pssword ${X}`,
    `username admin pwd ${X}`,
    `username admin secret${X}`,
    `username admin secret=${X}`,
    `username admin password:${X}`,
    `username admin password=${X}`,
    `USERNAME Admin SeCrEt:${X}`,
    `username admin privilege 15 s3cret 0 ${X}`,
    `username admin privilege 15 secret5${X}`,
    `username admin secretabcdefgh ${X}`,
    `username admin   pwd   ${X}`,
    `username admin "${X} Two"`,
    `username admin pwd ${X}!`,
    `no username admin pwd ${X}`,
    `do username admin sceret ${X}`,
    `user admin group administrator pwd ${X}`,
    `user admin password:${X}`,
    `username admin foo bar ${X}`,
  ];
  it.each(LEAKY)('masks %s', (line) => {
    const r = classifyLine('cisco', line);
    expect(r.shown).not.toContain(X);
    expect(r.masked).toBe(true);
  });

  it('glued separators on other first words', () => {
    for (const l of [`password:${X}`, `password=${X}`, `enable secret=${X}`, `enable password:${X}`, `snmp-server user u secret=${X}`, `crypto x passphrase:${X}`]) {
      expect(classifyLine('cisco', l).shown, l).not.toContain(X);
    }
  });

  it('keeps the existing readable shapes', () => {
    expect(classifyLine('cisco', `username admin secret ${X}`).shown).toBe('username admin secret ********');
    expect(classifyLine('cisco', `username admin seecret ${X}`).shown).toBe('username admin seecret ********');
    expect(classifyLine('cisco', `username admin privilege 15 secret 0 ${X}`).shown).toBe('username admin privilege 15 secret ********');
    expect(classifyLine('cisco', `user admin group administrator password plaintext ${X}`).shown).toBe('user admin group administrator password ********');
  });

  it('does not touch ordinary username / password lines', () => {
    for (const l of ['username admin', 'username admin nopassword', 'username admin privilege 15', 'username admin privilege 15 nopassword', 'username admin view root', 'username admin secret', 'no username admin', 'user admin role administrator', 'password', 'no password']) {
      expect(classifyLine('cisco', l).shown, l).toBe(l);
    }
  });

  it('end to end: echo, history, error text and hint never carry the value (every vendor family)', async () => {
    for (const kind of ['cisco-router', 'aruba-switch', 'pc'] as const) {
      const a = addDevice(emptyLab('t'), kind, 0, 0);
      let lab: Lab = a.lab;
      for (const l of [`username admin sceret ${X}`, `username admin secret=${X}`, `username admin password:${X}`, `username admin pwd ${X}`]) {
        const r = executeLine(lab, a.device.id, l);
        lab = r.lab;
        expect(JSON.stringify(r), kind + l).not.toContain(X);
      }
      expect(JSON.stringify(lab)).not.toContain(X);
      expect(serializeExport(lab)).not.toContain(X);
      const dec = await decodeShare(await encodeShare(lab));
      expect(JSON.stringify(dec)).not.toContain(X);
      const st = memStorage();
      saveStored({ lab, savedSig: null } as never, st);
      expect(all(st)).not.toContain(X);
    }
  });
});

describe('R1-04 invisible characters cannot split a credential command', () => {
  it.each(['​', '‌', '‍', '⁠', '﻿', '­'])('U+%#x between words', (z) => {
    for (const l of [`enable${z}secret ${X}`, `enable secret${z}${X}`, `username admin${z}secret ${X}`, `username admin secret${z}${X}`, `password${z}${X}`, `snmp-server community${z}${X} RO`]) {
      expect(classifyLine('cisco', l).shown, JSON.stringify(l)).not.toContain(X);
    }
  });
  it('detection only: the shown line keeps the original characters; ordinary Unicode text is untouched', () => {
    expect(classifyLine('cisco', `enable​secret ${X}`).shown).toBe('enable​secret ********');
    for (const l of ['description ศูนย์​ข้อมูล', 'hostname R​1', 'show running-config']) expect(classifyLine('cisco', l).shown).toBe(l);
  });
});

describe('R1-05 free text after the word password stays readable; credentials stay masked', () => {
  it.each([
    'snmp-server location server room password shelf',
    'snmp-server contact admin password desk',
    'description the password is on a sticky note',
    'banner motd password protected area',
    'show running-config | include password',
  ])('keeps %s', (l) => expect(classifyLine('cisco', l).shown).toBe(l));
  it('still masks real credential contexts', () => {
    expect(classifyLine('cisco', `snmp-server community ${X} RO`).shown).toBe('snmp-server community ******** RO');
    expect(classifyLine('cisco', `snmp-server location a community ${X}`).shown).not.toContain(X);
    expect(classifyLine('cisco', `ip ospf authentication password ${X}`).shown).toBe('ip ospf authentication password ********');
    expect(classifyLine('cisco', `neighbor 1.1.1.1 password ${X}`).shown).toBe('neighbor 1.1.1.1 password ********');
  });
});

describe('R1-06 masked count counts each logical entry once', () => {
  it('a challenge start snapshot copy of the same history does not double the count', () => {
    const a = addDevice(emptyLab('c'), 'cisco-router', 0, 0);
    const lab = structuredClone(a.lab);
    const d = getDevice(lab, a.device.id)!;
    d.cli.history = ['enable', `username a secret ${X}`, `password ${X}`];
    (lab as Lab).challenge = { start: { devices: structuredClone(lab.devices) } } as never;
    const r = sanitizeLab(lab);
    expect(r.count).toBe(2);
    expect(JSON.stringify(r.lab)).not.toContain(X);
  });
  it('the same line typed twice counts twice (two entries)', () => {
    const a = addDevice(emptyLab('c'), 'cisco-router', 0, 0);
    const lab = structuredClone(a.lab);
    getDevice(lab, a.device.id)!.cli.history = [`password ${X}`, `password ${X}`];
    expect(sanitizeLab(lab).count).toBe(2);
  });
});

describe('R1-02 rejected labs never keep or export plaintext credential history', () => {
  /** a Lab entry that fails validation (unknown device kind) but carries plaintext history */
  function badEntry(id: string, hist: string[], extra: Record<string, unknown> = {}) {
    const a = addDevice(emptyLab('Broken ' + id), 'cisco-router', 0, 0);
    const lab = structuredClone(a.lab) as unknown as { devices: { kind: string; cli: { history: unknown } }[] };
    lab.devices[0].cli.history = hist;
    lab.devices[0].kind = 'not-a-device';
    return { id, name: 'Broken ' + id, updatedAt: 1, savedSig: null, lab: { ...lab, name: 'Broken ' + id }, ...extra };
  }
  const ws = (entries: unknown[]) => JSON.stringify({ activeId: 'x', entries });

  it('A/C: loadWorkspaceDetailed → saveRejected → loadRejected → rejectedBundle keeps ordinary history, masks credentials', () => {
    const st = memStorage({ [WORKSPACE_KEY]: ws([badEntry('b1', ['enable', 'show vlan', `username a secret ${X}`, `username a pwd ${X}`, `password:${X}`])]) });
    const { rejected } = loadWorkspaceDetailed(st);
    expect(rejected.length).toBe(1);
    expect(rejected[0].error.length).toBeGreaterThan(0);
    expect(JSON.stringify(rejected)).not.toContain(X);
    expect(saveRejected(rejected, st)).toBe(true);
    expect(st.m.get(REJECTED_KEY)).not.toContain(X);
    const back = loadRejected(st);
    const bundle = rejectedBundle(back);
    expect(bundle).not.toContain(X);
    expect(bundle).toContain('show vlan');
    expect(bundle).toContain('username a secret ********');
    expect(bundle).toContain('Broken b1');
  });

  it('plaintext already stored in REJECTED_KEY by an older build is masked when read, exported and re-saved', () => {
    const old = { version: 1, items: [{ id: 'o1', name: 'old', error: 'e', at: 1, entry: badEntry('o1', [`enable secret ${X}`, 'show ip route']) }] };
    const st = memStorage({ [REJECTED_KEY]: JSON.stringify(old) });
    const read = loadRejected(st);
    expect(JSON.stringify(read)).not.toContain(X);
    expect(rejectedBundle(read)).not.toContain(X);
    expect(rejectedBundle(JSON.parse(JSON.stringify(old.items)))).not.toContain(X); // bundle also sanitises what it is handed
    saveRejected([], st);
    expect(st.m.get(REJECTED_KEY)).not.toContain(X);
  });

  it('B: ordinary history is byte-identical', () => {
    const e = badEntry('b2', ['enable', 'configure terminal', 'show vlan brief']);
    const r = sanitizeUntrusted(e);
    expect(r.value).toEqual(e);
    expect(r.count).toBe(0);
  });

  it('D/E/H: missing fields, wrong types and malformed history are handled without throwing or leaking', () => {
    const cases: unknown[] = [
      { id: 'd1', lab: { devices: [{ cli: { history: [`password ${X}`] } }] } },
      { id: 'd2', lab: { devices: [{ cli: { history: `username a pwd ${X}` } }] } },
      { id: 'd3', lab: { devices: [{ cli: { history: [{ a: `enable secret ${X}` }, 5, null, [`password ${X}`]] } }] } },
      { id: 'd4', lab: { devices: 'nope', history: [`password ${X}`] } },
      { id: 'd5', lab: null },
      { id: 'd6', lab: { devices: [null, 7, { cli: null }, { cli: { history: [`username u sceret ${X}`] } }] } },
    ];
    for (const c of cases) {
      const r = sanitizeUntrusted(c);
      expect(JSON.stringify(r.value), JSON.stringify(c)).not.toContain(X);
    }
  });

  it('G: nested challenge snapshots', () => {
    const e = badEntry('g1', ['enable']);
    (e.lab as Record<string, unknown>).challenge = { start: { devices: [{ cli: { history: [`username a secret ${X}`] } }] } };
    expect(JSON.stringify(sanitizeUntrusted(e).value)).not.toContain(X);
  });

  it('raw strings: parseable JSON is sanitised in place, unreadable text that may hold credentials is withheld', () => {
    const json = JSON.stringify({ entries: [{ lab: { devices: [{ cli: { history: [`password ${X}`] } }] } }] });
    const a = sanitizeUntrusted(json).value as string;
    expect(typeof a).toBe('string');
    expect(a).not.toContain(X);
    expect(a).toContain('devices');
    const broken = `{"entries":[{"lab":{"devices":[{"cli":{"history":["password ${X}"`;
    expect(sanitizeUntrusted(broken).value).toBe(WITHHELD);
    expect(sanitizeUntrusted('not json at all, nothing sensitive').value).toBe('not json at all, nothing sensitive');
    const st = memStorage({ [WORKSPACE_KEY]: broken, [STORAGE_KEY]: JSON.stringify({ lab: { devices: [{ cli: { history: [`password ${X}`] } }] } }) });
    const { rejected } = loadWorkspaceDetailed(st);
    saveRejected(rejected, st);
    expect(st.m.get(REJECTED_KEY)).not.toContain(X);
    expect(rejectedBundle(loadRejected(st))).not.toContain(X);
  });

  it('N: bounded — an over-deep or over-wide payload is withheld, never traversed without limit, never leaked', () => {
    let deep: unknown = { history: [`password ${X}`] };
    for (let i = 0; i < 200; i++) deep = { a: deep };
    const r = sanitizeUntrusted(deep);
    expect(r.value).toBe(WITHHELD);
    expect(JSON.stringify(r.value)).not.toContain(X);
    const wide = { devices: Array.from({ length: 300_000 }, () => ({ n: 1 })), history: [`password ${X}`] };
    const t0 = Date.now();
    const w = sanitizeUntrusted(wide);
    expect(Date.now() - t0).toBeLessThan(3000);
    expect(JSON.stringify(w.value)).not.toContain(X);
  });

  it('L: a recovered file that is imported again is accepted only with the credentials masked, and the original error is kept', () => {
    const e = badEntry('l1', [`username a secret ${X}`]);
    const bundle = JSON.parse(rejectedBundle([{ id: 'l1', name: e.name, error: 'orig error', entry: e, at: 1 }]));
    expect(bundle.items[0].error).toBe('orig error');
    const file = JSON.stringify(bundle.items[0].file);
    expect(file).not.toContain(X);
    const r = parseImport(file);
    expect(r.ok).toBe(false); // still invalid: nothing was silently repaired
  });

  it('M: the error text never contains history', () => {
    const st = memStorage({ [WORKSPACE_KEY]: ws([badEntry('m1', [`password ${X}`])]) });
    expect(loadWorkspaceDetailed(st).rejected.map((r) => r.error).join()).not.toContain(X);
  });

  it('valid labs are unaffected by the rejected path (workspace save keeps ordinary history)', () => {
    const a = addDevice(emptyLab('ok'), 'cisco-router', 0, 0);
    const lab = structuredClone(a.lab);
    getDevice(lab, a.device.id)!.cli.history = ['enable', 'show vlan'];
    const st = memStorage();
    saveWorkspace({ activeId: 'i', entries: [{ id: 'i', name: 'ok', updatedAt: 1, savedSig: null, lab }] }, st);
    expect(all(st)).toContain('show vlan');
  });
});

describe('R1-09 undo / redo restore path', () => {
  it('after undo the lab in the store, its export and its storage are free of a credential typed earlier', () => {
    const a = addDevice(emptyLab('u'), 'cisco-router', 0, 0);
    useStore.setState({ lab: a.lab } as never);
    const r = executeLine(useStore.getState().lab, a.device.id, `username a sceret ${X}`);
    useStore.setState({ lab: r.lab } as never);
    useStore.getState().undo();
    useStore.getState().redo();
    const lab = useStore.getState().lab;
    expect(JSON.stringify(lab)).not.toContain(X);
    expect(serializeExport(lab)).not.toContain(X);
    expect(MASK.length).toBeGreaterThan(0);
  });
});

describe('R1-01 typo keyword is recognised only when it is close to secret / password', () => {
  it('a near-miss keeps the readable keyword; an unrelated word in keyword position is masked itself', () => {
    expect(classifyLine('cisco', `username a seecret ${X}`).shown).toBe('username a seecret ********');
    expect(classifyLine('cisco', `username a secrte ${X}`).shown).toBe('username a secrte ********');
    expect(classifyLine('cisco', `username a parole ${X}`).shown).toBe('username a ********');
    expect(classifyLine('cisco', `username a parole`).shown).toBe('username a ********');
  });
});
