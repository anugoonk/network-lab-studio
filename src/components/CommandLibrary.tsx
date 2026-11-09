import { useMemo, useState } from 'react';
import { SPECS } from '../core/cli/registry';
import { MODE_LABEL, MODE_PATH, TOPICS, exampleFor, type CommandSpec, type Topic } from '../core/cli/spec';
import { PROFILES } from '../core/profiles';
import type { CliMode, DeviceKind, Device, Vendor } from '../core/types';
import { useStore } from '../store';

const VENDOR_NAME: Record<Vendor, string> = { cisco: 'Cisco IOS', aruba: 'Aruba AOS-CX', pc: 'PC', generic: 'ไม่มี CLI' };
const KINDS = (Object.keys(PROFILES) as DeviceKind[]).filter((k) => PROFILES[k].hasCli);
const MODES: CliMode[] = ['user', 'priv', 'config', 'config-if', 'config-vlan', 'pc'];

/** Why a command cannot be inserted into this device's console right now (null = fine). */
export function insertProblem(spec: CommandSpec, dev: Device): string | null {
  const vendor = PROFILES[dev.kind].vendor;
  if (spec.vendor !== vendor) {
    const targets = spec.deviceTypes.map((k) => PROFILES[k].label).join(' / ');
    return `คำสั่งนี้เป็นของ ${VENDOR_NAME[spec.vendor]} แต่ ${dev.name} เป็น ${PROFILES[dev.kind].label} — กรุณาเลือกอุปกรณ์ชนิด ${targets}`;
  }
  if (!spec.deviceTypes.includes(dev.kind)) {
    const targets = spec.deviceTypes.map((k) => PROFILES[k].label).join(' / ');
    return `คำสั่งนี้ใช้กับ ${targets} เท่านั้น — กรุณาเลือกอุปกรณ์ชนิดนั้น`;
  }
  if (!spec.modes.includes(dev.cli.mode)) {
    const want = spec.modes.map((m) => MODE_LABEL[vendor][m] ?? m).join(' หรือ ');
    const path = MODE_PATH[vendor][spec.modes[0]] ?? '';
    return `ต้องอยู่ใน mode: ${want} (ตอนนี้ ${dev.name} อยู่ ${MODE_LABEL[vendor][dev.cli.mode] ?? dev.cli.mode}) — วิธีเข้า: ${path}`;
  }
  return null;
}

