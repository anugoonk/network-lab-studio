import { describe, expect, it } from 'vitest';
import { ping } from '../src/core/network';
import {
  REJECTED_KEY,
  REJECTED_LIMIT,
  STORAGE_KEY,
  WORKSPACE_KEY,
  loadRejected,
  loadWorkspace,
  loadWorkspaceDetailed,
  parseImport,
  rejectedBundle,
  saveRejected,
  serializeExport,
  type RejectedEntry,
} from '../src/core/persist';
import { buildSampleLab } from '../src/core/sample';
import type { Lab } from '../src/core/types';
import { byName, dev, run } from './helpers';

/** The Small Office with an older, smaller SW2 (12 ports, uplink on 1/1/12) and a Cisco SW1 without Fa0/13-24. */
function smallModelsLab(): Lab {
  const lab = structuredClone(buildSampleLab());
  const sw2 = byName(lab, 'SW2');
  const sw1 = byName(lab, 'SW1');
  const oldUplink = structuredClone(sw2.ifaces.find((i) => i.name === '1/1/24')!);
  sw2.ifaces = sw2.ifaces.filter((i) => Number(i.name.split('/')[2]) <= 12);
  // the uplink keeps its configuration (access VLAN 10, enabled, switched) but now lives on 1/1/12
  sw2.ifaces[sw2.ifaces.findIndex((i) => i.name === '1/1/12')] = { ...oldUplink, name: '1/1/12' };
  for (const l of lab.links) for (const e of [l.a, l.b]) if (e.deviceId === sw2.id && e.port === '1/1/24') e.port = '1/1/12';
  sw1.ifaces = sw1.ifaces.filter((i) => !/^FastEthernet0\/(1[3-9]|2[0-4])$/.test(i.name));
  return lab;
}

const memory = (init: Record<string, string> = {}) => {
  const data = { ...init };
  return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
};

describe('Labs saved from smaller/older models keep their ports', () => {
  it('imports a Lab whose switches have fewer than 24 ports and keeps device IDs, port IDs, config and cable ends', () => {
    const lab = smallModelsLab();
    const r = parseImport(serializeExport(lab));
    expect(r.ok, r.ok ? '' : r.error).toBe(true);
    if (!r.ok) return;
    expect(r.lab.devices.map((d) => [d.id, d.kind, d.ifaces.map((i) => i.name)])).toEqual(lab.devices.map((d) => [d.id, d.kind, d.ifaces.map((i) => i.name)]));
    expect(r.lab.links).toEqual(lab.links);
    expect(dev(r.lab, 'SW2').ifaces).toHaveLength(12);
    expect(dev(r.lab, 'SW1').ifaces.filter((i) => i.name.startsWith('FastEthernet'))).toHaveLength(12);
  });

  it('the imported small-model Lab works: ping across the 1/1/12 uplink, CLI knows only the ports that exist', () => {
    const r = parseImport(serializeExport(smallModelsLab()));
    if (!r.ok) throw new Error(r.error);
    const lab = r.lab;
    expect(ping(lab, byName(lab, 'PC-01').id, '192.168.1.106').ok).toBe(true); // PC-01 (SW1) → PC-06 (SW2) over Gi0/2 ↔ 1/1/12
    const out = run(lab, 'SW2', ['show interface brief', 'configure terminal', 'interface 1/1/24']).results;
    expect(out[0].output.filter((l) => /^1\/1\/\d+/.test(l.trim()))).toHaveLength(12);
    expect(out[2].ok).toBe(false); // a port this model does not have
  });

  it('a port name that is not part of the model is still rejected', () => {
    const j = JSON.parse(serializeExport(smallModelsLab()));
    j.lab.devices.find((d: { name: string }) => d.name === 'SW2').ifaces.push({ ...j.lab.devices[0].ifaces[0], name: '1/1/99' });
    expect(parseImport(JSON.stringify(j)).ok).toBe(false);
  });

  it('a switch with no ports at all is rejected', () => {
    const j = JSON.parse(serializeExport(buildSampleLab()));
    j.lab.devices.find((d: { name: string }) => d.name === 'SW2').ifaces = [];
    expect(parseImport(JSON.stringify(j)).ok).toBe(false);
  });
});

