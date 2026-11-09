import { useReactFlow } from '@xyflow/react';
import { PROFILES } from '../core/profiles';
import type { DeviceKind } from '../core/types';
import { useStore } from '../store';
import { DeviceIcon } from './DeviceIcon';

const ITEMS: { kind: DeviceKind; note: string }[] = [
  { kind: 'cisco-router', note: 'Router · Gi0/0–0/2' },
  { kind: 'cisco-switch', note: 'Switch L2 · Fa0/1–24, Gi0/1–2' },
  { kind: 'aruba-switch', note: 'Switch L2 · 1/1/1–1/1/28' },
  { kind: 'pc', note: 'เครื่องผู้ใช้ · Ethernet0' },
];

export const DRAG_MIME = 'application/x-nls-device';

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
    <aside className="palette" aria-label="Device Palette">
      <h2>อุปกรณ์</h2>
      <p className="muted small">ลากลงพื้นที่วาด หรือกดเพื่อเพิ่มกลางจอ</p>
      {ITEMS.map(({ kind, note }) => (
        <div
          key={kind}
          className="palette-item"
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
          <DeviceIcon kind={kind} size={44} />
          <div>
            <div className="palette-name">{PROFILES[kind].label}</div>
            <div className="muted small">{note}</div>
          </div>
        </div>
      ))}
    </aside>
  );
}
