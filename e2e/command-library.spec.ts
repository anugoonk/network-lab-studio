import { expect, test, type Page } from '@playwright/test';
import { SPECS } from '../src/core/cli/registry';

/** UI-CL01: compact Command Library with a detail panel. */

const lib = (page: Page) => page.getByTestId('library');
const rows = (page: Page) => page.locator('[data-testid^="lib-card-"]');
const rowMain = (page: Page, id: string) => page.getByTestId(`lib-card-${id}`).locator('.lib-row-main');
const detailSyntax = (page: Page) => page.getByTestId('lib-detail-syntax');

async function openLibrary(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await page.getByTestId('tab-library').click();
  await expect(lib(page)).toBeVisible();
}

async function english(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('lang-seeded')) {
      sessionStorage.setItem('lang-seeded', '1');
      localStorage.setItem('nls.lang', 'en');
    }
  });
}

test('compact list: every registry command is listed once with syntax, vendor, topic and a Put in Console button', async ({ page }) => {
  await openLibrary(page);
  await expect(rows(page)).toHaveCount(SPECS.length);
  await expect(page.getByTestId('lib-count')).toHaveText(`${SPECS.length} รายการ`);
  const listed = await rows(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('lib-card-'.length)));
  expect(listed).toEqual(SPECS.map((s) => s.id));

  const vendorText = { cisco: 'Cisco IOS', aruba: 'Aruba AOS-CX', pc: 'PC', generic: '' } as const;
  for (const s of [SPECS[0], SPECS.find((x) => x.vendor === 'aruba')!, SPECS.find((x) => x.vendor === 'pc')!]) {
    const row = page.getByTestId(`lib-card-${s.id}`);
    await expect(row.locator('.syntax')).toHaveText(s.syntax);
    await expect(row.locator(`.tag.${s.vendor}`)).toHaveText(vendorText[s.vendor]);
    await expect(row.locator('.tag.topic')).toHaveText(s.topic);
    await expect(page.getByTestId(`lib-insert-${s.id}`)).toBeVisible();
    await expect(page.getByTestId(`lib-insert-${s.id}`)).toHaveText('ใส่ใน Console');
  }
  // compact: one line per command (the old cards were ~150px high)
  const h = (await page.getByTestId(`lib-card-${SPECS[0].id}`).boundingBox())!.height;
  expect(h).toBeLessThan(48);
});

