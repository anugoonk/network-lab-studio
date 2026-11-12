import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// UI-01: top navigation, grouped toolbar, design tokens and the three-panel workspace.

async function open(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
}

async function english(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('lang-seeded')) {
      sessionStorage.setItem('lang-seeded', '1');
      localStorage.setItem('nls.lang', 'en');
    }
  });
}

const viewportTransform = (page: Page) => page.locator('.react-flow__viewport').evaluate((el) => getComputedStyle(el).transform);

async function settledWidth(page: Page, testId: string) {
  let prev = -1;
  let w = 0;
  await expect
    .poll(async () => {
      w = (await page.getByTestId(testId).boundingBox())?.width ?? 0;
      const same = w === prev;
      prev = w;
      return same;
    }, { intervals: [100, 100, 100, 200, 300] })
    .toBe(true);
  return w;
}

test('navigation: one active view (aria-current), switching views keeps the canvas viewport and the lab', async ({ page }) => {
  await open(page);
  const nav = page.getByRole('navigation', { name: 'เมนูหลัก' });
  await expect(nav.getByRole('button')).toHaveCount(3);
  await expect(page.getByTestId('tab-lab')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('tab-lab')).toHaveClass(/active/);
  await expect(page.getByTestId('tab-library')).not.toHaveAttribute('aria-current', /.*/);
  const before = await viewportTransform(page);
  const nodes = await page.locator('.react-flow__node').count();

  await page.getByTestId('tab-library').click();
  await expect(page.getByTestId('tab-library')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('tab-lab')).not.toHaveAttribute('aria-current', /.*/);
  await expect(page.getByTestId('canvas')).toBeHidden();
  await expect(page.getByTestId('btn-fit')).toHaveCount(0); // view-only actions are lab-only, as before
  await expect(page.getByTestId('btn-new')).toBeVisible(); // file actions stay available everywhere, as before

  await page.getByTestId('tab-manager').click();
  await expect(page.getByTestId('tab-manager')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('lab-name')).toHaveText('Small Office – Cisco & Aruba');

  await page.getByTestId('tab-lab').click();
  await expect(page.getByTestId('canvas')).toBeVisible();
  expect(await viewportTransform(page)).toBe(before);
  await expect(page.locator('.react-flow__node')).toHaveCount(nodes);
});

