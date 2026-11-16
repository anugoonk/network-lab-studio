import { expect, test, type Page } from '@playwright/test';
import { createDevice, emptyLab } from '../src/core/lab';
import { serializeExport } from '../src/core/persist';

const SECRET = 'Zq9-E2eFix1#41';

/**
 * CERT-P0-1a fix1: the exact production failure. `enable secret <secret>` typed on an Aruba switch and on a PC is rejected
 * (correctly) but used to be echoed raw into the transcript, ArrowUp history and localStorage. The raw secret must be absent everywhere.
 */
test('enable secret typed on Aruba and PC: rejected, and the raw secret is absent from screen, history, storage, export and after reload', async ({ page }) => {
  const lab = emptyLab('Unsupported devices');
  lab.devices = [createDevice('aruba-switch', 'ar1', 'AR1', 100, 100), createDevice('pc', 'pc1', 'PC1', 300, 100), createDevice('cisco-router', 'r1', 'R1', 500, 100)];
  await page.goto('/');
  await page.getByTestId('btn-new').click();
  await page.getByTestId('import-file').setInputFiles({ name: 'u.json', mimeType: 'application/json', buffer: Buffer.from(serializeExport(lab)) });

  const input = page.getByTestId('console-input');
  const log = page.getByTestId('console-log');
  const type = async (l: string) => { await input.fill(l); await input.press('Enter'); };
  const dump = (p: Page) => p.evaluate(() => Object.keys(localStorage).map((k) => localStorage.getItem(k) ?? '').join('\n'));

  for (const node of ['AR1', 'PC1']) {
    await page.getByTestId(`node-${node}`).dblclick();
    await expect(page.getByTestId('console')).toContainText(node);
    await type(`enable secret ${SECRET}`);
    await type(`en sec 0 ${SECRET}`);
    await type(`ENABLE SECRET ${SECRET}`);
    // rejected: the Cisco-IOS-only hint appears, and the line is shown masked
    await expect(log).toContainText('Cisco IOS');
    await expect(log).toContainText('enable secret ********');
    expect(await log.innerText()).not.toContain(SECRET);
    expect(await page.locator('body').innerText()).not.toContain(SECRET);
    // ArrowUp recalls only the masked line
    await input.click();
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) { await input.press('ArrowUp'); seen.push(await input.inputValue()); }
    expect(seen.join('\n')).not.toContain(SECRET);
    expect(seen).toContain('enable secret ********');
    await input.fill('');
  }

  await page.waitForTimeout(900);
  expect(await dump(page)).not.toContain(SECRET);
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export').click()]);
  const json = (await import('node:fs')).readFileSync((await d.path())!, 'utf8');
  expect(json).not.toContain(SECRET);

  await page.reload();
  await expect(page.getByTestId('node-AR1')).toBeVisible();
  for (const node of ['AR1', 'PC1']) {
    await page.getByTestId(`node-${node}`).dblclick();
    await expect(page.getByTestId('console')).toContainText(node);
    await input.click();
    for (let i = 0; i < 4; i++) await input.press('ArrowUp');
    expect(await input.inputValue()).not.toContain(SECRET);
    await input.fill('');
  }
  expect(await dump(page)).not.toContain(SECRET);
  expect(await page.locator('body').innerText()).not.toContain(SECRET);
});
