import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const THAI = /[฀-๿]/;

// The language is read once when the modules load (the page reloads when it is switched), so this file loads them
// again with English stored — exactly what the app sees after pressing "EN".
let m: {
  SAMPLES: typeof import('../src/core/sample').SAMPLES;
  SPECS: typeof import('../src/core/cli/registry').SPECS;
  persist: typeof import('../src/core/persist');
  engine: typeof import('../src/core/cli/engine');
  sample: typeof import('../src/core/sample');
  lab: typeof import('../src/core/lab');
  network: typeof import('../src/core/network');
};

beforeAll(async () => {
  vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'nls.lang' ? 'en' : null), setItem: () => undefined });
  vi.resetModules();
  m = {
    SAMPLES: (await import('../src/core/sample')).SAMPLES,
    SPECS: (await import('../src/core/cli/registry')).SPECS,
    persist: await import('../src/core/persist'),
    engine: await import('../src/core/cli/engine'),
    sample: await import('../src/core/sample'),
    lab: await import('../src/core/lab'),
    network: await import('../src/core/network'),
  };
});
afterAll(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('English mode content', () => {
  it('every command description and check hint is English', () => {
    const bad = m.SPECS.flatMap((s) => [s.descTh, s.verifyTh]).filter((t) => THAI.test(t));
    expect(bad).toEqual([]);
  });

  it('sample labs contain no Thai text and still pass the file validation', () => {
    for (const k of Object.keys(m.SAMPLES) as (keyof typeof m.SAMPLES)[]) {
      const lab = m.SAMPLES[k].build();
      const text = m.persist.serializeExport(lab);
      const thai = text.split('\n').filter((l) => THAI.test(l)).slice(0, 3);
      expect(thai, `${k}: ${thai.join(' | ').slice(0, 160)}`).toEqual([]);
      expect(m.persist.parseImport(text).ok, k).toBe(true);
    }
  });

  it('catalog titles and hints are English', () => {
    for (const info of Object.values(m.SAMPLES)) expect(THAI.test(info.title + info.hint)).toBe(false);
  });

  it('CLI error hints, ping explanations and challenge details come out in English', () => {
    const lab = m.sample.buildTroubleshootLab();
    const sw1 = lab.devices.find((d) => d.name === 'SW1')!;
    const wrongMode = m.engine.executeLine(lab, sw1.id, 'interface fa0/1'); // user EXEC mode: needs configure terminal first
    expect(wrongMode.ok).toBe(false);
    expect(THAI.test(wrongMode.hintTh ?? '')).toBe(false);
    expect(wrongMode.hintTh).toMatch(/mode/);

    const pcB = lab.devices.find((d) => d.name === 'PC-B')!;
    const r = m.network.ping(lab, pcB.id, '192.168.20.12');
    expect(r.ok).toBe(false);
    expect(THAI.test(r.explanation.join(' '))).toBe(false);

    const report = lab.challenge!.checks.map((c) => c.label + c.kind);
    expect(report.some((t) => THAI.test(t))).toBe(false);
  });

  it('errors from the file validation are English', () => {
    const bad = m.persist.parseImport('{not json');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(THAI.test(bad.error)).toBe(false);
    const other = m.persist.parseImport('{"app":"other"}');
    expect(other.ok).toBe(false);
    if (!other.ok) expect(other.error).toMatch(/Network Lab Studio/);
  });
});
