/**
 * Deterministic placement for devices added from the palette by click / keyboard (UI-03a).
 *
 * Pure functions only: no DOM, no store, no randomness. Everything is in React Flow ("flow") coordinates, where a
 * device's stored x/y is the top-left corner of its node. Drag-and-drop does not use this module (it keeps placing the
 * device under the cursor).
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Axis-aligned rectangle; x/y is the top-left corner. */
export interface Rect extends Point, Size {}

/** An existing device: its top-left corner and, when React Flow has measured it, its real size. */
export interface Placed extends Point {
  width?: number;
  height?: number;
}

/** React Flow viewport transform: screen = flow * zoom + (x, y), relative to the canvas element. */
export interface Viewport extends Point {
  zoom: number;
}

/** Fallback node size when React Flow has not measured a node yet (`.node` is 92px wide; icon + 2 label lines ≈ 96px). */
export const DEFAULT_NODE_SIZE: Size = { width: 92, height: 96 };
/** Minimum free space kept between the new device and every existing one. */
export const DEFAULT_GAP = 24;
/** Grid pitch of the candidate positions (must be ≥ node size + gap so neighbouring candidates never collide). */
export const DEFAULT_STEP: Size = { width: 130, height: 120 };
/** Rings searched around the anchor: (2·20+1)² = 1681 candidates at most, so the search always terminates quickly. */
export const DEFAULT_MAX_RINGS = 20;

export interface PlacementOptions {
  size?: Size;
  gap?: number;
  step?: Size;
  maxRings?: number;
}

/** The part of the flow plane visible in a canvas element of `widthPx` × `heightPx` under viewport transform `vp`. */
export function visibleFlowRect(widthPx: number, heightPx: number, vp: Viewport): Rect {
  const zoom = vp.zoom > 0 ? vp.zoom : 1;
  return { x: -vp.x / zoom || 0, y: -vp.y / zoom || 0, width: widthPx / zoom, height: heightPx / zoom }; // `|| 0` avoids -0
}

export function rectCenter(r: Rect): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** True when the rectangles overlap or come closer than `gap` (touching at exactly `gap` is allowed). */
export function tooClose(a: Rect, b: Rect, gap: number): boolean {
  return a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;
}

function contains(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
}

const offsetCache = new Map<number, Point[]>();

/**
 * Grid offsets (in cells) of every candidate within `maxRings` of the anchor, nearest first (distance measured in
 * cells, so the order does not depend on the grid pitch). Ties are broken by angle, starting at "right" and turning
 * clockwise on screen (y grows downwards): right → down → left → up. The order is fixed, so the same input always gives
 * the same result.
 */
export function candidateOffsets(maxRings: number): Point[] {
  const hit = offsetCache.get(maxRings);
  if (hit) return hit;
  const list: { p: Point; d: number; a: number }[] = [];
  for (let j = 0 - maxRings; j <= maxRings; j++) {
    for (let i = 0 - maxRings; i <= maxRings; i++) {
      let a = Math.atan2(j, i);
      if (a < 0) a += 2 * Math.PI;
      list.push({ p: { x: i, y: j }, d: i * i + j * j, a });
    }
  }
  list.sort((p, q) => p.d - q.d || p.a - q.a);
  const out = list.map((e) => e.p);
  offsetCache.set(maxRings, out);
  return out;
}

/**
 * Top-left position for a new device whose centre should be as close as possible to `anchor`, without overlapping
 * (or crowding within `gap` of) any existing device.
 *
 * 1. Candidates sit on a grid centred on the anchor, searched nearest-first in a fixed order.
 * 2. The first free candidate lying completely inside `view` (the visible canvas) wins.
 * 3. If none inside the view is free, the nearest free candidate outside it is used.
 * 4. If the whole search area is occupied (thousands of devices), the device goes just right of everything.
 *
 * Existing devices are only read, never moved. The loop is bounded by `maxRings`.
 */
export function findFreeSpot(existing: readonly Placed[], anchor: Point, view: Rect | null, opts: PlacementOptions = {}): Point {
  const size = opts.size ?? DEFAULT_NODE_SIZE;
  const gap = opts.gap ?? DEFAULT_GAP;
  const step = opts.step ?? DEFAULT_STEP;
  const maxRings = Math.max(0, Math.floor(opts.maxRings ?? DEFAULT_MAX_RINGS));
  const boxes: Rect[] = existing.map((d) => ({
    x: d.x,
    y: d.y,
    width: d.width && d.width > 0 ? d.width : DEFAULT_NODE_SIZE.width,
    height: d.height && d.height > 0 ? d.height : DEFAULT_NODE_SIZE.height,
  }));
  const at = (o: Point): Rect => ({
    x: Math.round(anchor.x + o.x * step.width - size.width / 2),
    y: Math.round(anchor.y + o.y * step.height - size.height / 2),
    width: size.width,
    height: size.height,
  });

  let firstOutside: Rect | null = null;
  for (const o of candidateOffsets(maxRings)) {
    const c = at(o);
    if (boxes.some((b) => tooClose(c, b, gap))) continue;
    if (!view || contains(view, c)) return { x: c.x, y: c.y };
    if (!firstOutside) firstOutside = c;
  }
  if (firstOutside) return { x: firstOutside.x, y: firstOutside.y };

  // Search area full: place right of the right-most device, level with the anchor (cannot overlap anything).
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  return { x: Math.round(right + gap), y: Math.round(anchor.y - size.height / 2) };
}
