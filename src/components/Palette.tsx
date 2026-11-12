import { useReactFlow } from '@xyflow/react';
import { useMemo, type KeyboardEvent } from 'react';
import type { DeviceKind } from '../core/types';
import { useStore } from '../store';
import { DeviceIcon } from './DeviceIcon';
import { Icon } from './Icons';
import { tx } from '../i18n';
import { DEFAULT_NODE_SIZE, findFreeSpot, rectCenter, visibleFlowRect } from '../ui/placement';
import { CATEGORY_ORDER, categoryLabel, filterPalette, paletteEntries, type PaletteCategory, type PaletteEntry } from '../ui/paletteCatalog';

export const DRAG_MIME = 'application/x-nls-device';

const chipLabel = (c: PaletteCategory | 'all'): string =>
  c === 'all' ? tx('ทั้งหมด') : c === 'routers' ? tx('เราเตอร์') : c === 'switches' ? tx('สวิตช์') : c === 'end' ? tx('ปลายทาง') : tx('อื่นๆ');

/**
 * Device Palette: search box, category filter and the device list. One instance is on screen at a time, either as the
 * bar under the canvas (`layout="bar"`, the default place) or inside the left menu's "Add a device" section
 * (`layout="list"`, with longer descriptions). Search text and category live in the store, so they follow the palette.
 */
export function Palette({ layout = 'list' }: { layout?: 'bar' | 'list' }) {
  const addDeviceAt = useStore((s) => s.addDeviceAt);
  const query = useStore((s) => s.paletteQuery);
  const setQuery = useStore((s) => s.setPaletteQuery);
  const category = useStore((s) => s.paletteCategory);
  const setCategory = useStore((s) => s.setPaletteCategory);
  const flow = useReactFlow();
  const entries = useMemo(paletteEntries, []);
  const shown = filterPalette(entries, query, category);

  // Click / Enter / Space: put the device at the free spot nearest the centre of the visible canvas (deterministic, never on
  // top of another device; existing devices are not moved). Drag-and-drop is handled by the canvas and is unchanged.
  const addAtCenter = (kind: DeviceKind) => {
    const r = document.querySelector('.react-flow')?.getBoundingClientRect();
    const vp = flow.getViewport();
    const view = r && r.width > 0 && r.height > 0 ? visibleFlowRect(r.width, r.height, vp) : null;
    const anchor = view ? rectCenter(view) : flow.screenToFlowPosition({ x: 600, y: 400 });
    const devices = useStore.getState().lab.devices;
    const measured = (id: string) => flow.getNode(id)?.measured;
    const existing = devices.map((d) => ({ x: d.x, y: d.y, ...measured(d.id) }));
    const sameKind = devices.map((d) => (d.kind === kind ? measured(d.id) : undefined)).find((m) => m?.width && m?.height);
    const size = sameKind?.width && sameKind?.height ? { width: sameKind.width, height: sameKind.height } : DEFAULT_NODE_SIZE;
    const pos = findFreeSpot(existing, anchor, view, { size });
    addDeviceAt(kind, pos.x, pos.y);
    // only when the visible area is full: bring the new device into view (same zoom); the Lab itself is not changed
    const box = { ...pos, ...size };
    if (view && !(box.x >= view.x && box.y >= view.y && box.x + box.width <= view.x + view.width && box.y + box.height <= view.y + view.height)) {
      void flow.setCenter(box.x + box.width / 2, box.y + box.height / 2, { zoom: vp.zoom });
    }
  };

  const clear = () => {
    setQuery('');
    setCategory('all');
  };

  const item = (e: PaletteEntry) => (
    <div
      key={e.kind}
      className="palette-item"
      title={`${e.label}\n${e.model}\n${e.note}`}
      aria-label={`${e.label} · ${categoryLabel(e.category)}`}
      draggable
      role="button"
      tabIndex={0}
      data-testid={`palette-${e.kind}`}
      onDragStart={(ev) => {
        ev.dataTransfer.setData(DRAG_MIME, e.kind);
        ev.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => addAtCenter(e.kind)}
      onKeyDown={(ev: KeyboardEvent) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault(); // Space must not scroll the list
        addAtCenter(e.kind);
      }}
    >
      <span className="tile">
        <DeviceIcon kind={e.kind} size={layout === 'bar' ? 28 : 34} />
      </span>
      <div className="palette-text">
        <div className="palette-name">{e.label}</div>
        {layout === 'list' && <div className="menu-hint">{e.note}</div>}
      </div>
    </div>
  );

  const groups = CATEGORY_ORDER.map((c) => ({ c, items: shown.filter((e) => e.category === c) })).filter((g) => g.items.length > 0);

  return (
    <section className={`palette palette-${layout === 'bar' ? 'is-bar' : 'is-list'}`} aria-label={tx('คลังอุปกรณ์')} data-testid={layout === 'bar' ? 'device-bar' : 'device-list'}>
      <div className="palette-tools">
        {layout === 'bar' && <span className="palette-title">{tx('คลังอุปกรณ์')}</span>}
        <div className="palette-search">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && query && (e.preventDefault(), setQuery(''))}
            placeholder={tx('ค้นหา: ชื่อ รุ่น หรือหมวด')}
            aria-label={tx('ค้นหาอุปกรณ์')}
            data-testid="device-search"
          />
          {query && (
            <button className="palette-clear" onClick={() => setQuery('')} aria-label={tx('ล้างคำค้นหา')} title={tx('ล้างคำค้นหา')} data-testid="device-search-clear">
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
        <div className="palette-cats" role="group" aria-label={tx('หมวดอุปกรณ์')}>
          {(['all', ...CATEGORY_ORDER] as const).map((c) => (
            <button key={c} className="palette-cat" aria-pressed={category === c} onClick={() => setCategory(c)} data-testid={`device-cat-${c}`}>
              {chipLabel(c)}
            </button>
          ))}
        </div>
      </div>
      {layout === 'list' && <p className="menu-hint">{tx('ลากลงพื้นที่วาด หรือกดเพื่อเพิ่มกลางจอ')}</p>}
      {shown.length === 0 ? (
        <div className="palette-empty" role="status" data-testid="device-empty">
          <span>{query.trim() ? tx('ไม่พบอุปกรณ์ที่ตรงกับ “{0}”', query.trim()) : tx('ไม่มีอุปกรณ์ในหมวดนี้')}</span>
          <button onClick={clear} data-testid="device-empty-clear">{tx('ล้างการค้นหา')}</button>
        </div>
      ) : (
        <div className="palette-items">
          {groups.map((g) => (
            <div key={g.c} className="palette-group" role="group" aria-label={categoryLabel(g.c)} data-testid={`palette-group-${g.c}`}>
              <div className="palette-group-title">{categoryLabel(g.c)}</div>
              <div className="palette-group-items">{g.items.map(item)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
