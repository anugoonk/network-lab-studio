import { expect, test } from '@playwright/test';

test('Campus 3 Tier sample: opens from Lab Manager and the guide pings work in the Console', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await page.getByTestId('tab-manager').click();
  await page.getByTestId('manager-new-campus3').click();
  await expect(page.getByTestId('lab-name')).toContainText('Campus 3 Tier');
  for (const n of ['SwitchX-Core-1', 'SwitchY-Core-2', 'SwitchA-VSX', 'SwitchB-VSX', 'SwitchC-Access', 'VPC1', 'VPC2']) {
    await expect(page.getByTestId(`node-${n}`)).toBeVisible();
  }
  await expect(page.getByTestId('guide-title')).toContainText('Campus 3 Tier');

  await page.getByTestId('node-VPC1').dblclick();
  const input = page.getByTestId('console-input');
  const log = page.getByTestId('console-log');
  await input.fill('ping 10.10.200.11');
  await input.press('Enter');
  await expect(log).toContainText('Reply from 10.10.200.11');
  await input.fill('ping 192.168.4.25');
  await input.press('Enter');
  await expect(log).toContainText('Reply from 192.168.4.25');

  // a core switch: show ip route lists the static routes toward SwitchA
  await page.getByTestId('node-SwitchX-Core-1').dblclick();
  await input.fill('show ip route');
  await input.press('Enter');
  await expect(log).toContainText('10.10.100.0/24');
});
