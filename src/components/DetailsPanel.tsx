import { useEffect, useState } from 'react';
import { maskToPrefix, networkOf } from '../core/ip';
import { formatVlanList, getDevice, linkAt, peerOf, subName } from '../core/lab';
import { PORT_LINE_TH, l3Interfaces, linkStatus, portLine } from '../core/network';
import { PROFILES, isAruba, shortPort } from '../core/profiles';
import type { Device } from '../core/types';
import { useStore } from '../store';
import { DeviceIcon } from './DeviceIcon';
import { tx } from '../i18n';

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
      {saved && <div className="ok-box">{tx('บันทึกค่า IP แล้ว')}</div>}
      <button className="primary" onClick={apply} data-testid="pc-apply">{tx('ใช้ค่านี้')}</button>
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
              <th>{tx('สถานะ')}</th>
            </tr>
          </thead>
          <tbody>
            {device.subifs.map((x) => {
              const ifc = l3.find((i) => i.name === subName(x));
              return (
                <tr key={subName(x)}>
                  <td>{subName(x).replace('GigabitEthernet', 'Gi')}</td>
                  <td>{x.vlan ?? tx('ยังไม่ตั้ง dot1Q')}</td>
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
                    <td><span className={`pill ${ok ? 'up' : 'down'}`}>{ok ? tx('ใช้งานได้') : tx('next hop ถึงไม่ได้')}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
      {device.kind === 'cisco-switch' && (
        <p className="muted small">{tx('L2 switch: SVI ใช้เป็น management IP เท่านั้น ไม่ route ระหว่าง VLAN{0}', device.gateway ? ` · default-gateway ${device.gateway}` : '')}</p>
      )}
    </section>
  );
}

function DeviceDetails({ id }: { id: string }) {
  const lab = useStore((s) => s.lab);
  const rename = useStore((s) => s.renameDevice);
  const del = useStore((s) => s.deleteSelection);
  const openConsole = useStore((s) => s.openConsole);
  const copyConfig = useStore((s) => s.copyConfig);
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
            <div className="muted small">{tx('รุ่นจำลอง: {0}', p.model)}</div>
            <div className="muted small">{tx('CLI อ้างอิง: {0}', p.osRef)}</div>
          </div>
        </div>
        <label htmlFor="dev-name">{tx('ชื่ออุปกรณ์ (hostname)')}</label>
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
          {p.hasCli && !p.isHost && (
            <button onClick={() => void copyConfig(id)} title={tx('คัดลอก running-config ไปที่ clipboard')} data-testid="copy-config">{tx('คัดลอก config')}</button>
          )}
          {p.hasCli && (
            <button className="primary" onClick={() => openConsole(id)} data-testid="open-console">{tx('เปิด {0}', p.isHost ? 'Terminal' : 'Console')}</button>
          )}
          <button className="danger" onClick={del} data-testid="delete-device">{tx('ลบอุปกรณ์')}</button>
        </div>
      </section>

      {!p.hasCli && (
        <p className="muted small" data-testid="no-cli-note">{tx('อุปกรณ์ชนิดนี้ใช้วาดและต่อสายเท่านั้น — ยังไม่มี CLI, ping, routing หรือ policy ในโปรแกรมนี้')}</p>
      )}

      {p.isHost && <PcConfig device={device} />}

      {p.isSwitch && (
        <section className="card">
          <h4>{tx('VLAN บนอุปกรณ์นี้')}</h4>
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
        <h4>{tx('พอร์ต ({0})', device.ifaces.length)}</h4>
        <div className="table-scroll">
          <table className="ports" data-testid="port-table">
            <thead>
              <tr>
                <th>{tx('พอร์ต')}</th>
                <th>{tx('สถานะ')}</th>
                <th>{tx('ต่อกับ')}</th>
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
                        {isAruba(device.kind) && i.routed
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
      <h4>{tx('สาย Ethernet')}</h4>
      <p>
        <b>{da.name}</b> {link.a.port}
        <br />↔ <b>{db.name}</b> {link.b.port}
      </p>
      <table className="ports">
        <tbody>
          <tr>
            <td>{tx('มีสายเชื่อม')}</td>
            <td><span className="pill up">{tx('ใช่')}</span></td>
          </tr>
          <tr>
            <td>{tx('ลิงก์ใช้งานได้')}</td>
            <td><span className={`pill ${st.up ? 'up' : 'down'}`}>{st.up ? tx('ใช่ (up)') : tx('ไม่ (down)')}</span></td>
          </tr>
        </tbody>
      </table>
      <p className="small">{st.reasonTh}</p>
      <button className="danger" onClick={() => remove(id)} data-testid="delete-link">{tx('ลบสายนี้')}</button>
    </section>
  );
}

function LabDetails() {
  const lab = useStore((s) => s.lab);
  const renameLab = useStore((s) => s.renameLab);
  const openConnect = useStore((s) => s.openConnect);
  const [name, setName] = useState(lab.name);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setName(lab.name);
    setErr(null);
  }, [lab.name]);
  const commit = () => {
    if (name.trim() === lab.name) return;
    const e = renameLab(name);
    setErr(e);
    if (e) setName(lab.name);
  };
  return (
    <section className="card" data-testid="lab-details">
      <h4>Lab details</h4>
      <label htmlFor="lab-name-input">{tx('ชื่อ Lab')}</label>
      <input
        id="lab-name-input"
        value={name}
        maxLength={120}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), undefined)}
        data-testid="lab-name-input"
      />
      {err && <div className="error-box" role="alert">{err}</div>}
      <p className="small">{tx('อุปกรณ์ {0} · สาย {1} · Guide', lab.devices.length, lab.links.length)}{' '}{lab.guide ? tx('{0} ขั้นตอน', lab.guide.sections.length) : tx('ไม่มี')}
      </p>
      <p className="muted small">{tx('คลิกอุปกรณ์หรือสายเพื่อดูรายละเอียด ดับเบิลคลิกอุปกรณ์เพื่อเปิด Console')}</p>
      <button onClick={() => openConnect()} data-testid="open-connect">{tx('เชื่อมสายด้วยแบบฟอร์ม…')}</button>
    </section>
  );
}

export function DetailsPanel() {
  const sel = useStore((s) => s.selection);
  if (sel?.type === 'device') return <DeviceDetails id={sel.id} />;
  if (sel?.type === 'link') return <LinkDetails id={sel.id} />;
  return <LabDetails />;
}
