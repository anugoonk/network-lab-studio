import { afterEach, describe, expect, it } from 'vitest';
import { SPECS } from '../src/core/cli/registry';
import { MODE_LABEL, MODE_PATH, TOPICS, exampleFor } from '../src/core/cli/spec';
import { PROFILES } from '../src/core/profiles';
import type { DeviceKind } from '../src/core/types';
import { setLangForTest } from '../src/i18n';
import {
  NO_FILTERS,
  copyMessage,
  copyText,
  exampleGroups,
  filterCommands,
  hasActiveFilters,
  kindOptions,
  modeOptions,
  modeSteps,
  moveIndex,
  primaryExample,
  vendorName,
} from '../src/ui/commandLibrary';

afterEach(() => setLangForTest('th'));

const ids = (f: Partial<typeof NO_FILTERS>) => filterCommands(SPECS, { ...NO_FILTERS, ...f }).map((s) => s.id);

describe('UI-CL01: every registry command stays in the library', () => {
  it('with no filter the list is exactly SPECS, same order, nothing added or lost', () => {
    expect(SPECS.length).toBeGreaterThan(100);
    expect(ids({})).toEqual(SPECS.map((s) => s.id));
    expect(new Set(ids({})).size).toBe(SPECS.length);
  });

  it('every command can be reached through each filter on its own (vendor, device type, mode, topic)', () => {
    for (const s of SPECS) {
      expect(ids({ vendor: s.vendor }), `${s.id} vendor`).toContain(s.id);
      expect(ids({ topic: s.topic }), `${s.id} topic`).toContain(s.id);
      for (const k of s.deviceTypes) expect(ids({ kind: k }), `${s.id} kind ${k}`).toContain(s.id);
      for (const m of s.modes) expect(ids({ mode: m }), `${s.id} mode ${m}`).toContain(s.id);
    }
  });

  it('the mode and device filters offer every mode / device kind some command uses (none unreachable)', () => {
    const modes = modeOptions(SPECS).map((o) => o.mode);
    expect(new Set(modes)).toEqual(new Set(SPECS.flatMap((s) => s.modes)));
    // config-subif and config-svi were missing from the old fixed list
    expect(modes).toContain('config-subif');
    expect(modes).toContain('config-svi');
    const kinds = kindOptions(SPECS).map((o) => o.kind);
    expect(new Set(kinds)).toEqual(new Set(SPECS.flatMap((s) => s.deviceTypes)));
    // the new IP end devices run the PC terminal commands, so they are offered too
    for (const k of ['printer', 'ip-camera', 'ip-phone', 'nvr', 'nas'] as DeviceKind[]) expect(kinds).toContain(k);
    for (const k of kinds) expect(PROFILES[k].hasCli).toBe(true);
  });

  it('the device-type filter keeps every command the device supports and nothing else', () => {
    for (const { kind } of kindOptions(SPECS)) {
      expect(ids({ kind })).toEqual(SPECS.filter((s) => s.deviceTypes.includes(kind)).map((s) => s.id));
    }
  });

  it('topics in the filter cover all commands', () => {
    expect(new Set(SPECS.map((s) => s.topic)).size).toBeLessThanOrEqual(TOPICS.length);
    for (const s of SPECS) expect(TOPICS).toContain(s.topic);
  });
});

describe('search and filters (same rules as before UI-CL01)', () => {
  it('every word of the query must match; vendor narrows the result', () => {
    expect(ids({ q: 'vlan access', vendor: 'aruba' })).toContain('aruba.vlan.access');
    expect(ids({ q: 'vlan access', vendor: 'aruba' })).not.toContain('cisco.switchport.vlan');
    expect(ids({ q: '   ' })).toEqual(SPECS.map((s) => s.id));
    expect(ids({ q: 'zzzz-no-such-command' })).toEqual([]);
  });

  it('search is case-insensitive and also matches vendor names and device labels', () => {
    expect(ids({ q: 'ARUBA' }).length).toBe(SPECS.filter((s) => s.vendor === 'aruba').length);
    expect(ids({ q: 'tracert' })).toContain(SPECS.find((s) => s.vendor === 'pc' && s.syntax.startsWith('tracert'))!.id);
  });

  it('filters combine with AND', () => {
    const r = filterCommands(SPECS, { ...NO_FILTERS, vendor: 'cisco', mode: 'config-if', topic: 'VLAN' });
    expect(r.length).toBeGreaterThan(0);
    for (const s of r) {
      expect(s.vendor).toBe('cisco');
      expect(s.modes).toContain('config-if');
      expect(s.topic).toBe('VLAN');
    }
  });

  it('hasActiveFilters is false only for the cleared state (spaces-only query counts as cleared)', () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...NO_FILTERS, q: '  ' })).toBe(false);
    expect(hasActiveFilters({ ...NO_FILTERS, q: 'vlan' })).toBe(true);
    expect(hasActiveFilters({ ...NO_FILTERS, vendor: 'pc' })).toBe(true);
    expect(hasActiveFilters({ ...NO_FILTERS, kind: 'pc' })).toBe(true);
    expect(hasActiveFilters({ ...NO_FILTERS, mode: 'config' })).toBe(true);
    expect(hasActiveFilters({ ...NO_FILTERS, topic: 'IP' })).toBe(true);
  });
});

