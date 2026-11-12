import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// UI-03a: devices added from the palette by click / keyboard get a deterministic, non-overlapping spot near the centre of
// the visible canvas; drag-and-drop keeps placing the device under the cursor.

type Box = { x: number; y: number; width: number; height: number };

async function newBlankLab(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await page.getByTestId('btn-new').click(); // untouched sample -> replaced without a prompt
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  if (!(await page.getByTestId('palette-pc').isVisible())) await page.getByTestId('menu-add').click();
  await expect(page.getByTestId('palette-pc')).toBeVisible();
  await settledCanvas(page);
}

/** the canvas box once the left menu's width transition (.15s) has finished: two equal readings in a row */
async function settledCanvas(page: Page, selector = '.react-flow'): Promise<Box> {
  let prev = '';
  let box: Box | null = null;
  await expect
    .poll(async () => {
      box = await page.locator(selector).boundingBox();
      const cur = JSON.stringify(box);
      const same = cur === prev;
      prev = cur;
      return same;
    }, { intervals: [100, 100, 100, 200, 200, 500] })
    .toBe(true);
  return box!;
}

async function nodeBoxes(page: Page): Promise<Box[]> {
  const nodes = page.locator('.react-flow__node');
  const n = await nodes.count();
  const out: Box[] = [];
  for (let i = 0; i < n; i++) out.push((await nodes.nth(i).boundingBox())!);
  return out;
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
function expectNoOverlap(boxes: Box[]) {
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) expect(overlaps(boxes[i], boxes[j]), `node ${i} overlaps node ${j}`).toBe(false);
}
const insideBox = (outer: Box, b: Box) => b.x >= outer.x - 1 && b.y >= outer.y - 1 && b.x + b.width <= outer.x + outer.width + 1 && b.y + b.height <= outer.y + outer.height + 1;

async function clickAdd(page: Page, kind: string) {
  const before = await page.locator('.react-flow__node').count();
  await page.getByTestId(`palette-${kind}`).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(before + 1);
}

async function exportJson(page: Page) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export').click()]);
  const file = path.join(os.tmpdir(), `nls-place-${Date.now()}-${Math.floor(performance.now())}.json`);
  await download.saveAs(file);
  return { file, json: JSON.parse(fs.readFileSync(file, 'utf8')) };
}

const SEQ = ['cisco-router', 'cisco-switch', 'pc', 'cisco-router', 'cisco-switch', 'pc', 'cisco-router', 'cisco-switch', 'pc'];

test('clicking Router, Switch and PC repeatedly: every device gets its own spot, all visible, same layout every session', async ({ page, browser }) => {
  await newBlankLab(page);
  const canvas = await settledCanvas(page);
  for (const k of SEQ) await clickAdd(page, k);
  const boxes = await nodeBoxes(page);
  expect(boxes).toHaveLength(9);
  expectNoOverlap(boxes);
  for (const b of boxes) expect(insideBox(canvas, b)).toBe(true);
  // the first device sits at the centre of the visible canvas
  const first = (await page.getByTestId('node-R1').boundingBox())!;
  expect(Math.abs(first.x + first.width / 2 - (canvas.x + canvas.width / 2))).toBeLessThanOrEqual(2);
  expect(Math.abs(first.y + first.height / 2 - (canvas.y + canvas.height / 2))).toBeLessThanOrEqual(30);
  // keyboard activation uses the same placement
  await page.getByTestId('palette-pc').press('Enter');
  await expect(page.locator('.react-flow__node')).toHaveCount(10);
  expectNoOverlap(await nodeBoxes(page));

  const a = await exportJson(page);
  fs.rmSync(a.file, { force: true });
  const layoutA = a.json.lab.devices.map((d: { id: string; name: string; x: number; y: number }) => [d.id, d.name, d.x, d.y]);
  expect(layoutA.map((r: unknown[]) => r[0])).toEqual(['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10']);

  // a brand-new browser session doing the same clicks gets exactly the same positions (no randomness)
  const ctx = await browser.newContext({ viewport: page.viewportSize()! });
  const p2 = await ctx.newPage();
  await newBlankLab(p2);
  for (const k of SEQ) await clickAdd(p2, k);
  await p2.getByTestId('palette-pc').press('Enter');
  await expect(p2.locator('.react-flow__node')).toHaveCount(10);
  const b = await exportJson(p2);
  fs.rmSync(b.file, { force: true });
  expect(b.json.lab.devices.map((d: { id: string; name: string; x: number; y: number }) => [d.id, d.name, d.x, d.y])).toEqual(layoutA);
  await ctx.close();
});

