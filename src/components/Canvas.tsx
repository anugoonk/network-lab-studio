import {
  Background,
  BackgroundVariant,
  BaseEdge,
  ConnectionMode,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  ViewportPortal,
  applyNodeChanges,
  useInternalNode,
  useReactFlow,
  type Connection,
  type EdgeProps,
  type InternalNode,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { getDevice, getIface } from '../core/lab';
import { duplicateIpsCached } from '../core/l2tables';
import { linkStatus } from '../core/network';
import { PROFILES, isAruba, shortPort } from '../core/profiles';
import { useStore } from '../store';
import { DeviceIcon } from './DeviceIcon';
import { DRAG_MIME } from './Palette';
import type { DeviceKind } from '../core/types';
import { tx } from '../i18n';

function DeviceNode({ id, selected }: NodeProps) {
  const d = useStore((s) => s.lab.devices.find((x) => x.id === id));
  const openConsole = useStore((s) => s.openConsole);
  const dup = useStore((s) => duplicateIpsCached(s.lab).find((x) => x.members.some((m) => m.deviceId === id)));
  if (!d) return null;
  const p = PROFILES[d.kind];
  const ip = d.ifaces.find((i) => i.ip && (p.isHost || i.adminUp))?.ip;
  const sub = p.isHost ? (ip ?? p.roleNote) : p.isRouter ? (ip ?? p.roleNote) : p.roleNote;
  return (
    <div
      className={`node${selected ? ' selected' : ''}`}
      data-testid={`node-${d.name}`}
      onDoubleClick={() => openConsole(id)}
      title={tx('ดับเบิลคลิกเพื่อเปิด Console')}
    >
      <DeviceIcon kind={d.kind} size={52} />
      <div className="node-name">{d.name}</div>
      <div className="node-sub">{sub}</div>
      {dup && (
        <div className="node-dup" title={tx('IP {0} ซ้ำกับอุปกรณ์อื่นใน L2 เดียวกัน', dup.ip)} data-testid={`dup-${d.name}`}>{tx('⚠ IP ซ้ำ')}</div>
      )}
      <Handle type="source" position={Position.Right} id="c" className="node-handle" title={tx('ลากจุดนี้ไปยังอุปกรณ์อื่นเพื่อต่อสาย')} />
    </div>
  );
}

function center(n: InternalNode): { x: number; y: number } {
  const w = n.measured.width ?? 90;
  const h = n.measured.height ?? 90;
  return { x: n.internals.positionAbsolute.x + w / 2, y: n.internals.positionAbsolute.y + h / 2 };
}

function AnimToggle() {
  const on = useStore((s) => s.animatePackets);
  const toggle = useStore((s) => s.toggleAnimatePackets);
  return (
    <button className="anim-toggle" onClick={toggle} aria-pressed={on} title={tx('เปิด/ปิดแอนิเมชันแพ็กเก็ตเมื่อ ping')} data-testid="anim-toggle">
      {on ? tx('● แอนิเมชัน ping: เปิด') : tx('○ แอนิเมชัน ping: ปิด')}
    </button>
  );
}

function CableEdge({ id, source, target, selected }: EdgeProps) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  const lab = useStore((st) => st.lab);
  const hideLabels = useStore((st) => st.hideLabels);
  const link = lab.links.find((l) => l.id === id);
  if (!s || !t || !link) return null;
  const a = center(s);
  const b = center(t);
  const st = linkStatus(lab, link);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const off = Math.min(66, dist * 0.32);
  const ux = dx / dist;
  const uy = dy / dist;
  const pa = { x: a.x + ux * off, y: a.y + uy * off };
  const pb = { x: b.x - ux * off, y: b.y - uy * off };
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const color = st.up ? '#2f6b86' : '#c62828';
  const trunkOf = (deviceId: string, port: string) => {
    const d = getDevice(lab, deviceId);
    return !!(d && getIface(d, port)?.trunk && !(isAruba(d.kind) && getIface(d, port)?.routed));
  };
  const endText = (deviceId: string, port: string, admin: boolean) =>
    `${shortPort(port)}${trunkOf(deviceId, port) ? ' ⇄T' : ''}${admin ? '' : ' ⏻'}`;
  const labelStyle = (p: { x: number; y: number }) => ({ transform: `translate(-50%, -50%) translate(${p.x}px, ${p.y}px)` });
  return (
    <>
      <BaseEdge
        id={id}
        path={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
        interactionWidth={22}
        style={{ stroke: color, strokeWidth: selected ? 5 : 2.5, strokeDasharray: st.up ? undefined : '8 6' }}
      />
      {!hideLabels && (
      <EdgeLabelRenderer>
        <div
          className={`port-label ${st.aAdmin ? 'ok' : 'bad'}`}
          style={labelStyle(pa)}
          data-testid={`port-label-${id}-a`}
          title={st.aAdmin ? tx('พอร์ตเปิดใช้งาน') : tx('พอร์ตถูก shutdown')}
        >
          {endText(link.a.deviceId, link.a.port, st.aAdmin)}
        </div>
        <div
          className={`port-label ${st.bAdmin ? 'ok' : 'bad'}`}
          style={labelStyle(pb)}
          data-testid={`port-label-${id}-b`}
          title={st.bAdmin ? tx('พอร์ตเปิดใช้งาน') : tx('พอร์ตถูก shutdown')}
        >
          {endText(link.b.deviceId, link.b.port, st.bAdmin)}
        </div>
        <div className={`link-badge ${st.up ? 'ok' : 'bad'}`} style={labelStyle(mid)} data-testid={`link-status-${id}`} title={st.up ? tx('ลิงก์ใช้งานได้ (มีสาย + พอร์ตสองฝั่งเปิด)') : tx('มีสายเชื่อมอยู่ แต่ลิงก์ down — {0}', st.reasonTh)}>
          {st.up ? '✓ UP' : '✕ DOWN'}
        </div>
      </EdgeLabelRenderer>
      )}
    </>
  );
}

type Pt = { x: number; y: number };
interface Leg {
  pts: Pt[];
  kind: 'fwd' | 'back';
}
const PACKET_SPEED = 0.45; // px per ms
const along = (pts: Pt[], d: number): Pt => {
  let left = d;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (left <= seg || i === pts.length - 1) {
      const f = seg === 0 ? 1 : Math.min(1, left / seg);
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f };
    }
    left -= seg;
  }
  return pts[0];
};
const pathLen = (pts: Pt[]) => pts.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);