export function CommandLibrary() {
  const lab = useStore((s) => s.lab);
  const selection = useStore((s) => s.selection);
  const insert = useStore((s) => s.insertIntoConsole);

  const [q, setQ] = useState('');
  const [vendor, setVendor] = useState<Vendor | ''>('');
  const [kind, setKind] = useState<DeviceKind | ''>('');
  const [mode, setMode] = useState<CliMode | ''>('');
  const [topic, setTopic] = useState<Topic | ''>('');
  const [target, setTarget] = useState('');
  const [problems, setProblems] = useState<Record<string, string>>({});

  const selectedDev = selection?.type === 'device' ? selection.id : '';
  const targetId = lab.devices.some((d) => d.id === target) ? target : lab.devices.some((d) => d.id === selectedDev) ? selectedDev : (lab.devices[0]?.id ?? '');
  const targetDev = lab.devices.find((d) => d.id === targetId);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return SPECS.filter((s) => {
      if (vendor && s.vendor !== vendor) return false;
      if (kind && !s.deviceTypes.includes(kind)) return false;
      if (mode && !s.modes.includes(mode)) return false;
      if (topic && s.topic !== topic) return false;
      if (!needle) return true;
      const hay = [s.syntax, s.descTh, s.helpEn, VENDOR_NAME[s.vendor], s.vendor, ...s.deviceTypes.map((k) => PROFILES[k].label), s.topic, s.verify, s.verifyTh]
        .join(' ')
        .toLowerCase();
      return needle.split(/\s+/).every((w) => hay.includes(w));
    });
  }, [q, vendor, kind, mode, topic]);

  const onInsert = (s: CommandSpec) => {
    if (!targetDev) return setProblems({ ...problems, [s.id]: 'ยังไม่มีอุปกรณ์ใน Lab — เพิ่มอุปกรณ์ก่อน' });
    const p = insertProblem(s, targetDev);
    if (p) return setProblems({ ...problems, [s.id]: p });
    setProblems({ ...problems, [s.id]: '' });
    insert(targetDev.id, exampleFor(s, targetDev.kind));
  };

  return (
    <div className="library" data-testid="library">
      <div className="lib-filters">
        <input className="lib-search" placeholder="ค้นหา: คำสั่ง / คำอธิบายไทย / ชื่อระบบ (Cisco, Aruba)" value={q} onChange={(e) => setQ(e.target.value)} data-testid="lib-search" />
        <select value={vendor} onChange={(e) => setVendor(e.target.value as Vendor | '')} aria-label="Vendor" data-testid="lib-vendor">
          <option value="">ทุก vendor</option>
          <option value="cisco">Cisco IOS</option>
          <option value="aruba">Aruba AOS-CX</option>
          <option value="pc">PC</option>
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value as DeviceKind | '')} aria-label="ชนิดอุปกรณ์">
          <option value="">ทุกชนิดอุปกรณ์</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>{PROFILES[k].label}</option>
          ))}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value as CliMode | '')} aria-label="CLI mode">
          <option value="">ทุก mode</option>
          {MODES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={topic} onChange={(e) => setTopic(e.target.value as Topic | '')} aria-label="หัวข้อ" data-testid="lib-topic">
          <option value="">ทุกหัวข้อ</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="lib-target">
        <label>ใส่คำสั่งลง Console ของ:</label>
        <select value={targetId} onChange={(e) => setTarget(e.target.value)} data-testid="lib-target">
          {lab.devices.filter((d) => PROFILES[d.kind].hasCli).map((d) => (
            <option key={d.id} value={d.id}>{d.name} — {PROFILES[d.kind].label}</option>
          ))}
        </select>
        {targetDev && <span className="muted small">mode ตอนนี้: {MODE_LABEL[PROFILES[targetDev.kind].vendor][targetDev.cli.mode] ?? targetDev.cli.mode}</span>}
        <span className="muted small lib-count">{list.length} รายการ</span>
      </div>
      <div className="lib-list">
        {list.map((s) => {
          const ex = targetDev && s.deviceTypes.includes(targetDev.kind) ? exampleFor(s, targetDev.kind) : exampleFor(s, s.deviceTypes[0]);
          return (
            <article className="lib-card" key={s.id} data-testid={`lib-card-${s.id}`}>
              <div className="lib-top">
                <code className="syntax">{s.syntax}</code>
                <span className={`tag ${s.vendor}`}>{VENDOR_NAME[s.vendor]}</span>
                <span className="tag topic">{s.topic}</span>
              </div>
              <p>{s.descTh}</p>
              <div className="small muted">
                ใช้กับ: {s.deviceTypes.map((k) => PROFILES[k].label).join(', ')} · mode: {s.modes.map((m) => MODE_LABEL[s.vendor][m] ?? m).join(', ')}
              </div>
              <div className="lib-ex">
                <span className="small muted">ตัวอย่างที่รันได้</span>
                <code>{ex}</code>
                <button onClick={() => onInsert(s)} data-testid={`lib-insert-${s.id}`}>
                  ใส่ใน Console
                </button>
              </div>
              <div className="small">
                <b>วิธีตรวจผล:</b> <code>{s.verify}</code> — {s.verifyTh}
              </div>
              {problems[s.id] && <div className="error-box" role="alert" data-testid={`lib-problem-${s.id}`}>{problems[s.id]}</div>}
            </article>
          );
        })}
        {list.length === 0 && <p className="muted">ไม่พบคำสั่งที่ตรงกับตัวกรอง</p>}
      </div>
    </div>
  );
}
