import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAP,
  DEFAULT_NODE_SIZE,
  candidateOffsets,
  findFreeSpot,
  rectCenter,
  tooClose,
  visibleFlowRect,
  type Placed,
  type Rect,
} from '../src/ui/placement';
import { addDevice, emptyLab } from '../src/core/lab';
import { serializeExport } from '../src/core/persist';

const W = DEFAULT_NODE_SIZE.width;
const H = DEFAULT_NODE_SIZE.height;
const box = (p: Placed): Rect => ({ x: p.x, y: p.y, width: p.width ?? W, height: p.height ?? H });
const inside = (outer: Rect, r: Rect) => r.x >= outer.x && r.y >= outer.y && r.x + r.width <= outer.x + outer.width && r.y + r.height <= outer.y + outer.height;
/** no two boxes overlap (gap 0) */
function noOverlap(list: Placed[]) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (tooClose(box(list[i]), box(list[j]), 0)) return false;
  return true;
}
/** adds `n` devices one after another, like n palette clicks without moving the view */
function addMany(start: Placed[], n: number, anchor = { x: 0, y: 0 }, view: Rect | null = null) {
  const all = [...start];
  for (let i = 0; i < n; i++) all.push(findFreeSpot(all, anchor, view));
  return all;
}

// a 1000 × 640 px canvas element
const CANVAS = { w: 1000, h: 640 };

describe('visibleFlowRect (screen → flow conversion)', () => {
  it('zoom 1, no pan: the flow rect equals the element', () => {
    expect(visibleFlowRect(CANVAS.w, CANVAS.h, { x: 0, y: 0, zoom: 1 })).toEqual({ x: 0, y: 0, width: 1000, height: 640 });
  });
  it('zoom 0.5 shows twice as much, zoom 2 half as much', () => {
    expect(visibleFlowRect(CANVAS.w, CANVAS.h, { x: 0, y: 0, zoom: 0.5 })).toEqual({ x: 0, y: 0, width: 2000, height: 1280 });
    expect(visibleFlowRect(CANVAS.w, CANVAS.h, { x: 0, y: 0, zoom: 2 })).toEqual({ x: 0, y: 0, width: 500, height: 320 });
  });
  it('pan moves the visible rect the opposite way (React Flow: screen = flow·zoom + translate)', () => {
    const r = visibleFlowRect(CANVAS.w, CANVAS.h, { x: 300, y: -200, zoom: 2 });
    expect(r).toEqual({ x: -150, y: 100, width: 500, height: 320 });
    // a flow point at the rect's top-left lands on screen (0, 0): flow·zoom + translate
    expect(r.x * 2 + 300).toBe(0);
    expect(r.y * 2 - 200).toBe(0);
  });
  it('zoom 0 / negative is treated as 1 (no division by zero)', () => {
    expect(visibleFlowRect(100, 100, { x: 0, y: 0, zoom: 0 }).width).toBe(100);
  });
});

