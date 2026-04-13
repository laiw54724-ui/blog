import { slugify } from './utils';

export type TagGroupKey =
  | 'genre'
  | 'medium'
  | 'tone'
  | 'setting'
  | 'scene'
  | 'relationship'
  | 'warning'
  | 'recommend'
  | 'topic'
  | 'era';
export type TagBucketKey = TagGroupKey | 'general';

export type LockMode = 'none' | '18plus' | 'controversial';

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
  'medium',
  'era',
  'tone',
  'setting',
  'scene',
  'relationship',
  'warning',
  'recommend',
  'topic',
];

export const STRUCTURED_TAGS: Record<TagGroupKey, StructuredTagDefinition[]> = {
  genre: [
    { slug: 'genre:bl', label: 'BL', aliases: ['bl', 'boys-love', '耽美'] },
    { slug: 'genre:bg', label: 'BG', aliases: ['bg'] },
    { slug: 'genre:gl', label: 'GL', aliases: ['gl', '百合'] },
    { slug: 'genre:gen', label: '無CP', aliases: ['gencp', 'gen', 'nocp', 'no-cp', '無cp'] },
  ],
  medium: [
    { slug: 'medium:novel', label: '小說', aliases: ['novel', '小說', '文'] },
    { slug: 'medium:comic', label: '漫畫', aliases: ['comic', '漫畫'] },
    { slug: 'medium:manhwa', label: '韓漫', aliases: ['manhwa', '韓漫'] },
    { slug: 'medium:manga', label: '日漫', aliases: ['manga', '日漫'] },
    { slug: 'medium:webtoon', label: '條漫', aliases: ['webtoon', '條漫'] },
    { slug: 'medium:drama', label: '韓劇', aliases: ['kdrama', '韓劇'] },
  ],
  era: [
    { slug: 'era:modern', label: '現代都市', aliases: ['現代都市', '都市', 'modern-city'] },
    { slug: 'era:ancient', label: '古代架空', aliases: ['古代架空', '古代', '架空', 'ancient'] },
    { slug: 'era:future', label: '未來星際', aliases: ['未來星際', '星際', 'scifi', 'future', '科幻'] },
    { slug: 'era:apocalypse', label: '末世廢土', aliases: ['末世廢土', '末世', 'apocalypse'] },
    { slug: 'era:xianxia', label: '仙俠修真', aliases: ['仙俠修真', '仙俠', '修真', 'xianxia'] },
    { slug: 'era:western-fantasy', label: '西方奇幻', aliases: ['西方奇幻', '西幻', 'western-fantasy'] },
    { slug: 'era:quick-transmigration', label: '無限快穿', aliases: ['無限快穿', '快穿', '無限流', 'quick-transmigration'] },
    { slug: 'era:supernatural', label: '靈異神怪', aliases: ['靈異神怪', '靈異', '神怪', 'supernatural'] },
  ],
  tone: [
    { slug: 'tone:healing', label: '療癒', aliases: ['healing', '治癒', '療癒'] },
    { slug: 'tone:sweet', label: '甜', aliases: ['sweet', '甜'] },
    { slug: 'tone:angst', label: '虐', aliases: ['angst', '虐'] },
    { slug: 'tone:funny', label: '搞笑', aliases: ['funny', '搞笑'] },
    { slug: 'tone:slow-burn', label: '慢熱', aliases: ['slow-burn', '慢熱', '慢燃'] },
    { slug: 'tone:dog-blood', label: '狗血', aliases: ['dog-blood', 'drama', '狗血', '撒狗血'] },
    { slug: 'tone:suspense', label: '恐怖/懸疑', aliases: ['suspense', 'horror', '恐怖', '懸疑', '驚悚'] },
    { slug: 'tone:serious', label: '正劇', aliases: ['serious', '正劇'] },
    { slug: 'tone:power-fantasy', label: '爽文', aliases: ['power-fantasy', '爽文', '爽'] },
    { slug: 'tone:slice-of-life', label: '日常', aliases: ['slice-of-life', '日常', 'sol'] },
  ],
  setting: [
    { slug: 'setting:campus', label: '校園', aliases: ['campus', '校園'] },
    { slug: 'setting:modern', label: '現代', aliases: ['modern', '現代'] },
    { slug: 'setting:historical', label: '古代/古風', aliases: ['historical', '古代', '古風', '古裝'] },
    { slug: 'setting:xianxia', label: '仙俠', aliases: ['xianxia', '仙俠'] },
    { slug: 'setting:travel', label: '旅行', aliases: ['travel', '旅行'] },
    { slug: 'setting:fantasy', label: '奇幻', aliases: ['fantasy', '奇幻'] },
    { slug: 'setting:entertainment', label: '娛樂圈', aliases: ['entertainment', '娛樂圈', '明星', '演藝'] },
    { slug: 'setting:office', label: '職場', aliases: ['office', '職場', 'workplace'] },
    { slug: 'setting:online-game', label: '網遊', aliases: ['online-game', '網遊', '網絡遊戲', 'vr'] },
    { slug: 'setting:wealthy', label: '豪門', aliases: ['豪門', 'wealthy', '豪門世家'] },
    { slug: 'setting:space', label: '星際', aliases: ['星際', 'space', '太空'] },
  ],
  scene: [
    { slug: 'scene:campus', label: '校園', aliases: ['scene:campus'] },
    { slug: 'scene:workplace', label: '職場', aliases: ['職場', 'workplace', 'office'] },
    { slug: 'scene:wealthy-family', label: '豪門', aliases: ['scene:wealthy', 'scene:豪門'] },
    { slug: 'scene:entertainment', label: '娛樂圈', aliases: ['娛樂圈', 'entertainment', '明星'] },
    { slug: 'scene:palace', label: '宮廷', aliases: ['宮廷', 'palace', '後宮'] },
    { slug: 'scene:court', label: '朝堂', aliases: ['朝堂', 'court', '廟堂'] },
    { slug: 'scene:jianghu', label: '江湖', aliases: ['江湖', 'jianghu', '武林'] },
    { slug: 'scene:mecha', label: '機甲', aliases: ['機甲', 'mecha'] },
    { slug: 'scene:system', label: '系統文', aliases: ['系統文', '系統', 'system'] },
    { slug: 'scene:online-game', label: '網遊', aliases: ['網遊', 'online-game', '網絡遊戲'] },
    { slug: 'scene:livestream', label: '直播', aliases: ['直播', 'livestream', '主播'] },
  ],
  relationship: [
    { slug: 'relationship:friends-to-lovers', label: '朋友變戀人', aliases: ['friends-to-lovers', '友情變愛情'] },
    { slug: 'relationship:enemies-to-lovers', label: '相愛相殺', aliases: ['enemies-to-lovers', '相愛相殺'] },
    { slug: 'relationship:year-gap', label: '年上年下', aliases: ['age-gap', '年差'] },
    { slug: 'relationship:older-seme', label: '年上攻', aliases: ['年上', 'older-seme', '年上攻'] },
    { slug: 'relationship:older-uke', label: '年上受', aliases: ['年上受', 'older-uke'] },
    { slug: 'relationship:strong-strong', label: '強強', aliases: ['強強', 'strong-strong', '雙強'] },
    { slug: 'relationship:secret-crush', label: '暗戀', aliases: ['暗戀', 'secret-crush', 'unrequited'] },
    { slug: 'relationship:mutual-spoil', label: '互寵', aliases: ['互寵', 'mutual-spoil', '互寵甜文'] },
    { slug: 'relationship:childhood-sweethearts', label: '青梅竹馬', aliases: ['青梅竹馬', 'childhood-sweethearts'] },
    { slug: 'relationship:childhood-friends', label: '竹馬', aliases: ['竹馬', 'childhood-friends'] },
    { slug: 'relationship:contract', label: '契約戀愛', aliases: ['契約戀愛', '戀愛合約', 'contract', 'contract-love'] },
    { slug: 'relationship:boss-subordinate', label: '上下屬', aliases: ['上下屬', 'boss-subordinate', '上司下屬', '師徒'] },
    { slug: 'relationship:marry-first', label: '先婚後愛', aliases: ['先婚後愛', 'marry-first', '閃婚'] },
    { slug: 'relationship:breakup-reunion', label: '破鏡重圓', aliases: ['破鏡重圓', 'breakup-reunion', 'second-chance'] },
    { slug: 'relationship:reunion', label: '久別重逢', aliases: ['久別重逢', 'reunion', '久別'] },
    { slug: 'relationship:rebirth', label: '重生', aliases: ['重生', 'rebirth', '穿越重生'] },
    { slug: 'relationship:obsession', label: '偏執', aliases: ['偏執', 'obsession', '偏執愛', '病嬌'] },
    { slug: 'relationship:bed-first', label: '先做後愛', aliases: ['先做後愛', 'bed-first'] },
  ],
  warning: [
    { slug: 'warning:18plus', label: '18+', aliases: ['18+', '18plus', 'r18', '成人'] },
    {
      slug: 'warning:controversial',
      label: '爭議題材',
      aliases: ['controversial', '爭議', '爭議題材', 'sensitive'],
    },
    { slug: 'warning:spoiler', label: '劇透', aliases: ['spoiler', '劇透'] },
  ],
  recommend: [
    { slug: 'recommend:must-read', label: '爆推', aliases: ['爆推', 'must-read', '神作'] },
    { slug: 'recommend:good', label: '推', aliases: ['推', 'good', '好看'] },
    { slug: 'recommend:ok', label: '可看', aliases: ['可看', 'ok', '還行'] },
    { slug: 'recommend:filler', label: '文荒可看', aliases: ['文荒可看', '文荒', 'filler', '打發時間'] },
    { slug: 'recommend:dropped', label: '棄', aliases: ['棄', 'dropped', '棄文'] },
  ],
  topic: [
    { slug: 'topic:reading', label: '閱讀', aliases: ['reading', '讀書', '書摘'] },
    { slug: 'topic:math', label: '數學', aliases: ['math', '數學'] },
    { slug: 'topic:proof', label: '證明', aliases: ['proof', '證明'] },
    { slug: 'topic:cryptography', label: '密碼學', aliases: ['cryptography', 'crypto', '密碼學'] },
  ],
};

export const LOCK_MODE_TO_TAGS: Record<LockMode, string[]> = {
  none: [],
  '18plus': ['warning:18plus'],
  controversial: ['warning:controversial'],
};

export function isLockMode(value: string): value is LockMode {
  return value === 'none' || value === '18plus' || value === 'controversial';
}

export function resolveLockModeTags(lockMode?: string | null): string[] {
  if (!lockMode || !isLockMode(lockMode)) return [];
  return LOCK_MODE_TO_TAGS[lockMode];
}

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
