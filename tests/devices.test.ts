import { describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { addDevice, addLink, contentSignature, emptyLab, removeLink, updateDevice } from '../src/core/lab';
import { ping } from '../src/core/network';
import { parseImport, serializeExport } from '../src/core/persist';
import { PALETTE_GROUPS, PROFILES } from '../src/core/profiles';
import type { DeviceKind, Lab } from '../src/core/types';
import { dev, sample } from './helpers';

const PALETTE_KINDS = PALETTE_GROUPS.flatMap((g) => g.items.map((i) => i.kind));

describe('Device Palette', () => {
  it('lists exactly the 14 required devices (10 + 4 diagram objects of DEV-01B-1b), once each, in 5 groups', () => {
    expect(PALETTE_KINDS).toHaveLength(14);
    expect(new Set(PALETTE_KINDS).size).toBe(14);
    expect(PALETTE_GROUPS.map((g) => g.title)).toEqual(['Routers & Switches', 'End Devices', 'Servers & Wireless', 'Security & WAN', 'Infrastructure']);
    expect([...PALETTE_KINDS].sort()).toEqual(Object.keys(PROFILES).sort());
  });

  it('has the required ports', () => {
    expect(PROFILES['cisco-router'].portNames.length).toBeGreaterThanOrEqual(2);
    expect(PROFILES['cisco-switch'].portNames.filter((n) => n.startsWith('FastEthernet'))).toHaveLength(24);
    expect(PROFILES['aruba-switch'].portNames).toEqual(Array.from({ length: 24 }, (_, i) => `1/1/${i + 1}`));
    for (const k of ['pc', 'laptop', 'server', 'wireless-ap'] as DeviceKind[]) expect(PROFILES[k].portNames).toHaveLength(1);
    expect(PROFILES.firewall.portNames).toEqual(['LAN', 'WAN', 'DMZ']);
    expect(PROFILES['isp-router'].portNames.length).toBeGreaterThanOrEqual(2);
  });

  it('names the first Layer 3 switch DSW1', () => {
    expect(addDevice(emptyLab(), 'l3-switch', 0, 0).device.name).toBe('DSW1');
  });
});

describe('adding devices', () => {
  it('two devices of every kind get distinct ids and names', () => {
    let lab = emptyLab();
    for (const kind of PALETTE_KINDS) {
      lab = addDevice(lab, kind, 0, 0).lab;
      lab = addDevice(lab, kind, 10, 10).lab;
    }
    expect(lab.devices).toHaveLength(PALETTE_KINDS.length * 2);
    expect(new Set(lab.devices.map((d) => d.id)).size).toBe(PALETTE_KINDS.length * 2);
    expect(new Set(lab.devices.map((d) => d.name.toLowerCase())).size).toBe(PALETTE_KINDS.length * 2);
  });
});

describe('cabling the 24th port', () => {
  for (const [kind, port24] of [
    ['cisco-switch', 'FastEthernet0/24'],
    ['aruba-switch', '1/1/24'],
  ] as const) {
    it(`${kind}: port 24 can be cabled, is then busy, and is reusable after the cable is removed`, () => {
      let lab = emptyLab();
      const sw = addDevice(lab, kind, 0, 0);
      const a = addDevice(sw.lab, 'pc', 0, 0);
      const b = addDevice(a.lab, 'laptop', 0, 0);
      lab = b.lab;
      let r = addLink(lab, { deviceId: sw.device.id, port: port24 }, { deviceId: a.device.id, port: 'Ethernet0' });
      expect(r.error).toBeNull();
      lab = r.lab;
      expect(addLink(lab, { deviceId: sw.device.id, port: port24 }, { deviceId: b.device.id, port: 'Ethernet0' }).error).toMatch(/มีสายเชื่อมอยู่แล้ว/);
      lab = removeLink(lab, lab.links[0].id);
      r = addLink(lab, { deviceId: sw.device.id, port: port24 }, { deviceId: b.device.id, port: 'Ethernet0' });
      expect(r.error).toBeNull();
    });
  }
});

describe('new devices behave honestly', () => {
  const build = () => {
    let lab = emptyLab();
    const add = (k: DeviceKind) => {
      const r = addDevice(lab, k, 0, 0);
      lab = r.lab;
      return r.device;
    };
    const srv = add('server');
    const isp = add('isp-router');
    const fw = add('firewall');
    const lap = add('laptop');
    const ap = add('wireless-ap');
    const dsw = add('l3-switch');
    const link = (a: string, pa: string, b: string, pb: string) => {
      const r = addLink(lab, { deviceId: a, port: pa }, { deviceId: b, port: pb });
      expect(r.error).toBeNull();
      lab = r.lab;
    };
    link(srv.id, 'Ethernet0', isp.id, 'GigabitEthernet0/0');
    link(fw.id, 'LAN', dsw.id, '1/1/1');
    link(ap.id, 'Ethernet0', dsw.id, '1/1/2');
    link(lap.id, 'Ethernet0', fw.id, 'DMZ');
    return { lab, srv, isp, fw, lap, ap, dsw };
  };

  it('server pings an ISP router over a real configured link (and not before)', () => {
    const { lab: l0, srv, isp } = build();
    expect(ping(l0, srv.id, '10.0.0.1').ok).toBe(false);
    let lab = updateDevice(l0, srv.id, (d) => ({ ...d, ifaces: d.ifaces.map((i) => ({ ...i, ip: '10.0.0.2', mask: '255.255.255.0' })) }));
    const cmds = ['enable', 'configure terminal', 'interface GigabitEthernet0/0', 'ip address 10.0.0.1 255.255.255.0', 'no shutdown', 'end'];
    for (const c of cmds) {
      const r = executeLine(lab, isp.id, c);
      expect(r.ok, `${c} -> ${r.output.join('|')}`).toBe(true);
      lab = r.lab;
    }
    expect(ping(lab, srv.id, '10.0.0.1').ok).toBe(true);
    expect(executeLine(lab, srv.id, 'ipconfig').output.join('\n')).toContain('10.0.0.2');
  });

  it('firewall and AP have no console and refuse commands without changing the lab', () => {
    const { lab, fw, ap } = build();
    for (const d of [fw, ap]) {
      const r = executeLine(lab, d.id, 'show version');
      expect(r.ok).toBe(false);
      expect(r.lab).toBe(lab);
    }
  });

  it('a laptop behind a firewall cannot ping through it (no firewall/routing engine)', () => {
    const { lab, lap } = build();
    expect(ping(lab, lap.id, '10.9.9.9').ok).toBe(false);
  });

  it('L3 switch uses the AOS-CX CLI', () => {
    const { lab, dsw } = build();
    const r = executeLine(lab, dsw.id, 'configure terminal');
    expect(r.ok).toBe(true);
    expect(dev(r.lab, 'DSW1').cli.mode).toBe('config');
  });
});

describe('save / load', () => {
  it('round-trips a lab with every device type, ports and cable ends', () => {
    let lab: Lab = emptyLab();
    for (const k of PALETTE_KINDS) lab = addDevice(lab, k, 5, 5).lab;
    const sw = lab.devices.find((d) => d.kind === 'aruba-switch')!;
    const fw = lab.devices.find((d) => d.kind === 'firewall')!;
    lab = addLink(lab, { deviceId: sw.id, port: '1/1/24' }, { deviceId: fw.id, port: 'DMZ' }).lab;
    const r = parseImport(serializeExport(lab));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(contentSignature(r.lab)).toBe(contentSignature(lab));
    expect(r.lab.devices.map((d) => d.kind).sort()).toEqual([...PALETTE_KINDS].sort());
    expect(r.lab.links[0].a.port).toBe('1/1/24');
  });

  it('opens an old-format lab: an Aruba switch saved with 28 ports keeps them', () => {
    const old = JSON.parse(serializeExport(sample()));
    const sw2 = old.lab.devices.find((d: { name: string }) => d.name === 'SW2');
    for (const n of [25, 26, 27, 28]) sw2.ifaces.push({ ...sw2.ifaces[0], name: `1/1/${n}` });
    const r = parseImport(JSON.stringify(old));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.lab.devices.find((d) => d.name === 'SW2')!.ifaces).toHaveLength(28);
  });

  it('still rejects an unknown port on a switch', () => {
    const j = JSON.parse(serializeExport(sample()));
    j.lab.devices.find((d: { name: string }) => d.name === 'SW2').ifaces.push({ ...j.lab.devices[0].ifaces[0], name: '1/1/99' });
    expect(parseImport(JSON.stringify(j)).ok).toBe(false);
  });
});
