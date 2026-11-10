import { create } from 'zustand';
import { arubaRunningConfig } from './core/cli/aruba';
import { ciscoRunningConfig } from './core/cli/cisco';
import { executeLine, promptFor } from './core/cli/engine';
import { emptyGuide } from './core/guide';
import { isHostAddress, isValidMask, parseIp } from './core/ip';
import {
  NAME_RE,
  addDevice,
  addLink,
  configSignature,
  contentSignature,
  emptyLab,
  getDevice,
  removeDevice,
  removeLink,
  updateDevice,
} from './core/lab';
import { ping, type PingResult } from './core/network';
import { PROFILES } from './core/profiles';
import {
  loadWorkspaceDetailed,
  newLabId,
  parseImport,
  rejectedBundle,
  saveRejected,
  saveWorkspace,
  serializeExport,
  type LabEntry,
  type RejectedEntry,
} from './core/persist';
import { SAMPLES, buildSampleLab, type SampleKind } from './core/sample';
import { emptyHistory, reconcileCli, recordChange, redoStep, undoStep, type History } from './core/history';
import { applyStart, captureStart, emptyChallenge, evaluateChallenge, type ChallengeReport } from './core/challenge';
import type { Challenge, DeviceKind, Endpoint, Guide, Lab } from './core/types';

export type Selection = { type: 'device' | 'link'; id: string } | null;
export type RightTab = 'details' | 'console' | 'inspector';
export type View = 'lab' | 'library' | 'manager';
/** what is expanded on the left of the canvas: the labelled menu, the Lab Guide, or just the icon rail */
export type LeftPanel = 'menu' | 'guide' | 'challenge' | null;
export type { SampleKind };

/** last Check run; `sig` is the Lab config it was run against (so stale results can be flagged) */
export interface ChallengeRun {
  report: ChallengeReport;
  sig: string;
}

export interface TermLine {
  kind: 'cmd' | 'out' | 'hint' | 'sys';
  prompt?: string;
  text: string;
}

export type Pending =
  | { kind: 'new' }
  | { kind: 'sample'; which: SampleKind }
  | { kind: 'import'; lab: Lab; fileName: string };

export interface EntrySummary {
  id: string;
  name: string;
  updatedAt: number;
  devices: number;
  links: number;
  active: boolean;
  hasGuide: boolean;
}

interface State {
  lab: Lab;
  /** undo/redo stacks of the open Lab (session only); `labEpoch` changes whenever a different Lab is loaded */
  history: History;
  labEpoch: number;
  undo: () => void;
  redo: () => void;
  savedSig: string | null;
  /** id of the lab currently open; `others` holds every other saved lab */
  activeId: string;
  activeUpdatedAt: number;
  others: LabEntry[];

  selection: Selection;
  view: View;
  rightTab: RightTab;
  leftPanel: LeftPanel;
  rightOpen: boolean;
  hideLabels: boolean;
  transcripts: Record<string, TermLine[]>;
  pendingInput: { deviceId: string; text: string; n: number } | null;
  lastPing: PingResult | null;
  notice: { kind: 'ok' | 'error'; text: string } | null;
  connectDialog: { a?: string; b?: string } | null;
  confirm: Pending | null;
  confirmDelete: string[] | null;
  fitNonce: number;

  isDirty: () => boolean;
  /** saved Labs this version could not open; copies are kept in the browser and offered for download */
  rejected: RejectedEntry[];
  rejectedShown: boolean;
  dismissRejected: () => void;
  downloadRejected: () => void;
  /** false when the last autosave was refused by the browser (private mode, storage full or blocked) */
  autosaveOk: boolean;
  /** copies the device's running-config to the clipboard and reports the result as a notice */
  copyConfig: (deviceId: string) => Promise<void>;
  summaries: () => EntrySummary[];
  setView: (v: View) => void;
  setRightTab: (t: RightTab) => void;
  setLeftPanel: (p: LeftPanel) => void;
  toggleGuide: () => void;
  toggleChallenge: () => void;
  challengeRun: ChallengeRun | null;
  runChallenge: () => void;
  setChallenge: (c: Challenge | undefined) => void;
  /** put devices/cables back to the challenge's starting state (undoable); false when the lab has none */
  resetChallenge: () => boolean;
  /** use the lab as it is now as the challenge's starting state / forget the saved start */
  setChallengeStart: (on: boolean) => void;
  updateChallenge: (fn: (c: Challenge) => Challenge) => void;
  toggleMenu: () => void;
  /** header toggle: collapse whatever is expanded on the left, or expand the menu */
  toggleLeft: () => void;
  toggleRight: () => void;
  toggleHideLabels: () => void;
  select: (s: Selection) => void;
  openConsole: (deviceId: string) => void;
  say: (kind: 'ok' | 'error', text: string) => void;
  clearNotice: () => void;
  openConnect: (a?: string, b?: string) => void;
  closeConnect: () => void;

