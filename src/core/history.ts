import { contentSignature, initialMode } from './lab';
import type { Device, Lab } from './types';

/** Undo/redo for the open Lab. Pure data + functions so it can be unit-tested without the store. */
export interface History {
  past: Lab[];
  future: Lab[];
  /** category of the last recorded change; consecutive changes of the same category are merged */
  lastKey: string | null;
  lastAt: number;
}

export const HISTORY_LIMIT = 100;
/** typing in the Guide or dragging a device is one undo step, not one per keystroke / mouse move */
export const COALESCE_MS = 1500;

export const emptyHistory = (): History => ({ past: [], future: [], lastKey: null, lastAt: 0 });

const sig = (l: Lab, omit: 'pos' | 'guide' | 'challenge' | null): string =>
  JSON.stringify({
    n: l.name,
    d: l.devices.map((d) => ({ ...d, cli: undefined, x: omit === 'pos' ? 0 : d.x, y: omit === 'pos' ? 0 : d.y })),
    l: l.links,
    g: omit === 'guide' ? null : l.guide,
    c: omit === 'challenge' ? null : l.challenge,
  });

/** Which kind of edit turned `prev` into `next`, when it is the kind that arrives in a stream of tiny edits. */
export function changeKey(prev: Lab, next: Lab): string | null {
  if (sig(prev, 'pos') === sig(next, 'pos')) return 'move';
  if (sig(prev, 'guide') === sig(next, 'guide')) return 'guide';
  if (sig(prev, 'challenge') === sig(next, 'challenge')) return 'challenge';
  return null;
}

/** Called after every Lab change made by the user (not by undo/redo). Returns the same object when nothing needs recording. */
export function recordChange(h: History, prev: Lab, next: Lab, now: number): History {
  // CLI mode / command history alone is not an edit
  if (contentSignature(prev) === contentSignature(next)) return h;
  const key = changeKey(prev, next);
  if (key !== null && key === h.lastKey && now - h.lastAt < COALESCE_MS && h.past.length > 0) {
    return { ...h, future: [], lastAt: now };
  }
  return { past: [...h.past, prev].slice(-HISTORY_LIMIT), future: [], lastKey: key, lastAt: now };
}

const deviceConfig = (d: Device): string =>
  JSON.stringify([d.name, d.ifaces, d.vlans, d.subifs, d.svis, d.routes, d.gateway, d.startupConfig]);

/**
 * `target` is the Lab being restored. Devices whose configuration differs from `current` get their CLI session
 * reset to the starting mode (the old mode/context may point at an interface that no longer exists); everything
 * else keeps its live terminal state and command history.
 */
export function reconcileCli(target: Lab, current: Lab): Lab {
  return {
    ...target,
    devices: target.devices.map((d) => {
      const cur = current.devices.find((x) => x.id === d.id);
      if (!cur) return d;
      if (deviceConfig(cur) === deviceConfig(d)) return { ...d, cli: cur.cli };
      return { ...d, cli: { mode: initialMode(d.kind), ctxIface: null, ctxVlan: null, history: cur.cli.history } };
    }),
  };
}

export function undoStep(h: History, current: Lab): { history: History; lab: Lab } | null {
  const target = h.past[h.past.length - 1];
  if (!target) return null;
  return {
    lab: reconcileCli(target, current),
    history: { past: h.past.slice(0, -1), future: [...h.future, current], lastKey: null, lastAt: 0 },
  };
}

export function redoStep(h: History, current: Lab): { history: History; lab: Lab } | null {
  const target = h.future[h.future.length - 1];
  if (!target) return null;
  return {
    lab: reconcileCli(target, current),
    history: { past: [...h.past, current].slice(-HISTORY_LIMIT), future: h.future.slice(0, -1), lastKey: null, lastAt: 0 },
  };
}
