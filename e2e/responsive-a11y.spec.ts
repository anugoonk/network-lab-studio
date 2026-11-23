import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// UI-05 (SR-WS-15 responsive tiers + SR-WS-16 accessibility): plan §5 layout tiers, drawers, the toolbar "⋯" menu,
// the small-screen note, keyboard reach and accessible names at the five widths of plan §9.

const WIDTHS = [
  [1500, 900, 'wide'], [1280, 800, 'wide'], [1024, 768, 'medium'], [768, 1024, 'narrow'], [390, 844, 'compact'],
] as const;

async function open(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
}

/** the Lab-file controls are inline up to the medium tier and live in the "⋯" menu below it */
async function openFileMenuIfNeeded(page: Page) {
  const more = page.getByTestId('btn-more');
  if (await more.count()) {
    if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click();
    await expect(page.getByTestId('toolbar-more-menu')).toBeVisible();
  }
}

const hScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const box = async (page: Page, testId: string) => (await page.getByTestId(testId).boundingBox())!;
const outline = (page: Page, testId: string) => page.getByTestId(testId).evaluate((el) => `${getComputedStyle(el).outlineStyle} ${getComputedStyle(el).outlineWidth}`);

for (const [w, h, tier] of WIDTHS) {
  test.describe(`${w}×${h} (${tier})`, () => {
    test('no horizontal scroll; every primary control is on screen; the canvas stays usable', async ({ page }) => {
      await open(page, w, h);
      expect(await hScroll(page)).toBeLessThanOrEqual(0);
      await expect(page.locator('.app')).toHaveAttribute('data-tier', tier);
      for (const id of ['tab-lab', 'tab-library', 'tab-manager', 'lang-th', 'lang-en', 'btn-undo', 'btn-redo', 'btn-connect', 'btn-fit', 'toggle-left', 'toggle-right', 'menu-toggle']) {
        const b = await box(page, id);
        expect(b, id).not.toBeNull();
        expect(b.x, id).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, id).toBeLessThanOrEqual(w);
      }
      const canvas = await box(page, 'canvas');
      expect(canvas.width).toBeGreaterThanOrEqual(w >= 1280 ? 400 : 300);
      expect(canvas.x + canvas.width).toBeLessThanOrEqual(w);
      // opening a Lab keeps the page free of horizontal scroll too
      await openFileMenuIfNeeded(page);
      await page.getByTestId('btn-sample2').click();
      await expect(page.getByTestId('lab-name')).toContainText('Inter-VLAN');
      expect(await hScroll(page)).toBeLessThanOrEqual(0);
    });

    test('Lab-file controls are reachable (inline, or through the ⋯ menu) and every toolbar control has an accessible name', async ({ page }) => {
      await open(page, w, h);
      const inlineExpected = tier === 'wide' || tier === 'medium';
      await expect(page.getByTestId('btn-more')).toHaveCount(inlineExpected ? 0 : 1);
      await openFileMenuIfNeeded(page);
      for (const id of ['btn-new', 'btn-sample', 'btn-sample2', 'select-challenge', 'btn-import', 'btn-export']) {
        await expect(page.getByTestId(id), id).toBeVisible();
        const b = await box(page, id);
        expect(b.x + b.width, id).toBeLessThanOrEqual(w);
        expect(b.x, id).toBeGreaterThanOrEqual(0);
      }
      const unnamed = await page.evaluate(() =>
        [...document.querySelectorAll('[role="toolbar"] button, [role="toolbar"] select, .topbar button')]
          .filter((el) => !(el.getAttribute('aria-label') || el.textContent?.trim() || el.getAttribute('title')))
          .map((el) => el.getAttribute('data-testid') ?? el.outerHTML.slice(0, 60)),
      );
      expect(unnamed).toEqual([]);
      // icon-only buttons also carry a tooltip
      if (tier !== 'wide' || w < 1366) {
        for (const id of ['btn-undo', 'btn-redo', 'btn-fit', 'toggle-left', 'toggle-right']) expect(await page.getByTestId(id).getAttribute('title'), id).toBeTruthy();
      }
    });

    test('exactly one top-navigation tab is aria-current and the tabs keep a name when their label is hidden', async ({ page }) => {
      await open(page, w, h);
      await expect(page.locator('.topbar [aria-current="page"]')).toHaveCount(1);
      await expect(page.getByTestId('tab-lab')).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('.topbar').getByRole('button', { name: 'คลังคำสั่ง' })).toHaveCount(1);
      await page.getByTestId('tab-library').click();
      await expect(page.getByTestId('tab-library')).toHaveAttribute('aria-current', 'page');
      expect(await hScroll(page)).toBeLessThanOrEqual(0);
    });
  });
}

