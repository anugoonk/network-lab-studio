import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { SPECS } from '../core/cli/registry';
import { MODE_LABEL, MODE_PATH, TOPICS, type CommandSpec, type Topic } from '../core/cli/spec';
import { PROFILES } from '../core/profiles';
import type { CliMode, DeviceKind, Device, Vendor } from '../core/types';
import { useStore } from '../store';
import { tx } from '../i18n';
import {
  NO_FILTERS,
  copyMessage,
  copyText,
  exampleGroups,
  filterCommands,
  hasActiveFilters,
  kindOptions,
  modeOptions,
  modeSteps,
  moveIndex,
  primaryExample,
  vendorName,
  type CopyResult,
  type LibraryFilters,
} from '../ui/commandLibrary';

const KIND_OPTIONS = kindOptions(SPECS);
const MODE_OPTIONS = modeOptions(SPECS);
const kindLabels = (kinds: DeviceKind[]) => kinds.map((k) => PROFILES[k].label);

/** Why a command cannot be inserted into this device's console right now (null = fine). */
export function insertProblem(spec: CommandSpec, dev: Device): string | null {
  const vendor = PROFILES[dev.kind].vendor;
  if (spec.vendor !== vendor) {
    const targets = spec.deviceTypes.map((k) => PROFILES[k].label).join(' / ');
    return tx('คำสั่งนี้เป็นของ {0} แต่ {1} เป็น {2} — กรุณาเลือกอุปกรณ์ชนิด {3}', vendorName(spec.vendor), dev.name, PROFILES[dev.kind].label, targets);
  }
  if (!spec.deviceTypes.includes(dev.kind)) {
    const targets = spec.deviceTypes.map((k) => PROFILES[k].label).join(' / ');
    return tx('คำสั่งนี้ใช้กับ {0} เท่านั้น — กรุณาเลือกอุปกรณ์ชนิดนั้น', targets);
  }
  if (!spec.modes.includes(dev.cli.mode)) {
    const want = spec.modes.map((m) => MODE_LABEL[vendor][m] ?? m).join(tx(' หรือ '));
    const path = MODE_PATH[vendor][spec.modes[0]] ?? '';
    return tx('ต้องอยู่ใน mode: {0} (ตอนนี้ {1} อยู่ {2}) — วิธีเข้า: {3}', want, dev.name, MODE_LABEL[vendor][dev.cli.mode] ?? dev.cli.mode, path);
  }
  return null;
}

