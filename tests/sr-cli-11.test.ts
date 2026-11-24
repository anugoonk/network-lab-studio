/**
 * SR-CLI-11 (OD-2026-11-24-SR-CLI-11): Cisco IOS management configuration — line console / vty, username, banner, erase, reload.
 * Configuration only (no login is enforced); credentials are stored as derived values only; reload is a session-level simulation.
 * Everything runs through the real `executeLine` / persistence code.
 */
import { describe, expect, it } from 'vitest';
import { CONFIRM_PROMPT, completeLine, executeLine, helpFor, promptFor, type ExecResult } from '../src/core/cli/engine';
import { ciscoRunningConfig } from '../src/core/cli/cisco';
import { classifyLine } from '../src/core/cli/redact';
import { addDevice, emptyLab, getDevice } from '../src/core/lab';
import { buildCampusLab, buildSampleLab } from '../src/core/sample';
import { STORAGE_KEY, WORKSPACE_KEY, loadStored, parseImport, saveStored, saveWorkspace, serializeExport, validateLab } from '../src/core/persist';
import { TYPE5_RE } from '../src/core/secret';
import { tokenOf, type5FromToken } from '../src/core/mgmt';
import type { DeviceKind, Lab } from '../src/core/types';

class T {
  lab: Lab = emptyLab('sr-cli-11');
  id = '';
  outs: ExecResult[] = [];
  constructor(kind: DeviceKind = 'cisco-router') {
    const r = addDevice(this.lab, kind, 0, 0);
    this.lab = r.lab;
    this.id = r.device.id;
  }
  get dev() { return getDevice(this.lab, this.id)!; }
  run(line: string) {
    const r = executeLine(this.lab, this.id, line);
    this.lab = r.lab;
    this.outs.push(r);
    return r;
  }
  runAll(...lines: string[]) { return lines.map((l) => this.run(l)); }
  conf(...lines: string[]) { this.runAll('enable', 'configure terminal', ...lines); return this; }
  running() { return ciscoRunningConfig(this.dev); }
  /** everything the learner or a file could ever see */
  visible() {
    return JSON.stringify({ lab: this.lab, export: serializeExport(this.lab), out: this.outs.map((o) => [o.output, o.echo ?? null, o.hintTh ?? null, o.prompt]) });
  }
}

