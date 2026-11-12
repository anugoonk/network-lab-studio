import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DEV-01B-1b: Internet Cloud, Patch Panel, Rack, UPS — diagram-only objects.

type Box = { x: number; y: number; width: number; height: number };
const NEW = ['internet-cloud', 'patch-panel', 'rack', 'ups'];
const items = (page: Page) => page.locator('[data-testid^="palette-"]:not([data-testid^="palette-group"])');
const kinds = (page: Page) => items(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('palette-'.length)));
const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function blank(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await page.getByTestId('btn-new').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  await page.getByTestId('menu-add').click(); // palette goes to the bar
  await expect(page.getByTestId('device-bar')).toBeVisible();
}
async function type(page: Page, line: string) {
  await page.getByTestId('console-input').fill(line);
  await page.getByTestId('console-input').press('Enter');
}

test('palette: the four objects are listed as Diagram Only, searchable, in WAN / Infrastructure, hidden by the simulation filter', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  for (const k of NEW) {
    await expect(page.getByTestId(`palette-${k}`)).toHaveAttribute('data-sim', 'diagram');
    await expect(page.getByTestId(`palette-${k}`)).toHaveAttribute('aria-label', /แผนผังเท่านั้น/);
  }
  const s = page.getByTestId('device-search');
  for (const [q, k] of [['cloud', 'internet-cloud'], ['patch', 'patch-panel'], ['rack', 'rack'], ['ups', 'ups']]) {
    await s.fill(q);
    expect(await kinds(page), q).toEqual([k]);
  }
  await s.fill('');
  await page.getByTestId('device-cat-wan').click();
  expect(await kinds(page)).toEqual(['internet-cloud']);
  await page.getByTestId('device-cat-infrastructure').click();
  expect(await kinds(page)).toEqual(['patch-panel', 'rack', 'ups']);
  await page.getByTestId('device-sim-only').click();
  await expect(page.getByTestId('device-empty')).toBeVisible();
  await page.getByTestId('device-empty-clear').click();
  expect(await kinds(page)).toHaveLength(14);
  await page.getByTestId('device-sim-only').click();
  expect((await kinds(page)).some((k) => NEW.includes(k))).toBe(false);
});

test('add by click (no overlap), keyboard and drag; ▭ on the canvas; rack and UPS have no cable handle', async ({ page }) => {
  await blank(page);
  await page.getByTestId('palette-internet-cloud').click();
  await page.getByTestId('palette-patch-panel').click();
  await page.getByTestId('palette-rack').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('palette-ups').focus();
  await page.keyboard.press(' ');
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  const boxes: Box[] = [];
  for (let i = 0; i < 4; i++) boxes.push((await page.locator('.react-flow__node').nth(i).boundingBox())!);
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(overlap(boxes[i], boxes[j])).toBe(false);
  for (const n of ['CLOUD1', 'PP1', 'RACK1', 'UPS1']) {
    await expect(page.getByTestId(`sim-node-${n}`)).toBeVisible();
    await expect(page.getByTestId(`sim-node-${n}`)).toHaveText('▭');
    await expect(page.getByTestId(`node-${n}`)).toHaveAttribute('data-sim', 'diagram');
  }
  await expect(page.getByTestId('node-CLOUD1').locator('.node-handle')).toHaveCount(1);
  await expect(page.getByTestId('node-PP1').locator('.node-handle')).toHaveCount(1);
  await expect(page.getByTestId('node-RACK1').locator('.node-handle')).toHaveCount(0);
  await expect(page.getByTestId('node-UPS1').locator('.node-handle')).toHaveCount(0);
  // drag: dropped under the cursor like any device
  const c = (await page.getByTestId('canvas').boundingBox())!;
  await page.getByTestId('palette-rack').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 120, y: 120 } });
  const r2 = (await page.getByTestId('node-RACK2').boundingBox())!;
  expect(Math.abs(r2.x - (c.x + 120 - 45))).toBeLessThanOrEqual(4);
  // undo / redo the drop
  await page.getByTestId('btn-undo').click();
  await expect(page.getByTestId('node-RACK2')).toHaveCount(0);
  await page.getByTestId('btn-redo').click();
  await expect(page.getByTestId('node-RACK2')).toBeVisible();
});

