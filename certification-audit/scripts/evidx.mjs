// Builds sections E.1–E.4 of CERTIFICATION_EVIDENCE_INDEX.md from model.mjs and data/inventory.json.
// Usage: node certification-audit/scripts/evidx.mjs <outDir>
import { readFileSync, writeFileSync } from 'node:fs';
import { EV } from './model.mjs';
import { fileURLToPath } from 'node:url';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const OUT = process.argv[2]; if (!OUT) throw new Error('usage: node evidx.mjs <outDir>');
const inv = JSON.parse(readFileSync(HERE + '../data/inventory.json', 'utf8'));
let s = '';
s += '### E.1 Evidence dictionary (keys used in both matrices)\n\n| Key | Evidence |\n|---|---|\n';
for (const [k, v] of Object.entries(EV)) s += `| \`${k}\` | ${v.replace(/\|/g, '\|')} |\n`;
s += '\n### E.2 Device catalog (dumped from `PROFILES` at dcbf4cb)\n\n| Kind | Label | Vendor | simLevel | CLI | Host | Forwards | Ports |\n|---|---|---|---|:-:|:-:|:-:|---:|\n';
for (const p of inv.profiles) s += `| ${p.kind} | ${p.label} | ${p.vendor} | ${p.simLevel} | ${p.hasCli ? '✓' : '—'} | ${p.isHost ? '✓' : '—'} | ${p.canForward ? '✓' : '—'} | ${p.ports} |\n`;
s += `\n### E.3 CLI registry (all ${inv.specs.length} specs, dumped from \`SPECS\` at dcbf4cb)\n\n| # | Vendor | Topic | Modes | Syntax | Device kinds |\n|---:|---|---|---|---|---|\n`;
inv.specs.forEach((x, i) => { s += `| ${i + 1} | ${x.vendor} | ${x.topic} | ${x.modes.join(', ')} | \`${x.syntax.replace(/\|/g, '\|')}\` | ${x.kinds.length > 4 ? x.kinds.slice(0, 3).join(', ') + ` +${x.kinds.length - 3}` : x.kinds.join(', ')} |\n`; });
s += '\n### E.4 Sample Labs and challenge check kinds (dumped from `SAMPLES`)\n\n| Key | Name | Devices | Check kinds |\n|---|---|---:|---|\n';
for (const x of inv.samples) s += `| ${x.key} | ${x.name} | ${x.devices.length} | ${[...new Set(x.checks)].join(', ') || '— (not a challenge)'} |\n`;
writeFileSync(OUT + '/evidx-body.md', s);
console.log(s.length, inv.specs.length, inv.profiles.length);
