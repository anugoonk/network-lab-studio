import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { executeLine } from '../src/core/cli/engine';
import { parseImport } from '../src/core/persist';
import type { Lab } from '../src/core/types';

/**
 * Endpoint coverage across a router (follow-up to DEV-01C-1).
 *
 * The topology is built only through the UI (palette, Connect dialog, IP form, router console). The expected terminal
 * output is NOT written by hand: the Lab is exported from the page and the same command is run through the simulator
 * engine (`executeLine`) in Node. The console must show exactly the engine's output lines — so these tests pin the UI to
 * the existing simulation behaviour without restating (or changing) it. A few key facts are also asserted explicitly.
 *
 *   PRN-01 CAM-01 PHN-01 NVR-01 NAS-01 PC-01      192.168.50.0/24, gateway .1
 *        └──────┴──────┴──── SW1 (2960) ───┘
 *                              │ Gi0/1
 *                         R1 Gi0/0 .1      R1 Gi0/1 10.2.2.1 ── PC-02 10.2.2.10/24
 */

const NEW = ['printer', 'ip-camera', 'ip-phone', 'nvr', 'nas'];
const NAMES = ['PRN-01', 'CAM-01', 'PHN-01', 'NVR-01', 'NAS-01'];
const HOSTS = [...NAMES, 'PC-01']; // the five endpoints + the existing PC on the same switch
const IP: Record<string, string> = { 'PRN-01': '192.168.50.11', 'CAM-01': '192.168.50.12', 'PHN-01': '192.168.50.13', 'NVR-01': '192.168.50.14', 'NAS-01': '192.168.50.15', 'PC-01': '192.168.50.20', 'PC-02': '10.2.2.10' };
const GW = '192.168.50.1';
const REMOTE = '10.2.2.10';

test.describe.configure({ mode: 'serial' });

let page: Page;

async function cable(a: string, aPort: string, b: string, bPort: string) {
  await page.getByTestId('btn-connect').click();
  await page.getByTestId('connect-a-device').selectOption({ label: a });
  await page.getByTestId('connect-a-port').selectOption(aPort);
  await page.getByTestId('connect-b-device').selectOption({ label: b });
  await page.getByTestId('connect-b-port').selectOption(bPort);
  await page.getByTestId('connect-submit').click();
  await expect(page.getByTestId('connect-submit')).toHaveCount(0);
}
async function setIp(node: string, ip: string, gw: string) {
  await page.getByTestId(`node-${node}`).click();
  await page.getByTestId('rtab-details').click();
  await page.getByTestId('pc-ip').fill(ip);
  await page.getByTestId('pc-mask').fill('255.255.255.0');
  await page.getByTestId('pc-gw').fill(gw);
  await page.getByTestId('pc-apply').click();
  await expect(page.getByTestId('pc-ip')).toHaveValue(ip);
  await expect(page.getByTestId('pc-gw')).toHaveValue(gw);
}
async function terminal(node: string) {
  await page.getByTestId(`node-${node}`).dblclick();
  await expect(page.getByTestId('console')).toContainText(node);
}
async function typeLines(lines: string[]) {
  for (const l of lines) {
    await page.getByTestId('console-input').fill(l);
    await page.getByTestId('console-input').press('Enter');
  }
}

/** the Lab exactly as the app holds it (Export → parse with the app's own importer) */
async function exportedLab(): Promise<Lab> {
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByTestId('btn-export').click()]);
  const file = path.join(os.tmpdir(), `nls-endpoint-routing-${Date.now()}.json`);
  await d.saveAs(file);
  const parsed = parseImport(fs.readFileSync(file, 'utf8'));
  fs.rmSync(file, { force: true });
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.lab;
}

/** what the simulator engine prints for this command on this device of the given Lab */
function engine(lab: Lab, node: string, line: string): string[] {
  const dev = lab.devices.find((d) => d.name === node)!;
  return executeLine(lab, dev.id, line).output;
}

/** output lines the console shows for its last command */
const shownForLastCommand = () =>
  page.getByTestId('console-log').evaluate((log) => {
    const kids = Array.from(log.querySelectorAll('.cmd:not(.input-line), .out'));
    let i = kids.length - 1;
    while (i >= 0 && !kids[i].classList.contains('cmd')) i--;
    return kids.slice(i + 1).filter((k) => k.classList.contains('out')).map((k) => k.textContent ?? '');
  });

