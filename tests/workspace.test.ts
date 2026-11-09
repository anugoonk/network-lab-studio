import { beforeEach, describe, expect, it } from 'vitest';
import { emptyGuide, moveItem, parseGuideText, safeHref } from '../src/core/guide';
import { contentSignature, emptyLab } from '../src/core/lab';
import { WORKSPACE_KEY, loadWorkspace, newLabId, parseImport, saveWorkspace, serializeExport, STORAGE_KEY } from '../src/core/persist';
import { buildInterVlanLab, buildSampleLab } from '../src/core/sample';
import { useStore } from '../src/store';

describe('guide helpers', () => {
  it('parses paragraphs, bullets and numbered lists', () => {
    const b = parseGuideText('หัวข้อ\n- a\n- b\n\n1. x\n2) y\nจบ');
    expect(b).toEqual([
      { kind: 'p', text: 'หัวข้อ' },
      { kind: 'ul', items: ['a', 'b'] },
      { kind: 'ol', items: ['x', 'y'] },
      { kind: 'p', text: 'จบ' },
    ]);
  });

  it('only http(s) links are considered safe', () => {
    expect(safeHref('https://example.com/a')).toBe('https://example.com/a');
    expect(safeHref(' http://example.com ')).toBe('http://example.com');
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x', '//x.com', 'https://a b', '']) expect(safeHref(bad)).toBeNull();
  });

  it('moves list items within bounds', () => {
    expect(moveItem([1, 2, 3], 2, 0)).toEqual([3, 1, 2]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 0, 3)).toEqual([1, 2, 3]);
  });
});

describe('guide in the lab file', () => {
  it('sample labs ship with a guide that survives export/import', () => {
    for (const lab of [buildSampleLab(), buildInterVlanLab()]) {
      expect(lab.guide?.sections.length).toBeGreaterThan(2);
      const r = parseImport(serializeExport(lab));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.lab.guide).toEqual(lab.guide);
    }
  });

  it('labs without a guide still import (guide is optional)', () => {
    const lab = emptyLab('x');
    expect(parseImport(serializeExport(lab)).ok).toBe(true);
  });

  it('editing the guide changes the content signature (unsaved-work detection)', () => {
    const lab = buildSampleLab();
    const edited = { ...lab, guide: { ...lab.guide!, title: 'เปลี่ยน' } };
    expect(contentSignature(edited)).not.toBe(contentSignature(lab));
  });

  const mutate = (fn: (j: { lab: { guide: Record<string, unknown> } }) => void) => {
    const j = JSON.parse(serializeExport(buildSampleLab()));
    fn(j);
    return parseImport(JSON.stringify(j));
  };

  it('rejects a guide with wrong types, too many items, or a non-http link', () => {
    expect(mutate((j) => (j.lab.guide.title = 5)).ok).toBe(false);
    expect(mutate((j) => (j.lab.guide.sections = Array.from({ length: 51 }, () => ({ heading: 'a', body: 'b' })))).ok).toBe(false);
    expect(mutate((j) => (j.lab.guide.resources = [{ label: 'x', url: 'javascript:alert(1)' }])).ok).toBe(false);
    expect(mutate((j) => (j.lab.guide.resources = [{ label: 'x', url: 'https://ok.example/' }])).ok).toBe(true);
    expect(mutate((j) => (j.lab.guide.objective = 'x'.repeat(4001))).ok).toBe(false);
  });
});

describe('workspace storage', () => {
  const memory = () => {
    const mem = new Map<string, string>();
    return { mem, storage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) } };
  };

  it('round-trips several labs and the active id', () => {
    const { storage } = memory();
    const a = buildSampleLab();
    const b = buildInterVlanLab();
    const ids = [newLabId(), newLabId()];
    expect(ids[0]).not.toBe(ids[1]);
    saveWorkspace(
      {
        activeId: ids[1],
        entries: [
          { id: ids[0], name: a.name, updatedAt: 1, savedSig: null, lab: a },
          { id: ids[1], name: b.name, updatedAt: 2, savedSig: 'sig', lab: b },
        ],
      },
      storage,
    );
    const ws = loadWorkspace(storage)!;
    expect(ws.activeId).toBe(ids[1]);
    expect(ws.entries.map((e) => e.lab.name)).toEqual([a.name, b.name]);
    expect(ws.entries[1].savedSig).toBe('sig');
  });

  it('skips corrupt entries and falls back to a valid one', () => {
    const { mem, storage } = memory();
    const a = buildSampleLab();
    mem.set(
      WORKSPACE_KEY,
      JSON.stringify({
        activeId: 'broken',
        entries: [
          { id: 'broken', updatedAt: 1, lab: { nope: true } },
          { id: 'good', updatedAt: 2, savedSig: null, lab: a },
        ],
      }),
    );
    const ws = loadWorkspace(storage)!;
    expect(ws.entries.map((e) => e.id)).toEqual(['good']);
    expect(ws.activeId).toBe('good');
    mem.set(WORKSPACE_KEY, 'not json');
    expect(loadWorkspace(storage)).toBeNull();
  });

  it('migrates the single-lab storage of the first version', () => {
    const { mem, storage } = memory();
    const a = buildSampleLab();
    mem.set(STORAGE_KEY, JSON.stringify({ lab: a, savedSig: 'old' }));
    const ws = loadWorkspace(storage)!;
    expect(ws.entries).toHaveLength(1);
    expect(ws.entries[0].lab.name).toBe(a.name);
    expect(ws.entries[0].savedSig).toBe('old');
    expect(ws.activeId).toBe(ws.entries[0].id);
  });
});

