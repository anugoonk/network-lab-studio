import { afterEach, describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { addDevice, addLink, emptyLab, updateDevice } from '../src/core/lab';
import { ping, trace } from '../src/core/network';
import { parseImport, serializeExport, validateLab } from '../src/core/persist';
import { PROFILES } from '../src/core/profiles';
import { SAMPLES } from '../src/core/sample';
import type { DeviceKind, Lab } from '../src/core/types';
import { setLangForTest, tx } from '../src/i18n';
import { filterPalette, paletteEntries } from '../src/ui/paletteCatalog';

afterEach(() => setLangForTest('th'));

const NEW: DeviceKind[] = ['printer', 'ip-camera', 'ip-phone', 'nvr', 'nas'];

function builder() {
  let lab: Lab = emptyLab('endpoints');
  const add = (k: DeviceKind) => {
    const r = addDevice(lab, k, 0, 0);
    lab = r.lab;
    return r.device;
  };
  const link = (a: string, pa: string, b: string, pb: string) => {
    const r = addLink(lab, { deviceId: a, port: pa }, { deviceId: b, port: pb });
    expect(r.error).toBeNull();
    lab = r.lab;
  };
  const ip = (id: string, addr: string, gw: string | null = null) => {
    lab = updateDevice(lab, id, (d) => ({ ...d, gateway: gw, ifaces: d.ifaces.map((i) => ({ ...i, ip: addr, mask: '255.255.255.0' })) }));
  };
  const cli = (id: string, lines: string[]) => {
    for (const l of lines) {
      const r = executeLine(lab, id, l);
      expect(r.ok, `${l}: ${r.output.join('|')}`).toBe(true);
      lab = r.lab;
    }
  };
  return { add, link, ip, cli, lab: () => lab };
}

describe('IP end devices (DEV-01C-1): profiles', () => {
  it('are IP hosts on the existing host profile: Ethernet0, PC terminal, partial simulation, category end', () => {
    for (const k of NEW) {
      const p = PROFILES[k];
      expect([p.isHost, p.isSwitch, p.isRouter, p.canForward, p.hasCli, p.vendor], k).toEqual([true, false, false, false, true, 'pc']);
      expect([p.simLevel, p.category, p.portNames.join(',')], k).toEqual(['partial', 'end', 'Ethernet0']);
      expect(p.simNote, k).toMatch(/ไม่จำลอง/);
    }
  });

  it('get their own names and sequential ids; two of each never collide', () => {
    const b = builder();
    const names = NEW.flatMap((k) => [b.add(k).name, b.add(k).name]);
    expect(names).toEqual(['PRN-01', 'PRN-02', 'CAM-01', 'CAM-02', 'PHN-01', 'PHN-02', 'NVR-01', 'NVR-02', 'NAS-01', 'NAS-02']);
    expect(b.lab().devices.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => `d${i + 1}`));
  });

  it('descriptions say what is not simulated (TH / EN)', () => {
    const words: Record<string, [RegExp, RegExp]> = {
      printer: [/การพิมพ์/, /printing/],
      'ip-camera': [/วิดีโอ.*PoE/, /video streaming.*PoE/],
      'ip-phone': [/SIP.*voice VLAN.*PoE/, /SIP.*voice VLAN.*PoE/],
      nvr: [/การบันทึก/, /recording/],
      nas: [/SMB \/ NFS/, /SMB \/ NFS/],
    };
    for (const k of NEW) expect(PROFILES[k].simNote, k).toMatch(words[k][0]);
    setLangForTest('en');
    for (const k of NEW) expect(tx(PROFILES[k].simNote!), k).toMatch(words[k][1]);
    expect(NEW.map((k) => tx(PROFILES[k].label))).toEqual(['Network Printer', 'IP Camera', 'IP Phone', 'NVR', 'NAS']);
  });
});