describe('SR-CLI-11 line console / vty', () => {
  it('enters and leaves line mode with the right prompt; end and exit work', () => {
    const t = new T().conf('line console 0');
    expect(t.dev.cli.mode).toBe('config-line');
    expect(promptFor(t.dev)).toBe(`${t.dev.name}(config-line)#`);
    t.run('exit');
    expect(t.dev.cli.mode).toBe('config');
    expect(t.dev.cli.ctxLine).toBeUndefined();
    t.runAll('line vty 0 4', 'end');
    expect(t.dev.cli.mode).toBe('priv');
    expect(t.dev.cli.ctxLine).toBeUndefined();
  });

  it('accepts abbreviations and the vty 0 4 / 0 15 ranges, and rejects other lines and ranges', () => {
    const t = new T().conf();
    expect(t.run('line con 0').ok).toBe(true);
    expect(t.run('line vty 0 15').ok).toBe(true);
    expect(t.dev.cli.ctxLine).toBe('vty015');
    t.run('exit');
    for (const bad of ['line vty 0 5', 'line vty 1 4', 'line console 1', 'line aux 0', 'line vty', 'line vty 0 4 9']) {
      const r = t.run(bad);
      expect(r.ok, bad).toBe(false);
      expect(t.dev.cli.mode, bad).toBe('config');
    }
  });

  it('switches directly from one line to another', () => {
    const t = new T().conf('line console 0', 'password aaa', 'line vty 0 4', 'password bbb');
    expect(t.dev.cli.ctxLine).toBe('vty04');
    expect(t.dev.mgmt?.console?.password).toBeDefined();
    expect(t.dev.mgmt?.vty04?.password).toBeDefined();
    expect(t.dev.mgmt?.console?.password).not.toBe(t.dev.mgmt?.vty04?.password);
  });

  it('stores password, login, login local, transport and exec-timeout and shows them in IOS order', () => {
    const t = new T().conf('line console 0', 'password cisco', 'login', 'exec-timeout 5 30', 'exit', 'line vty 0 4', 'password cisco2', 'login local', 'transport input ssh', 'exec-timeout 0');
    const rc = t.running();
    const at = rc.indexOf('line con 0');
    expect(at).toBeGreaterThan(0);
    expect(rc.slice(at, at + 5)).toEqual(['line con 0', ' exec-timeout 5 30', expect.stringMatching(/^ password 7 \S+$/), ' login', '!']);
    const v = rc.indexOf('line vty 0 4');
    expect(rc.slice(v, v + 6)).toEqual(['line vty 0 4', ' exec-timeout 0 0', expect.stringMatching(/^ password 7 \S+$/), ' login local', ' transport input ssh', '!']);
    expect(rc[rc.length - 1]).toBe('end');
    expect(rc.indexOf('line con 0')).toBeLessThan(rc.indexOf('end'));
  });

  it('replaces a setting and removes it with the no forms; an emptied configuration leaves the device in its original shape', () => {
    const t = new T().conf('line vty 0 4', 'login', 'login local', 'transport input telnet', 'transport input none', 'exec-timeout 3', 'exec-timeout 4 5', 'password a', 'password b');
    expect(t.dev.mgmt?.vty04).toMatchObject({ login: 'local', transport: 'none', execTimeout: { min: 4, sec: 5 } });
    t.runAll('no login', 'no password', 'no exec-timeout');
    expect(t.dev.mgmt?.vty04).toEqual({ transport: 'none' });
    expect(t.run('no login').ok).toBe(true); // idempotent
    t.run('transport input all');
    expect(t.dev.mgmt?.vty04?.transport).toBe('all');
    // remove the only remaining setting: back to no mgmt at all
    const u = new T().conf('line console 0', 'login', 'no login');
    expect(u.dev.mgmt).toBeUndefined();
  });

  it('exec-timeout default (10 0) is not shown; invalid values are rejected without changing the device', () => {
    const t = new T().conf('line console 0', 'exec-timeout 10 0');
    expect(t.dev.mgmt).toBeUndefined();
    for (const bad of ['exec-timeout 99999', 'exec-timeout 35792', 'exec-timeout 1 2147484', 'exec-timeout -1', 'exec-timeout 1.5', 'exec-timeout abc', 'exec-timeout 1 2 3']) {
      expect(t.run(bad).ok, bad).toBe(false);
    }
    expect(t.dev.mgmt).toBeUndefined();
    expect(t.run('exec-timeout 35791 2147483').ok).toBe(true);
  });

  it('transport is refused on the console line and does not change anything', () => {
    const t = new T().conf('line console 0');
    const r = t.run('transport input ssh');
    expect(r.ok).toBe(false);
    expect(r.output.join('\n')).toContain('vty');
    expect(t.dev.mgmt).toBeUndefined();
  });

  it('line commands are not available outside line mode, and global commands are not available inside it', () => {
    const t = new T().conf();
    expect(t.run('login').ok).toBe(false);
    expect(t.run('transport input ssh').ok).toBe(false);
    t.run('line vty 0 4');
    expect(t.run('hostname X').ok).toBe(false);
    expect(t.run('interface gi0/0').ok).toBe(false);
    expect(t.dev.mgmt).toBeUndefined();
  });

  it('do show running-config works inside line mode and keeps the mode', () => {
    const t = new T().conf('line vty 0 4', 'login');
    const r = t.run('do show running-config');
    expect(r.ok).toBe(true);
    expect(r.output.join('\n')).toContain('line vty 0 4');
    expect(t.dev.cli.mode).toBe('config-line');
    expect(t.dev.cli.ctxLine).toBe('vty04');
  });

  it('? and Tab work in line mode', () => {
    const t = new T().conf('line vty 0 4');
    const h = helpFor(t.dev, '?').join('\n');
    for (const w of ['password', 'login', 'transport', 'exec-timeout', 'exit', 'end']) expect(h).toContain(w);
    expect(completeLine(t.dev, 'transp').value).toBe('transport ');
    expect(completeLine(t.dev, 'transport input s').value).toBe('transport input ssh ');
  });

  it('works on switches and routers alike', () => {
    for (const kind of ['cisco-switch', 'cisco-router', 'isp-router'] as DeviceKind[]) {
      const t = new T(kind).conf('line vty 0 15', 'password x', 'login');
      expect(t.running()).toContain('line vty 0 15');
    }
  });
});

