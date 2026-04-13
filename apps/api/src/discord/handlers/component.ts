/**
 * Handles MESSAGE_COMPONENT interactions (type 3) — button clicks and select menus.
 *
 * custom_id formats:
 *   edit:{entryId}               → open edit modal (pre-filled)
 *   archive_confirm:{entryId}    → show archive confirmation buttons
 *   harddelete_confirm:{entryId} → show hard-delete confirmation buttons
 *   do_archive:{entryId}         → actually archive (soft delete)
 *   do_harddelete:{entryId}      → actually hard delete
 *   cancel                       → dismiss
 *   bulk_select                  → select menu changed; show action buttons (values = selected IDs)
 *   bulk_pub:id1|id2|id3         → publish selected entries
 *   bulk_archive:id1|id2|id3     → archive selected entries
 *   bulk_del:id1|id2|id3         → hard delete selected entries
 */

import { getEntryById, archiveEntry, deleteEntry, updateEntry, getTagsByEntryId } from '@personal-blog/shared/db';
import { normalizeTagInput, resolveLockModeTags } from '@personal-blog/shared';
import {
  deleteReadingEntry,
  getReadingEntryBySlug,
} from '@personal-blog/shared/reading-db';
import { buildListPayload, parseManageFilterPayload, type ManageFilters } from './list';

/** Build the edit modal pre-filled with current content + status + tags */
function editModal(entryId: string, entry: any, currentTags: string[]) {
  return {
    type: 9, // MODAL
    data: {
      custom_id: `edit_modal:${entryId}`,
      title: '編輯文章',
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'title',
              label: '標題',
              style: 1, // SHORT
              required: false,
              max_length: 200,
              value: entry.title || '',
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'status',
              label: '狀態 (draft / published / private / archived)',
              style: 1,
              required: false,
              max_length: 20,
              value: entry.status || 'draft',
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'tags',
              label: '標籤（逗號或空白分隔，留空清除）',
              style: 1,
              required: false,
              max_length: 200,
              value: currentTags.join(', '),
              placeholder: 'setting:travel mood:calm, note',
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'content',
              label: '內容',
              style: 2, // PARAGRAPH
              required: true,
              max_length: 4000,
              value: (entry.content_markdown || '').slice(0, 4000),
            },
          ],
        },
      ],
    },
  };
}

/** Confirmation prompt for archive (soft delete) */
function archiveConfirmMessage(entryId: string, title: string) {
  return {
    type: 7, // UPDATE_MESSAGE
    data: {
      content: `🗃️ 確定要典藏「**${title}**」嗎？\n典藏後不會在網站顯示，但資料不會消失。`,
      embeds: [],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3, // SUCCESS
              label: '✅ 確定典藏',
              custom_id: `do_archive:${entryId}`,
            },
            {
              type: 2,
              style: 2, // SECONDARY
              label: '❌ 取消',
              custom_id: 'cancel',
            },
          ],
        },
      ],
    },
  };
}

/** Confirmation prompt for hard delete */
function hardDeleteConfirmMessage(entryId: string, title: string) {
  return {
    type: 7, // UPDATE_MESSAGE
    data: {
      content: `⚠️ 確定要**永久刪除**「**${title}**」嗎？\n這個操作**無法復原**，文章與所有附件將永久消失。`,
      embeds: [],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 4, // DANGER
              label: '🗑️ 確定永久刪除',
              custom_id: `do_harddelete:${entryId}`,
            },
            {
              type: 2,
              style: 2,
              label: '❌ 取消',
              custom_id: 'cancel',
            },
          ],
        },
      ],
    },
  };
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

const READING_LOCK_TAGS = ['warning:18plus', 'warning:controversial'];

function detectReadingLockMode(tags: string[]): 'none' | '18plus' | 'controversial' {
  const normalized = new Set(tags.map((tag) => normalizeTagInput(tag).slug));
  if (normalized.has('warning:18plus')) return '18plus';
  if (normalized.has('warning:controversial')) return 'controversial';
  return 'none';
}

function replaceReadingLockTags(tags: string[], lockMode: 'none' | '18plus' | 'controversial'): string[] {
  const withoutLockTags = tags.filter((tag) => {
    const slug = normalizeTagInput(tag).slug;
    return !READING_LOCK_TAGS.includes(slug);
  });

  return Array.from(
    new Set([...withoutLockTags, ...resolveLockModeTags(lockMode)])
  );
}

