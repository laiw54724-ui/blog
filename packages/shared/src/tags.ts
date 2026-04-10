import { slugify } from './utils';

export type TagGroupKey = 'genre' | 'tone' | 'setting' | 'relationship' | 'topic';
export type TagBucketKey = TagGroupKey | 'general';

export interface StructuredTagDefinition {
  slug: string;
  label: string;
  aliases: string[];
}

export interface NormalizedTag {
  slug: string;
  label: string;
  group?: TagGroupKey;
  isStructured: boolean;
}

export interface ClassifiedTags {
  structured: NormalizedTag[];
  free: NormalizedTag[];
}

export const TAG_SPEC_VERSION = 'v2';
export const STRUCTURED_TAG_GROUP_ORDER: TagGroupKey[] = [
  'genre',
  'tone',
  'setting',
  'relationship',
  'topic',
];

export const STRUCTURED_TAGS: Record<TagGroupKey, StructuredTagDefinition[]> = {
  genre: [
    { slug: 'genre:bl', label: 'BL', aliases: ['bl', 'boys-love', '耽美'] },
    { slug: 'genre:bg', label: 'BG', aliases: ['bg'] },
    { slug: 'genre:gl', label: 'GL', aliases: ['gl', '百合'] },
    { slug: 'genre:gen', label: '無CP', aliases: ['gencp', 'gen', 'nocp', 'no-cp', '無cp'] },
  ],
  tone: [
    { slug: 'tone:healing', label: '療癒', aliases: ['healing', '治癒', '療癒'] },
    { slug: 'tone:sweet', label: '甜', aliases: ['sweet', '甜'] },
    { slug: 'tone:angst', label: '虐', aliases: ['angst', '虐'] },
    { slug: 'tone:funny', label: '搞笑', aliases: ['funny', '搞笑'] },
  ],
  setting: [
    { slug: 'setting:campus', label: '校園', aliases: ['campus', '校園'] },
    { slug: 'setting:modern', label: '現代', aliases: ['modern', '現代'] },
    { slug: 'setting:travel', label: '旅行', aliases: ['travel', '旅行'] },
    { slug: 'setting:fantasy', label: '奇幻', aliases: ['fantasy', '奇幻'] },
  ],
  relationship: [
    { slug: 'relationship:friends-to-lovers', label: '朋友變戀人', aliases: ['friends-to-lovers', '友情變愛情'] },
    { slug: 'relationship:enemies-to-lovers', label: '相愛相殺', aliases: ['enemies-to-lovers', '相愛相殺'] },
    { slug: 'relationship:year-gap', label: '年上年下', aliases: ['age-gap', '年上', '年下'] },
  ],
  topic: [
    { slug: 'topic:reading', label: '閱讀', aliases: ['reading', '讀書', '書摘'] },
    { slug: 'topic:math', label: '數學', aliases: ['math', '數學'] },
    { slug: 'topic:proof', label: '證明', aliases: ['proof', '證明'] },
    { slug: 'topic:cryptography', label: '密碼學', aliases: ['cryptography', 'crypto', '密碼學'] },
  ],
};

export function isStructuredTagGroup(value: string): value is TagGroupKey {
  return STRUCTURED_TAG_GROUP_ORDER.includes(value as TagGroupKey);
}

export function isStructuredTagSlug(value: string): boolean {
  const [groupCandidate, ...rest] = value.split(':');
  return Boolean(groupCandidate && rest.length > 0 && isStructuredTagGroup(groupCandidate));
}

export function normalizeTagInput(input: string): NormalizedTag {
  const raw = input.trim();
  const lower = raw.toLocaleLowerCase('zh-TW');

  for (const [group, definitions] of Object.entries(STRUCTURED_TAGS) as Array<
    [TagGroupKey, StructuredTagDefinition[]]
  >) {
    const matched = definitions.find((definition) => {
      return definition.slug === lower || definition.aliases.includes(lower);
    });

    if (matched) {
      return {
        slug: matched.slug,
        label: matched.label,
        group,
        isStructured: true,
      };
    }
  }

  if (lower.includes(':')) {
    const [groupCandidate, ...rest] = lower.split(':');
    if (groupCandidate && rest.length > 0 && isStructuredTagGroup(groupCandidate)) {
      const slug = `${groupCandidate}:${slugify(rest.join(':'))}`;
      return {
        slug,
        label: raw,
        group: groupCandidate,
        isStructured: true,
      };
    }
  }

  return {
    slug: slugify(lower),
    label: raw,
    isStructured: false,
  };
}

export function groupStructuredTags(tagNames: string[]): Record<TagBucketKey, NormalizedTag[]> {
  return tagNames.reduce<Record<TagBucketKey, NormalizedTag[]>>((acc, tagName) => {
    const normalized = normalizeTagInput(tagName);
    const key = normalized.group || 'general';
    acc[key] = acc[key] || [];
    acc[key].push(normalized);
    return acc;
  }, {} as Record<TagBucketKey, NormalizedTag[]>);
}

export function classifyTags(tagNames: string[]): ClassifiedTags {
  return tagNames.reduce<ClassifiedTags>(
    (acc, tagName) => {
      const normalized = normalizeTagInput(tagName);
      if (normalized.isStructured) {
        acc.structured.push(normalized);
      } else {
        acc.free.push(normalized);
      }
      return acc;
    },
    { structured: [], free: [] }
  );
}
