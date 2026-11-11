import { Fragment, useState, type ReactNode } from 'react';
import { GUIDE_LIMITS, emptyGuide, moveItem, parseGuideText, safeHref } from '../core/guide';
import type { Guide } from '../core/types';
import { useStore } from '../store';
import { Icon } from './Icons';
import { tx } from '../i18n';

/** inline `code` and **bold** — rendered as React elements (never raw HTML) */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter((p) => p !== '');
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`') && p.length > 1 ? (
          <code key={i}>{p.slice(1, -1)}</code>
        ) : p.startsWith('**') && p.endsWith('**') && p.length > 4 ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export function GuideText({ text }: { text: string }) {
  const blocks = parseGuideText(text);
  return (
    <>
      {blocks.map((b, i): ReactNode => {
        if (b.kind === 'p')
          return (
            <p key={i}>
              <Inline text={b.text} />
            </p>
          );
        const Tag = b.kind === 'ul' ? 'ul' : 'ol';
        return (
          <Tag key={i}>
            {b.items.map((it, j) => (
              <li key={j}>
                <Inline text={it} />
              </li>
            ))}
          </Tag>
        );
      })}
    </>
  );
}

function GuideView({ guide }: { guide: Guide }) {
  return (
    <div className="guide-view" data-testid="guide-view">
      <h3 className="guide-title" data-testid="guide-title">
        {guide.title || 'Lab Guide'}
      </h3>
      {guide.objective.trim() && (
        <section className="guide-block">
          <h4>Objective</h4>
          <div data-testid="guide-objective">
            <GuideText text={guide.objective} />
          </div>
        </section>
      )}
      {guide.sections.map((s, i) => (
        <section className="guide-block" key={i} data-testid={`guide-section-${i}`}>
          <h4>{s.heading || tx('ขั้นตอนที่ {0}', i + 1)}</h4>
          <GuideText text={s.body} />
        </section>
      ))}
      {guide.resources.length > 0 && (
        <section className="guide-block">
          <h4>Resources</h4>
          <ul className="guide-links">
            {guide.resources.map((r, i) => {
              const href = safeHref(r.url);
              return (
                <li key={i}>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {r.label || href}
                    </a>
                  ) : (
                    <span>{r.label || r.url}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {guide.sections.length === 0 && !guide.objective.trim() && guide.resources.length === 0 && (
        <p className="muted">{tx('Guide ยังว่างอยู่ — กด “แก้ไข” เพื่อเขียนคำแนะนำ')}</p>
      )}
    </div>
  );
}

function GuideEditor({ guide }: { guide: Guide }) {
  const update = useStore((s) => s.updateGuide);
  const setGuide = useStore((s) => s.setGuide);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const patch = (p: Partial<Guide>) => update((g) => ({ ...g, ...p }));
  const setSection = (i: number, p: Partial<Guide['sections'][number]>) =>
    update((g) => ({ ...g, sections: g.sections.map((s, k) => (k === i ? { ...s, ...p } : s)) }));
  const setResource = (i: number, p: Partial<Guide['resources'][number]>) =>
    update((g) => ({ ...g, resources: g.resources.map((r, k) => (k === i ? { ...r, ...p } : r)) }));

  return (
    <div className="guide-edit" data-testid="guide-editor">
      <p className="muted small">{tx('รองรับ: บรรทัดที่ขึ้นต้นด้วย')}{' '}<code>- </code> = bullet, <code>1. </code>{' '}{tx('= ลำดับเลข,')}{' '}<code>{tx('`โค้ด`')}</code>{' '}{tx('= ตัวอักษรโค้ด,')}{' '}<code>{tx('**หนา**')}</code>{' '}{tx('การแก้ไขบันทึกอัตโนมัติและรวมอยู่ในไฟล์ Export')}</p>
      <label>{tx('ชื่อ Guide')}</label>
      <input value={guide.title} maxLength={120} onChange={(e) => patch({ title: e.target.value })} data-testid="guide-title-input" />
      <label>Objective</label>
      <textarea value={guide.objective} maxLength={4000} rows={5} onChange={(e) => patch({ objective: e.target.value })} data-testid="guide-objective-input" />

      <h4 className="guide-edit-h">{tx('ขั้นตอน ({0})', guide.sections.length)}</h4>
      {guide.sections.map((s, i) => (
        <div className="guide-edit-card" key={i} data-testid={`guide-edit-section-${i}`}>
          <div className="row">
            <input
              value={s.heading}
              maxLength={120}
              placeholder={tx('หัวข้อ')}
              aria-label={tx('หัวข้อขั้นตอนที่ {0}', i + 1)}
              onChange={(e) => setSection(i, { heading: e.target.value })}
              data-testid={`guide-section-heading-${i}`}
            />
            <button title={tx('เลื่อนขึ้น')} disabled={i === 0} onClick={() => patch({ sections: moveItem(guide.sections, i, i - 1) })} data-testid={`guide-section-up-${i}`}>
              <Icon name="up" size={14} />
            </button>
            <button title={tx('เลื่อนลง')} disabled={i === guide.sections.length - 1} onClick={() => patch({ sections: moveItem(guide.sections, i, i + 1) })} data-testid={`guide-section-down-${i}`}>
              <Icon name="down" size={14} />
            </button>
            <button title={tx('ลบขั้นตอนนี้')} className="danger" onClick={() => patch({ sections: guide.sections.filter((_, k) => k !== i) })} data-testid={`guide-section-remove-${i}`}>
              <Icon name="trash" size={14} />
            </button>
          </div>
          <textarea
            value={s.body}
            maxLength={4000}
            rows={5}
            aria-label={tx('เนื้อหาขั้นตอนที่ {0}', i + 1)}
            onChange={(e) => setSection(i, { body: e.target.value })}
            data-testid={`guide-section-body-${i}`}
          />
        </div>
      ))}
      <button
        disabled={guide.sections.length >= GUIDE_LIMITS.sections}
        onClick={() => patch({ sections: [...guide.sections, { heading: '', body: '' }] })}
        data-testid="guide-add-section"
      >{tx('+ เพิ่มขั้นตอน')}</button>

      <h4 className="guide-edit-h">Resources ({guide.resources.length})</h4>
      {guide.resources.map((r, i) => (
        <div className="guide-edit-card" key={i}>
          <div className="row">
            <input value={r.label} maxLength={120} placeholder={tx('ชื่อลิงก์')} aria-label={tx('ชื่อลิงก์ {0}', i + 1)} onChange={(e) => setResource(i, { label: e.target.value })} data-testid={`guide-resource-label-${i}`} />
            <button title={tx('ลบลิงก์')} className="danger" onClick={() => patch({ resources: guide.resources.filter((_, k) => k !== i) })} data-testid={`guide-resource-remove-${i}`}>
              <Icon name="trash" size={14} />
            </button>
          </div>
          <input value={r.url} maxLength={500} placeholder="https://…" aria-label={`URL ${i + 1}`} onChange={(e) => setResource(i, { url: e.target.value })} data-testid={`guide-resource-url-${i}`} />
          {r.url.trim() !== '' && !safeHref(r.url) && (
            <div className="error-box" role="alert" data-testid={`guide-resource-error-${i}`}>{tx('URL ต้องขึ้นต้นด้วย http:// หรือ https:// (ลิงก์นี้จะไม่ถูกแสดงเป็นลิงก์)')}</div>
          )}
        </div>
      ))}
      <button
        disabled={guide.resources.length >= GUIDE_LIMITS.resources}
        onClick={() => patch({ resources: [...guide.resources, { label: '', url: '' }] })}
        data-testid="guide-add-resource"
      >{tx('+ เพิ่มลิงก์')}</button>

      <div className="guide-danger">
        {!confirmDelete ? (
          <button className="danger" onClick={() => setConfirmDelete(true)} data-testid="guide-delete">{tx('ลบ Guide ของ Lab นี้')}</button>
        ) : (
          <>
            <span className="small">{tx('ลบ Guide ทั้งหมดของ Lab นี้?')}</span>
            <button className="danger" onClick={() => setGuide(undefined)} data-testid="guide-delete-confirm">{tx('ยืนยันลบ')}</button>
            <button onClick={() => setConfirmDelete(false)}>{tx('ยกเลิก')}</button>
          </>
        )}
      </div>
    </div>
  );
}

export function GuidePanel() {
  const guide = useStore((s) => s.lab.guide);
  const setGuide = useStore((s) => s.setGuide);
  const setPanel = useStore((s) => s.setLeftPanel);
  const [editing, setEditing] = useState(false);

  return (
    <aside className="guide" aria-label="Lab Guide" data-testid="guide-panel">
      <div className="guide-head">
        <b>Lab Guide</b>
        <span className="spacer" />
        {guide && (
          <button className={editing ? 'primary' : ''} onClick={() => setEditing(!editing)} data-testid="guide-edit-toggle">
            <Icon name={editing ? 'check' : 'edit'} size={15} /> {editing ? tx('เสร็จ') : tx('แก้ไข')}
          </button>
        )}
        <button onClick={() => setPanel(null)} title={tx('ปิด Guide')} aria-label={tx('ปิด Guide')} data-testid="guide-close">
          ✕
        </button>
      </div>
      <div className="guide-body">
        {!guide ? (
          <div className="guide-empty" data-testid="guide-empty">
            <p>{tx('Lab นี้ยังไม่มี Guide')}</p>
            <p className="muted small">{tx('เขียนคำแนะนำ วัตถุประสงค์ และลิงก์อ้างอิงให้ผู้เรียน — บันทึกพร้อม Lab และ Export ไปกับไฟล์ได้')}</p>
            <button
              className="primary"
              onClick={() => {
                setGuide(emptyGuide());
                setEditing(true);
              }}
              data-testid="guide-create"
            >{tx('+ สร้าง Guide')}</button>
          </div>
        ) : editing ? (
          <GuideEditor guide={guide} />
        ) : (
          <GuideView guide={guide} />
        )}
      </div>
    </aside>
  );
}
