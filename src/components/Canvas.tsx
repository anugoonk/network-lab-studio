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
import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import { getDevice, getIface } from '../core/lab';
import { linkStatus } from '../core/network';
import { PROFILES, isAruba, shortPort } from '../core/profiles';
import { useStore } from '../store';
import { DeviceIcon } from './DeviceIcon';
import { DRAG_MIME } from './Palette';
import type { DeviceKind } from '../core/types';

function DeviceNode({ id, selected }: NodeProps) {
  const d = useStore((s) => s.lab.devices.find((x) => x.id === id));
  const openConsole = useStore((s) => s.openConsole);
  if (!d) return null;
  const p = PROFILES[d.kind];
  const ip = d.ifaces.find((i) => i.ip && (p.isHost || i.adminUp))?.ip;
  const sub = p.isHost ? (ip ?? p.roleNote) : p.isRouter ? (ip ?? p.roleNote) : p.roleNote;
  return (
    <div
      className={`node${selected ? ' selected' : ''}`}
      data-testid={`node-${d.name}`}
      onDoubleClick={() => openConsole(id)}
      title="ดับเบิลคลิกเพื่อเปิด Console"
    >
      <DeviceIcon kind={d.kind} size={52} />
      <div className="node-name">{d.name}</div>
      <div className="node-sub">{sub}</div>
      <Handle type="source" position={Position.Right} id="c" className="node-handle" title="ลากจุดนี้ไปยังอุปกรณ์อื่นเพื่อต่อสาย" />
    </div>
  );
}

function center(n: InternalNode): { x: number; y: number } {
  const w = n.measured.width ?? 90;
  const h = n.measured.height ?? 90;
  return { x: n.internals.positionAbsolute.x + w / 2, y: n.internals.positionAbsolute.y + h / 2 };
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
          title={st.aAdmin ? 'พอร์ตเปิดใช้งาน' : 'พอร์ตถูก shutdown'}
        >
          {endText(link.a.deviceId, link.a.port, st.aAdmin)}
        </div>
        <div
          className={`port-label ${st.bAdmin ? 'ok' : 'bad'}`}
          style={labelStyle(pb)}
          data-testid={`port-label-${id}-b`}
          title={st.bAdmin ? 'พอร์ตเปิดใช้งาน' : 'พอร์ตถูก shutdown'}
        >
          {endText(link.b.deviceId, link.b.port, st.bAdmin)}
        </div>
        <div className={`link-badge ${st.up ? 'ok' : 'bad'}`} style={labelStyle(mid)} data-testid={`link-status-${id}`} title={st.up ? 'ลิงก์ใช้งานได้ (มีสาย + พอร์ตสองฝั่งเปิด)' : `มีสายเชื่อมอยู่ แต่ลิงก์ down — ${st.reasonTh}`}>
          {st.up ? '✓ UP' : '✕ DOWN'}
        </div>
      </EdgeLabelRenderer>
      )}
    </>
  );
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
    const t = setTimeout(() => flow.fitView({ padding: 0.15, duration: 250 }), 60);
    return () => clearTimeout(t);
  }, [fitNonce, flow]);

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
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} />
        <Controls showInteractive={false} />
      </ReactFlow>
      {lab.devices.length === 0 && (
        <div className="empty-hint">
          <b>Lab ว่างเปล่า</b>
          <br />
          ลากอุปกรณ์จากแถบซ้ายมาวางที่นี่ แล้วลากจุดกลมด้านขวาของอุปกรณ์ไปยังอีกเครื่องเพื่อต่อสาย
        </div>
      )}
    </div>
  );
}
