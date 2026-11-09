import { useReactFlow } from '@xyflow/react';
import { PALETTE_GROUPS, PROFILES } from '../core/profiles';
import type { DeviceKind } from '../core/types';
import { useStore } from '../store';
import { DeviceIcon } from './DeviceIcon';

export const DRAG_MIME = 'application/x-nls-device';

/** Draggable device list (lives inside the "Add an object" section of the left menu). */
export function Palette() {
  const addDeviceAt = useStore((s) => s.addDeviceAt);
  const flow = useReactFlow();

  const addAtCenter = (kind: DeviceKind) => {
    const el = document.querySelector('.react-flow');
    const r = el?.getBoundingClientRect();
    const jitter = (Math.random() - 0.5) * 80;
    const pos = flow.screenToFlowPosition({
      x: (r ? r.left + r.width / 2 : 600) + jitter,
      y: (r ? r.top + r.height / 2 : 400) + jitter,
    });
    addDeviceAt(kind, Math.round(pos.x - 45), Math.round(pos.y - 40));
  };

  return (
    <div className="palette-list" aria-label="Device Palette">
      <p className="menu-hint">ลากลงพื้นที่วาด หรือกดเพื่อเพิ่มกลางจอ</p>
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
