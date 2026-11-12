import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DEV-01B-1a: simulation-level badges (palette, canvas node, details) and the "simulation-capable only" palette filter.

const LEVEL: Record<string, string> = {
  'cisco-router': 'full', 'isp-router': 'full', 'cisco-switch': 'full', 'aruba-switch': 'full', 'l3-switch': 'full',
  pc: 'full', laptop: 'full', server: 'partial', 'wireless-ap': 'diagram', firewall: 'diagram',
  'internet-cloud': 'diagram', 'patch-panel': 'diagram', rack: 'diagram', ups: 'diagram',
};
const items = (page: Page) => page.locator('[data-testid^="palette-"]:not([data-testid^="palette-group"])');
const kinds = (page: Page) => items(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('palette-'.length)));

async function open(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
}
/** blank Lab with a PC, a server, an AP and a firewall added from the palette bar */
async function mixedLab(page: Page) {
  await open(page);
  await page.getByTestId('btn-new').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  await page.getByTestId('menu-add').click(); // close the menu list → palette in the bar
  for (const k of ['pc', 'server', 'wireless-ap', 'firewall']) await page.getByTestId(`palette-${k}`).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
}

test('palette: every device shows its level (badge + accessible name)', async ({ page }) => {
  await open(page);
  for (const [k, lvl] of Object.entries(LEVEL)) {
    await expect(page.getByTestId(`sim-palette-${k}`)).toHaveAttribute('data-sim', lvl);
    await expect(page.getByTestId(`palette-${k}`)).toHaveAttribute('data-sim', lvl);
  }
  await expect(page.getByTestId('palette-firewall')).toHaveAttribute('aria-label', /แผนผังเท่านั้น/);
  await expect(page.getByTestId('palette-server')).toHaveAttribute('aria-label', /จำลองได้บางส่วน/);
  await expect(page.getByTestId('palette-pc')).toHaveAttribute('aria-label', /จำลองได้/);
  // the list layout in the left menu shows the text badge
  await page.getByTestId('menu-add').click();
  await expect(page.getByTestId('sim-palette-wireless-ap')).toContainText('แผนผังเท่านั้น');
  await expect(page.getByTestId('sim-palette-server')).toContainText('จำลองได้บางส่วน');
});

test('canvas nodes and the details panel show the level; partial / diagram devices explain why', async ({ page }) => {
  await mixedLab(page);
  await expect(page.getByTestId('sim-node-PC-01')).toHaveAttribute('data-sim', 'full');
  await expect(page.getByTestId('sim-node-SRV-01')).toHaveAttribute('data-sim', 'partial');
  await expect(page.getByTestId('sim-node-AP1')).toHaveAttribute('data-sim', 'diagram');
  await expect(page.getByTestId('sim-node-FW1')).toHaveAttribute('aria-label', 'แผนผังเท่านั้น');

  await page.getByTestId('node-AP1').click();
  await expect(page.getByTestId('device-sim-badge')).toContainText('แผนผังเท่านั้น');
  await expect(page.getByTestId('device-sim-note')).toContainText('ไม่ส่งต่อข้อมูล');
  await expect(page.getByTestId('no-cli-note')).toBeVisible(); // existing note kept
  await page.getByTestId('node-SRV-01').click();
  await expect(page.getByTestId('device-sim-badge')).toContainText('จำลองได้บางส่วน');
  await expect(page.getByTestId('device-sim-note')).toContainText('DHCP');
  await page.getByTestId('node-PC-01').click();
  await expect(page.getByTestId('device-sim-badge')).toContainText('จำลองได้');
  await expect(page.getByTestId('device-sim-note')).toHaveCount(0);
});

test('English labels for badges and the filter', async ({ page }) => {
  await mixedLab(page);
  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('sim-node-AP1')).toHaveAttribute('aria-label', 'Diagram Only');
  await expect(page.getByTestId('sim-node-SRV-01')).toHaveAttribute('aria-label', 'Partial Simulation');
  await expect(page.getByTestId('sim-node-PC-01')).toHaveAttribute('aria-label', 'Simulation Ready');
  await page.getByTestId('node-FW1').click();
  await expect(page.getByTestId('device-sim-badge')).toContainText('Diagram Only');
  await expect(page.getByTestId('device-sim-note')).toContainText('does not forward');
  await expect(page.getByRole('button', { name: 'Simulation-capable only' })).toHaveCount(1);
});

test('"simulation-capable only" filter: alone, with search, with categories, cleared; the Lab is untouched', async ({ page }) => {
  await open(page);
  const toggle = page.getByTestId('device-sim-only');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await kinds(page)).toEqual(['cisco-router', 'isp-router', 'cisco-switch', 'aruba-switch', 'l3-switch', 'pc', 'laptop', 'server']);
  await page.getByTestId('device-search').fill('aruba');
  expect(await kinds(page)).toEqual(['aruba-switch', 'l3-switch']);
  await page.getByTestId('device-search').fill('firewall');
  await expect(page.getByTestId('device-empty')).toBeVisible();
  await page.getByTestId('device-search').fill('');
  await page.getByTestId('device-cat-other').click();
  await expect(page.getByTestId('device-empty')).toContainText('ไม่มีอุปกรณ์ที่จำลองได้ในหมวดนี้');
  await page.getByTestId('device-cat-end').click();
  expect(await kinds(page)).toEqual(['pc', 'laptop', 'server']);
  // the empty-state "clear" resets search, category and this filter
  await page.getByTestId('device-cat-other').click();
  await page.getByTestId('device-empty-clear').click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await kinds(page)).toHaveLength(14);
  // toggling twice gives everything back
  await toggle.click();
  await toggle.click();
  expect(await kinds(page)).toHaveLength(14);
  await expect(page.locator('.react-flow__node')).toHaveCount(13); // nothing on the canvas changed
});

