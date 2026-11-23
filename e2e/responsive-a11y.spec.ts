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
      for (const id of ['tab-lab', 'tab-library', 'tab-manager', 'lang-th', 'lang-en', 'btn-undo', 'btn-redo', 'btn-connect', 'btn-fit', 'toggle-left', 'toggle-right', ...(tier === 'narrow' || tier === 'compact' ? [] : ['menu-toggle'])]) {
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

  test('768px: no rail; the left menu is a drawer opened from the toolbar, floats over the canvas, and Esc closes it and returns focus', async ({ page }) => {
    await open(page, 768, 1024);
    const before = await box(page, 'canvas');
    await expect(page.getByTestId('menu-toggle')).toBeHidden(); // no 56px rail in this tier
    expect((await box(page, 'left-dock')).width).toBe(0);
    await page.getByTestId('toggle-left').click();
    await expect(page.getByTestId('toggle-left')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('menu-toggle')).toBeVisible();
    await expect.poll(async () => (await page.locator('.dock .menu').boundingBox())!.width, { message: 'the expanded menu reaches its full width (it animates)' }).toBeGreaterThan(200);
    expect((await box(page, 'canvas')).width).toBe(before.width); // floats: the canvas is not squeezed
    expect(await hScroll(page)).toBeLessThanOrEqual(0);
    await page.getByTestId('menu-nodes').focus();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('toggle-left')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('menu-toggle')).toBeHidden();
    await expect(page.getByTestId('toggle-left')).toBeFocused();
  });

  test('1024px keeps the rail: the left menu button is visible and the centre column starts after it', async ({ page }) => {
    await open(page, 1024, 768);
    await expect(page.getByTestId('menu-toggle')).toBeVisible();
    expect((await box(page, 'left-dock')).width).toBe(56);
    expect((await box(page, 'canvas')).x).toBeGreaterThan(60);
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
      for (const id of ['toggle-left', 'toggle-right', 'btn-fit', ...(w >= 1024 ? ['menu-toggle'] : [])]) {
        await page.getByTestId(id).focus();
        expect(await outline(page, id), id).toBe('solid 2px');
      }
      await expect(page.getByTestId('toggle-right')).toHaveAttribute('aria-pressed', 'false');
      if (w >= 1024) await expect(page.getByTestId('menu-toggle')).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByTestId('toggle-left')).toHaveAttribute('aria-pressed', 'false');
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

// ── UI-05 remediation: Console width at 768–1023px (plan §5 "console เต็มความกว้าง") and contrast measured from COMPUTED colours ──
// "Full width" = the whole workspace container (.main): with no rail in this tier nothing sits beside the centre column.

async function openDock(page: Page) {
  const t = page.getByTestId('dock-toggle');
  if ((await t.getAttribute('aria-expanded')) !== 'true') await t.click();
  await expect(page.getByTestId('console-dock')).toHaveClass(/open/);
}
const mainBox = async (page: Page) => (await page.locator('.main').boundingBox())!;

test.describe('Console width (SR-WS-15, plan §5)', () => {
  for (const [w, h] of [[390, 844], [700, 900], [768, 1024], [900, 800], [1023, 768]] as const) {
    test(`${w}px: the open Console dock spans the whole workspace (same x and width as .main), the canvas too, with no overflow`, async ({ page }) => {
      await open(page, w, h);
      await openDock(page);
      const main = await mainBox(page);
      const dock = await box(page, 'console-dock');
      const canvas = await box(page, 'canvas');
      expect(Math.abs(dock.x - main.x), 'dock x').toBeLessThanOrEqual(1);
      expect(Math.abs(dock.width - main.width), `dock width ${dock.width} vs workspace ${main.width}`).toBeLessThanOrEqual(1);
      expect(Math.abs(canvas.width - main.width), 'canvas width').toBeLessThanOrEqual(1);
      expect(dock.x + dock.width).toBeLessThanOrEqual(w);
      expect(await hScroll(page)).toBeLessThanOrEqual(0);
    });
  }

  test('768px: a floating drawer does not change the Console width, and the dock can still be resized with the keyboard', async ({ page }) => {
    await open(page, 768, 1024);
    await openDock(page);
    const before = await box(page, 'console-dock');
    await page.getByTestId('toggle-right').click();
    await expect(page.getByTestId('right-tabpanel')).toBeVisible();
    expect((await box(page, 'console-dock')).width).toBe(before.width);
    await page.getByTestId('toggle-right').click();
    await page.getByTestId('dock-resize').focus();
    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => (await box(page, 'console-dock')).height).toBeGreaterThan(before.height);
  });

  for (const [w, h] of [[1024, 768], [1280, 800], [1500, 900]] as const) {
    test(`${w}px (rail / side panels beside the centre column): the Console is the centre-column width, narrower than the workspace — unchanged`, async ({ page }) => {
      await open(page, w, h);
      await openDock(page);
      const main = await mainBox(page);
      const dock = await box(page, 'console-dock');
      const canvas = await box(page, 'canvas');
      expect(dock.x).toBeGreaterThan(main.x + 50);
      expect(dock.width).toBeLessThan(main.width - 50);
      expect(Math.abs(dock.width - canvas.width)).toBeLessThanOrEqual(1);
    });
  }
});

