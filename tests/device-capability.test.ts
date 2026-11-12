import { afterEach, describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { addDevice, addLink, emptyLab, updateDevice } from '../src/core/lab';
import { ping } from '../src/core/network';
import { parseImport, serializeExport } from '../src/core/persist';
import { PALETTE_GROUPS, PROFILES } from '../src/core/profiles';
import type { DeviceKind, Lab } from '../src/core/types';
import { setLangForTest } from '../src/i18n';
import { CATEGORY_OF, filterPalette, isSimulationCapable, paletteEntries, simLevelLabel } from '../src/ui/paletteCatalog';

afterEach(() => setLangForTest('th'));

const ALL = Object.keys(PROFILES) as DeviceKind[];

describe('capability metadata (DEV-01B-1a)', () => {
  it('classifies every existing device type', () => {
    expect(Object.fromEntries(ALL.map((k) => [k, PROFILES[k].simLevel]))).toEqual({
      'cisco-router': 'full',
      'cisco-switch': 'full',
      'aruba-switch': 'full',
      'l3-switch': 'full',
      pc: 'full',
      laptop: 'full',
      server: 'partial',
      'wireless-ap': 'diagram',
      firewall: 'diagram',
      'isp-router': 'full',
    });
  });

  it('category lives in PROFILES (single source) and the palette reads it', () => {
    for (const k of ALL) expect(CATEGORY_OF[k]).toBe(PROFILES[k].category);
    for (const e of paletteEntries()) {
      expect(e.category).toBe(PROFILES[e.kind].category);
      expect(e.simLevel).toBe(PROFILES[e.kind].simLevel);
    }
  });

  it('engine flags are exactly as before (metadata only, nothing behavioural changed)', () => {
    const flags = (k: DeviceKind) => {
      const p = PROFILES[k];
      return [p.isSwitch, p.isRouter, p.isHost, p.canForward, p.hasCli, p.vendor, p.portNames.length].join(',');
    };
    expect(Object.fromEntries(ALL.map((k) => [k, flags(k)]))).toEqual({
      'cisco-router': 'false,true,false,true,true,cisco,3',
      'cisco-switch': 'true,false,false,false,true,cisco,26',
      'aruba-switch': 'true,false,false,true,true,aruba,24',
      'l3-switch': 'true,false,false,true,true,aruba,28',
      pc: 'false,false,true,false,true,pc,1',
      laptop: 'false,false,true,false,true,pc,1',
      server: 'false,false,true,false,true,pc,1',
      'wireless-ap': 'false,false,false,false,false,generic,1',
      firewall: 'false,false,false,false,false,generic,3',
      'isp-router': 'false,true,false,true,true,cisco,2',
    });
  });

  it('the classification agrees with the engine flags', () => {
    for (const k of ALL) {
      const p = PROFILES[k];
      const inEngine = p.isSwitch || p.isRouter || p.isHost; // a forwarding node or an L3 endpoint
      if (p.simLevel === 'diagram') expect([inEngine, p.canForward, p.hasCli], k).toEqual([false, false, false]);
      else expect([inEngine, p.hasCli], k).toEqual([true, true]);
      expect(typeof p.simNote === 'string', `${k}: simNote only for partial/diagram`).toBe(p.simLevel !== 'full');
    }
  });

  it('labels in Thai and English', () => {
    expect(['full', 'partial', 'diagram'].map((l) => simLevelLabel(l as never))).toEqual(['จำลองได้', 'จำลองได้บางส่วน', 'แผนผังเท่านั้น']);
    setLangForTest('en');
    expect(['full', 'partial', 'diagram'].map((l) => simLevelLabel(l as never))).toEqual(['Simulation Ready', 'Partial Simulation', 'Diagram Only']);
  });
});

describe('classification verified against the engine', () => {
  const mk = () => {
    let lab: Lab = emptyLab('cap');
    const add = (k: DeviceKind) => {
      const r = addDevice(lab, k, 0, 0);
      lab = r.lab;
      return r.device.id;
    };
    const link = (a: string, pa: string, b: string, pb: string) => {
      const r = addLink(lab, { deviceId: a, port: pa }, { deviceId: b, port: pb });
      expect(r.error).toBeNull();
      lab = r.lab;
    };
    const ip = (id: string, addr: string) => {
      lab = updateDevice(lab, id, (d) => ({ ...d, ifaces: d.ifaces.map((i, n) => (n === 0 ? { ...i, ip: addr, mask: '255.255.255.0' } : i)) }));
    };
    return { add, link, ip, lab: () => lab };
  };

  it('simulated devices accept a CLI / terminal command; diagram-only ones refuse it and leave the Lab unchanged', () => {
    const first: Record<string, string> = { pc: 'ipconfig', cisco: 'enable', aruba: 'show vlan' };
    for (const k of ALL) {
      const b = mk();
      const id = b.add(k);
      const p = PROFILES[k];
      const r = executeLine(b.lab(), id, first[p.vendor] ?? 'show version');
      if (p.simLevel === 'diagram') {
        expect(r.ok, k).toBe(false);
        expect(r.lab, k).toBe(b.lab());
      } else expect(r.ok, `${k}: ${r.output.join('|')}`).toBe(true);
    }
  });

  it('full: two PCs ping each other through a Catalyst 2960 (L2 forwarding)', () => {
    const b = mk();
    const [p1, p2, sw] = [b.add('pc'), b.add('pc'), b.add('cisco-switch')];
    b.link(p1, 'Ethernet0', sw, 'FastEthernet0/1');
    b.link(p2, 'Ethernet0', sw, 'FastEthernet0/2');
    b.ip(p1, '192.168.50.1');
    b.ip(p2, '192.168.50.2');
    expect(ping(b.lab(), p1, '192.168.50.2').ok).toBe(true);
  });

  it('partial: a server is a working IP host (ping both ways) — only its services are missing', () => {
    const b = mk();
    const [srv, pc] = [b.add('server'), b.add('pc')];
    b.link(srv, 'Ethernet0', pc, 'Ethernet0');
    b.ip(srv, '10.10.10.1');
    b.ip(pc, '10.10.10.2');
    expect(ping(b.lab(), pc, '10.10.10.1').ok).toBe(true);
    expect(ping(b.lab(), srv, '10.10.10.2').ok).toBe(true);
  });

  it('diagram: a firewall between two PCs in one subnet does not forward', () => {
    const b = mk();
    const [p1, p2, fw] = [b.add('pc'), b.add('pc'), b.add('firewall')];
    b.link(p1, 'Ethernet0', fw, 'LAN');
    b.link(p2, 'Ethernet0', fw, 'WAN');
    b.ip(p1, '172.20.0.1');
    b.ip(p2, '172.20.0.2');
    expect(ping(b.lab(), p1, '172.20.0.2').ok).toBe(false);
  });

  it('diagram: an AP has a single port and no L3 interface, so it can only be a leaf (nothing can sit behind it); the same PC on a switch works', () => {
    const b = mk();
    const [pc, ap, sw, other] = [b.add('pc'), b.add('wireless-ap'), b.add('cisco-switch'), b.add('pc')];
    b.link(ap, 'Ethernet0', sw, 'FastEthernet0/1');
    b.link(other, 'Ethernet0', sw, 'FastEthernet0/2');
    b.ip(pc, '10.1.1.1');
    b.ip(other, '10.1.1.2');
    const viaAp = addLink(b.lab(), { deviceId: pc, port: 'Ethernet0' }, { deviceId: ap, port: 'Ethernet0' });
    expect(viaAp.error).not.toBeNull(); // the AP's single port is already used by its uplink → a PC cannot even sit behind it
    const viaSw = addLink(b.lab(), { deviceId: pc, port: 'Ethernet0' }, { deviceId: sw, port: 'FastEthernet0/3' });
    expect(ping(viaSw.lab, pc, '10.1.1.2').ok).toBe(true);
  });
});

describe('"simulation-capable only" filter', () => {
  const kinds = (q: string, c: Parameters<typeof filterPalette>[2], simOnly: boolean) => filterPalette(paletteEntries(), q, c, simOnly).map((e) => e.kind);

  it('keeps full + partial, drops diagram-only', () => {
    expect(kinds('', 'all', true)).toEqual(['cisco-router', 'isp-router', 'cisco-switch', 'aruba-switch', 'l3-switch', 'pc', 'laptop', 'server']);
    expect(kinds('', 'all', false)).toHaveLength(10);
    expect(isSimulationCapable('partial')).toBe(true);
    expect(isSimulationCapable('diagram')).toBe(false);
  });

  it('combines with search and categories', () => {
    expect(kinds('aruba', 'all', true)).toEqual(['aruba-switch', 'l3-switch']);
    expect(kinds('firewall', 'all', true)).toEqual([]);
    expect(kinds('', 'other', true)).toEqual([]);
    expect(kinds('', 'end', true)).toEqual(['pc', 'laptop', 'server']);
    expect(kinds('server', 'end', true)).toEqual(['server']);
  });

  it('does not change the catalog', () => {
    const before = JSON.stringify(PALETTE_GROUPS);
    kinds('', 'all', true);
    expect(JSON.stringify(PALETTE_GROUPS)).toBe(before);
  });
});

describe('Lab files are unchanged', () => {
  it('export/import round-trip of every device type: no capability metadata written, same ids', () => {
    let lab: Lab = emptyLab('rt');
    for (const k of ALL) lab = addDevice(lab, k, 10, 10).lab;
    const text = serializeExport(lab);
    expect(text).not.toMatch(/simLevel|simNote|"category"/);
    const r = parseImport(text);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.lab.schemaVersion).toBe(1);
      expect(r.lab.devices.map((d) => d.id)).toEqual(lab.devices.map((d) => d.id));
      expect(serializeExport(r.lab).replace(/"exportedAt": "[^"]+"/, '')).toBe(text.replace(/"exportedAt": "[^"]+"/, ''));
    }
  });
});
