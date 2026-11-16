/** Read-only inventory of the app catalog, CLI registry, challenge checks and samples (src = $NLS_SRC). */
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { PROFILES } from '@nls/core/profiles';
import { SPECS } from '@nls/core/cli/registry';
import { SAMPLES } from '@nls/core/sample';

it('inventory', () => {
  const profiles = Object.values(PROFILES).map((p: any) => ({ kind: p.kind, label: p.label, model: p.model, vendor: p.vendor, simLevel: p.simLevel, category: p.category, hasCli: p.hasCli, isHost: p.isHost, canForward: p.canForward, ports: (p.portNames ?? []).length, flags: Object.fromEntries(Object.entries(p).filter(([, v]) => typeof v === 'boolean')) }));
  const specs = SPECS.map((s) => ({ id: s.id, vendor: s.vendor, syntax: s.syntax, modes: s.modes, topic: s.topic, kinds: s.deviceTypes, verify: s.verify }));
  const samples = Object.entries(SAMPLES).map(([k, s]: [string, any]) => { const lab = s.build(); return { key: k, name: lab.name, devices: lab.devices.map((d: any) => d.kind), checks: (lab.challenge?.checks ?? []).map((c: any) => c.kind) }; });
  writeFileSync(process.env.INV_OUT!, JSON.stringify({ profiles, specs, samples }, null, 1));
});