test('after zooming and panning, clicked devices land inside the visible canvas without overlapping', async ({ page }) => {
  await newBlankLab(page);
  const canvas = await settledCanvas(page);
  await clickAdd(page, 'pc');

  // zoom out twice, then pan by dragging the empty pane
  await page.locator('.react-flow__controls-zoomout').click();
  await page.locator('.react-flow__controls-zoomout').click();
  await expect.poll(async () => page.locator('.react-flow__viewport').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)).toBeLessThan(0.9);
  await page.mouse.move(canvas.x + 60, canvas.y + 60);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 260, canvas.y + 160, { steps: 8 });
  await page.mouse.up();
  for (const k of ['cisco-switch', 'cisco-switch', 'cisco-router', 'pc']) await clickAdd(page, k);
  let boxes = await nodeBoxes(page);
  expectNoOverlap(boxes);
  for (const b of boxes.slice(1)) expect(insideBox(canvas, b), 'new device is visible after zoom-out + pan').toBe(true);

  // zoom in well past 1x: the visible area is small, new devices must still be visible and not overlap
  for (let i = 0; i < 5; i++) await page.locator('.react-flow__controls-zoomin').click();
  await expect.poll(async () => page.locator('.react-flow__viewport').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)).toBeGreaterThan(1.2);
  for (const k of ['pc', 'pc', 'cisco-router']) {
    await clickAdd(page, k);
    const last = page.locator('.react-flow__node').last();
    await expect.poll(async () => insideBox(canvas, (await last.boundingBox())!), { message: 'newest device is in view' }).toBe(true);
  }
  boxes = await nodeBoxes(page);
  expect(boxes).toHaveLength(8);
  expectNoOverlap(boxes);
});

test('undo after a palette click removes only that device; redo brings it back at the same spot', async ({ page }) => {
  await newBlankLab(page);
  await clickAdd(page, 'cisco-router');
  await clickAdd(page, 'cisco-switch');
  const r1 = (await page.getByTestId('node-R1').boundingBox())!;
  const sw1 = (await page.getByTestId('node-SW1').boundingBox())!;
  await page.getByTestId('btn-undo').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await expect(page.getByTestId('node-SW1')).toHaveCount(0);
  expect(await page.getByTestId('node-R1').boundingBox()).toEqual(r1);
  await page.getByTestId('btn-redo').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  expect(await page.getByTestId('node-SW1').boundingBox()).toEqual(sw1);
  expect(await page.getByTestId('node-R1').boundingBox()).toEqual(r1);
  // the next click after undo/redo still avoids both devices
  await clickAdd(page, 'pc');
  expectNoOverlap(await nodeBoxes(page));
});

test('drag-and-drop is unchanged: the device is placed under the cursor, even on top of another one', async ({ page }) => {
  await newBlankLab(page);
  const canvas = await settledCanvas(page, '[data-testid="canvas"]');
  await page.getByTestId('palette-cisco-switch').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 300, y: 250 } });
  const sw1 = (await page.getByTestId('node-SW1').boundingBox())!;
  // Canvas.onDrop: top-left = cursor - (45, 40) at zoom 1 (≤ 4px: the canvas wrapper's 3px frame + sub-pixel rounding)
  expect(Math.abs(sw1.x - (canvas.x + 300 - 45))).toBeLessThanOrEqual(4);
  expect(Math.abs(sw1.y - (canvas.y + 250 - 40))).toBeLessThanOrEqual(4);
  await page.getByTestId('palette-cisco-switch').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 300, y: 250 } });
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  const sw2 = (await page.getByTestId('node-SW2').boundingBox())!;
  expect(Math.abs(sw2.x - sw1.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(sw2.y - sw1.y)).toBeLessThanOrEqual(1);
});

test('export → import keeps click-placed devices: same ids, names, positions and schema', async ({ page }) => {
  await newBlankLab(page);
  for (const k of ['cisco-router', 'cisco-switch', 'pc']) await clickAdd(page, k);
  const { file, json } = await exportJson(page);
  expect(json.schemaVersion).toBe(1);
  const devs = json.lab.devices.map((d: { id: string; name: string; x: number; y: number }) => ({ id: d.id, name: d.name, x: d.x, y: d.y }));
  expect(devs.map((d: { id: string }) => d.id)).toEqual(['d1', 'd2', 'd3']);
  for (const d of devs) expect(Number.isInteger(d.x) && Number.isInteger(d.y)).toBe(true);

  await page.getByTestId('btn-new').click(); // exported -> no prompt
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  await page.getByTestId('import-file').setInputFiles(file);
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  const again = await exportJson(page);
  expect(again.json.lab.devices.map((d: { id: string; name: string; x: number; y: number }) => ({ id: d.id, name: d.name, x: d.x, y: d.y }))).toEqual(devs);
  fs.rmSync(file, { force: true });
  fs.rmSync(again.file, { force: true });
});
