import { useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon } from './Icons';

const fmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Lab list (saved in this browser) — open, duplicate, export, delete, create, import. */
export function FileManager() {
  // subscribe to what the summaries depend on so the list stays live
  const lab = useStore((s) => s.lab);
  const others = useStore((s) => s.others);
  const activeId = useStore((s) => s.activeId);
  const updatedAt = useStore((s) => s.activeUpdatedAt);
  const summaries = useStore((s) => s.summaries);
  const openLab = useStore((s) => s.openLab);
  const createLab = useStore((s) => s.createLab);
  const duplicateLab = useStore((s) => s.duplicateLab);
  const exportEntry = useStore((s) => s.exportEntry);
  const requestDelete = useStore((s) => s.requestDeleteLabs);
  const importAsEntry = useStore((s) => s.importAsEntry);

  const [q, setQ] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => summaries(), [lab, others, activeId, updatedAt, summaries]);
  const shown = rows.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase()));
  const allChecked = shown.length > 0 && shown.every((r) => checked.has(r.id));

  const toggle = (id: string) => {
    const n = new Set(checked);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setChecked(n);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    importAsEntry(await f.text(), f.name);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <section className="manager" data-testid="manager" aria-label="Lab Manager">
      <div className="manager-head">
        <h3>
          <Icon name="manager" size={20} /> Lab Manager
        </h3>
        <span className="muted small">Lab ทั้งหมดที่บันทึกไว้ในเบราว์เซอร์นี้ — ทุกการแก้ไขบันทึกอัตโนมัติ</span>
      </div>

      <div className="search-box">
        <input placeholder="ค้นหาชื่อ Lab" value={q} onChange={(e) => setQ(e.target.value)} data-testid="manager-search" aria-label="ค้นหา Lab" />
        <Icon name="search" size={18} />
      </div>

      <div className="manager-tools">
        <button className="primary" onClick={() => createLab('blank')} data-testid="manager-new">
          <Icon name="plus" size={15} /> Lab ใหม่
        </button>
        <button onClick={() => createLab('office')} data-testid="manager-new-office">
          <Icon name="flask" size={15} /> + Sample: Small Office
        </button>
        <button onClick={() => createLab('intervlan')} data-testid="manager-new-intervlan">
          <Icon name="flask" size={15} /> + Sample: Inter-VLAN
        </button>
        <button onClick={() => fileRef.current?.click()} data-testid="manager-import">
          <Icon name="upload" size={15} /> นำเข้า JSON
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} data-testid="manager-import-file" />
        <span className="spacer" />
        <button className="danger" disabled={checked.size === 0} onClick={() => requestDelete([...checked])} data-testid="manager-delete-selected">
          <Icon name="trash" size={15} /> ลบที่เลือก ({checked.size})
        </button>
      </div>

      <div className="table-scroll tall">
        <table className="files" data-testid="manager-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input
                  type="checkbox"
                  aria-label="เลือกทั้งหมด"
                  checked={allChecked}
                  onChange={() => setChecked(allChecked ? new Set() : new Set(shown.map((r) => r.id)))}
                />
              </th>
              <th>ชื่อ</th>
              <th>อุปกรณ์ / สาย</th>
              <th>แก้ไขล่าสุด</th>
              <th style={{ width: 230 }}>การทำงาน</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className={r.active ? 'active-row' : ''} data-testid={`lab-row-${r.id}`}>
                <td>
                  <input type="checkbox" aria-label={`เลือก ${r.name}`} checked={checked.has(r.id)} onChange={() => toggle(r.id)} />
                </td>
                <td>
                  <button className="file-name" onClick={() => openLab(r.id)} data-testid={`lab-open-${r.id}`} title="เปิด Lab นี้">
                    <Icon name="flask" size={18} /> {r.name}
                  </button>
                  {r.active && <span className="pill up" data-testid="lab-active-badge">กำลังเปิดอยู่</span>}
                  {r.hasGuide && <span className="pill guide-pill">Guide</span>}
                </td>
                <td>
                  {r.devices} / {r.links}
                </td>
                <td>{fmt.format(r.updatedAt)}</td>
                <td className="file-actions">
                  <button onClick={() => openLab(r.id)} data-testid={`lab-open-btn-${r.id}`}>
                    เปิด
                  </button>
                  <button title="ทำสำเนา" aria-label={`ทำสำเนา ${r.name}`} onClick={() => duplicateLab(r.id)} data-testid={`lab-dup-${r.id}`}>
                    <Icon name="copy" size={15} />
                  </button>
                  <button title="Export JSON" aria-label={`Export ${r.name}`} onClick={() => exportEntry(r.id)} data-testid={`lab-export-${r.id}`}>
                    <Icon name="download" size={15} />
                  </button>
                  <button className="danger" title="ลบ" aria-label={`ลบ ${r.name}`} onClick={() => requestDelete([r.id])} data-testid={`lab-del-${r.id}`}>
                    <Icon name="trash" size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  ไม่พบ Lab ที่ตรงกับคำค้น
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
