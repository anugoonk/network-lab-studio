import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { promptFor, helpFor, completeLine } from '../core/cli/engine';
import { getDevice } from '../core/lab';
import { PROFILES } from '../core/profiles';
import { useStore } from '../store';

export function Console() {
  const sel = useStore((s) => s.selection);
  const lab = useStore((s) => s.lab);
  const exec = useStore((s) => s.exec);
  const transcripts = useStore((s) => s.transcripts);
  const pending = useStore((s) => s.pendingInput);
  const clear = useStore((s) => s.clearTranscript);
  const copyConfig = useStore((s) => s.copyConfig);
  const deviceId = sel?.type === 'device' ? sel.id : null;
  const device = deviceId ? getDevice(lab, deviceId) : undefined;

  const [value, setValue] = useState('');
  const [histPos, setHistPos] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const lines = (deviceId && transcripts[deviceId]) || [];

  useEffect(() => {
    setValue('');
    setHistPos(null);
  }, [deviceId]);

  useEffect(() => {
    if (pending && pending.deviceId === deviceId) {
      setValue(pending.text);
      setHistPos(null);
      inputRef.current?.focus();
    }
  }, [pending, deviceId]);

  useLayoutEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, deviceId]);

  if (!device) {
    return (
      <section className="card">
        <p className="muted">เลือกอุปกรณ์บน canvas (หรือดับเบิลคลิกอุปกรณ์) เพื่อเปิด Console / Terminal</p>
      </section>
    );
  }

  if (!PROFILES[device.kind].hasCli) {
    return (
      <section className="card" data-testid="console-unavailable">
        <p className="muted">{device.name} ({PROFILES[device.kind].label}) ไม่มี Console — โปรแกรมนี้จำลองเฉพาะการวางและต่อสายของอุปกรณ์ชนิดนี้</p>
      </section>
    );
  }
  const history = device.cli.history;
  const prompt = promptFor(device);
  const isPc = PROFILES[device.kind].isHost;

  const submit = () => {
    exec(device.id, value);
    setValue('');
    setHistPos(null);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      const next = histPos === null ? history.length - 1 : Math.max(0, histPos - 1);
      setHistPos(next);
      setValue(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histPos === null) return;
      const next = histPos + 1;
      if (next >= history.length) {
        setHistPos(null);
        setValue('');
      } else {
        setHistPos(next);
        setValue(history[next]);
      }
    } else if (e.key === 'Tab') {
      // keep focus in the console; complete the last word like IOS / AOS-CX
      e.preventDefault();
      const c = completeLine(device, value, lab);
      if (c.value !== value) {
        setValue(c.value);
        setHistPos(null);
      } else if (c.options.length) {
        useStore.setState((s) => ({
          transcripts: {
            ...s.transcripts,
            [device.id]: [
              ...(s.transcripts[device.id] ?? []),
              { kind: 'cmd', prompt, text: value },
              { kind: 'out', text: c.options.join('  ') },
            ],
          },
        }));
      }
    } else if (e.key === '?') {
      // IOS-style: `?` shows help immediately without pressing Enter
      e.preventDefault();
      useStore.setState((s) => ({
        transcripts: {
          ...s.transcripts,
          [device.id]: [
            ...(s.transcripts[device.id] ?? []),
            { kind: 'cmd', prompt, text: `${value}?` },
            ...helpFor(device, `${value}?`).map((t) => ({ kind: 'out' as const, text: t })),
          ],
        },
      }));
    }
  };

  return (
    <section className="console-wrap" data-testid="console">
      <div className="console-head">
        <b>{device.name}</b>
        <span className="muted small"> · {PROFILES[device.kind].label} · {isPc ? 'ipconfig / ping <IPv4>' : 'พิมพ์ ? เพื่อดูคำสั่ง'}</span>
        {!isPc && (
          <button className="link-btn" onClick={() => void copyConfig(device.id)} data-testid="console-copy-config">
            คัดลอก config
          </button>
        )}
        <button className="link-btn" onClick={() => clear(device.id)}>
          ล้างหน้าจอ
        </button>
      </div>
      <div className="console-log" ref={logRef} onClick={() => inputRef.current?.focus()} data-testid="console-log">
        {lines.length === 0 && <div className="out muted">{isPc ? 'Terminal พร้อมใช้งาน — ลอง ipconfig หรือ ping' : 'Console พร้อมใช้งาน — พิมพ์ ? เพื่อดูคำสั่งใน mode นี้'}</div>}
        {lines.map((l, i) =>
          l.kind === 'cmd' ? (
            <div key={i} className="cmd">
              <span className="prompt">{l.prompt}</span>
              {l.text}
            </div>
          ) : l.kind === 'hint' ? (
            <div key={i} className="hint">💡 {l.text}</div>
          ) : (
            <pre key={i} className="out">{l.text}</pre>
          ),
        )}
        <div className="cmd input-line">
          <span className="prompt" data-testid="console-prompt">{prompt}</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setHistPos(null);
            }}
            onKeyDown={onKey}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label="Console input"
            data-testid="console-input"
          />
        </div>
      </div>
      {PROFILES[device.kind].vendor === 'aruba' && (
        <details className="approx-note" data-testid="aruba-note">
          <summary>ℹ ผลลัพธ์ AOS-CX บางส่วนเป็นค่าประมาณ — กดดูรายการ</summary>
          <ul>
            <li><code>show arp</code> / <code>show mac-address-table</code>: รูปแบบและระยะห่างคอลัมน์เขียนจากความจำ ยังไม่ได้เทียบกับอุปกรณ์จริง</li>
            <li><code>vlan trunk allowed</code>: จำลองให้ <b>เพิ่มต่อจากรายการเดิม</b> (ลบด้วย <code>no vlan trunk allowed</code>) ตามข้อมูลที่พบ แต่ยังยืนยันกับเอกสารทางการโดยตรงไม่ได้</li>
            <li>prompt ตอนอยู่ใน <code>interface &lt;a&gt;-&lt;b&gt;</code> (range) เป็นรูปแบบโดยประมาณ</li>
            <li>พฤติกรรมเริ่มต้น (พอร์ตเริ่มเป็น shutdown และ routed) เป็นไปตามความเข้าใจ ยังไม่ได้ยืนยันกับเอกสาร</li>
          </ul>
          <p>ควรตรวจกับเอกสาร/อุปกรณ์ Aruba จริงก่อนใช้เป็นข้อสอบหรือขั้นตอนในงานจริง</p>
        </details>
      )}
      <p className="muted small">Enter = รันคำสั่ง · Tab = เติมคำสั่ง · ↑/↓ = ย้อนประวัติ · ? = ดูคำสั่งที่ใช้ได้ (ไม่ต้องกด Enter)</p>
    </section>
  );
}
