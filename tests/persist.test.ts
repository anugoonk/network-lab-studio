import { describe, expect, it } from 'vitest';
import { contentSignature } from '../src/core/lab';
import { ping } from '../src/core/network';
import { loadStored, parseImport, saveStored, serializeExport, STORAGE_KEY } from '../src/core/persist';
import { byName, run, sample } from './helpers';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe('export / import', () => {
  it('round-trips names, positions, cables, config and ping results', () => {
    let lab = sample();
    lab = run(lab, 'SW2', ['configure terminal', 'hostname ACCESS2', 'interface 1/1/24', 'shutdown']).lab;
    const r = parseImport(serializeExport(lab));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(contentSignature(r.lab)).toBe(contentSignature(lab));
    expect(r.lab.devices.map((d) => [d.name, d.x, d.y])).toEqual(lab.devices.map((d) => [d.name, d.x, d.y]));
    const pc01 = byName(r.lab, 'PC-01').id;
    expect(ping(r.lab, pc01, '192.168.1.110').ok).toBe(false);
    expect(ping(r.lab, pc01, '192.168.1.1').ok).toBe(true);
  });

  const good = () => JSON.parse(serializeExport(sample()));
  const mutate = (fn: (j: ReturnType<typeof good>) => void) => {
    const j = good();
    fn(j);
    return JSON.stringify(j);
  };

  const bad: [string, string, RegExp][] = [
    ['not json', 'xxx', /JSON/],
    ['foreign app', mutate((j) => (j.app = 'other')), /Network Lab Studio/],
    ['future schema', mutate((j) => (j.schemaVersion = 99)), /schema version/],
    ['missing lab', mutate((j) => delete j.lab), /โครงสร้าง/],
    ['wrong type (name is a number)', mutate((j) => (j.lab.devices[0].name = 5)), /โครงสร้าง/],
    ['bad device kind', mutate((j) => (j.lab.devices[0].kind = 'toaster')), /โครงสร้าง/],
    ['bad IP', mutate((j) => (j.lab.devices[3].ifaces[0].ip = '300.1.1.1')), /IPv4/],
    ['bad mask', mutate((j) => (j.lab.devices[3].ifaces[0].mask = '255.0.255.0')), /mask/],
    ['link to unknown device', mutate((j) => (j.lab.links[0].a.deviceId = 'nope')), /อุปกรณ์ที่ไม่มีอยู่/],
    ['link to unknown port', mutate((j) => (j.lab.links[0].a.port = 'GigabitEthernet9/9')), /พอร์ตที่ไม่มีอยู่/],
    ['port used by two cables', mutate((j) => (j.lab.links[3].b = clone(j.lab.links[2].b))), /หลายสาย/],
    ['port name that does not belong to the model', mutate((j) => (j.lab.devices[0].ifaces[0].name = 'GigabitEthernet9/9')), /รายการพอร์ต|พอร์ตที่ไม่มีอยู่/],
    ['device with no ports at all', mutate((j) => (j.lab.devices[0].ifaces = [])), /รายการพอร์ต|พอร์ตที่ไม่มีอยู่/],
    ['cli mode invalid for kind', mutate((j) => (j.lab.devices[3].cli.mode = 'config')), /CLI mode/],
    ['switch without VLAN 1', mutate((j) => (j.lab.devices[1].vlans = [{ id: 10, name: 'x' }])), /VLAN 1/],
  ];
  for (const [name, text, re] of bad) {
    it(`rejects: ${name}`, () => {
      const r = parseImport(text);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(re);
    });
  }
});

describe('local storage', () => {
  it('saves and restores, ignoring corrupt data', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    expect(loadStored(storage)).toBeNull();
    const lab = sample();
    saveStored({ lab, savedSig: 'abc' }, storage);
    const back = loadStored(storage)!;
    expect(contentSignature(back.lab)).toBe(contentSignature(lab));
    expect(back.savedSig).toBe('abc');
    mem.set(STORAGE_KEY, '{"lab": {"broken": true}}');
    expect(loadStored(storage)).toBeNull();
    mem.set(STORAGE_KEY, 'not json');
    expect(loadStored(storage)).toBeNull();
  });
});
