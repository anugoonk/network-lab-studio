import type { SimLevel } from '../core/profiles';
import { simLevelHint, simLevelLabel } from '../ui/paletteCatalog';

const MARK: Record<SimLevel, string> = { full: '✓', partial: '◐', diagram: '▭' };

/**
 * Simulation-level badge (DEV-01B-1a). `compact` shows only a small mark (palette bar tiles, canvas nodes) — the text is
 * still the accessible name and tooltip. On a node it is absolutely positioned, so the node's size and handle stay put.
 */
export function SimBadge({ level, compact = false, onNode = false, testId }: { level: SimLevel; compact?: boolean; onNode?: boolean; testId?: string }) {
  const label = simLevelLabel(level);
  return (
    <span
      className={`sim-badge sim-${level}${compact ? ' compact' : ''}${onNode ? ' on-node' : ''}`}
      role="img"
      aria-label={label}
      title={`${label} — ${simLevelHint(level)}`}
      data-sim={level}
      data-testid={testId}
    >
      <span aria-hidden="true">{MARK[level]}</span>
      {!compact && <span aria-hidden="true" className="sim-text">{label}</span>}
    </span>
  );
}