/** every visible text and every text-input boundary on screen, measured from computed colours (alpha composited over the real backgrounds) */
async function scan(page: Page) {
  return page.evaluate(() => {
    type C = { r: number; g: number; b: number; a: number };
    const parse = (c: string): C | null => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
    };
    const over = (f: C, b: C): C => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
    const bgOf = (el: Element | null): C => {
      const chain: C[] = [];
      for (let e = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c && c.a > 0) { chain.push(c); if (c.a >= 1) break; }
      }
      let base: C = { r: 255, g: 255, b: 255, a: 1 };
      for (const c of chain.reverse()) base = over(c, base);
      return base;
    };
    const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = (c: C) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
    const cr = (a: C, b: C) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const vis = (el: Element) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
    const id = (el: Element) => el.getAttribute('data-testid') ?? el.tagName.toLowerCase() + '.' + String(el.className).trim().split(/\s+/).join('.');
    const text: string[] = [];
    const borders: string[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      if (el.closest('svg') || !vis(el)) continue;
      const cs = getComputedStyle(el);
      const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 0);
      if (own && !(el as HTMLButtonElement).disabled && !el.closest('[disabled]') && el.tagName !== 'OPTION') {
        const bg = bgOf(el);
        const ratio = cr(over(parse(cs.color)!, bg), bg);
        const size = parseFloat(cs.fontSize);
        const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight) >= 700);
        if (ratio < (large ? 3 : 4.5)) text.push(`${id(el)} "${(el.textContent ?? '').trim().slice(0, 20)}" ${ratio.toFixed(2)}:1`);
      }
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && !['hidden', 'checkbox', 'radio', 'file'].includes((el as HTMLInputElement).type)) {
        // a borderless input inside a bordered box (palette / manager search) is judged by that box
        let box: Element = el;
        for (let i = 0; i < 2 && parseFloat(getComputedStyle(box).borderTopWidth) === 0 && box.parentElement; i++) box = box.parentElement;
        const bcs = getComputedStyle(box);
        const outside = bgOf(box.parentElement);
        const bc = parse(bcs.borderTopColor);
        const bRatio = parseFloat(bcs.borderTopWidth) > 0 && bc && bc.a > 0 ? cr(over(bc, outside), outside) : 0;
        const fRatio = cr(bgOf(box), outside);
        if (Math.max(bRatio, fRatio) < 3) borders.push(`${id(el)} border ${bRatio.toFixed(2)}:1 fill ${fRatio.toFixed(2)}:1`);
      }
    }
    return { text, borders };
  });
}

test.describe('Contrast from computed colours (SR-WS-16, plan §3)', () => {
  const expectClean = async (page: Page, where: string) => {
    const r = await scan(page);
    expect(r.text, `${where}: text below its threshold`).toEqual([]);
    expect(r.borders, `${where}: input boundary below 3:1`).toEqual([]);
  };

  test('Lab view: language switch (TH active), toolbar, search, lab-name input, challenge select', async ({ page }) => {
    await open(page, 1500, 900);
    await expectClean(page, 'lab');
  });

  test('English mode: the active EN language button', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('nls.lang', 'en'));
    await open(page, 1500, 900);
    await expect(page.getByTestId('lang-en')).toHaveClass(/active/);
    await expectClean(page, 'lab (EN)');
  });

  test('left menu Add list with a pressed category and the pressed simulation filter (white on the accent fill)', async ({ page }) => {
    await open(page, 1500, 900);
    await page.getByTestId('menu-toggle').click();
    if (!(await page.getByTestId('submenu-add').isVisible())) await page.getByTestId('menu-add').click(); // the Add section may already be open
    await expect(page.getByTestId('submenu-add')).toBeVisible();
    const cat = page.locator('[data-testid="submenu-add"] .palette-cat').nth(1);
    await cat.click();
    await expect(cat).toHaveAttribute('aria-pressed', 'true');
    const sim = page.locator('[data-testid="submenu-add"] .palette-simonly');
    await sim.click();
    await expect(sim).toHaveAttribute('aria-pressed', 'true');
    await expectClean(page, 'menu-add list');
  });

  test('Guide view and Guide editor (the primary "Done" button), Challenge panel', async ({ page }) => {
    await open(page, 1500, 900);
    await page.getByTestId('menu-toggle').click();
    await page.getByTestId('menu-guide').click();
    await expectClean(page, 'guide view');
    await page.getByTestId('guide-edit-toggle').click();
    await expect(page.getByTestId('guide-editor')).toBeVisible();
    await expectClean(page, 'guide editor');
    await page.getByTestId('menu-challenge').click();
    await expectClean(page, 'challenge panel');
  });

  test('Inspector, Connect dialog, Command Library and Lab Manager inputs and selects', async ({ page }) => {
    await open(page, 1500, 900);
    await page.getByTestId('rtab-inspector').click();
    await expectClean(page, 'inspector');
    await page.getByTestId('btn-connect').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectClean(page, 'connect dialog');
    await page.keyboard.press('Escape');
    await page.getByTestId('tab-library').click();
    await expectClean(page, 'library');
    await page.getByTestId('tab-manager').click();
    await expectClean(page, 'manager');
  });

  test('narrow tiers: the open Inspector drawer and the toolbar menu at 768px, the 390px layout', async ({ page }) => {
    await open(page, 768, 1024);
    await page.getByTestId('toggle-right').click();
    await expectClean(page, 'inspector drawer 768');
    await page.getByTestId('btn-more').click();
    await expectClean(page, 'toolbar menu 768');
    await page.setViewportSize({ width: 390, height: 844 });
    await expectClean(page, '390');
  });

  test('keyboard focus is visible inside the Lab Manager search box (the box shows the ring)', async ({ page }) => {
    await open(page, 1500, 900);
    await page.getByTestId('tab-manager').click();
    await page.getByTestId('manager-search').focus();
    const ring = await page.locator('.search-box').evaluate((el) => `${getComputedStyle(el).outlineStyle} ${getComputedStyle(el).outlineWidth}`);
    expect(ring).toBe('solid 2px');
  });
});

