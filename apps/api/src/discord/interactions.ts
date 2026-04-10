import type { Context } from 'hono';
import type { D1Database, ExecutionContext, R2Bucket } from '@cloudflare/workers-types';
import type { Entry } from '@personal-blog/shared';
import { verifyDiscordSignature } from './verify';
import { CHINESE_TO_ENGLISH_COMMAND_MAP, getCommandPreset } from './presets';
import { openCreateModal } from './handlers/create';
import { handleCreateModal, handleEditModal } from './handlers/modal';
import { sendListFollowup } from './handlers/list';
import { handleComponent } from './handlers/component';
import { getEntryBySlug, createAsset } from '@personal-blog/shared/db';
import { processAttachments } from './attachments';
import {
  createReadingEntry,
  findReadingEntriesByTitle,
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
    '',
    '7. `/補心得`',
    '補短評、文案或詳細心得',
    '',
    '8. `/改狀態`',
    '把閱讀改成讀完、追更中或棄文',
    '',
    '9. `/書單`',
    '查看最近閱讀記錄，或用關鍵字搜尋',
    '',
    'Tag 規則',
    'structured tags：genre / tone / setting / relationship / topic',
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


function readingReviewModal(title: string, slug: string) {
  return {
    type: 9,
    data: {
      custom_id: `reading_review_modal:${slug}`,
      title: `補心得：${title.slice(0, 40)}`,
      components: [
        {
          type: 1,
          components: [{ type: 4, custom_id: 'short_review', label: '短評（選填）', style: 1, required: false, max_length: 280, placeholder: '一句話記下你的感受' }],
        },
        {
          type: 1,
          components: [{ type: 4, custom_id: 'blurb', label: '文案 / 簡介（選填）', style: 2, required: false, max_length: 4000, placeholder: '貼作品簡介或文案' }],
        },
        {
          type: 1,
          components: [{ type: 4, custom_id: 'detail_review', label: '詳細心得（選填）', style: 2, required: false, max_length: 4000, placeholder: '完整心得之後慢慢補也可以' }],
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

      const result = await createReadingEntry(db, {
        title,
        author: author || undefined,
        genre: genreRaw,
        medium,
        read_status: statusRaw,
        score,
        read_at: readAt,
        source: 'discord',
      });

      const detailParts = [
        author ? `作者：${author}` : '',
        score !== undefined ? `評分：${score.toFixed(1)}` : '',
        readAt ? `閱讀日期：${readAt}` : '',
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
        return c.json(readingReviewModal(exactMatches[0].title, exactMatches[0].slug));
      }

      if (matches.length === 1) {
        return c.json(readingReviewModal(matches[0].title, matches[0].slug));
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
      const entries = keyword
        ? await findReadingEntriesByTitle(db, keyword, 10)
        : await listReadingEntries(db, {
            read_status: status as 'completed' | 'ongoing' | 'dropped' | undefined,
            sort: 'read_at',
            limit: 10,
          });

      if (entries.length === 0) {
        return c.json({ type: 4, data: { content: '目前沒有符合條件的閱讀記錄。', flags: 64 } });
      }

      const lines = entries.map((entry, index) => {
        const score = entry.score != null ? `｜${entry.score.toFixed(1)}` : '';
        const author = entry.author ? `｜${entry.author}` : '';
        return `${index + 1}. ${entry.title}${author}｜${entry.read_status}${score}`;
      });

      return c.json({
        type: 4,
        data: {
          content: `閱讀清單\n\n${lines.join('\n')}`,
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
      const entry = await findReadingEntriesByTitle(db, slug, 1);
      const target =
        entry[0]?.slug === slug ? entry[0] : (await listReadingEntries(db, { limit: 500 })).find((item) => item.slug === slug);
      if (!target) {
        return c.json({ type: 4, data: { content: '❌ 找不到此閱讀記錄', flags: 64 } });
      }

      const get = (id: string) =>
        (components as DiscordModalRow[])
          .flatMap((row) => row.components ?? [])
          .find((component) => component.custom_id === id)?.value || '';

      await updateReadingEntry(db, target.id, {
        short_review: get('short_review').trim() || null,
        blurb: get('blurb').trim() || null,
        detail_review: get('detail_review').trim() || null,
      });

      return c.json({
        type: 4,
        data: {
          content: `✅ 已更新「${target.title}」的心得`,
          flags: 64,
        },
      });
    }

    return c.json({ type: 4, data: { content: '❌ 未知的表單提交', flags: 64 } });
  }

  return c.json({ error: 'Unhandled interaction type' }, 400);
}
