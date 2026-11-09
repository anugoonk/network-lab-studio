import { describe, expect, it } from 'vitest';
import { COALESCE_MS, HISTORY_LIMIT, emptyHistory, recordChange, redoStep, undoStep, type History } from '../src/core/history';
import { addDevice, addLink, emptyLab, removeDevice, updateDevice } from '../src/core/lab';
import type { Lab } from '../src/core/types';
import { byName, dev, run, sample } from './helpers';

/** applies an edit the way the store does: new lab → record */
function step(h: History, lab: Lab, next: Lab, t: number) {
  return { h: recordChange(h, lab, next, t), lab: next };
}

describe('recording', () => {
  it('adds one undo step per discrete edit, and a new edit clears redo', () => {
    let lab = emptyLab();
    let h = emptyHistory();
    for (let i = 0; i < 3; i++) {
      const next = addDevice(lab, 'pc', 0, 0).lab;
      ({ h, lab } = step(h, lab, next, i * 10_000));
    }
    expect(h.past).toHaveLength(3);
    const u = undoStep(h, lab)!;
    expect(u.lab.devices).toHaveLength(2);
    expect(u.history.future).toHaveLength(1);
    const next = addDevice(u.lab, 'laptop', 0, 0).lab;
    const h2 = recordChange(u.history, u.lab, next, 99_000);
    expect(h2.future).toHaveLength(0);
  });

  it('ignores changes that only touch CLI mode / history', () => {
    const lab = sample();
    const h = emptyHistory();
    const typed = run(lab, 'SW1', ['enable', 'show vlan brief']).lab; // no config change
    expect(recordChange(h, lab, typed, 0)).toBe(h);
  });

  it('merges a drag (many tiny moves) into one step, but a later drag is a new step', () => {
    let lab = addDevice(emptyLab(), 'pc', 0, 0).lab;
    const id = lab.devices[0].id;
    let h = emptyHistory();
    for (let i = 1; i <= 20; i++) ({ h, lab } = step(h, lab, updateDevice(lab, id, (d) => ({ ...d, x: i * 5 })), 1000 + i * 16));
    expect(h.past).toHaveLength(1);
    ({ h, lab } = step(h, lab, updateDevice(lab, id, (d) => ({ ...d, x: 500 })), 1000 + COALESCE_MS * 3));
    expect(h.past).toHaveLength(2);
    // undoing the first drag returns to x=0
    let u = undoStep(h, lab)!;
    u = undoStep(u.history, u.lab)!;
    expect(u.lab.devices[0].x).toBe(0);
  });

  it('merges guide typing, but not a device edit in between', () => {
    let lab = addDevice(emptyLab(), 'pc', 0, 0).lab;
    let h = emptyHistory();
    ({ h, lab } = step(h, lab, { ...lab, guide: { title: 'a', objective: '', sections: [], resources: [] } }, 100));
    ({ h, lab } = step(h, lab, { ...lab, guide: { ...lab.guide!, title: 'ab' } }, 200));
    ({ h, lab } = step(h, lab, { ...lab, guide: { ...lab.guide!, title: 'abc' } }, 300));
    expect(h.past).toHaveLength(1);
    ({ h, lab } = step(h, lab, addDevice(lab, 'pc', 0, 0).lab, 400));
    ({ h, lab } = step(h, lab, { ...lab, guide: { ...lab.guide!, title: 'abcd' } }, 500));
    expect(h.past).toHaveLength(3);
  });

  it('keeps at most HISTORY_LIMIT steps', () => {
    let lab = emptyLab();
    let h = emptyHistory();
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) ({ h, lab } = step(h, lab, addDevice(lab, 'pc', 0, 0).lab, i * 10_000));
    expect(h.past).toHaveLength(HISTORY_LIMIT);
  });
});

describe('undo / redo', () => {
  it('undo then redo restores exactly the same lab content', () => {
    const lab0 = sample();
    const lab1 = removeDevice(lab0, byName(lab0, 'PC-01').id);
    const h = recordChange(emptyHistory(), lab0, lab1, 0);
    const u = undoStep(h, lab1)!;
    expect(u.lab.devices.map((d) => d.id)).toEqual(lab0.devices.map((d) => d.id));
    expect(u.lab.links).toEqual(lab0.links); // deleting a device removed its cable — undo brings it back
    const r = redoStep(u.history, u.lab)!;
    expect(r.lab.devices.map((d) => d.id)).toEqual(lab1.devices.map((d) => d.id));
    expect(r.lab.links).toEqual(lab1.links);
    expect(redoStep(r.history, r.lab)).toBeNull();
    expect(undoStep(emptyHistory(), lab0)).toBeNull();
  });

  it('undoing a cable restores the port', () => {
    let lab = emptyLab();
    const a = addDevice(lab, 'pc', 0, 0);
    const b = addDevice(a.lab, 'laptop', 0, 0);
    lab = b.lab;
    const linked = addLink(lab, { deviceId: a.device.id, port: 'Ethernet0' }, { deviceId: b.device.id, port: 'Ethernet0' }).lab;
    const h = recordChange(emptyHistory(), lab, linked, 0);
    const u = undoStep(h, linked)!;
    expect(u.lab.links).toHaveLength(0);
    expect(addLink(u.lab, { deviceId: a.device.id, port: 'Ethernet0' }, { deviceId: b.device.id, port: 'Ethernet0' }).error).toBeNull();
  });

  it('undoing a CLI config change reverts config and resets that device to its starting mode, others keep their session', () => {
    const lab0 = run(sample(), 'SW2', ['configure terminal', 'interface 1/1/24']).lab; // SW2 is in config-if
    const lab1 = run(lab0, 'SW2', ['shutdown']).lab; // config change
    const lab1b = run(lab1, 'SW1', ['enable']).lab; // only cli changed on another device
    let h = recordChange(emptyHistory(), lab0, lab1, 0);
    h = recordChange(h, lab1, lab1b, 1);
    expect(dev(lab1b, 'SW2').ifaces.find((i) => i.name === '1/1/24')!.adminUp).toBe(false);
    const u = undoStep(h, lab1b)!;
    expect(dev(u.lab, 'SW2').ifaces.find((i) => i.name === '1/1/24')!.adminUp).toBe(true);
    expect(dev(u.lab, 'SW2').cli.mode).toBe('priv'); // Aruba start mode
    expect(dev(u.lab, 'SW2').cli.ctxIface).toBeNull();
    expect(dev(u.lab, 'SW1').cli.mode).toBe('priv'); // untouched session kept (SW1 typed `enable`)
    expect(dev(u.lab, 'SW2').cli.history).toEqual(dev(lab1b, 'SW2').cli.history);
  });

  it('a subinterface created by a command disappears on undo without leaving the CLI pointing at it', () => {
    const lab0 = run(sample(), 'R1', ['enable', 'configure terminal', 'interface gi0/0']).lab;
    const lab1 = run(lab0, 'R1', ['interface gi0/0.10']).lab;
    expect(dev(lab1, 'R1').subifs).toHaveLength(1);
    const h = recordChange(emptyHistory(), lab0, lab1, 0);
    const u = undoStep(h, lab1)!;
    expect(dev(u.lab, 'R1').subifs).toHaveLength(0);
    expect(dev(u.lab, 'R1').cli.ctxIface).toBeNull();
  });
});
