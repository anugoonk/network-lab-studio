import { expect, test } from '@playwright/test';

// R-03: the Lab Inspector lists native VLAN mismatches on up trunks and the list follows the configuration
test('native VLAN mismatch on the SW1–SW2 trunk appears in the Inspector and disappears when fixed', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await page.getByTestId('btn-sample2').click();
  await expect(page.getByTestId('lab-name')).toContainText('Inter-VLAN');

  await page.getByTestId('rtab-inspector').click();
  await expect(page.getByTestId('native-none')).toBeVisible();

  await page.getByTestId('node-SW1').dblclick();
  await expect(page.getByTestId('console')).toContainText('SW1');
  const input = page.getByTestId('console-input');
  for (const l of ['enable', 'configure terminal', 'interface gi0/2', 'switchport trunk native vlan 99']) {
    await input.fill(l);
    await input.press('Enter');
  }
  // SW1 (Cisco) ↔ SW2 (Aruba) is not a CDP link: no device syslog line
  await expect(page.getByTestId('console-log')).not.toContainText('NATIVE_VLAN_MISMATCH');

  await page.getByTestId('rtab-inspector').click();
  await expect(page.getByTestId('native-list')).toContainText('SW1');
  await expect(page.getByTestId('native-list')).toContainText('99');
  await expect(page.getByTestId('native-list').locator('li')).toHaveCount(1);

  await page.getByTestId('rtab-console').click();
  await input.fill('no switchport trunk native vlan');
  await input.press('Enter');
  await page.getByTestId('rtab-inspector').click();
  await expect(page.getByTestId('native-none')).toBeVisible();
});
