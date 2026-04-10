/**
 * Handles the /管理 command.
 * Uses deferred response to avoid Discord's 3-second timeout.
 *
 * Layout (5 action rows max):
 *   Embed: 5 entries listed
 *   Row 1-3: Per-entry buttons [✏️ Edit] [🗃️ Archive] [🗑️ Delete]
 *   Row 4:   Multi-select for batch ops (all 5 entries, max 3 selectable)
 *   Row 5:   [✅ 發佈所選] [🗃️ 典藏所選] [🗑️ 刪除所選]
 */

import { getRecentEntries } from '@personal-blog/shared/db';

const STATUS_LABEL: Record<string, string> = {
  published: '已發布',
  draft: '草稿',
  inbox: '收件匣',
  private: '私人',
  archived: '典藏',
};

const TYPE_LABEL: Record<string, string> = {
  post: '貼文',
  article: '文章',
};

const VISIBILITY_LABEL: Record<string, string> = {
  public: '公開',
  unlisted: '不公開列出',
  private: '私密',
};

const MANAGE_TYPE_OPTIONS = [
  { value: 'all', label: '全部類型' },
  { value: 'post', label: '只看貼文' },
  { value: 'article', label: '只看文章' },
] as const;

const MANAGE_STATUS_OPTIONS = [
  { value: 'all', label: '全部狀態' },
  { value: 'published', label: '已發布' },
  { value: 'draft', label: '草稿' },
  { value: 'inbox', label: '收件匣' },
  { value: 'private', label: '私人' },
  { value: 'archived', label: '典藏' },
] as const;

export interface ManageFilters {
  entryType?: 'post' | 'article';
  status?: 'published' | 'draft' | 'inbox' | 'private' | 'archived';
}

interface RecentEntry {
  id: string;
  slug: string;
  title: string | null;
  entry_type: string;
  status: string;
  visibility: string;
  created_at: string;
}

function normalizeFilterValue<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return value && allowed.includes(value as T) ? (value as T) : undefined;
}

export function parseManageFilterPayload(payload = ''): ManageFilters {
  const [entryTypeRaw, statusRaw] = payload.split(':');
  return {
    entryType: normalizeFilterValue(entryTypeRaw, ['post', 'article']),
    status: normalizeFilterValue(statusRaw, ['published', 'draft', 'inbox', 'private', 'archived']),
  };
}

function encodeManageFilterPayload(filters: ManageFilters): string {
  return `${filters.entryType ?? 'all'}:${filters.status ?? 'all'}`;
}

function formatFilterSummary(filters: ManageFilters) {
  const typeLabel = filters.entryType ? TYPE_LABEL[filters.entryType] : '全部內容';
  const statusLabel = filters.status ? STATUS_LABEL[filters.status] : '全部狀態';
  return `${typeLabel}｜${statusLabel}`;
}

function formatPublicState(entry: RecentEntry) {
  if (entry.status === 'published' && entry.visibility === 'public') return '🌍 已公開';
  if (entry.status === 'published' && entry.visibility === 'unlisted') return '🔗 不公開列出';
  if (entry.status === 'archived') return '🗃️ 已典藏';
  return '🔒 未公開';
}

function buildFilterRow(
  kind: 'manage_type' | 'manage_status',
  filters: ManageFilters
) {
  const encoded = encodeManageFilterPayload(filters);
  const options = kind === 'manage_type' ? MANAGE_TYPE_OPTIONS : MANAGE_STATUS_OPTIONS;
  const current = kind === 'manage_type' ? filters.entryType ?? 'all' : filters.status ?? 'all';
  const placeholder = kind === 'manage_type' ? '篩選內容類型' : '篩選內容狀態';

  return {
    type: 1,
    components: [
      {
        type: 3,
        custom_id: `${kind}:${encoded}`,
        placeholder,
        min_values: 1,
        max_values: 1,
        options: options.map((option) => ({
          label: option.label,
          value: option.value,
          default: option.value === current,
        })),
      },
    ],
  };
}

export async function buildListPayload(db: unknown, filters: ManageFilters = {}): Promise<object> {
  const entries = (await getRecentEntries(db as never, {
    limit: 5,
    entryType: filters.entryType,
    status: filters.status,
  })) as unknown as RecentEntry[];
  const encodedFilters = encodeManageFilterPayload(filters);
  const filterRows = [buildFilterRow('manage_type', filters), buildFilterRow('manage_status', filters)];

  if (entries.length === 0) {
    return {
      content: `目前沒有符合條件的內容。\n目前篩選：${formatFilterSummary(filters)}`,
      components: filterRows,
    };
  }

  // Embed: list all entries
  const fields = entries.map((e, i) => ({
    name: `${i + 1}. ${(e.title || '（無標題）').replace(/^#+\s+/, '').slice(0, 250)}`,
    value: [
      `類型：${TYPE_LABEL[e.entry_type] || e.entry_type}｜狀態：${STATUS_LABEL[e.status] || e.status}`,
      `公開：${formatPublicState(e)}｜可見：${VISIBILITY_LABEL[e.visibility] || e.visibility}`,
      `slug：\`${e.slug}\``,
      `建立：${new Date(e.created_at).toLocaleString('zh-TW')}`,
    ].join('\n'),
    inline: false,
  }));

  // Keep direct actions for the first two items to leave room for filters.
  const individualRows = entries.slice(0, 2).map((e) => ({
    type: 1,
    components: [
      { type: 2, style: 2, label: `✏️ 編輯`, custom_id: `edit:${e.id}` },
      { type: 2, style: 3, label: `🗃️ 典藏`, custom_id: `archive_confirm:${e.id}` },
      { type: 2, style: 4, label: `🗑️ 刪除`, custom_id: `harddelete_confirm:${e.id}` },
    ],
  }));

  // Row 4: Multi-select (all 5 entries, max 3 selectable)
  const selectRow = {
    type: 1,
    components: [
      {
        type: 3, // STRING_SELECT
        custom_id: `bulk_select:${encodedFilters}`,
        placeholder: '選擇內容進行批次操作',
        min_values: 1,
        max_values: entries.length,
        options: entries.map((e, i) => ({
          label: `${i + 1}. ${(e.title || '（無標題）').slice(0, 50)}`,
          description: `${TYPE_LABEL[e.entry_type] || e.entry_type}｜${STATUS_LABEL[e.status] || e.status}｜${e.slug}`,
          value: e.id,
        })),
      },
    ],
  };

  return {
    embeds: [
      {
        title: `📚 最近內容｜${formatFilterSummary(filters)}`,
        color: 0x2f68c8,
        fields,
        footer: { text: '先用上方篩選，再用下方選單批次操作；列表含 slug、公開狀態與建立時間' },
      },
    ],
    components: [...filterRows, ...individualRows, selectRow],
  };
}

async function patchDeferredMessage(
  appId: string,
  token: string,
  discordToken: string,
  payload: object
): Promise<void> {
  const res = await fetch(
    `https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${discordToken}`,
      },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)');
    console.error(`Discord PATCH failed ${res.status}:`, body);
  }
}

export async function sendListFollowup(
  db: unknown,
  appId: string,
  token: string,
  discordToken: string
): Promise<void> {
  try {
    const payload = await buildListPayload(db);
    await patchDeferredMessage(appId, token, discordToken, payload);
  } catch (error) {
    console.error('List follow-up error:', error);
    await patchDeferredMessage(appId, token, discordToken, {
      content: '❌ 載入文章列表失敗，請稍後再試',
    }).catch((error) => console.error('Fallback patch failed:', error));
  }
}