const rowButtonId = (id: string) => `lib-row-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

export function CommandLibrary() {
  const lab = useStore((s) => s.lab);
  const selection = useStore((s) => s.selection);
  const insert = useStore((s) => s.insertIntoConsole);

  const [filters, setFilters] = useState<LibraryFilters>(NO_FILTERS);
  const [target, setTarget] = useState('');
  const [selectedId, setSelectedId] = useState('');
  /** feedback of "Put in Console", shown next to the button that was pressed */
  const [rowProblems, setRowProblems] = useState<Record<string, string>>({});
  const [detailProblem, setDetailProblem] = useState<{ id: string; text: string } | null>(null);
  const [copied, setCopied] = useState<{ id: string; result: CopyResult; text: string } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const detailTitleRef = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // only devices that have a CLI can receive a command; a selected rack/AP must not silently become the target
  const cliDevices = lab.devices.filter((d) => PROFILES[d.kind].hasCli);
  const selectedDev = selection?.type === 'device' ? selection.id : '';
  const targetId = cliDevices.some((d) => d.id === target) ? target : cliDevices.some((d) => d.id === selectedDev) ? selectedDev : (cliDevices[0]?.id ?? '');
  const targetDev = cliDevices.find((d) => d.id === targetId);

  const list = useMemo(() => filterCommands(SPECS, filters), [filters]);
  const selIndex = Math.max(0, list.findIndex((s) => s.id === selectedId));
  const selected: CommandSpec | undefined = list[selIndex];

  const set = <K extends keyof LibraryFilters>(k: K, v: LibraryFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const clearFilters = () => {
    setFilters(NO_FILTERS);
    searchRef.current?.focus();
  };

  useEffect(() => setCopied(null), [selected?.id]);

  const focusRow = (id: string) => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(`#${rowButtonId(id)}`);
    el?.focus();
    el?.scrollIntoView({ block: 'nearest' });
  };

  const onInsert = (s: CommandSpec, where: 'row' | 'detail') => {
    const show = (text: string) => {
      if (where === 'row') setRowProblems((p) => ({ ...p, [s.id]: text }));
      else setDetailProblem(text ? { id: s.id, text } : null);
    };
    if (!targetDev) {
      return show(lab.devices.length === 0 ? tx('ยังไม่มีอุปกรณ์ใน Lab — เพิ่มอุปกรณ์ก่อน') : tx('ยังไม่มีอุปกรณ์ที่มี CLI ใน Lab — เพิ่ม router, switch หรือ PC ก่อน'));
    }
    const p = insertProblem(s, targetDev);
    if (p) return show(p);
    show('');
    insert(targetDev.id, primaryExample(s, targetDev.kind));
  };

  const onCopy = async (s: CommandSpec) => {
    const text = primaryExample(s, targetDev?.kind);
    const result = await copyText(text, typeof navigator !== 'undefined' ? navigator.clipboard : undefined, typeof window !== 'undefined' && window.isSecureContext);
    setCopied({ id: s.id, result, text });
  };

  /** ↑/↓/Home/End move through the list; Enter opens the detail of the focused command */
  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const t = e.target as HTMLElement;
    if (!t.classList.contains('lib-row-main')) return; // the Put in Console buttons keep their native keys
    let next = -1;
    if (e.key === 'ArrowDown') next = moveIndex(selIndex, 1, list.length);
    else if (e.key === 'ArrowUp') next = moveIndex(selIndex, -1, list.length);
    else if (e.key === 'Home') next = list.length ? 0 : -1;
    else if (e.key === 'End') next = list.length - 1;
    else if (e.key === 'Enter') {
      e.preventDefault();
      const id = t.dataset.cmd ?? '';
      setSelectedId(id);
      requestAnimationFrame(() => detailTitleRef.current?.focus());
      return;
    } else return;
    e.preventDefault();
    if (next < 0) return;
    setSelectedId(list[next].id);
    focusRow(list[next].id);
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && filters.q) {
      e.preventDefault();
      set('q', '');
    } else if (e.key === 'ArrowDown' && selected) {
      e.preventDefault();
      focusRow(selected.id);
    }
  };

  const onDetailKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape' && selected) {
      e.preventDefault();
      focusRow(selected.id);
    }
  };

  const active = hasActiveFilters(filters);

  return (
    <div className="library" data-testid="library">
      <div className="lib-filters" role="group" aria-label={tx('ตัวกรองคำสั่ง')}>
        <input
          ref={searchRef}
          className="lib-search"
          type="search"
          placeholder={tx('ค้นหา: คำสั่ง / คำอธิบายไทย / ชื่อระบบ (Cisco, Aruba)')}
          aria-label={tx('ค้นหา: คำสั่ง / คำอธิบายไทย / ชื่อระบบ (Cisco, Aruba)')}
          value={filters.q}
          onChange={(e) => set('q', e.target.value)}
          onKeyDown={onSearchKey}
          data-testid="lib-search"
        />
        <select value={filters.vendor} onChange={(e) => set('vendor', e.target.value as Vendor | '')} aria-label="Vendor" data-testid="lib-vendor">
          <option value="">{tx('ทุก vendor')}</option>
          <option value="cisco">Cisco IOS</option>
          <option value="aruba">Aruba AOS-CX</option>
          <option value="pc">PC</option>
        </select>
        <select value={filters.kind} onChange={(e) => set('kind', e.target.value as DeviceKind | '')} aria-label={tx('ชนิดอุปกรณ์')} data-testid="lib-kind">
          <option value="">{tx('ทุกชนิดอุปกรณ์')}</option>
          {KIND_OPTIONS.map((o) => (
            <option key={o.kind} value={o.kind}>{o.label}</option>
          ))}
        </select>
        <select value={filters.mode} onChange={(e) => set('mode', e.target.value as CliMode | '')} aria-label="CLI mode" data-testid="lib-mode">
          <option value="">{tx('ทุก mode')}</option>
          {MODE_OPTIONS.map((o) => (
            <option key={o.mode} value={o.mode}>{o.label}</option>
          ))}
        </select>
        <select value={filters.topic} onChange={(e) => set('topic', e.target.value as Topic | '')} aria-label={tx('หัวข้อ')} data-testid="lib-topic">
          <option value="">{tx('ทุกหัวข้อ')}</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button type="button" className="lib-clear" onClick={clearFilters} disabled={!active} data-testid="lib-clear">{tx('ล้างตัวกรอง')}</button>
      </div>
      <div className="lib-target">
        <label htmlFor="lib-target-select">{tx('ใส่คำสั่งลง Console ของ:')}</label>
        <select id="lib-target-select" value={targetId} onChange={(e) => setTarget(e.target.value)} data-testid="lib-target" disabled={cliDevices.length === 0}>
          {cliDevices.map((d) => (
            <option key={d.id} value={d.id}>{d.name} — {PROFILES[d.kind].label}</option>
          ))}
        </select>
        {targetDev && <span className="muted small">{tx('mode ตอนนี้: {0}', MODE_LABEL[PROFILES[targetDev.kind].vendor][targetDev.cli.mode] ?? targetDev.cli.mode)}</span>}
        <span className="muted small lib-count" role="status" data-testid="lib-count">{tx('{0} รายการ', list.length)}</span>
      </div>

      {list.length === 0 ? (
        <div className="lib-empty" data-testid="lib-empty">
          <p>{tx('ไม่พบคำสั่งที่ตรงกับตัวกรอง')}</p>
          {active && <button type="button" onClick={clearFilters}>{tx('ล้างตัวกรอง')}</button>}
        </div>
      ) : (
        <div className="lib-body">
          <ul className="lib-list" aria-label={tx('รายการคำสั่ง')} ref={listRef} onKeyDown={onListKey} data-testid="lib-list">
            {list.map((s) => {
              const sel = s.id === selected?.id;
              return (
                <li className={`lib-row${sel ? ' selected' : ''}`} key={s.id} data-testid={`lib-card-${s.id}`}>
                  <div className="lib-row-line">
                    <button
                      type="button"
                      id={rowButtonId(s.id)}
                      className="lib-row-main"
                      data-cmd={s.id}
                      aria-current={sel ? 'true' : undefined}
                      aria-controls="lib-detail"
                      tabIndex={sel ? 0 : -1}
                      title={s.descTh}
                      onClick={() => setSelectedId(s.id)}
                    >
                      <code className="syntax">{s.syntax}</code>
                      <span className={`tag ${s.vendor}`}>{vendorName(s.vendor)}</span>
                      <span className="tag topic">{s.topic}</span>
                    </button>
                    <button
                      type="button"
                      className="lib-row-insert"
                      tabIndex={sel ? 0 : -1}
                      onClick={() => onInsert(s, 'row')}
                      aria-label={tx('ใส่ "{0}" ใน Console', primaryExample(s, targetDev?.kind))}
                      data-testid={`lib-insert-${s.id}`}
                    >
                      {tx('ใส่ใน Console')}
                    </button>
                  </div>
                  {rowProblems[s.id] && <div className="error-box" role="alert" data-testid={`lib-problem-${s.id}`}>{rowProblems[s.id]}</div>}
                </li>
              );
            })}
          </ul>
          {selected && <Detail spec={selected} targetDev={targetDev} titleRef={detailTitleRef} onKeyDown={onDetailKey} onInsert={() => onInsert(selected, 'detail')} onCopy={() => onCopy(selected)} copied={copied?.id === selected.id ? copied : null} problem={detailProblem?.id === selected.id ? detailProblem.text : ''} />}
        </div>
      )}
    </div>
  );
}