  addDeviceAt: (kind: DeviceKind, x: number, y: number) => string;
  moveDevice: (id: string, x: number, y: number) => void;
  renameDevice: (id: string, name: string) => string | null;
  renameLab: (name: string) => string | null;
  deleteSelection: () => void;
  connect: (a: Endpoint, b: Endpoint) => string | null;
  removeLinkById: (id: string) => void;
  setPcConfig: (id: string, ip: string, mask: string, gw: string) => string | null;

  setGuide: (g: Guide | undefined) => void;
  updateGuide: (fn: (g: Guide) => Guide) => void;

  exec: (deviceId: string, line: string) => void;
  clearTranscript: (deviceId: string) => void;
  insertIntoConsole: (deviceId: string, text: string) => void;
  runPing: (srcId: string, ip: string) => PingResult;

  requestReplace: (p: Pending) => void;
  confirmReplace: () => void;
  cancelReplace: () => void;
  exportLab: () => void;
  importText: (text: string, fileName: string) => string | null;

  // File Manager
  openLab: (id: string) => void;
  createLab: (kind: 'blank' | SampleKind) => string;
  duplicateLab: (id: string) => void;
  requestDeleteLabs: (ids: string[]) => void;
  confirmDeleteLabs: () => void;
  cancelDelete: () => void;
  exportEntry: (id: string) => void;
  importAsEntry: (text: string, fileName: string) => string | null;
}

function makeLab(kind: 'blank' | SampleKind): Lab {
  return kind === 'blank' ? emptyLab('New Lab') : SAMPLES[kind].build();
}

function initial(): { lab: Lab; savedSig: string | null; activeId: string; updatedAt: number; others: LabEntry[]; rejected: RejectedEntry[] } {
  const { ws, rejected } = loadWorkspaceDetailed();
  if (ws) {
    const active = ws.entries.find((e) => e.id === ws.activeId)!;
    return {
      lab: active.lab,
      savedSig: active.savedSig,
      activeId: active.id,
      updatedAt: active.updatedAt,
      others: ws.entries.filter((e) => e.id !== active.id),
      rejected,
    };
  }
  const lab = buildSampleLab();
  return { lab, savedSig: contentSignature(lab), activeId: newLabId(), updatedAt: Date.now(), others: [], rejected };
}

const init = initial();

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fileName = (lab: Lab) => `${lab.name.replace(/[^\w-]+/g, '_') || 'lab'}.nls.json`;

let applyingHistory = false;

