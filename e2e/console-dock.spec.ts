import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// UI-04 (SR-WS-14): bottom Console dock (always mounted, collapsible, resizable, own localStorage key), Inspector tab badge and
// tabpanel semantics, modal dialogs with autofocus / focus trap / Esc.
// The default page is the Small Office sample (PC-01, PC-02, SW1, SW2 ...); the Inter-VLAN sample has PC-A..PC-D, R1, R2, SW1, SW2.

const DOCK_KEY = 'nls.ui.consoleDock.v1';
const dock = (page: Page) => page.getByTestId('console-dock');
const body = (page: Page) => page.locator('#console-dock-body');
const input = (page: Page) => page.getByTestId('console-input');
const heightOf = async (page: Page) => Math.round((await dock(page).boundingBox())!.height);
const stored = (page: Page) => page.evaluate((k) => localStorage.getItem(k), DOCK_KEY);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
});

test.describe('Console dock', () => {
  test('is mounted but collapsed at first; the toggle expands and collapses it; a single click on a device does not open it', async ({ page }) => {
    await expect(dock(page)).toBeVisible();
    await expect(page.getByTestId('dock-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(body(page)).toBeHidden();
    await expect(body(page)).toHaveCount(1); // mounted, only hidden
    await expect(page.getByTestId('dock-resize')).toHaveCount(0);

    await page.getByTestId('node-PC-01').click();
    await expect(body(page)).toBeHidden(); // selecting does not open the Console

    await page.getByTestId('dock-toggle').click();
    await expect(page.getByTestId('dock-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(body(page)).toBeVisible();
    await expect(page.getByTestId('console')).toContainText('PC-01');
    await expect(page.getByTestId('dock-resize')).toBeVisible();

    await page.getByTestId('dock-toggle').click();
    await expect(page.getByTestId('dock-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(body(page)).toBeHidden();
    await expect(page.getByTestId('dock-resize')).toHaveCount(0);
  });

  test('double-click and the Console tab open it; the right panel only points to it (the Console exists once)', async ({ page }) => {
    await page.getByTestId('node-PC-01').dblclick();
    await expect(body(page)).toBeVisible();
    await expect(page.getByTestId('rtab-console')).toHaveClass(/active/);
    await expect(page.getByTestId('console-redirect')).toBeVisible();
    await expect(page.getByTestId('console')).toHaveCount(1);

    await page.getByTestId('dock-toggle').click(); // collapse
    await expect(body(page)).toBeHidden();
    await page.getByTestId('rtab-inspector').click();
    await page.getByTestId('rtab-console').click(); // the tab opens the dock again
    await expect(body(page)).toBeVisible();
    await expect(page.getByTestId('console')).toContainText('PC-01');
    await expect(page.getByTestId('console')).toHaveCount(1);
  });

  test('the line being typed and the ↑/↓ position survive collapsing, tab switches and device switches (per device)', async ({ page }) => {
    await page.getByTestId('node-PC-01').dblclick();
    for (const l of ['ipconfig', 'arp -a']) {
      await input(page).fill(l);
      await input(page).press('Enter');
    }
    // the history position: ↑ shows the last command; after visiting another device ↑ continues one step further back
    await input(page).press('ArrowUp');
    await expect(input(page)).toHaveValue('arp -a');
    await page.getByTestId('node-SW1').click();
    await expect(page.getByTestId('dock-device')).toContainText('SW1');
    await page.getByTestId('node-PC-01').click();
    await expect(input(page)).toHaveValue('arp -a');
    await input(page).press('ArrowUp');
    await expect(input(page)).toHaveValue('ipconfig'); // (a lost position would have shown 'arp -a' again)

    await input(page).fill('ping 192.168.1.1'); // an unfinished line

    await page.getByTestId('dock-toggle').click(); // collapse ...
    await page.getByTestId('dock-toggle').click(); // ... and expand
    await expect(input(page)).toHaveValue('ping 192.168.1.1');

    await page.getByTestId('rtab-inspector').click();
    await page.getByTestId('rtab-details').click();
    await expect(input(page)).toHaveValue('ping 192.168.1.1');

    // another device has its own (empty) line; this one is kept for when we come back
    await page.getByTestId('node-SW1').click();
    await expect(page.getByTestId('dock-device')).toContainText('SW1');
    await expect(input(page)).toHaveValue('');
    await input(page).fill('show version');
    await page.getByTestId('node-PC-01').click();
    await expect(page.getByTestId('dock-device')).toContainText('PC-01');
    await expect(input(page)).toHaveValue('ping 192.168.1.1');
    await page.getByTestId('node-SW1').click();
    await expect(input(page)).toHaveValue('show version');

    // after Enter the draft is gone: an executed line is not resurrected
    await page.getByTestId('node-PC-01').click();
    await input(page).fill('ipconfig');
    await input(page).press('Enter');
    await expect(input(page)).toHaveValue('');
    await page.getByTestId('node-SW1').click();
    await page.getByTestId('node-PC-01').click();
    await expect(input(page)).toHaveValue(''); // an executed line is not resurrected
    await input(page).press('ArrowUp');
    await expect(input(page)).toHaveValue('ipconfig');
  });

  test('a different Lab does not inherit a typed line (device ids repeat from Lab to Lab)', async ({ page }) => {
    await page.getByTestId('node-PC-01').dblclick();
    await input(page).fill('ping 10.9.8.7');
    await page.getByTestId('btn-sample').click(); // the same sample again: unchanged Lab, replaced without a prompt, same device ids
    await expect(page.getByTestId('node-PC-01')).toBeVisible();
    await page.getByTestId('node-PC-01').dblclick();
    await expect(page.getByTestId('console')).toContainText('PC-01');
    await expect(input(page)).toHaveValue('');
  });

  test('the Console still runs the existing CLI inside the dock', async ({ page }) => {
    await page.getByTestId('node-PC-01').dblclick();
    await input(page).fill('ipconfig');
    await input(page).press('Enter');
    await expect(page.getByTestId('console-log')).toContainText('192.168.1.101');
    await page.getByTestId('node-SW1').dblclick();
    await input(page).fill('show version');
    await input(page).press('Enter');
    await expect(page.getByTestId('console-log')).toContainText('show version');
  });

  test('shares the centre column with the canvas: no overlap, and other devices stay reachable', async ({ page }) => {
    await page.getByTestId('node-PC-01').dblclick();
    await expect(body(page)).toBeVisible();
    const canvas = (await page.getByTestId('canvas').boundingBox())!;
    const d = (await dock(page).boundingBox())!;
    expect(canvas.y + canvas.height).toBeLessThanOrEqual(d.y + 1);
    const palette = (await page.locator('.palette-is-bar').boundingBox())!;
    expect(d.y + d.height).toBeLessThanOrEqual(palette.y + 1);
    await page.getByTestId('node-SW2').dblclick(); // a device that was visible before the dock opened is still reachable
    await expect(page.getByTestId('dock-device')).toContainText('SW2');
    await expect(page.getByTestId('console')).toContainText('SW2');
  });
});

test.describe('Console dock: layout side effects (review findings)', () => {
  test('the left menu dock and its Guide panel keep their own layout (the Console dock must not restyle them)', async ({ page }) => {
    // the sample Lab opens with its Guide panel next to the menu rail
    await expect(page.getByTestId('guide-title')).toBeVisible();
    const left = (await page.getByTestId('left-dock').boundingBox())!;
    const right = (await page.locator('aside.right').boundingBox())!;
    expect(left.height).toBeGreaterThan(right.height - 4); // fills the column like the right panel (it was cut at 60%)
    expect(await page.getByTestId('left-dock').evaluate((el) => getComputedStyle(el).maxHeight)).toBe('none');
    // the Guide is laid out beside the menu rail, not stacked under it, and lies inside the left dock
    const g = (await page.getByTestId('guide-title').boundingBox())!;
    const rail = (await page.locator('[data-testid="left-dock"] nav').first().boundingBox())!;
    expect(g.x).toBeGreaterThanOrEqual(rail.x + rail.width - 1);
    expect(g.y + g.height).toBeLessThanOrEqual(left.y + left.height + 1);
    // and the Console dock is not styled as the menu dock either
    expect(await dock(page).evaluate((el) => getComputedStyle(el).columnGap)).toBe('normal');
  });

  test('inside the dock the input line is in view at the default height, without scrolling', async ({ page }) => {
    await page.getByTestId('node-PC-01').dblclick();
    await expect(page.getByTestId('console-input')).toBeVisible();
    const d = (await dock(page).boundingBox())!;
    const i = (await input(page).boundingBox())!;
    expect(i.y).toBeGreaterThanOrEqual(d.y);
    expect(i.y + i.height).toBeLessThanOrEqual(d.y + d.height + 1);
    await expect(input(page)).toBeInViewport({ ratio: 1 });
    // the Console fits the dock body: the body itself has nothing to scroll (the log scrolls inside it instead)
    const overflow = () => body(page).evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(await overflow()).toBeLessThanOrEqual(1);
    // many lines: only the log scrolls, the dock body still does not, and the input stays where it was
    for (let n = 0; n < 12; n++) {
      await input(page).fill('ipconfig');
      await input(page).press('Enter');
    }
    expect(await overflow()).toBeLessThanOrEqual(1);
    const i2 = (await input(page).boundingBox())!;
    expect(i2.y + i2.height).toBeLessThanOrEqual(d.y + d.height + 1);
  });

  test('"Put in Console" text is applied once: it does not come back after being edited or run', async ({ page }) => {
    await page.getByTestId('tab-library').click();
    await page.getByTestId('lib-vendor').selectOption('pc');
    await page.getByTestId('lib-target').selectOption({ label: 'PC-01 — PC' });
    await page.locator('[data-testid^="lib-insert-pc"]').first().click();
    await expect(page.getByTestId('console')).toContainText('PC-01');
    const inserted = await input(page).inputValue();
    expect(inserted.length).toBeGreaterThan(0);
    await input(page).fill('arp -a'); // edited
    await page.getByTestId('node-SW1').click();
    await page.getByTestId('node-PC-01').click();
    await expect(input(page)).toHaveValue('arp -a'); // the draft, not the library text
    await input(page).press('Enter'); // run it
    await expect(input(page)).toHaveValue('');
    await page.getByTestId('node-SW1').click();
    await page.getByTestId('node-PC-01').click();
    await expect(input(page)).toHaveValue(''); // not resurrected
  });
});

test.describe('Console dock: height', () => {
  test('the keyboard resizes it in steps, within the limits, and aria-valuenow follows', async ({ page }) => {
    await page.getByTestId('dock-toggle').click();
    const sep = page.getByTestId('dock-resize');
    await expect(sep).toHaveAttribute('role', 'separator');
    const h0 = await heightOf(page);
    expect(h0).toBe(240);
    await expect(sep).toHaveAttribute('aria-valuenow', '240');
    await sep.focus();
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => heightOf(page)).toBe(h0 + 24);
    await expect(sep).toHaveAttribute('aria-valuenow', String(h0 + 24));
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => heightOf(page)).toBe(h0 - 24);
    await page.keyboard.press('Home');
    await expect.poll(() => heightOf(page)).toBe(120);
    await page.keyboard.press('End');
    const column = (await page.locator('.center').boundingBox())!.height;
    await expect.poll(() => heightOf(page)).toBeGreaterThan(h0);
    expect(await heightOf(page)).toBeLessThanOrEqual(Math.floor(column * 0.6) + 1); // the canvas always keeps room
    const canvas = (await page.getByTestId('canvas').boundingBox())!;
    expect(canvas.height).toBeGreaterThan(100);
  });

  test('dragging the handle with the mouse changes the height (up = taller), and it never goes below the minimum', async ({ page }) => {
    await page.getByTestId('dock-toggle').click();
    const h0 = await heightOf(page);
    const s = (await page.getByTestId('dock-resize').boundingBox())!;
    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
    await page.mouse.down();
    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2 - 60, { steps: 6 });
    await page.mouse.up();
    await expect.poll(() => heightOf(page)).toBe(h0 + 60);
    const s2 = (await page.getByTestId('dock-resize').boundingBox())!;
    await page.mouse.move(s2.x + s2.width / 2, s2.y + s2.height / 2);
    await page.mouse.down();
    await page.mouse.move(s2.x + s2.width / 2, s2.y + s2.height / 2 + 900, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => heightOf(page)).toBe(120);
  });

  test('open/closed and height are remembered across a reload, under their own key', async ({ page }) => {
    await page.getByTestId('dock-toggle').click();
    await page.getByTestId('dock-resize').focus();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => heightOf(page)).toBe(288);
    expect(JSON.parse((await stored(page))!)).toEqual({ open: true, height: 288 });
    await page.reload();
    await expect(page.getByTestId('node-PC-01')).toBeVisible();
    await expect(page.getByTestId('dock-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(await heightOf(page)).toBe(288);
    await page.getByTestId('dock-toggle').click(); // collapsed is remembered as well
    await page.reload();
    await expect(page.getByTestId('node-PC-01')).toBeVisible();
    await expect(page.getByTestId('dock-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(JSON.parse((await stored(page))!)).toEqual({ open: false, height: 288 });
  });

  test('the preference never enters the Lab: not in the export, not in the Lab storage', async ({ page }) => {
    await page.getByTestId('dock-toggle').click();
    await page.getByTestId('dock-resize').focus();
    await page.keyboard.press('ArrowUp');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export').click()]);
    const file = path.join(os.tmpdir(), `nls-dock-${Date.now()}.json`);
    await download.saveAs(file);
    const text = fs.readFileSync(file, 'utf8');
    expect(JSON.parse(text).lab.devices.length).toBe(13);
    expect(text).not.toMatch(/dock|consoleDock/i);
    const others = await page.evaluate((k) => Object.keys(localStorage).filter((x) => x !== k).map((x) => localStorage.getItem(x) ?? ''), DOCK_KEY);
    expect(others.length).toBeGreaterThan(0); // the Lab is stored elsewhere ...
    for (const v of others) expect(v).not.toMatch(/dockHeight|consoleDock/i); // ... and knows nothing about the dock
    expect(await page.evaluate((k) => Object.keys(localStorage).includes(k), DOCK_KEY)).toBe(true);
  });

  test('a corrupt stored preference is ignored: the dock starts collapsed with the default height', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript((k) => localStorage.setItem(k, '{"open":"maybe","height":"tall"'), DOCK_KEY);
    await page.goto('/');
    await expect(page.getByTestId('node-PC-01')).toBeVisible();
    await expect(page.getByTestId('dock-toggle')).toHaveAttribute('aria-expanded', 'false');
    await page.getByTestId('dock-toggle').click();
    expect(await heightOf(page)).toBe(240);
    await ctx.close();
  });
});

test.describe('Inspector tab', () => {
  test('the badge counts duplicate IPs and native VLAN mismatches, and disappears when there are none', async ({ page }) => {
    await expect(page.getByTestId('inspector-badge')).toHaveCount(0);
    await page.getByTestId('btn-sample2').click();
    await expect(page.getByTestId('lab-name')).toContainText('Inter-VLAN');
    await expect(page.getByTestId('inspector-badge')).toHaveCount(0);

    // native VLAN mismatch on the SW1-SW2 trunk
    await page.getByTestId('node-SW1').dblclick();
    for (const l of ['enable', 'configure terminal', 'interface gi0/2', 'switchport trunk native vlan 99']) {
      await input(page).fill(l);
      await input(page).press('Enter');
    }
    await expect(page.getByTestId('inspector-badge')).toHaveText('1');

    // a duplicate IP in the same VLAN (PC-A and PC-C are both in VLAN 10, reached over the trunk)
    await page.getByTestId('node-PC-C').click();
    await page.getByTestId('rtab-details').click();
    await page.getByTestId('pc-ip').fill('192.168.10.11');
    await page.getByTestId('pc-apply').click();
    await expect(page.getByTestId('inspector-badge')).toHaveText('2');
    await expect(page.getByTestId('inspector-badge')).toHaveAttribute('aria-label', 'คำเตือน 2 รายการ');
    await page.getByTestId('rtab-inspector').click();
    await expect(page.getByTestId('dup-list').locator('li')).toHaveCount(1);
    await expect(page.getByTestId('native-list').locator('li')).toHaveCount(1);

    // fix both: the badge follows
    await page.getByTestId('node-PC-C').click();
    await page.getByTestId('rtab-details').click();
    await page.getByTestId('pc-ip').fill('192.168.10.12');
    await page.getByTestId('pc-apply').click();
    await expect(page.getByTestId('inspector-badge')).toHaveText('1');
    await page.getByTestId('node-SW1').dblclick();
    await input(page).fill('no switchport trunk native vlan');
    await input(page).press('Enter');
    await expect(page.getByTestId('inspector-badge')).toHaveCount(0);
  });

  test('right-panel tabs are a real tablist: aria-controls points at one tabpanel labelled by the selected tab; arrows move between tabs', async ({ page }) => {
    const panel = page.getByTestId('right-tabpanel');
    await expect(panel).toHaveAttribute('role', 'tabpanel');
    await expect(panel).toHaveAttribute('id', 'right-tabpanel');
    await expect(page.getByRole('tablist')).toHaveCount(1);
    for (const k of ['details', 'console', 'inspector']) await expect(page.getByTestId(`rtab-${k}`)).toHaveAttribute('aria-controls', 'right-tabpanel');
    await expect(page.getByTestId('rtab-details')).toHaveAttribute('aria-selected', 'true');
    await expect(panel).toHaveAttribute('aria-labelledby', 'rtab-details-tab');

    await page.getByTestId('rtab-inspector').click();
    await expect(page.getByTestId('rtab-inspector')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('rtab-details')).toHaveAttribute('aria-selected', 'false');
    await expect(panel).toHaveAttribute('aria-labelledby', 'rtab-inspector-tab');
    await expect(page.locator('#rtab-inspector-tab')).toHaveCount(1);

    await page.getByTestId('rtab-details').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('rtab-console')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('rtab-console')).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByTestId('rtab-inspector')).toBeFocused();
    await page.keyboard.press('ArrowRight'); // wraps
    await expect(page.getByTestId('rtab-details')).toBeFocused();
    await expect(page.getByTestId('rtab-details')).toHaveAttribute('aria-selected', 'true');
  });

  test('a device can be selected from the Nodes list with the keyboard', async ({ page }) => {
    await page.getByTestId('menu-nodes').click();
    const row = page.getByTestId('node-row-SW1');
    await row.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('rtab-details')).toHaveClass(/active/);
    await expect(page.getByTestId('device-name')).toHaveValue('SW1');
    await expect(page.getByTestId('dock-device')).toContainText('SW1');
  });
});

test.describe('Modal dialogs: focus, trap, Esc', () => {
  const inDialog = (page: Page) => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));

  test('the Connect dialog takes focus, keeps Tab and Shift+Tab inside, closes with Esc and returns focus', async ({ page }) => {
    await page.getByTestId('btn-connect').focus();
    await page.getByTestId('btn-connect').press('Enter');
    await expect(page.getByTestId('connect-submit')).toBeVisible();
    expect(await inDialog(page)).toBe(true); // autofocus
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab'); // more presses than the dialog has controls: it must wrap, not leave
      expect(await inDialog(page)).toBe(true);
    }
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(await inDialog(page)).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('connect-submit')).toHaveCount(0);
    await expect(page.getByTestId('btn-connect')).toBeFocused();
  });

  test('a key pressed while a dialog is open does not delete the selected device behind it', async ({ page }) => {
    await page.getByTestId('node-PC-01').click();
    await page.getByTestId('btn-connect').click();
    await expect(page.getByTestId('connect-submit')).toBeVisible();
    await page.getByTestId('connect-submit').focus(); // a button: not a text field, so the old rule would have let Delete through
    await page.keyboard.press('Delete');
    await page.keyboard.press('Backspace');
    await expect(page.getByTestId('node-PC-01')).toBeVisible();
    await expect(page.getByTestId('btn-undo')).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('connect-submit')).toHaveCount(0);
    // positive control: with no dialog the same key deletes the selection
    await page.getByTestId('node-PC-01').click();
    await page.keyboard.press('Delete');
    await expect(page.getByTestId('node-PC-01')).toHaveCount(0);
    await expect(page.getByTestId('btn-undo')).toBeEnabled();
  });

  test('"replace current work?" focuses Cancel, and Esc cancels without replacing anything', async ({ page }) => {
    await page.getByTestId('node-PC-01').click();
    await page.keyboard.press('Delete'); // an unexported change
    await expect(page.getByTestId('node-PC-01')).toHaveCount(0);
    await page.getByTestId('btn-new').click();
    await expect(page.getByTestId('confirm-ok')).toBeVisible();
    await expect(page.getByTestId('confirm-cancel')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('confirm-ok')).toHaveCount(0);
    await expect(page.getByTestId('lab-name')).toContainText('Small Office'); // not replaced
    await expect(page.getByTestId('node-SW1')).toBeVisible();
    // positive control: the confirm button still replaces
    await page.getByTestId('btn-new').click();
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('lab-name')).toContainText('New Lab');
  });

  test('the delete-Lab confirmation closes with Esc and keeps the Lab', async ({ page }) => {
    await page.getByTestId('tab-manager').click();
    await page.getByRole('button', { name: /ลบ Small Office/ }).click();
    await expect(page.getByTestId('delete-names')).toBeVisible();
    await expect(page.getByTestId('confirm-delete-cancel')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('delete-names')).toHaveCount(0);
    await expect(page.getByTestId('manager-table').locator('tbody tr')).toHaveCount(1);
  });
});

test.describe('English interface', () => {
  test('the new labels are translated', async ({ page }) => {
    await page.getByTestId('lang-en').click(); // reloads the page in English
    await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('node-PC-01')).toBeVisible();
    await expect(page.getByTestId('dock-toggle')).toHaveAttribute('title', 'Expand Console');
    await page.getByTestId('dock-toggle').click();
    await expect(page.getByTestId('dock-toggle')).toHaveAttribute('title', 'Collapse Console');
    await expect(page.getByTestId('dock-resize')).toHaveAttribute('aria-label', 'Resize Console');
    await expect(dock(page)).toHaveAttribute('aria-label', 'Console (bottom panel)');
    await expect(page.getByTestId('dock-device')).toHaveText('No device selected');
    await page.getByTestId('rtab-console').click();
    await expect(page.getByTestId('console-redirect')).toContainText('bottom of the workspace');
    await expect(page.getByTestId('console-redirect')).not.toContainText(/[฀-๿]/);
    await expect(page.getByRole('tablist')).toHaveAttribute('aria-label', 'Right panel tabs');
  });
});
