import { useState } from 'react';
import { duplicateIpsCached } from '../core/l2tables';
import { getDevice } from '../core/lab';
import { allAddresses, l3Interfaces, linkStatus, type PingResult } from '../core/network';
import { shortPort } from '../core/profiles';
import { parseIp } from '../core/ip';
import { useStore } from '../store';

function ResultView({ r }: { r: PingResult }) {
  const lab = useStore((s) => s.lab);
  const name = (id: string) => getDevice(lab, id)?.name ?? id;
  const src = name(r.srcId);
  return (
    <div className={`result ${r.ok ? 'ok' : 'bad'}`} data-testid="inspector-result">
      <div className="result-title">
        {r.ok ? '✅ ping สำเร็จ' : '❌ ping ไม่สำเร็จ'} · {src} → {r.dstIp}
        {!r.ok && r.direction && <span> ({r.direction === 'forward' ? 'ขาไป' : 'ขากลับ'})</span>}
      </div>
      {r.forwardPath.length > 1 && (
        <div className="path">
          {r.forwardPath.map((id, i) => (
            <span key={i}>
              {i > 0 && <span className="arrow">→</span>}
              <span className={`chip ${!r.ok && r.direction === 'forward' && i === r.forwardPath.length - 1 ? 'bad' : ''}`}>{name(id)}</span>
            </span>
          ))}
        </div>
      )}
      <ul className="explain" data-testid="inspector-explain">
        {r.explanation.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
      <p className="muted small">คำอธิบายนี้มาจากผลคำนวณของ simulator สำหรับผู้เรียน — ไม่ใช่ output ของ terminal</p>
    </div>
  );
}

function DuplicateIps() {
  const lab = useStore((s) => s.lab);
  const dups = duplicateIpsCached(lab);
  return (
    <section className="card" data-testid="dup-section">
      <h4>ตรวจ IP ซ้ำ</h4>
      {dups.length === 0 ? (
        <p className="muted small" data-testid="dup-none">ไม่พบ IP ซ้ำใน L2 domain เดียวกัน (ตรวจเฉพาะอุปกรณ์ที่ลิงก์ up; การใช้ IP เดียวกันคนละ VLAN/คนละ subnet ไม่นับ)</p>
      ) : (
        <ul className="explain" data-testid="dup-list">
          {dups.map((d) => (
            <li key={d.ip}>
              <b>{d.ip}</b> ใช้ซ้ำโดย {d.members.map((m) => `${m.deviceName} (${m.ifaceName})`).join(', ')} — ARP ของเครื่องอื่นจะสลับไปมาระหว่าง MAC ทั้งสอง ให้เปลี่ยน IP ของเครื่องใดเครื่องหนึ่ง
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Inspector() {
  const lab = useStore((s) => s.lab);
  const lastPing = useStore((s) => s.lastPing);
  const runPing = useStore((s) => s.runPing);
  const sources = lab.devices.filter((d) => l3Interfaces(lab, d).length > 0);
  const [src, setSrc] = useState('');
  const [dst, setDst] = useState('192.168.1.110');
  const [err, setErr] = useState<string | null>(null);
  const srcId = sources.some((d) => d.id === src) ? src : (sources[0]?.id ?? '');
  const targets = allAddresses(lab).map(({ device, ifc }) => ({ label: `${device.name} ${ifc.name} (${ifc.ip})`, ip: ifc.ip }));

  const run = () => {
    if (parseIp(dst.trim()) === null) return setErr('IPv4 ปลายทางไม่ถูกต้อง');
    if (!srcId) return setErr('ไม่มีอุปกรณ์ต้นทางที่มี IP (PC, Router หรือ switch ที่มี SVI)');
    setErr(null);
    runPing(srcId, dst.trim());
  };


  return (
    <>
      <section className="card">
        <h4>ทดสอบ ping พร้อมคำอธิบาย</h4>
        <label>ต้นทาง</label>
        <select value={srcId} onChange={(e) => setSrc(e.target.value)} data-testid="inspector-src">
          {sources.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <label>IPv4 ปลายทาง</label>
        <div className="row">
          <input value={dst} onChange={(e) => setDst(e.target.value)} data-testid="inspector-dst" />
          <select value="" onChange={(e) => e.target.value && setDst(e.target.value)} aria-label="เลือก IP จากอุปกรณ์">
            <option value="">เลือก…</option>
            {targets.map((t, i) => (
              <option key={i} value={t.ip}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {err && <div className="error-box">{err}</div>}
        <button className="primary" onClick={run} data-testid="inspector-run">
          ทดสอบ
        </button>
      </section>

      <DuplicateIps />

      <section className="card">
        <h4>ผลล่าสุด {lastPing ? '' : '(ยังไม่มี)'}</h4>
        {lastPing ? <ResultView r={lastPing} /> : <p className="muted small">กดทดสอบด้านบน หรือพิมพ์ ping ใน Terminal ของ PC — ผลจะแสดงที่นี่พร้อมเหตุผล</p>}
      </section>

      <section className="card">
        <h4>สถานะลิงก์ทั้งหมด</h4>
        <p className="muted small">“มีสายเชื่อม” ต่างจาก “ลิงก์ใช้งานได้” — สายอาจต่ออยู่แต่ลิงก์ down เพราะพอร์ตถูก shutdown</p>
        <div className="table-scroll">
          <table className="ports" data-testid="link-table">
            <thead>
              <tr>
                <th>ปลายทาง A</th>
                <th>ปลายทาง B</th>
                <th>สาย</th>
                <th>ลิงก์</th>
              </tr>
            </thead>
            <tbody>
              {lab.links.map((l) => {
                const st = linkStatus(lab, l);
                const a = getDevice(lab, l.a.deviceId)!;
                const b = getDevice(lab, l.b.deviceId)!;
                return (
                  <tr key={l.id} title={st.reasonTh}>
                    <td>{a.name}:{shortPort(l.a.port)}</td>
                    <td>{b.name}:{shortPort(l.b.port)}</td>
                    <td><span className="pill up">มีสาย</span></td>
                    <td><span className={`pill ${st.up ? 'up' : 'down'}`}>{st.up ? 'ใช้งานได้' : 'down'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </>
  );
}