function Detail(props: {
  spec: CommandSpec;
  targetDev: Device | undefined;
  titleRef: RefObject<HTMLHeadingElement | null>;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  onInsert: () => void;
  onCopy: () => void;
  copied: { result: CopyResult; text: string } | null;
  problem: string;
}) {
  const { spec: s, targetDev } = props;
  const groups = exampleGroups(s);
  const primary = primaryExample(s, targetDev?.kind);
  const fits = !!targetDev && s.deviceTypes.includes(targetDev.kind);
  return (
    <section className="lib-detail" id="lib-detail" aria-labelledby="lib-detail-title" onKeyDown={props.onKeyDown} data-testid="lib-detail">
      <h2 id="lib-detail-title" tabIndex={-1} ref={props.titleRef}>
        <code className="syntax" data-testid="lib-detail-syntax">{s.syntax}</code>
      </h2>
      <div className="lib-top">
        <span className={`tag ${s.vendor}`}>{vendorName(s.vendor)}</span>
        <span className="tag topic">{s.topic}</span>
      </div>
      <p data-testid="lib-detail-desc">{s.descTh}</p>

      <h3>{tx('ใช้กับอุปกรณ์')}</h3>
      <ul className="lib-chips" data-testid="lib-detail-kinds">
        {kindLabels(s.deviceTypes).map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>

      <h3>{tx('Mode ที่ใช้')}</h3>
      <ul className="lib-modes" data-testid="lib-detail-modes">
        {modeSteps(s).map((m) => (
          <li key={m.mode}>
            <b>{m.label}</b>
            {m.path && (
              <span className="small muted">
                {' '}{tx('วิธีเข้า:')} <code>{m.path}</code>
              </span>
            )}
          </li>
        ))}
      </ul>

      <h3>{tx('ตัวอย่างที่รันได้')}</h3>
      <ul className="lib-examples" data-testid="lib-detail-examples">
        {groups.map((g) => (
          <li key={g.text}>
            <code className="lib-example-code">{g.text}</code>
            {groups.length > 1 && <span className="small muted"> {kindLabels(g.kinds).join(', ')}</span>}
          </li>
        ))}
      </ul>

      <h3>{tx('วิธีตรวจผล:')}</h3>
      <p className="small">
        <code>{s.verify}</code> — {s.verifyTh}
      </p>

      <div className="lib-actions">
        <div className="small muted">
          {fits ? tx('คำสั่งสำหรับ {0}:', targetDev!.name) : tx('คำสั่ง:')} <code className="lib-example-code" data-testid="lib-detail-example">{primary}</code>
        </div>
        <div className="lib-action-buttons">
          <button type="button" onClick={props.onCopy} data-testid="lib-copy">{tx('คัดลอกคำสั่ง')}</button>
          <button type="button" className="primary" onClick={props.onInsert} data-testid="lib-detail-insert">{tx('ใส่ใน Console')}</button>
        </div>
        <p className={`lib-copy-status small${props.copied ? (props.copied.result === 'ok' ? ' ok' : ' bad') : ''}`} role="status" aria-live="polite" data-testid="lib-copy-status">
          {props.copied ? copyMessage(props.copied.result, props.copied.text) : ''}
        </p>
        {props.problem && <div className="error-box" role="alert" data-testid="lib-detail-problem">{props.problem}</div>}
      </div>
    </section>
  );
}
