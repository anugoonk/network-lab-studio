import { useReactFlow } from '@xyflow/react';
import { PALETTE_GROUPS, PROFILES } from '../core/profiles';
import type { DeviceKind } from '../core/types';
import { useStore } from '../store';
import { DeviceIcon } from './DeviceIcon';
import { tx } from '../i18n';
import { DEFAULT_NODE_SIZE, findFreeSpot, rectCenter, visibleFlowRect } from '../ui/placement';

export const DRAG_MIME = 'application/x-nls-device';

/** Draggable device list (lives inside the "Add an object" section of the left menu). */
export function Palette() {
  const addDeviceAt = useStore((s) => s.addDeviceAt);
  const flow = useReactFlow();

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

  return (
    <div className="palette-list" aria-label="Device Palette">
      <p className="menu-hint">{tx('ลากลงพื้นที่วาด หรือกดเพื่อเพิ่มกลางจอ')}</p>
      {PALETTE_GROUPS.map((g) => (
        <div key={g.title} className="palette-group" data-testid={`palette-group-${g.title}`}>
          <div className="menu-hint palette-group-title"><b>{g.title}</b></div>
          {g.items.map(({ kind, note }) => (
        <div
          key={kind}
          className="palette-item"
          title={PROFILES[kind].label}
          draggable
          role="button"
          tabIndex={0}
          data-testid={`palette-${kind}`}
          onDragStart={(e) => {
            e.dataTransfer.setData(DRAG_MIME, kind);
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => addAtCenter(kind)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && addAtCenter(kind)}
        >
          <span className="tile">
            <DeviceIcon kind={kind} size={34} />
          </span>
          <div>
            <div className="palette-name">{PROFILES[kind].label}</div>
            <div className="menu-hint">{note}</div>
          </div>
        </div>
          ))}
        </div>
      ))}
    </div>
  );
}
