import { expect, test, type Page } from '@playwright/test';

// UI-02: Device Palette visible by default (bar under the canvas), search, categories, add by click / keyboard / drag.

type Box = { x: number; y: number; width: number; height: number };
const ALL = ['cisco-router', 'isp-router', 'cisco-switch', 'aruba-switch', 'l3-switch', 'pc', 'laptop', 'server', 'wireless-ap', 'firewall'];

async function open(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
}
const bar = (page: Page) => page.getByTestId('device-bar');
const items = (page: Page) => page.locator('[data-testid^="palette-"]:not([data-testid^="palette-group"])');
const visibleKinds = async (page: Page) => (await items(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('palette-'.length))));
const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('palette is visible right away (no "Add a device" click), under the canvas, not covering it', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('left-dock')).toHaveClass(/rail/); // the Lab Guide is still the default left panel
  await expect(page.getByTestId('guide-panel')).toBeVisible();
  await expect(bar(page)).toBeVisible();
  await expect(page.getByTestId('device-search')).toBeVisible();
  expect(await visibleKinds(page)).toEqual(ALL);
  const c = (await page.getByTestId('canvas').boundingBox())!;
  const b = (await bar(page).boundingBox())!;
  expect(b.y).toBeGreaterThanOrEqual(c.y + c.height); // below, never on top of the canvas
  expect(b.height).toBeLessThanOrEqual(100);
  // opening "Add a device" moves the palette into the left menu (one palette on screen), closing it brings the bar back
  await page.getByTestId('menu-add').click();
  await expect(page.getByTestId('device-list')).toBeVisible();
  await expect(bar(page)).toHaveCount(0);
  await expect(items(page)).toHaveCount(10);
  await page.getByTestId('menu-add').click();
  await expect(bar(page)).toBeVisible();
});

test('search by name, model and category; no-result state; clear', async ({ page }) => {
  await open(page);
  const search = page.getByTestId('device-search');
  await search.fill('  ARUBA ');
  expect(await visibleKinds(page)).toEqual(['aruba-switch', 'l3-switch']);
  await search.fill('2960'); // model
  expect(await visibleKinds(page)).toEqual(['cisco-switch']);
  await search.fill('เราเตอร์'); // category (Thai)
  expect(await visibleKinds(page)).toEqual(['cisco-router', 'isp-router']);
  await search.fill('juniper');
  await expect(page.getByTestId('device-empty')).toContainText('juniper');
  await expect(items(page)).toHaveCount(0);
  await page.getByTestId('device-empty-clear').click();
  await expect(search).toHaveValue('');
  await expect(items(page)).toHaveCount(10);
  await search.fill('pc');
  await page.getByTestId('device-search-clear').click();
  await expect(items(page)).toHaveCount(10);
  await search.fill('server');
  await search.press('Escape');
  await expect(search).toHaveValue('');
  // the search never touches the Lab
  await expect(page.locator('.react-flow__node')).toHaveCount(13);
});

test('category filter (and the search text follows the palette into the left menu)', async ({ page }) => {
  await open(page);
  await page.getByTestId('device-cat-switches').click();
  await expect(page.getByTestId('device-cat-switches')).toHaveAttribute('aria-pressed', 'true');
  expect(await visibleKinds(page)).toEqual(['cisco-switch', 'aruba-switch', 'l3-switch']);
  await page.getByTestId('device-cat-end').click();
  expect(await visibleKinds(page)).toEqual(['pc', 'laptop', 'server']);
  await page.getByTestId('device-cat-other').click();
  expect(await visibleKinds(page)).toEqual(['wireless-ap', 'firewall']);
  await page.getByTestId('device-cat-routers').click();
  await page.getByTestId('device-search').fill('isp');
  expect(await visibleKinds(page)).toEqual(['isp-router']);
  await page.getByTestId('menu-add').click();
  await expect(page.getByTestId('device-search')).toHaveValue('isp');
  expect(await visibleKinds(page)).toEqual(['isp-router']);
  await page.getByTestId('device-cat-all').click();
  await page.getByTestId('device-search').fill('');
  expect(await visibleKinds(page)).toEqual(ALL);
});