describe('Lab Manager actions (store)', () => {
  const st = () => useStore.getState();
  const rows = () => st().summaries();

  beforeEach(() => {
    // reset to a single sample lab
    useStore.setState({ lab: buildSampleLab(), others: [], activeId: 'start', view: 'lab', confirmDelete: null });
    useStore.setState({ savedSig: contentSignature(st().lab) });
  });

  it('starts with the open lab as the only row', () => {
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toMatchObject({ id: 'start', active: true, hasGuide: true, devices: 13, links: 12 });
  });

  it('createLab keeps the previous lab and opens the new one with its guide', () => {
    const before = st().lab;
    const id = st().createLab('intervlan');
    expect(st().activeId).toBe(id);
    expect(st().lab.name).toMatch(/Inter-VLAN/);
    expect(st().leftPanel).toBe('guide');
    expect(st().others.map((e) => e.lab)).toContain(before);
    expect(rows()).toHaveLength(2);
    const blank = st().createLab('blank');
    expect(st().lab.guide).toBeUndefined();
    expect(st().leftPanel).toBe('menu');
    expect(st().activeId).toBe(blank);
    expect(rows()).toHaveLength(3);
  });

  it('openLab switches labs and keeps edits made in each lab', () => {
    const office = st().lab;
    st().createLab('intervlan');
    st().renameLab('Renamed Inter-VLAN');
    st().openLab('start');
    expect(st().lab).toBe(office);
    expect(st().activeId).toBe('start');
    const other = rows().find((r) => !r.active)!;
    expect(other.name).toBe('Renamed Inter-VLAN');
    st().openLab(other.id);
    expect(st().lab.name).toBe('Renamed Inter-VLAN');
    // opening the lab that is already open just shows it
    st().setView('manager');
    st().openLab(st().activeId);
    expect(st().view).toBe('lab');
  });

  it('duplicateLab copies content under a new id without opening it', () => {
    st().duplicateLab('start');
    expect(rows()).toHaveLength(2);
    const copy = rows().find((r) => !r.active)!;
    expect(copy.name).toMatch(/สำเนา/);
    expect(st().activeId).toBe('start');
    const entry = st().others.find((e) => e.id === copy.id)!;
    expect(entry.lab.guide).toEqual(st().lab.guide);
    expect(entry.lab).not.toBe(st().lab); // deep copy
    entry.lab.devices[0].name = 'CHANGED';
    expect(st().lab.devices[0].name).toBe('R1');
  });

  it('delete asks first, removes other labs, and opens a neighbour when the open lab is deleted', () => {
    st().createLab('intervlan');
    const open = st().activeId;
    st().requestDeleteLabs(['start']);
    expect(st().confirmDelete).toEqual(['start']);
    st().cancelDelete();
    expect(rows()).toHaveLength(2);
    st().requestDeleteLabs(['start']);
    st().confirmDeleteLabs();
    expect(rows()).toHaveLength(1);
    expect(st().activeId).toBe(open);

    st().requestDeleteLabs([open]);
    st().confirmDeleteLabs();
    expect(rows()).toHaveLength(1); // never leaves the workspace empty
    expect(st().lab.name).toBe('New Lab');
    expect(st().view).toBe('manager');
  });

  it('importAsEntry adds a lab without switching; invalid files change nothing', () => {
    const text = serializeExport(buildInterVlanLab());
    expect(st().importAsEntry(text, 'x.json')).toBeNull();
    expect(rows()).toHaveLength(2);
    expect(st().activeId).toBe('start');
    const err = st().importAsEntry('{"app":"network-lab-studio","schemaVersion":1,"lab":{}}', 'bad.json');
    expect(err).toBeTruthy();
    expect(rows()).toHaveLength(2);
  });

  it('guide edits through the store mark the lab as changed', () => {
    const before = st().isDirty();
    expect(before).toBe(false);
    st().updateGuide((g) => ({ ...g, title: 'แก้โดยผู้สอน' }));
    expect(st().lab.guide?.title).toBe('แก้โดยผู้สอน');
    expect(st().isDirty()).toBe(true);
    st().setGuide(undefined);
    expect(st().lab.guide).toBeUndefined();
    st().updateGuide((g) => ({ ...g, title: 'x' })); // creates from an empty guide
    expect(st().lab.guide?.sections.length).toBe(emptyGuide().sections.length);
  });

  it('lab rename validates', () => {
    expect(st().renameLab('   ')).toBeTruthy();
    expect(st().renameLab('x'.repeat(121))).toBeTruthy();
    expect(st().renameLab('  ชื่อใหม่ ')).toBeNull();
    expect(st().lab.name).toBe('ชื่อใหม่');
  });

  it('left dock toggles are mutually exclusive between menu and guide', () => {
    st().setLeftPanel('guide');
    st().toggleMenu();
    expect(st().leftPanel).toBe('menu');
    st().toggleGuide();
    expect(st().leftPanel).toBe('guide');
    st().toggleLeft();
    expect(st().leftPanel).toBeNull();
    st().toggleLeft();
    expect(st().leftPanel).toBe('menu');
  });
});