test('details panel: Diagram Only + explanation, no console; the connect dialog offers cloud / patch panel ports but never rack / UPS', async ({ page }) => {
  await blank(page);
  for (const k of ['pc', 'internet-cloud', 'patch-panel', 'rack', 'ups']) await page.getByTestId(`palette-${k}`).click();
  for (const [n, note] of [['CLOUD1', 'อินเทอร์เน็ตจริง'], ['PP1', 'ไม่ส่งข้อมูลระหว่างพอร์ต'], ['RACK1', 'ไม่มีพอร์ต'], ['UPS1', 'ไม่จำลองไฟฟ้า']]) {
    await page.getByTestId(`node-${n}`).click();
    await expect(page.getByTestId('device-sim-badge')).toContainText('แผนผังเท่านั้น');
    await expect(page.getByTestId('device-sim-note')).toContainText(note);
    await expect(page.getByTestId('open-console')).toHaveCount(0);
  }
  await page.getByTestId('btn-connect').click();
  const opts = await page.getByTestId('connect-a-device').locator('option').allTextContents();
  expect(opts).toEqual(['PC-01', 'CLOUD1', 'PP1']);
  await page.getByTestId('connect-a-device').selectOption({ label: 'PC-01' });
  await page.getByTestId('connect-b-device').selectOption({ label: 'PP1' });
  await page.getByTestId('connect-b-port').selectOption('P1');
  await page.getByTestId('connect-submit').click();
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
});

test('no forwarding through a patch panel: two PCs cabled through it cannot ping', async ({ page }) => {
  await blank(page);
  for (const k of ['pc', 'pc', 'patch-panel']) await page.getByTestId(`palette-${k}`).click();
  for (const [pc, port] of [['PC-01', 'P1'], ['PC-02', 'P2']]) {
    await page.getByTestId('btn-connect').click();
    await page.getByTestId('connect-a-device').selectOption({ label: pc });
    await page.getByTestId('connect-b-device').selectOption({ label: 'PP1' });
    await page.getByTestId('connect-b-port').selectOption(port);
    await page.getByTestId('connect-submit').click();
  }
  await expect(page.locator('.react-flow__edge')).toHaveCount(2);
  for (const [pc, ip] of [['PC-01', '10.9.9.1'], ['PC-02', '10.9.9.2']]) {
    await page.getByTestId(`node-${pc}`).click();
    await page.getByTestId('pc-ip').fill(ip);
    await page.getByTestId('pc-mask').fill('255.255.255.0');
    await page.getByTestId('pc-apply').click();
  }
  await page.getByTestId('node-PC-01').dblclick();
  await type(page, 'ping 10.9.9.2');
  await expect(page.getByTestId('console-log')).toContainText('Ping statistics');
  await expect(page.getByTestId('console-log')).not.toContainText('Reply from 10.9.9.2');
});

test('export → import → reload keeps the objects, ids and ports; English labels', async ({ page }) => {
  await blank(page);
  for (const k of NEW) await page.getByTestId(`palette-${k}`).click();
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export').click()]);
  const file = path.join(os.tmpdir(), `nls-diag-${Date.now()}.json`);
  await d.saveAs(file);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(json.schemaVersion).toBe(1);
  expect(json.lab.devices.map((x: { id: string; kind: string; ifaces: unknown[] }) => `${x.id}:${x.kind}:${x.ifaces.length}`)).toEqual(['d1:internet-cloud:4', 'd2:patch-panel:24', 'd3:rack:0', 'd4:ups:0']);
  await page.getByTestId('btn-new').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  await page.getByTestId('import-file').setInputFiles(file);
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  await page.waitForTimeout(600); // autosave
  await page.reload();
  await expect(page.getByTestId('node-RACK1')).toBeVisible();
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  fs.rmSync(file, { force: true });
  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('sim-node-UPS1')).toHaveAttribute('aria-label', 'Diagram Only');
  await page.getByTestId('node-CLOUD1').click();
  await expect(page.locator('.dev-title')).toHaveText('Internet Cloud');
  await expect(page.getByTestId('device-sim-note')).toContainText('no real Internet access');
  await expect(page.getByTestId('palette-patch-panel')).toHaveAttribute('aria-label', /Patch Panel · Infrastructure · Diagram Only/);
});
