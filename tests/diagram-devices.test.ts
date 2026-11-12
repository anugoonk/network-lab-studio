import { afterEach, describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { addDevice, addLink, emptyLab, updateDevice } from '../src/core/lab';
import { ping } from '../src/core/network';
import { parseImport, serializeExport, validateLab } from '../src/core/persist';
import { PROFILES } from '../src/core/profiles';
import { SAMPLES } from '../src/core/sample';
import type { DeviceKind, Lab } from '../src/core/types';
import { setLangForTest, tx } from '../src/i18n';
import { filterPalette, paletteEntries } from '../src/ui/paletteCatalog';

afterEach(() => setLangForTest('th'));

const NEW: DeviceKind[] = ['internet-cloud', 'patch-panel', 'rack', 'ups'];

function lab0() {
  let lab: Lab = emptyLab('diagram');
  const add = (k: DeviceKind) => {
    const r = addDevice(lab, k, 0, 0);
    lab = r.lab;
    return r.device;
  };
  const link = (a: string, pa: string, b: string, pb: string) => {
    const r = addLink(lab, { deviceId: a, port: pa }, { deviceId: b, port: pb });
    lab = r.lab;
    return r.error;
  };
  const ip = (id: string, addr: string, gw: string | null = null) => {
    lab = updateDevice(lab, id, (d) => ({ ...d, gateway: gw, ifaces: d.ifaces.map((i, n) => (n === 0 ? { ...i, ip: addr, mask: '255.255.255.0' } : i)) }));
  };
  return { add, link, ip, lab: () => lab, set: (l: Lab) => (lab = l) };
}

describe('the four diagram objects (DEV-01B-1b)', () => {
  it('are diagram-only, in the right category, with every engine flag off and no CLI', () => {
    const expected: Record<string, [string, number]> = {
      'internet-cloud': ['wan', 4],
      'patch-panel': ['infrastructure', 24],
      rack: ['infrastructure', 0],
      ups: ['infrastructure', 0],
    };
    for (const k of NEW) {
      const p = PROFILES[k];
      expect([p.simLevel, p.category, p.portNames.length], k).toEqual(['diagram', ...expected[k]]);
      expect([p.isSwitch, p.isRouter, p.isHost, p.canForward, p.hasCli, p.vendor], k).toEqual([false, false, false, false, false, 'generic']);
      expect(p.simNote, k).toBeTruthy();
    }
    expect(PROFILES['internet-cloud'].portNames).toEqual(['Port1', 'Port2', 'Port3', 'Port4']);
    expect(PROFILES['patch-panel'].portNames).toEqual(Array.from({ length: 24 }, (_, i) => `P${i + 1}`));
  });

  it('get their own names and the next ids; two of each never collide', () => {
    const b = lab0();
    const names = NEW.flatMap((k) => [b.add(k).name, b.add(k).name]);
    expect(names).toEqual(['CLOUD1', 'CLOUD2', 'PP1', 'PP2', 'RACK1', 'RACK2', 'UPS1', 'UPS2']);
    expect(b.lab().devices.map((d) => d.id)).toEqual(['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8']);
  });

  it('refuse CLI commands and leave the Lab unchanged (no fake CLI)', () => {
    for (const k of NEW) {
      const b = lab0();
      const d = b.add(k);
      for (const line of ['show version', 'enable', 'ipconfig', 'ping 8.8.8.8']) {
        const r = executeLine(b.lab(), d.id, line);
        expect(r.ok, `${k}: ${line}`).toBe(false);
        expect(r.lab).toBe(b.lab());
      }
    }
  });
});

describe('no forwarding through diagram objects', () => {
  it('two PCs cabled through a patch panel cannot ping; the same PCs on a 2960 can', () => {
    const b = lab0();
    const [p1, p2, pp] = [b.add('pc'), b.add('pc'), b.add('patch-panel')];
    expect(b.link(p1.id, 'Ethernet0', pp.id, 'P1')).toBeNull();
    expect(b.link(p2.id, 'Ethernet0', pp.id, 'P2')).toBeNull();
    b.ip(p1.id, '10.0.0.1');
    b.ip(p2.id, '10.0.0.2');
    expect(ping(b.lab(), p1.id, '10.0.0.2').ok).toBe(false);
    // control: the same addresses through a real switch
    const c = lab0();
    const [q1, q2, sw] = [c.add('pc'), c.add('pc'), c.add('cisco-switch')];
    c.link(q1.id, 'Ethernet0', sw.id, 'FastEthernet0/1');
    c.link(q2.id, 'Ethernet0', sw.id, 'FastEthernet0/2');
    c.ip(q1.id, '10.0.0.1');
    c.ip(q2.id, '10.0.0.2');
    expect(ping(c.lab(), q1.id, '10.0.0.2').ok).toBe(true);
  });

  it('the Internet cloud gives no Internet: a PC behind an ISP router cabled to the cloud cannot reach 8.8.8.8', () => {
    const b = lab0();
    const [pc, isp, cloud] = [b.add('pc'), b.add('isp-router'), b.add('internet-cloud')];
    expect(b.link(pc.id, 'Ethernet0', isp.id, 'GigabitEthernet0/0')).toBeNull();
    expect(b.link(isp.id, 'GigabitEthernet0/1', cloud.id, 'Port1')).toBeNull();
    b.ip(pc.id, '192.168.1.10', '192.168.1.1');
    let lab = b.lab();
    for (const l of ['enable', 'configure terminal', 'interface GigabitEthernet0/0', 'ip address 192.168.1.1 255.255.255.0', 'no shutdown', 'exit',
      'interface GigabitEthernet0/1', 'ip address 203.0.113.1 255.255.255.0', 'no shutdown', 'exit', 'ip route 0.0.0.0 0.0.0.0 203.0.113.254', 'end']) {
      const r = executeLine(lab, isp.id, l);
      expect(r.ok, l).toBe(true);
      lab = r.lab;
    }
    expect(ping(lab, pc.id, '192.168.1.1').ok).toBe(true); // the PC–router part is real
    expect(ping(lab, pc.id, '8.8.8.8').ok).toBe(false); // nothing real behind the cloud
    expect(ping(lab, pc.id, '203.0.113.254').ok).toBe(false);
  });

  it('rack and UPS have no network ports: a cable to them is refused', () => {
    for (const k of ['rack', 'ups'] as DeviceKind[]) {
      const b = lab0();
      const [pc, obj] = [b.add('pc'), b.add(k)];
      expect(obj.ifaces).toEqual([]);
      expect(b.link(pc.id, 'Ethernet0', obj.id, 'Ethernet0'), k).not.toBeNull();
      expect(b.lab().links).toHaveLength(0);
    }
  });
});

describe('Lab files', () => {
  it('a Lab with all four objects (and cables to the cloud / patch panel) round-trips, schemaVersion 1', () => {
    const b = lab0();
    const [isp, cloud, pp, pc] = [b.add('isp-router'), b.add('internet-cloud'), b.add('patch-panel'), b.add('pc')];
    b.add('rack');
    b.add('ups');
    b.link(isp.id, 'GigabitEthernet0/1', cloud.id, 'Port1');
    b.link(pc.id, 'Ethernet0', pp.id, 'P24');
    const text = serializeExport(b.lab());
    const r = parseImport(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lab.schemaVersion).toBe(1);
    expect(r.lab.devices.map((d) => `${d.id}:${d.kind}:${d.ifaces.length}`)).toEqual(['d1:isp-router:2', 'd2:internet-cloud:4', 'd3:patch-panel:24', 'd4:pc:1', 'd5:rack:0', 'd6:ups:0']);
    expect(r.lab.links.map((l) => l.id)).toEqual(['l1', 'l2']);
  });

  it('every sample Lab still validates, and an existing model with an empty port list is still rejected', () => {
    for (const [k, s] of Object.entries(SAMPLES)) expect(validateLab(s.build()).ok, k).toBe(true);
    const b = lab0();
    const pc = b.add('pc');
    const broken = updateDevice(b.lab(), pc.id, (d) => ({ ...d, ifaces: [] }));
    expect(validateLab(broken).ok).toBe(false);
    const sw = b.add('cisco-switch');
    expect(validateLab(updateDevice(b.lab(), sw.id, (d) => ({ ...d, ifaces: [] }))).ok).toBe(false);
  });
});

describe('palette', () => {
  const kinds = (q: string, c: Parameters<typeof filterPalette>[2] = 'all', simOnly = false) => filterPalette(paletteEntries(), q, c, simOnly).map((e) => e.kind);

  it('search, categories and the simulation filter', () => {
    expect(kinds('cloud')).toEqual(['internet-cloud']);
    expect(kinds('internet')).toEqual(['internet-cloud']);
    expect(kinds('patch')).toEqual(['patch-panel']);
    expect(kinds('rack')).toEqual(['rack']);
    expect(kinds('ups')).toEqual(['ups']);
    expect(kinds('ตู้')).toEqual(['rack']);
    expect(kinds('', 'wan')).toEqual(['internet-cloud']);
    expect(kinds('', 'infrastructure')).toEqual(['patch-panel', 'rack', 'ups']);
    expect(kinds('', 'all', true).some((k) => NEW.includes(k))).toBe(false);
    expect(kinds('', 'infrastructure', true)).toEqual([]);
  });

  it('labels in Thai and English', () => {
    expect(NEW.map((k) => PROFILES[k].label)).toEqual(['อินเทอร์เน็ต (Cloud)', 'แผงพักสาย (Patch Panel)', 'ตู้ Rack', 'เครื่องสำรองไฟ (UPS)']);
    setLangForTest('en');
    expect(['อินเทอร์เน็ต (Cloud)', 'แผงพักสาย (Patch Panel)', 'ตู้ Rack', 'เครื่องสำรองไฟ (UPS)'].map((t) => tx(t))).toEqual(['Internet Cloud', 'Patch Panel', 'Rack', 'UPS']);
  });
});
