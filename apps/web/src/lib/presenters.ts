import { formatDate } from '@personal-blog/shared';
import type { Entry, EntryMetrics, ResolvedCoverAsset } from '@personal-blog/shared';
import { getResolvedCoverAssetsMap, getEntryMetricsMap } from './data';
import {
  extractPlainText,
  stripLeadingMarkdownTitle,
  getFirstMeaningfulParagraph,
  extractH1Title,
  stripFirstH1,
} from './markdown';

export const CATEGORY_LABELS: Record<string, string> = {
  journal: '日記',
  reading: '讀書',
  travel: '旅行',
  place: '地點',
};

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  journal: '日常的想法、生活切片與當下感受。',
  reading: '書摘、心得、評論與重讀之後留下的痕跡。',
  travel: '路上的風景、移動中的記錄與旅行時的心情。',
  place: '店家、空間、餐廳與那些值得記住的地方。',
};

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  article: '文章',
  post: '動態',
};

export interface EntryCardViewModel {
  id: string;
  slug: string;
  entryType: 'article' | 'post';
  href: string;
  rawDate: string;
  displayDate: string;
  displayTitle: string;
  displayExcerpt: string;
  categoryLabel: string;
  typeLabel: string;
  coverUrl?: string;
  coverAlt?: string;
  metrics: EntryMetrics;
}

export function getPublicApiBase(): string {
  if (
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env &&
    (import.meta as any).env.PUBLIC_API_URL
  ) {
    return (import.meta as any).env.PUBLIC_API_URL;
  }
  return 'https://personal-blog-api.personal-blog.workers.dev';
}

function fallbackMetrics(entryId: string): EntryMetrics {
  return {
    entry_id: entryId,
    view_count: 0,
    clap_count: 0,
    comment_count: 0,
    last_viewed_at: null,
  };
}

function buildHref(entry: Entry): string {
  return `/${entry.entry_type === 'article' ? 'article' : 'post'}/${encodeURIComponent(entry.slug || '')}`;
}

function buildTitle(entry: Entry): string {
  if (entry.title?.trim()) {
    // Strip any accidental "# " markdown heading prefix stored in the DB
    return entry.title.replace(/^#+\s+/, '').trim() || formatDate(entry.created_at);
  }
  // Fall back to first H1 extracted from content
  const h1 = extractH1Title(entry.content_markdown || '');
  if (h1) return h1;
  return formatDate(entry.created_at);
}

function buildExcerpt(entry: Entry, maxLength = 120): string {
  const title = buildTitle(entry);

  // Use an explicit excerpt only when it's genuinely different from the title
  const rawExcerpt = entry.excerpt?.trim();
  if (rawExcerpt && rawExcerpt !== title) {
    // Strip markdown syntax before displaying
    const plainExcerpt = extractPlainText(rawExcerpt, maxLength);
    if (plainExcerpt && plainExcerpt !== title) return plainExcerpt;
  }

  // Strip the first H1 from content (same as the title), then get first paragraph
  const stripped = stripFirstH1(entry.content_markdown || '');
  return getFirstMeaningfulParagraph(stripped, maxLength);
}

function buildCover(
  entryId: string,
  coverMap: Record<string, ResolvedCoverAsset>,
  apiBase: string,
  fallbackAlt: string
): { coverUrl?: string; coverAlt?: string } {
  const cover = coverMap[entryId];
  if (!cover) {
    return {};
  }
  return {
    coverUrl: `${apiBase}/api/assets/${cover.storage_key}`,
    coverAlt: cover.alt_text || fallbackAlt,
  };
}

export async function buildEntryCardModels(
  entries: Entry[],
  options?: {
    excerptLength?: number;
    categoryLabelOverride?: string;
  }
): Promise<EntryCardViewModel[]> {
  const excerptLength = options?.excerptLength ?? 120;
  const apiBase = getPublicApiBase();

  const [coverMap, metricsMap] = await Promise.all([
    getResolvedCoverAssetsMap(entries.map((entry) => entry.id)),
    getEntryMetricsMap(entries.map((entry) => entry.id)),
  ]);

  return entries.map((entry) => {
    const displayTitle = buildTitle(entry);
    const displayExcerpt = buildExcerpt(entry, excerptLength);
    const { coverUrl, coverAlt } = buildCover(entry.id, coverMap, apiBase, displayTitle);

    return {
      id: entry.id,
      slug: entry.slug || '',
      entryType: entry.entry_type as 'article' | 'post',
      href: buildHref(entry),
      rawDate: entry.created_at,
      displayDate: formatDate(entry.created_at),
      displayTitle,
      displayExcerpt,
      categoryLabel:
        options?.categoryLabelOverride || CATEGORY_LABELS[entry.category] || entry.category,
      typeLabel: ENTRY_TYPE_LABELS[entry.entry_type] || entry.entry_type,
      coverUrl,
      coverAlt,
      metrics: metricsMap[entry.id] || fallbackMetrics(entry.id),
    };
  });
}
