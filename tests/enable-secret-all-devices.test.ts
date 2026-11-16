/**
 * CERT-P0-1a fix1 (production incident 2026-11-16): `enable secret <secret>` typed on a device that does not support it
 * (Aruba, PC, IP end devices, diagram objects) was echoed in clear text into the transcript, the CLI history (ArrowUp) and
 * localStorage, because the masking was limited to Cisco devices. Masking now applies to every device.
 * Each test proves the secret is ABSENT from everything visible, not only that the command was rejected.
 */
import { describe, expect, it } from 'vitest';
import { executeLine, redactLine } from '../src/core/cli/engine';
import { addDevice, emptyLab, getDevice } from '../src/core/lab';
import { PROFILES } from '../src/core/profiles';
import { STORAGE_KEY, WORKSPACE_KEY, loadStored, parseImport, saveStored, saveWorkspace, serializeExport } from '../src/core/persist';
import { useStore } from '../src/store';
import type { DeviceKind, Lab } from '../src/core/types';

const SECRET = 'Zq9-SynthTest#41';
const HASH = '$1$abcd$0123456789012345678901'; // synthetic type-5 shaped string (not a real hash of anything)

const KINDS: DeviceKind[] = ['cisco-router', 'cisco-switch', 'isp-router', 'aruba-switch', 'pc'];
const NO_SUPPORT: DeviceKind[] = ['aruba-switch', 'pc', 'laptop', 'server', 'printer', 'ip-camera', 'ip-phone', 'nvr', 'nas'];
const NO_CLI: DeviceKind[] = (Object.keys(PROFILES) as DeviceKind[]).filter((k) => !PROFILES[k].hasCli);