test.describe('drawers (plan §5)', () => {
  test('wide: the side panels sit beside the canvas, open by default', async ({ page }) => {
    await open(page, 1280, 800);
    await expect(page.getByTestId('right-tabpanel')).toBeVisible();
    const right = await box(page, 'right-tabpanel');
    const canvas = await box(page, 'canvas');
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(right.x + 1); // never overlapped
  });

  for (const [w, h] of [[1024, 768], [768, 1024], [390, 844]] as const) {
    test(`${w}px: the Inspector is a drawer that starts closed, floats over the canvas, and Esc closes it and returns focus`, async ({ page }) => {
      await open(page, w, h);
      await expect(page.getByTestId('right-tabpanel')).toHaveCount(0);
      const before = await box(page, 'canvas');
      await page.getByTestId('toggle-right').click();
      await expect(page.getByTestId('right-tabpanel')).toBeVisible();
      await expect(page.getByTestId('toggle-right')).toHaveAttribute('aria-pressed', 'true');
      const drawer = await box(page, 'right-tabpanel');
      expect(drawer.x + drawer.width).toBeLessThanOrEqual(w);
      expect(drawer.x).toBeGreaterThanOrEqual(0);
      const after = await box(page, 'canvas');
      expect(after.width).toBe(before.width); // floats over the canvas: the canvas is not squeezed
      expect(await hScroll(page)).toBeLessThanOrEqual(0);
      await page.getByTestId('rtab-inspector').focus();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('right-tabpanel')).toHaveCount(0);
      await expect(page.getByTestId('toggle-right')).toBeFocused();
    });
  }

  test('768px: the left menu is a drawer over the canvas; Esc inside it closes it and returns focus', async ({ page }) => {
    await open(page, 768, 1024);
    const before = await box(page, 'canvas');
    await page.getByTestId('menu-toggle').click();
    await expect(page.getByTestId('menu-toggle')).toHaveAttribute('aria-expanded', 'true');
    const menu = await box(page, 'left-dock');
    expect(menu.width).toBe(56); // the dock keeps its rail width: the expanded menu floats
    expect((await box(page, 'canvas')).width).toBe(before.width);
    await expect.poll(async () => (await page.locator('.dock .menu').boundingBox())!.width, { message: 'the expanded menu reaches its full width (it animates)' }).toBeGreaterThan(200);
    await page.getByTestId('menu-nodes').focus();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('menu-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('toggle-left')).toBeFocused();
  });

  test('Esc with focus on the canvas side does NOT close a drawer (it only closes the drawer that has focus)', async ({ page }) => {
    await open(page, 1024, 768);
    await page.getByTestId('toggle-right').click();
    await page.getByTestId('btn-fit').focus(); // focus is outside the drawer
    await expect(page.getByTestId('btn-fit')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('right-tabpanel')).toBeVisible();
  });

  test('choosing the Inspector Console tab closes the drawer and opens the bottom Console dock (UI-04 behaviour kept)', async ({ page }) => {
    await open(page, 1024, 768);
    await page.getByTestId('toggle-right').click();
    await page.getByTestId('rtab-console').click();
    await expect(page.getByTestId('right-tabpanel')).toHaveCount(0);
    await expect(page.getByTestId('console-dock')).toBeVisible();
  });

  test('the Inspector toggle still works after the Console was opened (double-click a device, then toggle-right)', async ({ page }) => {
    await open(page, 1024, 768);
    await page.getByTestId('node-SW1').dblclick();
    await expect(page.getByTestId('console-input')).toBeVisible();
    await expect(page.getByTestId('right-tabpanel')).toHaveCount(0);
    await page.getByTestId('toggle-right').click();
    await expect(page.getByTestId('right-tabpanel')).toBeVisible();
    await expect(page.getByTestId('rtab-details')).toHaveAttribute('aria-selected', 'true');
    await page.getByTestId('rtab-inspector').click();
    await expect(page.getByTestId('rtab-inspector')).toHaveAttribute('aria-selected', 'true');
  });

  test('focus returns to the ⋯ button after a menu action closes the menu', async ({ page }) => {
    await open(page, 768, 1024);
    await page.getByTestId('btn-more').click();
    await page.getByTestId('btn-sample2').click();
    await expect(page.getByTestId('toolbar-more-menu')).toHaveCount(0);
    await expect(page.getByTestId('btn-more')).toBeFocused();
  });

  test('UI-04 regression at 768px: double-click opens the Console dock; the typed line and history survive switching devices', async ({ page }) => {
    await open(page, 768, 1024);
    await page.getByTestId('node-SW1').dblclick();
    await expect(page.getByTestId('right-tabpanel')).toHaveCount(0); // the drawer did not pop open over the canvas
    await expect(page.getByTestId('console-input')).toBeVisible();
    await page.getByTestId('console-input').fill('show vlan');
    await page.getByTestId('node-SW2').dblclick();
    await page.getByTestId('node-SW1').dblclick();
    await expect(page.getByTestId('console-input')).toHaveValue('show vlan');
    await page.getByTestId('console-input').press('Enter');
    await expect(page.getByTestId('console-log')).toContainText('show vlan');
  });
});

