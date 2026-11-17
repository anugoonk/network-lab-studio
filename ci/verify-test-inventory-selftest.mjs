// Self-tests of ci/verify-test-inventory.mjs on a synthetic repository in a temp directory (never touches the real tests/baseline).
// Usage: node ci/verify-test-inventory-selftest.mjs     Exit 0 only if every scenario behaves as expected.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VERIFIER = join(dirname(fileURLToPath(import.meta.url)), 'verify-test-inventory.mjs');
let pass = 0, fail = 0;

function repo({ baseline, files = { 'tests/a.test.ts': "it('x', () => {});\nit('y', () => {});\n", 'tests/helpers.ts': 'export const h = 1;\n' }, e2eFiles = { 'e2e/p.spec.ts': "test('p', async () => {});\n" } }) {
  const root = mkdtempSync(join(tmpdir(), 'inv-'));
  for (const [f, c] of Object.entries({ ...files, ...e2eFiles })) { mkdirSync(dirname(join(root, f)), { recursive: true }); writeFileSync(join(root, f), c); }
  mkdirSync(join(root, 'ci'));
  writeFileSync(join(root, 'ci', 'test-inventory.json'), JSON.stringify(baseline ?? { schema: 1, policy: { allowSkipped: 0 }, unit: { files: { 'tests/a.test.ts': 2 }, total: 2 }, e2e: { files: { 'e2e/p.spec.ts': 1 }, total: 1 } }));
  return root;
}
const vitest = (root, entries, over = {}) => {
  const testResults = Object.entries(entries).map(([f, sts]) => ({ name: join(root, f), status: 'passed', assertionResults: sts.map((s, i) => ({ status: s, title: 't' + i, fullName: 't' + i })) }));
  const all = Object.values(entries).flat();
  return { numTotalTests: all.length, numPassedTests: all.filter((s) => s === 'passed').length, numFailedTests: all.filter((s) => s === 'failed').length, success: !all.includes('failed'), testResults, ...over };
};
const pw = (specs, stats) => {
  const bySuite = {};
  for (const [file, status] of specs) (bySuite[file] ??= []).push(status);
  const suites = Object.entries(bySuite).map(([file, sts]) => ({ title: file, file, specs: sts.map((s, i) => ({ title: 's' + i, file, tests: [{ status: s, expectedStatus: s === 'skipped' ? 'skipped' : 'passed' }] })) }));
  const n = (s) => specs.filter(([, x]) => x === s).length;
  return { suites, stats: stats ?? { expected: n('expected'), unexpected: n('unexpected'), flaky: n('flaky'), skipped: n('skipped') } };
};
function run(name, root, kind, resultsObj, want, { raw, cwd, resultsPath = 'res.json', expectText } = {}) {
  if (raw !== undefined) writeFileSync(join(root, 'res.json'), raw);
  else if (resultsObj !== null) writeFileSync(join(root, 'res.json'), JSON.stringify(resultsObj));
  const r = spawnSync(process.execPath, [VERIFIER, 'check', kind, resultsPath], { cwd: cwd ?? root, env: { ...process.env, TEST_INVENTORY_ROOT: root }, encoding: 'utf8' });
  const ok = r.status === want && (!expectText || r.stdout.includes(expectText));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} (exit ${r.status}, expected ${want})${ok ? '' : '\n' + r.stdout + r.stderr}`);
  ok ? pass++ : fail++;
  rmSync(root, { recursive: true, force: true });
}

const U = (root, a = ['passed', 'passed']) => vitest(root, { 'tests/a.test.ts': a });
let r;
r = repo({}); run('1 unit: normal run matches the baseline', r, 'unit', U(r), 0);
r = repo({}); run('2 unit: baseline file missing from the results (file removed)', r, 'unit', vitest(r, { 'tests/other.test.ts': ['passed', 'passed'] }), 1, { expectText: 'not executed' });
r = repo({}); run('3 unit: file renamed (new name executed, old name gone)', r, 'unit', vitest(r, { 'tests/b.test.ts': ['passed', 'passed'] }), 1);
r = repo({}); run('4 unit: one test case removed', r, 'unit', U(r, ['passed']), 1, { expectText: 'baseline 2' });
r = repo({}); run('5 unit: a test converted to skip', r, 'unit', U(r, ['passed', 'skipped']), 1, { expectText: 'skipped' });
r = repo({}); run('6 unit: a test converted to todo', r, 'unit', U(r, ['passed', 'todo']), 1);
r = repo({}); run('7 unit: a test failed', r, 'unit', U(r, ['passed', 'failed']), 1);
r = repo({}); run('8 unit: results file missing', r, 'unit', null, 2, { resultsPath: 'nope.json' });
r = repo({}); run('9 unit: corrupted results JSON', r, 'unit', null, 2, { raw: '{"numTotalTests": 2, "testResults": [' });
r = repo({}); run('10 unit: wrong report format (Playwright JSON given to unit)', r, 'unit', pw([['p.spec.ts', 'expected']]), 2);
r = repo({}); run('11 unit: partial results of a crashed run (counts inconsistent)', r, 'unit', U(r, ['passed', 'passed']), 2, { raw: JSON.stringify({ ...vitest(r, { 'tests/a.test.ts': ['passed', 'passed'] }), numTotalTests: 5 }) });
r = repo({ baseline: { schema: 1, unit: { files: { 'tests/a.test.ts': 2 }, total: 9 }, e2e: { files: { 'e2e/p.spec.ts': 1 }, total: 1 } } }); run('12 unit: baseline total changed without the files (inconsistent)', r, 'unit', U(r), 1, { expectText: 'inconsistent' });
r = repo({ baseline: { schema: 1, unit: { files: { 'tests/a.test.ts': 3 }, total: 3 }, e2e: { files: { 'e2e/p.spec.ts': 1 }, total: 1 } } }); run('13 unit: baseline raised without adding tests', r, 'unit', U(r), 1);
r = repo({}); run('14 unit: legitimate addition (extra test) passes with a NOTICE', r, 'unit', U(r, ['passed', 'passed', 'passed']), 0, { expectText: 'NOTICE' });
r = repo({}); run('15 unit: new test file passes with a NOTICE', r, 'unit', vitest(r, { 'tests/a.test.ts': ['passed', 'passed'], 'tests/new.test.ts': ['passed'] }), 0, { expectText: 'new test file' });
r = repo({ files: { 'tests/b.test.ts': "it('x', () => {});\n" }, baseline: { schema: 1, unit: { files: { 'tests/b.test.ts': 1 }, total: 1 }, e2e: { files: { 'e2e/p.spec.ts': 1 }, total: 1 } } }); run('16 unit: legitimate removal with an explicit baseline update passes', r, 'unit', vitest(r, { 'tests/b.test.ts': ['passed'] }), 0);
r = repo({ files: { 'tests/a.test.ts': "it('x', () => {});\nit('y', () => {});\n", 'tests/renamed.spec.ts': "it('lost', () => {});\n" } }); run('17 unit: test-looking file outside the discovery pattern (renamed to .spec.ts)', r, 'unit', U(r), 1, { expectText: 'not executed by the runner' });
r = repo({}); run('18 unit: run from a different working directory', r, 'unit', U(r), 0, { cwd: tmpdir() , resultsPath: join(r, 'res.json') });
r = repo({}); { const win = (p) => p.split('/').join('\\'); const names = vitest(r, { 'tests/a.test.ts': ['passed', 'passed'] }); names.testResults[0].name = win(join(r, 'tests', 'a.test.ts').split(sep).join('/')); run('19 unit: Windows-style backslash paths in the results', r, 'unit', names, 0); }
r = repo({}); run('20 e2e: normal run', r, 'e2e', pw([['p.spec.ts', 'expected']]), 0);
r = repo({}); run('21 e2e: skipped test', r, 'e2e', pw([['p.spec.ts', 'skipped']]), 1);
r = repo({}); run('22 e2e: unexpected failure', r, 'e2e', pw([['p.spec.ts', 'unexpected']]), 1);
r = repo({}); run('23 e2e: flaky test counts as a failure', r, 'e2e', pw([['p.spec.ts', 'flaky']]), 1);
r = repo({}); run('24 e2e: spec file missing from the results', r, 'e2e', pw([['q.spec.ts', 'expected']]), 1);
r = repo({}); run('25 e2e: stats do not match the tests (truncated report)', r, 'e2e', pw([['p.spec.ts', 'expected']], { expected: 9, unexpected: 0, flaky: 0, skipped: 0 }), 2);
r = repo({ e2eFiles: { 'e2e/p.spec.ts': "test('p', async () => {});\n", 'e2e/forgotten.spec.ts': "test('f', async () => {});\n" } }); run('26 e2e: test file on disk that the run did not execute', r, 'e2e', pw([['p.spec.ts', 'expected']]), 1);
r = repo({}); run('27 usage: unknown kind', r, 'weird', {}, 2);

console.log(`\n${pass}/${pass + fail} test-inventory self-tests passed`);
process.exit(fail ? 1 : 0);
