// Vitest config for the read-only certification probes. It is NOT picked up by the project's own `npx vitest run`
// (vite.config.ts only includes tests/**). Run from the repository root:
//   INV_OUT=<file> PROBE_OUT=<file> npx vitest run -c certification-audit/probes/vitest.config.mjs
// The probes import the application source through the '@nls' alias and only write the two JSON files given above.
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default {
  // keep vitest's cache out of the audit folder
  cacheDir: join(tmpdir(), 'nls-cert-probes-cache'),
  resolve: { alias: { '@nls': fileURLToPath(new URL('../../src', import.meta.url)) } },
  server: { fs: { strict: false } },
  test: { root: fileURLToPath(new URL('.', import.meta.url)), include: ['*.test.ts'], environment: 'node' },
};
