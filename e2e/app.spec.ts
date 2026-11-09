import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

const log = (page: Page) => page.getByTestId('console-log');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('lab-name')).toContainText('Small Office');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
});

test('sample lab → ping → shutdown uplink on SW2 → ping fails → no shutdown → ping works', async ({ page }) => {
  await openConsole(page, 'PC-01');
  await type(page, 'ping 192.168.1.110');
  await expect(log(page)).toContainText('Reply from 192.168.1.110');
  await type(page, 'ping 192.168.1.1');
  await expect(log(page)).toContainText('Reply from 192.168.1.1:');

  // all links up initially, uplink is l2 (SW1 Gi0/2 <-> SW2 1/1/24)
  await expect(page.getByTestId('link-status-l2')).toContainText('UP');
  await expect(page.getByTestId('port-label-l2-b')).toContainText('1/1/24');
  await expect(page.getByTestId('port-label-l2-a')).toContainText('Gi0/2');

  // Aruba CLI on SW2
  await openConsole(page, 'SW2');
  await type(page, 'configure terminal');
  await expect(page.getByTestId('console-prompt')).toHaveText('SW2(config)#');
  await type(page, 'interface 1/1/24');
  await expect(page.getByTestId('console-prompt')).toHaveText('SW2(config-if)#');
  await type(page, 'shutdown');

  // cable is still there, but the link is down — text + colour on the canvas
  await expect(page.getByTestId('link-status-l2')).toContainText('DOWN');
  await expect(page.getByTestId('port-label-l2-b')).toContainText('⏻');

  await openConsole(page, 'PC-01');
  await type(page, 'ping 192.168.1.110');
  await expect(log(page)).toContainText('Destination host unreachable');
  await type(page, 'ping 192.168.1.1');
  // gateway still reachable (R1 attached to SW1)
  await expect(log(page).locator('.out', { hasText: 'Reply from 192.168.1.1:' }).last()).toBeVisible();

  // Lab Inspector explains the failure (separate from terminal output)
  await page.getByTestId('rtab-inspector').click();
  await page.getByTestId('inspector-dst').fill('192.168.1.110');
  await page.getByTestId('inspector-src').selectOption({ label: 'PC-01' });
  await page.getByTestId('inspector-run').click();
  await expect(page.getByTestId('inspector-explain')).toContainText('1/1/24');
  await expect(page.getByTestId('inspector-explain')).toContainText('shutdown');

  // recover
  await openConsole(page, 'SW2');
  await type(page, 'no shutdown');
  await expect(page.getByTestId('link-status-l2')).toContainText('UP');
  await openConsole(page, 'PC-01');
  await type(page, 'ping 192.168.1.110');
  await expect(log(page).locator('.out', { hasText: 'Reply from 192.168.1.110' }).last()).toBeVisible();
  await page.screenshot({ path: 'test-results/flow-recovered.png' });
});

test('moving PC-10 to VLAN 20 breaks ping while link stays up; moving back recovers', async ({ page }) => {
  await openConsole(page, 'SW2');
  for (const l of ['configure terminal', 'interface 1/1/5', 'vlan access 20']) await type(page, l);
  // PC-10 cable is still up
  await page.getByTestId('node-PC-10').click();
  await page.getByTestId('rtab-details').click();
  await expect(page.getByTestId('port-row-Ethernet0')).toContainText('ใช้งานได้');

  await openConsole(page, 'PC-01');
  await type(page, 'ping 192.168.1.110');
  await expect(log(page)).toContainText('Destination host unreachable');
  await page.getByTestId('rtab-inspector').click();
  await page.getByTestId('inspector-src').selectOption({ label: 'PC-01' });
  await page.getByTestId('inspector-dst').fill('192.168.1.110');
  await page.getByTestId('inspector-run').click();
  await expect(page.getByTestId('inspector-explain')).toContainText('VLAN 20');

  await openConsole(page, 'SW2');
  await type(page, 'vlan access 10');
  await openConsole(page, 'PC-01');
  await type(page, 'ping 192.168.1.110');
  await expect(log(page).locator('.out', { hasText: 'Reply from 192.168.1.110' }).last()).toBeVisible();
});

