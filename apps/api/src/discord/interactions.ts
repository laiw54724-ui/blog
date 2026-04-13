import type { Context } from 'hono';
import type { D1Database, ExecutionContext, R2Bucket } from '@cloudflare/workers-types';
import { normalizeTagInput, resolveLockModeTags, type Entry } from '@personal-blog/shared';
import { verifyDiscordSignature } from './verify';
import { CHINESE_TO_ENGLISH_COMMAND_MAP, getCommandPreset } from './presets';
import { parseManualTags } from './createEntry';
import { openCreateModal } from './handlers/create';
import { handleCreateModal, handleEditModal } from './handlers/modal';
import { sendListFollowup } from './handlers/list';
import { handleComponent } from './handlers/component';
import { getEntryBySlug, createAsset } from '@personal-blog/shared/db';
import { processAttachments } from './attachments';
import {
  createReadingEntry,
  findReadingEntriesByTitle,
  getReadingEntryBySlug,
  listReadingEntries,
  updateReadingEntry,
} from '@personal-blog/shared/reading-db';

interface DiscordEnv {
  DB?: D1Database;
  ASSETS_BUCKET?: R2Bucket;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID?: string;
  DISCORD_TOKEN?: string;
}

interface UserProfilePreviewRow {
  name?: string | null;
  bio?: string | null;
}

interface DiscordAttachmentOption {
  name?: string;
  value?: string;
  type?: number;
  options?: DiscordAttachmentOption[];
}

interface DiscordResolvedAttachment {
  id: string;
  filename: string;
  size: number;
  url: string;
  content_type?: string;
  width?: number;
  height?: number;
}

interface DiscordModalRow {
  components?: Array<{ custom_id?: string; value?: string }>;
}

type DiscordEntry = Pick<Entry, 'id' | 'title' | 'cover_asset_id'>;
type ReadingListFilters = {
  keyword?: string;
  status?: 'completed' | 'ongoing' | 'dropped';
  tag?: string;
};

function resolveCommandKey(name: string, options: DiscordAttachmentOption[] = []): string {
  const base = CHINESE_TO_ENGLISH_COMMAND_MAP[name] || name;
  const firstOption = options[0];
  if (!firstOption || firstOption.type !== 1 || !firstOption.name) {
    return base;
  }

  if (name === '動態') {
    if (firstOption.name === '旅記') return 'travel';
    return 'post';
  }

  if (name === '文章') {
    if (firstOption.name === '書摘') return 'reading';
    return 'article';
  }

  if (name === '個人資料') {
    if (firstOption.name === '頭貼') return 'profile_avatar';
    if (firstOption.name === '橫條') return 'profile_banner';
    return 'profile';
  }

  return base;
}

function resolveCommandOptions(options: DiscordAttachmentOption[] = []): DiscordAttachmentOption[] {
  const firstOption = options[0];
  if (firstOption?.type === 1 && Array.isArray(firstOption.options)) {
    return firstOption.options;
  }
  return options;
}

function buildHelpMessage() {
  return [
    'Discord 指令大全',
    '',
    '1. `/動態`',
    '一般：新增一般貼文',
    '旅記：新增旅行貼文',
    '可在 modal 裡補摘要、發佈設定、tags',
    '',
    '2. `/文章`',
    '一般：新增一般文章草稿',
    '書摘：新增書摘或閱讀心得',
    '可在 modal 裡補摘要、發佈設定、tags',
    '',
    '3. `/補圖`',
    'slug：指定文章 slug',
    'image：上傳圖片',
    'alt：圖片說明（選填）',
    '',
    '4. `/個人資料`',
    '編輯：修改名稱、簡介、連結',
    '頭貼：上傳頭貼圖片',
    '橫條：上傳 banner 圖片',
    '',
    '5. `/管理`',
    '查看最近內容，並可編輯、典藏、刪除',
    '',
    '6. `/讀了`',
    '新增閱讀記錄：作品名、作者、分類、狀態',
    '可選評分、日期、tags、上鎖模式',
    '',
    '7. `/補心得`',
    '表單編輯短評、評分、日期、文案與詳細心得',
    '',
    '8. `/改狀態`',
    '把閱讀改成讀完、追更中或棄文',
    '',
    '9. `/書單`',
    '查看最近閱讀記錄，或用關鍵字搜尋',
    '',
    'Tag 規則',
    'structured tags：genre / medium / tone / setting / relationship / warning / topic',
    'free tags：其他自由關鍵字',
    '例：proof -> topic:proof，travel -> setting:travel',
  ].join('\n');
}

