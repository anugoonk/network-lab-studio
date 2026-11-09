import { useState } from 'react';
import { CHALLENGE_LIMITS, defaultLabel, emptyChallenge, nextCheckId } from '../core/challenge';
import { configSignature, getDevice } from '../core/lab';
import { parseIp } from '../core/ip';
import type { Challenge, Check } from '../core/types';
import { useStore } from '../store';
import { GuideText } from './GuidePanel';
import { Icon } from './Icons';

function CheckEditor({ challenge }: { challenge: Challenge }) {
  const lab = useStore((s) => s.lab);
  const update = useStore((s) => s.updateChallenge);
  const setChallenge = useStore((s) => s.setChallenge);
  const hosts = lab.devices;
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expect, setExpect] = useState<'success' | 'fail'>('success');
  const [port, setPort] = useState('');
  const [portDev, setPortDev] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const full = challenge.checks.length >= CHALLENGE_LIMITS.checks;

  const add = (c: Check) => {
    update((ch) => ({ ...ch, checks: [...ch.checks, c] }));
    setErr(null);
  };

  const addPing = () => {
    const src = from || hosts[0]?.id;
    if (!src) return setErr('ยังไม่มีอุปกรณ์ใน Lab');
    if (parseIp(to.trim()) === null) return setErr('IPv4 ปลายทางไม่ถูกต้อง');
    const c: Check = { id: nextCheckId(challenge), kind: 'ping', label: '', from: src, to: to.trim(), expect };
    add({ ...c, label: defaultLabel(lab, c) });
    setTo('');
  };

  const addLinkUp = () => {
    const dev = getDevice(lab, portDev || hosts[0]?.id || '');
    if (!dev) return setErr('ยังไม่มีอุปกรณ์ใน Lab');
    const p = port || dev.ifaces[0].name;
    if (!dev.ifaces.some((i) => i.name === p)) return setErr('ไม่พบพอร์ต');
    const c: Check = { id: nextCheckId(challenge), kind: 'link-up', label: '', deviceId: dev.id, port: p };
    add({ ...c, label: defaultLabel(lab, c) });
  };

  const portDevice = getDevice(lab, portDev || hosts[0]?.id || '');

  return (
    <div className="guide-edit" data-testid="challenge-editor">
      <label htmlFor="ch-title">ชื่อโจทย์</label>
      <input id="ch-title" value={challenge.title} maxLength={120} onChange={(e) => update((c) => ({ ...c, title: e.target.value }))} data-testid="challenge-title-input" />
      <label htmlFor="ch-goal">เป้าหมาย / สถานการณ์</label>
      <textarea id="ch-goal" rows={4} value={challenge.goal} maxLength={4000} onChange={(e) => update((c) => ({ ...c, goal: e.target.value }))} data-testid="challenge-goal-input" />

      <h4 className="guide-edit-h">Check ({challenge.checks.length}/{CHALLENGE_LIMITS.checks})</h4>
      {challenge.checks.map((c, i) => (
        <div className="guide-edit-card" key={c.id}>
          <input
            value={c.label}
            maxLength={200}
            aria-label={`ชื่อ Check ${i + 1}`}
            onChange={(e) => update((ch) => ({ ...ch, checks: ch.checks.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)) }))}
          />
          <div className="row">
            <span className="muted small">{c.kind === 'ping' ? 'ping' : 'link-up'}</span>
            <span className="spacer" />
            <button className="danger" onClick={() => update((ch) => ({ ...ch, checks: ch.checks.filter((x) => x.id !== c.id) }))} aria-label={`ลบ Check ${i + 1}`} data-testid={`challenge-del-${c.id}`}>
              ลบ
            </button>
          </div>
        </div>
      ))}

      <h4 className="guide-edit-h">เพิ่ม Check: ping</h4>
      <div className="row">
        <select value={from || hosts[0]?.id || ''} onChange={(e) => setFrom(e.target.value)} aria-label="ping จาก" data-testid="challenge-from">
          {hosts.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <input placeholder="IPv4 ปลายทาง" value={to} onChange={(e) => setTo(e.target.value)} aria-label="IPv4 ปลายทาง" data-testid="challenge-to" />
      </div>
      <div className="row">
        <select value={expect} onChange={(e) => setExpect(e.target.value as 'success' | 'fail')} aria-label="ผลที่คาดหวัง" data-testid="challenge-expect">
          <option value="success">ต้อง ping ได้</option>
          <option value="fail">ต้อง ping ไม่ได้</option>
        </select>
        <button onClick={addPing} disabled={full} data-testid="challenge-add-ping">+ เพิ่ม</button>
      </div>

      <h4 className="guide-edit-h">เพิ่ม Check: ลิงก์ up</h4>
      <div className="row">
        <select value={portDev || hosts[0]?.id || ''} onChange={(e) => { setPortDev(e.target.value); setPort(''); }} aria-label="อุปกรณ์" data-testid="challenge-port-dev">
          {hosts.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select value={port || portDevice?.ifaces[0]?.name || ''} onChange={(e) => setPort(e.target.value)} aria-label="พอร์ต" data-testid="challenge-port">
          {portDevice?.ifaces.map((i) => (
            <option key={i.name} value={i.name}>{i.name}</option>
          ))}
        </select>
        <button onClick={addLinkUp} disabled={full} data-testid="challenge-add-link">+ เพิ่ม</button>
      </div>
      {err && <div className="error-box" role="alert">{err}</div>}

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
                setChallenge(emptyChallenge());
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