test('wrong gateway keeps same-subnet ping but breaks cross-subnet', async ({ page }) => {
  await page.getByTestId('node-PC-01').click();
  await page.getByTestId('pc-gw').fill('192.168.1.254');
  await page.getByTestId('pc-apply').click();
  await expect(page.getByText('บันทึกค่า IP แล้ว')).toBeVisible();
  await openConsole(page, 'PC-01');
  await type(page, 'ipconfig');
  await expect(log(page)).toContainText('192.168.1.254');
  await type(page, 'ping 192.168.1.110');
  await expect(log(page).locator('.out', { hasText: 'Reply from 192.168.1.110' }).last()).toBeVisible();
  await type(page, 'ping 10.0.0.10');
  await expect(log(page).locator('.out', { hasText: 'Destination host unreachable' }).last()).toBeVisible();
});

test('invalid IP config is rejected with a message', async ({ page }) => {
  await page.getByTestId('node-PC-02').click();
  await page.getByTestId('pc-ip').fill('999.1.1.1');
  await page.getByTestId('pc-apply').click();
  await expect(page.getByRole('alert')).toContainText('IPv4');
  await page.getByTestId('pc-ip').fill('192.168.1.102');
  await page.getByTestId('pc-mask').fill('255.0.255.0');
  await page.getByTestId('pc-apply').click();
  await expect(page.getByRole('alert')).toContainText('mask');
});

test('add a new PC from the palette, cable it to a free port, set VLAN + IP, ping', async ({ page }) => {
  await page.getByTestId('palette-pc').click();
  await expect(page.getByTestId('node-PC-11')).toBeVisible();
  await page.getByTestId('btn-connect').click();
  await page.getByTestId('connect-a-device').selectOption({ label: 'PC-11' });
  await page.getByTestId('connect-b-device').selectOption({ label: 'SW1' });
  // a port already in use cannot be chosen
  await expect(page.getByTestId('connect-b-port').locator('option[value="FastEthernet0/1"]')).toBeDisabled();
  await page.getByTestId('connect-b-port').selectOption('FastEthernet0/6');
  await page.getByTestId('connect-submit').click();
  await expect(page.getByTestId('notice')).toContainText('เชื่อมสายสำเร็จ');

  // trying to reuse the used port is blocked
  await page.getByTestId('btn-connect').click();
  await page.getByTestId('connect-a-device').selectOption({ label: 'SW1' });
  await expect(page.getByTestId('connect-a-port').locator('option[value="FastEthernet0/6"]')).toBeDisabled();
  await page.getByRole('button', { name: 'ยกเลิก' }).click();

  await openConsole(page, 'SW1');
  for (const l of ['enable', 'configure terminal', 'interface fa0/6', 'switchport mode access', 'switchport access vlan 10', 'end']) await type(page, l);

  await page.getByTestId('node-PC-11').click();
  await page.getByTestId('rtab-details').click();
  await page.getByTestId('pc-ip').fill('192.168.1.120');
  await page.getByTestId('pc-mask').fill('255.255.255.0');
  await page.getByTestId('pc-gw').fill('192.168.1.1');
  await page.getByTestId('pc-apply').click();
  await expect(page.getByText('บันทึกค่า IP แล้ว')).toBeVisible();

  await openConsole(page, 'PC-11');
  await type(page, 'ping 192.168.1.110');
  await expect(log(page).locator('.out', { hasText: 'Reply from 192.168.1.110' }).last()).toBeVisible();
  await type(page, 'ping 192.168.1.1');
  await expect(log(page).locator('.out', { hasText: 'Reply from 192.168.1.1:' }).last()).toBeVisible();
});

test('drag a device from the palette onto the canvas; rename; delete', async ({ page }) => {
  const before = await page.locator('.react-flow__node').count();
  await page.getByTestId('palette-aruba-switch').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 300, y: 500 } });
  await expect(page.locator('.react-flow__node')).toHaveCount(before + 1);
  await expect(page.getByTestId('node-SW3')).toBeVisible();
  await page.getByTestId('device-name').fill('ACCESS3');
  await page.getByTestId('device-name').press('Enter');
  await expect(page.getByTestId('node-ACCESS3')).toBeVisible();
  await page.getByTestId('delete-device').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(before);
});

