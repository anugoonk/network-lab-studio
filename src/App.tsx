import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { useEffect, useRef } from 'react';
import { Canvas, fitLab } from './components/Canvas';
import { CommandLibrary } from './components/CommandLibrary';
import { Console } from './components/Console';
import { DetailsPanel } from './components/DetailsPanel';
import { ConfirmDeleteDialog, ConfirmDialog, ConnectDialog } from './components/Dialogs';
import { FileManager } from './components/FileManager';
import { Inspector } from './components/Inspector';
import { Icon, LogoMark } from './components/Icons';
import { LeftDock } from './components/LeftDock';
import { SAMPLES, type SampleKind } from './core/sample';
import { flushWorkspace, useStore, type RightTab } from './store';
import { getLang, switchLang, tx, type Lang } from './i18n';

/** TH | EN — switching reloads the page (see i18n.ts); the Lab is saved first */
function LangSwitch() {
  const cur = getLang();
  const pick = (l: Lang) => {
    if (l === cur) return;
    flushWorkspace();
    switchLang(l);
  };
  return (
    <span className="lang-switch" role="group" aria-label="Language / ภาษา">
      {(['th', 'en'] as const).map((l) => (
        <button key={l} className={cur === l ? 'active' : ''} aria-pressed={cur === l} onClick={() => pick(l)} data-testid={`lang-${l}`} title={l === 'th' ? 'ภาษาไทย' : 'English'}>
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  );
}

type View = 'lab' | 'library' | 'manager';

/** Top navigation (dark): brand, the three views, the open Lab with its export status, language. */
function TopNav() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const dirty = useStore((s) => s.isDirty());
  const name = useStore((s) => s.lab.name);
  const autosaveOk = useStore((s) => s.autosaveOk);
  const views: [View, string, string, string][] = [
    ['lab', tx('พื้นที่ทำงาน Lab'), 'workspace', 'tab-lab'],
    ['library', tx('คลังคำสั่ง'), 'library', 'tab-library'],
    ['manager', tx('จัดการ Lab'), 'manager', 'tab-manager'],
  ];
  return (
    <header className="topbar">
      <div className="brand">
        <LogoMark />
        <span className="brand-name">Network Lab Studio</span>
      </div>
      <nav className="tabs" aria-label={tx('เมนูหลัก')}>
        {views.map(([v, label, icon, testId]) => (
          <button
            key={v}
            className={view === v ? 'active' : ''}
            aria-current={view === v ? 'page' : undefined}
            onClick={() => setView(v)}
            data-testid={testId}
          >
            <Icon name={icon} size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="lab-status" role="group" aria-label={tx('Lab ที่เปิดอยู่')}>
        <span className="lab-title" title={name} data-testid="lab-name">
          {name}
        </span>
        {dirty ? (
          <span className="status-chip dirty" title={tx('มีการแก้ไขที่ยังไม่ได้ Export')}>{tx('● ยังไม่ได้ Export')}</span>
        ) : (
          autosaveOk && <span className="status-chip saved" title={tx('บันทึกอัตโนมัติในเบราว์เซอร์นี้แล้ว')}>{tx('✓ บันทึกอัตโนมัติ')}</span>
        )}
      </div>
      <LangSwitch />
    </header>
  );
}

/** Toolbar (light) under the navigation: actions grouped as Lab file · Edit · Network · View. */
function Toolbar() {
  const view = useStore((s) => s.view);
  const request = useStore((s) => s.requestReplace);
  const exportLab = useStore((s) => s.exportLab);
  const importText = useStore((s) => s.importText);
  const openConnect = useStore((s) => s.openConnect);
  const leftOpen = useStore((s) => s.leftPanel !== null);
  const rightOpen = useStore((s) => s.rightOpen);
  const toggleLeft = useStore((s) => s.toggleLeft);
  const toggleRight = useStore((s) => s.toggleRight);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.history.past.length > 0);
  const canRedo = useStore((s) => s.history.future.length > 0);
  const flow = useReactFlow();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    importText(text, f.name);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="toolbar" role="toolbar" aria-label={tx('แถบเครื่องมือ Lab')}>
      <div className="tb-group" role="group" aria-label={tx('ไฟล์ Lab')}>
        <button className="tb-btn" onClick={() => request({ kind: 'new' })} data-testid="btn-new">
          <Icon name="filePlus" size={16} />
          <span>{tx('Lab ใหม่')}</span>
        </button>
        <button className="tb-btn" onClick={() => request({ kind: 'sample', which: 'office' })} data-testid="btn-sample">
          <Icon name="flask" size={16} />
          <span>{tx('เปิด Lab ตัวอย่าง')}</span>
        </button>
        <button className="tb-btn" onClick={() => request({ kind: 'sample', which: 'intervlan' })} data-testid="btn-sample2" title="Trunk, router-on-a-stick, static route">
          <span>Sample: Inter-VLAN</span>
        </button>
        <select
          className="tb-select"
          value=""
          onChange={(e) => e.target.value && request({ kind: 'sample', which: e.target.value as SampleKind })}
          aria-label={tx('เปิดโจทย์ Challenge')}
          title={tx('โจทย์ซ่อมเครือข่ายพร้อมปุ่ม Check')}
          data-testid="select-challenge"
        >
          <option value="">{tx('โจทย์ Challenge ▾')}</option>
          {(Object.keys(SAMPLES) as SampleKind[]).filter((k) => SAMPLES[k].challenge).map((k) => (
            <option key={k} value={k}>{SAMPLES[k].title}</option>
          ))}
        </select>
        <button className="tb-btn" onClick={() => fileRef.current?.click()} data-testid="btn-import">
          <Icon name="upload" size={16} />
          <span>{tx('นำเข้า')}</span>
        </button>
        <button className="tb-btn" onClick={exportLab} data-testid="btn-export">
          <Icon name="download" size={16} />
          <span>{tx('ส่งออก')}</span>
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} data-testid="import-file" />
      </div>
      <div className="tb-group" role="group" aria-label={tx('แก้ไข')}>
        <button className="tb-btn compactable" onClick={undo} disabled={!canUndo} title={tx('ย้อนกลับ (Ctrl+Z)')} data-testid="btn-undo">
          <Icon name="undo" size={16} />
          <span>{tx('ย้อนกลับ')}</span>
        </button>
        <button className="tb-btn compactable" onClick={redo} disabled={!canRedo} title={tx('ทำซ้ำ (Ctrl+Y)')} data-testid="btn-redo">
          <Icon name="redo" size={16} />
          <span>{tx('ทำซ้ำ')}</span>
        </button>
      </div>
      {view === 'lab' && (
        <>
          <div className="tb-group" role="group" aria-label={tx('เครือข่าย')}>
            <button className="tb-btn" onClick={() => openConnect()} data-testid="btn-connect">
              <Icon name="cable" size={16} />
              <span>{tx('เชื่อมสาย')}</span>
            </button>
          </div>
          <div className="tb-group" role="group" aria-label={tx('มุมมอง')}>
            <button className="tb-btn compactable" onClick={() => fitLab(flow)} title={tx('พอดีจอ')} data-testid="btn-fit">
              <Icon name="fit" size={16} />
              <span>{tx('พอดีจอ')}</span>
            </button>
            <button className="tb-btn compactable" onClick={toggleLeft} aria-pressed={leftOpen} title={tx('ย่อหรือขยายแผงซ้าย')} data-testid="toggle-left">
              <Icon name="panelLeft" size={16} />
              <span>{tx('แผงซ้าย')}</span>
            </button>
            <button className="tb-btn compactable" onClick={toggleRight} aria-pressed={rightOpen} title={tx('ซ่อนหรือแสดงแผงขวา')} data-testid="toggle-right">
              <Icon name="panelRight" size={16} />
              <span>{tx('แผงขวา')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function RightPanel() {
  const tab = useStore((s) => s.rightTab);
  const setTab = useStore((s) => s.setRightTab);
  const tabs: [RightTab, string][] = [
    ['details', tx('รายละเอียด')],
    ['console', 'Console'],
    ['inspector', 'Lab Inspector'],
  ];
  return (
    <aside className="right" aria-label={tx('แผงรายละเอียด')}>
      <div className="right-tabs" role="tablist">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)} data-testid={`rtab-${k}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="right-body">
        {tab === 'details' && <DetailsPanel />}
        {tab === 'console' && <Console />}
        {tab === 'inspector' && <Inspector />}
      </div>
    </aside>
  );
}

function Notice() {
  const n = useStore((s) => s.notice);
  const clear = useStore((s) => s.clearNotice);
  useEffect(() => {
    if (!n) return;
    const t = setTimeout(clear, n.kind === 'error' ? 9000 : 3500);
    return () => clearTimeout(t);
  }, [n, clear]);
  if (!n) return null;
  return (
    <div className={`notice ${n.kind}`} role="status" data-testid="notice" onClick={clear}>
      {n.text}
    </div>
  );
}

function RejectedLabsWarning() {
  const rejected = useStore((s) => s.rejected);
  const shown = useStore((s) => s.rejectedShown);
  const dismiss = useStore((s) => s.dismissRejected);
  const download = useStore((s) => s.downloadRejected);
  if (!shown || rejected.length === 0) return null;
  return (
    <div className="notice error autosave-warning" role="alert" data-testid="rejected-warning">{tx('⚠ พบ Lab ที่บันทึกไว้ {0} รายการที่เวอร์ชันนี้เปิดไม่ได้: {1} — ไม่ได้ลบทิ้ง: เก็บสำเนาไว้ในเบราว์เซอร์แล้ว', rejected.length, rejected.map((r) => r.name).join(', '))}<span className="muted small"> · {rejected[0].error}</span>{' '}
      <button onClick={download} data-testid="rejected-download">{tx('ดาวน์โหลดสำเนา')}</button>{' '}
      <button onClick={dismiss} data-testid="rejected-dismiss">{tx('ปิดข้อความนี้')}</button>
    </div>
  );
}

/** shown only when the clipboard refused the share link: the link to copy by hand */
function ShareLinkBox() {
  const url = useStore((s) => s.shareUrl);
  const clear = useStore((s) => s.clearShareUrl);
  if (!url) return null;
  return (
    <div className="notice share-box" role="status" data-testid="share-box">
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label={tx('ลิงก์แชร์')} data-testid="share-url" />
      <button onClick={clear}>{tx('ปิด')}</button>
    </div>
  );
}

function AutosaveWarning() {
  const ok = useStore((s) => s.autosaveOk);
  const exportLab = useStore((s) => s.exportLab);
  if (ok) return null;
  return (
    <div className="notice error autosave-warning" role="alert" data-testid="autosave-warning">{tx('⚠ เบราว์เซอร์ไม่ยอมให้บันทึกอัตโนมัติ (private mode, พื้นที่เต็ม หรือถูกบล็อก) — ปิดหน้านี้แล้วงานจะหาย กด')}{' '}<button onClick={exportLab} data-testid="autosave-export">Export</button>{' '}{tx('เพื่อเก็บเป็นไฟล์')}</div>
  );
}

/** tab title = lab name, with "●" while there are edits that were not exported yet */
function useDocumentTitle() {
  const name = useStore((s) => s.lab.name);
  const dirty = useStore((s) => s.isDirty());
  useEffect(() => {
    document.title = `${dirty ? '● ' : ''}${name || 'Lab'} — Network Lab Studio`;
  }, [name, dirty]);
}

export default function App() {
  const view = useStore((s) => s.view);
  const rightOpen = useStore((s) => s.rightOpen);
  useDocumentTitle();
  useEffect(() => {
    // Ctrl/Cmd+Z = undo, Ctrl+Y or Ctrl/Cmd+Shift+Z = redo — but never inside a text field (it has its own undo)
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      const k = e.key.toLowerCase();
      const st = useStore.getState();
      if (st.view !== 'lab') return;
      if (k === 'z' && !e.shiftKey) st.undo();
      else if (k === 'y' || (k === 'z' && e.shiftKey)) st.redo();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <ReactFlowProvider>
      <div className="app">
        <TopNav />
        <Toolbar />
        {/* messages stack at the bottom so they never cover the toolbar buttons */}
        <div className="notice-stack">
          <RejectedLabsWarning />
          <AutosaveWarning />
          <ShareLinkBox />
          <Notice />
        </div>
        {/* the lab view stays mounted (hidden) so the canvas keeps its viewport when switching tabs */}
        <div className="main" style={{ display: view === 'lab' ? 'flex' : 'none' }}>
          <LeftDock />
          <Canvas />
          {rightOpen && <RightPanel />}
        </div>
        {view === 'library' && <CommandLibrary />}
        {view === 'manager' && <FileManager />}
        <ConnectDialog />
        <ConfirmDialog />
        <ConfirmDeleteDialog />
      </div>
    </ReactFlowProvider>
  );
}
