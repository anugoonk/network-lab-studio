import { expect, test, type Page } from '@playwright/test';

// UI-03: canvas interaction modes (Select / Pan / Connect), drop-target highlight and the link colours.
// The default page is the Small Office sample (PC-01, SW1, SW2 ...; link l1 UP, link l2 = SW1 Gi0/2 <-> SW2 1/1/24).

type Box = { x: number; y: number; width: number; height: number };

const box = async (page: Page, name: string): Promise<Box> => (await page.getByTestId(`node-${name}`).boundingBox())!;
const centre = (b: Box) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

async function dragFromDevice(page: Page, name: string, dx: number, dy: number) {
  const c = centre(await box(page, name));
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + dx, c.y + dy, { steps: 10 });
  await page.mouse.up();
}

/** a point ON the drawn link (screen coordinates), so a real mouse click hits the link itself */
async function edgePoint(page: Page, linkId: string) {
  return page.locator(`[data-testid="rf__edge-${linkId}"] path.react-flow__edge-path`).evaluate((el) => {
    const p = el as SVGPathElement;
    const pt = p.getPointAtLength(p.getTotalLength() * 0.5);
    const m = p.getScreenCTM()!;
    return { x: pt.x * m.a + pt.y * m.c + m.e, y: pt.x * m.b + pt.y * m.d + m.f };
  });
}
const viewportTransform = (page: Page) => page.locator('.react-flow__viewport').evaluate((el) => (el as HTMLElement).style.transform);
/** drag from the handle of one device to the handle of another with the real mouse (no error is ever swallowed) */
async function dragHandleToHandle(page: Page, from: string, to: string) {
  const a = (await page.getByTestId(`node-${from}`).locator('.node-handle').boundingBox())!;
  const b = (await page.getByTestId(`node-${to}`).locator('.node-handle').boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

const mode = (page: Page, m: 'select' | 'pan' | 'connect') => page.getByTestId(`mode-${m}`);
const canvas = (page: Page) => page.getByTestId('canvas');
const strokeOf = (page: Page, linkId: string) =>
  page.locator(`[data-testid="rf__edge-${linkId}"] path.react-flow__edge-path`).evaluate((el) => {
    const cs = getComputedStyle(el);
    return { stroke: cs.stroke, dash: cs.strokeDasharray, width: cs.strokeWidth };
  });

async function ensurePalette(page: Page) {
  if (!(await page.getByTestId('palette-pc').isVisible())) await page.getByTestId('menu-add').click();
  await expect(page.getByTestId('palette-pc')).toBeVisible();
}

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

test.describe('canvas modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('node-PC-01')).toBeVisible();
    await expect(page.getByTestId('node-SW1')).toBeVisible();
  });

  test('three mode buttons; Select is the default and the pressed state follows the choice', async ({ page }) => {
    await expect(page.getByTestId('mode-group')).toBeVisible();
    await expect(mode(page, 'select')).toHaveAttribute('aria-pressed', 'true');
    await expect(mode(page, 'pan')).toHaveAttribute('aria-pressed', 'false');
    await expect(mode(page, 'connect')).toHaveAttribute('aria-pressed', 'false');
    await expect(canvas(page)).toHaveAttribute('data-mode', 'select');
    await expect(page.getByTestId('mode-hint')).toHaveCount(0);
    for (const m of ['pan', 'connect', 'select'] as const) {
      await mode(page, m).click();
      await expect(mode(page, m)).toHaveAttribute('aria-pressed', 'true');
      await expect(canvas(page)).toHaveAttribute('data-mode', m);
      for (const other of (['select', 'pan', 'connect'] as const).filter((x) => x !== m)) await expect(mode(page, other)).toHaveAttribute('aria-pressed', 'false');
    }
  });

  test('the mode buttons work from the keyboard', async ({ page }) => {
    await mode(page, 'pan').focus();
    await page.keyboard.press('Enter');
    await expect(mode(page, 'pan')).toHaveAttribute('aria-pressed', 'true');
    await mode(page, 'connect').focus();
    await page.keyboard.press('Space');
    await expect(mode(page, 'connect')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Select mode: a device is dragged exactly as before (one undo step) and a click still selects it', async ({ page }) => {
    await expect(page.getByTestId('btn-undo')).toBeDisabled();
    const before = await box(page, 'PC-01');
    await dragFromDevice(page, 'PC-01', 90, 60);
    const after = await box(page, 'PC-01');
    expect(after.x - before.x).toBeGreaterThan(60);
    expect(after.y - before.y).toBeGreaterThan(40);
    await expect(page.getByTestId('btn-undo')).toBeEnabled();
    await page.getByTestId('node-SW1').click();
    await expect(page.getByTestId('node-SW1')).toHaveClass(/selected/);
  });

  test('Pan mode: dragging moves the view, never a device (relative positions and history unchanged)', async ({ page }) => {
    await mode(page, 'pan').click();
    await expect(page.getByTestId('mode-hint')).toBeVisible();
    const pc0 = await box(page, 'PC-01');
    const sw0 = await box(page, 'SW1');
    const edges0 = await page.locator('.react-flow__edge').count();
    const vp0 = await viewportTransform(page);
    await dragFromDevice(page, 'PC-01', 80, 50);
    const pc1 = await box(page, 'PC-01');
    const sw1 = await box(page, 'SW1');
    // the viewport transform itself changed (the view was panned) and no cable appeared
    expect(await viewportTransform(page)).not.toBe(vp0);
    await expect(page.locator('.react-flow__edge')).toHaveCount(edges0);
    // the whole view moved together ...
    expect(Math.abs(pc1.x - pc0.x - (sw1.x - sw0.x))).toBeLessThan(2);
    expect(Math.abs(pc1.y - pc0.y - (sw1.y - sw0.y))).toBeLessThan(2);
    expect(pc1.x - pc0.x).toBeGreaterThan(40);
    // ... and no Lab change was recorded (a device drag would enable Undo)
    await expect(page.getByTestId('btn-undo')).toBeDisabled();
    // dragging empty canvas pans too
    const c = await page.locator('.react-flow__pane').boundingBox();
    await page.mouse.move(c!.x + c!.width - 60, c!.y + c!.height - 60);
    await page.mouse.down();
    await page.mouse.move(c!.x + c!.width - 140, c!.y + c!.height - 100, { steps: 8 });
    await page.mouse.up();
    const pc2 = await box(page, 'PC-01');
    expect(pc2.x).toBeLessThan(pc1.x - 40);
    await expect(page.getByTestId('btn-undo')).toBeDisabled();
  });

  test('Connect mode: devices stay put, two clicks open the usual Connect dialog and create the cable', async ({ page }) => {
    await ensurePalette(page);
    await page.getByTestId('palette-pc').click();
    await expect(page.getByTestId('node-PC-11')).toBeVisible();
    await mode(page, 'connect').click();
    await expect(page.getByTestId('mode-hint')).toContainText('คลิกอุปกรณ์ต้นทาง');
    // devices are not draggable in this mode
    const p0 = await box(page, 'PC-11');
    const s0 = await box(page, 'SW1');
    await dragFromDevice(page, 'PC-11', 70, 40);
    const p1 = await box(page, 'PC-11');
    const s1 = await box(page, 'SW1');
    // dragging a device only pans the view here: both devices moved together, so their distance is unchanged
    expect(Math.abs(p1.x - p0.x - (s1.x - s0.x))).toBeLessThan(2);
    expect(Math.abs(p1.y - p0.y - (s1.y - s0.y))).toBeLessThan(2);
    const edgesBefore = await page.locator('.react-flow__edge').count();
    await page.getByTestId('node-PC-11').click();
    await expect(page.getByTestId('mode-hint')).toContainText('เลือกอุปกรณ์ปลายทาง');
    await expect(page.getByTestId('connect-submit')).toHaveCount(0); // nothing is created by the first click
    await page.getByTestId('node-SW1').click();
    await expect(page.getByTestId('connect-submit')).toBeVisible();
    await page.getByTestId('connect-b-port').selectOption('FastEthernet0/7');
    await page.getByTestId('connect-submit').click();
    await expect(page.getByTestId('notice')).toContainText('เชื่อมสายสำเร็จ');
    await expect(page.locator('.react-flow__edge')).toHaveCount(edgesBefore + 1);
    await expect(page.getByTestId('mode-hint')).toContainText('คลิกอุปกรณ์ต้นทาง'); // ready for the next cable
  });

  test('Connect mode: Esc, a second click on the same device, or changing mode forgets the first device; nothing is created', async ({ page }) => {
    await mode(page, 'connect').click();
    const edges = await page.locator('.react-flow__edge').count();
    await page.getByTestId('node-PC-01').click();
    await expect(page.getByTestId('mode-hint')).toContainText('เลือกอุปกรณ์ปลายทาง');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('mode-hint')).toContainText('คลิกอุปกรณ์ต้นทาง');
    await page.getByTestId('node-PC-01').click();
    await page.getByTestId('node-PC-01').click();
    await expect(page.getByTestId('mode-hint')).toContainText('คลิกอุปกรณ์ต้นทาง');
    await page.getByTestId('node-PC-01').click();
    await mode(page, 'select').click();
    await mode(page, 'connect').click();
    await expect(page.getByTestId('mode-hint')).toContainText('คลิกอุปกรณ์ต้นทาง');
    await expect(page.getByTestId('connect-submit')).toHaveCount(0);
    await expect(page.locator('.react-flow__edge')).toHaveCount(edges);
  });

  test('Connect mode: the existing handle-to-handle drag still opens the dialog', async ({ page }) => {
    await mode(page, 'connect').click();
    await ensurePalette(page);
    await page.getByTestId('palette-pc').click();
    const handle = page.getByTestId('node-PC-11').locator('.node-handle');
    await handle.dragTo(page.getByTestId('node-SW1').locator('.node-handle'));
    await expect(page.getByTestId('connect-submit')).toBeVisible();
  });

  test('Pan mode cannot start a cable from a handle (and the very same gesture does open the dialog in Select mode)', async ({ page }) => {
    const edges = await page.locator('.react-flow__edge').count();
    await mode(page, 'pan').click();
    await dragHandleToHandle(page, 'PC-01', 'SW1');
    await expect(page.getByTestId('connect-submit')).toHaveCount(0);
    await expect(page.locator('.react-flow__edge')).toHaveCount(edges);
    await expect(page.getByTestId('btn-undo')).toBeDisabled();
    // positive control: this exact gesture really starts a cable when the mode allows it, so the check above is not vacuous
    await mode(page, 'select').click();
    await dragHandleToHandle(page, 'PC-01', 'SW1');
    await expect(page.getByTestId('connect-submit')).toBeVisible();
  });

  test('Connect mode: a device without network ports (rack) can never start or finish a cable; devices with ports still work', async ({ page }) => {
    await ensurePalette(page);
    const names = (p: Page) => p.$$eval('.react-flow__node [data-testid^="node-"]', (els) => els.map((e) => e.getAttribute('data-testid') as string));
    const before = await names(page);
    await page.getByTestId('palette-rack').click();
    await expect.poll(async () => (await names(page)).length).toBe(before.length + 1);
    const rack = (await names(page)).find((n) => !before.includes(n))!;
    expect(rack).toBeTruthy();
    const edges = await page.locator('.react-flow__edge').count();
    await mode(page, 'connect').click();
    // 1. the rack cannot start a cable
    await page.getByTestId(rack).click();
    await expect(page.getByTestId('notice')).toContainText('ไม่มีพอร์ต');
    await expect(page.getByTestId('mode-hint')).toContainText('คลิกอุปกรณ์ต้นทาง'); // still waiting for a first device
    await expect(page.getByTestId('connect-submit')).toHaveCount(0);
    // 2. nor finish one: PC-01 is pending, the rack is ignored, the pending device stays
    await page.getByTestId('node-PC-01').click();
    await expect(page.getByTestId('mode-hint')).toContainText('เลือกอุปกรณ์ปลายทาง');
    await page.getByTestId(rack).click();
    await expect(page.getByTestId('notice')).toContainText('ไม่มีพอร์ต');
    await expect(page.getByTestId('mode-hint')).toContainText('เลือกอุปกรณ์ปลายทาง');
    await expect(page.getByTestId('connect-submit')).toHaveCount(0);
    await expect(page.locator('.react-flow__edge')).toHaveCount(edges);
    // 3. positive control: a device with ports finishes the same pending cable through the usual dialog
    await page.getByTestId('node-SW1').click();
    await expect(page.getByTestId('connect-submit')).toBeVisible();
  });

  test('Connect mode: a pending first device is forgotten when another Lab is loaded (device ids repeat from Lab to Lab)', async ({ page }) => {
    await mode(page, 'connect').click();
    await page.getByTestId('node-PC-01').click();
    await expect(page.getByTestId('mode-hint')).toContainText('เลือกอุปกรณ์ปลายทาง');
    await page.getByTestId('btn-sample2').click(); // untouched sample: replaced without a prompt
    await expect(page.getByTestId('lab-name')).toContainText('Inter-VLAN');
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
    // the pending device did not follow us into the other Lab, and the mode itself is kept
    await expect(mode(page, 'connect')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('mode-hint')).toContainText('คลิกอุปกรณ์ต้นทาง');
    await expect(page.getByTestId('connect-submit')).toHaveCount(0);
    // normal behaviour in the new Lab: the first click only starts, the second opens the dialog
    await page.locator('.react-flow__node').nth(0).click();
    await expect(page.getByTestId('mode-hint')).toContainText('เลือกอุปกรณ์ปลายทาง');
    await expect(page.getByTestId('connect-submit')).toHaveCount(0);
    await page.locator('.react-flow__node').nth(1).click();
    await expect(page.getByTestId('connect-submit')).toBeVisible();
  });

  test('changing mode changes nothing in the Lab; the mode is not saved and is Select again after a reload', async ({ page }) => {
    const nodes = await page.locator('.react-flow__node').count();
    const edges = await page.locator('.react-flow__edge').count();
    await mode(page, 'pan').click();
    await mode(page, 'connect').click();
    await mode(page, 'select').click();
    await expect(page.locator('.react-flow__node')).toHaveCount(nodes);
    await expect(page.locator('.react-flow__edge')).toHaveCount(edges);
    await expect(page.getByTestId('btn-undo')).toBeDisabled(); // no Lab change was recorded
    // force an autosave with a real Lab edit while Pan is active, then look at everything stored
    await mode(page, 'pan').click();
    await ensurePalette(page);
    await page.getByTestId('palette-pc').click();
    await expect.poll(() => page.evaluate(() => (localStorage.getItem('nls.workspace.v2') ?? '').includes('PC-11'))).toBe(true);
    const stored = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
    expect(stored).not.toMatch(/canvasMode|"pan"|"connect"|mode-pan|mode-connect/);
    await page.reload();
    await expect(page.getByTestId('node-PC-01')).toBeVisible();
    await expect(mode(page, 'select')).toHaveAttribute('aria-pressed', 'true');
  });

  test('keyboard protection: Backspace in the name field edits the text and deletes nothing; on the canvas the same key deletes the selected device', async ({ page }) => {
    await mode(page, 'pan').click();
    await page.getByTestId('node-PC-01').click();
    await page.getByTestId('rtab-details').click();
    const input = page.getByTestId('device-name');
    await input.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await expect(input).toHaveValue('PC-'); // the keys really reached the field
    await expect(page.getByTestId('node-PC-01')).toBeVisible(); // ... and did not delete the device
    await input.fill('PC-01');
    await input.press('Enter');
    // positive control: with focus on the canvas the same key deletes the selection (there is no confirmation dialog for this path)
    await page.getByTestId('node-PC-01').click();
    await page.keyboard.press('Backspace');
    await expect(page.getByTestId('node-PC-01')).toHaveCount(0);
    await expect(page.getByTestId('btn-undo')).toBeEnabled();
    await page.getByTestId('btn-undo').click();
    await expect(page.getByTestId('node-PC-01')).toBeVisible();
  });

  test('zoom controls, fit view and the empty-workspace hint are still there in every mode', async ({ page }) => {
    for (const m of ['select', 'pan', 'connect'] as const) {
      await mode(page, m).click();
      await expect(page.locator('.react-flow__controls')).toBeVisible();
      await expect(page.getByTestId('btn-fit')).toBeEnabled();
    }
    await mode(page, 'select').click();
    await page.getByTestId('btn-new').click();
    await expect(page.locator('.react-flow__node')).toHaveCount(0);
    await expect(page.locator('.empty-hint')).toContainText('Lab ว่างเปล่า');
  });
});