test('drag a cable between two devices, choose ports, and select a link', async ({ page }) => {
  await page.getByTestId('palette-pc').click();
  const newNode = page.getByTestId('node-PC-11');
  await expect(newNode).toBeVisible();
  const handle = newNode.locator('.node-handle');
  const target = page.getByTestId('node-SW1').locator('.node-handle');
  await handle.dragTo(target);
  await expect(page.getByTestId('connect-submit')).toBeVisible();
  await page.getByTestId('connect-b-port').selectOption('FastEthernet0/7');
  await page.getByTestId('connect-submit').click();
  await expect(page.getByTestId('notice')).toContainText('เชื่อมสายสำเร็จ');
  await page.getByTestId('node-PC-11').click();
  await page.getByTestId('rtab-details').click();
  await expect(page.getByTestId('port-row-Ethernet0')).toContainText('SW1:Fa0/7');
});

test('wrong mode / cross-vendor syntax is reported and config does not change', async ({ page }) => {
  await openConsole(page, 'SW2');
  await type(page, 'enable');
  await expect(log(page)).toContainText('% Unknown command');
  await expect(log(page)).toContainText('Cisco IOS');
  await openConsole(page, 'SW1');
  await type(page, 'configure terminal');
  await expect(log(page)).toContainText("% Invalid input detected at '^' marker.");
  await expect(page.getByTestId('console-prompt')).toHaveText('SW1>');
  await type(page, 'enable');
  await type(page, 'configure terminal');
  await type(page, 'interface 1/1/1');
  await expect(log(page)).toContainText("% Invalid input detected");
  await expect(page.getByTestId('console-prompt')).toHaveText('SW1(config)#');
  await type(page, 'end');
  await type(page, 'show vlan brief');
  await expect(log(page)).toContainText('OFFICE');
  // history with arrow keys, and ? help
  await page.getByTestId('console-input').press('ArrowUp');
  await expect(page.getByTestId('console-input')).toHaveValue('show vlan brief');
  await page.getByTestId('console-input').fill('show ');
  await page.getByTestId('console-input').press('Shift+?');
  await expect(log(page)).toContainText('running-config');
});

test('reload keeps names, positions, cables, config and ping results', async ({ page }) => {
  await openConsole(page, 'SW2');
  for (const l of ['configure terminal', 'hostname ACCESS2', 'interface 1/1/24', 'shutdown']) await type(page, l);
  await expect(page.getByTestId('node-ACCESS2')).toBeVisible();
  const box = await page.getByTestId('node-PC-03').boundingBox();
  await page.waitForTimeout(500); // autosave debounce
  await page.reload();
  await expect(page.getByTestId('node-ACCESS2')).toBeVisible();
  await expect(page.getByTestId('link-status-l2')).toContainText('DOWN');
  const box2 = await page.getByTestId('node-PC-03').boundingBox();
  expect(Math.abs(box!.x - box2!.x)).toBeLessThan(3);
  await openConsole(page, 'PC-01');
  await type(page, 'ping 192.168.1.110');
  await expect(log(page)).toContainText('Destination host unreachable');
  await type(page, 'ping 192.168.1.1');
  await expect(log(page).locator('.out', { hasText: 'Reply from 192.168.1.1:' }).last()).toBeVisible();
});