describe('SR-CLI-11 username', () => {
  it('stores each form as a derived value and prints the IOS form', () => {
    const t = new T().conf(
      'username a1 secret Pw-One', 'username a2 secret 0 Pw-Two', 'username a3 privilege 15 secret Pw-Three',
      'username a4 password Pw-Four', 'username a5 privilege 7 password 0 Pw-Five',
    );
    const lines = t.running().filter((l) => l.startsWith('username'));
    expect(lines).toHaveLength(5);
    expect(lines[0]).toMatch(/^username a1 secret 5 \$1\$[./0-9A-Za-z]{1,8}\$[./0-9A-Za-z]{22}$/);
    expect(lines[2]).toMatch(/^username a3 privilege 15 secret 5 \$1\$/);
    expect(lines[3]).toMatch(/^username a4 password 7 [./0-9A-Za-z]{23,30}$/);
    expect(lines[4]).toMatch(/^username a5 privilege 7 password 7 /);
    for (const u of t.dev.security!.users!) expect(TYPE5_RE.test(u.secret ?? u.password!)).toBe(true);
    expect(t.running().indexOf(lines[0])).toBeLessThan(t.running().findIndex((l) => l.startsWith('interface')));
  });

  it('accepts a type 5 hash and a password 7 token exactly as printed, and they round-trip', () => {
    const t = new T().conf('username a secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0', 'username b password Pw-B');
    const [a, b] = t.running().filter((l) => l.startsWith('username'));
    expect(a).toBe('username a secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0');
    const token = b.split(' ').pop()!;
    expect(type5FromToken(token)).toBe(t.dev.security!.users![1].password);
    expect(tokenOf(type5FromToken(token)!)).toBe(token);
    const u = new T().conf(`username c password 7 ${token}`);
    expect(u.dev.security!.users![0].password).toBe(t.dev.security!.users![1].password);
  });

  it('replaces an existing user, removes it with no username, and restores the original shape', () => {
    const t = new T().conf('username a secret one', 'username b secret two', 'username a privilege 15 secret three');
    expect(t.dev.security!.users!.map((u) => [u.name, u.privilege])).toEqual([['a', 15], ['b', undefined]]);
    expect(t.run('no username zzz').ok).toBe(false);
    t.runAll('no username a', 'no username b');
    expect(t.dev.security).toBeUndefined();
  });

  it('keeps the enable secret when users are removed and the users when the enable secret is removed', () => {
    const t = new T().conf('enable secret en1', 'username a secret one');
    t.run('no enable secret');
    expect(t.dev.security?.enableSecret).toBeUndefined();
    expect(t.dev.security?.users).toHaveLength(1);
    t.run('enable secret en2');
    t.run('no username a');
    expect(t.dev.security?.enableSecret).toMatch(TYPE5_RE);
    expect(t.dev.security?.users).toBeUndefined();
  });

  it('rejects invalid names, levels and hashes; nothing is stored', () => {
    const t = new T().conf();
    for (const bad of [
      'username bad/name secret x', 'username <b> secret x', `username ${'n'.repeat(33)} secret x`, 'username a privilege 16 secret x',
      'username a privilege -1 secret x', 'username a privilege x secret x', 'username a secret 5 notahash', 'username a password 7 short',
      'username a secret', 'username a', `username a secret ${'p'.repeat(65)}`, 'username a secret ********',
    ]) expect(t.run(bad).ok, bad).toBe(false);
    expect(t.dev.security).toBeUndefined();
  });

  it('is limited to 50 users', () => {
    const t = new T().conf();
    for (let i = 0; i < 50; i++) expect(t.run(`username u${i} secret x`).ok).toBe(true);
    expect(t.run('username u50 secret x').ok).toBe(false);
    expect(t.run('username u0 secret y').ok).toBe(true); // replacing is still fine
    expect(t.dev.security!.users).toHaveLength(50);
  });
});