function extractOptionValue(
  options: DiscordAttachmentOption[],
  name: string
): string | undefined {
  const option = options.find((item) => item.name === name);
  if (typeof option?.value === 'string') return option.value;
  if (typeof option?.value === 'number') return String(option.value);
  return undefined;
}

function isReadingGenre(value: string): value is 'bl' | 'bg' | 'gl' | 'gen' {
  return value === 'bl' || value === 'bg' || value === 'gl' || value === 'gen';
}

function isReadingMedium(
  value: string
): value is 'novel' | 'comic' | 'manhwa' | 'manga' | 'webtoon' | 'drama' {
  return (
    value === 'novel' ||
    value === 'comic' ||
    value === 'manhwa' ||
    value === 'manga' ||
    value === 'webtoon' ||
    value === 'drama'
  );
}

function isReadStatus(value: string): value is 'completed' | 'ongoing' | 'dropped' {
  return value === 'completed' || value === 'ongoing' || value === 'dropped';
}

function parseReadingScore(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    return Number.NaN;
  }
  return score;
}

function normalizeReadAt(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
}

function normalizeReadingTagInput(value: string | undefined): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      parseManualTags(value)
        .map((tag) => normalizeTagInput(tag).slug)
        .filter(Boolean)
    )
  );
}

function isLockModeValue(value: string): value is 'none' | '18plus' | 'controversial' {
  return value === 'none' || value === '18plus' || value === 'controversial';
}

function formatLockModePreview(value: string | undefined): string {
  if (value === '18plus') return '18+';
  if (value === 'controversial') return '爭議題材';
  return '未上鎖';
}

function parseStoredReadingTags(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function formatReadingTagPreview(tags: string[]): string {
  if (tags.length === 0) return '—';
  return tags.slice(0, 4).join('、');
}

async function buildReadingListPayload(
  db: D1Database,
  filters: ReadingListFilters = {}
): Promise<{
  content: string;
  embeds?: object[];
  components?: object[];
}> {
  const baseEntries = filters.keyword
    ? await findReadingEntriesByTitle(db, filters.keyword, 20)
    : await listReadingEntries(db, {
        read_status: filters.status,
        sort: 'read_at',
        limit: 30,
      });

  const normalizedTag = filters.tag ? normalizeTagInput(filters.tag).slug : '';
  const entries = baseEntries
    .filter((entry) => {
      if (filters.status && entry.read_status !== filters.status) return false;
      if (!normalizedTag) return true;
      const tags = parseStoredReadingTags(entry.tags).map((tag) => normalizeTagInput(tag).slug);
      return tags.includes(normalizedTag);
    })
    .slice(0, 5);

  const filterSummary = [
    filters.keyword ? `關鍵字：${filters.keyword}` : '',
    filters.status ? `狀態：${labelReadStatus(filters.status)}` : '',
    normalizedTag ? `tag：${normalizedTag}` : '',
  ]
    .filter(Boolean)
    .join('｜');

  if (entries.length === 0) {
    return {
      content: filterSummary
        ? `目前沒有符合條件的閱讀記錄。\n${filterSummary}`
        : '目前沒有符合條件的閱讀記錄。',
      components: [],
    };
  }

  const fields = entries.map((entry, index) => {
    const tags = parseStoredReadingTags(entry.tags);
    return {
      name: `${index + 1}. ${entry.title}`,
      value: [
        entry.author ? `作者：${entry.author}` : '作者：—',
        `狀態：${labelReadStatus(entry.read_status)}｜評分：${
          entry.score != null ? entry.score.toFixed(1) : '—'
        }｜日期：${entry.read_at || '—'}`,
        `tags：${formatReadingTagPreview(tags)}`,
        `slug：\`${entry.slug}\``,
      ].join('\n'),
      inline: false,
    };
  });

  return {
    content: filterSummary ? `閱讀清單｜${filterSummary}` : '閱讀清單',
    embeds: [
      {
        title: '📚 閱讀清單',
        color: 0x8f6bdc,
        fields,
        footer: { text: '從下方選一筆，就可以編輯或刪除。' },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: 'reading_select',
            placeholder: '選擇一筆閱讀記錄管理',
            min_values: 1,
            max_values: 1,
            options: entries.map((entry, index) => ({
              label: `${index + 1}. ${entry.title}`.slice(0, 100),
              description: `${labelReadStatus(entry.read_status)}｜${entry.author || '未知作者'}｜${entry.slug}`.slice(0, 100),
              value: entry.slug,
            })),
          },
        ],
      },
    ],
  };
}


