import { expect, test, type Page } from '@playwright/test';
import { createDevice, emptyLab } from '../src/core/lab';

const SECRET = 'Zq9-E2eP1b1#77';
const COMM = 'Zq9-E2eComm#78';

/**
 * CERT-P0-1b.1 (P-01): secret-bearing commands other than `enable secret` — `username`, `password`, `snmp-server community`,
 * Aruba `user … password`, `net user …` — used to be echoed raw into the transcript, ArrowUp history, localStorage and
 * exports. The raw value must be absent everywhere, on a Cisco router, an Aruba switch and a PC, also after a reload.
 */
const FORMS = [
  `username admin secret ${SECRET}`,
  `username admin password ${SECRET}`,
  `USERNAME admin SECRET ${SECRET}`,
  `password ${SECRET}`,
  `net user bob ${SECRET}`,
  `user admin group administrator password plaintext ${SECRET}`,
  `snmp-server community ${COMM} RO`,
  // R2 (R1-01 / R1-04): mistyped, glued and invisible-character forms
  `username admin sceret ${SECRET}`,
  `username admin pwd ${SECRET}`,
  `username admin secret=${SECRET}`,
  `password:${SECRET}`,
  `enable​secret ${SECRET}`,
];

const rawLab = (lab: unknown) => JSON.stringify({ app: 'network-lab-studio', schemaVersion: 1, lab });
const dump = (p: Page) => p.evaluate(() => Object.keys(localStorage).map((k) => localStorage.getItem(k) ?? '').join('\n'));

async function importLab(page: Page, json: string) {
  await page.goto('/');
  await page.getByTestId('btn-new').click();
  await page.getByTestId('import-file').setInputFiles({ name: 'p1b1.json', mimeType: 'application/json', buffer: Buffer.from(json) });
}

test('secret-bearing commands on Cisco, Aruba and PC consoles: masked on screen, in ArrowUp history, storage, export and after reload', async ({ page }) => {
  const lab = emptyLab('P1b1 redaction');
  lab.devices = [createDevice('cisco-router', 'r1', 'R1', 100, 100), createDevice('aruba-switch', 'ar1', 'AR1', 300, 100), createDevice('pc', 'pc1', 'PC1', 500, 100)];
  await importLab(page, rawLab(lab));

  const input = page.getByTestId('console-input');
  const log = page.getByTestId('console-log');
  const type = async (l: string) => { await input.fill(l); await input.press('Enter'); };

  for (const node of ['R1', 'AR1', 'PC1']) {
    await page.getByTestId(`node-${node}`).dblclick();
    await expect(page.getByTestId('console')).toContainText(node);
    if (node === 'R1') { await type('enable'); await type('configure terminal'); }
    for (const f of FORMS) await type(f);
    await expect(log).toContainText('username admin secret ********');
    await expect(log).toContainText('snmp-server community ******** RO'); // only the value of a middle secret is masked
    const text = await log.innerText();
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain(COMM);
    expect(await page.locator('body').innerText()).not.toContain(SECRET);
    await input.click();
    const seen: string[] = [];
    for (let i = 0; i < FORMS.length; i++) { await input.press('ArrowUp'); seen.push(await input.inputValue()); }
    expect(seen.join('\n')).not.toContain(SECRET);
    expect(seen.join('\n')).not.toContain(COMM);
    await input.fill('');
  }

  await page.waitForTimeout(900);
  const stored = await dump(page);
  expect(stored).not.toContain(SECRET);
  expect(stored).not.toContain(COMM);
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export').click()]);
  const json = (await import('node:fs')).readFileSync((await d.path())!, 'utf8');
  expect(json).not.toContain(SECRET);
  expect(json).not.toContain(COMM);

  await page.reload();
  await expect(page.getByTestId('node-R1')).toBeVisible();
  for (const node of ['R1', 'AR1', 'PC1']) {
    await page.getByTestId(`node-${node}`).dblclick();
    await expect(page.getByTestId('console')).toContainText(node);
    await input.click();
    for (let i = 0; i < FORMS.length + 2; i++) await input.press('ArrowUp');
    expect(await input.inputValue()).not.toContain(SECRET);
    await input.fill('');
  }
  expect(await dump(page)).not.toContain(SECRET);
  expect(await page.locator('body').innerText()).not.toContain(SECRET);
});

