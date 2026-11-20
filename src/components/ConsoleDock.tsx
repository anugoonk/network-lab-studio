import { useLayoutEffect, useRef, useState } from 'react';
import { getDevice } from '../core/lab';
import { PROFILES } from '../core/profiles';
import { useStore } from '../store';
import { tx } from '../i18n';
import { DOCK_MIN, DOCK_STEP, clampDockHeight, dockMaxHeight } from '../ui/layout';
import { Icon } from './Icons';
import { Console } from './Console';

/**
 * Bottom Console dock (UI-04). It wraps the existing Console and is ALWAYS mounted — collapsing only hides it — so the line
 * being typed and the ↑/↓ position survive collapsing, switching right-panel tabs and switching devices. It shares the
 * centre column with the canvas (never overlaps it), can be collapsed, and its height can be dragged or set with the keyboard.
 * Open/height are UI preferences kept in their own localStorage key (src/ui/layout.ts), never in the Lab.
 */
export function ConsoleDock() {
  const open = useStore((s) => s.dockOpen);
  const height = useStore((s) => s.dockHeight);
  const setOpen = useStore((s) => s.setDockOpen);
  const setHeight = useStore((s) => s.setDockHeight);
  const sel = useStore((s) => s.selection);
  const lab = useStore((s) => s.lab);
  const device = sel?.type === 'device' ? getDevice(lab, sel.id) : undefined;
  const dock = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; h: number } | null>(null);

  // height of the centre column (the dock may use at most 60% of it); measured after mount and whenever it changes
  const [column, setColumn] = useState(0);
  useLayoutEffect(() => {
    const el = dock.current?.parentElement;
    if (!el) return;
    const measure = () => setColumn(el.clientHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const maxH = () => dockMaxHeight(column);
  const shown = Math.min(clampDockHeight(height), Math.max(DOCK_MIN, maxH()));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, h: shown };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    setHeight(clampDockHeight(d.h + (d.y - e.clientY), maxH()));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onResizeKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const max = maxH();
    if (e.key === 'ArrowUp') setHeight(clampDockHeight(shown + DOCK_STEP, max));
    else if (e.key === 'ArrowDown') setHeight(clampDockHeight(shown - DOCK_STEP, max));
    else if (e.key === 'Home') setHeight(DOCK_MIN);
    else if (e.key === 'End') setHeight(max);
    else return;
    e.preventDefault();
  };

  return (
    <section ref={dock} className={`console-dock ${open ? 'open' : 'closed'}`} style={open ? { height: shown } : undefined} aria-label={tx('Console ด้านล่าง')} data-testid="console-dock">
      {open && (
        <div
          className="console-dock-resize"
          role="separator"
          aria-orientation="horizontal"
          aria-label={tx('ปรับความสูง Console')}
          aria-valuemin={DOCK_MIN}
          aria-valuemax={Math.max(DOCK_MIN, maxH())}
          aria-valuenow={shown}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onResizeKey}
          data-testid="dock-resize"
        />
      )}
      <div className="console-dock-bar">
        <button
          className="console-dock-toggle"
          aria-expanded={open}
          aria-controls="console-dock-body"
          title={open ? tx('ย่อ Console') : tx('ขยาย Console')}
          onClick={() => setOpen(!open)}
          data-testid="dock-toggle"
        >
          <span className={`chev${open ? ' open' : ''}`}>
            <Icon name="chevron" size={16} />
          </span>
          <b>Console</b>
          <span className="console-dock-device" data-testid="dock-device">
            {device ? `${device.name} · ${PROFILES[device.kind].label}` : tx('ยังไม่ได้เลือกอุปกรณ์')}
          </span>
        </button>
      </div>
      <div id="console-dock-body" className="console-dock-body" hidden={!open}>
        <Console />
      </div>
    </section>
  );
}