function labelReadingLockMode(lockMode: 'none' | '18plus' | 'controversial'): string {
  if (lockMode === '18plus') return '18+';
  if (lockMode === 'controversial') return '爭議題材';
  return '未上鎖';
}

function readingEditModal(slug: string, entry: any) {
  const withValue = (value?: string | null) => (value ? { value } : {});
  const tags = parseStoredReadingTags(entry.tags).join(', ');

  return {
    type: 9,
    data: {
      custom_id: `reading_edit_modal:${slug}`,
      title: `編輯閱讀：${(entry.title || '未命名').slice(0, 40)}`,
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
            ...withValue(entry.title),
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
            ...withValue(entry.read_status),
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
            ...withValue(entry.score != null ? String(entry.score) : undefined),
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
            ...withValue(entry.read_at),
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
            placeholder: 'topic:reading relationship:older-seme',
            ...withValue(tags),
          }],
        },
      ],
    },
  };
}

function readingActionMessage(entry: any) {
  const score = entry.score != null ? entry.score.toFixed(1) : '—';
  const tags = parseStoredReadingTags(entry.tags);
  const lockMode = detectReadingLockMode(tags);
  return {
    type: 4,
    data: {
      content: [
        `📘 已選擇「${entry.title}」`,
        `狀態：${entry.read_status}｜評分：${score}｜日期：${entry.read_at || '—'}`,
        `上鎖：${labelReadingLockMode(lockMode)}`,
        `標籤：${tags.length > 0 ? tags.map((tag) => normalizeTagInput(tag).label).join('、') : '—'}`,
      ].join('\n'),
      flags: 64,
      components: [
        {
          type: 1,
          components: [
            { type: 2, style: 1, label: '✏️ 編輯', custom_id: `reading_edit:${entry.slug}` },
            { type: 2, style: 2, label: '📝 心得', custom_id: `reading_review_open:${entry.slug}` },
            { type: 2, style: 4, label: '🗑️ 刪除', custom_id: `reading_delete_confirm:${entry.slug}` },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: `reading_lock_mode:${entry.slug}`,
              placeholder: `上鎖模式：${labelReadingLockMode(lockMode)}`,
              min_values: 1,
              max_values: 1,
              options: [
                { label: '不上鎖', value: 'none', default: lockMode === 'none' },
                { label: '18+', value: '18plus', default: lockMode === '18plus' },
                { label: '爭議題材', value: 'controversial', default: lockMode === 'controversial' },
              ],
            },
          ],
        },
      ],
    },
  };
}

function readingDeleteConfirmMessage(slug: string, title: string) {
  return {
    type: 7,
    data: {
      content: `⚠️ 確定要刪除閱讀記錄「**${title}**」嗎？這個操作無法復原。`,
      embeds: [],
      components: [
        {
          type: 1,
          components: [
            { type: 2, style: 4, label: '🗑️ 確定刪除', custom_id: `reading_do_delete:${slug}` },
            { type: 2, style: 2, label: '取消', custom_id: 'cancel' },
          ],
        },
      ],
    },
  };
}

function encodeManageFilters(filters: ManageFilters) {
  return `${filters.entryType ?? 'all'}:${filters.status ?? 'all'}`;
}

/** After user selects entries from the multi-select, show action buttons with IDs encoded */
function bulkActionButtons(selectedIds: string[], filters: ManageFilters = {}) {
  const encoded = selectedIds.join('|');
  const encodedFilters = encodeManageFilters(filters);
  return {
    type: 7, // UPDATE_MESSAGE
    data: {
      content: `已選擇 **${selectedIds.length}** 筆內容，要執行什麼操作？`,
      embeds: [],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1, // PRIMARY
              label: '✅ 發佈所選',
              custom_id: `bulk_pub:${encodedFilters}:${encoded}`,
            },
            {
              type: 2,
              style: 3, // SUCCESS
              label: '🗃️ 典藏所選',
              custom_id: `bulk_archive:${encodedFilters}:${encoded}`,
            },
            {
              type: 2,
              style: 4, // DANGER
              label: '🗑️ 刪除所選',
              custom_id: `bulk_del:${encodedFilters}:${encoded}`,
            },
            {
              type: 2,
              style: 2, // SECONDARY
              label: '❌ 取消',
              custom_id: 'cancel',
            },
          ],
        },
      ],
    },
  };
}

