import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DEV-01C-1: Network Printer, IP Camera, IP Phone, NVR, NAS — IP hosts on the existing host simulation.

type Box = { x: number; y: number; width: number; height: number };
const NEW = ['printer', 'ip-camera', 'ip-phone', 'nvr', 'nas'];
const NAMES = ['PRN-01', 'CAM-01', 'PHN-01', 'NVR-01', 'NAS-01'];
const items = (page: Page) => page.locator('[data-testid^="palette-"]:not([data-testid^="palette-group"])');
const kinds = (page: Page) => items(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('palette-'.length)));
const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function blank(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await page.getByTestId('btn-new').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  await page.getByTestId('menu-add').click();
  await expect(page.getByTestId('device-bar')).toBeVisible();
}
async function cable(page: Page, a: string, b: string, port: string) {
  await page.getByTestId('btn-connect').click();
  await page.getByTestId('connect-a-device').selectOption({ label: a });
  await page.getByTestId('connect-b-device').selectOption({ label: b });
  await page.getByTestId('connect-b-port').selectOption(port);
  await page.getByTestId('connect-submit').click();
}
async function setIp(page: Page, node: string, ip: string, gw = '') {
  await page.getByTestId(`node-${node}`).click();
  await page.getByTestId('pc-ip').fill(ip);
  await page.getByTestId('pc-mask').fill('255.255.255.0');
  await page.getByTestId('pc-gw').fill(gw);
  await page.getByTestId('pc-apply').click();
  await expect(page.getByText('บันทึกค่า IP แล้ว')).toBeVisible();
}
async function type(page: Page, line: string) {
  await page.getByTestId('console-input').fill(line);
  await page.getByTestId('console-input').press('Enter');
}

test('palette: five IP end devices, Partial Simulation, searchable, in End devices, kept by the simulation filter', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  for (const k of NEW) {
    await expect(page.getByTestId(`palette-${k}`)).toHaveAttribute('data-sim', 'partial');
    await expect(page.getByTestId(`palette-${k}`)).toHaveAttribute('aria-label', /จำลองได้บางส่วน/);
  }
  for (const [q, k] of [['printer', 'printer'], ['camera', 'ip-camera'], ['phone', 'ip-phone'], ['nvr', 'nvr'], ['nas', 'nas'], ['กล้อง', 'ip-camera']]) {
    await page.getByTestId('device-search').fill(q);
    expect(await kinds(page), q).toEqual([k]);
  }
  await page.getByTestId('device-search').fill('');
  await page.getByTestId('device-cat-end').click();
  expect(await kinds(page)).toEqual(['pc', 'laptop', 'printer', 'ip-camera', 'ip-phone', 'server', 'nvr', 'nas']);
  await page.getByTestId('device-sim-only').click();
  expect(await kinds(page)).toEqual(['pc', 'laptop', 'printer', 'ip-camera', 'ip-phone', 'server', 'nvr', 'nas']);
});

test('add by click (no overlap), Enter, Space and drag; ◐ on the canvas; cable handle; undo / redo', async ({ page }) => {
  await blank(page);
  await page.getByTestId('palette-printer').click();
  await page.getByTestId('palette-ip-camera').click();
  await page.getByTestId('palette-ip-phone').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('palette-nvr').focus();
  await page.keyboard.press(' ');
  const c = (await page.getByTestId('canvas').boundingBox())!;
  await page.getByTestId('palette-nas').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 120, y: 120 } });
  await expect(page.locator('.react-flow__node')).toHaveCount(5);
  const nas = (await page.getByTestId('node-NAS-01').boundingBox())!;
  expect(Math.abs(nas.x - (c.x + 120 - 45))).toBeLessThanOrEqual(4);
  const boxes: Box[] = [];
  for (const n of NAMES.slice(0, 4)) boxes.push((await page.getByTestId(`node-${n}`).boundingBox())!);
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(overlap(boxes[i], boxes[j])).toBe(false);
  for (const n of NAMES) {
    await expect(page.getByTestId(`sim-node-${n}`)).toHaveText('◐');
    await expect(page.getByTestId(`node-${n}`).locator('.node-handle')).toHaveCount(1);
  }
  await page.getByTestId('btn-undo').click();
  await expect(page.getByTestId('node-NAS-01')).toHaveCount(0);
  await page.getByTestId('btn-redo').click();
  await expect(page.getByTestId('node-NAS-01')).toBeVisible();
});

