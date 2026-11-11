import { useReactFlow } from '@xyflow/react';
import { useState } from 'react';
import { PROFILES } from '../core/profiles';
import { useStore } from '../store';
import { ChallengePanel } from './ChallengePanel';
import { fitLab } from './Canvas';
import { GuidePanel } from './GuidePanel';
import { Icon } from './Icons';
import { Palette } from './Palette';
import { tx } from '../i18n';

interface Entry {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  testId: string;
  chevron?: boolean;
  open?: boolean;
}

/**
 * Left side of the lab view: an icon rail that can expand into a labelled menu
 * (Add an object, Nodes, Lab Guide, Lab details, ...), or be joined by the Lab Guide drawer.
 */
export function LeftDock() {
  const panel = useStore((s) => s.leftPanel);
  const setPanel = useStore((s) => s.setLeftPanel);
  const toggleMenu = useStore((s) => s.toggleMenu);
  const toggleGuide = useStore((s) => s.toggleGuide);
  const hasGuide = useStore((s) => !!s.lab.guide);
  const toggleChallenge = useStore((s) => s.toggleChallenge);
  const hideLabels = useStore((s) => s.hideLabels);
  const toggleHide = useStore((s) => s.toggleHideLabels);
  const shareLab = useStore((s) => s.shareLab);
  const setView = useStore((s) => s.setView);
  const select = useStore((s) => s.select);
  const setRightTab = useStore((s) => s.setRightTab);
  const openConnect = useStore((s) => s.openConnect);
  const devices = useStore((s) => s.lab.devices);
  const selection = useStore((s) => s.selection);
  const openConsole = useStore((s) => s.openConsole);
  const flow = useReactFlow();
  const [section, setSection] = useState<'add' | 'nodes' | null>('add');

  const expanded = panel === 'menu';

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    } catch {
      /* not allowed */
    }
  };

  const openSection = (s: 'add' | 'nodes') => {
    setPanel('menu');
    setSection(section === s && expanded ? null : s);
  };

  const entries: Entry[] = [
    { id: 'add', icon: 'plus', label: 'Add an object', onClick: () => openSection('add'), testId: 'menu-add', chevron: true, open: expanded && section === 'add' },
    { id: 'nodes', icon: 'nodes', label: `Nodes (${devices.length})`, onClick: () => openSection('nodes'), testId: 'menu-nodes', chevron: true, open: expanded && section === 'nodes' },
    { id: 'guide', icon: 'guide', label: 'Lab Guide', onClick: toggleGuide, active: panel === 'guide', testId: 'menu-guide' },
    { id: 'challenge', icon: 'check', label: 'Challenge', onClick: toggleChallenge, active: panel === 'challenge', testId: 'menu-challenge' },
    {
      id: 'details',
      icon: 'details',
      label: 'Lab details',
      onClick: () => {
        select(null);
        setRightTab('details');
        setView('lab');
      },
      testId: 'menu-details',
    },
    { id: 'manager', icon: 'manager', label: 'Lab Manager', onClick: () => setView('manager'), testId: 'menu-manager' },
    { id: 'library', icon: 'library', label: 'Command Library', onClick: () => setView('library'), testId: 'menu-library' },
    { id: 'share', icon: 'share', label: tx('แชร์ลิงก์ Lab'), onClick: () => void shareLab(), testId: 'menu-share' },
    { id: 'cable', icon: 'cable', label: tx('เชื่อมสาย'), onClick: () => openConnect(), testId: 'menu-connect' },
    { id: 'fit', icon: 'fit', label: 'Fit view', onClick: () => fitLab(flow), testId: 'menu-fit' },
    { id: 'hide', icon: 'tag', label: hideLabels ? tx('แสดงป้ายพอร์ต/สถานะ') : tx('ซ่อนป้ายพอร์ต/สถานะ'), onClick: toggleHide, active: hideLabels, testId: 'menu-hide-labels' },
    { id: 'full', icon: 'full', label: 'Fullscreen', onClick: toggleFullscreen, testId: 'menu-fullscreen' },
    { id: 'close', icon: 'close', label: 'Close lab', onClick: () => setView('manager'), testId: 'menu-close' },
  ];

  const focusNode = (id: string) => {
    select({ type: 'device', id });
    flow.fitView({ nodes: [{ id }], duration: 250, maxZoom: 1.1, padding: 1.4 });
  };

  return (
    <div className={`dock ${expanded ? 'expanded' : 'rail'}`} data-testid="left-dock">
      <nav className="menu" aria-label={tx('เมนู Lab')}>
        <button
          className="menu-item hamburger"
          onClick={toggleMenu}
          aria-expanded={expanded}
          title={expanded ? tx('ย่อเมนู') : tx('ขยายเมนู')}
          data-testid="menu-toggle"
        >
          <Icon name="menu" />
          {expanded && <span className="menu-label">{tx('เมนู')}</span>}
        </button>
        {entries.map((e) => (
          <div key={e.id}>
            <button
              className={`menu-item${e.active ? ' active' : ''}`}
              onClick={e.onClick}
              title={e.label}
              aria-label={e.label}
              data-testid={e.testId}
            >
              <Icon name={e.icon} />
              {expanded && <span className="menu-label">{e.label}</span>}
              {expanded && e.chevron && (
                <span className={`chev${e.open ? ' open' : ''}`}>
                  <Icon name="chevron" size={16} />
                </span>
              )}
              {e.id === 'guide' && !hasGuide && <span className="dot" title={tx('ยังไม่มี Guide')} />}
            </button>
            {expanded && e.id === 'add' && e.open && (
              <div className="submenu" data-testid="submenu-add">
                <Palette />
              </div>
            )}
            {expanded && e.id === 'nodes' && e.open && (
              <div className="submenu" data-testid="submenu-nodes">
                {devices.length === 0 && <p className="menu-hint">{tx('ยังไม่มีอุปกรณ์ใน Lab')}</p>}
                {devices.map((d) => (
                  <button
                    key={d.id}
                    className={`node-row${selection?.type === 'device' && selection.id === d.id ? ' active' : ''}`}
                    onClick={() => focusNode(d.id)}
                    onDoubleClick={() => openConsole(d.id)}
                    title={tx('{0} — ดับเบิลคลิกเพื่อเปิด Console', PROFILES[d.kind].label)}
                    data-testid={`node-row-${d.name}`}
                  >
                    <span className="sq" />
                    {d.name}
                    <span className="menu-hint">{{ pc: 'PC', cisco: 'Cisco', aruba: 'Aruba', generic: 'Generic' }[PROFILES[d.kind].vendor]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      {panel === 'guide' && <GuidePanel />}
      {panel === 'challenge' && <ChallengePanel />}
    </div>
  );
}