// ── review round 2 (remediation): Guide / Challenge below 1024px, focus after choosing them, stale ⋯ menu, selected Nodes row ──
test.describe('Guide and Challenge panels below 1024px', () => {
  for (const [w, h] of [[768, 1024], [1023, 768], [390, 844]] as const) {
    test(`${w}px: Guide opens from the left-panel button at a readable width inside the viewport; focus stays in the app; Esc closes it and returns focus`, async ({ page }) => {
      await open(page, w, h);
      await page.getByTestId('toggle-left').click();
      await page.getByTestId('menu-guide').click();
      await expect(page.getByTestId('guide-panel')).toBeVisible();
      const g = await box(page, 'guide-panel');
      expect(g.width, 'guide width').toBeGreaterThanOrEqual(Math.min(330, w - 20) - 1);
      expect(g.x).toBeGreaterThanOrEqual(0);
      expect(g.x + g.width).toBeLessThanOrEqual(w);
      await expect(page.getByTestId('guide-title')).toBeVisible();
      expect(await hScroll(page)).toBeLessThanOrEqual(0);
      expect(await page.evaluate(() => document.activeElement?.tagName), 'focus is not lost to <body>').not.toBe('BODY');
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('guide-panel')).toHaveCount(0);
      await expect(page.getByTestId('toggle-left')).toBeFocused();
    });

    test(`${w}px: Challenge panel from the menu, and loading a Challenge from the ⋯ menu, are readable and inside the viewport`, async ({ page }) => {
      await open(page, w, h);
      await page.getByTestId('toggle-left').click();
      await page.getByTestId('menu-challenge').click();
      await expect(page.getByTestId('challenge-panel')).toBeVisible();
      let c = await box(page, 'challenge-panel');
      expect(c.width).toBeGreaterThanOrEqual(Math.min(330, w - 20) - 1);
      expect(c.x + c.width).toBeLessThanOrEqual(w);
      await page.getByTestId('toggle-left').click(); // close
      await expect(page.getByTestId('challenge-panel')).toHaveCount(0);
      await openFileMenuIfNeeded(page);
      await page.getByTestId('select-challenge').selectOption({ index: 1 });
      await expect(page.getByTestId('challenge-panel')).toBeVisible(); // a loaded Challenge opens its panel
      c = await box(page, 'challenge-panel');
      expect(c.width).toBeGreaterThanOrEqual(Math.min(330, w - 20) - 1);
      expect(c.x + c.width).toBeLessThanOrEqual(w);
    });
  }

  test('the ⋯ menu left open at 768px does not reappear after the window is widened and narrowed again', async ({ page }) => {
    await open(page, 768, 1024);
    await page.getByTestId('btn-more').click();
    await expect(page.getByTestId('toolbar-more-menu')).toBeVisible();
    await page.setViewportSize({ width: 1300, height: 900 });
    await expect(page.getByTestId('btn-more')).toHaveCount(0);
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByTestId('btn-more')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('toolbar-more-menu')).toHaveCount(0);
  });

  test('Nodes list: the hint of the selected row and the pressed controls on the dark menu keep their contrast (computed)', async ({ page }) => {
    await open(page, 1500, 900);
    await page.getByTestId('menu-toggle').click();
    if (!(await page.getByTestId('submenu-nodes').isVisible())) await page.getByTestId('menu-nodes').click();
    await page.getByTestId('node-row-PC-01').click();
    await expect(page.getByTestId('node-row-PC-01')).toHaveClass(/active/);
    const r = await scan(page);
    expect(r.text).toEqual([]);
  });
});
