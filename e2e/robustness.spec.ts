import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSampleLab } from '../src/core/sample';
import { serializeExport } from '../src/core/persist';
import type { Lab } from '../src/core/types';

/** The Small Office with an older, smaller SW2 (12 ports, uplink moved to 1/1/12) and a Cisco SW1 without Fa0/13-24. */
function smallModelsLab(): Lab {
  const lab = structuredClone(buildSampleLab());
  const byName = (n: string) => lab.devices.find((d) => d.name === n)!;
  const sw2 = byName('SW2');
  const sw1 = byName('SW1');
  const oldUplink = structuredClone(sw2.ifaces.find((i) => i.name === '1/1/24')!);
  sw2.ifaces = sw2.ifaces.filter((i) => Number(i.name.split('/')[2]) <= 12);
  sw2.ifaces[sw2.ifaces.findIndex((i) => i.name === '1/1/12')] = { ...oldUplink, name: '1/1/12' };
  for (const l of lab.links) for (const e of [l.a, l.b]) if (e.deviceId === sw2.id && e.port === '1/1/24') e.port = '1/1/12';
  sw1.ifaces = sw1.ifaces.filter((i) => !/^FastEthernet0\/(1[3-9]|2[0-4])$/.test(i.name));
  return lab;
}

async function type(page: Page, line: string) {
  const input = page.getByTestId('console-input');
  await input.fill(line);
  await input.press('Enter');
}

test('import: a Lab whose switches have fewer than 24 ports opens and keeps its ports, cables and behaviour', async ({ page }) => {
  const file = path.join(os.tmpdir(), `nls-small-${Date.now()}.json`);
  fs.writeFileSync(file, serializeExport(smallModelsLab()));
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await page.getByTestId('import-file').setInputFiles(file);
  await expect(page.getByTestId('notice')).toContainText('สำเร็จ');
  await expect(page.getByTestId('node-SW2')).toBeVisible();
  // the cable that used to sit on 1/1/24 now shows 1/1/12
  await expect(page.getByTestId('port-label-l2-b')).toContainText('1/1/12');
  // SW2 really has 12 ports
  await page.getByTestId('node-SW2').dblclick();
  await type(page, 'show interface brief');
  await expect(page.getByTestId('console-log')).toContainText('1/1/12');
  await expect(page.getByTestId('console-log')).not.toContainText('1/1/13');
  // traffic crosses the small switch: PC-01 (SW1) → PC-06 (SW2)
  await page.getByTestId('node-PC-01').dblclick();
  await type(page, 'ping 192.168.1.106');
  await expect(page.getByTestId('console-log').locator('.out', { hasText: 'Reply from 192.168.1.106: bytes' }).first()).toBeVisible();
  // and it survives a reload
  await page.reload();
  await expect(page.getByTestId('node-SW2')).toBeVisible();
  await expect(page.getByTestId('port-label-l2-b')).toContainText('1/1/12');
});

test('startup: a saved Lab that cannot be opened is never silently overwritten', async ({ page }) => {
  const broken = structuredClone(buildSampleLab());
  broken.name = 'My broken lab';
  broken.devices.find((d) => d.name === 'SW2')!.ifaces[0].name = '1/1/99'; // not a port of this model
  const saved = { activeId: 'broken', entries: [{ id: 'broken', name: broken.name, updatedAt: 1, savedSig: null, lab: broken }] };
  await page.addInitScript((w) => {
    if (!localStorage.getItem('nls.workspace.v2') && !localStorage.getItem('nls.workspace.rejected.v1')) localStorage.setItem('nls.workspace.v2', JSON.stringify(w));
  }, saved);
  await page.goto('/');
  // the app starts on a normal Lab …
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  // … but tells the user, with the name and the reason
  await expect(page.getByTestId('rejected-warning')).toBeVisible();
  await expect(page.getByTestId('rejected-warning')).toContainText('My broken lab');
  await expect(page.getByTestId('rejected-warning')).toContainText('ไม่ได้ลบทิ้ง');
  // the original data is still in the browser, in a separate key, after the autosave has rewritten the workspace
  await page.waitForTimeout(800);
  const stored = await page.evaluate(() => ({
    workspaceNames: JSON.parse(localStorage.getItem('nls.workspace.v2')!).entries.map((e: { name: string }) => e.name),
    kept: JSON.parse(localStorage.getItem('nls.workspace.rejected.v1') || '{"items":[]}').items.map((i: { name: string; entry: { lab: { devices: unknown[] } } }) => [i.name, i.entry.lab.devices.length]),
  }));
  expect(stored.workspaceNames).not.toContain('My broken lab');
  expect(stored.kept).toEqual([['My broken lab', 13]]);
  // it can be downloaded as a file
  const dl = page.waitForEvent('download');
  await page.getByTestId('rejected-download').click();
  const file = await dl;
  expect(file.suggestedFilename()).toBe('nls-recovered-labs.json');
  const bundle = JSON.parse(fs.readFileSync(await file.path(), 'utf8'));
  expect(bundle.items[0].name).toBe('My broken lab');
  expect(bundle.items[0].file.lab.devices).toHaveLength(13);
  // reload: the warning is gone from the workspace's point of view (nothing is rejected any more) but the copy remains
  await page.getByTestId('rejected-dismiss').click();
  await expect(page.getByTestId('rejected-warning')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await expect(page.getByTestId('rejected-warning')).toHaveCount(0);
  const stillKept = await page.evaluate(() => JSON.parse(localStorage.getItem('nls.workspace.rejected.v1')!).items.length);
  expect(stillKept).toBe(1);
});

test('blank canvas: dropping the first devices does not zoom the view to 2x or make nodes overlap', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await page.getByTestId('btn-new').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  await page.waitForTimeout(400); // a person needs more than 60 ms between "New Lab" and the first drag
  if (!(await page.getByTestId('palette-pc').isVisible())) await page.getByTestId('menu-add').click();
  await page.getByTestId('palette-cisco-router').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 150, y: 90 } });
  await expect(page.getByTestId('node-R1')).toBeVisible();
  await page.waitForTimeout(500); // would be after React Flow's fit-view animation
  const first = await page.getByTestId('node-R1').boundingBox();
  // node is 92 css px wide at zoom 1; it used to be 184 px (zoom 2) after the first drop
  expect(first!.width).toBeLessThan(100);
  await page.getByTestId('palette-cisco-switch').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 330, y: 90 } });
  await expect(page.getByTestId('node-SW1')).toBeVisible();
  const second = await page.getByTestId('node-SW1').boundingBox();
  const a = (await page.getByTestId('node-R1').boundingBox())!;
  const overlap = !(a.x + a.width <= second!.x || second!.x + second!.width <= a.x || a.y + a.height <= second!.y || second!.y + second!.height <= a.y);
  expect(overlap).toBe(false);
  // clicking the first node's centre must hit the first node (it used to be covered by the second)
  await page.getByTestId('node-R1').click();
  await page.getByTestId('rtab-details').click();
  await expect(page.getByTestId('device-name')).toHaveValue('R1');
});

test('opening a Lab with a single device does not blow it up either', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await page.getByTestId('btn-new').click();
  if (!(await page.getByTestId('palette-pc').isVisible())) await page.getByTestId('menu-add').click();
  await page.getByTestId('palette-pc').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 300, y: 200 } });
  await page.getByTestId('menu-fit').click();
  await page.waitForTimeout(600);
  const b = (await page.getByTestId('node-PC-01').boundingBox())!;
  expect(b.width).toBeLessThan(92 * 1.3 + 2); // capped at ~1.25x
});