function setup(kind: DeviceKind) {
  const r = addDevice(emptyLab('fix1'), kind, 0, 0);
  return { lab: r.lab, id: r.device.id };
}
const memStorage = () => {
  const mem = new Map<string, string>();
  return { mem, getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
};

/** every secret-bearing form, abbreviations and case variations included */
const FORMS = (s: string) => [
  `enable secret ${s}`, `enable secret 0 ${s}`, `enable secret 5 ${HASH}`, `en sec ${s}`, `ena s 0 ${s}`, `e secret ${s}`,
  `ENABLE SECRET ${s}`, `Enable Secret ${s}`, `enable secrte ${s}`, `enable secret ${s} extra words`, `no enable secret ${s}`, `do enable secret ${s}`,
  `enable password ${s}`, `enable secret ${s}?`,
];

describe('fix1: redactLine is vendor-independent', () => {
  it.each(['cisco', 'aruba', 'pc', 'generic'] as const)('%s: secret arguments masked, ordinary lines untouched', (v) => {
    for (const l of FORMS(SECRET)) expect(redactLine(v, l), `${v}: ${l}`).not.toContain(SECRET);
    expect(redactLine(v, `enable secret 5 ${HASH}`)).toBe('enable secret ********');
    for (const l of ['show running-config', 'enable', 'ping 10.0.0.1', 'ipconfig /all', 'interface gi0/1', 'end', 'hostname R9', 'exit']) {
      expect(redactLine(v, l)).toBe(l);
    }
  });
});

describe('fix1: the secret never becomes visible, on any device', () => {
  it.each(KINDS)('%s: engine result, history, Lab, export and storage hold no raw secret', (kind) => {
    const s0 = setup(kind);
    let lab: Lab = s0.lab;
    const did = s0.id;
    for (const l of FORMS(SECRET)) {
      const r = executeLine(lab, did, l);
      lab = r.lab;
      expect(JSON.stringify([r.output, r.echo ?? null, r.hintTh ?? null, r.prompt]), `${kind}: ${l}`).not.toContain(SECRET);
    }
    const d = getDevice(lab, did)!;
    expect(d.cli.history.join('\n')).not.toContain(SECRET);
    expect(JSON.stringify(lab)).not.toContain(SECRET);
    expect(serializeExport(lab)).not.toContain(SECRET);
    const st = memStorage();
    saveStored({ lab, savedSig: null }, st);
    saveWorkspace({ activeId: 'a', entries: [{ id: 'a', name: 'x', updatedAt: 1, savedSig: null, lab }] }, st);
    for (const k of [STORAGE_KEY, WORKSPACE_KEY]) expect(st.mem.get(k) ?? '', `${kind}: ${k}`).not.toContain(SECRET);
    // reload: the stored Lab loads and still holds no secret
    expect(JSON.stringify(loadStored(st)!.lab)).not.toContain(SECRET);
    const again = parseImport(serializeExport(lab));
    expect(again.ok).toBe(true);
  });

  it.each(NO_SUPPORT)('%s: the command is still rejected, creates no secret, and is masked in the history', (kind) => {
    const { lab, id } = setup(kind);
    const r = executeLine(lab, id, `enable secret ${SECRET}`);
    expect(r.ok).toBe(false);
    expect(r.echo).toBe('enable secret ********');
    expect(getDevice(r.lab, id)!.security).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain(SECRET);
    expect(getDevice(r.lab, id)!.cli.history).toEqual(['enable secret ********']);
  });

  it.each(NO_CLI)('%s (no CLI): the rejection echoes the line masked, not raw', (kind) => {
    const { lab, id } = setup(kind);
    const r = executeLine(lab, id, `enable secret ${SECRET}`);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain(SECRET);
    expect(r.echo).toBe('enable secret ********');
  });
});

describe('fix1: the Console transcript (store.exec) never echoes the raw line', () => {
  it.each(KINDS)('%s: transcript lines and history are masked', (kind) => {
    const { lab, id } = setup(kind);
    useStore.setState({ lab, transcripts: {} });
    for (const l of FORMS(SECRET)) useStore.getState().exec(id, l);
    const tr = JSON.stringify(useStore.getState().transcripts[id]);
    expect(tr, kind).not.toContain(SECRET);
    expect(tr).toContain('enable secret ********');
    const state = useStore.getState().lab;
    expect(getDevice(state, id)!.cli.history.join('\n')).not.toContain(SECRET);
    expect(JSON.stringify(state)).not.toContain(SECRET);
  });
});

describe('fix1: Cisco authentication and ordinary commands are unchanged', () => {
  it.each(['cisco-router', 'cisco-switch', 'isp-router'] as const)('%s: set, disable, Password:, wrong then right still work', (kind) => {
    const { lab: l0, id } = setup(kind);
    let lab: Lab = l0;
    const run = (l: string) => { const r = executeLine(lab, id, l); lab = r.lab; return r; };
    for (const l of ['enable', 'configure terminal', `enable secret ${SECRET}`, 'end', 'disable']) run(l);
    expect(getDevice(lab, id)!.cli.mode).toBe('user');
    run('enable');
    expect(getDevice(lab, id)!.cli.pending).toBeDefined();
    run('wrong-answer-1');
    expect(getDevice(lab, id)!.cli.mode).toBe('user');
    expect(run(SECRET)).toMatchObject({ ok: true, secretInput: true, echo: '' });
    expect(getDevice(lab, id)!.cli.mode).toBe('priv');
    expect(JSON.stringify(lab)).not.toContain(SECRET);
  });

  it('ordinary commands on every vendor still run and keep their own text in history', () => {
    const cases: [DeviceKind, string[]][] = [
      ['cisco-router', ['enable', 'show running-config', 'configure terminal', 'hostname R9']],
      ['aruba-switch', ['show running-config', 'configure terminal', 'hostname S9']],
      ['pc', ['ipconfig', 'ping 127.0.0.1']],
    ];
    for (const [kind, lines] of cases) {
      const { lab: l0, id } = setup(kind);
      let lab: Lab = l0;
      for (const l of lines) { const r = executeLine(lab, id, l); lab = r.lab; expect(r.echo, `${kind}: ${l}`).toBeUndefined(); }
      expect(getDevice(lab, id)!.cli.history).toEqual(lines);
    }
  });
});