export const useStore = create<State>((set, get) => {
  const setLab = (lab: Lab) => set({ lab });

  /** the open lab as a saved entry (used when switching labs and when persisting) */
  const activeEntry = (): LabEntry => {
    const s = get();
    return { id: s.activeId, name: s.lab.name, updatedAt: s.activeUpdatedAt, savedSig: s.savedSig, lab: s.lab };
  };

  const loadEntry = (e: LabEntry, others: LabEntry[]) => {
    set({
      labEpoch: get().labEpoch + 1,
      lab: e.lab,
      savedSig: e.savedSig,
      activeId: e.id,
      activeUpdatedAt: e.updatedAt,
      others,
      selection: null,
      transcripts: {},
      lastPing: null,
      challengeRun: null,
      confirm: null,
      view: 'lab',
      rightTab: 'details',
      leftPanel: e.lab.guide ? 'guide' : 'menu',
      fitNonce: get().fitNonce + 1,
    });
  };

  const applyHistory = (lab: Lab, history: History) => {
    applyingHistory = true;
    try {
      const sel = get().selection;
      const alive = !sel || (sel.type === 'device' ? lab.devices.some((d) => d.id === sel.id) : lab.links.some((l) => l.id === sel.id));
      set({ lab, history, selection: alive ? sel : null });
    } finally {
      applyingHistory = false;
    }
  };

  const replaceLab = (lab: Lab) => {
    set({
      labEpoch: get().labEpoch + 1,
      lab,
      savedSig: contentSignature(lab),
      activeUpdatedAt: Date.now(),
      selection: null,
      transcripts: {},
      lastPing: null,
      challengeRun: null,
      confirm: null,
      leftPanel: lab.challenge ? 'challenge' : lab.guide ? 'guide' : get().leftPanel === 'guide' ? 'menu' : get().leftPanel,
      fitNonce: get().fitNonce + 1,
    });
  };

  return {
    lab: init.lab,
    history: emptyHistory(),
    labEpoch: 0,
    undo: () => {
      const s = get();
      const r = undoStep(s.history, s.lab);
      if (r) applyHistory(r.lab, r.history);
    },
    redo: () => {
      const s = get();
      const r = redoStep(s.history, s.lab);
      if (r) applyHistory(r.lab, r.history);
    },
    savedSig: init.savedSig,
    activeId: init.activeId,
    activeUpdatedAt: init.updatedAt,
    others: init.others,

    selection: null,
    view: 'lab',
    rightTab: 'details',
    leftPanel: init.lab.guide ? 'guide' : 'menu',
    rightOpen: true,
    hideLabels: false,
    transcripts: {},
    pendingInput: null,
    lastPing: null,
    challengeRun: null,
    notice: null,
    connectDialog: null,
    confirm: null,
    confirmDelete: null,
    fitNonce: 0,

    isDirty: () => contentSignature(get().lab) !== get().savedSig,
    autosaveOk: true,
    rejected: init.rejected,
    rejectedShown: init.rejected.length > 0,
    dismissRejected: () => set({ rejectedShown: false }),
    downloadRejected: () => {
      const r = get().rejected;
      if (r.length) download('nls-recovered-labs.json', rejectedBundle(r));
    },
    copyConfig: async (deviceId) => {
      const dev = getDevice(get().lab, deviceId);
      if (!dev) return;
      const p = PROFILES[dev.kind];
      if (!p.hasCli || p.isHost) {
        set({ notice: { kind: 'error', text: `${dev.name} ไม่มี running-config ให้คัดลอก` } });
        return;
      }
      const text = (p.vendor === 'aruba' ? arubaRunningConfig(dev) : ciscoRunningConfig(dev)).join('\n');
      try {
        await navigator.clipboard.writeText(text);
        set({ notice: { kind: 'ok', text: `คัดลอก running-config ของ ${dev.name} แล้ว (${text.split('\n').length} บรรทัด)` } });
      } catch {
        set({ notice: { kind: 'error', text: 'คัดลอกไม่สำเร็จ — เบราว์เซอร์ไม่อนุญาตให้เขียน clipboard (ลองใช้ show running-config แล้วลากคลุมแทน)' } });
      }
    },
    summaries: () => {
      const s = get();
      const all = [activeEntry(), ...s.others];
      return all
        .map((e) => ({
          id: e.id,
          name: e.lab.name,
          updatedAt: e.updatedAt,
          devices: e.lab.devices.length,
          links: e.lab.links.length,
          active: e.id === s.activeId,
          hasGuide: !!e.lab.guide,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },
    setView: (view) => set({ view }),
    setRightTab: (rightTab) => set({ rightTab, rightOpen: true }),
    setLeftPanel: (leftPanel) => set({ leftPanel }),
    toggleGuide: () => set({ leftPanel: get().leftPanel === 'guide' ? null : 'guide', view: 'lab' }),
    toggleChallenge: () => set({ leftPanel: get().leftPanel === 'challenge' ? null : 'challenge', view: 'lab' }),
    runChallenge: () => {
      const lab = get().lab;
      if (!lab.challenge) return;
      set({ challengeRun: { report: evaluateChallenge(lab, lab.challenge), sig: configSignature(lab) } });
    },
    setChallenge: (c) => {
      const lab = get().lab;
      const next = { ...lab };
      if (c) next.challenge = c;
      else delete next.challenge;
      set({ lab: next, challengeRun: null });
    },
    resetChallenge: () => {
      const s = get();
      const target = applyStart(s.lab);
      if (!target) return false;
      const next = reconcileCli(target, s.lab);
      const sel = s.selection;
      const alive = !sel || (sel.type === 'device' ? next.devices.some((d) => d.id === sel.id) : next.links.some((l) => l.id === sel.id));
      // a normal Lab change: the history subscriber records it, so "Reset" can be undone
      set({ lab: next, challengeRun: null, transcripts: {}, lastPing: null, selection: alive ? sel : null });
      return true;
    },
    setChallengeStart: (on) => {
      const lab = get().lab;
      if (!lab.challenge) return;
      const challenge = { ...lab.challenge };
      if (on) challenge.start = captureStart(lab);
      else delete challenge.start;
      setLab({ ...lab, challenge });
    },
    updateChallenge: (fn) => {
      const lab = get().lab;
      setLab({ ...lab, challenge: fn(lab.challenge ?? emptyChallenge()) });
    },
    toggleMenu: () => set({ leftPanel: get().leftPanel === 'menu' ? null : 'menu' }),
    toggleLeft: () => set({ leftPanel: get().leftPanel === null ? 'menu' : null }),
    toggleRight: () => set({ rightOpen: !get().rightOpen }),
    toggleHideLabels: () => set({ hideLabels: !get().hideLabels }),
    select: (selection) => set({ selection }),
    openConsole: (deviceId) => set({ selection: { type: 'device', id: deviceId }, rightTab: 'console', rightOpen: true, view: 'lab' }),
    say: (kind, text) => set({ notice: { kind, text } }),
    clearNotice: () => set({ notice: null }),
    openConnect: (a, b) => set({ connectDialog: { a, b } }),
    closeConnect: () => set({ connectDialog: null }),

    addDeviceAt: (kind, x, y) => {
      const r = addDevice(get().lab, kind, x, y);
      set({ lab: r.lab, selection: { type: 'device', id: r.device.id }, rightTab: 'details' });
      return r.device.id;
    },
    moveDevice: (id, x, y) => setLab(updateDevice(get().lab, id, (d) => ({ ...d, x, y }))),
    renameDevice: (id, name) => {
      const n = name.trim();
      if (!NAME_RE.test(n)) return 'ชื่อใช้ได้เฉพาะ A-Z, 0-9, - และ _ (ขึ้นต้นด้วยตัวอักษรหรือตัวเลข ยาวไม่เกิน 24 ตัว)';
      setLab(updateDevice(get().lab, id, (d) => ({ ...d, name: n })));
      return null;
    },
    renameLab: (name) => {
      const n = name.trim();
      if (!n) return 'ชื่อ Lab ต้องไม่ว่าง';
      if (n.length > 120) return 'ชื่อ Lab ยาวเกิน 120 ตัวอักษร';
      setLab({ ...get().lab, name: n });
      return null;
    },
    deleteSelection: () => {
      const { selection, lab } = get();
      if (!selection) return;
      if (selection.type === 'device') setLab(removeDevice(lab, selection.id));
      else setLab(removeLink(lab, selection.id));
      set({ selection: null });
    },
    connect: (a, b) => {
      const r = addLink(get().lab, a, b);
      if (r.error) return r.error;
      setLab(r.lab);
      return null;
    },
    removeLinkById: (id) => {
      setLab(removeLink(get().lab, id));
      set({ selection: null });
    },
    setPcConfig: (id, ip, mask, gw) => {
      const lab = get().lab;
      const d = getDevice(lab, id);
      if (!d) return 'ไม่พบอุปกรณ์';
      const ipT = ip.trim();
      const maskT = mask.trim();
      const gwT = gw.trim();
      if (ipT === '' && maskT === '') {
        if (gwT !== '') return 'ต้องกำหนด IP และ subnet mask ก่อนตั้ง gateway';
      } else {
        if (parseIp(ipT) === null) return 'IPv4 address ไม่ถูกต้อง (รูปแบบ x.x.x.x)';
        if (!isValidMask(maskT)) return 'Subnet mask ไม่ถูกต้อง (เช่น 255.255.255.0)';
        if (!isHostAddress(ipT, maskT)) return 'IP นี้ใช้เป็น host address ใน subnet นี้ไม่ได้ (network/broadcast/ช่วงพิเศษ)';
        if (gwT !== '' && parseIp(gwT) === null) return 'Default gateway ไม่ถูกต้อง';
      }
      setLab(
        updateDevice(lab, id, (dd) => ({
          ...dd,
          gateway: gwT === '' ? null : gwT,
          ifaces: dd.ifaces.map((i) => ({ ...i, ip: ipT === '' ? null : ipT, mask: maskT === '' ? null : maskT })),
        })),
      );
      return null;
    },

    setGuide: (g) => {
      const lab = get().lab;
      const next: Lab = { ...lab };
      if (g) next.guide = g;
      else delete next.guide;
      setLab(next);
    },
    updateGuide: (fn) => {
      const lab = get().lab;
      setLab({ ...lab, guide: fn(lab.guide ?? emptyGuide()) });
    },

    exec: (deviceId, line) => {
      const lab = get().lab;
      const res = executeLine(lab, deviceId, line);
      const prev = get().transcripts[deviceId] ?? [];
      const next: TermLine[] = [...prev];
      if (res.clear) next.length = 0;
      next.push({ kind: 'cmd', prompt: res.prompt, text: line });
      for (const o of res.output) next.push({ kind: 'out', text: o });
      if (res.hintTh) next.push({ kind: 'hint', text: res.hintTh });
      const transcripts = { ...get().transcripts, [deviceId]: next.slice(-500) };
      if (res.clear) transcripts[deviceId] = [];
      set({ lab: res.lab, transcripts });
      // remember terminal pings for the Lab Inspector
      const m = /^ping\s+(\d+\.\d+\.\d+\.\d+)\s*$/i.exec(line.trim());
      if (m && parseIp(m[1]) !== null) set({ lastPing: ping(res.lab, deviceId, m[1]) });
    },
    clearTranscript: (deviceId) => set({ transcripts: { ...get().transcripts, [deviceId]: [] } }),
    insertIntoConsole: (deviceId, text) => {
      set({
        pendingInput: { deviceId, text, n: (get().pendingInput?.n ?? 0) + 1 },
        selection: { type: 'device', id: deviceId },
        rightTab: 'console',
        rightOpen: true,
        view: 'lab',
      });
    },
    runPing: (srcId, ip) => {
      const r = ping(get().lab, srcId, ip);
      set({ lastPing: r });
      return r;
    },

    requestReplace: (p) => {
      set({ confirm: p });
      if (!get().isDirty()) get().confirmReplace();
    },
    confirmReplace: () => {
      const p = get().confirm;
      if (!p) return;
      if (p.kind === 'new') replaceLab(emptyLab('New Lab'));
      else if (p.kind === 'sample') replaceLab(makeLab(p.which));
      else replaceLab(p.lab);
      set({
        view: 'lab',
        notice: {
          kind: 'ok',
          text:
            p.kind === 'import'
              ? `นำเข้า ${p.fileName} สำเร็จ`
              : p.kind === 'new'
                ? 'สร้าง Lab ใหม่แล้ว'
                : SAMPLES[p.which].challenge
                  ? `เปิดโจทย์ ${SAMPLES[p.which].title} แล้ว`
                  : `เปิด Sample Lab: ${SAMPLES[p.which].title} แล้ว`,
        },
      });
    },
    cancelReplace: () => set({ confirm: null }),
    exportLab: () => {
      const lab = get().lab;
      download(fileName(lab), serializeExport(lab));
      set({ savedSig: contentSignature(lab), notice: { kind: 'ok', text: 'Export Lab เป็น JSON แล้ว' } });
    },
    importText: (text, name) => {
      const r = parseImport(text);
      if (!r.ok) {
        set({ notice: { kind: 'error', text: `นำเข้าไม่สำเร็จ (Lab ปัจจุบันไม่ถูกเปลี่ยน): ${r.error}` } });
        return r.error;
      }
      get().requestReplace({ kind: 'import', lab: r.lab, fileName: name });
      return null;
    },

    // ───────── File Manager ─────────
    openLab: (id) => {
      const s = get();
      if (id === s.activeId) return set({ view: 'lab' });
      const target = s.others.find((e) => e.id === id);
      if (!target) return;
      loadEntry(target, [...s.others.filter((e) => e.id !== id), activeEntry()]);
    },
    createLab: (kind) => {
      const s = get();
      const lab = makeLab(kind);
      const entry: LabEntry = { id: newLabId(), name: lab.name, updatedAt: Date.now(), savedSig: contentSignature(lab), lab };
      loadEntry(entry, [...s.others, activeEntry()]);
      set({
        notice: { kind: 'ok', text: kind === 'blank' ? 'สร้าง Lab ใหม่ในรายการแล้ว' : `เพิ่ม Sample Lab "${lab.name}" ในรายการแล้ว` },
      });
      return entry.id;
    },
    duplicateLab: (id) => {
      const s = get();
      const src = id === s.activeId ? activeEntry() : s.others.find((e) => e.id === id);
      if (!src) return;
      const lab: Lab = { ...structuredClone(src.lab), name: `${src.lab.name} (สำเนา)`.slice(0, 120) };
      const copy: LabEntry = { id: newLabId(), name: lab.name, updatedAt: Date.now(), savedSig: contentSignature(lab), lab };
      set({ others: [...s.others, copy], notice: { kind: 'ok', text: `ทำสำเนา "${src.lab.name}" แล้ว` } });
    },
    requestDeleteLabs: (ids) => set({ confirmDelete: ids.length ? ids : null }),
    cancelDelete: () => set({ confirmDelete: null }),
    confirmDeleteLabs: () => {
      const s = get();
      const ids = new Set(s.confirmDelete ?? []);
      if (!ids.size) return;
      const remaining = s.others.filter((e) => !ids.has(e.id));
      if (!ids.has(s.activeId)) {
        set({ others: remaining, confirmDelete: null, notice: { kind: 'ok', text: `ลบ ${ids.size} Lab แล้ว` } });
        return;
      }
      // the open lab was deleted: open the most recent remaining one, or start a blank lab
      const next = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      if (next) loadEntry(next, remaining.filter((e) => e.id !== next.id));
      else {
        const lab = emptyLab('New Lab');
        loadEntry({ id: newLabId(), name: lab.name, updatedAt: Date.now(), savedSig: contentSignature(lab), lab }, []);
      }
      set({ view: 'manager', confirmDelete: null, notice: { kind: 'ok', text: `ลบ ${ids.size} Lab แล้ว` } });
    },
    exportEntry: (id) => {
      const s = get();
      if (id === s.activeId) return get().exportLab();
      const e = s.others.find((x) => x.id === id);
      if (!e) return;
      download(fileName(e.lab), serializeExport(e.lab));
      set({
        others: s.others.map((x) => (x.id === id ? { ...x, savedSig: contentSignature(x.lab) } : x)),
        notice: { kind: 'ok', text: `Export "${e.lab.name}" แล้ว` },
      });
    },
    importAsEntry: (text, name) => {
      const r = parseImport(text);
      if (!r.ok) {
        set({ notice: { kind: 'error', text: `นำเข้าไม่สำเร็จ (ไม่มีอะไรถูกเปลี่ยน): ${r.error}` } });
        return r.error;
      }
      const e: LabEntry = { id: newLabId(), name: r.lab.name, updatedAt: Date.now(), savedSig: contentSignature(r.lab), lab: r.lab };
      set({ others: [...get().others, e], notice: { kind: 'ok', text: `นำเข้า ${name} เป็น "${r.lab.name}" ในรายการแล้ว` } });
      return null;
    },
  };
});

// ───────── autosave (whole workspace, debounced) ─────────
let timer: ReturnType<typeof setTimeout> | undefined;
let lastSig = contentSignature(init.lab);

let rejectedKept = false;

function persistNow() {
  // Labs this version could not open: keep a copy BEFORE the autosave rewrites the workspace without them
  if (!rejectedKept) {
    rejectedKept = true;
    const r = useStore.getState().rejected;
    if (r.length) saveRejected(r);
  }
  const s = useStore.getState();
  const sig = contentSignature(s.lab);
  if (sig !== lastSig) {
    lastSig = sig;
    useStore.setState({ activeUpdatedAt: Date.now() });
  }
  const st = useStore.getState();
  const ok = saveWorkspace({
    activeId: st.activeId,
    entries: [{ id: st.activeId, name: st.lab.name, updatedAt: st.activeUpdatedAt, savedSig: st.savedSig, lab: st.lab }, ...st.others],
  });
  if (ok !== st.autosaveOk) useStore.setState({ autosaveOk: ok });
}

// undo/redo recording: every user-made Lab change is pushed onto the history; loading another Lab resets it
useStore.subscribe((s, prev) => {
  if (s.lab === prev.lab || applyingHistory) return;
  if (s.labEpoch !== prev.labEpoch) {
    useStore.setState({ history: emptyHistory() });
    return;
  }
  const h = recordChange(s.history, prev.lab, s.lab, Date.now());
  if (h !== s.history) useStore.setState({ history: h });
});

useStore.subscribe((s, prev) => {
  if (s.lab === prev.lab && s.savedSig === prev.savedSig && s.others === prev.others && s.activeId === prev.activeId) return;
  clearTimeout(timer);
  timer = setTimeout(persistNow, 250);
});

/** flush right away (used when the page is closed) */
export function flushWorkspace() {
  clearTimeout(timer);
  persistNow();
}

export { promptFor };