test('a Lab file written by an older build with secrets in its command history is masked on import: screen, storage, export and share link', async ({ page }) => {
  const lab = emptyLab('Legacy history');
  const r1 = createDevice('cisco-router', 'r1', 'R1', 100, 100);
  r1.cli.history = ['enable', 'show running-config', `username legacy secret ${SECRET}`, `snmp-server community ${COMM} RO`, 'configure terminal'];
  lab.devices = [r1, createDevice('pc', 'pc1', 'PC1', 300, 100)];
  await importLab(page, rawLab(lab));
  await expect(page.getByTestId('node-R1')).toBeVisible();

  const input = page.getByTestId('console-input');
  await page.getByTestId('node-R1').dblclick();
  await expect(page.getByTestId('console')).toContainText('R1');
  await input.click();
  const seen: string[] = [];
  for (let i = 0; i < 5; i++) { await input.press('ArrowUp'); seen.push(await input.inputValue()); }
  expect(seen).toContain('username legacy secret ********');
  expect(seen).toContain('snmp-server community ******** RO');
  expect(seen).toContain('show running-config'); // ordinary history is kept
  expect(seen.join('\n')).not.toContain(SECRET);
  expect(seen.join('\n')).not.toContain(COMM);

  await page.waitForTimeout(900);
  const stored = await dump(page);
  expect(stored).not.toContain(SECRET);
  expect(stored).not.toContain(COMM);
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export').click()]);
  const json = (await import('node:fs')).readFileSync((await d.path())!, 'utf8');
  expect(json).not.toContain(SECRET);
  expect(json).not.toContain(COMM);
  expect(json).toContain('R1'); // the device itself is kept

  await page.reload();
  await expect(page.getByTestId('node-R1')).toBeVisible();
  expect(await dump(page)).not.toContain(SECRET);
});

test('R2: a Lab that cannot be opened keeps no plaintext credential history — in storage, in the warning and in the recovery download', async ({ page }) => {
  const lab = emptyLab('Broken with history');
  const r1 = createDevice('cisco-router', 'r1', 'R1', 100, 100);
  r1.cli.history = ['enable', 'show vlan', `username legacy sceret ${SECRET}`, `password:${SECRET}`, `snmp-server community ${COMM} RO`];
  (r1 as { kind: string }).kind = 'not-a-device'; // fails validation
  lab.devices = [r1];
  const saved = { activeId: 'bad', entries: [{ id: 'bad', name: lab.name, updatedAt: 1, savedSig: null, lab }] };
  await page.addInitScript((w) => {
    if (!localStorage.getItem('nls.workspace.v2') && !localStorage.getItem('nls.workspace.rejected.v1')) localStorage.setItem('nls.workspace.v2', JSON.stringify(w));
  }, saved);
  await page.goto('/');
  await expect(page.getByTestId('rejected-warning')).toBeVisible();
  expect(await page.getByTestId('rejected-warning').innerText()).not.toContain(SECRET);
  await expect.poll(async () => (await page.evaluate(() => localStorage.getItem('nls.workspace.rejected.v1') ?? '')).length).toBeGreaterThan(0);
  const stored = await dump(page);
  expect(stored).not.toContain(SECRET);
  expect(stored).not.toContain(COMM);
  expect(stored).toContain('show vlan'); // ordinary history is recoverable
  const dl = page.waitForEvent('download');
  await page.getByTestId('rejected-download').click();
  const json = (await import('node:fs')).readFileSync((await (await dl).path())!, 'utf8');
  expect(json).not.toContain(SECRET);
  expect(json).not.toContain(COMM);
  expect(json).toContain('Broken with history');
  expect(json).toContain('show vlan');
});