test.describe('toolbar "⋯" menu (narrow and compact)', () => {
  test('opens and closes with its button, Esc (focus returns), an outside click, and after an action', async ({ page }) => {
    await open(page, 768, 1024);
    const more = page.getByTestId('btn-more');
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('btn-export')).toHaveCount(0);
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('toolbar-more-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('toolbar-more-menu')).toHaveCount(0);
    await expect(more).toBeFocused();
    await more.click();
    await page.getByTestId('canvas').click({ position: { x: 640, y: 420 } }); // clear of the floating menu
    await expect(page.getByTestId('toolbar-more-menu')).toHaveCount(0);
    await more.click();
    await page.getByTestId('btn-sample2').click();
    await expect(page.getByTestId('lab-name')).toContainText('Inter-VLAN');
    await expect(page.getByTestId('toolbar-more-menu')).toHaveCount(0);
  });

  test('keyboard: Tab walks the menu items in order and leaves (closing it) after the last one', async ({ page }) => {
    await open(page, 768, 1024);
    await page.getByTestId('btn-more').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('toolbar-more-menu')).toBeVisible();
    for (const id of ['btn-new', 'btn-sample', 'btn-sample2', 'select-challenge', 'btn-import', 'btn-export']) {
      await page.keyboard.press('Tab');
      await expect(page.getByTestId(id), id).toBeFocused();
      expect(await outline(page, id), id).toBe('solid 2px');
    }
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('toolbar-more-menu')).toHaveCount(0);
    await expect(page.getByTestId('btn-connect')).toBeFocused(); // undo / redo are disabled on a fresh Lab, so the next stop is Connect
  });

  test('Export → New → Import round-trip works through the menu at 390px', async ({ page }) => {
    await open(page, 390, 844);
    await openFileMenuIfNeeded(page);
    await page.getByTestId('btn-sample2').click();
    await expect(page.getByTestId('lab-name')).toContainText('Inter-VLAN');
    await openFileMenuIfNeeded(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export').click()]);
    const file = path.join(os.tmpdir(), `nls-ui05-${Date.now()}.json`);
    await download.saveAs(file);
    await openFileMenuIfNeeded(page);
    await page.getByTestId('btn-new').click();
    await expect(page.getByTestId('lab-name')).toHaveText('New Lab');
    await openFileMenuIfNeeded(page);
    await page.getByTestId('btn-import').click({ trial: true });
    await page.getByTestId('import-file').setInputFiles(file);
    await expect(page.getByTestId('lab-name')).toContainText('Inter-VLAN');
    await expect(page.getByTestId('node-PC-A')).toBeVisible();
    fs.rmSync(file, { force: true });
  });
});

