/** Read-only behaviour probes for the certification audit (src = $NLS_SRC). Nothing is written to the repo. */
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { executeLine } from '@nls/core/cli/engine';
import { buildInterVlanLab } from '@nls/core/sample';

it('probe', () => {
  const out: Record<string, unknown> = {};
  let lab = buildInterVlanLab();
  const id = (n: string) => lab.devices.find((d) => d.name === n)!.id;
  const run = (n: string, lines: string[]) => lines.map((l) => { const r = executeLine(lab, id(n), l); lab = r.lab; return { l, out: r.output, ok: r.ok }; });
  out.names = lab.devices.map((d) => `${d.name}:${d.kind}`);
  const r1 = lab.devices.find((d) => d.kind === 'cisco-router')!.name;
  out.hostRoute = run(r1, ['enable', 'configure terminal', 'ip route 172.31.5.5 255.255.255.255 10.0.0.2', 'end', 'show ip route']);
  out.floating = run(r1, ['configure terminal', 'ip route 172.31.6.0 255.255.255.0 10.0.0.2 200', 'end']);
  out.enableSecret = run(r1, ['configure terminal', 'enable secret cisco', 'end']);
  out.ospf = run(r1, ['configure terminal', 'router ospf 1', 'end']);
  out.ipv6 = run(r1, ['configure terminal', 'ipv6 unicast-routing', 'end']);
  out.cdp = run(r1, ['show cdp neighbors']);
  out.showLogging = run(r1, ['show logging']);
  writeFileSync(process.env.PROBE_OUT!, JSON.stringify(out, null, 1));
});