test('toolbar: actions are grouped (Lab file · Edit · Network · View) and keep their behaviour', async ({ page }) => {
  await open(page);
  const bar = page.getByRole('toolbar', { name: 'แถบเครื่องมือ Lab' });
  const groups: [string, string[]][] = [
    ['ไฟล์ Lab', ['btn-new', 'btn-sample', 'btn-sample2', 'select-challenge', 'btn-import', 'btn-export']],
    ['แก้ไข', ['btn-undo', 'btn-redo']],
    ['เครือข่าย', ['btn-connect']],
    ['มุมมอง', ['btn-fit', 'toggle-left', 'toggle-right']],
  ];
  await expect(bar.getByRole('group')).toHaveCount(4);
  for (const [name, ids] of groups) {
    const g = bar.getByRole('group', { name, exact: true });
    for (const id of ids) await expect(g.getByTestId(id)).toHaveCount(1);
  }

  // Edit: disabled until there is something to undo; button and Ctrl+Z / Ctrl+Y both work
  await expect(page.getByTestId('btn-undo')).toBeDisabled();
  await page.getByTestId('node-PC-01').click();
  await page.getByTestId('delete-device').click();
  await expect(page.getByTestId('node-PC-01')).toHaveCount(0);
  await expect(page.getByTestId('btn-undo')).toBeEnabled();
  await page.getByTestId('btn-undo').click();
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await page.keyboard.press('Control+y');
  await expect(page.getByTestId('node-PC-01')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();

  // Network: the connect dialog opens
  await page.getByTestId('btn-connect').click();
  await expect(page.getByTestId('connect-submit')).toBeVisible();
  await page.getByRole('button', { name: 'ยกเลิก' }).click();

  // Lab file: the status chip follows the export state; challenge select opens a challenge
  await expect(page.locator('.status-chip.dirty')).toHaveCount(0); // undo brought the Lab back to how it was opened
  await page.getByTestId('node-PC-02').click();
  await page.getByTestId('delete-device').click();
  await expect(page.locator('.status-chip.dirty')).toBeVisible(); // a real edit that is not exported yet
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export').click()]);
  const file = path.join(os.tmpdir(), `nls-ui01-${Date.now()}.json`);
  await download.saveAs(file);
  await expect(page.locator('.status-chip.dirty')).toHaveCount(0);
  await expect(page.locator('.status-chip.saved')).toBeVisible();
  await page.getByTestId('btn-new').click();
  await expect(page.getByTestId('lab-name')).toHaveText('New Lab');
  await page.getByTestId('btn-import').click({ trial: true });
  await page.getByTestId('import-file').setInputFiles(file);
  await expect(page.getByTestId('lab-name')).toHaveText('Small Office – Cisco & Aruba');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  fs.rmSync(file, { force: true });
  await page.getByTestId('select-challenge').selectOption({ index: 1 });
  await expect(page.getByTestId('challenge-panel')).toBeVisible();
});

test('language: Thai labels in Thai mode, English labels in English mode (technical names unchanged)', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('tab-lab')).toHaveText('พื้นที่ทำงาน Lab');
  await expect(page.getByTestId('tab-library')).toHaveText('คลังคำสั่ง');
  await expect(page.getByTestId('tab-manager')).toHaveText('จัดการ Lab');
  await expect(page.getByTestId('btn-new')).toHaveText('Lab ใหม่');
  await expect(page.getByTestId('btn-sample')).toHaveText('เปิด Lab ตัวอย่าง');
  await expect(page.getByTestId('btn-import')).toHaveText('นำเข้า');
  await expect(page.getByTestId('btn-export')).toHaveText('ส่งออก');
  await expect(page.getByTestId('btn-connect')).toHaveText('เชื่อมสาย');
  await expect(page.getByRole('toolbar').getByRole('button', { name: 'ย้อนกลับ', exact: true })).toHaveCount(1);

  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('tab-lab')).toHaveText('Lab Workspace');
  await expect(page.getByTestId('tab-library')).toHaveText('Command Library');
  await expect(page.getByTestId('tab-manager')).toHaveText('Lab Manager');
  await expect(page.getByTestId('btn-new')).toHaveText('New Lab');
  await expect(page.getByTestId('btn-sample')).toHaveText('Open Sample Lab');
  await expect(page.getByTestId('btn-sample2')).toHaveText('Sample: Inter-VLAN');
  await expect(page.getByTestId('btn-import')).toHaveText('Import');
  await expect(page.getByTestId('btn-export')).toHaveText('Export');
  await expect(page.getByTestId('btn-connect')).toHaveText('Connect cable');
  const bar = page.getByRole('toolbar', { name: 'Lab toolbar' });
  await expect(bar).toBeVisible();
  for (const name of ['Undo', 'Redo', 'Fit view', 'Left panel', 'Right panel']) await expect(bar.getByRole('button', { name, exact: true })).toHaveCount(1);
  const thai = await page.evaluate(() => {
    const re = /[฀-๿]/;
    const roots = [document.querySelector('.topbar'), document.querySelector('.toolbar')];
    const bad: string[] = [];
    for (const r of roots) {
      if (!r) continue;
      if (re.test((r as HTMLElement).innerText)) bad.push((r as HTMLElement).innerText);
      for (const el of Array.from(r.querySelectorAll('*')).filter((e) => !e.closest('.lang-switch')))
        for (const a of ['title', 'aria-label']) if (re.test(el.getAttribute(a) ?? '')) bad.push(`${a}: ${el.getAttribute(a)}`);
    }
    return bad;
  });
  expect(thai).toEqual([]);
});

