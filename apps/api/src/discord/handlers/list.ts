/**
 * Handles /我的文章 command.
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
  published: '✅ 公開',
  draft: '📝 草稿',
  inbox: '📥 草稿',
  private: '🔒 私密',
  archived: '🗃️ 典藏',
};

const TYPE_LABEL: Record<string, string> = {
  post: '動態',
  article: '文章',
};

interface RecentEntry {
  id: string;
  title: string | null;
  entry_type: string;
  status: string;
  created_at: string;
}

async function buildListPayload(db: unknown): Promise<object> {
  const entries = (await getRecentEntries(db as never, 5)) as unknown as RecentEntry[];

  if (entries.length === 0) {
    return { content: '還沒有任何文章。試試 `/貼文` 來新增第一篇！', flags: 64 };
  }

  // Embed: list all entries
  const fields = entries.map((e, i) => ({
    name: `${i + 1}. ${(e.title || '（無標題）').replace(/^#+\s+/, '').slice(0, 250)}`,
    value: [
      `類型：${TYPE_LABEL[e.entry_type] || e.entry_type}`,
      `狀態：${STATUS_LABEL[e.status] || e.status}`,
      `建立：${new Date(e.created_at).toLocaleDateString('zh-TW')}`,
    ].join(' '),
    inline: false,
  }));

  // Rows 1-3: individual buttons for first 3 entries
  const individualRows = entries.slice(0, 3).map((e) => ({
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
        custom_id: 'bulk_select',
        placeholder: '選擇文章進行批次操作（最多 3 篇）',
        min_values: 1,
        max_values: entries.length,
        options: entries.map((e, i) => ({
          label: `${i + 1}. ${(e.title || '（無標題）').slice(0, 50)}`,
          description: `${STATUS_LABEL[e.status] || e.status} ${TYPE_LABEL[e.entry_type] || e.entry_type}`,
          value: e.id,
        })),
      },
    ],
  };

  // Row 5: Batch action buttons
  const batchRow = {
    type: 1,
    components: [
      { type: 2, style: 1, label: '✅ 發佈所選', custom_id: 'bulk_action:publish' },
      { type: 2, style: 3, label: '🗃️ 典藏所選', custom_id: 'bulk_action:archive' },
      { type: 2, style: 4, label: '🗑️ 刪除所選', custom_id: 'bulk_action:delete' },
    ],
  };

  return {
    flags: 64,
    embeds: [
      {
        title: '📚 最近的文章',
        color: 0x2f68c8,
        fields,
        footer: { text: '上方按鈕針對單篇，下方選單可批次操作' },
      },
    ],
    components: [...individualRows, selectRow, batchRow],
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
