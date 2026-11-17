// Self-test of the stable-anchor mechanism (anchors.mjs): builds a throw-away mini repository in the OS temp dir and checks that
//   harmless changes keep every anchor valid, and that meaningful, ambiguous, unsafe or malformed input is rejected (fail-closed).
// Usage: node certification-audit/scripts/anchors-selftest.mjs      Exit code 0 only if every scenario that can run behaves as required.
// Writes only inside a temp directory it creates and removes; the repository is not touched. A scenario the platform cannot run
// (e.g. creating a symlink without the privilege) is reported SKIP and counted as NOT passed-by-evidence, never as PASS.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildRegistry, canon, checkAll, extractRefs, loadRegistry, MAX_FILE, MAX_LINE } from './anchors.mjs';

const dir = mkdtempSync(join(tmpdir(), 'nls-anchor-'));
const dirOut = mkdtempSync(join(tmpdir(), 'nls-anchor-out-')); // target of the escaping link: a second temp dir OUTSIDE the mini repository
const T = dir.split('\\').join('/');
mkdirSync(join(dir, 'src'));
mkdirSync(join(dir, 'tests'));
const SRC = ['// header', 'export function alpha(x: number) {', '  return x + 1;', '}', '', 'export function beta(y: string) {', '  return y.trim();', '}', ''].join('\n');
const TST = ['import { it } from "vitest";', "it('does a thing', () => {", '  expect(1).toBe(1);', '});', "it('does another thing', () => {", '});', ''].join('\n');
const write = (srcText = SRC, tstText = TST) => { writeFileSync(join(dir, 'src/a.ts'), srcText); writeFileSync(join(dir, 'tests/a.test.ts'), tstText); };
const EV = { 'k.src': 'src/a.ts — alpha() l.2, beta() l.6', 'k.tst': 'tests/a.test.ts:2, :5 "does a thing"' };

let failures = 0, skipped = 0;
const results = [];
const expect = (name, got, want) => { const ok = got === want; if (!ok) failures++; results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${got}, wanted ${want})`}`); };
const skip = (name, why) => { skipped++; results.push(`SKIP  ${name}  (${why})`); };
const problems = (ev, reg) => checkAll(ev, reg, T).bad;
const clone = (o) => JSON.parse(JSON.stringify(o));
/** a one-line source file whose line 1 is cited; returns the number of problems after the file is replaced by `after` */
function oneLine(before, after) {
  writeFileSync(join(dir, 'src/one.ts'), before + '\n');
  const ev = { 'k.one': 'src/one.ts:1' };
  const reg = buildRegistry(ev, T);
  writeFileSync(join(dir, 'src/one.ts'), after + '\n');
  return problems(ev, reg);
}
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

