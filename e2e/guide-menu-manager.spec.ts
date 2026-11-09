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

test.describe('Lab Guide (editable)', () => {
  test('is shown with the sample lab and can be closed and reopened', async ({ page }) => {
    await expect(page.getByTestId('guide-panel')).toBeVisible();
    await expect(page.getByTestId('guide-title')).toContainText('Small Office');
    await expect(page.getByTestId('guide-objective')).toContainText('uplink');
    await expect(page.getByTestId('guide-view')).toContainText('1/1/24');
    await expect(page.getByTestId('guide-view').locator('code').first()).toBeVisible();
    await page.getByTestId('guide-close').click();
    await expect(page.getByTestId('guide-panel')).toHaveCount(0);
    await page.getByTestId('menu-guide').click();
    await expect(page.getByTestId('guide-panel')).toBeVisible();
  });

  test('instructor can edit title, add a section and a link; changes persist across reload and export', async ({ page }) => {
    await page.getByTestId('guide-edit-toggle').click();
    await page.getByTestId('guide-title-input').fill('Lab ของผู้สอน');
    await page.getByTestId('guide-add-section').click();
    const n = await page.locator('[data-testid^="guide-edit-section-"]').count();
    await page.getByTestId(`guide-section-heading-${n - 1}`).fill('ขั้นตอนใหม่');
    await page.getByTestId(`guide-section-body-${n - 1}`).fill('1. พิมพ์ `show vlan`\n2. **สังเกต** VLAN 10');
    await page.getByTestId('guide-add-resource').click();
    await page.getByTestId('guide-resource-label-0').fill('เอกสารตัวอย่าง');
    await page.getByTestId('guide-resource-url-0').fill('javascript:alert(1)');
    await expect(page.getByTestId('guide-resource-error-0')).toBeVisible();
    await page.getByTestId('guide-resource-url-0').fill('https://example.com/doc');
    await expect(page.getByTestId('guide-resource-error-0')).toHaveCount(0);
    // move the new section up
    await page.getByTestId(`guide-section-up-${n - 1}`).click();
    await expect(page.getByTestId(`guide-section-heading-${n - 2}`)).toHaveValue('ขั้นตอนใหม่');
    await page.getByTestId('guide-edit-toggle').click(); // done

    await expect(page.getByTestId('guide-title')).toHaveText('Lab ของผู้สอน');
    await expect(page.getByTestId(`guide-section-${n - 2}`)).toContainText('ขั้นตอนใหม่');
    await expect(page.getByTestId(`guide-section-${n - 2}`).locator('code')).toHaveText('show vlan');
    await expect(page.getByTestId(`guide-section-${n - 2}`).locator('strong')).toHaveText('สังเกต');
    await expect(page.getByRole('link', { name: 'เอกสารตัวอย่าง' })).toHaveAttribute('href', 'https://example.com/doc');

    // exported file carries the guide
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export').click()]);
    const file = path.join(os.tmpdir(), `nls-guide-${Date.now()}.json`);
    await download.saveAs(file);
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(json.lab.guide.title).toBe('Lab ของผู้สอน');
    expect(json.lab.guide.resources[0].url).toBe('https://example.com/doc');

    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.getByTestId('guide-title')).toHaveText('Lab ของผู้สอน');
  });

  test('a javascript: link is never rendered as a link', async ({ page }) => {
    await page.getByTestId('guide-edit-toggle').click();
    await page.getByTestId('guide-add-resource').click();
    await page.getByTestId('guide-resource-label-0').fill('อันตราย');
    await page.getByTestId('guide-resource-url-0').fill('javascript:alert(1)');
    await page.getByTestId('guide-edit-toggle').click();
    await expect(page.getByRole('link', { name: 'อันตราย' })).toHaveCount(0);
    await expect(page.getByTestId('guide-view')).toContainText('อันตราย');
  });

  test('guide can be deleted and created again on a lab without one', async ({ page }) => {
    await page.getByTestId('guide-edit-toggle').click();
    await page.getByTestId('guide-delete').click();
    await page.getByTestId('guide-delete-confirm').click();
    await expect(page.getByTestId('guide-empty')).toBeVisible();
    await page.getByTestId('guide-create').click();
    await expect(page.getByTestId('guide-editor')).toBeVisible();
    await page.getByTestId('guide-title-input').fill('Guide ใหม่');
    await page.getByTestId('guide-edit-toggle').click();
    await expect(page.getByTestId('guide-title')).toHaveText('Guide ใหม่');
  });

  test('a blank lab has no guide until one is created', async ({ page }) => {
    await page.getByTestId('btn-new').click();
    await expect(page.getByTestId('lab-name')).toContainText('New Lab');
    await expect(page.getByTestId('guide-panel')).toHaveCount(0);
    await page.getByTestId('menu-guide').click();
    await expect(page.getByTestId('guide-empty')).toBeVisible();
  });
});

