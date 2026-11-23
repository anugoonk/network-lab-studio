// UI-05 (SR-WS-15): the four responsive tiers of UI_UX_REDESIGN_PLAN.md §5, as ONE pure definition.
// The CSS @media rules in styles.css use the same boundaries (tests/responsive.test.ts checks that they agree), and the app uses this
// module only for behaviour that CSS cannot express (drawers start closed, the toolbar "⋯" menu, the small-screen note).
import { useSyncExternalStore } from 'react';

/** wide ≥1280 · medium 1024–1279 · narrow 768–1023 · compact <768 */
export type Tier = 'wide' | 'medium' | 'narrow' | 'compact';

/** the smallest width (px) of each tier except `compact` (which is everything below `narrow`) */
export const TIER_MIN = { wide: 1280, medium: 1024, narrow: 768 } as const;

/** width the small-screen note recommends (plan §5: "เหมาะกับจอ ≥ 1024px") */
export const RECOMMENDED_MIN_WIDTH = TIER_MIN.medium;

/** unknown / non-finite widths (no window, odd test environments) count as the full desktop layout */
export function tierForWidth(width: number): Tier {
  if (typeof width !== 'number' || !Number.isFinite(width)) return 'wide';
  if (width >= TIER_MIN.wide) return 'wide';
  if (width >= TIER_MIN.medium) return 'medium';
  if (width >= TIER_MIN.narrow) return 'narrow';
  return 'compact';
}

/** the side panels float over the canvas as drawers (instead of sitting beside it) below the wide tier */
export const usesDrawers = (t: Tier): boolean => t !== 'wide';
/** secondary toolbar groups move into the "⋯" menu from the narrow tier down */
export const usesToolbarOverflow = (t: Tier): boolean => t === 'narrow' || t === 'compact';

function currentTier(): Tier {
  try {
    return typeof window === 'undefined' ? 'wide' : tierForWidth(window.innerWidth);
  } catch {
    return 'wide';
  }
}

function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
}

/** re-renders only when the tier changes (a string snapshot), not on every pixel of a resize */
export function useTier(): Tier {
  return useSyncExternalStore(subscribe, currentTier, () => 'wide');
}