export async function handleComponent(db: any, customId: string, values?: string[]) {
  // Cancel — dismiss the current prompt
  if (customId === 'cancel') {
    return {
      type: 7, // UPDATE_MESSAGE
      data: { content: '已取消', embeds: [], components: [] },
    };
  }

  // Management filters — update the list in place
  if (customId.startsWith('manage_type:') || customId.startsWith('manage_status:')) {
    const colonIdx = customId.indexOf(':');
    const action = customId.slice(0, colonIdx);
    const currentFilters = parseManageFilterPayload(customId.slice(colonIdx + 1));
    const selectedValue = values?.[0];

    const nextFilters: ManageFilters =
      action === 'manage_type'
        ? {
            entryType: selectedValue === 'all' ? undefined : (selectedValue as ManageFilters['entryType']),
            status: currentFilters.status,
          }
        : {
            entryType: currentFilters.entryType,
            status: selectedValue === 'all' ? undefined : (selectedValue as ManageFilters['status']),
          };

    return {
      type: 7,
      data: await buildListPayload(db, nextFilters),
    };
  }

  // Bulk select menu — user picked entries from the multi-select
  if (customId === 'bulk_select' || customId.startsWith('bulk_select:')) {
    const selectedIds = (values || []).filter(Boolean);
    if (selectedIds.length === 0) {
      return { type: 4, data: { content: '❌ 未選擇任何內容', flags: 64 } };
    }
    const filters = customId === 'bulk_select' ? {} : parseManageFilterPayload(customId.slice('bulk_select:'.length));
    return bulkActionButtons(selectedIds, filters);
  }

  if (customId === 'reading_select') {
    const slug = values?.[0];
    if (!slug) {
      return { type: 4, data: { content: '❌ 請先選一筆閱讀記錄', flags: 64 } };
    }
    const entry = await getReadingEntryBySlug(db, slug);
    if (!entry) {
      return { type: 4, data: { content: '❌ 找不到這筆閱讀記錄', flags: 64 } };
    }
    return readingActionMessage(entry);
  }

  if (customId.startsWith('reading_lock_mode:')) {
    const slug = customId.slice('reading_lock_mode:'.length);
    const lockMode = values?.[0];
    if (!slug || !lockMode || !['none', '18plus', 'controversial'].includes(lockMode)) {
      return { type: 4, data: { content: '❌ 無效的上鎖模式', flags: 64 } };
    }

    const entry = await getReadingEntryBySlug(db, slug);
    if (!entry) {
      return { type: 4, data: { content: '❌ 找不到這筆閱讀記錄', flags: 64 } };
    }

    const currentTags = parseStoredReadingTags(entry.tags);
    const nextTags = replaceReadingLockTags(
      currentTags,
      lockMode as 'none' | '18plus' | 'controversial'
    );

    await db
      .prepare(
        `UPDATE reading_entries
         SET tags = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(JSON.stringify(nextTags), entry.id)
      .run();

    const refreshed = await getReadingEntryBySlug(db, slug);
    if (!refreshed) {
      return { type: 4, data: { content: '❌ 更新後找不到這筆閱讀記錄', flags: 64 } };
    }

    return readingActionMessage(refreshed);
  }

  const colonIdx = customId.indexOf(':');
  const action = colonIdx >= 0 ? customId.slice(0, colonIdx) : customId;
  const payload = colonIdx >= 0 ? customId.slice(colonIdx + 1) : '';

  // Bulk actions — IDs encoded in custom_id separated by '|'
  if (action === 'bulk_pub' || action === 'bulk_archive' || action === 'bulk_del') {
    const payloadParts = payload.split(':');
    const filters = payloadParts.length >= 3 ? parseManageFilterPayload(`${payloadParts[0]}:${payloadParts[1]}`) : {};
    const idsRaw = payloadParts.length >= 3 ? payloadParts.slice(2).join(':') : payload;
    const ids = idsRaw.split('|').filter(Boolean);
    if (ids.length === 0) {
      return { type: 4, data: { content: '❌ 無效的批次操作', flags: 64 } };
    }

    try {
      if (action === 'bulk_pub') {
        await Promise.all(ids.map((id) => updateEntry(db, id, { status: 'published', visibility: 'public' })));
        return {
          type: 7,
          data: {
            ...(await buildListPayload(db, filters)),
            content: `✅ 已發佈 ${ids.length} 筆內容，並設為公開。`,
          },
        };
      }

      if (action === 'bulk_archive') {
        await Promise.all(ids.map((id) => archiveEntry(db, id)));
        return {
          type: 7,
          data: {
            ...(await buildListPayload(db, filters)),
            content: `🗃️ 已典藏 ${ids.length} 筆內容，並從公開列表移除。`,
          },
        };
      }

      if (action === 'bulk_del') {
        await Promise.all(ids.map((id) => deleteEntry(db, id)));
        return {
          type: 7,
          data: {
            ...(await buildListPayload(db, filters)),
            content: `🗑️ 已永久刪除 ${ids.length} 筆內容。`,
          },
        };
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      return { type: 4, data: { content: '❌ 批次操作失敗，請稍後再試', flags: 64 } };
    }
  }

  if (action === 'reading_edit' || action === 'reading_review_open' || action === 'reading_delete_confirm' || action === 'reading_do_delete') {
    const slug = payload;
    if (!slug) {
      return { type: 4, data: { content: '❌ 無效的閱讀操作', flags: 64 } };
    }

    const entry = await getReadingEntryBySlug(db, slug);
    if (!entry) {
      return { type: 7, data: { content: '❌ 找不到此閱讀記錄（可能已被刪除）', embeds: [], components: [] } };
    }

    if (action === 'reading_edit') {
      return readingEditModal(slug, entry);
    }

    if (action === 'reading_review_open') {
      return {
        type: 9,
        data: {
          custom_id: `reading_review_modal:${slug}`,
          title: `補心得：${(entry.title || '未命名').slice(0, 40)}`,
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
                ...(entry.score != null ? { value: String(entry.score) } : {}),
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
                ...(entry.read_at ? { value: entry.read_at } : {}),
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
                ...(entry.short_review ? { value: entry.short_review } : {}),
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
                ...(entry.blurb ? { value: entry.blurb } : {}),
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
                ...(entry.detail_review ? { value: entry.detail_review } : {}),
              }],
            },
          ],
        },
      };
    }

    if (action === 'reading_delete_confirm') {
      return readingDeleteConfirmMessage(slug, entry.title || '（未命名）');
    }

    if (action === 'reading_do_delete') {
      await deleteReadingEntry(db, entry.id);
      return {
        type: 7,
        data: { content: `🗑️ 已刪除閱讀記錄「**${entry.title || '（未命名）'}**」`, embeds: [], components: [] },
      };
    }
  }

  // Single-entry actions
  const entryId = payload;
  if (!entryId) {
    return { type: 4, data: { content: '❌ 無效的操作', flags: 64 } };
  }

  const entry = await getEntryById(db, entryId);
  if (!entry) {
    return {
      type: 7,
      data: { content: '❌ 找不到此文章（可能已被刪除）', embeds: [], components: [] },
    };
  }

  const title = (entry as any).title || '（無標題）';

  switch (action) {
    case 'edit': {
      const currentTags = await getTagsByEntryId(db, entryId);
      return editModal(entryId, entry, currentTags);
    }

    case 'archive_confirm':
      return archiveConfirmMessage(entryId, title);

    case 'harddelete_confirm':
      return hardDeleteConfirmMessage(entryId, title);

    case 'do_archive':
      try {
        await archiveEntry(db, entryId);
        return {
          type: 7,
          data: { content: `🗃️ 已典藏「**${title}**」，網站上不再顯示。`, embeds: [], components: [] },
        };
      } catch (error) {
        console.error('Archive error:', error);
        return { type: 4, data: { content: '❌ 典藏失敗，請稍後再試', flags: 64 } };
      }

    case 'do_harddelete':
      try {
        await deleteEntry(db, entryId);
        return {
          type: 7,
          data: { content: `🗑️ 已永久刪除「**${title}**」。`, embeds: [], components: [] },
        };
      } catch (error) {
        console.error('Hard delete error:', error);
        return { type: 4, data: { content: '❌ 刪除失敗，請稍後再試', flags: 64 } };
      }

    default:
      return { type: 4, data: { content: `❌ 未知操作: ${action}`, flags: 64 } };
  }

  // TypeScript unreachable guard for bulk branches above
  return { type: 4, data: { content: '❌ 未知操作', flags: 64 } };
}
