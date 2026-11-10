import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SPECS } from '../src/core/cli/registry';
import { MODE_LABEL, exampleFor, type CommandSpec } from '../src/core/cli/spec';
import { PROFILES } from '../src/core/profiles';
import type { DeviceKind } from '../src/core/types';

const START = '<!-- COMMANDS:START -->';
const END = '<!-- COMMANDS:END -->';

function table(title: string, kinds: DeviceKind[], vendor: 'cisco' | 'aruba' | 'pc'): string {
  const rows = SPECS.filter((s: CommandSpec) => s.vendor === vendor && kinds.some((k) => s.deviceTypes.includes(k)));
  const lines = [`### ${title}`, '', '| Mode | Syntax | ตัวอย่างที่รันได้ | คำอธิบาย |', '|---|---|---|---|'];
  for (const s of rows) {
    const modes = s.modes.map((m) => MODE_LABEL[vendor][m]?.replace(/\s*\(.*\)$/, '') ?? m).join(', ');
    lines.push(`| ${modes} | \`${s.syntax}\` | \`${exampleFor(s, kinds.find((k) => s.deviceTypes.includes(k))!)}\` | ${s.descTh} |`);
  }
  return lines.join('\n');
}

export function commandTables(): string {
  return [
    table(`Cisco IOS — Router (${PROFILES['cisco-router'].model}, ${PROFILES['cisco-router'].osRef})`, ['cisco-router'], 'cisco'),
    table(`Cisco IOS — Layer 2 Switch (${PROFILES['cisco-switch'].model}, ${PROFILES['cisco-switch'].osRef})`, ['cisco-switch'], 'cisco'),
    table(`Aruba AOS-CX — Layer 2 Switch (${PROFILES['aruba-switch'].model}, ${PROFILES['aruba-switch'].osRef})`, ['aruba-switch'], 'aruba'),
    table('PC Terminal', ['pc'], 'pc'),
  ].join('\n\n');
}

const toLf = (s: string) => s.replace(/\r\n/g, '\n');

/** the README block between the markers, line endings normalised (a Windows checkout may convert LF to CRLF) */
export function readmeBlock(readme: string): string {
  const lf = toLf(readme);
  return lf.slice(lf.indexOf(START), lf.indexOf(END) + END.length);
}

describe('README command tables', () => {
  it('match the command registry (set GEN_DOCS=1 to regenerate)', () => {
    const raw = fs.readFileSync('README.md', 'utf8');
    const readme = toLf(raw);
    const a = readme.indexOf(START);
    const b = readme.indexOf(END);
    expect(a).toBeGreaterThan(-1);
    const generated = `${START}\n\n${commandTables()}\n\n${END}`;
    if (process.env.GEN_DOCS) {
      const next = readme.slice(0, a) + generated + readme.slice(b + END.length);
      fs.writeFileSync('README.md', raw.includes('\r\n') ? next.replace(/\n/g, '\r\n') : next); // keep the file's own line endings
      return;
    }
    expect(readmeBlock(raw)).toBe(generated);
  });

  it('is not sensitive to CRLF line endings (Windows checkout with core.autocrlf=true)', () => {
    const lf = fs.readFileSync('README.md', 'utf8').replace(/\r\n/g, '\n');
    const crlf = lf.replace(/\n/g, '\r\n');
    expect(readmeBlock(crlf)).toBe(readmeBlock(lf));
    expect(readmeBlock(crlf)).toContain('### Cisco IOS');
  });
});
