import type { EntryCardViewModel } from './presenters';
import { ENTRY_TYPE_LABELS } from './presenters';

export interface SystemNotice {
  kind: 'system-notice';
  rawDate: string;
  displayDate: string;
  message: string;
  href: string;
  entryType: 'article' | 'post';
}

export type FeedItem = EntryCardViewModel | SystemNotice;

export interface DayGroup {
  date: string;
  displayDate: string;
  items: FeedItem[];
}

/**
 * Build a unified feed: posts appear as cards, articles appear as system notices.
 */
export function buildUnifiedFeed(
  posts: EntryCardViewModel[],
  articles: EntryCardViewModel[]
): DayGroup[] {
  const items: FeedItem[] = [];

  // Posts go in as-is
  for (const post of posts) {
    items.push(post);
  }

  // Articles become system notices
  for (const article of articles) {
    const typeLabel = ENTRY_TYPE_LABELS[article.entryType] || '文章';

    items.push({
      kind: 'system-notice',
      rawDate: article.rawDate,
      displayDate: article.displayDate,
      message: `發布了新${typeLabel}：${article.displayTitle}`,
      href: article.href,
      entryType: article.entryType,
    });
  }

  // Sort all items by date descending
  items.sort((a, b) => {
    const dateA = 'rawDate' in a ? a.rawDate : '';
    const dateB = 'rawDate' in b ? b.rawDate : '';
    return dateB.localeCompare(dateA);
  });

  // Group by date
  const dayMap = new Map<string, FeedItem[]>();
  for (const item of items) {
    const rawDate = 'rawDate' in item ? item.rawDate : '';
    const dateKey = rawDate.slice(0, 10);
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, []);
    }
    dayMap.get(dateKey)!.push(item);
  }

  const groups: DayGroup[] = [];
  for (const [date, dayItems] of dayMap) {
    const firstItem = dayItems[0];
    const displayDate = 'displayDate' in firstItem ? firstItem.displayDate : date;
    groups.push({ date, displayDate, items: dayItems });
  }

  // Sort groups by date descending
  groups.sort((a, b) => b.date.localeCompare(a.date));

  return groups;
}

export function isSystemNotice(item: FeedItem): item is SystemNotice {
  return 'kind' in item && item.kind === 'system-notice';
}
