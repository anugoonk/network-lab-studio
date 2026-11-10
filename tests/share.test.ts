import { describe, expect, it } from 'vitest';
import { SAMPLES, type SampleKind } from '../src/core/sample';
import { serializeExport } from '../src/core/persist';
import { SHARE_MAX_BYTES, decodeShare, encodeShare, parseShare, shareFragmentOf } from '../src/core/share';

const kinds = Object.keys(SAMPLES) as SampleKind[];
const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');

describe('share links', () => {
  it.each(kinds)('%s survives encode → decode → import unchanged', async (k) => {
    const lab = SAMPLES[k].build();
    const frag = await encodeShare(lab);
    expect(frag.startsWith('lab=v1.')).toBe(true);
    expect(frag).toMatch(/^lab=v1\.[A-Za-z0-9_-]+$/); // safe in a URL fragment as is
    const r = await parseShare(frag);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.lab).toEqual(lab);
  });

  it('is much shorter than the exported file, and challenges keep their hints and start state', async () => {
    const lab = SAMPLES.campus.build();
    const frag = await encodeShare(lab);
    expect(frag.length).toBeLessThan(serializeExport(lab).length / 2);
    const r = await parseShare(frag);
    expect(r.ok && r.lab.challenge?.hints?.length).toBeGreaterThan(2);
    expect(r.ok && r.lab.challenge?.start?.devices.length).toBe(lab.devices.length);
  });

  it('accepts the fragment with or without the leading #', async () => {
    const frag = await encodeShare(SAMPLES.office.build());
    expect((await decodeShare(`#${frag}`)).ok).toBe(true);
    expect((await decodeShare(frag)).ok).toBe(true);
  });

  it('reads the uncompressed v0 form (browsers without streams write it)', async () => {
    const text = serializeExport(SAMPLES.intervlan.build());
    const r = await parseShare(`lab=v0.${b64url(new TextEncoder().encode(text))}`);
    expect(r.ok).toBe(true);
  });

  it('rejects truncated, garbled and foreign links without throwing', async () => {
    const frag = await encodeShare(SAMPLES.office.build());
    for (const bad of [
      frag.slice(0, frag.length - 40), // cut off by a chat app
      'lab=v1.@@@@',
      'lab=v1.',
      'lab=v2.AAAA',
      'lab=v1.AAAA',
      'notalab',
      '',
      `lab=v0.${b64url(new TextEncoder().encode('{"app":"other"}'))}`,
      `lab=v0.${b64url(new TextEncoder().encode('not json'))}`,
      `lab=v0.${b64url(new Uint8Array([0xff, 0xfe, 0xfd]))}`, // not UTF-8
    ]) {
      const r = await parseShare(bad);
      expect(r.ok, bad.slice(0, 30)).toBe(false);
    }
  });

  it('refuses a link that would inflate beyond the size limit', async () => {
    const big = new Uint8Array(SHARE_MAX_BYTES + 1024).fill(32);
    const z = new Uint8Array(await new Response(new Blob([big]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    expect(z.length).toBeLessThan(20000); // tiny on the wire…
    const d = await decodeShare(`lab=v1.${b64url(z)}`);
    expect(d.ok).toBe(false); // …but never expanded
  });

  it('only a #lab=… hash counts as a share link', () => {
    expect(shareFragmentOf('#lab=v1.abc')).toBe('lab=v1.abc');
    expect(shareFragmentOf('#other')).toBeNull();
    expect(shareFragmentOf('')).toBeNull();
  });
});