test('panels collapse and expand; the canvas resizes and keeps its zoom; Console output survives', async ({ page }) => {
  await open(page);
  // console with some output, then collapse/expand the right panel
  await page.getByTestId('node-PC-01').dblclick();
  await expect(page.getByTestId('console')).toContainText('PC-01');
  await page.getByTestId('console-input').fill('ipconfig');
  await page.getByTestId('console-input').press('Enter');
  await expect(page.getByTestId('console-log')).toContainText('192.168.1.101');

  const w0 = await settledWidth(page, 'canvas');
  const scale = async () => (await viewportTransform(page)).match(/matrix\(([^,]+)/)?.[1];
  const s0 = await scale();
  await expect(page.getByTestId('toggle-right')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('toggle-right').click();
  await expect(page.getByTestId('toggle-right')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('rtab-console')).toHaveCount(0);
  const w1 = await settledWidth(page, 'canvas');
  expect(w1).toBeGreaterThan(w0 + 300);
  await page.getByTestId('toggle-left').click();
  await expect(page.getByTestId('toggle-left')).toHaveAttribute('aria-pressed', 'false');
  const w2 = await settledWidth(page, 'canvas');
  expect(w2).toBeGreaterThan(w1 + 200);
  expect(await scale()).toBe(s0); // collapsing panels does not re-zoom the canvas
  await expect(page.getByTestId('node-PC-01')).toBeVisible();

  await page.getByTestId('toggle-left').click();
  await page.getByTestId('toggle-right').click();
  await expect(page.getByTestId('toggle-left')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('toggle-right')).toHaveAttribute('aria-pressed', 'true');
  // re-opening the left side shows the menu (toggleLeft's existing behaviour), the right panel comes back at its width
  const w3 = await settledWidth(page, 'canvas');
  expect(w3).toBeLessThan(w1);
  expect(w3).toBeGreaterThanOrEqual(w0);
  await page.getByTestId('rtab-console').click();
  await expect(page.getByTestId('console-log')).toContainText('192.168.1.101'); // transcript kept in the store
});

test('device selection and console access from the canvas', async ({ page }) => {
  await open(page);
  await page.getByTestId('node-SW1').click();
  await expect(page.getByTestId('rtab-details')).toHaveClass(/active/);
  await expect(page.getByTestId('device-name')).toHaveValue('SW1');
  await page.getByTestId('node-SW2').dblclick();
  await expect(page.getByTestId('rtab-console')).toHaveClass(/active/);
  await expect(page.getByTestId('console')).toContainText('SW2');
  await page.getByTestId('console-input').fill('show version');
  await page.getByTestId('console-input').press('Enter');
  await expect(page.getByTestId('console-log')).toContainText('show version');
});

for (const [w, h] of [[1500, 900], [1366, 768], [1280, 800]] as const) {
  test(`desktop layout ${w}×${h}: one-row bars, every toolbar control on screen, no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await open(page);
    const top = (await page.locator('.topbar').boundingBox())!;
    const bar = (await page.locator('.toolbar').boundingBox())!;
    expect(top.height).toBeLessThanOrEqual(48);
    expect(bar.height).toBeLessThanOrEqual(48); // a single row
    expect(bar.y).toBeGreaterThanOrEqual(top.y + top.height - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
    for (const id of ['btn-new', 'btn-sample', 'btn-sample2', 'select-challenge', 'btn-import', 'btn-export', 'btn-undo', 'btn-redo', 'btn-connect', 'btn-fit', 'toggle-left', 'toggle-right', 'lang-th', 'lang-en', 'tab-lab', 'tab-library', 'tab-manager']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b, id).not.toBeNull();
      expect(b.x + b.width, id).toBeLessThanOrEqual(w);
    }
    const canvas = (await page.getByTestId('canvas').boundingBox())!;
    expect(canvas.y).toBeLessThan(110); // the workspace starts right under the two bars
    expect(canvas.height).toBeGreaterThan(h - 130);
    // icon-only buttons on narrower screens still have their names
    const tb = page.getByRole('toolbar', { name: 'แถบเครื่องมือ Lab' });
    for (const name of ['ย้อนกลับ', 'ทำซ้ำ', 'พอดีจอ', 'แผงซ้าย', 'แผงขวา']) await expect(tb.getByRole('button', { name, exact: true })).toBeVisible();
  });
}

test('keyboard: toolbar controls are reachable with Tab and show a focus ring', async ({ page }) => {
  await open(page);
  await page.getByTestId('btn-new').focus();
  await expect(page.getByTestId('btn-new')).toBeFocused();
  const outline = await page.getByTestId('btn-new').evaluate((el) => getComputedStyle(el).outlineStyle + ' ' + getComputedStyle(el).outlineWidth);
  expect(outline).toBe('solid 2px');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('btn-sample')).toBeFocused();
});
