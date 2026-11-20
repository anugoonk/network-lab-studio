import { useEffect, useRef, useState, type ReactNode } from 'react';
import { portInUse } from '../core/lab';
import { SAMPLES } from '../core/sample';
import { useStore } from '../store';
import { tx } from '../i18n';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared frame of the modal dialogs (UI-04): moves focus into the dialog when it opens (the element marked
 * `data-autofocus`, else the first control), keeps Tab / Shift+Tab inside it, closes it with Esc, and gives focus back to
 * whatever had it before. Rendered only while the dialog is open, so its effect runs exactly once per opening.
 */
export function ModalFrame({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const items = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.getClientRects().length > 0);
    (el.querySelector<HTMLElement>('[data-autofocus]') ?? items()[0] ?? el).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = items();
      if (list.length === 0) {
        e.preventDefault();
        el.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (!(active instanceof Node) || !el.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (opener && opener.isConnected && opener !== document.body) opener.focus();
    };
  }, []);
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={label}>
      <div className="modal" ref={root} tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}

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

  // devices without network ports (rack, UPS) cannot be a cable end, so they are not offered
  const cabled = lab.devices.filter((d) => d.ifaces.length > 0);

  useEffect(() => {
    if (!dlg) return;
    const a = dlg.a ?? cabled[0]?.id ?? '';
    const b = dlg.b ?? cabled.find((d) => d.id !== a)?.id ?? '';
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
      {cabled.map((d) => (
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
    <ModalFrame label={tx('เชื่อมสาย')} onClose={close}>
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
    </ModalFrame>
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
    <ModalFrame label={tx('ยืนยัน')} onClose={cancel}>
        <h3>{tx('แทนที่งานปัจจุบัน?')}</h3>
        <p>{tx('งานปัจจุบันมีการแก้ไขที่')}{' '}<b>{tx('ยังไม่ได้ Export')}</b>{' '}{tx('การ{0}จะแทนที่งานนี้', what)}</p>
        <div className="modal-actions">
          <button onClick={cancel} data-autofocus data-testid="confirm-cancel">{tx('ยกเลิก')}</button>
          <button className="danger" onClick={ok} data-testid="confirm-ok">{tx('แทนที่')}</button>
        </div>
    </ModalFrame>
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
    <ModalFrame label={tx('ยืนยันการลบ')} onClose={cancel}>
        <h3>{tx('ลบ {0} Lab?', ids.length)}</h3>
        <ul className="small" data-testid="delete-names">
          {names.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
        <p>{tx('การลบไม่สามารถกู้คืนได้ (ถ้าต้องการเก็บไว้ ให้ Export ก่อน)')}</p>
        <div className="modal-actions">
          <button onClick={cancel} data-autofocus data-testid="confirm-delete-cancel">{tx('ยกเลิก')}</button>
          <button className="danger" onClick={ok} data-testid="confirm-delete-ok">{tx('ลบ')}</button>
        </div>
    </ModalFrame>
  );
}