test.describe('small screens (< 768px)', () => {
  test('the "best on ≥ 1024px" note shows only below 768px', async ({ page }) => {
    await open(page, 390, 844);
    await expect(page.getByTestId('compact-note')).toContainText('1024');
    await expect(page.getByTestId('compact-note')).toHaveAttribute('role', 'note');
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByTestId('compact-note')).toHaveCount(0);
    await page.setViewportSize({ width: 1500, height: 900 });
    await expect(page.getByTestId('compact-note')).toHaveCount(0);
  });

  test('the note is English in English mode and no Thai text is left on the screen', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('nls.lang', 'en'));
    await open(page, 390, 844);
    await expect(page.getByTestId('compact-note')).toContainText('Best on screens ≥ 1024px');
    const thai = await page.evaluate(() => /[฀-๿]/.test(document.body.innerText));
    expect(thai).toBe(false);
  });

  test('a device is added by tapping its palette card (no drag needed) and Undo removes it', async ({ page }) => {
    await open(page, 390, 844);
    const nodes = page.locator('.react-flow__node');
    const n = await nodes.count();
    await page.getByTestId('palette-pc').scrollIntoViewIfNeeded();
    await page.getByTestId('palette-pc').click();
    await expect(nodes).toHaveCount(n + 1);
    await page.getByTestId('btn-undo').click();
    await expect(nodes).toHaveCount(n);
    expect(await hScroll(page)).toBeLessThanOrEqual(0);
  });

  test('the Console is usable at 390px', async ({ page }) => {
    await open(page, 390, 844);
    await page.getByTestId('node-SW1').dblclick();
    await expect(page.getByTestId('console-input')).toBeVisible();
    const b = await box(page, 'console-input');
    expect(b.x + b.width).toBeLessThanOrEqual(390);
    await page.getByTestId('console-input').fill('show version');
    await page.getByTestId('console-input').press('Enter');
    await expect(page.getByTestId('console-log')).toContainText('show version');
  });
});

test.describe('keyboard and focus (SR-WS-16)', () => {
  test('modal dialog at 768px: takes focus, Tab / Shift+Tab stay inside, Esc closes and returns focus to Connect', async ({ page }) => {
    await open(page, 768, 1024);
    await page.getByTestId('btn-connect').focus();
    await page.keyboard.press('Enter');
    const inDialog = () => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await inDialog()).toBe(true);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await inDialog()).toBe(true);
    }
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(await inDialog()).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('btn-connect')).toBeFocused();
  });

  for (const [w, h] of [[1024, 768], [390, 844]] as const) {
    test(`${w}px: the controls that open drawers show a 2px focus ring and report their state`, async ({ page }) => {
      await open(page, w, h);
      for (const id of ['toggle-left', 'toggle-right', 'btn-fit', 'menu-toggle']) {
        await page.getByTestId(id).focus();
        expect(await outline(page, id), id).toBe('solid 2px');
      }
      await expect(page.getByTestId('toggle-right')).toHaveAttribute('aria-pressed', 'false');
      await expect(page.getByTestId('menu-toggle')).toHaveAttribute('aria-expanded', 'false');
    });
  }

  test('no drawer rule changes anything at ≥1280px: panel widths and the two bars are exactly as before', async ({ page }) => {
    await open(page, 1500, 900);
    expect((await box(page, 'right-tabpanel')).width).toBeGreaterThan(380);
    expect((await page.locator('.toolbar').boundingBox())!.height).toBeLessThanOrEqual(48);
    await expect(page.getByTestId('btn-more')).toHaveCount(0);
    await expect(page.getByTestId('compact-note')).toHaveCount(0);
    await expect(page.getByTestId('btn-sample2').locator('.icon')).toBeHidden(); // text-only, as before UI-05
  });
});