test('detail panel: full syntax, description, devices, mode with how to enter it, examples, verify, actions', async ({ page }) => {
  await openLibrary(page);
  // first command is selected by default
  await expect(rowMain(page, SPECS[0].id)).toHaveAttribute('aria-current', 'true');
  await expect(detailSyntax(page)).toHaveText(SPECS[0].syntax);

  const s = SPECS.find((x) => x.id === 'aruba.vlan.access')!;
  await page.getByTestId('lib-search').fill('vlan access');
  await rowMain(page, s.id).click();
  await expect(rowMain(page, s.id)).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('.lib-row-main[aria-current="true"]')).toHaveCount(1);
  const d = page.getByTestId('lib-detail');
  await expect(detailSyntax(page)).toHaveText(s.syntax);
  await expect(page.getByTestId('lib-detail-desc')).toHaveText(s.descTh);
  await expect(page.getByTestId('lib-detail-kinds')).toContainText('HPE Aruba AOS-CX Access Switch');
  await expect(page.getByTestId('lib-detail-modes')).toContainText('Interface config (SW2(config-if)#)');
  await expect(page.getByTestId('lib-detail-modes')).toContainText('configure terminal → interface');
  await expect(page.getByTestId('lib-detail-examples')).toContainText('vlan access 10');
  await expect(d).toContainText(s.verify);
  await expect(d).toContainText(s.verifyTh);
  await expect(page.getByTestId('lib-copy')).toBeVisible();
  await expect(page.getByTestId('lib-detail-insert')).toBeVisible();

  // a PC command lists every device that runs the PC terminal, wrapped inside the panel (no overflow)
  await page.getByTestId('lib-search').fill('');
  const ping = SPECS.find((x) => x.vendor === 'pc' && x.syntax.startsWith('ping'))!;
  await rowMain(page, ping.id).click();
  for (const label of ['(Printer)', '(IP Camera)', '(NAS)']) await expect(page.getByTestId('lib-detail-kinds')).toContainText(label);
  const overflow = await d.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('keyboard: ↓ from search into the list, ↑/↓/Home/End move, Enter opens the detail, Escape goes back', async ({ page }) => {
  await openLibrary(page);
  const search = page.getByTestId('lib-search');
  await search.click();
  // typing (including arrow keys inside the text) stays in the search box
  await search.pressSequentially('show ip');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await expect(search).toHaveValue('show ip');
  await expect(search).toBeFocused();

  const ids = await rows(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('lib-card-'.length)));
  expect(ids.length).toBeGreaterThan(3);
  await page.keyboard.press('ArrowDown');
  await expect(rowMain(page, ids[0])).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(rowMain(page, ids[1])).toBeFocused();
  await expect(rowMain(page, ids[1])).toHaveAttribute('aria-current', 'true');
  await expect(detailSyntax(page)).toHaveText(SPECS.find((s) => s.id === ids[1])!.syntax);
  await page.keyboard.press('ArrowUp');
  await expect(rowMain(page, ids[0])).toBeFocused();
  await page.keyboard.press('ArrowUp'); // stays on the first one
  await expect(rowMain(page, ids[0])).toBeFocused();
  await page.keyboard.press('End');
  await expect(rowMain(page, ids[ids.length - 1])).toBeFocused();
  await page.keyboard.press('Home');
  await expect(rowMain(page, ids[0])).toBeFocused();
  await page.keyboard.press('ArrowDown');

  // visible focus ring on the focused row
  const outline = await rowMain(page, ids[1]).evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe('solid');

  // Tab reaches the same row's Put in Console button
  await page.keyboard.press('Tab');
  await expect(page.getByTestId(`lib-insert-${ids[1]}`)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(rowMain(page, ids[1])).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.locator('#lib-detail-title')).toBeFocused();
  await expect(detailSyntax(page)).toHaveText(SPECS.find((s) => s.id === ids[1])!.syntax);
  await page.keyboard.press('Escape');
  await expect(rowMain(page, ids[1])).toBeFocused();

  // Escape in the search box clears the query
  await search.focus();
  await page.keyboard.press('Escape');
  await expect(search).toHaveValue('');
  await expect(rows(page)).toHaveCount(SPECS.length);
});

test('filters: device type and mode reach every command; Clear Filters resets them; empty state', async ({ page }) => {
  await openLibrary(page);
  const clear = page.getByTestId('lib-clear');
  await expect(clear).toBeDisabled();

  // modes that the old fixed list missed are offered now
  const modes = await page.getByTestId('lib-mode').locator('option').evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
  for (const m of ['config-subif', 'config-svi', 'config-vlan', 'pc']) expect(modes).toContain(m);
  await page.getByTestId('lib-mode').selectOption('config-subif');
  const subif = SPECS.filter((s) => s.modes.includes('config-subif'));
  await expect(rows(page)).toHaveCount(subif.length);
  await expect(clear).toBeEnabled();

  // the device filter keeps every command that device supports
  await page.getByTestId('lib-mode').selectOption('');
  await page.getByTestId('lib-kind').selectOption('printer');
  await expect(rows(page)).toHaveCount(SPECS.filter((s) => s.deviceTypes.includes('printer')).length);
  await page.getByTestId('lib-topic').selectOption('Troubleshooting');
  await expect(rows(page)).toHaveCount(SPECS.filter((s) => s.deviceTypes.includes('printer') && s.topic === 'Troubleshooting').length);

  // nothing matches → empty state with its own Clear Filters button
  await page.getByTestId('lib-vendor').selectOption('cisco');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.getByTestId('lib-empty')).toBeVisible();
  await expect(page.getByTestId('lib-detail')).toHaveCount(0);
  await page.getByTestId('lib-empty').getByRole('button').click();
  await expect(rows(page)).toHaveCount(SPECS.length);
  for (const id of ['lib-vendor', 'lib-kind', 'lib-mode', 'lib-topic']) await expect(page.getByTestId(id)).toHaveValue('');
  await expect(page.getByTestId('lib-search')).toHaveValue('');
  await expect(page.getByTestId('lib-search')).toBeFocused();

  // toolbar Clear Filters also clears the search text
  await page.getByTestId('lib-search').fill('trunk');
  await page.getByTestId('lib-vendor').selectOption('aruba');
  expect(await rows(page).count()).toBeLessThan(SPECS.length);
  await clear.click();
  await expect(page.getByTestId('lib-search')).toHaveValue('');
  await expect(page.getByTestId('lib-vendor')).toHaveValue('');
  await expect(rows(page)).toHaveCount(SPECS.length);
  await expect(clear).toBeDisabled();
});