/** A dot travels along the ping path (request, then reply); a failed ping stops where it died and shows ✕. */
function PacketAnimation() {
  const anim = useStore((s) => s.pingAnim);
  const enabled = useStore((s) => s.animatePackets);
  const epoch = useStore((s) => s.labEpoch);
  const flow = useReactFlow();
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const [frame, setFrame] = useState<{ p: Pt; kind: 'fwd' | 'back' | 'fail' } | null>(null);

  useEffect(() => {
    setFrame(null);
    if (!anim || !enabled || anim.epoch !== epoch) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const pointsOf = (ids: string[]): Pt[] =>
      ids.flatMap((id) => {
        const n = flowRef.current.getInternalNode(id);
        return n ? [center(n)] : [];
      });
    const { r } = anim;
    const legs: Leg[] = [{ pts: pointsOf(r.forwardPath), kind: 'fwd' }];
    if (r.returnPath.length > 1) legs.push({ pts: pointsOf(r.returnPath), kind: 'back' });
    const usable = legs.filter((l) => l.pts.length > 0);
    if (!usable.length) return;
    const durations = usable.map((l) => Math.min(2200, Math.max(350, pathLen(l.pts) / PACKET_SPEED)));
    const total = durations.reduce((a, b) => a + b, 0);
    const failHold = r.ok ? 0 : 1100;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = now - t0;
      if (t >= total) {
        const last = usable[usable.length - 1];
        const end = last.pts[last.pts.length - 1];
        if (!r.ok && t < total + failHold) setFrame({ p: end, kind: 'fail' });
        else {
          setFrame(null);
          return;
        }
      } else {
        let left = t;
        let k = 0;
        while (k < usable.length - 1 && left > durations[k]) left -= durations[k++];
        setFrame({ p: along(usable[k].pts, (left / durations[k]) * pathLen(usable[k].pts)), kind: usable[k].kind });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anim, enabled, epoch]);

  if (!frame) return null;
  return (
    <ViewportPortal>
      <div
        className={`packet ${frame.kind}`}
        style={{ transform: `translate(${frame.p.x - 11}px, ${frame.p.y - 11}px)` }}
        data-testid="packet"
        data-kind={frame.kind}
        aria-hidden
      >
        {frame.kind === 'fail' ? '✕' : ''}
      </div>
    </ViewportPortal>
  );
}

/** a Lab with only one or two devices must not be blown up to 2x when it is fitted into view */
export const FIT_MAX_ZOOM = 1.25;

/** Fit the Lab into view. Does nothing on an empty Lab (React Flow would queue the fit for the next device dropped). */
export function fitLab(flow: { fitView: (o?: { padding?: number; duration?: number; maxZoom?: number }) => unknown }, duration = 250): void {
  if (useStore.getState().lab.devices.length === 0) return;
  void flow.fitView({ padding: 0.15, duration, maxZoom: FIT_MAX_ZOOM });
}

const nodeTypes = { device: DeviceNode };
const edgeTypes = { cable: CableEdge };

export function Canvas() {
  const lab = useStore((s) => s.lab);
  const selection = useStore((s) => s.selection);
  const select = useStore((s) => s.select);
  const moveDevice = useStore((s) => s.moveDevice);
  const addDeviceAt = useStore((s) => s.addDeviceAt);
  const openConnect = useStore((s) => s.openConnect);
  const deleteSelection = useStore((s) => s.deleteSelection);
  const fitNonce = useStore((s) => s.fitNonce);
  const flow = useReactFlow();
  // `flow` changes identity as nodes are added, so effects must not depend on it (they would re-fit on every drop).
  const flowRef = useRef(flow);
  flowRef.current = flow;
  // React Flow's `fitView` prop fits once, when the first nodes appear. Used only when the page starts with a Lab that already
  // has devices (fitted with the first paint, no jump). Starting from an EMPTY Lab it would instead zoom in on the first device
  // dropped later, so it is off then. Labs loaded afterwards are fitted by the `fitNonce` effect below.
  const startedWithDevices = useRef(lab.devices.length > 0);

  const [nodes, setNodes] = useState<Node[]>([]);
  useEffect(() => {
    setNodes((prev) =>
      lab.devices.map((d) => {
        const p = prev.find((n) => n.id === d.id);
        return {
          ...(p ?? {}),
          id: d.id,
          type: 'device',
          position: { x: d.x, y: d.y },
          data: {},
          selected: selection?.type === 'device' && selection.id === d.id,
        };
      }),
    );
  }, [lab.devices, selection]);

  const edges = useMemo(
    () =>
      lab.links.map((l) => ({
        id: l.id,
        source: l.a.deviceId,
        target: l.b.deviceId,
        type: 'cable',
        selected: selection?.type === 'link' && selection.id === l.id,
      })),
    [lab.links, selection],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((ns) => applyNodeChanges(changes, ns));
      for (const c of changes) {
        if (c.type === 'position' && c.position) moveDevice(c.id, Math.round(c.position.x), Math.round(c.position.y));
      }
    },
    [moveDevice],
  );

  const onConnect = useCallback((c: Connection) => openConnect(c.source, c.target), [openConnect]);

  const onDrop = (e: DragEvent) => {
    const kind = e.dataTransfer.getData(DRAG_MIME) as DeviceKind;
    if (!kind || !(kind in PROFILES)) return;
    e.preventDefault();
    const pos = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addDeviceAt(kind, Math.round(pos.x - 45), Math.round(pos.y - 40));
  };

  useEffect(() => {
    if (fitNonce === 0) return;
    const t = setTimeout(() => {
      // fitView() on an EMPTY canvas does not fit anything: React Flow queues it and applies it to the next node that
      // appears (the first device dropped on a blank Lab then jumped to a huge zoom). Reset to a normal 1x view instead.
      if (useStore.getState().lab.devices.length === 0) flowRef.current.setViewport({ x: 0, y: 0, zoom: 1 });
      else fitLab(flowRef.current);
    }, 60);
    return () => clearTimeout(t);
  }, [fitNonce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteSelection]);

  return (
    <div className="canvas" onDrop={onDrop} onDragOver={(e) => e.preventDefault()} data-testid="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        isValidConnection={(c) => c.source !== c.target}
        onNodeClick={(_, n) => select({ type: 'device', id: n.id })}
        onEdgeClick={(_, e) => select({ type: 'link', id: e.id })}
        onPaneClick={() => select(null)}
        deleteKeyCode={null}
        fitView={startedWithDevices.current}
        fitViewOptions={{ padding: 0.15, maxZoom: FIT_MAX_ZOOM }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} />
        <Controls showInteractive={false} />
        <PacketAnimation />
      </ReactFlow>
      <AnimToggle />
      {lab.devices.length === 0 && (
        <div className="empty-hint">
          <b>{tx('Lab ว่างเปล่า')}</b>
          <br />{tx('ลากอุปกรณ์จากแถบซ้ายมาวางที่นี่ แล้วลากจุดกลมด้านขวาของอุปกรณ์ไปยังอีกเครื่องเพื่อต่อสาย')}</div>
      )}
    </div>
  );
}
