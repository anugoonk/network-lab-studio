import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
});

test('hints are revealed one at a time and can be authored', async ({ page }) => {
  await page.getByTestId('select-challenge').selectOption('trouble');
  await expect(page.getByTestId('challenge-hints')).toBeVisible();
  await expect(page.getByTestId('hint-0')).toHaveCount(0);
  await page.getByTestId('challenge-hint-next').click();
  await expect(page.getByTestId('hint-0')).toContainText('ใบ้ 1/4');
  await expect(page.getByTestId('hint-1')).toHaveCount(0);
  for (let i = 0; i < 3; i++) await page.getByTestId('challenge-hint-next').click();
  await expect(page.getByTestId('hint-3')).toContainText('เฉลย');
  await expect(page.getByTestId('challenge-hint-done')).toBeVisible();

  // instructor adds one, learner sees it as the 5th
  await page.getByTestId('challenge-edit-toggle').click();
  await page.getByTestId('challenge-hint-add').click();
  await page.getByTestId('challenge-hint-4').fill('คำใบ้ที่ผู้สอนเพิ่มเอง');
  await page.getByTestId('challenge-edit-toggle').click();
  await expect(page.getByTestId('challenge-hint-next')).toContainText('4/5');
  await page.getByTestId('challenge-hint-next').click();
  await expect(page.getByTestId('hint-4')).toContainText('คำใบ้ที่ผู้สอนเพิ่มเอง');
});

test('a challenge without hints shows no hint box', async ({ page }) => {
  await page.getByTestId('select-challenge').selectOption('trouble');
  await page.getByTestId('challenge-edit-toggle').click();
  for (let i = 3; i >= 0; i--) await page.getByTestId(`challenge-hint-del-${i}`).click();
  await page.getByTestId('challenge-edit-toggle').click();
  await expect(page.getByTestId('challenge-hints')).toHaveCount(0);
});

test('Tab completes CLI words and lists options without leaving the console', async ({ page }) => {
  await page.getByTestId('node-R1').dblclick();
  const input = page.getByTestId('console-input');
  await input.fill('en');
  await input.press('Tab');
  await expect(input).toHaveValue('enable ');
  await expect(input).toBeFocused();
  await input.press('Enter');
  await expect(page.getByTestId('console-prompt')).toHaveText('R1#');
  await input.fill('show ip ');
  await input.press('Tab');
  await expect(input).toHaveValue('show ip '); // ambiguous: nothing added…
  await expect(page.getByTestId('console-log')).toContainText('route'); // …but the options are listed
  await input.fill('conf');
  await input.press('Tab');
  await expect(input).toHaveValue('configure ');
});

test('the page has a favicon (no 404 for it)', async ({ page }) => {
  const bad: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400) bad.push(r.url());
  });
  await page.reload();
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
  expect(bad).toEqual([]);
});