test.describe('Left menu (icon rail / labelled menu)', () => {
  test('expands, lists nodes, focuses a node, hides labels, shows lab details', async ({ page }) => {
    await page.getByTestId('menu-toggle').click();
    await expect(page.getByTestId('menu-nodes')).toContainText('Nodes (13)');
    await page.getByTestId('menu-nodes').click();
    await page.getByTestId('node-row-PC-03').click();
    await page.getByTestId('rtab-details').click();
    await expect(page.getByTestId('device-name')).toHaveValue('PC-03');

    const labels = page.locator('.port-label');
    expect(await labels.count()).toBeGreaterThan(0);
    await page.getByTestId('menu-hide-labels').click();
    await expect(labels).toHaveCount(0);
    await expect(page.locator('.link-badge')).toHaveCount(0);
    await page.getByTestId('menu-hide-labels').click();
    expect(await labels.count()).toBeGreaterThan(0);

    await page.getByTestId('menu-details').click();
    await expect(page.getByTestId('lab-details')).toBeVisible();
    await page.getByTestId('lab-name-input').fill('Lab ทดสอบ');
    await page.getByTestId('lab-name-input').press('Enter');
    await expect(page.getByTestId('lab-name')).toHaveText('Lab ทดสอบ');
    await page.screenshot({ path: 'test-results/menu-expanded.png' });
  });

  test('works as an icon rail: guide toggle, add object opens the menu', async ({ page }) => {
    const dock = page.getByTestId('left-dock');
    await expect(dock).toHaveClass(/rail/);
    expect((await page.getByTestId('menu-toggle').boundingBox())!.width).toBeLessThan(80);
    await page.getByTestId('menu-add').click();
    await expect(dock).toHaveClass(/expanded/);
    await expect(page.getByTestId('guide-panel')).toHaveCount(0); // menu and guide share the space
    await expect(page.getByTestId('palette-pc')).toBeVisible();
    await page.getByTestId('menu-guide').click();
    await expect(page.getByTestId('guide-panel')).toBeVisible();
    await expect(dock).toHaveClass(/rail/);
  });

  test('Close lab / Lab Manager entries open the Lab Manager', async ({ page }) => {
    await page.getByTestId('menu-close').click();
    await expect(page.getByTestId('manager')).toBeVisible();
    await page.getByTestId('tab-lab').click();
    await page.getByTestId('menu-manager').click();
    await expect(page.getByTestId('manager')).toBeVisible();
  });
});

