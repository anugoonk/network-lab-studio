import { useEffect, useState } from 'react';
import { maskToPrefix, networkOf } from '../core/ip';
import { formatVlanList, getDevice, linkAt, peerOf, subName } from '../core/lab';
import { PORT_LINE_TH, l3Interfaces, linkStatus, portLine } from '../core/network';
import { PROFILES, shortPort } from '../core/profiles';
import type { Device } from '../core/types';
import { useStore } from '../store';
import { DeviceIcon } from './DeviceIcon';

function PcConfig({ device }: { device: Device }) {
  const setPcConfig = useStore((s) => s.setPcConfig);
  const nic = device.ifaces[0];
  const [ip, setIp] = useState(nic.ip ?? '');
  const [mask, setMask] = useState(nic.mask ?? '');
  const [gw, setGw] = useState(device.gateway ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // fields follow the stored config (e.g. after a CLI/import change); the status message only resets per device
  useEffect(() => {
    setIp(nic.ip ?? '');
    setMask(nic.mask ?? '');
    setGw(device.gateway ?? '');
  }, [device.id, nic.ip, nic.mask, device.gateway]);
  useEffect(() => {
    setErr(null);
    setSaved(false);
  }, [device.id]);
  const apply = () => {
    const e = setPcConfig(device.id, ip, mask, gw);
    setErr(e);
    setSaved(!e);
  };
  return (
    <section className="card" data-testid="pc-config">
      <h4>IP Configuration (IPv4)</h4>
      <label>IPv4 Address</label>
      <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.101" data-testid="pc-ip" />
      <label>Subnet Mask</label>
      <input value={mask} onChange={(e) => setMask(e.target.value)} placeholder="255.255.255.0" data-testid="pc-mask" />
      <label>Default Gateway</label>
      <input value={gw} onChange={(e) => setGw(e.target.value)} placeholder="192.168.1.1" data-testid="pc-gw" />
      {err && <div className="error-box" role="alert">{err}</div>}
      {saved && <div className="ok-box">บันทึกค่า IP แล้ว</div>}
      <button className="primary" onClick={apply} data-testid="pc-apply">
        ใช้ค่านี้
      </button>
    </section>
  );
}

function L3Section({ device }: { device: Device }) {
  const lab = useStore((st) => st.lab);
  const l3 = l3Interfaces(lab, device);
  const up = l3.filter((i) => i.up);
  return (
    <section className="card" data-testid="l3-section">
      <h4>Layer 3</h4>
      {(device.subifs.length > 0 || device.svis.length > 0) && (
        <table className="ports">
          <thead>
            <tr>
              <th>Interface</th>
              <th>VLAN</th>
              <th>IP</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {device.subifs.map((x) => {
              const ifc = l3.find((i) => i.name === subName(x));
              return (
                <tr key={subName(x)}>
                  <td>{subName(x).replace('GigabitEthernet', 'Gi')}</td>
                  <td>{x.vlan ?? 'ยังไม่ตั้ง dot1Q'}</td>
                  <td>{x.ip ? `${x.ip}/${maskToPrefix(x.mask!)}` : '–'}</td>
                  <td><span className={`pill ${ifc?.up ? 'up' : 'down'}`}>{ifc?.up ? 'up' : 'down'}</span></td>
                </tr>
              );
            })}
            {device.svis.map((x) => {
              const ifc = l3.find((i) => i.kind === 'svi' && i.vlan === x.vlan);
              return (
                <tr key={`svi${x.vlan}`}>
                  <td>Vlan{x.vlan} (SVI)</td>
                  <td>{x.vlan}</td>
                  <td>{x.ip ? `${x.ip}/${maskToPrefix(x.mask!)}` : '–'}</td>
                  <td><span className={`pill ${ifc?.up ? 'up' : 'down'}`}>{ifc?.up ? 'up' : x.adminUp ? 'down' : 'shutdown'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {device.routes.length > 0 && (
        <>
          <h4 style={{ marginTop: 8 }}>Static route</h4>
          <table className="ports">
            <tbody>
              {device.routes.map((r) => {
                const ok = up.some((i) => networkOf(i.ip, i.mask) === networkOf(r.nextHop, i.mask));
                return (
                  <tr key={`${r.net}/${r.mask}/${r.nextHop}`}>
                    <td>{r.net === '0.0.0.0' && r.mask === '0.0.0.0' ? 'default (0.0.0.0/0)' : `${r.net}/${maskToPrefix(r.mask)}`}</td>
                    <td>via {r.nextHop}</td>
                    <td><span className={`pill ${ok ? 'up' : 'down'}`}>{ok ? 'ใช้งานได้' : 'next hop ถึงไม่ได้'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
      {device.kind === 'cisco-switch' && (
        <p className="muted small">
          L2 switch: SVI ใช้เป็น management IP เท่านั้น ไม่ route ระหว่าง VLAN{device.gateway ? ` · default-gateway ${device.gateway}` : ''}
        </p>
      )}
    </section>
  );
}

function DeviceDetails({ id }: { id: string }) {
  const lab = useStore((s) => s.lab);
  const rename = useStore((s) => s.renameDevice);
  const del = useStore((s) => s.deleteSelection);
  const openConsole = useStore((s) => s.openConsole);
  const device = getDevice(lab, id);
  const [name, setName] = useState(device?.name ?? '');
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setName(device?.name ?? '');
    setErr(null);
  }, [device?.id, device?.name]);
  if (!device) return null;
  const p = PROFILES[device.kind];
  const commit = () => {
    if (name.trim() === device.name) return;
    const e = rename(id, name);
    setErr(e);
    if (e) setName(device.name);
  };
  return (
    <>
      <section className="card">
        <div className="dev-head">
          <DeviceIcon kind={device.kind} size={48} />
          <div>
            <div className="dev-title">{p.label}</div>
            <div className="muted small">รุ่นจำลอง: {p.model}</div>
            <div className="muted small">CLI อ้างอิง: {p.osRef}</div>
          </div>
        </div>
        <label htmlFor="dev-name">ชื่ออุปกรณ์ (hostname)</label>
        <input
          id="dev-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), undefined)}
          data-testid="device-name"
        />
        {err && <div className="error-box" role="alert">{err}</div>}
        <div className="row">
          <button className="primary" onClick={() => openConsole(id)} data-testid="open-console">
            เปิด {p.isHost ? 'Terminal' : 'Console'}
          </button>
          <button className="danger" onClick={del} data-testid="delete-device">
            ลบอุปกรณ์
          </button>
        </div>
      </section>

      {p.isHost && <PcConfig device={device} />}

      {p.isSwitch && (
        <section className="card">
          <h4>VLAN บนอุปกรณ์นี้</h4>
          <div className="chips">
            {device.vlans.map((v) => (
              <span className="chip" key={v.id}>
                VLAN {v.id} · {v.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {(device.subifs.length > 0 || device.svis.length > 0 || device.routes.length > 0) && (
        <L3Section device={device} />
      )}

      <section className="card">
        <h4>พอร์ต ({device.ifaces.length})</h4>
        <div className="table-scroll">
          <table className="ports" data-testid="port-table">
            <thead>
              <tr>
                <th>พอร์ต</th>
                <th>สถานะ</th>
                <th>ต่อกับ</th>
                {!p.isSwitch && <th>IP</th>}
                {p.isSwitch && <th>VLAN</th>}
              </tr>
            </thead>
            <tbody>
              {device.ifaces.map((i) => {
                const line = portLine(lab, device, i);
                const l = linkAt(lab, device.id, i.name);
                const peer = l ? peerOf(l, device.id, i.name) : null;
                const pd = peer ? getDevice(lab, peer.deviceId) : null;
                return (
                  <tr key={i.name} data-testid={`port-row-${i.name}`}>
                    <td title={i.name}>{shortPort(i.name)}</td>
                    <td>
                      <span className={`pill ${line}`}>{PORT_LINE_TH[line]}</span>
                    </td>
                    <td>{pd ? `${pd.name}:${shortPort(peer!.port)}` : '–'}</td>
                    {!p.isSwitch && <td>{i.ip ? `${i.ip}/${i.mask}` : '–'}</td>}
                    {p.isSwitch && (
                      <td title={i.trunk ? `allowed: ${formatVlanList(i.trunkAllowed)}` : undefined}>
                        {device.kind === 'aruba-switch' && i.routed
                          ? i.ip
                            ? `routed ${i.ip}/${maskToPrefix(i.mask!)}`
                            : 'routed'
                          : i.trunk
                            ? `trunk (native ${i.nativeVlan}; allowed ${formatVlanList(i.trunkAllowed)})`
                            : `VLAN ${i.accessVlan}`}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {p.isHost && device.gateway && <p className="muted small">Default gateway: {device.gateway}</p>}
      </section>
    </>
  );
}

function LinkDetails({ id }: { id: string }) {
  const lab = useStore((s) => s.lab);
  const remove = useStore((s) => s.removeLinkById);
  const link = lab.links.find((l) => l.id === id);
  if (!link) return null;
  const st = linkStatus(lab, link);
  const da = getDevice(lab, link.a.deviceId)!;
  const db = getDevice(lab, link.b.deviceId)!;
  return (
    <section className="card" data-testid="link-details">
      <h4>สาย Ethernet</h4>
      <p>
        <b>{da.name}</b> {link.a.port}
        <br />↔ <b>{db.name}</b> {link.b.port}
      </p>
      <table className="ports">
        <tbody>
          <tr>
            <td>มีสายเชื่อม</td>
            <td><span className="pill up">ใช่</span></td>
          </tr>
          <tr>
            <td>ลิงก์ใช้งานได้</td>
            <td><span className={`pill ${st.up ? 'up' : 'down'}`}>{st.up ? 'ใช่ (up)' : 'ไม่ (down)'}</span></td>
          </tr>
        </tbody>
      </table>
      <p className="small">{st.reasonTh}</p>
      <button className="danger" onClick={() => remove(id)} data-testid="delete-link">
        ลบสายนี้
      </button>
    </section>
  );
}

export function DetailsPanel() {
  const sel = useStore((s) => s.selection);
  const lab = useStore((s) => s.lab);
  const openConnect = useStore((s) => s.openConnect);
  if (sel?.type === 'device') return <DeviceDetails id={sel.id} />;
  if (sel?.type === 'link') return <LinkDetails id={sel.id} />;
  return (
    <section className="card">
      <h4>{lab.name}</h4>
      <p className="small">
        อุปกรณ์ {lab.devices.length} · สาย {lab.links.length}
      </p>
      <p className="muted small">คลิกอุปกรณ์หรือสายเพื่อดูรายละเอียด ดับเบิลคลิกอุปกรณ์เพื่อเปิด Console</p>
      <button onClick={() => openConnect()} data-testid="open-connect">
        เชื่อมสายด้วยแบบฟอร์ม…
      </button>
    </section>
  );
}