describe('detail panel data', () => {
  it('mode steps come from the vendor tables unchanged', () => {
    for (const s of SPECS) {
      const steps = modeSteps(s);
      expect(steps.map((x) => x.mode)).toEqual(s.modes);
      for (const st of steps) {
        expect(st.label).toBe(MODE_LABEL[s.vendor][st.mode] ?? st.mode);
        expect(st.path).toBe(MODE_PATH[s.vendor][st.mode] ?? '');
      }
    }
  });

  it('example groups cover every supported device kind exactly once with its own example', () => {
    for (const s of SPECS) {
      const g = exampleGroups(s);
      expect(g.flatMap((x) => x.kinds).sort()).toEqual([...s.deviceTypes].sort());
      for (const x of g) for (const k of x.kinds) expect(exampleFor(s, k)).toBe(x.text);
      expect(new Set(g.map((x) => x.text)).size).toBe(g.length);
    }
  });

  it('the primary example is the target device’s own example, or the first supported kind’s', () => {
    for (const s of SPECS) {
      for (const k of s.deviceTypes) expect(primaryExample(s, k)).toBe(exampleFor(s, k));
      expect(primaryExample(s)).toBe(exampleFor(s, s.deviceTypes[0]));
      const other = (Object.keys(PROFILES) as DeviceKind[]).find((k) => !s.deviceTypes.includes(k))!;
      expect(primaryExample(s, other)).toBe(exampleFor(s, s.deviceTypes[0]));
    }
  });

  it('vendor names are unchanged', () => {
    expect(vendorName('cisco')).toBe('Cisco IOS');
    expect(vendorName('aruba')).toBe('Aruba AOS-CX');
    expect(vendorName('pc')).toBe('PC');
  });
});

describe('keyboard navigation index', () => {
  it('moves by one and stops at both ends', () => {
    expect(moveIndex(0, 1, 3)).toBe(1);
    expect(moveIndex(2, 1, 3)).toBe(2);
    expect(moveIndex(0, -1, 3)).toBe(0);
    expect(moveIndex(1, -1, 3)).toBe(0);
  });
  it('starts at the first/last item when nothing is selected, -1 for an empty list', () => {
    expect(moveIndex(-1, 1, 3)).toBe(0);
    expect(moveIndex(-1, -1, 3)).toBe(2);
    expect(moveIndex(0, 1, 0)).toBe(-1);
  });
});

describe('clipboard', () => {
  const err = (name: string) => Object.assign(new Error(name), { name });

  it('reports ok only when writeText resolved, and passes the exact text', async () => {
    const got: string[] = [];
    expect(await copyText('show vlan brief', { writeText: async (t) => void got.push(t) }, true)).toBe('ok');
    expect(got).toEqual(['show vlan brief']);
  });

  it('permission denial is reported as denied, other errors as failed', async () => {
    expect(await copyText('x', { writeText: () => Promise.reject(err('NotAllowedError')) }, true)).toBe('denied');
    expect(await copyText('x', { writeText: () => Promise.reject(err('SecurityError')) }, true)).toBe('denied');
    expect(await copyText('x', { writeText: () => Promise.reject(err('DataError')) }, true)).toBe('failed');
    expect(await copyText('x', { writeText: () => Promise.reject(undefined) }, true)).toBe('failed');
  });

  it('no Clipboard API or an insecure page is "unavailable" and never calls writeText', async () => {
    let called = false;
    const cb = { writeText: async () => void (called = true) };
    expect(await copyText('x', undefined, true)).toBe('unavailable');
    expect(await copyText('x', {}, true)).toBe('unavailable');
    expect(await copyText('x', cb, false)).toBe('unavailable');
    expect(called).toBe(false);
  });

  it('messages: success names the copied text; failures never say "copied"', () => {
    expect(copyMessage('ok', 'ping 10.0.0.1')).toBe('คัดลอกแล้ว: ping 10.0.0.1');
    for (const r of ['denied', 'unavailable', 'failed'] as const) {
      expect(copyMessage(r, 'x')).toMatch(/^คัดลอกไม่สำเร็จ/);
      expect(copyMessage(r, 'x')).toContain('Ctrl+C');
    }
    setLangForTest('en');
    expect(copyMessage('ok', 'ping 10.0.0.1')).toBe('Copied: ping 10.0.0.1');
    for (const r of ['denied', 'unavailable', 'failed'] as const) {
      expect(copyMessage(r, 'x')).toMatch(/^Copy failed/);
      expect(copyMessage(r, 'x')).not.toMatch(/[฀-๿]/);
    }
  });
});
