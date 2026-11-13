import { expect, test } from '@playwright/test';
import { executeLine } from '../src/core/cli/engine';
import { addLink, createDevice, emptyLab } from '../src/core/lab';
import { serializeExport } from '../src/core/persist';

test('Cisco CDP summary/detail reach the console and a peer shutdown removes the neighbor', async ({ page }) => {
  let lab = emptyLab('CDP console');
  lab.devices = [createDevice('cisco-router', 'r1', 'R1', 100, 100), createDevice('cisco-router', 'r2', 'R2', 400, 100)];
  const linked = addLink(lab, { deviceId: 'r1', port: 'GigabitEthernet0/1' }, { deviceId: 'r2', port: 'GigabitEthernet0/0' });
  expect(linked.error).toBeNull();
  lab = linked.lab;
  for (const [id, port, ip] of [['r1', 'gi0/1', '10.0.12.1'], ['r2', 'gi0/0', '10.0.12.2']]) {
    for (const line of ['enable', 'configure terminal', `interface ${port}`, `ip address ${ip} 255.255.255.252`, 'no shutdown', 'end']) {
      const r = executeLine(lab, id, line); expect(r.ok).toBe(true); lab = r.lab;
    }
  }
  await page.goto('/');
  await page.getByTestId('btn-new').click();
  await page.getByTestId('import-file').setInputFiles({ name: 'cdp.json', mimeType: 'application/json', buffer: Buffer.from(serializeExport(lab)) });
  await expect(page.locator('.react-flow__node')).toHaveCount(2);

  async function command(id: string, line: string) {
    const result = executeLine(lab, id, line);
    expect(result.ok).toBe(true); lab = result.lab;
    await page.getByTestId('console-input').fill(line);
    await page.getByTestId('console-input').press('Enter');
    await expect.poll(() => page.getByTestId('console-log').evaluate((log) => {
      const entries = Array.from(log.querySelectorAll('.cmd:not(.input-line), .out'));
      let i = entries.length - 1;
      while (i >= 0 && !entries[i].classList.contains('cmd')) i--;
      return entries.slice(i + 1).filter((e) => e.classList.contains('out')).map((e) => e.textContent ?? '');
    })).toEqual(result.output);
    return result.output;
  }
  await page.getByTestId('node-R1').dblclick();
  expect(await command('r1', 'show cdp neighbors')).toContain('Total cdp entries displayed : 1');
  expect(await command('r1', 'show cdp neighbors detail')).toContain('  IP address: 10.0.12.2');
  await page.getByTestId('node-R2').dblclick();
  for (const line of ['configure terminal', 'interface gi0/0', 'shutdown', 'end']) await command('r2', line);
  await page.getByTestId('node-R1').dblclick();
  expect(await command('r1', 'show cdp neighbors')).toContain('Total cdp entries displayed : 0');
});
