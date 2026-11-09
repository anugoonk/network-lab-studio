import { expect, test, type Page } from '@playwright/test';

async function type(page: Page, line: string) {
  const input = page.getByTestId('console-input');
  await input.fill(line);
  await input.press('Enter');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
});

test('undo / redo buttons: delete a device and its cables, then bring everything back', async ({ page }) => {
  await expect(page.getByTestId('btn-undo')).toBeDisabled();
  await expect(page.getByTestId('btn-redo')).toBeDisabled();
  const nodes = await page.locator('.react-flow__node').count();
  const edges = await page.locator('.react-flow__edge').count();
  await page.getByTestId('node-PC-01').click();
  await page.getByTestId('delete-device').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(nodes - 1);
  await expect(page.locator('.react-flow__edge')).toHaveCount(edges - 1);
  await page.getByTestId('btn-undo').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(nodes);
  await expect(page.locator('.react-flow__edge')).toHaveCount(edges);
  await expect(page.getByTestId('btn-redo')).toBeEnabled();
  await page.getByTestId('btn-redo').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(nodes - 1);
  await expect(page.getByTestId('node-PC-01')).toHaveCount(0);
});

test('keyboard shortcuts work on the canvas but not inside the console input', async ({ page }) => {
  await page.getByTestId('node-PC-01').click();
  await page.getByTestId('delete-device').click();
  await expect(page.getByTestId('node-PC-01')).toHaveCount(0);
  await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await page.keyboard.press('Control+y');
  await expect(page.getByTestId('node-PC-01')).toHaveCount(0);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.getByTestId('node-PC-01')).toHaveCount(0); // nothing to redo any more
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  // delete again, then press Ctrl+Z while typing in the console: the lab must NOT change
  await page.getByTestId('node-PC-02').click();
  await page.getByTestId('delete-device').click();
  await page.getByTestId('node-SW2').dblclick();
  await page.getByTestId('console-input').click();
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('node-PC-02')).toHaveCount(0);
});

test('undo reverts a CLI config change and the Inspector/link status follow', async ({ page }) => {
  await page.getByTestId('node-SW2').dblclick();
  for (const l of ['configure terminal', 'interface 1/1/24', 'shutdown']) await type(page, l);
  await expect(page.getByTestId('link-status-l2')).toContainText('DOWN');
  await page.getByTestId('btn-undo').click();
  await expect(page.getByTestId('link-status-l2')).toContainText('UP');
  await expect(page.getByTestId('console-prompt')).toHaveText('SW2#');
  await page.getByTestId('btn-redo').click();
  await expect(page.getByTestId('link-status-l2')).toContainText('DOWN');
});

test('a dragged device is one undo step; loading another lab clears history', async ({ page }) => {
  const node = page.getByTestId('node-SW1');
  await page.waitForTimeout(700); // let the initial fit-view animation finish
  const before = await node.boundingBox();
  await node.hover();
  await page.mouse.down();
  await page.mouse.move(before!.x + 80, before!.y + 120, { steps: 12 });
  await page.mouse.up();
  const moved = await node.boundingBox();
  expect(Math.abs(moved!.y - before!.y)).toBeGreaterThan(50);
  await page.getByTestId('btn-undo').click();
  await expect.poll(async () => Math.abs((await node.boundingBox())!.y - before!.y)).toBeLessThan(3);
  await expect(page.getByTestId('btn-undo')).toBeDisabled();
  // new edit, then open another lab: history is gone
  await page.getByTestId('node-PC-03').click();
  await page.getByTestId('delete-device').click();
  await expect(page.getByTestId('btn-undo')).toBeEnabled();
  await page.getByTestId('btn-sample2').click();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('btn-undo')).toBeDisabled();
});