test.describe('drop target', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('node-PC-01')).toBeVisible();
    await ensurePalette(page);
  });

  test('the canvas is highlighted only while a palette device is dragged over it, and the drop still places the device', async ({ page }) => {
    await expect(canvas(page)).toHaveAttribute('data-drop-active', 'false');
    const nodes = await page.locator('.react-flow__node').count();
    const item = page.getByTestId('palette-pc');
    await item.scrollIntoViewIfNeeded(); // the bar can be clipped: the pointer must really be on the item
    const src = await item.boundingBox();
    const dst = await page.locator('.react-flow__pane').boundingBox();
    await item.hover();
    await page.mouse.down();
    await page.mouse.move(src!.x + src!.width / 2 + 8, src!.y + src!.height / 2 + 8); // starts the drag
    await page.mouse.move(dst!.x + dst!.width / 2, dst!.y + dst!.height / 2, { steps: 12 });
    await expect(canvas(page)).toHaveAttribute('data-drop-active', 'true');
    await expect(canvas(page)).toHaveClass(/drop-active/);
    await expect(canvas(page)).toHaveCSS('outline-style', 'dashed'); // the highlight is really drawn
    // leaving the canvas clears it ...
    await page.mouse.move(src!.x + src!.width / 2, src!.y + src!.height / 2, { steps: 8 });
    await expect(canvas(page)).toHaveAttribute('data-drop-active', 'false');
    // ... entering again shows it, dropping clears it and adds exactly one device
    await page.mouse.move(dst!.x + dst!.width / 2 - 40, dst!.y + dst!.height / 2 + 30, { steps: 12 });
    await expect(canvas(page)).toHaveAttribute('data-drop-active', 'true');
    await page.mouse.up();
    await expect(canvas(page)).toHaveAttribute('data-drop-active', 'false');
    await expect(canvas(page)).toHaveCSS('outline-style', 'none');
    await expect(page.locator('.react-flow__node')).toHaveCount(nodes + 1);
  });

  test('dragging something that is not a palette device does not highlight the canvas', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="canvas"]')!;
      const dt = new DataTransfer();
      dt.setData('text/plain', 'hello');
      el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    });
    await expect(canvas(page)).toHaveAttribute('data-drop-active', 'false');
  });

  test('palette click placement is unchanged (UI-03a still places the device)', async ({ page }) => {
    const nodes = await page.locator('.react-flow__node').count();
    await page.getByTestId('palette-pc').click();
    await expect(page.locator('.react-flow__node')).toHaveCount(nodes + 1);
    await expect(canvas(page)).toHaveAttribute('data-drop-active', 'false');
  });
});

