import { useState } from 'react';
import { CHALLENGE_LIMITS, captureStart, defaultLabel, emptyChallenge, nextCheckId } from '../core/challenge';
import { parseIp } from '../core/ip';
import { configSignature, getDevice } from '../core/lab';
import { PROFILES } from '../core/profiles';
import type { Challenge, Check } from '../core/types';
import { useStore } from '../store';
import { GuideText } from './GuidePanel';
import { Icon } from './Icons';

type Kind = Check['kind'];

/** the list with items i and j exchanged (unchanged when j is out of range) */
function swap<T>(list: T[], i: number, j: number): T[] {
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

const KIND_LABEL: Record<Kind, string> = {
  ping: 'ping ได้ / ไม่ได้',
  'link-up': 'ลิงก์ up',
  'config-line': 'บรรทัดใน running-config',
  'trunk-vlan': 'trunk ส่ง VLAN',
  'port-admin': 'พอร์ตเปิด / ปิด (shutdown)',
  route: 'มีเส้นทาง (routing table)',
  'no-dup-ip': 'ไม่มี IP ซ้ำ',
};

function CheckEditor({ challenge }: { challenge: Challenge }) {
  const lab = useStore((s) => s.lab);
  const update = useStore((s) => s.updateChallenge);
  const setChallenge = useStore((s) => s.setChallenge);
  const setStart = useStore((s) => s.setChallengeStart);
  const devices = lab.devices;
  const [kind, setKind] = useState<Kind>('ping');
  const [devId, setDevId] = useState('');
  const [port, setPort] = useState('');
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [vlan, setVlan] = useState('');
  const [prefix, setPrefix] = useState('24');
  const [expect, setExpect] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const full = challenge.checks.length >= CHALLENGE_LIMITS.checks;

  const dev = getDevice(lab, devId || devices[0]?.id || '');
  const needsDevice = kind !== 'no-dup-ip';
  const needsPort = kind === 'link-up' || kind === 'trunk-vlan' || kind === 'port-admin';
  const expectOptions: Record<string, [string, string][]> = {
    ping: [['success', 'ต้อง ping ได้'], ['fail', 'ต้อง ping ไม่ได้']],
    'config-line': [['present', 'ต้องมีบรรทัดนี้'], ['absent', 'ต้องไม่มีบรรทัดนี้']],
    'trunk-vlan': [['allowed', 'ต้องส่ง VLAN นี้ได้'], ['blocked', 'ต้องไม่ส่ง VLAN นี้']],
    'port-admin': [['up', 'ต้องเปิดอยู่'], ['down', 'ต้องถูก shutdown']],
  };
  const expects = expectOptions[kind];
  const expectValue = expects ? (expects.some(([v]) => v === expect) ? expect : expects[0][0]) : '';

  const add = () => {
    if (needsDevice && !dev) return setErr('ยังไม่มีอุปกรณ์ใน Lab');
    const id = nextCheckId(challenge);
    const portName = port && dev?.ifaces.some((i) => i.name === port) ? port : dev?.ifaces[0]?.name ?? '';
    let c: Check;
    switch (kind) {
      case 'ping':
        if (parseIp(to.trim()) === null) return setErr('IPv4 ปลายทางไม่ถูกต้อง');
        c = { id, kind, label: '', from: dev!.id, to: to.trim(), expect: expectValue as 'success' | 'fail' };
        break;
      case 'link-up':
        c = { id, kind, label: '', deviceId: dev!.id, port: portName };
        break;
      case 'config-line':
        if (!text.trim()) return setErr('ใส่บรรทัด config ที่ต้องการตรวจ');
        c = { id, kind, label: '', deviceId: dev!.id, text: text.trim(), expect: expectValue as 'present' | 'absent' };
        break;
      case 'trunk-vlan': {
        const v = Number(vlan);
        if (!Number.isInteger(v) || v < 1 || v > 4094) return setErr('VLAN ต้องเป็นเลข 1-4094');
        c = { id, kind, label: '', deviceId: dev!.id, port: portName, vlan: v, expect: expectValue as 'allowed' | 'blocked' };
        break;
      }
      case 'port-admin':
        c = { id, kind, label: '', deviceId: dev!.id, port: portName, expect: expectValue as 'up' | 'down' };
        break;
      case 'route': {
        const p = Number(prefix);
        if (parseIp(to.trim()) === null) return setErr('IPv4 network ไม่ถูกต้อง');
        if (!Number.isInteger(p) || p < 0 || p > 32) return setErr('prefix ต้องเป็นเลข 0-32');
        c = { id, kind, label: '', deviceId: dev!.id, net: to.trim(), prefix: p };
        break;
      }
      case 'no-dup-ip':
        c = { id, kind, label: '' };
        break;
    }
    update((ch) => ({ ...ch, checks: [...ch.checks, { ...c, label: defaultLabel(lab, c) }] }));
    setErr(null);
  };

  return (
    <div className="guide-edit" data-testid="challenge-editor">
      <label htmlFor="ch-title">ชื่อโจทย์</label>
      <input id="ch-title" value={challenge.title} maxLength={120} onChange={(e) => update((c) => ({ ...c, title: e.target.value }))} data-testid="challenge-title-input" />
      <label htmlFor="ch-goal">เป้าหมาย / สถานการณ์</label>
      <textarea id="ch-goal" rows={4} value={challenge.goal} maxLength={4000} onChange={(e) => update((c) => ({ ...c, goal: e.target.value }))} data-testid="challenge-goal-input" />

      <h4 className="guide-edit-h">
        Check ({challenge.checks.length}/{CHALLENGE_LIMITS.checks})
      </h4>
      {challenge.checks.map((c, i) => (
        <div className="guide-edit-card" key={c.id}>
          <input
            value={c.label}
            maxLength={200}
            aria-label={`ชื่อ Check ${i + 1}`}
            onChange={(e) => update((ch) => ({ ...ch, checks: ch.checks.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)) }))}
          />
          <div className="row">
            <span className="muted small">{KIND_LABEL[c.kind]}</span>
            <span className="spacer" />
            <button onClick={() => update((ch) => ({ ...ch, checks: swap(ch.checks, i, i - 1) }))} disabled={i === 0} aria-label={`เลื่อน Check ${i + 1} ขึ้น`} data-testid={`challenge-up-${c.id}`}>↑</button>
            <button onClick={() => update((ch) => ({ ...ch, checks: swap(ch.checks, i, i + 1) }))} disabled={i === challenge.checks.length - 1} aria-label={`เลื่อน Check ${i + 1} ลง`} data-testid={`challenge-down-${c.id}`}>↓</button>
            <button
              onClick={() =>
                update((ch) => {
                  const copy = { ...c, id: nextCheckId(ch), label: `${c.label} (สำเนา)`.slice(0, 200) };
                  return { ...ch, checks: [...ch.checks.slice(0, i + 1), copy, ...ch.checks.slice(i + 1)] };
                })
              }
              disabled={full}
              aria-label={`ทำสำเนา Check ${i + 1}`}
              data-testid={`challenge-dup-${c.id}`}
            >
              สำเนา
            </button>
            <button className="danger" onClick={() => update((ch) => ({ ...ch, checks: ch.checks.filter((x) => x.id !== c.id) }))} aria-label={`ลบ Check ${i + 1}`} data-testid={`challenge-del-${c.id}`}>
              ลบ
            </button>
          </div>
        </div>
      ))}

      <h4 className="guide-edit-h">เพิ่ม Check</h4>
      <select value={kind} onChange={(e) => { setKind(e.target.value as Kind); setErr(null); }} aria-label="ชนิด Check" data-testid="challenge-kind">
        {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
          <option key={k} value={k}>{KIND_LABEL[k]}</option>
        ))}
      </select>
      {needsDevice && (
        <div className="row">
          <select value={dev?.id ?? ''} onChange={(e) => { setDevId(e.target.value); setPort(''); }} aria-label="อุปกรณ์" data-testid="challenge-device">
            {devices.map((d) => (
              <option key={d.id} value={d.id}>{d.name} — {PROFILES[d.kind].label}</option>
            ))}
          </select>
          {needsPort && (
            <select value={port || dev?.ifaces[0]?.name || ''} onChange={(e) => setPort(e.target.value)} aria-label="พอร์ต" data-testid="challenge-port">
              {dev?.ifaces.map((i) => (
                <option key={i.name} value={i.name}>{i.name}</option>
              ))}
            </select>
          )}
        </div>
      )}
      {(kind === 'ping' || kind === 'route') && (
        <div className="row">
          <input placeholder={kind === 'ping' ? 'IPv4 ปลายทาง' : 'network เช่น 172.16.0.0'} value={to} onChange={(e) => setTo(e.target.value)} aria-label={kind === 'ping' ? 'IPv4 ปลายทาง' : 'network'} data-testid="challenge-to" />
          {kind === 'route' && <input placeholder="/24" value={prefix} onChange={(e) => setPrefix(e.target.value)} aria-label="prefix length" style={{ width: 60 }} data-testid="challenge-prefix" />}
        </div>
      )}
      {kind === 'config-line' && (
        <input placeholder="เช่น ip route 0.0.0.0 0.0.0.0 10.0.0.1" value={text} onChange={(e) => setText(e.target.value)} aria-label="บรรทัด config" data-testid="challenge-text" />
      )}
      {kind === 'trunk-vlan' && <input placeholder="VLAN ID" value={vlan} onChange={(e) => setVlan(e.target.value)} aria-label="VLAN ID" data-testid="challenge-vlan" />}
      <div className="row">
        {expects && (
          <select value={expectValue} onChange={(e) => setExpect(e.target.value)} aria-label="ผลที่คาดหวัง" data-testid="challenge-expect">
            {expects.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        )}
        <button onClick={add} disabled={full} data-testid="challenge-add">+ เพิ่ม Check</button>
      </div>
      {err && <div className="error-box" role="alert">{err}</div>}
      <h4 className="guide-edit-h">
        คำใบ้ ({(challenge.hints ?? []).length}/{CHALLENGE_LIMITS.hints})
      </h4>
      <p className="muted small">เรียงจากกว้างไปแคบ ผู้เรียนกด "ขอใบ้" เพื่อเปิดทีละข้อ — ข้อสุดท้ายจะเป็นเฉลยก็ได้</p>
      {(challenge.hints ?? []).map((h, i) => (
        <div className="guide-edit-card" key={i}>
          <textarea
            rows={2}
            value={h}
            maxLength={500}
            aria-label={`คำใบ้ข้อ ${i + 1}`}
            data-testid={`challenge-hint-${i}`}
            onChange={(e) => update((ch) => ({ ...ch, hints: (ch.hints ?? []).map((x, k) => (k === i ? e.target.value : x)) }))}
          />
          <div className="row">
            <span className="muted small">ข้อ {i + 1}</span>
            <span className="spacer" />
            <button onClick={() => update((ch) => ({ ...ch, hints: swap(ch.hints ?? [], i, i - 1) }))} disabled={i === 0} aria-label={`เลื่อนคำใบ้ข้อ ${i + 1} ขึ้น`} data-testid={`challenge-hint-up-${i}`}>↑</button>
            <button onClick={() => update((ch) => ({ ...ch, hints: swap(ch.hints ?? [], i, i + 1) }))} disabled={i === (challenge.hints ?? []).length - 1} aria-label={`เลื่อนคำใบ้ข้อ ${i + 1} ลง`} data-testid={`challenge-hint-down-${i}`}>↓</button>
            <button className="danger" onClick={() => update((ch) => ({ ...ch, hints: (ch.hints ?? []).filter((_, k) => k !== i) }))} aria-label={`ลบคำใบ้ข้อ ${i + 1}`} data-testid={`challenge-hint-del-${i}`}>
              ลบ
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={() => update((ch) => ({ ...ch, hints: [...(ch.hints ?? []), ''] }))}
        disabled={(challenge.hints ?? []).length >= CHALLENGE_LIMITS.hints}
        data-testid="challenge-hint-add"
      >
        + เพิ่มคำใบ้
      </button>

      <h4 className="guide-edit-h">จุดเริ่มต้นของโจทย์ (สำหรับปุ่มรีเซ็ต)</h4>
      <p className="muted small" data-testid="challenge-start-status">
        {challenge.start
          ? `บันทึกไว้แล้ว: ${challenge.start.devices.length} อุปกรณ์, ${challenge.start.links.length} สาย — ผู้เรียนกด "รีเซ็ตโจทย์" เพื่อกลับมาสถานะนี้`
          : 'ยังไม่ได้บันทึก — ผู้เรียนจะรีเซ็ตโจทย์ไม่ได้'}
      </p>
      <div className="row">
        <button onClick={() => setStart(true)} data-testid="challenge-set-start">ใช้สถานะ Lab ตอนนี้เป็นจุดเริ่มต้น</button>
        {challenge.start && (
          <button className="danger" onClick={() => setStart(false)} data-testid="challenge-clear-start">ล้างจุดเริ่มต้น</button>
        )}
      </div>
      <p className="muted small">
        Check ตรวจจาก Lab จริงทุกครั้งที่ผู้เรียนกด Check — “บรรทัดใน running-config” ตรวจข้อความตรงตัว (ไม่สนช่องว่างนำหน้า) ควรระวังว่าอาจเฉลยคำตอบให้ผู้เรียนที่เห็นรายการ Check
      </p>

      <div className="guide-danger">
        <button className="danger" onClick={() => setChallenge(undefined)} data-testid="challenge-delete">ลบโจทย์นี้</button>
      </div>
    </div>
  );
}

function ChallengeView({ challenge }: { challenge: Challenge }) {
  const lab = useStore((s) => s.lab);
  const run = useStore((s) => s.challengeRun);
  const runChallenge = useStore((s) => s.runChallenge);
  const reset = useStore((s) => s.resetChallenge);
  const [confirming, setConfirming] = useState(false);
  const shown = useStore((s) => (s.hintsShown.epoch === s.labEpoch ? s.hintsShown.n : 0));
  const showNextHint = useStore((s) => s.showNextHint);
  const hints = (challenge.hints ?? []).filter((h) => h.trim());
  const shownN = Math.min(shown, hints.length);
  const stale = !!run && run.sig !== configSignature(lab);
  const report = run?.report;
  const done = report?.allPassed && !stale;
  return (
    <div className="guide-view" data-testid="challenge-view">
      <h3 className="guide-title" data-testid="challenge-title">{challenge.title || 'Challenge'}</h3>
      {challenge.goal.trim() && (
        <section className="guide-block">
          <GuideText text={challenge.goal} />
        </section>
      )}
      <div className="row">
        <button className="primary" onClick={runChallenge} disabled={challenge.checks.length === 0} data-testid="challenge-check">
          <Icon name="check" size={15} /> Check
        </button>
        {report && (
          <span className={`pill ${done ? 'up' : 'down'}`} data-testid="challenge-score">
            {report.passed}/{report.total} ผ่าน
          </span>
        )}
      </div>
      {challenge.start && (
        <div className="row" data-testid="challenge-reset-row">
          {!confirming ? (
            <button onClick={() => setConfirming(true)} data-testid="challenge-reset" title="กลับไปสถานะเริ่มต้นของโจทย์ (ย้อนกลับด้วย Undo ได้)">
              ↺ รีเซ็ตโจทย์
            </button>
          ) : (
            <>
              <span className="muted small">งานที่แก้ไว้จะหายจาก Lab (Undo ได้)</span>
              <button
                className="danger"
                onClick={() => {
                  reset();
                  setConfirming(false);
                }}
                data-testid="challenge-reset-confirm"
              >
                ยืนยันรีเซ็ต
              </button>
              <button onClick={() => setConfirming(false)} data-testid="challenge-reset-cancel">ยกเลิก</button>
            </>
          )}
        </div>
      )}
      {hints.length > 0 && (
        <div className="hint-box" data-testid="challenge-hints">
          {hints.slice(0, shownN).map((h, i) => (
            <div className="hint" key={i} data-testid={`hint-${i}`}>
              💡 <b>ใบ้ {i + 1}/{hints.length}:</b> {h}
            </div>
          ))}
          {shownN < hints.length ? (
            <button onClick={showNextHint} data-testid="challenge-hint-next">
              💡 ขอใบ้ ({shownN}/{hints.length})
            </button>
          ) : (
            <span className="muted small" data-testid="challenge-hint-done">เปิดคำใบ้ครบแล้ว</span>
          )}
        </div>
      )}
      {challenge.checks.length === 0 && <p className="muted small">โจทย์นี้ยังไม่มี Check — กด "แก้ไข" เพื่อเพิ่ม</p>}
      {stale && (
        <p className="muted small" data-testid="challenge-stale">
          ผลด้านล่างเป็นของก่อนที่คุณแก้ config/สาย — กด Check ใหม่
        </p>
      )}
      {done && (
        <div className="ok-box" role="status" data-testid="challenge-done">
          🎉 ผ่านครบทุกข้อแล้ว
        </div>
      )}
      <ul className="check-list">
        {challenge.checks.map((c) => {
          const r = report?.results[c.id];
          return (
            <li key={c.id} className={r ? (r.pass ? 'pass' : 'fail') : 'todo'} data-testid={`check-${c.id}`} data-state={r ? (r.pass ? 'pass' : 'fail') : 'todo'}>
              <span className="mark" aria-hidden>{r ? (r.pass ? '✓' : '✕') : '○'}</span>
              <span>
                {c.label}
                {r && !r.pass && <span className="muted small"> — {r.detail}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ChallengePanel() {
  const challenge = useStore((s) => s.lab.challenge);
  const lab = useStore((s) => s.lab);
  const setChallenge = useStore((s) => s.setChallenge);
  const setPanel = useStore((s) => s.setLeftPanel);
  const [editing, setEditing] = useState(false);
  return (
    <aside className="guide" aria-label="Challenge" data-testid="challenge-panel">
      <div className="guide-head">
        <b>Challenge</b>
        <span className="spacer" />
        {challenge && (
          <button className={editing ? 'primary' : ''} onClick={() => setEditing(!editing)} data-testid="challenge-edit-toggle">
            <Icon name={editing ? 'check' : 'edit'} size={15} /> {editing ? 'เสร็จ' : 'แก้ไข'}
          </button>
        )}
        <button onClick={() => setPanel(null)} title="ปิด Challenge" aria-label="ปิด Challenge" data-testid="challenge-close">
          ✕
        </button>
      </div>
      <div className="guide-body">
        {!challenge ? (
          <div className="guide-empty" data-testid="challenge-empty">
            <p>Lab นี้ยังไม่มีโจทย์ Challenge</p>
            <p className="muted small">กำหนดเงื่อนไข (เช่น PC-A ต้อง ping 10.0.0.1 ได้) แล้วให้ผู้เรียนกด Check เพื่อตรวจงาน — ผลตรวจประเมินจาก Lab จริง ไม่ใช่คำตอบตายตัว</p>
            <button
              className="primary"
              onClick={() => {
                setChallenge({ ...emptyChallenge(), start: captureStart(lab) });
                setEditing(true);
              }}
              data-testid="challenge-create"
            >
              + สร้างโจทย์
            </button>
          </div>
        ) : editing ? (
          <CheckEditor challenge={challenge} />
        ) : (
          <ChallengeView challenge={challenge} />
        )}
      </div>
    </aside>
  );
}
