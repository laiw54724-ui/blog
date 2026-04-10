export interface SeriesQuickFilter {
  slug: string;
  label: string;
}

export interface SeriesDefinition {
  slug: string;
  title: string;
  kicker: string;
  description: string;
  fallbackCategories?: string[];
  defaultTagSlugs?: string[];
  quickFilters: SeriesQuickFilter[];
  relevantTagGroups: string[];
}

export const SERIES_DEFINITIONS: SeriesDefinition[] = [
  {
    slug: 'journal',
    title: '日記',
    kicker: 'personal log',
    description: '比較靠近生活內側的整理、回看與自我備忘。',
    fallbackCategories: ['journal'],
    defaultTagSlugs: [],
    quickFilters: [
      { slug: 'tone:healing', label: '療癒' },
      { slug: 'tone:angst', label: '沉重' },
      { slug: 'setting:modern', label: '現代' },
      { slug: 'topic:reading', label: '閱讀' },
    ],
    relevantTagGroups: ['tone', 'setting', 'topic'],
  },
  {
    slug: 'works',
    title: '作品',
    kicker: 'fiction shelf',
    description: '以作品、設定、角色關係為中心的創作整理頁。',
    defaultTagSlugs: ['genre:bl', 'genre:bg', 'genre:gl', 'genre:gen'],
    quickFilters: [
      { slug: 'genre:bl', label: 'BL' },
      { slug: 'genre:bg', label: 'BG' },
      { slug: 'genre:gl', label: 'GL' },
      { slug: 'genre:gen', label: '無 CP' },
      { slug: 'setting:campus', label: '校園' },
      { slug: 'tone:healing', label: '療癒' },
    ],
    relevantTagGroups: ['genre', 'tone', 'setting', 'relationship'],
  },
  {
    slug: 'reviews',
    title: '評論書摘',
    kicker: 'notes & reviews',
    description: '讀書筆記、評論、書摘與可回頭查找的知識型文章。',
    fallbackCategories: ['reading'],
    defaultTagSlugs: ['topic:reading', 'topic:math', 'topic:proof', 'topic:cryptography'],
    quickFilters: [
      { slug: 'topic:reading', label: '閱讀' },
      { slug: 'topic:math', label: '數學' },
      { slug: 'topic:proof', label: '證明' },
      { slug: 'topic:cryptography', label: '密碼學' },
      { slug: 'tone:healing', label: '輕讀' },
    ],
    relevantTagGroups: ['topic', 'tone', 'setting'],
  },
  {
    slug: 'play',
    title: '遊玩',
    kicker: 'places & play',
    description: '遊玩、出門、地點與途中發生的小型探索。',
    fallbackCategories: ['travel', 'place'],
    defaultTagSlugs: ['setting:travel', 'setting:modern'],
    quickFilters: [
      { slug: 'setting:travel', label: '旅行' },
      { slug: 'setting:modern', label: '都市' },
      { slug: 'tone:funny', label: '輕鬆' },
      { slug: 'tone:healing', label: '舒服' },
    ],
    relevantTagGroups: ['setting', 'tone', 'topic'],
  },
];

export function getSeriesDefinition(slug: string): SeriesDefinition | null {
  return SERIES_DEFINITIONS.find((series) => series.slug === slug) || null;
}