describe('SR-CLI-11 banners', () => {
  it('sets, replaces and removes motd and login banners; the running-config shows them with ^C', () => {
    const t = new T().conf('banner motd #Authorized only#', 'banner login $Login here$');
    expect(t.running()).toContain('banner motd ^CAuthorized only^C');
    expect(t.running()).toContain('banner login ^CLogin here^C');
    t.run('banner motd %New text%');
    expect(t.dev.mgmt?.banners?.motd).toBe('New text');
    t.runAll('no banner motd', 'no banner login');
    expect(t.dev.mgmt).toBeUndefined();
  });

  it('keeps text with spaces and the other delimiter characters intact', () => {
    const t = new T().conf('banner motd #  keep   spacing # and $ more#'.replace(' and $ more#', ''));
    expect(t.dev.mgmt?.banners?.motd).toBe('  keep   spacing ');
    const u = new T().conf('banner motd ^hello # world^');
    expect(u.dev.mgmt?.banners?.motd).toBe('hello # world');
  });

  it('rejects a bad delimiter, missing closing delimiter, trailing text, empty and over-long text', () => {
    const t = new T().conf();
    for (const bad of ['banner motd', 'banner motd hello', 'banner motd 5hi5', 'banner motd #open', 'banner motd ##', 'banner motd #  #', 'banner motd #a# trailing', `banner motd #${'x'.repeat(501)}#`]) {
      expect(t.run(bad).ok, bad).toBe(false);
    }
    expect(t.dev.mgmt).toBeUndefined();
    expect(t.run(`banner motd #${'x'.repeat(500)}#`).ok).toBe(true);
  });

  it('treats script-looking text as inert plain text: it is only ever data in strings', () => {
    const t = new T().conf('banner motd #<script>alert(1)</script><img src=x onerror=alert(1)>#');
    expect(t.dev.mgmt?.banners?.motd).toBe('<script>alert(1)</script><img src=x onerror=alert(1)>');
    const out = t.run('do show running-config').output.join('\n');
    expect(out).toContain('<script>alert(1)</script>');
    // survives a save / reload as the same plain text
    const back = parseImport(serializeExport(t.lab));
    expect(back.ok && back.lab.devices[0].mgmt?.banners?.motd).toBe('<script>alert(1)</script><img src=x onerror=alert(1)>');
  });

  it('handles unicode and ^C text, and banner text is free text for the redactor (not masked)', () => {
    const t = new T().conf('banner login #ยินดีต้อนรับ — ห้ามบุกรุก ^C#');
    expect(t.dev.mgmt?.banners?.login).toBe('ยินดีต้อนรับ — ห้ามบุกรุก ^C');
    const r = t.run('banner motd #password policy applies#');
    expect(r.echo).toBeUndefined();
  });
});

describe('SR-CLI-11 erase', () => {
  it('asks for confirmation; yes (or Enter) clears the startup-config only, n cancels', () => {
    const t = new T().conf('hostname EZ');
    t.runAll('end', 'write memory');
    expect(t.dev.startupConfig).toContain('hostname EZ');
    const q = t.run('erase startup-config');
    expect(q.output.join('\n')).toContain('nvram');
    expect(t.dev.cli.pending).toMatchObject({ kind: 'confirm', action: 'erase' });
    expect(promptFor(t.dev)).toBe(CONFIRM_PROMPT.erase);
    const no = t.run('n');
    expect(no.ok).toBe(true);
    expect(t.dev.cli.pending).toBeUndefined();
    expect(t.dev.startupConfig).toContain('hostname EZ');
    t.run('write erase');
    const yes = t.run('');
    expect(yes.output).toContain('[OK]');
    expect(t.dev.startupConfig).toBeNull();
    expect(t.run('show startup-config').output.join('\n')).toContain('startup-config is not present');
    // running-config untouched, repeat is harmless
    expect(t.dev.name).toBe('EZ');
    expect(t.running()).toContain('hostname EZ');
    t.run('erase startup-config');
    t.run('yes');
    expect(t.dev.startupConfig).toBeNull();
  });

  it('any unexpected answer cancels and is not echoed or kept', () => {
    const t = new T().conf();
    t.runAll('end', 'write memory', 'erase startup-config');
    const r = t.run('SuperSecretText123');
    expect(r.echo).toBe('');
    expect(t.dev.startupConfig).not.toBeNull();
    expect(t.visible()).not.toContain('SuperSecretText123');
    expect(t.dev.cli.history).not.toContain('SuperSecretText123');
  });

  it('is available in Privileged EXEC only', () => {
    const t = new T();
    expect(t.run('erase startup-config').ok).toBe(false); // user EXEC
    t.conf();
    expect(t.run('erase startup-config').ok).toBe(false); // global config
    expect(t.run('write erase').ok).toBe(false);
  });

  it('does not touch the topology or other devices', () => {
    const lab = buildSampleLab();
    const id = lab.devices.find((d) => d.kind === 'cisco-switch')!.id;
    const other = lab.devices.filter((d) => d.id !== id).map((d) => JSON.stringify(d));
    let cur = lab;
    for (const l of ['enable', 'write memory', 'erase startup-config', 'y']) cur = executeLine(cur, id, l).lab;
    expect(cur.links).toEqual(lab.links);
    expect(cur.devices.filter((d) => d.id !== id).map((d) => JSON.stringify(d))).toEqual(other);
  });
});

