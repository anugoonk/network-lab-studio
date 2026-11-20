import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DOCK,
  DOCK_DEFAULT,
  DOCK_HARD_MAX,
  DOCK_MIN,
  DOCK_PREFS_KEY,
  clampDockHeight,
  dockMaxHeight,
  loadDockPrefs,
  parseDockPrefs,
  saveDockPrefs,
} from '../src/ui/layout';

// UI-04: the Console dock's preferences are UI state kept in their own storage key (the DOM behaviour is in e2e/console-dock.spec.ts)

/** minimal in-memory Storage */
function memory(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

describe('dock height rules', () => {
  it('clamps to [DOCK_MIN, max] in whole pixels', () => {
    expect(clampDockHeight(10)).toBe(DOCK_MIN);
    expect(clampDockHeight(DOCK_MIN)).toBe(DOCK_MIN);
    expect(clampDockHeight(300.4)).toBe(300);
    expect(clampDockHeight(300, 250)).toBe(250);
    expect(clampDockHeight(99999)).toBe(DOCK_HARD_MAX);
  });

  it('turns anything that is not a finite number into the default height', () => {
    for (const bad of [NaN, Infinity, -Infinity, '240', null, undefined, {}, []]) expect(clampDockHeight(bad)).toBe(DOCK_DEFAULT);
  });

  it('never returns less than the minimum even when the column is tiny', () => {
    expect(clampDockHeight(500, 40)).toBe(DOCK_MIN);
    expect(dockMaxHeight(100)).toBe(DOCK_MIN);
  });

  it('the dock may take at most 60% of the centre column', () => {
    expect(dockMaxHeight(1000)).toBe(600);
    expect(dockMaxHeight(700)).toBe(420);
    // a column whose size is not known (yet) imposes no limit except the hard one: a stored height must not be cut at start-up
    expect(dockMaxHeight(0)).toBe(DOCK_HARD_MAX);
    expect(dockMaxHeight(NaN)).toBe(DOCK_HARD_MAX);
  });
});

describe('dock preferences', () => {
  it('starts collapsed with the default height', () => {
    expect(DEFAULT_DOCK).toEqual({ open: false, height: DOCK_DEFAULT });
    expect(parseDockPrefs(null)).toEqual(DEFAULT_DOCK);
    expect(parseDockPrefs('')).toEqual(DEFAULT_DOCK);
  });

  it('round-trips through its own storage key', () => {
    const st = memory();
    expect(saveDockPrefs({ open: true, height: 333 }, st)).toBe(true);
    expect(Object.keys(st.data)).toEqual([DOCK_PREFS_KEY]);
    expect(loadDockPrefs(st)).toEqual({ open: true, height: 333 });
  });

  it('the key is not a Lab key (Lab storage and the saved workspace are untouched)', () => {
    expect(DOCK_PREFS_KEY).not.toBe('nls.lab.v1');
    expect(DOCK_PREFS_KEY).not.toBe('nls.workspace.v2');
    expect(DOCK_PREFS_KEY).not.toBe('nls.lang');
    const st = memory({ 'nls.lab.v1': 'LAB', 'nls.workspace.v2': 'WS' });
    saveDockPrefs({ open: true, height: 200 }, st);
    expect(st.data['nls.lab.v1']).toBe('LAB');
    expect(st.data['nls.workspace.v2']).toBe('WS');
  });

  it('corrupt, malformed or hostile stored values fall back field by field', () => {
    expect(parseDockPrefs('not json')).toEqual(DEFAULT_DOCK);
    expect(parseDockPrefs('42')).toEqual(DEFAULT_DOCK);
    expect(parseDockPrefs('null')).toEqual(DEFAULT_DOCK);
    expect(parseDockPrefs('{"open":"yes","height":"tall"}')).toEqual(DEFAULT_DOCK);
    expect(parseDockPrefs('{"open":true}')).toEqual({ open: true, height: DOCK_DEFAULT });
    expect(parseDockPrefs('{"open":false,"height":5}')).toEqual({ open: false, height: DOCK_MIN });
    expect(parseDockPrefs('{"open":true,"height":1e9}')).toEqual({ open: true, height: DOCK_HARD_MAX });
  });

  it('storage that is missing or throws never breaks the dock', () => {
    expect(loadDockPrefs(undefined)).toEqual(DEFAULT_DOCK);
    expect(saveDockPrefs({ open: true, height: 300 }, undefined)).toBe(false);
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadDockPrefs(broken)).toEqual(DEFAULT_DOCK);
    expect(saveDockPrefs({ open: true, height: 300 }, broken)).toBe(false);
  });

  it('a stored height is clamped when it is saved', () => {
    const st = memory();
    saveDockPrefs({ open: true, height: 50 }, st);
    expect(loadDockPrefs(st).height).toBe(DOCK_MIN);
  });
});