test('export / import round-trip, invalid file is rejected, New Lab asks for confirmation', async ({ page }) => {
  await openConsole(page, 'SW2');
  for (const l of ['configure terminal', 'interface 1/1/24', 'shutdown']) await type(page, l);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export').click()]);
  const file = path.join(os.tmpdir(), `nls-e2e-${Date.now()}.json`);
  await download.saveAs(file);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(json.schemaVersion).toBe(1);
  expect(json.lab.devices.length).toBe(13);

  // after export there is nothing unsaved: New Lab replaces without a prompt
  await page.getByTestId('btn-new').click();
  await expect(page.getByTestId('lab-name')).toContainText('New Lab');
  await expect(page.locator('.react-flow__node')).toHaveCount(0);

  // import restores everything, including the shutdown uplink
  await page.getByTestId('import-file').setInputFiles(file);
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await expect(page.getByTestId('link-status-l2')).toContainText('DOWN');

  // invalid file: error, current lab untouched
  const bad = path.join(os.tmpdir(), `nls-bad-${Date.now()}.json`);
  const broken = JSON.parse(JSON.stringify(json));
  broken.lab.links[0].a.port = 'GigabitEthernet9/9';
  fs.writeFileSync(bad, JSON.stringify(broken));
  await page.getByTestId('import-file').setInputFiles(bad);
  await expect(page.getByTestId('notice')).toContainText('นำเข้าไม่สำเร็จ');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  fs.writeFileSync(bad, 'not json');
  await page.getByTestId('import-file').setInputFiles(bad);
  await expect(page.getByTestId('notice')).toContainText('JSON');

  // dirty lab → confirmation before replacing
  await openConsole(page, 'SW2');
  for (const l of ['no shutdown']) await type(page, l);
  await page.getByTestId('node-SW2').click();
  await page.getByTestId('btn-sample').click();
  await expect(page.getByTestId('confirm-ok')).toBeVisible();
  await page.getByTestId('confirm-cancel').click();
  await expect(page.getByTestId('confirm-ok')).toHaveCount(0);
  await page.getByTestId('btn-new').click();
  await page.getByTestId('confirm-ok').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
});

test('panels can be collapsed to enlarge the canvas', async ({ page }) => {
  const w0 = (await page.getByTestId('canvas').boundingBox())!.width;
  await page.getByTestId('toggle-left').click();
  await page.getByTestId('toggle-right').click();
  const w1 = (await page.getByTestId('canvas').boundingBox())!.width;
  expect(w1).toBeGreaterThan(w0 + 500);
  await page.getByTestId('btn-fit').click();
});

test('Command Library: filter, wrong-mode message, insert into console', async ({ page }) => {
  await page.getByTestId('tab-library').click();
  await page.getByTestId('lib-search').fill('vlan access');
  await page.getByTestId('lib-vendor').selectOption('aruba');
  await expect(page.getByTestId('lib-card-aruba.vlan.access')).toBeVisible();
  await expect(page.getByTestId('lib-card-cisco.switchport.vlan')).toHaveCount(0);

  // target = SW1 (Cisco) → wrong system
  await page.getByTestId('lib-target').selectOption({ label: 'SW1 — Cisco IOS Layer 2 Switch' });
  await page.getByTestId('lib-insert-aruba.vlan.access').click();
  await expect(page.getByTestId('lib-problem-aruba.vlan.access')).toContainText('Aruba AOS-CX');

  // target = SW2 but still in privileged mode → tells which mode to enter
  await page.getByTestId('lib-target').selectOption({ label: 'SW2 — HPE Aruba AOS-CX Layer 2 Switch' });
  await page.getByTestId('lib-insert-aruba.vlan.access').click();
  await expect(page.getByTestId('lib-problem-aruba.vlan.access')).toContainText('interface');

  await page.getByTestId('tab-lab').click();
  await openConsole(page, 'SW2');
  await type(page, 'configure terminal');
  await type(page, 'interface 1/1/5');
  await page.getByTestId('tab-library').click();
  await page.getByTestId('lib-target').selectOption({ label: 'SW2 — HPE Aruba AOS-CX Layer 2 Switch' });
  await page.getByTestId('lib-insert-aruba.vlan.access').click();
  // goes back to the console with the example typed but NOT executed
  await expect(page.getByTestId('console-input')).toHaveValue('vlan access 10');
  await expect(page.getByTestId('console-prompt')).toHaveText('SW2(config-if)#');
  await page.getByTestId('console-input').press('Enter');
  await expect(page.getByTestId('console-prompt')).toHaveText('SW2(config-if)#');
  await page.screenshot({ path: 'test-results/library-insert.png' });
});