describe('SR-CLI-11 reload (session-level simulation)', () => {
  it('asks for confirmation, resets the session to User EXEC and keeps the running-config', () => {
    const t = new T().conf('hostname RL', 'banner motd #hello motd#', 'interface gi0/0', 'ip address 10.0.0.1 255.255.255.0');
    t.run('end');
    const before = JSON.stringify({ ...t.dev, cli: undefined });
    const q = t.run('reload');
    expect(q.ok).toBe(true);
    expect(t.dev.cli.pending).toMatchObject({ kind: 'confirm', action: 'reload' });
    expect(promptFor(t.dev)).toBe(CONFIRM_PROMPT.reload);
    const r = t.run('');
    expect(r.output.join('\n')).toContain('NOT discarded');
    expect(r.output.join('\n')).toContain('hello motd');
    expect(t.dev.cli.mode).toBe('user');
    expect(t.dev.cli.pending).toBeUndefined();
    expect(promptFor(t.dev)).toBe('RL>');
    expect(JSON.stringify({ ...t.dev, cli: undefined })).toBe(before);
  });

  it('says that unsaved changes are kept here but would be lost on a real device', () => {
    const t = new T().conf('hostname A');
    t.runAll('end', 'write memory', 'configure terminal', 'hostname B', 'end');
    const r = (t.run('reload'), t.run('y'));
    expect(r.output.join('\n')).toContain('unsaved changes are kept');
    expect(t.dev.name).toBe('B');
    expect(t.dev.startupConfig).toContain('hostname A');
  });

  it('clears interface, VLAN and line context, and the answer n cancels', () => {
    const t = new T().conf('line vty 0 4', 'login');
    t.run('do reload');
    t.run('n');
    expect(t.dev.cli.mode).toBe('config-line');
    t.run('end');
    t.runAll('reload', 'yes');
    expect(t.dev.cli.ctxLine).toBeUndefined();
    expect(t.dev.cli.ctxIface).toBeNull();
    expect(t.dev.mgmt?.vty04?.login).toBe('login');
  });

  it('a reload and an erase together leave the running-config intact (no startup replay)', () => {
    const t = new T().conf('hostname KEEP');
    t.runAll('end', 'write memory', 'erase startup-config', 'y', 'reload', 'y');
    expect(t.dev.name).toBe('KEEP');
    expect(t.dev.startupConfig).toBeNull();
  });

  it('is rejected on Aruba and PC; erase too', () => {
    const lab = buildCampusLab();
    const aruba = lab.devices.find((d) => d.kind === 'aruba-switch');
    const pc = lab.devices.find((d) => d.kind === 'pc');
    for (const d of [aruba, pc]) {
      if (!d) continue;
      for (const l of ['reload', 'erase startup-config', 'line vty 0 4', 'username a secret b', 'banner motd #x#']) {
        const r = executeLine(lab, d.id, l);
        expect(r.ok, `${d.kind}: ${l}`).toBe(false);
        expect(r.lab.devices.find((x) => x.id === d.id)!.mgmt).toBeUndefined();
        expect(r.lab.devices.find((x) => x.id === d.id)!.cli.pending).toBeUndefined();
      }
    }
  });
});