/** runs `line` in the open terminal and requires the console to show exactly the engine's output */
async function runExact(lab: Lab, node: string, line: string): Promise<string[]> {
  const want = engine(lab, node, line);
  expect(want.length, `engine output for ${node}: ${line}`).toBeGreaterThan(0);
  await page.getByTestId('console-input').fill(line);
  await page.getByTestId('console-input').press('Enter');
  await expect.poll(shownForLastCommand, { message: `${node}: ${line}`, timeout: 15000 }).toEqual(want);
  return want;
}

let lab: Lab;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180000);
  page = await browser.newPage();
  await page.goto('/');
  await expect(page.getByTestId('node-PC-01')).toBeVisible();
  await page.getByTestId('btn-new').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  await page.getByTestId('menu-add').click();
  await expect(page.getByTestId('device-bar')).toBeVisible();
  for (const k of [...NEW, 'pc', 'pc', 'cisco-switch', 'cisco-router']) await page.getByTestId(`palette-${k}`).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(9);
  for (let i = 0; i < 5; i++) await cable(NAMES[i], 'Ethernet0', 'SW1', `FastEthernet0/${i + 1}`);
  await cable('PC-01', 'Ethernet0', 'SW1', 'FastEthernet0/6');
  await cable('R1', 'GigabitEthernet0/0', 'SW1', 'GigabitEthernet0/1');
  await cable('PC-02', 'Ethernet0', 'R1', 'GigabitEthernet0/1');
  await expect(page.locator('.react-flow__edge')).toHaveCount(8);
  for (const n of HOSTS) await setIp(n, IP[n], GW);
  await setIp('PC-02', IP['PC-02'], '10.2.2.1');
  await terminal('R1');
  await typeLines(['enable', 'configure terminal', 'interface GigabitEthernet0/0', `ip address ${GW} 255.255.255.0`, 'no shutdown', 'exit',
    'interface GigabitEthernet0/1', 'ip address 10.2.2.1 255.255.255.0', 'no shutdown', 'end']);
  await expect(page.getByTestId('console-prompt')).toHaveText('R1#');
  lab = await exportedLab();
  // the exported Lab is what the UI built: 9 devices, 8 links, router interfaces configured
  expect(lab.devices.map((d) => d.name).sort()).toEqual([...HOSTS, 'PC-02', 'R1', 'SW1'].sort());
  expect(lab.links).toHaveLength(8);
});

test.afterAll(async () => {
  await page?.close();
});

test('ping across the router from each new endpoint (and PC-01): replies from the remote PC, output identical to the engine', async () => {
  for (const n of HOSTS) {
    await terminal(n);
    const out = await runExact(lab, n, `ping ${REMOTE}`);
    const text = out.join('\n');
    expect(text, n).toContain(`Reply from ${REMOTE}`);
    expect(text, n).not.toMatch(/Request timed out|unreachable|General failure/);
  }
  // and back: the remote PC reaches every endpoint through the router
  await terminal('PC-02');
  for (const n of NAMES) expect((await runExact(lab, 'PC-02', `ping ${IP[n]}`)).join('\n'), n).toContain(`Reply from ${IP[n]}`);
});

test('tracert across the router: first hop is the default gateway, last hop is the destination', async () => {
  for (const n of HOSTS) {
    await terminal(n);
    const out = await runExact(lab, n, `tracert ${REMOTE}`);
    const hops = out.filter((l) => /^\s*\d+\s/.test(l));
    expect(hops, `${n} hop lines`).toHaveLength(2);
    expect(hops[0], n).toMatch(new RegExp(`^\\s*1\\s.*\\b${GW.replace(/\./g, '\\.')}\\b`));
    expect(hops[1], n).toMatch(new RegExp(`^\\s*2\\s.*\\b${REMOTE.replace(/\./g, '\\.')}\\b`));
    expect(out.join('\n'), n).toContain('Trace complete');
  }
  // same subnet: a single hop, no router in the path
  await terminal('CAM-01');
  const local = await runExact(lab, 'CAM-01', `tracert ${IP['PC-01']}`);
  expect(local.filter((l) => /^\s*\d+\s/.test(l))).toHaveLength(1);
  expect(local.join('\n')).not.toContain(GW);
});