test('click, keyboard and drag add devices; click-added devices do not overlap; ids stay sequential', async ({ page }) => {
  await open(page);
  await page.getByTestId('btn-new').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  await page.getByTestId('menu-add').click(); // blank Lab opens with the list; close it to use the bar
  await expect(bar(page)).toBeVisible();
  await page.getByTestId('palette-cisco-router').click();
  await page.getByTestId('palette-cisco-switch').click();
  await page.getByTestId('palette-pc').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('palette-laptop').focus();
  await page.keyboard.press(' ');
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  for (const n of ['R1', 'SW1', 'PC-01', 'LAP-01']) await expect(page.getByTestId(`node-${n}`)).toBeVisible();
  const boxes: Box[] = [];
  for (let i = 0; i < 4; i++) boxes.push((await page.locator('.react-flow__node').nth(i).boundingBox())!);
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(overlap(boxes[i], boxes[j])).toBe(false);
  // drag from the bar: dropped under the cursor (as before)
  const c = (await page.getByTestId('canvas').boundingBox())!;
  await page.getByTestId('palette-server').dragTo(page.getByTestId('canvas'), { targetPosition: { x: 120, y: 120 } });
  await expect(page.locator('.react-flow__node')).toHaveCount(5);
  const srv = (await page.getByTestId('node-SRV-01').boundingBox())!;
  expect(Math.abs(srv.x - (c.x + 120 - 45))).toBeLessThanOrEqual(4);
  // undo removes the dragged device only
  await page.getByTestId('btn-undo').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
});

test('TH / EN labels of the palette and the left menu', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('device-cat-all')).toHaveText('ทั้งหมด');
  await expect(page.getByTestId('device-cat-routers')).toHaveText('เราเตอร์');
  await expect(page.getByTestId('device-search')).toHaveAttribute('placeholder', 'ค้นหา: ชื่อ รุ่น หรือหมวด');
  await expect(page.getByTestId('menu-add')).toHaveAttribute('aria-label', 'เพิ่มอุปกรณ์');
  await expect(page.getByTestId('btn-sample2')).toHaveText('ตัวอย่าง: Inter-VLAN');
  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('device-cat-all')).toHaveText('All');
  await expect(page.getByTestId('device-cat-switches')).toHaveText('Switches');
  await expect(page.getByTestId('device-cat-end')).toHaveText('End devices');
  await expect(page.getByTestId('device-search')).toHaveAttribute('placeholder', 'Search: name, model or category');
  await expect(page.getByTestId('menu-add')).toHaveAttribute('aria-label', 'Add a device');
  await expect(page.getByTestId('menu-fit')).toHaveAttribute('aria-label', 'Fit view');
  await expect(page.getByTestId('btn-sample2')).toHaveText('Sample: Inter-VLAN');
  await page.getByTestId('device-search').fill('nothing-here');
  await expect(page.getByTestId('device-empty')).toContainText('No device matches');
  const thai = await page.evaluate(() => {
    const re = /[฀-๿]/;
    const roots = [document.querySelector('[data-testid="device-bar"]'), document.querySelector('[data-testid="left-dock"] .menu')];
    const bad: string[] = [];
    for (const r of roots) {
      if (!r) continue;
      if (re.test((r as HTMLElement).innerText)) bad.push((r as HTMLElement).innerText.slice(0, 80));
      for (const el of Array.from(r.querySelectorAll('*'))) for (const a of ['title', 'aria-label', 'placeholder']) if (re.test(el.getAttribute(a) ?? '')) bad.push(`${a}: ${el.getAttribute(a)}`);
    }
    return bad;
  });
  expect(thai).toEqual([]);
});

test('left panel collapse/expand keeps the palette available', async ({ page }) => {
  await open(page);
  const w0 = (await bar(page).boundingBox())!.width;
  await page.getByTestId('toggle-left').click(); // Lab Guide closes
  await expect(page.getByTestId('guide-panel')).toHaveCount(0);
  await expect(bar(page)).toBeVisible();
  await expect.poll(async () => (await bar(page).boundingBox())!.width).toBeGreaterThan(w0 + 200);
  await page.getByTestId('toggle-left').click(); // the menu opens with the palette list
  await expect(page.getByTestId('device-list')).toBeVisible();
  await expect(page.getByTestId('palette-pc')).toBeVisible();
});

for (const [w, h] of [[1920, 1080], [1500, 900], [1366, 768], [1280, 720]] as const) {
  test(`desktop ${w}×${h}: palette bar on screen, below the canvas, no horizontal page scroll`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await open(page);
    const b = (await bar(page).boundingBox())!;
    const c = (await page.getByTestId('canvas').boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(h);
    expect(b.x + b.width).toBeLessThanOrEqual(w);
    expect(b.y).toBeGreaterThanOrEqual(c.y + c.height);
    expect(c.height).toBeGreaterThan(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
    await expect(page.getByTestId('device-search')).toBeInViewport();
    await expect(page.getByTestId('palette-cisco-router')).toBeInViewport();
  });
}