function readingReviewModal(
  title: string,
  slug: string,
  existing?: {
    score?: number | null;
    read_at?: string | null;
    short_review?: string | null;
    blurb?: string | null;
    detail_review?: string | null;
  }
) {
  const withValue = (value?: string | null) => (value ? { value } : {});

  return {
    type: 9,
    data: {
      custom_id: `reading_review_modal:${slug}`,
      title: `補心得：${title.slice(0, 40)}`,
      components: [
        {
          type: 1,
          components: [{
            type: 4,
            custom_id: 'score',
            label: '評分（選填）',
            style: 1,
            required: false,
            max_length: 10,
            placeholder: '0-10，可用小數',
            ...withValue(
              existing?.score != null && Number.isFinite(existing.score)
                ? String(existing.score)
                : undefined
            ),
          }],
        },
        {
          type: 1,
          components: [{
            type: 4,
            custom_id: 'read_at',
            label: '閱讀日期（選填）',
            style: 1,
            required: false,
            max_length: 10,
            placeholder: 'YYYY-MM-DD',
            ...withValue(existing?.read_at),
          }],
        },
        {
          type: 1,
          components: [{
            type: 4,
            custom_id: 'short_review',
            label: '短評（選填）',
            style: 1,
            required: false,
            max_length: 280,
            placeholder: '一句話記下你的感受',
            ...withValue(existing?.short_review),
          }],
        },
        {
          type: 1,
          components: [{
            type: 4,
            custom_id: 'blurb',
            label: '文案 / 簡介（選填）',
            style: 2,
            required: false,
            max_length: 4000,
            placeholder: '貼作品簡介或文案',
            ...withValue(existing?.blurb),
          }],
        },
        {
          type: 1,
          components: [{
            type: 4,
            custom_id: 'detail_review',
            label: '詳細心得（選填）',
            style: 2,
            required: false,
            max_length: 4000,
            placeholder: '完整心得之後慢慢補也可以',
            ...withValue(existing?.detail_review),
          }],
        },
      ],
    },
  };
}

function readingEditModal(
  title: string,
  slug: string,
  existing?: {
    title?: string | null;
    author?: string | null;
    read_status?: string | null;
    score?: number | null;
    read_at?: string | null;
    tags?: string | null;
  }
) {
  const withValue = (value?: string | null) => (value ? { value } : {});
  const storedTags = parseStoredReadingTags(existing?.tags).join(', ');

  return {
    type: 9,
    data: {
      custom_id: `reading_edit_modal:${slug}`,
      title: `編輯閱讀：${title.slice(0, 40)}`,
      components: [
        {
          type: 1,
          components: [{
            type: 4,
            custom_id: 'title',
            label: '作品名',
            style: 1,
            required: true,
            max_length: 200,
            ...withValue(existing?.title || title),
          }],
        },
        {
          type: 1,
          components: [{
            type: 4,
            custom_id: 'status',
            label: '狀態',
            style: 1,
            required: false,
            max_length: 20,
            placeholder: 'completed / ongoing / dropped',
            ...withValue(existing?.read_status),
          }],
        },
        {
          type: 1,
          components: [{
            type: 4,
            custom_id: 'score',
            label: '評分（選填）',
            style: 1,
            required: false,
            max_length: 10,
            placeholder: '0-10，可用小數',
            ...withValue(
              existing?.score != null && Number.isFinite(existing.score)
                ? String(existing.score)
                : undefined
            ),
          }],
        },
        {
          type: 1,
          components: [{
            type: 4,
            custom_id: 'read_at',
            label: '閱讀日期（選填）',
            style: 1,
            required: false,
            max_length: 10,
            placeholder: 'YYYY-MM-DD',
            ...withValue(existing?.read_at),
          }],
        },
        {
          type: 1,
          components: [{
            type: 4,
            custom_id: 'tags',
            label: '標籤（選填）',
            style: 1,
            required: false,
            max_length: 200,
            placeholder: 'genre:bl relationship:older-seme topic:reading',
            ...withValue(storedTags),
          }],
        },
      ],
    },
  };
}

