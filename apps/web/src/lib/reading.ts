/**
 * Reading collection helpers — labels, sorting, filtering
 */

import { normalizeTagInput, type TagSummary } from '@personal-blog/shared';
import type { ReadingEntryRow } from './data';

export const GENRE_LABELS: Record<string, string> = {
  bl: 'BL',
  bg: 'BG',
  gl: 'GL',
  gen: '無CP',
};

export const MEDIUM_LABELS: Record<string, string> = {
  novel: '小說',
  comic: '漫畫',
  manhwa: '韓漫',
  manga: '日漫',
  webtoon: '條漫',
  drama: '韓劇',
};

export const READ_STATUS_LABELS: Record<string, string> = {
  completed: '讀完',
  ongoing: '追更中',
  dropped: '棄文',
};

export const WORK_STATUS_LABELS: Record<string, string> = {
  finished: '完結',
  serializing: '連載中',
  unknown: '未知',
};

export interface ReadingListItem {
  id: string;
  title: string;
  author?: string;
  genre: string;
  medium: string;
  readStatus: string;
  workStatus: string;
  score?: number;
  readAt?: string;
  shortReview?: string;
  tags: string[];
  hasDetail: boolean;
}

export function formatScore(score: number | undefined): string {
  if (score === undefined) return '—';
  return score.toFixed(1);
}

export function formatReadAt(readAt: string | undefined): string {
  if (!readAt) return '—';
  return readAt.slice(0, 7); // YYYY-MM
}

export type SortKey = 'readAt' | 'score' | 'title';

export interface ReadingFilters {
  q?: string;
  genre?: string;
  medium?: string;
  status?: string;
}

export function sortReadingItems(items: ReadingListItem[], by: SortKey): ReadingListItem[] {
  return [...items].sort((a, b) => {
    if (by === 'score') {
      return (b.score ?? -1) - (a.score ?? -1);
    }
    if (by === 'title') {
      return a.title.localeCompare(b.title, 'zh-TW');
    }
    // readAt: newest first, entries without date go to bottom
    if (!a.readAt && !b.readAt) return 0;
    if (!a.readAt) return 1;
    if (!b.readAt) return -1;
    return b.readAt.localeCompare(a.readAt);
  });
}

export function filterReadingItems(
  items: ReadingListItem[],
  filters: ReadingFilters
): ReadingListItem[] {
  const query = filters.q?.trim().toLocaleLowerCase('zh-TW') || '';

  return items.filter((item) => {
    if (filters.genre && item.genre !== filters.genre) return false;
    if (filters.medium && item.medium !== filters.medium) return false;
    if (filters.status && item.readStatus !== filters.status) return false;

    if (query) {
      const haystack = [item.title, item.author ?? '', item.shortReview ?? '', item.tags.join(' ')]
        .join(' ')
        .toLocaleLowerCase('zh-TW');
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

export function parseReadingTags(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function hasDetailedReadingReview(entry: Pick<ReadingEntryRow, 'has_detail' | 'detail_review'>): boolean {
  return entry.has_detail === 1 && Boolean(entry.detail_review?.trim());
}

export function buildReadingTagSummaries(entries: ReadingEntryRow[]): TagSummary[] {
  const counts = new Map<string, TagSummary>();

  for (const entry of entries) {
    const normalizedTags = Array.from(
      new Set(parseReadingTags(entry.tags).map((tag) => normalizeTagInput(tag)))
    );

    for (const tag of normalizedTags) {
      const existing = counts.get(tag.slug);
      if (existing) {
        existing.entry_count += 1;
        continue;
      }

      counts.set(tag.slug, {
        id: `reading-tag:${tag.slug}`,
        slug: tag.slug,
        name: tag.label,
        created_at: entry.created_at,
        entry_count: 1,
      });
    }
  }

  return Array.from(counts.values()).sort((a, b) => {
    if (b.entry_count !== a.entry_count) return b.entry_count - a.entry_count;
    return a.name.localeCompare(b.name, 'zh-TW');
  });
}
