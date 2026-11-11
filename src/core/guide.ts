import type { Guide } from './types';
import { tx } from '../i18n';

export const GUIDE_LIMITS = { sections: 50, resources: 30 } as const;

export function emptyGuide(title = 'Lab Guide'): Guide {
  return {
    title,
    objective: '',
    sections: [{ heading: tx('ขั้นตอน'), body: tx('1. อธิบายขั้นตอนแรกที่นี่\n2. ใช้ `คำสั่ง` ในเครื่องหมาย backtick เพื่อแสดงเป็นโค้ด') }],
    resources: [],
  };
}

/** Only http(s) links are rendered as links (blocks javascript: and similar). */
export function safeHref(url: string): string | null {
  return /^https?:\/\/[^\s]+$/i.test(url.trim()) ? url.trim() : null;
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

export type GuideBlock =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] };

/** Tiny markdown subset: paragraphs, "- " bullets, "1. " numbered lists. Inline `code` and **bold** are handled by the UI. */
export function parseGuideText(text: string): GuideBlock[] {
  const blocks: GuideBlock[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (ul) {
      if (last?.kind === 'ul') last.items.push(ul[1]);
      else blocks.push({ kind: 'ul', items: [ul[1]] });
    } else if (ol) {
      if (last?.kind === 'ol') last.items.push(ol[1]);
      else blocks.push({ kind: 'ol', items: [ol[1]] });
    } else blocks.push({ kind: 'p', text: line.trim() });
  }
  return blocks;
}
