import { expect, test, type Page } from '@playwright/test';
import { createDevice, emptyLab } from '../src/core/lab';
import { serializeExport } from '../src/core/persist';

const PW = 'Pw-E2E-9xQ!';

async function open(page: Page) {
  const lab = emptyLab('SR-CLI-11');
  lab.devices = [createDevice('cisco-router', 'r1', 'R1', 200, 150), createDevice('cisco-switch', 's1', 'SW1', 420, 150)];
  await page.goto('/');
  await page.getByTestId('btn-new').click();
  await page.getByTestId('import-file').setInputFiles({ name: 'cli11.json', mimeType: 'application/json', buffer: Buffer.from(serializeExport(lab)) });
  await page.getByTestId('node-R1').dblclick();
}

/** SR-CLI-11: line / username / banner / erase / reload through the real Console UI. */
test('management commands: line config, username, banner, erase and reload; no credential on screen, in history or in storage', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('console-input');
  const prompt = page.getByTestId('console-prompt');
  const log = page.getByTestId('console-log');
  const type = async (line: string) => { await input.fill(line); await input.press('Enter'); };

  for (const l of ['enable', 'configure terminal', 'line vty 0 4']) await type(l);
  await expect(prompt).toHaveText('R1(config-line)#');
  for (const l of [`password ${PW}`, 'login local', 'transport input ssh', 'exec-timeout 5 30', 'exit']) await type(l);
  await expect(prompt).toHaveText('R1(config)#');
  for (const l of [`username admin privilege 15 secret ${PW}`, 'banner motd #<b>Authorized</b> only#', 'end', 'write memory', 'show running-config']) await type(l);
  await expect(log).toContainText('line vty 0 4');
  await expect(log).toContainText('transport input ssh');
  await expect(log).toContainText(/username admin privilege 15 secret 5 \$1\$/);
  await expect(log).toContainText(/password 7 [./0-9A-Za-z]{23,30}/);
  // the banner is plain text, never HTML
  await expect(log).toContainText('banner motd ^C<b>Authorized</b> only^C');
  expect(await page.locator('[data-testid="console-log"] b').count()).toBe(0);
  let text = await log.innerText();
  expect(text).not.toContain(PW);

  // erase asks first; n keeps it, Enter erases
  await type('erase startup-config');
  await expect(prompt).toHaveText('Continue? [confirm]');
  await type('n');
  await expect(prompt).toHaveText('R1#');
  await type('show startup-config');
  await expect(log).toContainText('hostname R1');
  await type('write erase');
  await input.fill('');
  await input.press('Enter');
  await type('show startup-config');
  await expect(log).toContainText('startup-config is not present');

  // reload: session reset, running-config kept, banner shown
  await type('reload');
  await expect(prompt).toHaveText('Proceed with reload? [confirm]');
  await type('y');
  await expect(prompt).toHaveText('R1>');
  await expect(log).toContainText('NOT discarded');
  await expect(log).toContainText('<b>Authorized</b> only');
  await type('enable');
  await type('show running-config');
  await expect(log).toContainText(/username admin privilege 15 secret 5 \$1\$/);

  text = await log.innerText();
  expect(text).not.toContain(PW);

  // history recall never shows the credential
  await input.click();
  for (let i = 0; i < 12; i++) await input.press('ArrowUp');
  expect(await input.inputValue()).not.toContain(PW);
  await input.fill('');

  // autosave: management data is stored, the credential is not, and a line-mode device is not saved in line mode
  await type('configure terminal');
  await type('line console 0');
  await page.waitForTimeout(800);
  const stored = await page.evaluate(() => Object.keys(localStorage).map((k) => localStorage.getItem(k) ?? '').join('\n'));
  expect(stored).toContain('"vty04"');
  expect(stored).toMatch(/\$1\$/);
  expect(stored).not.toContain(PW);
  expect(stored).not.toContain('config-line');
});

test('management commands are refused on an Aruba switch', async ({ page }) => {
  const lab = emptyLab('SR-CLI-11 vendors');
  lab.devices = [createDevice('aruba-switch', 'a1', 'ASW1', 200, 150)];
  await page.goto('/');
  await page.getByTestId('btn-new').click();
  await page.getByTestId('import-file').setInputFiles({ name: 'aruba.json', mimeType: 'application/json', buffer: Buffer.from(serializeExport(lab)) });
  await page.getByTestId('node-ASW1').dblclick();
  const input = page.getByTestId('console-input');
  const log = page.getByTestId('console-log');
  for (const l of ['reload', 'configure terminal', 'line vty 0 4', 'username a secret b']) {
    await input.fill(l);
    await input.press('Enter');
  }
  await expect(log).not.toContainText('Proceed with reload');
  await expect(page.getByTestId('console-prompt')).toHaveText('ASW1(config)#');
});
