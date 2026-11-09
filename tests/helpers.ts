import { executeLine, type ExecResult } from '../src/core/cli/engine';
import { getDevice } from '../src/core/lab';
import { buildSampleLab } from '../src/core/sample';
import type { Lab } from '../src/core/types';

export function byName(lab: Lab, name: string) {
  const d = lab.devices.find((x) => x.name === name);
  if (!d) throw new Error(`no device ${name}`);
  return d;
}

/** Runs lines on a device, threading the Lab through. Returns final lab and every result. */
export function run(lab: Lab, name: string, lines: string[]): { lab: Lab; results: ExecResult[] } {
  const id = byName(lab, name).id;
  const results: ExecResult[] = [];
  for (const l of lines) {
    const r = executeLine(lab, id, l);
    lab = r.lab;
    results.push(r);
  }
  return { lab, results };
}

export const sample = () => buildSampleLab();
export const dev = (lab: Lab, name: string) => getDevice(lab, byName(lab, name).id)!;
