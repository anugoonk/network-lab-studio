import { describe, expect, it } from 'vitest';
import { CANVAS_MODES, DEFAULT_CANVAS_MODE, connectClick, isCanvasMode, modeFlags } from '../src/ui/canvasMode';

// UI-03: pure rules behind the three canvas interaction modes (the DOM behaviour is covered by e2e/canvas-modes.spec.ts)

describe('canvas interaction modes', () => {
  it('has exactly Select, Pan and Connect, with Select as the default', () => {
    expect([...CANVAS_MODES]).toEqual(['select', 'pan', 'connect']);
    expect(DEFAULT_CANVAS_MODE).toBe('select');
  });

  it('recognises only the three mode names', () => {
    for (const m of CANVAS_MODES) expect(isCanvasMode(m)).toBe(true);
    for (const bad of ['', 'Select', 'drag', 'PAN', undefined, null, 1, {}]) expect(isCanvasMode(bad)).toBe(false);
  });

  it('Select keeps the behaviour from before UI-03: devices draggable and cables can start from a handle', () => {
    expect(modeFlags('select')).toEqual({ nodesDraggable: true, nodesConnectable: true });
  });

  it('Pan never moves a device and never starts a cable', () => {
    expect(modeFlags('pan')).toEqual({ nodesDraggable: false, nodesConnectable: false });
  });

  it('Connect never moves a device but can start a cable', () => {
    expect(modeFlags('connect')).toEqual({ nodesDraggable: false, nodesConnectable: true });
  });

  it('only Select lets devices move', () => {
    expect(CANVAS_MODES.filter((m) => modeFlags(m).nodesDraggable)).toEqual(['select']);
  });
});

describe('Connect mode: clicking two devices', () => {
  it('the first click starts, the second click on another device finishes with source and target', () => {
    expect(connectClick(null, 'd1')).toEqual({ kind: 'start', source: 'd1' });
    expect(connectClick('d1', 'd2')).toEqual({ kind: 'finish', source: 'd1', target: 'd2' });
  });

  it('clicking the same device again cancels (a device is never connected to itself)', () => {
    expect(connectClick('d1', 'd1')).toEqual({ kind: 'cancel' });
  });

  it('ignores a click on a device without network ports (rack, UPS): it never starts, finishes or cancels a cable', () => {
    expect(connectClick(null, 'd9', false)).toEqual({ kind: 'ignore' });
    expect(connectClick('d1', 'd9', false)).toEqual({ kind: 'ignore' });
    expect(connectClick('d9', 'd9', false)).toEqual({ kind: 'ignore' });
  });

  it('treats a device with ports exactly as before when the port flag is given', () => {
    expect(connectClick(null, 'd1', true)).toEqual({ kind: 'start', source: 'd1' });
    expect(connectClick('d1', 'd2', true)).toEqual({ kind: 'finish', source: 'd1', target: 'd2' });
    expect(connectClick('d1', 'd1', true)).toEqual({ kind: 'cancel' });
  });

  it('is a pure function of its arguments', () => {
    const a = connectClick('d3', 'd4');
    const b = connectClick('d3', 'd4');
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