describe('SR-CLI-11 credentials never appear in clear text', () => {
  const PW = 'Zx9QmPw-7Lk';
  const forms = [
    `username u1 secret ${PW}`, `username u2 secret 0 ${PW}`, `username u3 privilege 15 secret ${PW}`, `username u4 password ${PW}`,
    `username u5 password 0 ${PW}`, `username u6 privilege 3 password ${PW}`,
  ];
  const lineForms = [`password ${PW}`, `password 0 ${PW}`];

  it('is absent from the Lab, history, transcript echoes, error text, running-config, startup-config and export file', () => {
    for (const where of ['console', 'vty']) {
      const t = new T().conf(...forms);
      t.run(where === 'console' ? 'line console 0' : 'line vty 0 4');
      for (const f of lineForms) t.run(f);
      t.runAll('end', 'write memory', 'show running-config', 'show startup-config');
      const everything = t.visible() + JSON.stringify(t.running()) + (t.dev.startupConfig ?? '');
      expect(everything).not.toContain(PW);
      expect(everything).not.toMatch(/Zx9Qm/);
    }
  });

  it('is absent from the error output and hint of a rejected command that carried it', () => {
    const t = new T().conf();
    const lines = [`username a privilege 99 secret ${PW}`, `username bad/x secret ${PW}`, `username a secret 5 ${PW}`, `username a password 7 ${PW}`, `usernme a secret ${PW}`, `username a secrte ${PW}`];
    for (const l of lines) t.run(l);
    t.run('line vty 0 4');
    t.run(`pasword ${PW}`);
    t.run(`password 7 ${PW}`);
    expect(t.visible()).not.toContain(PW);
    for (const h of t.dev.cli.history) expect(h).not.toContain(PW);
  });

  it('is masked by the redactor in every new form, with and without privilege and do/no prefixes', () => {
    for (const l of [...forms, ...lineForms, `do ${forms[0]}`, `no ${lineForms[0]}`, `username x secret 5 $1$abcd$abcdefghijklmnopqrstuv`, 'username x password 7 abcdefghijklmnopqrstuvwxyz']) {
      const r = classifyLine('cisco', l);
      expect(r.masked, l).toBe(true);
      expect(r.shown, l).not.toContain(PW);
      expect(r.shown, l).not.toMatch(/abcdefghijklmnopqrstuv/);
    }
  });

  it('the history of a recalled masked line cannot become a credential', () => {
    const t = new T().conf('username a secret hist1', 'line vty 0 4');
    expect(t.dev.cli.history.some((h) => h.includes('hist1'))).toBe(false);
    const masked = t.dev.cli.history.find((h) => h.startsWith('username a'))!;
    expect(masked).toContain('********');
    expect(t.run('password ********').ok).toBe(false);
    t.run('exit');
    expect(t.run(masked).ok).toBe(false);
    expect(t.dev.security?.users).toHaveLength(1);
  });

  it('is absent from storage written by saveStored / saveWorkspace', () => {
    const t = new T().conf(...forms, 'line vty 0 4', ...lineForms, 'banner motd #hi#');
    const store: Record<string, string> = {};
    const storage = { setItem: (k: string, v: string) => { store[k] = v; }, getItem: (k: string) => store[k] ?? null };
    saveStored({ lab: t.lab, savedSig: null }, storage);
    saveWorkspace({ activeId: 'a', entries: [{ id: 'a', lab: t.lab, savedSig: null, updatedAt: 0 }] } as never, storage);
    expect(JSON.stringify(store)).not.toContain(PW);
    expect(Object.keys(store)).toContain(STORAGE_KEY);
    expect(Object.keys(store)).toContain(WORKSPACE_KEY);
  });
});