test('with the filter on, click / keyboard / drag still add devices', async ({ page }) => {
  await open(page);
  await page.getByTestId('btn-new').click();
  await page.getByTestId('menu-add').click();
  await page.getByTestId('device-sim-only').click();
  await page.getByTestId('palette-cisco-router').click();
  await page.getByTestId('palette-pc').focus();
  await page.keyboard.press('Enter');
  const c = (await page.getByTestId('canvas').boundingBox())!;
  await page.getByTestId('palette-server').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 120, y: 120 } });
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  const srv = (await page.getByTestId('node-SRV-01').boundingBox())!;
  expect(Math.abs(srv.x - (c.x + 120 - 45))).toBeLessThanOrEqual(4);
});

test('the node badge does not change node size or the cable handle position', async ({ page }) => {
  await mixedLab(page);
  for (const name of ['PC-01', 'SRV-01', 'AP1', 'FW1']) {
    const node = page.getByTestId(`node-${name}`);
    const handle = node.locator('.node-handle');
    const withBadge = [await node.boundingBox(), await handle.boundingBox()];
    await page.getByTestId(`sim-node-${name}`).evaluate((el) => ((el as HTMLElement).style.display = 'none'));
    const without = [await node.boundingBox(), await handle.boundingBox()];
    expect(withBadge, name).toEqual(without);
    await expect(handle).toHaveCount(1);
  }
});

test('export / import: no capability data in the file, same ids and devices', async ({ page }) => {
  await mixedLab(page);
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export').click()]);
  const file = path.join(os.tmpdir(), `nls-cap-${Date.now()}.json`);
  await d.saveAs(file);
  const text = fs.readFileSync(file, 'utf8');
  expect(text).not.toMatch(/simLevel|simNote/);
  const json = JSON.parse(text);
  expect(json.schemaVersion).toBe(1);
  expect(json.lab.devices.map((x: { id: string; kind: string }) => `${x.id}:${x.kind}`)).toEqual(['d1:pc', 'd2:server', 'd3:wireless-ap', 'd4:firewall']);
  await page.getByTestId('btn-new').click();
  await page.getByTestId('import-file').setInputFiles(file);
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  await expect(page.getByTestId('sim-node-AP1')).toHaveAttribute('data-sim', 'diagram');
  fs.rmSync(file, { force: true });
});

test('canvas marks only partial (◐) and diagram (▭) devices; full ones carry no visible mark but keep the label', async ({ page }) => {
  await mixedLab(page);
  const size = async (id: string) => (await page.getByTestId(id).boundingBox())!;
  // full: present for screen readers / data-sim, but not drawn
  const full = await size('sim-node-PC-01');
  expect(full.width).toBeLessThanOrEqual(2); // 1px (visually hidden) × canvas zoom
  expect(full.height).toBeLessThanOrEqual(2);
  await expect(page.getByTestId('sim-node-PC-01')).toHaveAttribute('aria-label', 'จำลองได้');
  await expect(page.getByTestId('sim-node-PC-01')).toHaveAttribute('data-sim', 'full');
  // partial and diagram: visible marks with their symbol
  for (const [name, mark, label] of [['SRV-01', '◐', 'จำลองได้บางส่วน'], ['AP1', '▭', 'แผนผังเท่านั้น'], ['FW1', '▭', 'แผนผังเท่านั้น']] as const) {
    const b = await size(`sim-node-${name}`);
    expect(b.width, name).toBeGreaterThanOrEqual(12);
    await expect(page.getByTestId(`sim-node-${name}`)).toBeVisible();
    await expect(page.getByTestId(`sim-node-${name}`)).toHaveText(mark);
    await expect(page.getByTestId(`sim-node-${name}`)).toHaveAttribute('aria-label', label);
  }
  // the palette and the details panel still show the full level
  await expect(page.getByTestId('sim-palette-pc')).toBeVisible();
  await expect(page.getByTestId('sim-palette-pc')).toHaveAttribute('data-sim', 'full');
  await page.getByTestId('node-PC-01').click();
  await expect(page.getByTestId('device-sim-badge')).toBeVisible();
  await expect(page.getByTestId('device-sim-badge')).toContainText('จำลองได้');
  // selection and drag of a full node are unaffected
  const before = (await page.getByTestId('node-PC-01').boundingBox())!;
  await page.getByTestId('node-PC-01').hover();
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 60, before.y + before.height / 2 + 30, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await page.getByTestId('node-PC-01').boundingBox())!.x).toBeGreaterThan(before.x + 40);
  // English
  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('sim-node-PC-01')).toHaveAttribute('aria-label', 'Simulation Ready');
  expect((await size('sim-node-PC-01')).width).toBeLessThanOrEqual(2); // 1px element × the canvas zoom after the reload
  await expect(page.getByTestId('sim-node-SRV-01')).toHaveAttribute('aria-label', 'Partial Simulation');
  await expect(page.getByTestId('sim-node-AP1')).toBeVisible();
});
