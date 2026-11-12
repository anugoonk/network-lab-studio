import { expect, test, type Page } from '@playwright/test';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

async function openConsole(page: Page, device: string) {
  await page.getByTestId(`node-${device}`).dblclick();
  await expect(page.getByTestId('console')).toBeVisible();
  await expect(page.getByTestId('console')).toContainText(device);
}
async function type(page: Page, line: string) {
  const input = page.getByTestId('console-input');
  await input.fill(line);
  await input.press('Enter');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
});

test('interface range: one command configures several ports and the prompt shows the range', async ({ page }) => {
  await openConsole(page, 'SW1');
  await type(page, 'enable');
  await type(page, 'configure terminal');
  await type(page, 'interface range fa0/10 - 12');
  await expect(page.getByTestId('console-prompt')).toHaveText('SW1(config-if-range)#');
  await type(page, 'description spare');
  await type(page, 'end');
  await type(page, 'show running-config');
  const log = page.getByTestId('console-log');
  for (const p of ['FastEthernet0/10', 'FastEthernet0/11', 'FastEthernet0/12']) await expect(log).toContainText(`interface ${p}`);
  await expect(log).toContainText('description spare');
});

test('interface range on AOS-CX', async ({ page }) => {
  await openConsole(page, 'SW2');
  await type(page, 'configure terminal');
  await type(page, 'interface 1/1/10-1/1/12');
  await expect(page.getByTestId('console-prompt')).toContainText('(config-if-<1/1/10-1/1/12>)#');
  await type(page, 'exit');
  await expect(page.getByTestId('console-prompt')).toHaveText('SW2(config)#');
});

test('Tab completes interface names and ping targets; the PC terminal too', async ({ page }) => {
  await openConsole(page, 'SW1');
  const input = page.getByTestId('console-input');
  await type(page, 'enable');
  await type(page, 'configure terminal');
  await input.fill('interface gi0/1');
  await input.press('Tab');
  await expect(input).toHaveValue('interface GigabitEthernet0/1 ');
  await openConsole(page, 'PC-01');
  await input.fill('pi');
  await input.press('Tab');
  await expect(input).toHaveValue('ping ');
  await input.press('Tab'); // ping targets = addresses in the Lab: first Tab extends to what they share…
  await expect(input).toHaveValue(/^ping 192\.168\.1\./);
  await input.press('Tab'); // …the second one lists them
  await expect(page.getByTestId('console-log')).toContainText('192.168.1.1');
});

test('a ping animates a packet along the path; the toggle and reduced motion turn it off', async ({ page }) => {
  await openConsole(page, 'PC-01');
  await type(page, 'ping 192.168.1.1');
  await expect(page.getByTestId('packet')).toBeVisible();
  await expect(page.getByTestId('packet')).toHaveCount(0, { timeout: 10_000 }); // finishes by itself

  await page.getByTestId('anim-toggle').click();
  await expect(page.getByTestId('anim-toggle')).toHaveAttribute('aria-pressed', 'false');
  await type(page, 'ping 192.168.1.1');
  await page.waitForTimeout(500);
  await expect(page.getByTestId('packet')).toHaveCount(0);
  await page.getByTestId('anim-toggle').click(); // back on

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await type(page, 'ping 192.168.1.1');
  await page.waitForTimeout(500);
  await expect(page.getByTestId('packet')).toHaveCount(0);
});

test('a ping that fails ends with a red cross where the packet died', async ({ page }) => {
  await openConsole(page, 'PC-01');
  await type(page, 'ping 10.99.99.99');
  await expect(page.getByTestId('packet')).toHaveAttribute('data-kind', 'fail', { timeout: 5000 });
  await expect(page.getByTestId('packet')).toHaveCount(0, { timeout: 5000 });
});

test('the Aruba note appears only on AOS-CX consoles', async ({ page }) => {
  await openConsole(page, 'SW1');
  await expect(page.getByTestId('aruba-note')).toHaveCount(0);
  await openConsole(page, 'SW2');
  await expect(page.getByTestId('aruba-note')).toBeVisible();
  await page.getByTestId('aruba-note').locator('summary').click();
  await expect(page.getByTestId('aruba-note')).toContainText('vlan trunk allowed');
});