describe('host simulation: ping / tracert through a switch and a router', () => {
  it('each new device pings a PC through a Catalyst 2960 (both directions) and its terminal works', () => {
    for (const k of NEW) {
      const b = builder();
      const [dev, pc, sw] = [b.add(k), b.add('pc'), b.add('cisco-switch')];
      b.link(dev.id, 'Ethernet0', sw.id, 'FastEthernet0/1');
      b.link(pc.id, 'Ethernet0', sw.id, 'FastEthernet0/2');
      b.ip(dev.id, '192.168.20.10');
      b.ip(pc.id, '192.168.20.20');
      expect(ping(b.lab(), dev.id, '192.168.20.20').ok, k).toBe(true);
      expect(ping(b.lab(), pc.id, '192.168.20.10').ok, k).toBe(true);
      const ipc = executeLine(b.lab(), dev.id, 'ipconfig');
      expect(ipc.ok, k).toBe(true);
      expect(ipc.output.join('\n'), k).toContain('192.168.20.10');
      const out = executeLine(b.lab(), dev.id, 'ping 192.168.20.20').output.join('\n');
      expect(out, k).toContain('Reply from 192.168.20.20');
    }
  });

  it('each new device reaches another subnet through a router (gateway) and tracert shows the router hop', () => {
    for (const k of NEW) {
      const b = builder();
      const [dev, r, pc] = [b.add(k), b.add('cisco-router'), b.add('pc')];
      b.link(dev.id, 'Ethernet0', r.id, 'GigabitEthernet0/0');
      b.link(pc.id, 'Ethernet0', r.id, 'GigabitEthernet0/1');
      b.ip(dev.id, '10.1.1.10', '10.1.1.1');
      b.ip(pc.id, '10.2.2.10', '10.2.2.1');
      b.cli(r.id, ['enable', 'configure terminal', 'interface GigabitEthernet0/0', 'ip address 10.1.1.1 255.255.255.0', 'no shutdown', 'exit',
        'interface GigabitEthernet0/1', 'ip address 10.2.2.1 255.255.255.0', 'no shutdown', 'end']);
      expect(ping(b.lab(), dev.id, '10.2.2.10').ok, k).toBe(true);
      expect(ping(b.lab(), pc.id, '10.1.1.10').ok, k).toBe(true);
      const t = trace(b.lab(), dev.id, '10.2.2.10');
      expect(t.hops.map((h) => h.ip), k).toEqual(['10.1.1.1', '10.2.2.10']);
      // and without a gateway it cannot leave its subnet (same rule as a PC)
      b.ip(dev.id, '10.1.1.10', null);
      expect(ping(b.lab(), dev.id, '10.2.2.10').ok, k).toBe(false);
    }
  });

  it('VLAN rules apply as for a PC: a device in another access VLAN is not reachable', () => {
    const b = builder();
    const [cam, pc, sw] = [b.add('ip-camera'), b.add('pc'), b.add('cisco-switch')];
    b.link(cam.id, 'Ethernet0', sw.id, 'FastEthernet0/1');
    b.link(pc.id, 'Ethernet0', sw.id, 'FastEthernet0/2');
    b.ip(cam.id, '172.16.0.10');
    b.ip(pc.id, '172.16.0.20');
    b.cli(sw.id, ['enable', 'configure terminal', 'vlan 30', 'exit', 'interface FastEthernet0/1', 'switchport mode access', 'switchport access vlan 30', 'end']);
    expect(ping(b.lab(), pc.id, '172.16.0.10').ok).toBe(false);
  });
});

describe('Lab files and palette', () => {
  it('round-trip with all five (configured), schemaVersion 1; sample Labs still validate', () => {
    const b = builder();
    for (const k of NEW) b.add(k);
    const first = b.lab().devices[0];
    b.ip(first.id, '192.168.1.50', '192.168.1.1');
    const text = serializeExport(b.lab());
    const r = parseImport(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lab.schemaVersion).toBe(1);
    expect(r.lab.devices.map((d) => `${d.id}:${d.kind}:${d.name}`)).toEqual(['d1:printer:PRN-01', 'd2:ip-camera:CAM-01', 'd3:ip-phone:PHN-01', 'd4:nvr:NVR-01', 'd5:nas:NAS-01']);
    expect(r.lab.devices[0].ifaces[0].ip).toBe('192.168.1.50');
    expect(r.lab.devices[0].gateway).toBe('192.168.1.1');
    for (const [k, s] of Object.entries(SAMPLES)) expect(validateLab(s.build()).ok, k).toBe(true);
  });

  it('search, the end-device category and the simulation filter (partial devices stay in)', () => {
    const kinds = (q: string, c: Parameters<typeof filterPalette>[2] = 'all', simOnly = false) => filterPalette(paletteEntries(), q, c, simOnly).map((e) => e.kind);
    expect(kinds('printer')).toEqual(['printer']);
    expect(kinds('camera')).toEqual(['ip-camera']);
    expect(kinds('phone')).toEqual(['ip-phone']);
    expect(kinds('nvr')).toEqual(['nvr']);
    expect(kinds('nas')).toEqual(['nas']);
    expect(kinds('กล้อง')).toEqual(['ip-camera']);
    for (const k of NEW) {
      expect(kinds('', 'end'), k).toContain(k);
      expect(kinds('', 'all', true), k).toContain(k);
    }
  });
});
