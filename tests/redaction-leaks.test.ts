/**
 * CERT-P0-1b.1 — credential redaction foundation. Engine-level and persistence-level proofs that a secret typed in ANY
 * secret-bearing command form never becomes visible: not in the engine result, CLI history, transcript, Lab JSON,
 * export, share-link payload, localStorage, workspace storage or undo snapshots — on every CLI device kind, whether the
 * command is supported or not. All secrets here are synthetic test values.
 * Test IDs follow tests-matrix CERT_P0_1B (B-*, I-*, J-*, K-*, L-*).
 */
import { describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { addDevice, emptyLab, getDevice } from '../src/core/lab';
import { PROFILES } from '../src/core/profiles';
import { STORAGE_KEY, WORKSPACE_KEY, loadStored, loadWorkspace, parseImport, saveStored, saveWorkspace, serializeExport } from '../src/core/persist';
import { decodeShare, encodeShare } from '../src/core/share';
import { SAMPLES } from '../src/core/sample';
import { useStore } from '../src/store';
import type { DeviceKind, Lab } from '../src/core/types';

const SECRET = 'Sy9nthTest#P1b1';
const COMM = 'Sy9nComm-ro#2';

/** every secret-bearing form of the approved redaction policy (the secret is in the last position unless noted) */
const SHAPES = (s: string): string[] => [
  `username admin secret ${s}`,
  `username admin password ${s}`,
  `username bob privilege 15 secret 0 ${s}`,
  `username admin secrte ${s}`,
  `USERNAME Admin SECRET ${s}`,
  `  username   admin   secret   ${s}`,
  `user admin group administrator password plaintext ${s}`,
  `password ${s}`,
  `password 7 ${s}`,
  `snmp-server community ${s} RO`,
  `net user bob ${s}`,
  `username admin secret ${s}?`,
  `no username admin secret ${s}`,
  `do username admin secret ${s}`,
  `username admin secret ${s} trailing words`,
];

const CLI_KINDS: DeviceKind[] = ['cisco-router', 'cisco-switch', 'isp-router', 'aruba-switch', 'l3-switch', 'pc', 'laptop', 'printer'];
const NO_CLI = (Object.keys(PROFILES) as DeviceKind[]).filter((k) => !PROFILES[k].hasCli);

function setup(kind: DeviceKind) {
  const r = addDevice(emptyLab('p1b1'), kind, 0, 0);
  return { lab: r.lab, id: r.device.id };
}
/** put Cisco devices into global config mode so line-mode forms are as reachable as they can be */
function ready(kind: DeviceKind) {
  const s = setup(kind);
  let lab = s.lab;
  if (PROFILES[kind].vendor === 'cisco') for (const l of ['enable', 'configure terminal']) lab = executeLine(lab, s.id, l).lab;
  return { lab, id: s.id };
}
const memStorage = () => {
  const mem = new Map<string, string>();
  return { mem, getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
};

describe('B-23/F-1: no secret-bearing command form leaks, on any device', () => {
  it.each(CLI_KINDS)('%s: engine result, history, Lab JSON, export, storage and reload hold no secret', (kind) => {
    const s = ready(kind);
    let lab: Lab = s.lab;
    for (const l of SHAPES(SECRET)) {
      const r = executeLine(lab, s.id, l);
      lab = r.lab;
      expect(JSON.stringify([r.output, r.echo ?? null, r.hintTh ?? null, r.prompt]), `${kind}: shape`).not.toContain(SECRET);
      expect(r.echo, `${kind}: masked echo is set for a masked line`).toBeDefined();
    }
    expect(getDevice(lab, s.id)!.cli.history.join('\n')).not.toContain(SECRET);
    expect(JSON.stringify(lab)).not.toContain(SECRET);
    expect(serializeExport(lab)).not.toContain(SECRET);
    const st = memStorage();
    saveStored({ lab, savedSig: null }, st);
    saveWorkspace({ activeId: 'a', entries: [{ id: 'a', name: 'x', updatedAt: 1, savedSig: null, lab }] }, st);
    for (const k of [STORAGE_KEY, WORKSPACE_KEY]) expect(st.mem.get(k) ?? '', `${kind}: ${k}`).not.toContain(SECRET);
    expect(JSON.stringify(loadStored(st)!.lab)).not.toContain(SECRET);
  });

  it.each(NO_CLI)('%s (no CLI): the rejection echoes every secret form masked', (kind) => {
    const { lab, id } = setup(kind);
    for (const l of SHAPES(SECRET)) {
      const r = executeLine(lab, id, l);
      expect(JSON.stringify(r), `${kind}`).not.toContain(SECRET);
    }
  });

  it('the Console transcript (store.exec) never shows the raw line, for every form', () => {
    for (const kind of CLI_KINDS) {
      const s = ready(kind);
      useStore.setState({ lab: s.lab, transcripts: {} });
      for (const l of SHAPES(SECRET)) useStore.getState().exec(s.id, l);
      expect(JSON.stringify(useStore.getState().transcripts[s.id]), kind).not.toContain(SECRET);
      expect(JSON.stringify(useStore.getState().lab), kind).not.toContain(SECRET);
    }
  });

  it('keeps the structure around a secret in the middle: only the value is masked (F-3)', () => {
    const s = ready('cisco-router');
    const r = executeLine(s.lab, s.id, `snmp-server community ${COMM} RO`);
    expect(r.echo).toBe('snmp-server community ******** RO');
    expect(getDevice(r.lab, s.id)!.cli.history.slice(-1)).toEqual(['snmp-server community ******** RO']);
    expect(JSON.stringify(r)).not.toContain(COMM);
  });
});

describe('F-2/K-03: legacy plaintext in an imported Lab is masked before it can be persisted again', () => {
  function legacyLab(): Lab {
    const s = setup('cisco-router');
    const lab = structuredClone(s.lab);
    const dev = getDevice(lab, s.id)!;
    dev.cli.history = ['enable', 'show running-config', `username legacy secret ${SECRET}`, 'configure terminal', `snmp-server community ${COMM} RO`, 'hostname R7'];
    return lab;
  }
  const dumpOf = (lab: Lab) => JSON.stringify({ app: 'network-lab-studio', schemaVersion: 1, lab });

  it('parseImport masks recognised entries, keeps the rest in order, keeps the topology, and reports a count', () => {
    const lab = legacyLab();
    const r = parseImport(serializeExportRaw(lab));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const h = r.lab.devices[0].cli.history;
    expect(JSON.stringify(r.lab)).not.toContain(SECRET);
    expect(JSON.stringify(r.lab)).not.toContain(COMM);
    expect(h).toEqual(['enable', 'show running-config', 'username legacy secret ********', 'configure terminal', 'snmp-server community ******** RO', 'hostname R7']);
    expect(r.lab.devices.length).toBe(lab.devices.length);
    expect((r as { masked?: number }).masked).toBe(2);
  });

  it('loadStored and loadWorkspace mask legacy plaintext already sitting in browser storage', () => {
    const lab = legacyLab();
    const st = memStorage();
    st.mem.set(STORAGE_KEY, JSON.stringify({ lab, savedSig: null }));
    st.mem.set(WORKSPACE_KEY, JSON.stringify({ activeId: 'a', entries: [{ id: 'a', name: 'x', updatedAt: 1, savedSig: null, lab }] }));
    expect(JSON.stringify(loadStored(st)!.lab)).not.toContain(SECRET);
    expect(JSON.stringify(loadWorkspace(st))).not.toContain(SECRET);
  });

  it('export, storage and share-link serialisation of an in-memory Lab that still holds legacy plaintext are clean', async () => {
    const lab = legacyLab();
    expect(serializeExport(lab)).not.toContain(SECRET);
    const st = memStorage();
    saveStored({ lab, savedSig: null }, st);
    saveWorkspace({ activeId: 'a', entries: [{ id: 'a', name: 'x', updatedAt: 1, savedSig: null, lab }] }, st);
    for (const k of [STORAGE_KEY, WORKSPACE_KEY]) expect(st.mem.get(k) ?? '').not.toContain(SECRET);
    const frag = await encodeShare(lab);
    const d = await decodeShare(frag);
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.text).not.toContain(SECRET);
  });

  it('a challenge start snapshot is sanitised too', () => {
    const lab = legacyLab();
    const withChallenge: Lab = { ...lab, challenge: { title: 't', goal: 'g', checks: [], start: { devices: structuredClone(lab.devices), links: [], counters: {} } } };
    expect(serializeExport(withChallenge)).not.toContain(SECRET);
    const r = parseImport(serializeExportRaw(withChallenge));
    expect(r.ok && JSON.stringify(r.lab)).not.toContain(SECRET);
  });

  it('clean Labs are returned unchanged (no churn, no notice)', () => {
    const lab = SAMPLES.office.build();
    const r = parseImport(serializeExport(lab));
    expect(r.ok && r.lab).toEqual(lab);
    expect((r as { masked?: number }).masked).toBeUndefined();
  });

  // helper: the export format written by an OLD build (no sanitising) so the legacy file is faithful
  function serializeExportRaw(lab: Lab): string {
    return dumpOf(lab);
  }
});

describe('I-05: undo/redo snapshots never hold a recognised secret', () => {
  it('after secret-bearing commands and edits, past/future snapshots and the restored Lab are clean', () => {
    const s = ready('cisco-router');
    useStore.setState({ lab: s.lab, transcripts: {}, history: { past: [], future: [], lastKey: null, lastAt: 0 } });
    const ex = (l: string) => useStore.getState().exec(s.id, l);
    for (const l of SHAPES(SECRET)) ex(l);
    ex('hostname R8');
    ex('hostname R9');
    const dump = () => JSON.stringify([useStore.getState().history, useStore.getState().lab]);
    expect(dump()).not.toContain(SECRET);
    useStore.getState().undo();
    expect(dump()).not.toContain(SECRET);
    useStore.getState().redo();
    expect(dump()).not.toContain(SECRET);
  });
});

describe('import notice', () => {
  it('importAsEntry masks legacy history, tells the learner how many lines, and the notice holds no secret', () => {
    const s = setup('cisco-router');
    const lab = structuredClone(s.lab);
    getDevice(lab, s.id)!.cli.history = ['enable', `username legacy secret ${SECRET}`, `password ${SECRET}`];
    const before = useStore.getState().others.length;
    const err = useStore.getState().importAsEntry(JSON.stringify({ app: 'network-lab-studio', schemaVersion: 1, lab }), 'old.json');
    expect(err).toBeNull();
    const st = useStore.getState();
    expect(st.others.length).toBe(before + 1);
    expect(JSON.stringify(st.others[st.others.length - 1].lab)).not.toContain(SECRET);
    expect(st.notice?.text ?? '').toMatch(/2/);
    expect(JSON.stringify(st.notice)).not.toContain(SECRET);
  });
});
