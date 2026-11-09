import { expect, test, type Page } from '@playwright/test';

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

test('challenge sample: Check shows real results, fixing faults turns them green', async ({ page }) => {
  await page.getByTestId('btn-sample3').click();
  await expect(page.getByTestId('lab-name')).toContainText('Challenge');
  await expect(page.getByTestId('challenge-panel')).toBeVisible();
  await expect(page.getByTestId('challenge-title')).toContainText('ซ่อมเครือข่ายออฟฟิศ');
  // nothing is evaluated until the learner presses Check
  await expect(page.getByTestId('check-c1')).toHaveAttribute('data-state', 'todo');
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('challenge-score')).toContainText('3/6');
  await expect(page.getByTestId('check-c1')).toHaveAttribute('data-state', 'pass');
  await expect(page.getByTestId('check-c2')).toHaveAttribute('data-state', 'fail');
  await expect(page.getByTestId('check-c2')).toContainText('ผลจริง: ping ไม่สำเร็จ');
  await expect(page.getByTestId('check-c2')).not.toContainText('allowed');

  // fix 1: SW1 trunk allows VLAN 20 again
  await openConsole(page, 'SW1');
  for (const l of ['enable', 'configure terminal', 'interface gi0/2', 'switchport trunk allowed vlan add 20', 'end']) await type(page, l);
  // results are now stale until Check is pressed again
  await expect(page.getByTestId('challenge-stale')).toBeVisible();
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('check-c2')).toHaveAttribute('data-state', 'pass');
  await expect(page.getByTestId('challenge-score')).toContainText('4/6');
  await expect(page.getByTestId('challenge-stale')).toHaveCount(0);

  // fix 2: R2 default route
  await openConsole(page, 'R2');
  for (const l of ['enable', 'configure terminal', 'ip route 0.0.0.0 0.0.0.0 10.0.0.1', 'end']) await type(page, l);
  // fix 3: PC-C gateway
  await page.getByTestId('node-PC-C').click();
  await page.getByTestId('rtab-details').click();
  await page.getByTestId('pc-gw').fill('192.168.10.1');
  await page.getByTestId('pc-apply').click();
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('challenge-score')).toContainText('6/6');
  await expect(page.getByTestId('challenge-done')).toBeVisible();
});

test('instructor creates a challenge, adds a check, and it survives reload', async ({ page }) => {
  await page.getByTestId('btn-new').click();
  await page.getByTestId('menu-challenge').click();
  await expect(page.getByTestId('challenge-empty')).toBeVisible();
  await page.getByTestId('challenge-create').click();
  await page.getByTestId('challenge-title-input').fill('ทดสอบ');
  // add two devices so a ping check can be defined
  await page.getByTestId('menu-add').click();
  await page.getByTestId('palette-pc').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 200, y: 200 } });
  await page.getByTestId('menu-challenge').click();
  await page.getByTestId('challenge-edit-toggle').click();
  await page.getByTestId('challenge-to').fill('999.1.1.1');
  await page.getByTestId('challenge-add').click();
  await expect(page.getByRole('alert')).toContainText('IPv4');
  await page.getByTestId('challenge-to').fill('10.0.0.9');
  await page.getByTestId('challenge-add').click();
  await expect(page.getByTestId('challenge-del-c1')).toBeVisible();
  await page.getByTestId('challenge-edit-toggle').click();
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('challenge-score')).toContainText('0/1');
  await page.reload();
  await page.getByTestId('menu-challenge').click();
  await expect(page.getByTestId('challenge-title')).toContainText('ทดสอบ');
  await expect(page.getByTestId('check-c1')).toBeVisible();
});