describe('SR-CLI-11 persistence and compatibility', () => {
  const full = () =>
    new T('cisco-switch').conf(
      'username admin privilege 15 secret s3cret', 'username op password p4ss', 'banner motd #Hi there#', 'banner login #Login#',
      'line console 0', 'password c0n', 'login', 'exec-timeout 5 30', 'exit', 'line vty 0 15', 'password vty', 'login local', 'transport input ssh', 'end', 'write memory',
    );

  it('round-trips through export and import with identical management data', () => {
    const t = full();
    const back = parseImport(serializeExport(t.lab));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    const d = back.lab.devices[0];
    expect(d.mgmt).toEqual(t.dev.mgmt);
    expect(d.security).toEqual(t.dev.security);
    expect(ciscoRunningConfig(d)).toEqual(t.running());
  });

  it('round-trips through saveStored / loadStored', () => {
    const t = full();
    const store: Record<string, string> = {};
    const storage = { setItem: (k: string, v: string) => { store[k] = v; }, getItem: (k: string) => store[k] ?? null };
    saveStored({ lab: t.lab, savedSig: null }, storage);
    const got = loadStored(storage);
    expect(got?.lab.devices[0].mgmt).toEqual(t.dev.mgmt);
    expect(got?.lab.devices[0].security).toEqual(t.dev.security);
  });

  it('labs without management data are byte-identical before and after (no new keys appear)', () => {
    const lab = buildCampusLab();
    const out = serializeExport(lab);
    expect(out).not.toMatch(/"mgmt"|"users"|"ctxLine"/);
    const r = parseImport(out);
    expect(r.ok && JSON.stringify(r.lab)).toBe(JSON.stringify(lab));
  });

  it('a device saved while in line mode is saved in global config (an older build knows no config-line mode) and has no ctxLine', () => {
    const t = new T().conf('line vty 0 4', 'login');
    expect(t.dev.cli.mode).toBe('config-line');
    const text = serializeExport(t.lab);
    expect(text).not.toContain('config-line');
    expect(text).not.toContain('ctxLine');
    const r = parseImport(text);
    expect(r.ok && r.lab.devices[0].cli.mode).toBe('config');
    expect(r.ok && r.lab.devices[0].mgmt?.vty04?.login).toBe('login');
    // the same for the challenge start snapshot
    const lab: Lab = { ...t.lab, challenge: { title: 'x', goal: 'y', checks: [], start: { devices: t.lab.devices, links: [], counters: {} } } };
    const s = serializeExport(lab);
    expect(s).not.toContain('config-line');
    expect(parseImport(s).ok).toBe(true);
  });

  it('a pending erase / reload prompt is never saved', () => {
    const t = new T().conf();
    t.runAll('end', 'reload');
    expect(t.dev.cli.pending).toBeDefined();
    const text = serializeExport(t.lab);
    expect(text).not.toContain('"pending"');
    const r = parseImport(text);
    expect(r.ok && r.lab.devices[0].cli.pending).toBeUndefined();
  });

  it('rejects invalid saved values instead of loading them', () => {
    const base = JSON.parse(serializeExport(full().lab));
    const bad = (mut: (d: Record<string, any>) => void) => {
      const c = structuredClone(base);
      mut(c.lab.devices[0]);
      return validateLab(c.lab).ok;
    };
    expect(bad(() => undefined)).toBe(true);
    expect(bad((d) => { d.mgmt.vty015.password = 'clear-text'; })).toBe(false);
    expect(bad((d) => { d.mgmt.vty015.transport = 'rsh'; })).toBe(false);
    expect(bad((d) => { d.mgmt.vty015.login = 'none'; })).toBe(false);
    expect(bad((d) => { d.mgmt.console.execTimeout = { min: -1, sec: 0 }; })).toBe(false);
    expect(bad((d) => { d.mgmt.console.execTimeout = { min: 1, sec: 2147484 }; })).toBe(false);
    expect(bad((d) => { d.mgmt.banners.motd = 'a\nb'; })).toBe(false);
    expect(bad((d) => { d.mgmt.banners.motd = ''; })).toBe(false);
    expect(bad((d) => { d.mgmt.banners.motd = 'x'.repeat(501); })).toBe(false);
    expect(bad((d) => { d.security.users[0].name = 'bad name'; })).toBe(false);
    expect(bad((d) => { d.security.users[0].privilege = 16; })).toBe(false);
    expect(bad((d) => { d.security.users[0].secret = 'plain'; })).toBe(false);
    expect(bad((d) => { delete d.security.users[0].secret; })).toBe(false);
    expect(bad((d) => { d.security.users = Array.from({ length: 51 }, (_, i) => ({ name: `u${i}`, secret: d.security.users[0].secret })); })).toBe(false);
  });

  it('ignores unknown extra fields the way every zod object here does, and refuses management data on a non-Cisco device', () => {
    const base = JSON.parse(serializeExport(full().lab));
    const c = structuredClone(base);
    c.lab.devices[0].mgmt.future = { x: 1 };
    c.lab.devices[0].mgmt.vty04 = { login: 'login', extra: true };
    const r = validateLab(c.lab);
    expect(r.ok).toBe(true);
    expect(r.ok && JSON.stringify(r.lab)).not.toContain('future');
    const camp = JSON.parse(serializeExport(new T('aruba-switch').lab));
    const aruba = camp.lab.devices[0];
    aruba.mgmt = { console: { login: 'login' } };
    expect(validateLab(camp.lab).ok).toBe(false);
    delete aruba.mgmt;
    aruba.security = { users: [{ name: 'a', secret: '$1$abcd$abcdefghijklmnopqrstuv' }] };
    expect(validateLab(camp.lab).ok).toBe(false);
  });

  it('the downgrade shape: removing mgmt and users from a saved Lab leaves a valid older-format Lab with everything else', () => {
    // this is what an older build keeps when it drops the unknown optional fields (the old-build drop is also exercised end to end in the cross-version harness)
    const c = JSON.parse(serializeExport(full().lab));
    delete c.lab.devices[0].mgmt;
    delete c.lab.devices[0].security.users;
    const r = validateLab(c.lab);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.lab.devices[0].mgmt).toBeUndefined();
      expect(r.lab.devices[0].name).toBe(full().dev.name);
    }
  });

  it('repeated export / import cycles are stable', () => {
    let lab = full().lab;
    const first = structuredClone({ m: lab.devices[0].mgmt, s: lab.devices[0].security });
    for (let i = 0; i < 5; i++) {
      const r = parseImport(serializeExport(lab));
      if (!r.ok) throw new Error('import failed');
      lab = r.lab;
    }
    expect({ m: lab.devices[0].mgmt, s: lab.devices[0].security }).toEqual(first);
  });
});