describe('startup load never discards a saved Lab silently', () => {
  const entry = (id: string, lab: unknown) => ({ id, name: 'x', updatedAt: 1, savedSig: null, lab });
  const ws = (entries: unknown[], activeId?: string) => JSON.stringify({ activeId: activeId ?? (entries[0] as { id: string }).id, entries });
  const bad = () => {
    const l = structuredClone(buildSampleLab());
    l.name = 'Broken lab';
    byName(l, 'SW2').ifaces[0].name = '1/1/99'; // not a port of this model
    return l;
  };

  it('a healthy workspace has nothing rejected', () => {
    const s = memory({ [WORKSPACE_KEY]: ws([entry('a', buildSampleLab())]) });
    const r = loadWorkspaceDetailed(s);
    expect(r.ws?.entries).toHaveLength(1);
    expect(r.rejected).toEqual([]);
  });

  it('one invalid entry among valid ones is reported (with its name, reason and original data) while the rest loads', () => {
    const good = buildSampleLab();
    const s = memory({ [WORKSPACE_KEY]: ws([entry('good', good), entry('broken', bad())]) });
    const r = loadWorkspaceDetailed(s);
    expect(r.ws?.entries.map((e) => e.id)).toEqual(['good']);
    expect(r.rejected).toHaveLength(1);
    expect(r.rejected[0].id).toBe('broken');
    expect(r.rejected[0].name).toBe('Broken lab');
    expect(r.rejected[0].error).toMatch(/พอร์ต/);
    expect((r.rejected[0].entry as { lab: Lab }).lab.devices.length).toBe(13);
    // loadWorkspace keeps its old contract
    expect(loadWorkspace(s)?.entries).toHaveLength(1);
  });

  it('when EVERY entry is invalid the app starts on a fresh Lab but the originals are returned, not lost', () => {
    const s = memory({ [WORKSPACE_KEY]: ws([entry('broken', bad())]) });
    const r = loadWorkspaceDetailed(s);
    expect(r.ws).toBeNull();
    expect(r.rejected.map((x) => x.id)).toEqual(['broken']);
  });

  it('a corrupted workspace string is returned as raw data', () => {
    const s = memory({ [WORKSPACE_KEY]: '{not json' });
    const r = loadWorkspaceDetailed(s);
    expect(r.ws).toBeNull();
    expect(r.rejected[0].entry).toBe('{not json');
  });

  it('an invalid old single-lab save is reported too; a valid one still loads', () => {
    const s1 = memory({ [STORAGE_KEY]: JSON.stringify({ lab: bad(), savedSig: null }) });
    const r1 = loadWorkspaceDetailed(s1);
    expect(r1.ws).toBeNull();
    expect(r1.rejected[0].id).toBe('legacy-single-lab');
    const s2 = memory({ [STORAGE_KEY]: JSON.stringify({ lab: buildSampleLab(), savedSig: null }) });
    const r2 = loadWorkspaceDetailed(s2);
    expect(r2.ws?.entries).toHaveLength(1);
    expect(r2.rejected).toEqual([]);
  });

  it('a lab that used to be rejected (fewer ports) is no longer rejected', () => {
    const s = memory({ [WORKSPACE_KEY]: ws([entry('small', smallModelsLab())]) });
    const r = loadWorkspaceDetailed(s);
    expect(r.rejected).toEqual([]);
    expect(r.ws?.entries[0].lab.devices.find((d) => d.name === 'SW2')!.ifaces).toHaveLength(12);
  });
});

describe('kept copies of rejected Labs', () => {
  const item = (id: string, entry: unknown = { lab: { name: id } }): RejectedEntry => ({ id, name: id, error: 'e', entry, at: 1 });

  it('saveRejected stores copies, does not duplicate, and keeps only the newest REJECTED_LIMIT', () => {
    const s = memory();
    expect(saveRejected([item('a')], s)).toBe(true);
    expect(saveRejected([item('a'), item('b')], s)).toBe(true);
    expect(loadRejected(s).map((x) => x.id)).toEqual(['a', 'b']);
    for (let i = 0; i < REJECTED_LIMIT + 5; i++) saveRejected([item(`n${i}`)], s);
    const kept = loadRejected(s);
    expect(kept).toHaveLength(REJECTED_LIMIT);
    expect(kept[kept.length - 1].id).toBe(`n${REJECTED_LIMIT + 4}`);
    expect(s.data[REJECTED_KEY]).toContain('"version":1');
  });

  it('saveRejected reports failure when the browser refuses or there is no storage', () => {
    expect(saveRejected([item('a')], { getItem: () => null, setItem: () => { throw new Error('quota'); } })).toBe(false);
    expect(saveRejected([item('a')], undefined)).toBe(false); // no localStorage in the unit-test environment
  });

  it('the download bundle holds a normal export envelope per Lab (or the raw text when there was no Lab)', () => {
    const lab = buildSampleLab();
    const b = JSON.parse(rejectedBundle([item('with-lab', { lab }), item('raw', '{oops')]));
    expect(b.kind).toBe('recovered-labs');
    expect(b.items[0].file.app).toBe('network-lab-studio');
    expect(b.items[0].file.lab.devices).toHaveLength(13);
    expect(parseImport(JSON.stringify(b.items[0].file)).ok).toBe(true); // importable as a file
    expect(b.items[1].file).toBeNull();
    expect(b.items[1].raw).toBe('{oops');
  });
});
