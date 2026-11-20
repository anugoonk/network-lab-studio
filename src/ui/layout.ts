// UI-04: preferences of the bottom Console dock (open/collapsed + height).
// They are UI state only: stored in localStorage under their OWN key (never inside a Lab, never exported, never shared)
// and every read/write is guarded, because storage can be missing (tests, private mode) or throw.

export const DOCK_PREFS_KEY = 'nls.ui.consoleDock.v1';
export const DOCK_MIN = 120;
export const DOCK_DEFAULT = 240;
export const DOCK_STEP = 24;
/** the dock may take at most this share of the centre column, so the canvas always keeps room */
export const DOCK_MAX_SHARE = 0.6;
/** absolute upper bound of a stored height (a corrupted or hostile value can never exceed it) */
export const DOCK_HARD_MAX = 1200;

export interface DockPrefs {
  open: boolean;
  height: number;
}

export const DEFAULT_DOCK: DockPrefs = { open: false, height: DOCK_DEFAULT };

/** whole pixels inside [DOCK_MIN, max]; anything that is not a finite number becomes the default height */
export function clampDockHeight(h: unknown, max: number = DOCK_HARD_MAX): number {
  if (typeof h !== 'number' || !Number.isFinite(h)) return Math.min(DOCK_DEFAULT, Math.max(DOCK_MIN, max));
  const hi = Math.max(DOCK_MIN, Math.min(DOCK_HARD_MAX, Math.floor(max)));
  return Math.min(hi, Math.max(DOCK_MIN, Math.round(h)));
}

/** the largest height the dock may have in a centre column of `columnHeight` px (unknown size: no limit but the hard one) */
export function dockMaxHeight(columnHeight: number): number {
  if (!Number.isFinite(columnHeight) || columnHeight <= 0) return DOCK_HARD_MAX;
  return Math.max(DOCK_MIN, Math.min(DOCK_HARD_MAX, Math.floor(columnHeight * DOCK_MAX_SHARE)));
}

/** tolerant parser: unknown, malformed or partly wrong data falls back to the defaults field by field */
export function parseDockPrefs(raw: string | null | undefined): DockPrefs {
  if (!raw) return { ...DEFAULT_DOCK };
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== 'object') return { ...DEFAULT_DOCK };
    const o = v as Record<string, unknown>;
    return {
      open: typeof o.open === 'boolean' ? o.open : DEFAULT_DOCK.open,
      height: typeof o.height === 'number' ? clampDockHeight(o.height) : DEFAULT_DOCK.height,
    };
  } catch {
    return { ...DEFAULT_DOCK };
  }
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

function defaultStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function loadDockPrefs(storage: Storage | undefined = defaultStorage()): DockPrefs {
  try {
    return parseDockPrefs(storage?.getItem(DOCK_PREFS_KEY));
  } catch {
    return { ...DEFAULT_DOCK };
  }
}

/** returns false when the browser refused the write (the dock still works for this session) */
export function saveDockPrefs(p: DockPrefs, storage: Storage | undefined = defaultStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(DOCK_PREFS_KEY, JSON.stringify({ open: !!p.open, height: clampDockHeight(p.height) }));
    return true;
  } catch {
    return false;
  }
}