test('copy command: success copies the exact example and says so', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openLibrary(page);
  await page.getByTestId('lib-target').selectOption({ label: 'PC-01 — PC' });
  const ping = SPECS.find((x) => x.vendor === 'pc' && x.syntax.startsWith('ping'))!;
  await rowMain(page, ping.id).click();
  const example = (await page.getByTestId('lib-detail-example').textContent())!;
  expect(example.length).toBeGreaterThan(0);
  await page.getByTestId('lib-copy').click();
  await expect(page.getByTestId('lib-copy-status')).toHaveText(`คัดลอกแล้ว: ${example}`);
  await expect(page.getByTestId('lib-copy-status')).toHaveClass(/ok/);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(example);
  // feedback belongs to that command: selecting another one clears it
  await rowMain(page, SPECS[0].id).click();
  await expect(page.getByTestId('lib-copy-status')).toHaveText('');
});

test('copy command: permission denied is reported as a failure, never as copied', async ({ page }) => {
  await page.addInitScript(() => {
    const deny = () => Promise.reject(new DOMException('denied', 'NotAllowedError'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: deny, readText: deny } });
  });
  await openLibrary(page);
  await page.getByTestId('lib-copy').click();
  const st = page.getByTestId('lib-copy-status');
  await expect(st).toContainText('คัดลอกไม่สำเร็จ');
  await expect(st).toContainText('Ctrl+C');
  await expect(st).not.toContainText('คัดลอกแล้ว');
  await expect(st).toHaveClass(/bad/);
});

test('copy command: no Clipboard API is reported as unsupported', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  });
  await openLibrary(page);
  await page.getByTestId('lib-copy').click();
  await expect(page.getByTestId('lib-copy-status')).toContainText('คัดลอกไม่สำเร็จ — เบราว์เซอร์นี้ไม่รองรับ');
});

test('Put in Console from the detail panel: problem shown next to the button, then inserts into the right console', async ({ page }) => {
  await openLibrary(page);
  await page.getByTestId('lib-search').fill('vlan access');
  await page.getByTestId('lib-vendor').selectOption('aruba');
  await rowMain(page, 'aruba.vlan.access').click();

  await page.getByTestId('lib-target').selectOption({ label: 'SW1 — Cisco IOS Access Switch' });
  await page.getByTestId('lib-detail-insert').click();
  await expect(page.getByTestId('lib-detail-problem')).toContainText('Aruba AOS-CX');
  // the row's feedback area is untouched by the detail button
  await expect(page.getByTestId('lib-problem-aruba.vlan.access')).toHaveCount(0);

  await page.getByTestId('lib-target').selectOption({ label: 'SW2 — HPE Aruba AOS-CX Access Switch' });
  await page.getByTestId('lib-detail-insert').click();
  await expect(page.getByTestId('lib-detail-problem')).toContainText('interface');

  // PC command into PC-01: no mode needed → goes straight to the console, not executed
  await page.getByTestId('lib-search').fill('');
  await page.getByTestId('lib-vendor').selectOption('pc');
  const ping = SPECS.find((x) => x.vendor === 'pc' && x.syntax.startsWith('ping'))!;
  await rowMain(page, ping.id).click();
  await page.getByTestId('lib-target').selectOption({ label: 'PC-01 — PC' });
  const example = (await page.getByTestId('lib-detail-example').textContent())!;
  await page.getByTestId('lib-detail-insert').click();
  await expect(page.getByTestId('console-input')).toHaveValue(example);
  await expect(page.getByTestId('console')).toContainText('PC-01');
});

test('target list holds only devices with a CLI; a selected diagram device does not become the target', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('btn-new').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  await page.getByTestId('menu-add').click();
  await page.getByTestId('palette-wireless-ap').click();
  await page.getByTestId('tab-library').click();
  await expect(page.getByTestId('lib-target')).toBeDisabled();
  const first = SPECS[0];
  await page.getByTestId(`lib-insert-${first.id}`).click();
  await expect(page.getByTestId(`lib-problem-${first.id}`)).toContainText('ยังไม่มีอุปกรณ์ที่มี CLI ใน Lab');

  await page.getByTestId('tab-lab').click();
  await page.getByTestId('palette-cisco-router').click();
  await page.locator('.react-flow__node').first().click(); // the AP
  await page.getByTestId('tab-library').click();
  const opts = await page.getByTestId('lib-target').locator('option').allTextContents();
  expect(opts).toHaveLength(1);
  expect(opts[0]).toContain('Cisco');
  await expect(page.getByTestId('lib-target')).toBeEnabled();
});

