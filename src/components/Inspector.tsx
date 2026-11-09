import { useState } from 'react';
import { getDevice } from '../core/lab';
import { linkStatus, type PingResult } from '../core/network';
import { shortPort } from '../core/profiles';
import { SAMPLE_PORTS } from '../core/sample';
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

export function Inspector() {
  const lab = useStore((s) => s.lab);
  const lastPing = useStore((s) => s.lastPing);
  const runPing = useStore((s) => s.runPing);
  const sources = lab.devices.filter((d) => d.kind === 'pc' || d.kind === 'cisco-router');
  const [src, setSrc] = useState('');
  const [dst, setDst] = useState('192.168.1.110');
  const [err, setErr] = useState<string | null>(null);
  const srcId = sources.some((d) => d.id === src) ? src : (sources[0]?.id ?? '');
  const targets = lab.devices.flatMap((d) => d.ifaces.filter((i) => i.ip).map((i) => ({ label: `${d.name} (${i.ip})`, ip: i.ip! })));

  const run = () => {
    if (parseIp(dst.trim()) === null) return setErr('IPv4 ปลายทางไม่ถูกต้อง');
    if (!srcId) return setErr('ไม่มีอุปกรณ์ต้นทาง (ต้องมี PC หรือ Router)');
    setErr(null);
    runPing(srcId, dst.trim());
  };

  const isSample = lab.name.startsWith('Small Office');

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

      {isSample && (
        <section className="card" data-testid="exercise">
          <h4>โจทย์ฝึก: ทำให้ลิงก์ระหว่าง switch หยุด แล้วกู้คืนด้วย CLI</h4>
          <ol className="small">
            <li>เปิด Terminal ของ <b>PC-01</b> แล้ว <code>ping 192.168.1.110</code> (ต้องสำเร็จ)</li>
            <li>
              เปิด Console ของ <b>SW2</b> (Aruba) ลิงก์ระหว่าง switch คือพอร์ต <code>{SAMPLE_PORTS.sw1ToSw2.sw2}</code> ฝั่ง SW2
              (ฝั่ง SW1 คือ <code>{SAMPLE_PORTS.sw1ToSw2.sw1}</code>)
            </li>
            <li>
              พิมพ์ <code>configure terminal</code> → <code>interface {SAMPLE_PORTS.sw1ToSw2.sw2}</code> → <code>shutdown</code>
            </li>
            <li>ping 192.168.1.110 อีกครั้ง (ต้องไม่ผ่าน) แต่ <code>ping 192.168.1.1</code> ยังผ่าน เพราะ R1 ต่อกับ SW1 อยู่ — ดูเหตุผลใน Inspector</li>
            <li>กู้คืน: <code>no shutdown</code> แล้ว ping 192.168.1.110 ใหม่</li>
          </ol>
          <p className="muted small">
            พอร์ตจริงของ lab: R1 {SAMPLE_PORTS.r1ToSw1.r1} ↔ SW1 {SAMPLE_PORTS.r1ToSw1.sw1} · SW1 {SAMPLE_PORTS.sw1ToSw2.sw1} ↔ SW2 {SAMPLE_PORTS.sw1ToSw2.sw2} · PC-01..05 ↔ SW1 Fa0/1..5 · PC-06..10 ↔ SW2 1/1/1..5
          </p>
        </section>
      )}
    </>
  );
}
