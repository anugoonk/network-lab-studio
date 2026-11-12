import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const KINDS = ['cisco-router', 'cisco-switch', 'aruba-switch', 'l3-switch', 'pc', 'laptop', 'server', 'wireless-ap', 'firewall', 'isp-router'];

async function drop(page: Page, kind: string, x: number, y: number) {
  await page.getByTestId(`palette-${kind}`).dragTo(page.getByTestId('canvas'), { targetPosition: { x, y } });
}

async function newBlankLab(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await page.getByTestId('btn-new').click(); // untouched sample -> replaced without a prompt
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  if (!(await page.getByTestId('palette-pc').isVisible())) await page.getByTestId('menu-add').click();
  await expect(page.getByTestId('palette-pc')).toBeVisible();
}

test('palette shows all 14 devices once; each of the 10 network devices can be dragged, selected, renamed and deleted', async ({ page }) => {
  await newBlankLab(page);
  for (const k of KINDS) await expect(page.getByTestId(`palette-${k}`)).toHaveCount(1);
  await expect(page.locator('[data-testid^="palette-"]:not([data-testid^="palette-group"])')).toHaveCount(14); // 10 + 4 diagram objects (DEV-01B-1b)
  const before = 0;
  let n = 0;
  for (const k of KINDS) {
    await page.getByTestId(`palette-${k}`).dragTo(page.getByTestId('canvas'), { targetPosition: { x: 200 + (n % 5) * 120, y: 450 + Math.floor(n / 5) * 110 } });
    n++;
    await expect(page.locator('.react-flow__node')).toHaveCount(before + n);
  }
  // second device of the same kind gets a different name
  await page.getByTestId('palette-firewall').click();
  await expect(page.getByTestId('node-FW1')).toBeVisible();
  await expect(page.getByTestId('node-FW2')).toBeVisible();
  await expect(page.getByTestId('node-DSW1')).toBeVisible();
  // rename + delete the firewall
  await page.getByTestId('node-FW2').click();
  await expect(page.getByTestId('no-cli-note')).toBeVisible();
  await expect(page.getByTestId('open-console')).toHaveCount(0);
  await page.getByTestId('device-name').fill('EDGE-FW');
  await page.getByTestId('device-name').press('Enter');
  await expect(page.getByTestId('node-EDGE-FW')).toBeVisible();
  await page.getByTestId('delete-device').click();
  await expect(page.getByTestId('node-EDGE-FW')).toHaveCount(0);
});

for (const [kind, name, port24] of [
  ['cisco-switch', 'SW1', 'FastEthernet0/24'],
  ['aruba-switch', 'SW1', '1/1/24'],
] as const) {
  test(`${kind}: cable port 24 through the UI and see it busy afterwards`, async ({ page }) => {
    await newBlankLab(page);
    await drop(page, kind, 350, 500);
    await drop(page, 'laptop', 150, 500);
    await drop(page, 'server', 550, 500);
    await expect(page.getByTestId(`node-${name}`)).toBeVisible();
    const connect = async (from: string) => {
      await page.getByTestId(from).locator('.node-handle').dragTo(page.getByTestId(`node-${name}`).locator('.node-handle'));
      await expect(page.getByTestId('connect-submit')).toBeVisible();
    };
    await connect('node-LAP-01');
    await page.getByTestId('connect-b-port').selectOption(port24);
    await page.getByTestId('connect-submit').click();
    await expect(page.getByTestId('notice')).toContainText('เชื่อมสายสำเร็จ');
    // the port label is shown only for cabled ports
    await expect(page.locator('.port-label', { hasText: port24.replace('FastEthernet', 'Fa') })).toHaveCount(1);
    await page.getByTestId('notice').click();
    // port 24 is disabled in the dialog now
    await connect('node-SRV-01');
    await expect(page.getByTestId('connect-b-port').locator(`option[value="${port24}"]`)).toBeDisabled();
    await page.getByTestId('connect-b-port').selectOption(port24.replace('24', '23'));
    await page.getByTestId('connect-submit').click();
    await expect(page.getByTestId('notice')).toContainText('เชื่อมสายสำเร็จ');
  });
}

test('unplugging a cable frees the port; new devices and cable survive a reload', async ({ page }) => {
  await newBlankLab(page);
  await drop(page, 'firewall', 200, 500);
  await drop(page, 'isp-router', 500, 500);
  await page.getByTestId('node-FW1').locator('.node-handle').dragTo(page.getByTestId('node-ISP1').locator('.node-handle'));
  await page.getByTestId('connect-a-port').selectOption('WAN');
  await page.getByTestId('connect-submit').click();
  await expect(page.getByTestId('notice')).toContainText('เชื่อมสายสำเร็จ');
  await expect(page.locator('.port-label', { hasText: 'WAN' })).toHaveCount(1);
  // reload keeps the new devices and the cable
  await page.reload();
  await expect(page.getByTestId('node-FW1')).toBeVisible();
  await expect(page.locator('.port-label', { hasText: 'WAN' })).toHaveCount(1);
  // remove the cable (select it and press Delete) → port is free again
  await page.locator('.react-flow__edge').first().dispatchEvent('click');
  await page.getByTestId('rtab-details').click();
  await page.getByTestId('delete-link').click();
  await expect(page.locator('.port-label')).toHaveCount(0);
  await expect(page.getByTestId('node-ISP1')).toBeVisible();
  await page.getByTestId('node-FW1').locator('.node-handle').dragTo(page.getByTestId('node-ISP1').locator('.node-handle'));
  await expect(page.getByTestId('connect-a-port').locator('option[value="WAN"]')).toBeEnabled();
});
