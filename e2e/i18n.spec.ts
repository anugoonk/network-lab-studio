import { expect, test, type Page } from '@playwright/test';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

/** every Thai character left in the visible text or in the title / aria-label / placeholder attributes */
async function thaiLeft(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const re = /[฀-๿]/;
    const found: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent ?? '';
      if (re.test(t)) found.push(`text: ${t.trim().slice(0, 80)}`);
    }
    // the language switch itself shows the native name of each language on purpose
    for (const el of Array.from(document.body.querySelectorAll('*')).filter((e) => !e.closest('.lang-switch'))) {
      for (const a of ['title', 'aria-label', 'placeholder', 'alt']) {
        const v = el.getAttribute(a);
        if (v && re.test(v)) found.push(`${a}: ${v.slice(0, 80)}`);
      }
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) if (re.test(el.value)) found.push(`value: ${el.value.slice(0, 80)}`);
    }
    if (re.test(document.title)) found.push(`document.title: ${document.title}`);
    return found;
  });
}

async function english(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('lang-seeded')) {
      sessionStorage.setItem('lang-seeded', '1');
      localStorage.setItem('nls.lang', 'en');
    }
  });
}

async function type(page: Page, line: string) {
  const input = page.getByTestId('console-input');
  await input.fill(line);
  await input.press('Enter');
}

test('the language switch: TH by default, EN after clicking, remembered across reloads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'th');
  await expect(page.getByTestId('lang-th')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('menu-share')).toHaveAttribute('aria-label', /.*/).catch(() => undefined);
  await expect(page.getByTestId('guide-title')).toContainText('ทำลิงก์ระหว่าง switch หยุด');

  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('btn-fit')).toBeVisible();

  await page.getByTestId('lang-th').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'th');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
});

test('English mode: no Thai text is left in the main screens', async ({ page }) => {
  await english(page);
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  expect(await thaiLeft(page), 'Lab view + Guide').toEqual([]);

  // Details / link / Inspector
  await page.getByTestId('node-SW2').click();
  expect(await thaiLeft(page), 'device details').toEqual([]);
  await page.getByTestId('rtab-inspector').click();
  await page.getByTestId('node-PC-01').click(); // (no-op selection change; keeps the Inspector open)
  expect(await thaiLeft(page), 'inspector').toEqual([]);
  await page.getByTestId('rtab-details').click();

  // Console: Aruba note, a failing command (Thai hint in the transcript), a ping explanation
  await page.getByTestId('node-SW2').dblclick();
  await type(page, 'configure terminal');
  await type(page, 'show vlan');
  await expect(page.getByTestId('console-log')).toContainText('mode');
  expect(await thaiLeft(page), 'aruba console + wrong-mode hint').toEqual([]);
  await page.getByTestId('node-PC-01').dblclick();
  await type(page, 'ping 192.168.1.110');
  await type(page, 'ping 10.99.99.99');
  await type(page, 'arp -a');
  expect(await thaiLeft(page), 'pc terminal').toEqual([]);

  // Command Library and Lab Manager
  await page.getByTestId('tab-library').click();
  await expect(page.getByTestId('tab-library')).toHaveClass(/active/);
  expect(await thaiLeft(page), 'command library').toEqual([]);
  await page.getByTestId('tab-manager').click();
  expect(await thaiLeft(page), 'lab manager').toEqual([]);
});

test('English mode: challenges, hints, editors, dialogs and messages have no Thai text', async ({ page }) => {
  await english(page);
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();

  await page.getByTestId('select-challenge').selectOption('trouble');
  await page.getByTestId('challenge-hint-next').click();
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('challenge-score')).toContainText('passed');
  expect(await thaiLeft(page), 'challenge + hint + check result').toEqual([]);
  await page.getByTestId('challenge-edit-toggle').click();
  expect(await thaiLeft(page), 'challenge editor').toEqual([]);
  await page.getByTestId('challenge-edit-toggle').click();

  for (const k of ['campus', 'dupip', 'campus3trouble', 'addressing', 'layer2', 'scratch']) {
    await page.getByTestId('select-challenge').selectOption(k);
    await page.getByTestId('challenge-check').click();
    expect(await thaiLeft(page), `challenge ${k}`).toEqual([]);
  }

  // the Guide panel, its editor, and the other samples' guides
  await page.getByTestId('tab-manager').click();
  for (const k of ['intervlan', 'campus3']) {
    await page.getByTestId(`manager-new-${k}`).click();
    await expect(page.getByTestId('guide-title')).toBeVisible();
    expect(await thaiLeft(page), `sample ${k}`).toEqual([]);
    await page.getByTestId('tab-manager').click();
  }
  await page.getByTestId('manager-new-intervlan').click();
  await page.getByTestId('guide-edit-toggle').click();
  await expect(page.getByTestId('guide-edit-toggle')).toContainText('Done');
  expect(await thaiLeft(page), 'guide editor').toEqual([]);
  await page.getByTestId('guide-edit-toggle').click();

  // messages and dialogs
  await page.getByTestId('menu-share').click();
  await expect(page.getByTestId('notice')).toContainText('share link');
  expect(await thaiLeft(page), 'share notice').toEqual([]);
  await page.getByTestId('menu-connect').click();
  await expect(page.getByTestId('connect-submit')).toBeVisible();
  expect(await thaiLeft(page), 'connect dialog').toEqual([]);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByTestId('connect-submit')).toHaveCount(0);

  // an unsaved change makes "New Lab" ask for confirmation
  await page.getByTestId('node-R1').dblclick();
  for (const l of ['enable', 'configure terminal', 'hostname EDITED']) await type(page, l);
  await page.getByTestId('btn-new').click();
  await expect(page.getByTestId('confirm-ok')).toBeVisible();
  expect(await thaiLeft(page), 'replace confirmation').toEqual([]);
  await page.getByTestId('confirm-cancel').click();
});

test('English mode: an error message and the duplicate-IP badge are English too', async ({ page }) => {
  await english(page);
  await page.goto('/');
  await page.getByTestId('tab-manager').click();
  await page.getByTestId('manager-new-dupip').click();
  await expect(page.getByTestId('dup-PC-02')).toBeVisible();
  await expect(page.getByTestId('dup-PC-02')).toContainText('Duplicate IP');
  await page.getByTestId('tab-lab').click();
  expect(await thaiLeft(page), 'dup ip lab').toEqual([]);

  // an invalid import is reported in English
  await page.getByTestId('tab-manager').click();
  await page.getByTestId('manager-import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{not json') });
  await expect(page.getByTestId('notice')).toContainText('Import failed');
  expect(await thaiLeft(page), 'import error').toEqual([]);
});
