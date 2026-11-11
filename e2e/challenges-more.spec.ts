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

async function showPalette(page: Page) {
  if (!(await page.getByTestId('palette-pc').isVisible())) await page.getByTestId('menu-add').click();
  await expect(page.getByTestId('palette-pc')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
});

test('the Challenge menu lists the four challenges and opens each one', async ({ page }) => {
  const options = page.getByTestId('select-challenge').locator('option');
  await expect(options).toHaveCount(5); // placeholder + 4 challenges
  await page.getByTestId('select-challenge').selectOption('dupip');
  await expect(page.getByTestId('challenge-title')).toContainText('IP ซ้ำ');
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('challenge-score')).toContainText('1/4');
  await page.getByTestId('select-challenge').selectOption('campus');
  await expect(page.getByTestId('challenge-title')).toContainText('Campus');
  await expect(page.getByTestId('node-DSW1')).toBeVisible();
  await expect(page.getByTestId('node-AP1')).toBeVisible();
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('challenge-score')).toContainText('3/6');
});

test('Challenge 2: the duplicate IP is visible on the canvas and solvable through the UI', async ({ page }) => {
  await page.getByTestId('select-challenge').selectOption('dupip');
  await expect(page.getByTestId('dup-PC-02')).toBeVisible();
  await expect(page.getByTestId('dup-PC-04')).toBeVisible();
  await openConsole(page, 'SW2');
  for (const l of ['configure terminal', 'interface 1/1/3', 'vlan access 10', 'interface 1/1/4', 'no shutdown', 'end']) await type(page, l);
  await page.getByTestId('node-PC-04').click();
  await page.getByTestId('rtab-details').click();
  await page.getByTestId('pc-ip').fill('192.168.1.104');
  await page.getByTestId('pc-apply').click();
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('challenge-score')).toContainText('4/4');
  await expect(page.getByTestId('challenge-done')).toBeVisible();
});

test('Challenge 3: layered faults are solved one by one with the AOS-CX and IOS CLI', async ({ page }) => {
  await page.getByTestId('select-challenge').selectOption('campus');
  await openConsole(page, 'DSW1');
  for (const l of ['configure terminal', 'interface vlan 20', 'no shutdown', 'exit', 'ip route 0.0.0.0/0 10.1.1.1', 'end']) await type(page, l);
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('challenge-score')).toContainText('5/6');
  await openConsole(page, 'ISP1');
  for (const l of ['enable', 'configure terminal', 'ip route 192.168.10.0 255.255.255.0 10.1.1.2', 'end']) await type(page, l);
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('challenge-score')).toContainText('6/6');
  await expect(page.getByTestId('challenge-done')).toBeVisible();
});

test('Reset returns to the starting state, asks first, and can be undone', async ({ page }) => {
  await page.getByTestId('select-challenge').selectOption('campus');
  await openConsole(page, 'DSW1');
  for (const l of ['configure terminal', 'interface vlan 20', 'no shutdown', 'exit', 'ip route 0.0.0.0/0 10.1.1.1', 'end']) await type(page, l);
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('challenge-score')).toContainText('5/6');

  await page.getByTestId('challenge-reset').click();
  await page.getByTestId('challenge-reset-cancel').click();
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('challenge-score')).toContainText('5/6'); // cancel changed nothing

  await page.getByTestId('challenge-reset').click();
  await page.getByTestId('challenge-reset-confirm').click();
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('challenge-score')).toContainText('3/6');
  // the DSW1 terminal session was reset, too: it is back in the starting mode
  await openConsole(page, 'DSW1');
  await expect(page.getByTestId('console-prompt')).toHaveText('DSW1#');

  await page.getByTestId('btn-undo').click();
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('challenge-score')).toContainText('5/6'); // Reset is one undo step
});

test('instructor: the start state is captured on creation, can be re-captured, and drives the learner Reset', async ({ page }) => {
  await page.getByTestId('btn-new').click();
  await showPalette(page);
  await page.getByTestId('palette-pc').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 200, y: 200 } });
  await page.getByTestId('menu-challenge').click();
  await page.getByTestId('challenge-create').click();
  await expect(page.getByTestId('challenge-start-status')).toContainText('1 อุปกรณ์');
  // add a second device, re-capture
  await showPalette(page);
  await page.getByTestId('palette-laptop').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 400, y: 200 } });
  await page.getByTestId('menu-challenge').click();
  await page.getByTestId('challenge-edit-toggle').click();
  await expect(page.getByTestId('challenge-start-status')).toContainText('1 อุปกรณ์');
  await page.getByTestId('challenge-set-start').click();
  await expect(page.getByTestId('challenge-start-status')).toContainText('2 อุปกรณ์');
  await page.getByTestId('challenge-edit-toggle').click();
  // learner deletes a device, then resets
  await page.getByTestId('node-LAP-01').click();
  await page.getByTestId('delete-device').click();
  await expect(page.getByTestId('node-LAP-01')).toHaveCount(0);
  await page.getByTestId('challenge-reset').click();
  await page.getByTestId('challenge-reset-confirm').click();
  await expect(page.getByTestId('node-LAP-01')).toBeVisible();
  // clearing the start removes the Reset button
  await page.getByTestId('challenge-edit-toggle').click();
  await page.getByTestId('challenge-clear-start').click();
  await page.getByTestId('challenge-edit-toggle').click();
  await expect(page.getByTestId('challenge-reset')).toHaveCount(0);
});