describe('findFreeSpot', () => {
  it('empty canvas: centred exactly on the anchor', () => {
    const p = findFreeSpot([], { x: 500, y: 320 }, null);
    expect(p).toEqual({ x: 500 - W / 2, y: 320 - H / 2 });
  });

  it('several devices added one after another never overlap and keep the minimum gap', () => {
    const all = addMany([], 12);
    expect(noOverlap(all)).toBe(true);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(tooClose(box(all[i]), box(all[j]), DEFAULT_GAP)).toBe(false);
  });

  it('fixed order: centre, then right, down, left, up', () => {
    const all = addMany([], 5);
    const c = all[0];
    expect(all.slice(1).map((p) => [Math.sign(p.x - c.x), Math.sign(p.y - c.y)])).toEqual([
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]);
  });

  it('existing devices near the centre are avoided', () => {
    const existing: Placed[] = [{ x: -40, y: -40 }, { x: 70, y: -60, width: 92, height: 110 }];
    const p = findFreeSpot(existing, { x: 0, y: 0 }, null);
    expect(noOverlap([...existing, p])).toBe(true);
    for (const e of existing) expect(tooClose(box(e), box(p), DEFAULT_GAP)).toBe(false);
  });

  it('uses the measured size of existing nodes when given (a tall node blocks more)', () => {
    const tall: Placed = { x: -46, y: 100, width: 92, height: 300 };
    const p = findFreeSpot([tall], { x: 0, y: 0 }, null);
    expect(tooClose(box(tall), box(p), DEFAULT_GAP)).toBe(false);
    // without the measured height the default size would not reach the anchor's own cell
    expect(findFreeSpot([{ x: -46, y: 100 }], { x: 0, y: 0 }, null)).toEqual({ x: -46, y: -48 });
  });

  it('zoom 0.5: many devices fit inside the (larger) visible area, none overlapping', () => {
    const view = visibleFlowRect(CANVAS.w, CANVAS.h, { x: 0, y: 0, zoom: 0.5 });
    const all = addMany([], 30, rectCenter(view), view);
    expect(noOverlap(all)).toBe(true);
    for (const p of all) expect(inside(view, box(p))).toBe(true);
  });

  it('zoom 2: the small visible area fills up, later devices go to the nearest free spot outside it', () => {
    const view = visibleFlowRect(CANVAS.w, CANVAS.h, { x: 0, y: 0, zoom: 2 }); // 500 × 320 flow units
    const all = addMany([], 8, rectCenter(view), view);
    expect(noOverlap(all)).toBe(true);
    const inView = all.filter((p) => inside(view, box(p))).length;
    expect(inView).toBeGreaterThanOrEqual(3);
    expect(inView).toBeLessThan(8);
    // inside-the-view spots are always used first
    const firstOutside = all.findIndex((p) => !inside(view, box(p)));
    expect(all.slice(firstOutside).every((p) => !inside(view, box(p)))).toBe(true);
  });

  it('panned viewport: the device lands in the visible area that was panned to, not at the origin', () => {
    const view = visibleFlowRect(CANVAS.w, CANVAS.h, { x: -3000, y: 1500, zoom: 1 }); // looking at flow (3000, -1500)
    const p = findFreeSpot([{ x: 0, y: 0 }], rectCenter(view), view);
    expect(inside(view, box(p))).toBe(true);
    expect(p).toEqual({ x: 3500 - W / 2, y: -1500 + 320 - H / 2 });
  });

  it('crowded canvas: a dense block around the anchor is skipped without overlap', () => {
    const crowd: Placed[] = [];
    for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) crowd.push({ x: i * 100, y: j * 100 });
    const p = findFreeSpot(crowd, { x: 0, y: 0 }, null);
    expect(noOverlap([...crowd, p])).toBe(true);
  });

  it('existing devices that already overlap each other are left as they are and still avoided', () => {
    const stacked: Placed[] = [{ x: -46, y: -48 }, { x: -40, y: -40 }, { x: -46, y: -48 }];
    const copy = structuredClone(stacked);
    const p = findFreeSpot(stacked, { x: 0, y: 0 }, null);
    expect(stacked).toEqual(copy); // input untouched
    for (const s of stacked) expect(tooClose(box(s), box(p), 0)).toBe(false);
  });

  it('is deterministic: the same input always gives the same output (no randomness)', () => {
    const view = visibleFlowRect(CANVAS.w, CANVAS.h, { x: 120, y: -40, zoom: 0.8 });
    const runs = [0, 1, 2].map(() => addMany([{ x: 300, y: 200 }], 10, rectCenter(view), view));
    expect(runs[1]).toEqual(runs[0]);
    expect(runs[2]).toEqual(runs[0]);
    expect(runs[0].every((p) => Number.isInteger(p.x) && Number.isInteger(p.y))).toBe(true);
  });

  it('never moves existing devices (input array and objects are unchanged)', () => {
    const existing: Placed[] = [{ x: 1, y: 2 }, { x: 300, y: 50, width: 92, height: 90 }];
    const frozen = existing.map((e) => Object.freeze({ ...e }));
    const p = findFreeSpot(Object.freeze(frozen), { x: 0, y: 0 }, null);
    expect(frozen).toEqual(existing);
    expect(frozen).not.toContain(p);
  });

  it('search terminates: when every candidate is taken it falls back to the right of everything', () => {
    const blocked: Placed[] = [{ x: -10000, y: -10000, width: 20000, height: 20000 }];
    const p = findFreeSpot(blocked, { x: 0, y: 0 }, null, { maxRings: 3 });
    expect(p.x).toBe(10000 + DEFAULT_GAP);
    expect(tooClose(box(blocked[0]), box(p), 0)).toBe(false);
    // maxRings bounds the work: (2r + 1)² candidates
    expect(candidateOffsets(3)).toHaveLength(49);
    expect(candidateOffsets(0)).toEqual([{ x: 0, y: 0 }]);
  });

  it('a huge crowd (500 devices) still finishes fast and does not overlap', () => {
    const crowd: Placed[] = [];
    for (let i = 0; i < 500; i++) crowd.push({ x: (i % 25) * 130 - 1600, y: Math.floor(i / 25) * 120 - 1200 });
    const t = performance.now();
    const p = findFreeSpot(crowd, { x: 0, y: 0 }, null);
    expect(performance.now() - t).toBeLessThan(500);
    expect(noOverlap([...crowd, p])).toBe(true);
  });
});

describe('Lab compatibility', () => {
  it('a device added at a computed spot is an ordinary device: same id sequence, integer x/y, same saved format', () => {
    let lab = emptyLab('t');
    const placed: Placed[] = [];
    for (const kind of ['cisco-router', 'cisco-switch', 'pc'] as const) {
      const p = findFreeSpot(placed, { x: 400, y: 300 }, null);
      placed.push(p);
      lab = addDevice(lab, kind, p.x, p.y).lab;
    }
    expect(lab.devices.map((d) => d.id)).toEqual(['d1', 'd2', 'd3']);
    expect(lab.devices.map((d) => ({ x: d.x, y: d.y }))).toEqual(placed);
    const saved = JSON.parse(serializeExport(lab));
    expect(saved.schemaVersion).toBe(1);
    expect(saved.lab.devices.map((d: { x: number; y: number }) => [d.x, d.y])).toEqual(placed.map((p) => [p.x, p.y]));
  });
});