test.describe('Lab Manager (file manager)', () => {
  const row = (page: Page, name: RegExp | string) => page.getByTestId('manager-table').getByRole('row', { name });
  const rows = (page: Page) => page.getByTestId('manager-table').locator('tbody tr');

  test('lists labs, adds samples as new labs, switches without losing work', async ({ page }) => {
    // break the uplink in the Small Office lab first
    await openConsole(page, 'SW2');
    for (const l of ['configure terminal', 'interface 1/1/24', 'shutdown']) await type(page, l);
    await expect(page.getByTestId('link-status-l2')).toContainText('DOWN');

    await page.getByTestId('tab-manager').click();
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByTestId('lab-active-badge')).toBeVisible();

    // add the Inter-VLAN sample as a NEW lab (the current one is kept)
    await page.getByTestId('manager-new-intervlan').click();
    await expect(page.getByTestId('lab-name')).toContainText('Inter-VLAN');
    await expect(page.getByTestId('node-PC-A')).toBeVisible();
    await expect(page.getByTestId('guide-title')).toContainText('Inter-VLAN');

    await page.getByTestId('tab-manager').click();
    await expect(rows(page)).toHaveCount(2);
    await expect(row(page, /Inter-VLAN/).getByTestId('lab-active-badge')).toBeVisible();
    await expect(row(page, /Small Office/)).toContainText('13 / 12');

    // back to Small Office: the shutdown uplink is still shut
    await row(page, /Small Office/).getByRole('button', { name: 'เปิด', exact: true }).click();
    await expect(page.getByTestId('lab-name')).toContainText('Small Office');
    await expect(page.getByTestId('link-status-l2')).toContainText('DOWN');
    await openConsole(page, 'PC-01');
    await type(page, 'ping 192.168.1.110');
    await expect(log(page)).toContainText('Destination host unreachable');
  });

  test('search, duplicate, delete with confirmation, deleting the open lab', async ({ page }) => {
    await page.getByTestId('tab-manager').click();
    await page.getByTestId('manager-new').click(); // creates a blank lab and opens it
    await expect(page.getByTestId('lab-name')).toContainText('New Lab');
    await page.getByTestId('tab-manager').click();
    await expect(rows(page)).toHaveCount(2);

    await page.getByTestId('manager-search').fill('office');
    await expect(rows(page)).toHaveCount(1);
    await page.getByRole('button', { name: /ทำสำเนา Small Office/ }).click();
    await page.getByTestId('manager-search').fill('');
    await expect(rows(page)).toHaveCount(3);
    await expect(row(page, /\(สำเนา\)/)).toBeVisible();

    // cancel keeps everything
    await page.getByRole('button', { name: /ลบ Small Office.*สำเนา/ }).click();
    await expect(page.getByTestId('delete-names')).toContainText('สำเนา');
    await page.getByTestId('confirm-delete-cancel').click();
    await expect(rows(page)).toHaveCount(3);
    // confirm deletes
    await page.getByRole('button', { name: /ลบ Small Office.*สำเนา/ }).click();
    await page.getByTestId('confirm-delete-ok').click();
    await expect(rows(page)).toHaveCount(2);

    // delete the open (blank) lab → another lab is opened
    await page.getByRole('button', { name: /^ลบ New Lab$/ }).click();
    await page.getByTestId('confirm-delete-ok').click();
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByTestId('lab-name')).toContainText('Small Office');

    // deleting everything leaves a fresh blank lab
    await page.getByLabel('เลือกทั้งหมด').check();
    await page.getByTestId('manager-delete-selected').click();
    await page.getByTestId('confirm-delete-ok').click();
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByTestId('lab-name')).toContainText('New Lab');
  });

  test('import adds a lab to the list; a broken file changes nothing; the list survives a reload', async ({ page }) => {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export').click()]);
    const file = path.join(os.tmpdir(), `nls-mgr-${Date.now()}.json`);
    await download.saveAs(file);
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    json.lab.name = 'Imported Lab';
    fs.writeFileSync(file, JSON.stringify(json));

    await page.getByTestId('tab-manager').click();
    await page.getByTestId('manager-import-file').setInputFiles(file);
    await expect(page.getByTestId('notice')).toContainText('Imported Lab');
    await expect(rows(page)).toHaveCount(2);
    await expect(row(page, /Small Office/).getByTestId('lab-active-badge')).toBeVisible(); // import does not switch labs

    const bad = path.join(os.tmpdir(), `nls-mgr-bad-${Date.now()}.json`);
    fs.writeFileSync(bad, '{"app":"network-lab-studio","schemaVersion":1,"lab":{}}');
    await page.getByTestId('manager-import-file').setInputFiles(bad);
    await expect(page.getByTestId('notice')).toContainText('นำเข้าไม่สำเร็จ');
    await expect(rows(page)).toHaveCount(2);

    await page.waitForTimeout(500);
    await page.reload();
    await page.getByTestId('tab-manager').click();
    await expect(rows(page)).toHaveCount(2);
    await expect(row(page, /Imported Lab/)).toBeVisible();
    await page.screenshot({ path: 'test-results/manager.png' });
  });
});