test('challenge editor: reorder and duplicate checks and hints', async ({ page }) => {
  await page.getByTestId('select-challenge').selectOption('trouble');
  await page.getByTestId('challenge-edit-toggle').click();
  const label = (n: number) => page.getByLabel(`ชื่อ Check ${n}`);
  const first = await label(1).inputValue();
  const second = await label(2).inputValue();
  await page.getByTestId('challenge-up-c2').click();
  await expect(label(1)).toHaveValue(second);
  await expect(label(2)).toHaveValue(first);
  await expect(page.getByTestId('challenge-up-c2')).toBeDisabled(); // now first
  await page.getByTestId('challenge-dup-c2').click();
  await expect(label(2)).toHaveValue(`${second} (สำเนา)`);
  await expect(page.getByTestId('check-c7')).toHaveCount(0); // editor view has no result rows; id is checked after leaving it
  await page.getByTestId('challenge-hint-down-0').click();
  await expect(page.getByTestId('challenge-hint-0')).toHaveValue(/ถ้าเครื่องใน VLAN เดียวกัน/);
  await page.getByTestId('challenge-edit-toggle').click();
  await expect(page.getByTestId('check-c7')).toContainText('(สำเนา)');
});

test('share link: copies a link that opens the Lab as a new Lab in another browser', async ({ page, browser }) => {
  await page.getByTestId('select-challenge').selectOption('trouble');
  await page.getByTestId('menu-share').click();
  await expect(page.getByTestId('notice')).toContainText('คัดลอกลิงก์แชร์');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain('#lab=v1.');

  const ctx = await browser.newContext(); // a different person: empty browser storage
  const other = await ctx.newPage();
  await other.goto(link);
  await expect(other.getByTestId('notice')).toContainText('จากลิงก์แชร์');
  await expect(other).toHaveTitle(/Troubleshooting/);
  await expect(other.getByTestId('node-PC-A')).toBeVisible();
  expect(other.url()).not.toContain('#lab=');
  await other.reload();
  await expect(other).toHaveTitle(/Troubleshooting/);
  await other.getByTestId('menu-manager').click();
  await expect(other.getByTestId('manager-table')).toBeVisible();
  await expect(other.getByTestId('manager-table').locator('[data-testid^="lab-row-"]')).toHaveCount(2); // the start Lab + the shared one, not doubled by the reload
  await ctx.close();
});

test('a broken or cut-off share link changes nothing', async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto('/#lab=v1.AAAA');
  await expect(p.getByTestId('notice')).toContainText('เปิดลิงก์แชร์ไม่สำเร็จ');
  await expect(p.getByTestId('node-PC-01')).toBeVisible(); // still the normal start Lab
  expect(p.url()).not.toContain('#lab=');
  await ctx.close();
});

test('an empty Lab has nothing to share', async ({ page }) => {
  await page.getByTestId('btn-new').click();
  await page.getByTestId('menu-share').click();
  await expect(page.getByTestId('notice')).toContainText('Lab ว่าง');
});

test('messages appear at the bottom and never cover the toolbar; a click dismisses them', async ({ page }) => {
  await page.getByTestId('menu-share').click();
  const notice = page.getByTestId('notice');
  await expect(notice).toBeVisible();
  const n = (await notice.boundingBox())!;
  const bar = (await page.locator('.topbar').boundingBox())!;
  expect(n.y).toBeGreaterThan(bar.y + bar.height); // below the toolbar, not on top of it
  const vp = page.viewportSize()!;
  expect(n.y + n.height).toBeLessThanOrEqual(vp.height);
  // and the toolbar button it used to hide can be clicked while the message is showing
  await page.getByTestId('btn-sample2').click({ trial: true }); // UI-02: label is translated now (TH: ตัวอย่าง: Inter-VLAN)
  await notice.click();
  await expect(notice).toHaveCount(0);
});