try {
  write();
  const reg = buildRegistry(EV, T);
  expect('registry has one anchor per cited location', reg.anchors.length, 4);
  expect('registry declares schema 2 / token-v1', reg.schema === 2 && reg.normalization === 'token-v1', true);
  expect('deterministic: building twice gives identical registries', JSON.stringify(buildRegistry(EV, T)) === JSON.stringify(reg), true);
  expect('baseline: all anchors resolve', problems(EV, reg), 0);

  // ── A. harmless changes
  write('// a new comment\n// another\n\nconst unrelated = 1;\n' + SRC, TST);
  const moved = checkAll(EV, reg, T);
  expect('A1 code added above (lines move): still valid', moved.bad, 0);
  expect('A1 drift is reported as informational', moved.drift > 0, true);
  write(SRC.replace('  return x + 1;', '    return   x   +   1;'), TST);
  expect('A2 re-indented / re-spaced code lines: still valid', problems(EV, reg), 0);
  write(SRC.replace('export function alpha(x: number) {', 'export  function  alpha( x: number )  {'), TST);
  expect('A3 spacing around punctuation in the cited line: still valid', problems(EV, reg), 0);
  write(SRC.replace('// header\n', '/** doc */\n// header\n'), TST);
  expect('A4 comment-only change elsewhere: still valid', problems(EV, reg), 0);
  write(SRC.replace('alpha(x: number) {', 'alpha(x: number) { // trailing comment'), TST);
  expect('A5 comment appended to the cited line: still valid (comments are not code)', problems(EV, reg), 0);
  write(SRC, TST.split('\n').reverse().join('\n'));
  expect('A6 reordered test file (titles still present once): still valid', problems(EV, reg), 0);
  write();

  // ── B. meaningful changes
  write(SRC.replace('alpha(x: number)', 'alpha(x: number, z = 0)'), TST);
  expect('B1 cited line content modified: rejected', problems(EV, reg) > 0, true);
  write(SRC.replace('export function alpha', 'export function alpha2'), TST);
  expect('B2 symbol renamed: rejected', problems(EV, reg) > 0, true);
  write(SRC.replace('export function beta(y: string) {\n  return y.trim();\n}\n', ''), TST);
  expect('B3 cited symbol removed: rejected', problems(EV, reg) > 0, true);
  write(SRC + '\nexport function alpha(x: number) {\n  return 0;\n}\n', TST);
  expect('B4 anchor line duplicated (ambiguous): rejected', problems(EV, reg) > 0, true);
  write(SRC, TST.replace("it('does a thing'", "it('does a thing (renamed)'"));
  expect('B5 test title edited: rejected', problems(EV, reg) > 0, true);
  write(SRC, TST + "it('does a thing', () => {\n");
  expect('B6 test title duplicated (ambiguous): rejected', problems(EV, reg) > 0, true);
  rmSync(join(dir, 'tests/a.test.ts'));
  expect('B7 cited file missing: rejected', problems(EV, reg) > 0, true);
  write();

  // ── C. normalization collisions (the previous "remove all whitespace" form accepted every one of these)
  const COLLISIONS = [
    ['const a = 1;', 'consta = 1;', 'identifier boundary (const a / consta)'],
    ['return "hello world";', 'return "helloworld";', 'string literal content'],
    ["const s = 'a  b';", "const s = 'a b';", 'string literal inner spacing'],
    ['const t = `x y ${z}`;', 'const t = `xy ${z}`;', 'template literal content'],
    ['const r = /a b/;', 'const r = /ab/;', 'regular expression content'],
    ['const r = /[ ]x/;', 'const r = /[]x/;', 'regular expression class'],
    ['export function f() {', 'exportfunction f() {', 'keyword boundary'],
    ['if (a in b) {', 'if (ain b) {', 'in operator boundary'],
    ['y = a++ + b;', 'y = a+ ++b;', 'punctuator pairing'],
    ['x = a\u200bb;', 'x = ab;', 'zero-width space'],
    ['x = ab;', 'x = a\u00adb;', 'soft hyphen'],
    ['x = 1;', 'x = 1', 'semicolon (ASI): different on purpose'],
    ['s = "a\\nb";', 's = "anb";', 'escape sequence'],
    ['x = "\ufffd";', 'x = "?";', 'replacement character'],
  ];
  for (const [a, b, why] of COLLISIONS) {
    expect(`C canon differs: ${why}`, canon(a) !== canon(b), true);
    expect(`C anchor rejects the change: ${why}`, oneLine(a, b) > 0, true);
  }
  const SAME = [
    ['f(a,b)', 'f( a , b )'], ['  if (x)   {', 'if(x){'], ['const a = 1;', 'const   a  =  1;'], ['x = a>>>b', 'x = a >>> b'], ['x = a / b / c', 'x=a/b/c'],
    ['const s = "a b";', 'const  s="a b";'], ['const t = `x ${y + `z w`} q`;', 'const t=`x ${y + `z w`} q`;'],
  ];
  for (const [a, b] of SAME) expect(`C canon equal (formatting only): ${JSON.stringify(a)}`, canon(a) === canon(b), true);
  expect('C canon is idempotent on the real sources', ['src/core/persist.ts', 'src/core/cli/engine.ts', 'src/core/cli/redact.ts', 'tests/redaction-r2.test.ts']
    .flatMap((f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8').split('\n')).every((l) => canon(canon(l)) === canon(l)), true);

  // ── D. unsafe and malformed input
  const bad = (mut) => { const r = clone(reg); mut(r); return problems(EV, r) > 0; };
  expect('D1 registry entry edited by hand (sha256 mismatch): rejected', bad((r) => { r.anchors[0].text = 'export function alpha ( x : any ) {'; }), true);
  expect('D2 evidence cites a location that has no anchor: rejected', bad((r) => { r.anchors.pop(); }), true);
  expect('D3 anchor no longer cited by the evidence (stale): rejected', problems({ 'k.src': EV['k.src'] }, reg) > 0, true);
  expect('D4 registry schema 1 / normalization missing: rejected', bad((r) => { r.schema = 1; delete r.normalization; }), true);
  expect('D5 anchors is not an array: rejected', bad((r) => { r.anchors = {}; }), true);
  expect('D6 registry is not an object: rejected', problems(EV, [1, 2]) > 0 && problems(EV, null) > 0 && problems(EV, 'x') > 0, true);
  expect('D7 sha256 not hex: rejected', bad((r) => { r.anchors[1].sha256 = 'zz'; }), true);
  expect('D8 occurrence greater than of: rejected', bad((r) => { r.anchors[1].occurrence = 9; }), true);
  expect('D9 duplicate registry identifiers: rejected', bad((r) => { r.anchors.push(clone(r.anchors[0])); }), true);
  expect('D10 path traversal in the registry: rejected', bad((r) => { r.anchors[0].file = 'src/../../etc/passwd.ts'; }), true);
  expect('D11 absolute / backslash / non-ts path in the registry: rejected', ['/etc/x.ts', 'C:/x/y.ts', 'src\\a.ts', 'src/a.js', 'src/a.ts\u0000.png', 'docs/a.ts'].every((p) => bad((r) => { r.anchors[0].file = p; })), true);
  expect('D12 path traversal in the evidence text: build refuses', throws(() => buildRegistry({ 'k.x': 'src/../../etc/passwd.ts:1' }, T)), true);
  expect('D13 evidence ref to a missing line / empty line: build refuses', throws(() => buildRegistry({ 'k.x': 'src/a.ts:999' }, T)) && throws(() => buildRegistry({ 'k.x': 'src/a.ts:5' }, T)), true);
  expect('D14 malformed evidence (no refs, odd text) yields no refs and no crash', extractRefs({ a: 'src/ :: l.0 ()', b: '', c: 'tests/:1' }).length, 0);
  writeFileSync(join(dir, 'broken.json'), '{ not json');
  expect('D15 unreadable registry file: reported, not thrown', loadRegistry(join(dir, 'broken.json')).registry === null && loadRegistry(join(dir, 'nope.json')).error !== null, true);
  try {
    // a directory junction needs no privilege on Windows; on other systems it is an ordinary directory symlink
    writeFileSync(join(dirOut, 'x.ts'), 'export const secret = 1;\n');
    symlinkSync(dirOut, join(dir, 'src/jx'), 'junction');
    expect('D16 link leaving the repository: refused', throws(() => buildRegistry({ 'k.l': 'src/jx/x.ts:1' }, T)), true);
  } catch (e) { skip('D16 link leaving the repository', `cannot create a link here: ${e.code ?? e.message}`); }

  // ── E. size limits
  const long = 'const big = "' + 'x'.repeat(MAX_LINE + 50) + '";';
  expect('E1 over-long line is anchored by exact hash and resolves', oneLine(long, long), 0);
  expect('E2 over-long line: a whitespace-only change is rejected (exact compare)', oneLine(long, long.replace('const big', 'const  big')) > 0, true);
  writeFileSync(join(dir, 'src/huge.ts'), 'const a = 1;\n' + '// pad\n'.repeat(Math.ceil(MAX_FILE / 7) + 10));
  expect('E3 file above the size limit: refused', throws(() => buildRegistry({ 'k.h': 'src/huge.ts:1' }, T)), true);
  write();
} finally {
  rmSync(dir, { recursive: true, force: true });
  rmSync(dirOut, { recursive: true, force: true });
}
console.log(results.join('\n'));
const passed = results.filter((r) => r.startsWith('PASS')).length;
console.log(`\n${passed}/${results.length - skipped} anchor self-tests passed${skipped ? `, ${skipped} skipped (not counted as passed)` : ''}`);
process.exit(failures ? 1 : 0);
