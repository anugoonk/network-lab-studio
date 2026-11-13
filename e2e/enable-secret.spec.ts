import { expect, test, type Page } from '@playwright/test';
import { createDevice, emptyLab } from '../src/core/lab';
import { serializeExport } from '../src/core/persist';

const SECRET = 'S3cr3t-E2E!x';

/** CERT-P0-1a: the Console asks Password: after enable, hides the answer, and keeps the secret out of the screen and storage. */
test('enable secret: hidden Password: prompt, wrong then right answer, nothing of the secret on screen, in history or storage', async ({ page }) => {
  const lab = emptyLab('Enable secret');
  lab.devices = [createDevice('cisco-router', 'r1', 'R1', 200, 150)];
  await page.goto('/');
  await page.getByTestId('btn-new').click();
  await page.getByTestId('import-file').setInputFiles({ name: 'secret.json', mimeType: 'application/json', buffer: Buffer.from(serializeExport(lab)) });
  await page.getByTestId('node-R1').dblclick();

  const input = page.getByTestId('console-input');
  const prompt = page.getByTestId('console-prompt');
  const type = async (line: string) => { await input.fill(line); await input.press('Enter'); };

  for (const l of ['enable', 'configure terminal', `enable secret ${SECRET}`, 'end', 'disable']) await type(l);
  await expect(prompt).toHaveText('R1>');
  await expect(input).toHaveAttribute('type', 'text');

  await type('enable');
  await expect(prompt).toHaveText('Password:');
  await expect(input).toHaveAttribute('type', 'password');
  await expect(page.getByTestId('console-secret-note')).toBeVisible();
  // ? and Tab are part of the hidden answer, not help or completion
  await input.fill('wrong');
  await input.press('?');
  await input.press('Tab');
  await expect(input).toHaveValue('wrong?');
  await input.press('Enter');
  await expect(prompt).toHaveText('Password:');
  await type(SECRET);
  await expect(prompt).toHaveText('R1#');
  await expect(input).toHaveAttribute('type', 'text');

  await type('show running-config');
  const log = page.getByTestId('console-log');
  await expect(log).toContainText(/enable secret 5 \$1\$[./0-9A-Za-z]{4}\$[./0-9A-Za-z]{22}/);
  await expect(log).toContainText('enable secret ********');
  const text = await log.innerText();
  expect(text).not.toContain(SECRET);
  expect(text).not.toContain('wrong?');

  // history recall shows the masked line, never the secret
  await input.click();
  // history: enable, configure terminal, enable secret ********, end, disable, enable, show running-config (answers are not kept)
  for (let i = 0; i < 5; i++) await input.press('ArrowUp');
  await expect(input).toHaveValue('enable secret ********');
  await input.fill('');

  // autosave in localStorage never holds the secret
  await page.waitForTimeout(800);
  const stored = await storageDump(page);
  expect(stored).toMatch(/\$1\$/);
  expect(stored).not.toContain(SECRET);
});

async function storageDump(page: Page) {
  return page.evaluate(() => Object.keys(localStorage).map((k) => localStorage.getItem(k) ?? '').join('\n'));
}
