import { describe, expect, it } from 'vitest';
import { emptyLab } from '../src/core/lab';
import { WORKSPACE_KEY, saveWorkspace } from '../src/core/persist';
import { newLabId } from '../src/core/persist';

const ws = () => {
  const id = newLabId();
  return { activeId: id, entries: [{ id, name: 'x', updatedAt: 1, savedSig: null, lab: emptyLab('x') }] };
};

describe('saveWorkspace reports whether the browser accepted the data', () => {
  it('true when stored', () => {
    const store: Record<string, string> = {};
    expect(saveWorkspace(ws(), { setItem: (k, v) => void (store[k] = v) })).toBe(true);
    expect(store[WORKSPACE_KEY]).toContain('"entries"');
  });

  it('false when the storage throws (quota exceeded / blocked)', () => {
    expect(
      saveWorkspace(ws(), {
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      }),
    ).toBe(false);
  });

  it('false when there is no storage at all', () => {
    expect(saveWorkspace(ws(), undefined)).toBe(false);
  });
});