describe('SR-CLI-11 review fixes', () => {
  it('abbreviated password / username commands are masked in the history, transcript and files', () => {
    const t = new T().conf('line vty 0 4');
    for (const l of ['p AbbrevPw1', 'pa AbbrevPw2', 'pas AbbrevPw3', 'do pa AbbrevPw4']) t.run(l);
    t.run('exit');
    for (const l of ['us u1 pass AbbrevPw5', 'use u2 pass AbbrevPw6', 'user u3 sec AbbrevPw7']) t.run(l);
    expect(t.visible()).not.toContain('AbbrevPw');
    expect(t.dev.mgmt?.vty04?.password).toBeDefined();
  });
  it('the redactor does not mask a plain passive-interface style command', () => {
    expect(classifyLine('cisco', 'passive-interface gi0/0').masked).toBe(false);
  });
  it('do <command> inside line mode keeps the selected line', () => {
    const t = new T().conf('line vty 0 4');
    for (const l of ['do configure terminal', 'do disable', 'do show running-config']) t.run(l);
    expect(t.dev.cli.mode).toBe('config-line');
    expect(t.dev.cli.ctxLine).toBe('vty04');
    t.run('password x');
    expect(t.dev.mgmt?.vty04?.password).toBeDefined();
    expect(t.dev.mgmt?.console).toBeUndefined();
  });
});

describe('SR-CLI-11 integration with existing behaviour', () => {
  it('works together with hostname and enable secret: the secret still gates enable and users do not', () => {
    const t = new T().conf('hostname GATE', 'enable secret topsecret', 'username a secret b', 'end', 'disable');
    t.run('enable');
    expect(promptFor(t.dev)).toBe('Password:');
    t.run('topsecret');
    expect(t.dev.cli.mode).toBe('priv');
    expect(t.running().slice(0, 12).join('\n')).toMatch(/hostname GATE[\s\S]*enable secret 5 [\s\S]*username a secret 5/);
  });

  it('a challenge config-line check sees the new lines', () => {
    const t = new T().conf('line vty 0 4', 'transport input ssh');
    const text = t.running().map((l) => l.trim());
    expect(text).toContain('line vty 0 4');
    expect(text).toContain('transport input ssh');
  });

  it('survives hostile and long input without throwing or changing the Lab', () => {
    const t = new T().conf('line vty 0 4');
    const before = JSON.stringify(t.lab.devices[0].mgmt ?? null);
    const hostile = [
      'x'.repeat(5000), 'password ' + 'p'.repeat(5000), 'banner motd ' + '#'.repeat(3000), 'transport input ' + 'ssh '.repeat(500), '\u0000\u0001 login',
      'login​ local', 'LOGIN LOCAL'.toLowerCase() + ' extra', 'exec-timeout 1 2 3 4', '"; rm -rf /; "', '$(whoami)', '`id`', 'password',
    ];
    for (const l of hostile) expect(() => t.run(l)).not.toThrow();
    t.run('exit');
    for (const l of ['username', 'username ' + 'a'.repeat(5000) + ' secret x', 'banner', 'banner motd', 'line', 'no', 'no username', 'erase', 'write', 'reload now']) {
      expect(() => t.run(l), l).not.toThrow();
    }
    expect(t.dev.cli.history.length).toBeLessThanOrEqual(100);
    expect(JSON.stringify(t.lab.devices[0].mgmt ?? null)).toBe(before);
    expect(t.dev.security).toBeUndefined();
  });

  it('keeps one device\'s management data separate from every other device', () => {
    const lab = buildSampleLab();
    const ids = lab.devices.filter((d) => d.kind === 'cisco-switch' || d.kind === 'cisco-router').map((d) => d.id);
    let cur = lab;
    for (const l of ['enable', 'configure terminal', 'line vty 0 4', 'password a', 'login', 'exit', 'username z secret q', 'banner motd #only first#']) cur = executeLine(cur, ids[0], l).lab;
    expect(getDevice(cur, ids[0])!.mgmt).toBeDefined();
    for (const id of ids.slice(1)) {
      expect(getDevice(cur, id)!.mgmt).toBeUndefined();
      expect(getDevice(cur, id)!.security).toEqual(getDevice(lab, id)!.security);
    }
  });
});
