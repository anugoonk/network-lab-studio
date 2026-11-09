import { expect, test, type Page } from '@playwright/test';

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
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
});

test('duplicate IP: badge on both nodes, listed in the Inspector, gone after the fix', async ({ page }) => {
  await page.getByTestId('rtab-inspector').click();
  await expect(page.getByTestId('dup-none')).toBeVisible();
  // give PC-02 the address of PC-01 (192.168.1.101) — same VLAN 1, same L2 domain
  await page.getByTestId('node-PC-02').click();
  await page.getByTestId('rtab-details').click();
  await page.getByTestId('pc-ip').fill('192.168.1.101');
  await page.getByTestId('pc-apply').click();
  await expect(page.getByTestId('dup-PC-01')).toBeVisible();
  await expect(page.getByTestId('dup-PC-02')).toBeVisible();
  await page.getByTestId('rtab-inspector').click();
  await expect(page.getByTestId('dup-list')).toContainText('192.168.1.101');
  await expect(page.getByTestId('dup-list')).toContainText('PC-01');
  await expect(page.getByTestId('dup-list')).toContainText('PC-02');
  // Windows marks the duplicate
  await openConsole(page, 'PC-02');
  await type(page, 'ipconfig');
  await expect(log(page)).toContainText('192.168.1.101(Duplicate)');
  // fix it
  await page.getByTestId('node-PC-02').click();
  await page.getByTestId('rtab-details').click();
  await page.getByTestId('pc-ip').fill('192.168.1.102');
  await page.getByTestId('pc-apply').click();
  await expect(page.getByTestId('dup-PC-01')).toHaveCount(0);
  await page.getByTestId('rtab-inspector').click();
  await expect(page.getByTestId('dup-none')).toBeVisible();
});

test('MAC table and ARP table commands answer from the live topology', async ({ page }) => {
  await openConsole(page, 'SW1');
  for (const l of ['enable', 'show mac address-table']) await type(page, l);
  await expect(log(page)).toContainText('Mac Address Table');
  await expect(log(page)).toContainText('DYNAMIC');
  await expect(log(page)).toContainText('Fa0/1');
  await type(page, 'show ip arp');
  await expect(log(page)).toContainText('Protocol  Address');
  await openConsole(page, 'PC-01');
  await type(page, 'arp -a');
  await expect(log(page)).toContainText('Internet Address');
  await expect(log(page)).toContainText('192.168.1.1');
  // cut PC-01 off: the table becomes empty
  await openConsole(page, 'SW1');
  for (const l of ['configure terminal', 'interface fa0/1', 'shutdown', 'end']) await type(page, l);
  await openConsole(page, 'PC-01');
  await type(page, 'arp -a');
  await expect(log(page)).toContainText('No ARP Entries Found.');
});

test('challenge editor can add a config-line, a route and a no-duplicate check, which then pass/fail against the real lab', async ({ page }) => {
  await page.getByTestId('btn-sample2').click();
  await expect(page.getByTestId('lab-name')).toContainText('Inter-VLAN');
  await page.getByTestId('menu-challenge').click();
  await page.getByTestId('challenge-create').click();
  // config-line on R2: the default route exists in the healthy Inter-VLAN lab
  await page.getByTestId('challenge-kind').selectOption('config-line');
  await page.getByTestId('challenge-device').selectOption({ label: 'R2 — Cisco IOS Router' });
  await page.getByTestId('challenge-text').fill('ip route 0.0.0.0 0.0.0.0 10.0.0.1');
  await page.getByTestId('challenge-add').click();
  await page.getByTestId('challenge-kind').selectOption('route');
  await page.getByTestId('challenge-device').selectOption({ label: 'R1 — Cisco IOS Router' });
  await page.getByTestId('challenge-to').fill('172.16.0.0');
  await page.getByTestId('challenge-prefix').fill('24');
  await page.getByTestId('challenge-add').click();
  await page.getByTestId('challenge-kind').selectOption('no-dup-ip');
  await page.getByTestId('challenge-add').click();
  await page.getByTestId('challenge-kind').selectOption('trunk-vlan');
  await page.getByTestId('challenge-vlan').fill('99');
  await page.getByTestId('challenge-add').click(); // first device is R1: a trunk-vlan check on a router port fails honestly
  await page.getByTestId('challenge-edit-toggle').click();
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('challenge-score')).toContainText('3/4');
  await expect(page.getByTestId('check-c1')).toHaveAttribute('data-state', 'pass');
  await expect(page.getByTestId('check-c4')).toHaveAttribute('data-state', 'fail');
  // break the default route: check 1 and the route check on R1 (static next hop still reachable) behave independently
  await page.getByTestId('node-R2').dblclick();
  for (const l of ['enable', 'configure terminal', 'no ip route 0.0.0.0 0.0.0.0 10.0.0.1', 'end']) await type(page, l);
  await page.getByTestId('challenge-check').click();
  await expect(page.getByTestId('check-c1')).toHaveAttribute('data-state', 'fail');
  await expect(page.getByTestId('check-c2')).toHaveAttribute('data-state', 'pass');
});
