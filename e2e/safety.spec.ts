import { expect, test } from '@playwright/test';

test('tab title follows the lab name and shows ● while edits are not exported', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await expect(page).toHaveTitle('Small Office – Cisco & Aruba — Network Lab Studio');
  await page.getByTestId('node-PC-01').click();
  await page.getByTestId('delete-device').click();
  await expect(page).toHaveTitle(/^● Small Office/);
  await page.getByTestId('btn-undo').click();
  await expect(page).toHaveTitle(/^Small Office/); // content identical to the saved state again
});

test('copy running-config puts the real config on the clipboard (Cisco and Aruba); hosts have no such button', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.getByTestId('node-SW1')).toBeVisible();
  await page.getByTestId('node-SW1').click();
  await page.getByTestId('copy-config').click();
  await expect(page.getByTestId('notice')).toContainText('คัดลอก running-config ของ SW1');
  let text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('hostname SW1');
  expect(text).toContain('interface FastEthernet0/1');
  await page.getByTestId('node-SW2').click();
  await page.getByTestId('copy-config').click();
  await expect(page.getByTestId('notice')).toContainText('คัดลอก running-config ของ SW2');
  text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('hostname SW2');
  expect(text).toContain('vlan access 10');
  // also available from the console header
  await page.getByTestId('node-R1').dblclick();
  await page.getByTestId('console-copy-config').click();
  await expect(page.getByTestId('notice')).toContainText('R1');
  // a PC has nothing to copy
  await page.getByTestId('node-PC-01').click();
  await expect(page.getByTestId('copy-config')).toHaveCount(0);
});

test('autosave works: no warning banner and no "leave site?" prompt even with unexported edits', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await expect(page.getByTestId('autosave-warning')).toHaveCount(0);
  await page.getByTestId('node-PC-01').click();
  await page.getByTestId('delete-device').click();
  let prompted = false;
  page.on('dialog', (d) => {
    prompted = true;
    void d.dismiss();
  });
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => page.isClosed()).toBe(true);
  expect(prompted).toBe(false);
});

test.describe('browser refuses to store data', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('blocked', 'QuotaExceededError');
      };
    });
  });

  test('a warning banner appears right away and offers Export', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('node-PC-01')).toBeVisible();
    await expect(page.getByTestId('autosave-warning')).toBeVisible();
    await expect(page.getByTestId('autosave-warning')).toContainText('ปิดหน้านี้แล้วงานจะหาย');
    await expect(page.getByTestId('autosave-export')).toBeVisible();
  });

  test('closing the page with unexported edits asks for confirmation; without edits it does not', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('node-PC-01')).toBeVisible();
    await page.getByTestId('node-PC-01').click();
    await page.getByTestId('delete-device').click();
    const first = page.waitForEvent('dialog');
    await page.close({ runBeforeUnload: true });
    const d = await first;
    expect(d.type()).toBe('beforeunload');
    await d.dismiss(); // "stay on page"
    expect(page.isClosed()).toBe(false);
    // undo the edit: nothing is unexported any more, so closing is silent
    await page.getByTestId('btn-undo').click();
    let prompted = false;
    page.on('dialog', (x) => {
      prompted = true;
      void x.dismiss();
    });
    await page.close({ runBeforeUnload: true });
    await expect.poll(() => page.isClosed()).toBe(true);
    expect(prompted).toBe(false);
  });
});