test('English: the library, detail panel, copy feedback and problems contain no Thai text', async ({ page }) => {
  await english(page);
  await page.addInitScript(() => {
    const deny = () => Promise.reject(new DOMException('denied', 'NotAllowedError'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: deny, readText: deny } });
  });
  await openLibrary(page);
  await expect(page.getByTestId('lib-clear')).toHaveText('Clear filters');
  await expect(page.getByTestId(`lib-insert-${SPECS[0].id}`)).toHaveText('Put in Console');
  await page.getByTestId('lib-copy').click();
  await expect(page.getByTestId('lib-copy-status')).toContainText('Copy failed');
  await page.getByTestId('lib-target').selectOption({ label: 'PC-01 — PC' });
  await page.getByTestId(`lib-insert-${SPECS[0].id}`).click();
  await page.getByTestId('lib-detail-insert').click();
  await expect(page.getByTestId(`lib-problem-${SPECS[0].id}`)).toBeVisible();
  await expect(page.getByTestId('lib-detail-problem')).toBeVisible();
  const thai = await lib(page).evaluate((root) => {
    const re = /[฀-๿]/;
    const found: string[] = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (re.test(n.textContent ?? '')) found.push((n.textContent ?? '').slice(0, 60));
    for (const el of Array.from(root.querySelectorAll('*'))) for (const a of ['title', 'aria-label', 'placeholder']) {
      const v = el.getAttribute(a);
      if (v && re.test(v)) found.push(`${a}: ${v.slice(0, 60)}`);
    }
    return found;
  });
  expect(thai).toEqual([]);
  await page.getByTestId('lib-search').fill('zzzz');
  await expect(page.getByTestId('lib-empty')).toContainText('No command matches the filters');
});

for (const vp of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
]) {
  test(`layout ${vp.width}×${vp.height}: list and detail side by side, no horizontal overflow, list scrolls`, async ({ page }) => {
    await page.setViewportSize(vp);
    await openLibrary(page);
    const noOverflow = await page.evaluate(() => {
      const se = document.scrollingElement!;
      const libEl = document.querySelector('[data-testid="library"]')!;
      return { page: se.scrollWidth - se.clientWidth, lib: libEl.scrollWidth - libEl.clientWidth };
    });
    expect(noOverflow.page).toBeLessThanOrEqual(0);
    expect(noOverflow.lib).toBeLessThanOrEqual(0);

    const list = (await page.getByTestId('lib-list').boundingBox())!;
    const det = (await page.getByTestId('lib-detail').boundingBox())!;
    expect(det.x).toBeGreaterThanOrEqual(list.x + list.width - 1); // detail to the right of the list
    expect(det.x + det.width).toBeLessThanOrEqual(vp.width);
    expect(list.y + list.height).toBeLessThanOrEqual(vp.height);
    expect(det.y + det.height).toBeLessThanOrEqual(vp.height);
    expect(list.height).toBeGreaterThan(200);
    // the page itself does not scroll; the list does
    expect(await page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight)).toBeLessThanOrEqual(0);
    expect(await page.getByTestId('lib-list').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);

    // insert button and syntax of a long row stay inside the row
    for (const s of SPECS.filter((x) => x.syntax.length > 40).slice(0, 3)) {
      const row = (await page.getByTestId(`lib-card-${s.id}`).boundingBox())!;
      const btn = (await page.getByTestId(`lib-insert-${s.id}`).boundingBox()) ?? row;
      expect(btn.x + btn.width).toBeLessThanOrEqual(row.x + row.width + 0.5);
    }

    // keyboard End scrolls the last row into view
    await rowMain(page, SPECS[0].id).focus();
    await page.keyboard.press('End');
    const last = SPECS[SPECS.length - 1].id;
    await expect(rowMain(page, last)).toBeFocused();
    await expect(rowMain(page, last)).toBeInViewport();
    await page.screenshot({ path: `test-results/library-${vp.width}x${vp.height}.png` });
  });
}
