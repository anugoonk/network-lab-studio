import { useEffect, useState } from 'react';
import { portInUse } from '../core/lab';
import { SAMPLES } from '../core/sample';
import { useStore } from '../store';
import { tx } from '../i18n';

export function ConnectDialog() {
  const dlg = useStore((s) => s.connectDialog);
  const lab = useStore((s) => s.lab);
  const close = useStore((s) => s.closeConnect);
  const connect = useStore((s) => s.connect);
  const say = useStore((s) => s.say);
  const [aId, setA] = useState('');
  const [bId, setB] = useState('');
  const [aPort, setAPort] = useState('');
  const [bPort, setBPort] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const firstFree = (deviceId: string) => {
    const d = lab.devices.find((x) => x.id === deviceId);
    return d?.ifaces.find((i) => !portInUse(lab, deviceId, i.name))?.name ?? '';
  };

  useEffect(() => {
    if (!dlg) return;
    const a = dlg.a ?? lab.devices[0]?.id ?? '';
    const b = dlg.b ?? lab.devices.find((d) => d.id !== a)?.id ?? '';
    setA(a);
    setB(b);
    setAPort(firstFree(a));
    setBPort(firstFree(b));
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dlg]);

  if (!dlg) return null;
  const portSelect = (deviceId: string, value: string, onChange: (v: string) => void, testId: string) => {
    const d = lab.devices.find((x) => x.id === deviceId);
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId}>
        {d?.ifaces.map((i) => {
          const used = portInUse(lab, deviceId, i.name);
          return (
            <option key={i.name} value={i.name} disabled={used}>
              {i.name}
              {used ? tx(' (มีสายแล้ว)') : ''}
            </option>
          );
        })}
      </select>
    );
  };
  const deviceSelect = (value: string, onChange: (v: string) => void, testId: string) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId}>
      {lab.devices.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      ))}
    </select>
  );

  const submit = () => {
    const e = connect({ deviceId: aId, port: aPort }, { deviceId: bId, port: bPort });
    if (e) setErr(e);
    else {
      say('ok', tx('เชื่อมสายสำเร็จ'));
      close();
    }
  };

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={tx('เชื่อมสาย')}>
      <div className="modal">
        <h3>{tx('เชื่อมสาย Ethernet')}</h3>
        <p className="muted small">{tx('เลือกพอร์ตต้นทางและปลายทางให้ชัดเจน พอร์ตที่มีสายแล้วเลือกไม่ได้')}</p>
        <div className="grid2">
          <div>
            <label>{tx('อุปกรณ์ต้นทาง')}</label>
            {deviceSelect(aId, (v) => { setA(v); setAPort(firstFree(v)); }, 'connect-a-device')}
            <label>{tx('พอร์ตต้นทาง')}</label>
            {portSelect(aId, aPort, setAPort, 'connect-a-port')}
          </div>
          <div>
            <label>{tx('อุปกรณ์ปลายทาง')}</label>
            {deviceSelect(bId, (v) => { setB(v); setBPort(firstFree(v)); }, 'connect-b-device')}
            <label>{tx('พอร์ตปลายทาง')}</label>
            {portSelect(bId, bPort, setBPort, 'connect-b-port')}
          </div>
        </div>
        {err && <div className="error-box" role="alert">{err}</div>}
        <div className="modal-actions">
          <button onClick={close}>{tx('ยกเลิก')}</button>
          <button className="primary" onClick={submit} data-testid="connect-submit">{tx('เชื่อมสาย')}</button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog() {
  const p = useStore((s) => s.confirm);
  const dirty = useStore((s) => s.isDirty());
  const ok = useStore((s) => s.confirmReplace);
  const cancel = useStore((s) => s.cancelReplace);
  if (!p || !dirty) return null;
  const what = p.kind === 'new' ? tx('สร้าง Lab ใหม่ (ว่างเปล่า)') : p.kind === 'sample' ? tx('เปิด {0} {1}', SAMPLES[p.which].challenge ? tx('โจทย์') : 'Sample Lab', SAMPLES[p.which].title) : tx('นำเข้าไฟล์ {0}', p.fileName);
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={tx('ยืนยัน')}>
      <div className="modal">
        <h3>{tx('แทนที่งานปัจจุบัน?')}</h3>
        <p>{tx('งานปัจจุบันมีการแก้ไขที่')}{' '}<b>{tx('ยังไม่ได้ Export')}</b>{' '}{tx('การ{0}จะแทนที่งานนี้', what)}</p>
        <div className="modal-actions">
          <button onClick={cancel} data-testid="confirm-cancel">{tx('ยกเลิก')}</button>
          <button className="danger" onClick={ok} data-testid="confirm-ok">{tx('แทนที่')}</button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDeleteDialog() {
  const ids = useStore((s) => s.confirmDelete);
  const summaries = useStore((s) => s.summaries);
  const ok = useStore((s) => s.confirmDeleteLabs);
  const cancel = useStore((s) => s.cancelDelete);
  if (!ids) return null;
  const names = summaries()
    .filter((r) => ids.includes(r.id))
    .map((r) => r.name);
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={tx('ยืนยันการลบ')}>
      <div className="modal">
        <h3>{tx('ลบ {0} Lab?', ids.length)}</h3>
        <ul className="small" data-testid="delete-names">
          {names.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
        <p>{tx('การลบไม่สามารถกู้คืนได้ (ถ้าต้องการเก็บไว้ ให้ Export ก่อน)')}</p>
        <div className="modal-actions">
          <button onClick={cancel} data-testid="confirm-delete-cancel">{tx('ยกเลิก')}</button>
          <button className="danger" onClick={ok} data-testid="confirm-delete-ok">{tx('ลบ')}</button>
        </div>
      </div>
    </div>
  );
}