test('details panel: Partial Simulation + what is not simulated, IP settings and a Terminal', async ({ page }) => {
  await blank(page);
  for (const k of NEW) await page.getByTestId(`palette-${k}`).click();
  const notes: Record<string, string> = { 'PRN-01': 'การพิมพ์', 'CAM-01': 'วิดีโอ', 'PHN-01': 'SIP', 'NVR-01': 'การบันทึก', 'NAS-01': 'SMB / NFS' };
  for (const n of NAMES) {
    await page.getByTestId(`node-${n}`).click();
    await expect(page.getByTestId('device-sim-badge')).toContainText('จำลองได้บางส่วน');
    await expect(page.getByTestId('device-sim-note')).toContainText(notes[n]);
    await expect(page.getByTestId('pc-ip')).toBeVisible();
    await expect(page.getByTestId('open-console')).toContainText('Terminal');
  }
});

test('a camera pings a PC through a Catalyst 2960 and the PC pings it back; ipconfig shows its settings', async ({ page }) => {
  await blank(page);
  for (const k of ['ip-camera', 'pc', 'cisco-switch']) await page.getByTestId(`palette-${k}`).click();
  await cable(page, 'CAM-01', 'SW1', 'FastEthernet0/1');
  await cable(page, 'PC-01', 'SW1', 'FastEthernet0/2');
  await expect(page.locator('.react-flow__edge')).toHaveCount(2);
  await setIp(page, 'CAM-01', '192.168.30.10', '192.168.30.1');
  await setIp(page, 'PC-01', '192.168.30.20');
  await page.getByTestId('node-CAM-01').dblclick();
  await expect(page.getByTestId('console')).toContainText('CAM-01');
  await type(page, 'ipconfig');
  await expect(page.getByTestId('console-log')).toContainText('192.168.30.10');
  await type(page, 'ping 192.168.30.20');
  await expect(page.getByTestId('console-log')).toContainText('Reply from 192.168.30.20');
  await page.getByTestId('node-PC-01').dblclick();
  await type(page, 'ping 192.168.30.10');
  await expect(page.getByTestId('console-log')).toContainText('Reply from 192.168.30.10');
});

test('export → import → reload keeps the devices, their IP settings and ids; English labels', async ({ page }) => {
  await blank(page);
  for (const k of NEW) await page.getByTestId(`palette-${k}`).click();
  await setIp(page, 'NAS-01', '10.10.10.5', '10.10.10.1');
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export').click()]);
  const file = path.join(os.tmpdir(), `nls-endpoints-${Date.now()}.json`);
  await d.saveAs(file);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(json.schemaVersion).toBe(1);
  expect(json.lab.devices.map((x: { id: string; kind: string; name: string }) => `${x.id}:${x.kind}:${x.name}`)).toEqual(['d1:printer:PRN-01', 'd2:ip-camera:CAM-01', 'd3:ip-phone:PHN-01', 'd4:nvr:NVR-01', 'd5:nas:NAS-01']);
  await page.getByTestId('btn-new').click();
  await page.getByTestId('import-file').setInputFiles(file);
  await expect(page.locator('.react-flow__node')).toHaveCount(5);
  await page.waitForTimeout(600); // autosave
  await page.reload();
  await expect(page.getByTestId('node-NAS-01')).toBeVisible();
  await page.getByTestId('node-NAS-01').click();
  await expect(page.getByTestId('pc-ip')).toHaveValue('10.10.10.5');
  await expect(page.getByTestId('pc-gw')).toHaveValue('10.10.10.1');
  fs.rmSync(file, { force: true });
  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByTestId('node-PRN-01').click();
  await expect(page.locator('.dev-title')).toHaveText('Network Printer');
  await expect(page.getByTestId('device-sim-badge')).toContainText('Partial Simulation');
  await expect(page.getByTestId('device-sim-note')).toContainText('printing');
  await expect(page.getByTestId('palette-ip-camera')).toHaveAttribute('aria-label', /IP Camera · End devices · Partial Simulation/);
});