test('arp -a after communicating: gateway and the local peer are listed, the remote host is not; identical to the engine', async () => {
  for (const n of HOSTS) {
    await terminal(n);
    await runExact(lab, n, `ping ${REMOTE}`);
    await runExact(lab, n, `ping ${n === 'PC-01' ? IP['PRN-01'] : IP['PC-01']}`);
    const out = await runExact(lab, n, 'arp -a');
    const text = out.join('\n');
    expect(text, n).toContain(`Interface: ${IP[n]}`);
    expect(text, n).toContain(GW);
    expect(text, n).toContain(n === 'PC-01' ? IP['PRN-01'] : IP['PC-01']);
    expect(text, n).not.toContain(REMOTE); // a host behind the router is never an ARP neighbour
    // own address appears only in the Interface header, never as a neighbour row
    expect(out.filter((l) => l.trim().startsWith(IP[n] + ' ')), n).toEqual([]);
  }
});

test('missing default gateway: remote ping fails with "General failure", tracert cannot leave the subnet, local ping still works', async () => {
  await setIp('NAS-01', IP['NAS-01'], '');
  const noGw = await exportedLab();
  expect(noGw.devices.find((d) => d.name === 'NAS-01')!.gateway ?? '').toBe(''); // the form really cleared it
  expect(noGw.devices.find((d) => d.name === 'PRN-01')!.gateway).toBe(GW);
  await terminal('NAS-01');
  const ping = (await runExact(noGw, 'NAS-01', `ping ${REMOTE}`)).join('\n');
  expect(ping).toContain('PING: transmit failed. General failure.');
  expect(ping).not.toContain(`Reply from ${REMOTE}`);
  const trace = (await runExact(noGw, 'NAS-01', `tracert ${REMOTE}`)).join('\n');
  expect(trace).not.toContain(GW);
  expect(trace).not.toMatch(new RegExp(`Reply from ${REMOTE}|\\b2\\s.*${REMOTE.replace(/\./g, '\\.')}`));
  expect((await runExact(noGw, 'NAS-01', `ping ${IP['PC-01']}`)).join('\n')).toContain(`Reply from ${IP['PC-01']}`);
  const ipconfig = await runExact(noGw, 'NAS-01', 'ipconfig');
  expect(ipconfig.join('\n')).toContain(IP['NAS-01']);
  const gwLine = ipconfig.find((l) => l.includes('Default Gateway'))!;
  expect(gwLine.split(':').pop()!.trim()).toBe(''); // empty gateway field
  // the other endpoints keep their gateway and still reach the remote PC
  await terminal('PRN-01');
  expect((await runExact(noGw, 'PRN-01', `ping ${REMOTE}`)).join('\n')).toContain(`Reply from ${REMOTE}`);
  // restore for any later test in this file
  await setIp('NAS-01', IP['NAS-01'], GW);
});

test('existing PC behaviour is unchanged: PC-01 ipconfig / ping / tracert / arp match the engine, and the endpoints print the same format', async () => {
  const now = await exportedLab();
  await terminal('PC-01');
  const pcIpconfig = await runExact(now, 'PC-01', 'ipconfig');
  expect(pcIpconfig.join('\n')).toContain(IP['PC-01']);
  const pcPing = await runExact(now, 'PC-01', `ping ${REMOTE}`);
  const pcTrace = await runExact(now, 'PC-01', `tracert ${REMOTE}`);
  await runExact(now, 'PC-01', 'arp -a');
  await runExact(now, 'PC-01', 'ping 192.168.50.99'); // nobody there: whatever the engine reports, the UI shows
  // an endpoint's output is the PC's output with only its own address different (same Windows-style terminal)
  await terminal('PRN-01');
  const prnPing = await runExact(now, 'PRN-01', `ping ${REMOTE}`);
  const prnTrace = await runExact(now, 'PRN-01', `tracert ${REMOTE}`);
  expect(prnPing).toEqual(pcPing);
  expect(prnTrace).toEqual(pcTrace);
  const prnIpconfig = await runExact(now, 'PRN-01', 'ipconfig');
  expect(prnIpconfig.map((l) => l.replace(IP['PRN-01'], 'X'))).toEqual(pcIpconfig.map((l) => l.replace(IP['PC-01'], 'X')));
});