test.describe('link colours', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('node-PC-01')).toBeVisible();
    await expect(page.getByTestId('link-status-l2')).toContainText('UP');
  });

  test('the --link-up token is #2f6b86, --link-down is #c62828 and --teal is unchanged (#2f6f8f)', async ({ page }) => {
    const v = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return { linkUp: cs.getPropertyValue('--link-up').trim(), linkDown: cs.getPropertyValue('--link-down').trim(), teal: cs.getPropertyValue('--teal').trim(), bad: cs.getPropertyValue('--bad').trim() };
    });
    expect(v.linkUp).toBe('#2f6b86');
    expect(v.linkDown).toBe('#c62828');
    expect(v.teal).toBe('#2f6f8f');
    expect(v.bad).toBe('#c62828');
  });

  test('an UP link is drawn rgb(47, 107, 134) (#2f6b86) and solid', async ({ page }) => {
    const up = await strokeOf(page, 'l1');
    expect(up.stroke).toBe('rgb(47, 107, 134)');
    expect(up.dash === 'none' || up.dash === '').toBe(true);
    expect(up.width).toBe('2.5px');
  });

  test('selecting a link with a real click: selected state (wider stroke, link details shown), same colour; a click on the canvas deselects', async ({ page }) => {
    const edge = page.locator('[data-testid="rf__edge-l1"]');
    // before: nothing selected
    await expect(edge).not.toHaveClass(/selected/);
    await expect(page.getByTestId('link-details')).toHaveCount(0);
    expect((await strokeOf(page, 'l1')).width).toBe('2.5px');
    // a real mouse click ON the drawn link
    const p = await edgePoint(page, 'l1');
    await page.mouse.click(p.x, p.y);
    await expect(edge).toHaveClass(/selected/);
    await expect(page.getByTestId('link-details')).toBeVisible();
    await expect.poll(async () => (await strokeOf(page, 'l1')).width).toBe('5px');
    const sel = await strokeOf(page, 'l1');
    expect(sel.stroke).toBe('rgb(47, 107, 134)'); // selecting never changes the status colour
    expect(sel.dash === 'none' || sel.dash === '').toBe(true);
    // a click on empty canvas deselects it again
    const c = (await page.locator('.react-flow__pane').boundingBox())!;
    await page.mouse.click(c.x + c.width - 60, c.y + c.height - 60);
    await expect(edge).not.toHaveClass(/selected/);
    await expect(page.getByTestId('link-details')).toHaveCount(0);
    expect((await strokeOf(page, 'l1')).width).toBe('2.5px');
  });

  test('a DOWN link is drawn rgb(198, 40, 40) (#c62828), dashed, and the UP link next to it is unchanged', async ({ page }) => {
    await openConsole(page, 'SW2');
    await type(page, 'configure terminal');
    await type(page, 'interface 1/1/24');
    await type(page, 'shutdown');
    await expect(page.getByTestId('link-status-l2')).toContainText('DOWN');
    const down = await strokeOf(page, 'l2');
    expect(down.stroke).toBe('rgb(198, 40, 40)');
    expect(down.dash).not.toBe('none');
    expect((await strokeOf(page, 'l1')).stroke).toBe('rgb(47, 107, 134)');
    await type(page, 'no shutdown');
    await expect(page.getByTestId('link-status-l2')).toContainText('UP');
    expect((await strokeOf(page, 'l2')).stroke).toBe('rgb(47, 107, 134)');
  });

  test('the UP/DOWN badges keep their own colours (state is not carried by the stroke colour alone)', async ({ page }) => {
    await expect(page.getByTestId('link-status-l1')).toHaveClass(/ok/);
    await expect(page.getByTestId('link-status-l1')).toContainText('UP');
  });
});

test.describe('English', () => {
  test('the new controls and hints are translated', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('nls.lang', 'en'));
    await page.goto('/');
    await expect(page.getByTestId('node-PC-01')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(mode(page, 'select')).toHaveText('Select');
    await expect(mode(page, 'pan')).toHaveText('Pan');
    await expect(mode(page, 'connect')).toHaveText('Cable');
    await expect(page.getByTestId('mode-group')).toHaveAttribute('aria-label', 'Canvas mode');
    await mode(page, 'pan').click();
    await expect(page.getByTestId('mode-hint')).toContainText('Pan mode');
    await mode(page, 'connect').click();
    await expect(page.getByTestId('mode-hint')).toContainText('click the first device');
    await page.getByTestId('node-PC-01').click();
    await expect(page.getByTestId('mode-hint')).toContainText('Esc to cancel');
    const thai = await page.evaluate(() => /[฀-๿]/.test(document.querySelector('[data-testid="mode-group"]')!.textContent ?? '') || /[฀-๿]/.test(document.querySelector('[data-testid="mode-hint"]')!.textContent ?? ''));
    expect(thai).toBe(false);
  });
});