function labelReadStatus(status: string) {
  if (status === 'completed') return '讀完';
  if (status === 'ongoing') return '追更中';
  if (status === 'dropped') return '棄文';
  return status;
}

function normalizeLookupKeyword(value: string) {
  return value.trim().toLocaleLowerCase('zh-TW');
}

export async function handleDiscordInteraction(c: Context<{ Bindings: DiscordEnv }>) {
  // ── Verify signature ─────────────────────────────────────────────────────
  const signature = c.req.header('x-signature-ed25519');
  const timestamp = c.req.header('x-signature-timestamp');
  if (!signature || !timestamp) {
    return c.json({ error: 'Missing signature headers' }, 401);
  }

  const body = await c.req.text();
  const isValid = await verifyDiscordSignature(
    signature,
    timestamp,
    body,
    c.env.DISCORD_PUBLIC_KEY
  );
  if (!isValid) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  const payload = JSON.parse(body);
  const db = c.env.DB;
  if (!db) return c.json({ error: 'Database not configured' }, 500);

  // ── 1. PING ───────────────────────────────────────────────────────────────
  if (payload.type === 1) {
    return c.json({ type: 1 });
  }

  // ── 2. APPLICATION_COMMAND ────────────────────────────────────────────────
  if (payload.type === 2) {
    const name: string = payload.data?.name ?? '';
    const rawOptions = (payload.data?.options ?? []) as DiscordAttachmentOption[];
    const commandKey = resolveCommandKey(name, rawOptions);
    const options = resolveCommandOptions(rawOptions);

    // /管理 — deferred ephemeral, then follow-up via REST
    if (commandKey === 'list') {
      const appId = c.env.DISCORD_APPLICATION_ID;
      const discordToken = c.env.DISCORD_TOKEN;
      const token: string = payload.token;

      if (appId && discordToken && token) {
        (c.executionCtx as ExecutionContext).waitUntil(
          sendListFollowup(db, appId, token, discordToken)
        );
      }

      // Respond immediately so Discord doesn't timeout
      return c.json({ type: 5, data: { flags: 64 } });
    }

    if (commandKey === 'help' || name === 'help') {
      return c.json({
        type: 4,
        data: {
          content: buildHelpMessage(),
          flags: 64,
        },
      });
    }

    if (commandKey === 'reading_create') {
      const title = extractOptionValue(options, 'title')?.trim();
      const author = extractOptionValue(options, 'author')?.trim();
      const genreRaw = extractOptionValue(options, 'genre')?.trim().toLowerCase();
      const mediumRaw = extractOptionValue(options, 'medium')?.trim().toLowerCase();
      const statusRaw = extractOptionValue(options, 'status')?.trim().toLowerCase();
      const scoreRaw = extractOptionValue(options, 'score')?.trim();
      const readAtRaw = extractOptionValue(options, 'read_at');
      const tagsRaw = extractOptionValue(options, 'tags');
      const lockModeRaw = extractOptionValue(options, 'lock_mode')?.trim().toLowerCase();

      if (!title) {
        return c.json({ type: 4, data: { content: '❌ 作品名不能為空', flags: 64 } });
      }
      if (!genreRaw || !isReadingGenre(genreRaw)) {
        return c.json({ type: 4, data: { content: '❌ 分類格式不正確', flags: 64 } });
      }
      if (!statusRaw || !isReadStatus(statusRaw)) {
        return c.json({ type: 4, data: { content: '❌ 閱讀狀態格式不正確', flags: 64 } });
      }

      const medium = mediumRaw && isReadingMedium(mediumRaw) ? mediumRaw : 'novel';
      const score = parseReadingScore(scoreRaw);
      if (Number.isNaN(score)) {
        return c.json({ type: 4, data: { content: '❌ 評分請填 0 到 10 之間的數字', flags: 64 } });
      }

      const readAt = normalizeReadAt(readAtRaw);
      if (readAt === '') {
        return c.json({
          type: 4,
          data: { content: '❌ 閱讀日期請用 YYYY-MM-DD，例如 2026-04-10', flags: 64 },
        });
      }

      if (lockModeRaw && !isLockModeValue(lockModeRaw)) {
        return c.json({
          type: 4,
          data: { content: '❌ 上鎖模式不正確，請重新選擇指令選項', flags: 64 },
        });
      }

      const tags = Array.from(
        new Set([
          ...normalizeReadingTagInput(tagsRaw),
          ...resolveLockModeTags(lockModeRaw),
        ])
      );

      const result = await createReadingEntry(db, {
        title,
        author: author || undefined,
        genre: genreRaw,
        medium,
        read_status: statusRaw,
        score,
        read_at: readAt,
        tags,
        source: 'discord',
      });

      const detailParts = [
        author ? `作者：${author}` : '',
        score !== undefined ? `評分：${score.toFixed(1)}` : '',
        readAt ? `閱讀日期：${readAt}` : '',
        tags.length > 0 ? `標籤：${tags.join('、')}` : '',
        lockModeRaw ? `上鎖：${formatLockModePreview(lockModeRaw)}` : '',
      ].filter(Boolean);

      return c.json({
        type: 4,
        data: {
          content: [
            `✅ 已新增閱讀記錄：${title}`,
            detailParts.length > 0 ? detailParts.join('｜') : '',
            `/reading/${result.slug}`,
          ]
            .filter(Boolean)
            .join('\n'),
          flags: 64,
        },
      });
    }

    if (commandKey === 'reading_review') {
      const keyword = extractOptionValue(options, 'title')?.trim();
      if (!keyword) {
        return c.json({ type: 4, data: { content: '❌ 請提供作品名', flags: 64 } });
      }
      const matches = await findReadingEntriesByTitle(db, keyword, 5);
      if (matches.length === 0) {
        return c.json({ type: 4, data: { content: `❌ 找不到「${keyword}」`, flags: 64 } });
      }

      const exactMatches = matches.filter((entry) => {
        return normalizeLookupKeyword(entry.title) === normalizeLookupKeyword(keyword);
      });

      if (exactMatches.length === 1) {
        const target = await getReadingEntryBySlug(db, exactMatches[0].slug);
        return c.json(
          readingReviewModal(exactMatches[0].title, exactMatches[0].slug, target ?? undefined)
        );
      }

      if (matches.length === 1) {
        const target = await getReadingEntryBySlug(db, matches[0].slug);
        return c.json(readingReviewModal(matches[0].title, matches[0].slug, target ?? undefined));
      }

      const lines = matches.map((entry, index) => {
        const author = entry.author ? `｜${entry.author}` : '';
        return `${index + 1}. ${entry.title}${author}｜slug: ${entry.slug}`;
      });

      return c.json({
        type: 4,
        data: {
          content: `找到多筆符合「${keyword}」的作品，請把關鍵字輸入得更完整一點：\n\n${lines.join('\n')}`,
          flags: 64,
        },
      });
    }

    if (commandKey === 'reading_status') {
      const keyword = extractOptionValue(options, 'title')?.trim();
      const status = extractOptionValue(options, 'status')?.trim();
      if (!keyword || !status) {
        return c.json({ type: 4, data: { content: '❌ 請提供作品名與新狀態', flags: 64 } });
      }
      const matches = await findReadingEntriesByTitle(db, keyword, 5);
      const entry = matches[0];
      if (!entry) {
        return c.json({ type: 4, data: { content: `❌ 找不到「${keyword}」`, flags: 64 } });
      }
      await updateReadingEntry(db, entry.id, { read_status: status as 'completed' | 'ongoing' | 'dropped' });
      return c.json({
        type: 4,
        data: {
          content: `✅ 已把「${entry.title}」改成${labelReadStatus(status)}`,
          flags: 64,
        },
      });
    }

    if (commandKey === 'reading_list') {
      const keyword = extractOptionValue(options, 'keyword')?.trim();
      const status = extractOptionValue(options, 'status')?.trim();
      const tag = extractOptionValue(options, 'tag')?.trim();
      const payload = await buildReadingListPayload(db, {
        keyword,
        status: status as 'completed' | 'ongoing' | 'dropped' | undefined,
        tag,
      });

      return c.json({
        type: 4,
        data: {
          ...payload,
          flags: 64,
        },
      });
    }

    // /補圖 — attach image(s) to an existing entry by slug
    if (commandKey === 'attach') {
      const slugOpt = options.find((option) => option.name === 'slug');
      const altOpt = options.find((option) => option.name === 'alt');
      const slug = slugOpt?.value?.trim();

      if (!slug) {
        return c.json({ type: 4, data: { content: '❌ 請提供文章 slug', flags: 64 } });
      }

      const entry = (await getEntryBySlug(db, slug)) as DiscordEntry | null;
      if (!entry) {
        return c.json({ type: 4, data: { content: `❌ 找不到 slug: ${slug}`, flags: 64 } });
      }

      const entryId = entry.id;
      const resolvedAttachments = payload.data?.resolved?.attachments
        ? (Object.values(payload.data.resolved.attachments) as DiscordResolvedAttachment[])
        : [];

      if (resolvedAttachments.length === 0) {
        return c.json({ type: 4, data: { content: '❌ 請附上至少一張圖片', flags: 64 } });
      }

      const bucket = c.env.ASSETS_BUCKET;
      if (!bucket) {
        return c.json({ type: 4, data: { content: '❌ R2 bucket 未設定', flags: 64 } });
      }

      try {
        const result = await processAttachments(resolvedAttachments, entryId, bucket, {
          altText: altOpt?.value?.trim(),
          coverMode: 'auto',
        });

        for (const asset of result.pendingAssets) {
          await createAsset(db, {
            id: asset.id,
            entry_id: entryId,
            kind: asset.kind,
            storage_key: asset.storage_key,
            mime_type: asset.mime_type,
            width: asset.width,
            height: asset.height,
            alt_text: asset.alt_text,
            sort_order: asset.sort_order,
          });
        }

        // Set first cover asset if none set yet
        if (result.pendingAssets.some((a) => a.kind === 'cover') && !entry.cover_asset_id) {
          const coverId = result.pendingAssets.find((a) => a.kind === 'cover')!.id;
          await db.prepare('UPDATE entries SET cover_asset_id = ? WHERE id = ?').bind(coverId, entryId).run();
        }

        return c.json({
          type: 4,
          data: {
            content: `🖼️ 已為「${entry.title || slug}」附加 ${result.pendingAssets.length} 張圖片`,
            flags: 64,
          },
        });
      } catch (error) {
        console.error('Attach error:', error);
        return c.json({ type: 4, data: { content: '❌ 圖片上傳失敗，請稍後再試', flags: 64 } });
      }
    }

    // /個人資料 — open profile update modal
    if (commandKey === 'profile') {
      // Fetch current values to pre-fill
      let currentName = 'life';
      let currentBio = '';
      try {
        const row = (await db
          .prepare('SELECT name, bio FROM user_profile WHERE id = 1')
          .first()) as UserProfilePreviewRow | null;
        if (row) { currentName = row.name || 'life'; currentBio = row.bio || ''; }
      } catch {
        currentName = 'life';
        currentBio = '';
      }

      return c.json({
        type: 9, // MODAL
        data: {
          custom_id: 'profile_modal',
          title: '編輯個人資料',
          components: [
            {
              type: 1,
              components: [{
                type: 4, custom_id: 'name', label: '名稱',
                style: 1, required: true, max_length: 50,
                placeholder: currentName,
              }],
            },
            {
              type: 1,
              components: [{
                type: 4, custom_id: 'bio', label: '簡介',
                style: 2, required: false, max_length: 300,
                placeholder: currentBio || '寫幾句自我介紹…',
              }],
            },
            {
              type: 1,
              components: [{
                type: 4, custom_id: 'links', label: '連結（JSON，選填）',
                style: 2, required: false, max_length: 500,
                placeholder: '[{"label":"GitHub","url":"https://github.com/yourname"}]',
              }],
            },
          ],
        },
      });
    }

    // /個人資料 頭貼 or 橫條 — upload profile image to R2
    if (commandKey === 'profile_avatar' || commandKey === 'profile_banner') {
      const imageOpt = options.find((option) => option.name === 'image');
      const imageId = imageOpt?.value;
      const attachment = imageId
        ? (payload.data?.resolved?.attachments?.[imageId] as DiscordResolvedAttachment | null)
        : null;

      if (!attachment) {
        return c.json({ type: 4, data: { content: '❌ 請附上圖片', flags: 64 } });
      }

      const bucket = c.env.ASSETS_BUCKET;
      if (!bucket) {
        return c.json({ type: 4, data: { content: '❌ R2 bucket 未設定', flags: 64 } });
      }

      try {
        const response = await fetch(attachment.url);
        if (!response.ok) throw new Error('Download failed');
        const bytes = await response.arrayBuffer();

        const contentType = attachment.content_type || 'image/jpeg';
        const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
        const field = commandKey === 'profile_avatar' ? 'avatar' : 'banner';
        const storageKey = `profile/${field}${ext}`;

        await bucket.put(storageKey, bytes, { httpMetadata: { contentType } });

        const col = field === 'avatar' ? 'avatar_key' : 'banner_key';
        await db.prepare(
          `INSERT INTO user_profile (id, ${col}, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(id) DO UPDATE SET ${col} = excluded.${col}, updated_at = CURRENT_TIMESTAMP`
        ).bind(storageKey).run();

        const label = field === 'avatar' ? '頭貼' : '橫條';
        return c.json({ type: 4, data: { content: `✅ ${label}已更新`, flags: 64 } });
      } catch (err) {
        console.error('Profile image upload error:', err);
        return c.json({ type: 4, data: { content: '❌ 圖片上傳失敗，請稍後再試', flags: 64 } });
      }
    }

    // /動態 /文章（含子命令）— open create modal
    const preset = getCommandPreset(commandKey);
    if (preset) {
      return c.json(openCreateModal(preset, commandKey));
    }

    return c.json({ type: 4, data: { content: `❌ 未知指令: ${name}`, flags: 64 } });
  }

  // ── 3. MESSAGE_COMPONENT (button clicks and select menus) ────────────────
  if (payload.type === 3) {
    const customId: string = payload.data?.custom_id ?? '';
    const values: string[] | undefined = payload.data?.values;
    const response = await handleComponent(db, customId, values);
    return c.json(response);
  }

  // ── 5. MODAL_SUBMIT ───────────────────────────────────────────────────────
  if (payload.type === 5) {
    const customId: string = payload.data?.custom_id ?? '';
    const components = payload.data?.components ?? [];

    if (customId.startsWith('create:')) {
      const commandKey = customId.slice('create:'.length);
      return c.json(await handleCreateModal(db, commandKey, components));
    }

    if (customId.startsWith('edit_modal:')) {
      const entryId = customId.slice('edit_modal:'.length);
      return c.json(await handleEditModal(db, entryId, components));
    }

    if (customId === 'profile_modal') {
      const get = (id: string) =>
        (components as DiscordModalRow[])
          .flatMap((row) => row.components ?? [])
          .find((component) => component.custom_id === id)?.value || '';

      const name = get('name').trim() || 'life';
      const bio = get('bio').trim();
      const linksRaw = get('links').trim();
      let links: any[] = [];
      if (linksRaw) {
        try { links = JSON.parse(linksRaw); } catch {
          return c.json({ type: 4, data: { content: '❌ 連結格式不正確，請使用 JSON 陣列', flags: 64 } });
        }
      }

      await db.prepare(
        `INSERT INTO user_profile (id, name, bio, links_json, updated_at)
         VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, bio = excluded.bio,
           links_json = excluded.links_json, updated_at = CURRENT_TIMESTAMP`
      ).bind(name, bio, JSON.stringify(links)).run();

      return c.json({ type: 4, data: { content: `✅ 個人資料已更新`, flags: 64 } });
    }

    if (customId === 'reading_create_modal') {
      const get = (id: string) =>
        (components as DiscordModalRow[])
          .flatMap((row) => row.components ?? [])
          .find((component) => component.custom_id === id)?.value || '';

      const title = get('title').trim();
      const author = get('author').trim();
      const genre = get('genre').trim() as 'bl' | 'bg' | 'gl' | 'gen';
      const medium = (get('medium').trim() || 'novel') as
        | 'novel'
        | 'comic'
        | 'manhwa'
        | 'manga'
        | 'webtoon'
        | 'drama';
      const status = get('status').trim() as 'completed' | 'ongoing' | 'dropped';

      if (!title) {
        return c.json({ type: 4, data: { content: '❌ 作品名不能為空', flags: 64 } });
      }

      const result = await createReadingEntry(db, {
        title,
        author: author || undefined,
        genre,
        medium,
        read_status: status,
        source: 'discord',
      });

      return c.json({
        type: 4,
        data: {
          content: `✅ 已新增閱讀記錄：${title}\n/reading/${result.slug}`,
          flags: 64,
        },
      });
    }

    if (customId.startsWith('reading_review_modal:')) {
      const slug = customId.slice('reading_review_modal:'.length);
      const target = await getReadingEntryBySlug(db, slug);
      if (!target) {
        return c.json({ type: 4, data: { content: '❌ 找不到此閱讀記錄', flags: 64 } });
      }

      const get = (id: string) =>
        (components as DiscordModalRow[])
          .flatMap((row) => row.components ?? [])
          .find((component) => component.custom_id === id)?.value || '';

      const scoreValue = get('score').trim();
      if (scoreValue) {
        const score = parseReadingScore(scoreValue);
        if (Number.isNaN(score)) {
          return c.json({
            type: 4,
            data: { content: '❌ 評分請填 0 到 10 之間的數字', flags: 64 },
          });
        }
      }

      const readAtValue = get('read_at').trim();
      if (readAtValue) {
        const normalized = normalizeReadAt(readAtValue);
        if (normalized === '') {
          return c.json({
            type: 4,
            data: {
              content: '❌ 閱讀日期請用 YYYY-MM-DD，例如 2026-04-10',
              flags: 64,
            },
          });
        }
      }

      const score = scoreValue ? parseReadingScore(scoreValue) : null;
      const readAt = readAtValue ? normalizeReadAt(readAtValue) : null;
      const shortReview = get('short_review').trim();
      const blurb = get('blurb').trim();
      const detailReview = get('detail_review').trim();

      await updateReadingEntry(db, target.id, {
        score: scoreValue ? (score ?? null) : null,
        read_at: readAtValue ? (readAt ?? null) : null,
        short_review: shortReview || null,
        blurb: blurb || null,
        detail_review: detailReview || null,
      });

      const summary = [
        scoreValue && score != null ? `評分：${score.toFixed(1)}` : '',
        readAt ? `日期：${readAt}` : '',
        shortReview ? '已更新短評' : '',
        detailReview ? '已更新詳細心得' : '',
      ].filter(Boolean);

      return c.json({
        type: 4,
        data: {
          content: `✅ 已更新「${target.title}」\n${summary.join('｜') || '欄位已儲存'}`,
          flags: 64,
        },
      });
    }

    if (customId.startsWith('reading_edit_modal:')) {
      const slug = customId.slice('reading_edit_modal:'.length);
      const target = await getReadingEntryBySlug(db, slug);
      if (!target) {
        return c.json({ type: 4, data: { content: '❌ 找不到此閱讀記錄', flags: 64 } });
      }

      const get = (id: string) =>
        (components as DiscordModalRow[])
          .flatMap((row) => row.components ?? [])
          .find((component) => component.custom_id === id)?.value || '';

      const title = get('title').trim();
      if (!title) {
        return c.json({ type: 4, data: { content: '❌ 作品名不能為空', flags: 64 } });
      }

      const statusValue = get('status').trim().toLowerCase();
      if (statusValue && !isReadStatus(statusValue)) {
        return c.json({ type: 4, data: { content: '❌ 狀態請填 completed / ongoing / dropped', flags: 64 } });
      }

      const scoreValue = get('score').trim();
      if (scoreValue) {
        const score = parseReadingScore(scoreValue);
        if (Number.isNaN(score)) {
          return c.json({ type: 4, data: { content: '❌ 評分請填 0 到 10 之間的數字', flags: 64 } });
        }
      }

      const readAtValue = get('read_at').trim();
      if (readAtValue) {
        const normalized = normalizeReadAt(readAtValue);
        if (normalized === '') {
          return c.json({
            type: 4,
            data: { content: '❌ 閱讀日期請用 YYYY-MM-DD，例如 2026-04-10', flags: 64 },
          });
        }
      }

      const score = scoreValue ? parseReadingScore(scoreValue) : null;
      const readAt = readAtValue ? normalizeReadAt(readAtValue) : null;
      const tags = normalizeReadingTagInput(get('tags').trim());

      await updateReadingEntry(db, target.id, {
        title,
        read_status: statusValue ? (statusValue as 'completed' | 'ongoing' | 'dropped') : target.read_status,
        score: scoreValue ? (score ?? null) : null,
        read_at: readAtValue ? (readAt ?? null) : null,
        tags,
      });

      return c.json({
        type: 4,
        data: {
          content: `✅ 已更新「${title}」\n${[
            statusValue ? `狀態：${labelReadStatus(statusValue)}` : '',
            scoreValue && score != null ? `評分：${score.toFixed(1)}` : '',
            readAt ? `日期：${readAt}` : '',
            tags.length > 0 ? `標籤：${tags.join('、')}` : '',
          ]
            .filter(Boolean)
            .join('｜') || '欄位已儲存'}`,
          flags: 64,
        },
      });
    }

    return c.json({ type: 4, data: { content: '❌ 未知的表單提交', flags: 64 } });
  }

  return c.json({ error: 'Unhandled interaction type' }, 400);
}
