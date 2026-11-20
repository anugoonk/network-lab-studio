/**
 * Canvas interaction modes (UI-03).
 *
 * Pure functions only: no DOM, no store, no React. The mode is UI state: it is never part of a Lab, is not saved and is
 * not exported. Select is today's behaviour (devices can be dragged, handles can start a cable); Pan only moves the
 * view; Connect only creates cables (devices stay where they are) and also lets a cable be started by clicking two
 * devices. Every cable, whatever the mode, is created through the same Connect dialog.
 */

export type CanvasMode = 'select' | 'pan' | 'connect';

export const CANVAS_MODES: readonly CanvasMode[] = ['select', 'pan', 'connect'];

export const DEFAULT_CANVAS_MODE: CanvasMode = 'select';

export function isCanvasMode(v: unknown): v is CanvasMode {
  return v === 'select' || v === 'pan' || v === 'connect';
}

/** The React Flow switches that depend on the mode. `select` equals React Flow's defaults, i.e. the behaviour before UI-03. */
export interface ModeFlags {
  nodesDraggable: boolean;
  nodesConnectable: boolean;
}

export function modeFlags(mode: CanvasMode): ModeFlags {
  switch (mode) {
    case 'pan':
      // the view moves, nothing else: devices cannot be dragged and no cable can be started by accident
      return { nodesDraggable: false, nodesConnectable: false };
    case 'connect':
      // devices stay put while cabling; handles stay connectable
      return { nodesDraggable: false, nodesConnectable: true };
    default:
      return { nodesDraggable: true, nodesConnectable: true };
  }
}

/** What a click on a device means in Connect mode, given the device clicked first (if any). */
export type ConnectClick =
  | { kind: 'start'; source: string }
  | { kind: 'finish'; source: string; target: string }
  | { kind: 'cancel' }
  | { kind: 'ignore' };

/**
 * `clickedHasPorts` is whether the clicked device has network ports at all (rack and UPS have none and can never be a cable
 * end): such a click is ignored, so it never starts a cable, finishes one or cancels a pending one.
 */
export function connectClick(pending: string | null, clicked: string, clickedHasPorts = true): ConnectClick {
  if (!clickedHasPorts) return { kind: 'ignore' };
  if (pending === null) return { kind: 'start', source: clicked };
  if (pending === clicked) return { kind: 'cancel' };
  return { kind: 'finish', source: pending, target: clicked };
}
