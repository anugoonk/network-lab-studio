import { create } from 'zustand';
import { executeLine, promptFor } from './core/cli/engine';
import { isHostAddress, isValidMask, parseIp } from './core/ip';
import {
  addDevice,
  addLink,
  contentSignature,
  getDevice,
  removeDevice,
  removeLink,
  updateDevice,
  NAME_RE,
} from './core/lab';
import { ping, type PingResult } from './core/network';
import { loadStored, saveStored, serializeExport, parseImport } from './core/persist';
import { buildSampleLab } from './core/sample';
import { emptyLab } from './core/lab';
import type { DeviceKind, Endpoint, Lab } from './core/types';

export type Selection = { type: 'device' | 'link'; id: string } | null;
export type RightTab = 'details' | 'console' | 'inspector';

export interface TermLine {
  kind: 'cmd' | 'out' | 'hint' | 'sys';
  prompt?: string;
  text: string;
}

export type Pending =
  | { kind: 'new' }
  | { kind: 'sample' }
  | { kind: 'import'; lab: Lab; fileName: string };

interface State {
  lab: Lab;
  savedSig: string | null;
  selection: Selection;
  view: 'lab' | 'library';
  rightTab: RightTab;
  leftOpen: boolean;
  rightOpen: boolean;
  transcripts: Record<string, TermLine[]>;
  pendingInput: { deviceId: string; text: string; n: number } | null;
  lastPing: PingResult | null;
  notice: { kind: 'ok' | 'error'; text: string } | null;
  connectDialog: { a?: string; b?: string } | null;
  confirm: Pending | null;
  fitNonce: number;

  isDirty: () => boolean;
  setView: (v: 'lab' | 'library') => void;
  setRightTab: (t: RightTab) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  select: (s: Selection) => void;
  openConsole: (deviceId: string) => void;
  say: (kind: 'ok' | 'error', text: string) => void;
  clearNotice: () => void;
  openConnect: (a?: string, b?: string) => void;
  closeConnect: () => void;

  addDeviceAt: (kind: DeviceKind, x: number, y: number) => string;
  moveDevice: (id: string, x: number, y: number) => void;
  renameDevice: (id: string, name: string) => string | null;
  deleteSelection: () => void;
  connect: (a: Endpoint, b: Endpoint) => string | null;
  removeLinkById: (id: string) => void;
  setPcConfig: (id: string, ip: string, mask: string, gw: string) => string | null;

  exec: (deviceId: string, line: string) => void;
  clearTranscript: (deviceId: string) => void;
  insertIntoConsole: (deviceId: string, text: string) => void;
  runPing: (srcId: string, ip: string) => PingResult;

  requestReplace: (p: Pending) => void;
  confirmReplace: () => void;
  cancelReplace: () => void;
  exportLab: () => void;
  importText: (text: string, fileName: string) => string | null;
}

function initial(): { lab: Lab; savedSig: string | null } {
  const stored = loadStored();
  if (stored) return stored;
  const lab = buildSampleLab();
  return { lab, savedSig: contentSignature(lab) };
}

const init = initial();

export const useStore = create<State>((set, get) => {
  const setLab = (lab: Lab) => set({ lab });

  const replaceLab = (lab: Lab) => {
    set({
      lab,
      savedSig: contentSignature(lab),
      selection: null,
      transcripts: {},
      lastPing: null,
      confirm: null,
      fitNonce: get().fitNonce + 1,
    });
  };

  return {
    lab: init.lab,
    savedSig: init.savedSig,
    selection: null,
    view: 'lab',
    rightTab: 'details',
    leftOpen: true,
    rightOpen: true,
    transcripts: {},
    pendingInput: null,
    lastPing: null,
    notice: null,
    connectDialog: null,
    confirm: null,
    fitNonce: 0,

    isDirty: () => contentSignature(get().lab) !== get().savedSig,
    setView: (view) => set({ view }),
    setRightTab: (rightTab) => set({ rightTab, rightOpen: true }),
    toggleLeft: () => set({ leftOpen: !get().leftOpen }),
    toggleRight: () => set({ rightOpen: !get().rightOpen }),
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
      else if (p.kind === 'sample') replaceLab(buildSampleLab());
      else replaceLab(p.lab);
      set({ notice: { kind: 'ok', text: p.kind === 'import' ? `นำเข้า ${p.fileName} สำเร็จ` : p.kind === 'new' ? 'สร้าง Lab ใหม่แล้ว' : 'เปิด Sample Lab แล้ว' } });
    },
    cancelReplace: () => set({ confirm: null }),
    exportLab: () => {
      const lab = get().lab;
      const blob = new Blob([serializeExport(lab)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${lab.name.replace(/[^\w-]+/g, '_') || 'lab'}.nls.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      set({ savedSig: contentSignature(lab), notice: { kind: 'ok', text: 'Export Lab เป็น JSON แล้ว' } });
    },
    importText: (text, fileName) => {
      const r = parseImport(text);
      if (!r.ok) {
        set({ notice: { kind: 'error', text: `นำเข้าไม่สำเร็จ (Lab ปัจจุบันไม่ถูกเปลี่ยน): ${r.error}` } });
        return r.error;
      }
      get().requestReplace({ kind: 'import', lab: r.lab, fileName });
      return null;
    },
  };
});

// ───────── autosave ─────────
let timer: ReturnType<typeof setTimeout> | undefined;
useStore.subscribe((s, prev) => {
  if (s.lab === prev.lab && s.savedSig === prev.savedSig) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const st = useStore.getState();
    saveStored({ lab: st.lab, savedSig: st.savedSig });
  }, 250);
});

export { promptFor };
