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

import { getEntryById, archiveEntry, deleteEntry, updateEntry } from '@personal-blog/shared/db';

/** Build the edit modal pre-filled with current content + status */
function editModal(entryId: string, entry: any) {
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
              custom_id: 'content',
              label: '內容',
              style: 2, // PARAGRAPH
              required: true,
              max_length: 4000,
              value: (entry.content_markdown || '').slice(0, 4000),
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
              style: 1, // SHORT
              required: false,
              max_length: 20,
              value: entry.status || 'draft',
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

/** After user selects entries from the multi-select, show action buttons with IDs encoded */
function bulkActionButtons(selectedIds: string[]) {
  const encoded = selectedIds.join('|');
  return {
    type: 7, // UPDATE_MESSAGE
    data: {
      content: `已選擇 **${selectedIds.length}** 篇文章，要執行什麼操作？`,
      embeds: [],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1, // PRIMARY
              label: '✅ 發佈所選',
              custom_id: `bulk_pub:${encoded}`,
            },
            {
              type: 2,
              style: 3, // SUCCESS
              label: '🗃️ 典藏所選',
              custom_id: `bulk_archive:${encoded}`,
            },
            {
              type: 2,
              style: 4, // DANGER
              label: '🗑️ 刪除所選',
              custom_id: `bulk_del:${encoded}`,
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

  // Bulk select menu — user picked entries from the multi-select
  if (customId === 'bulk_select') {
    const selectedIds = (values || []).filter(Boolean);
    if (selectedIds.length === 0) {
      return { type: 4, data: { content: '❌ 未選擇任何文章', flags: 64 } };
    }
    return bulkActionButtons(selectedIds);
  }

  const colonIdx = customId.indexOf(':');
  const action = colonIdx >= 0 ? customId.slice(0, colonIdx) : customId;
  const payload = colonIdx >= 0 ? customId.slice(colonIdx + 1) : '';

  // Bulk actions — IDs encoded in custom_id separated by '|'
  if (action === 'bulk_pub' || action === 'bulk_archive' || action === 'bulk_del') {
    const ids = payload.split('|').filter(Boolean);
    if (ids.length === 0) {
      return { type: 4, data: { content: '❌ 無效的批次操作', flags: 64 } };
    }

    try {
      if (action === 'bulk_pub') {
        await Promise.all(ids.map((id) => updateEntry(db, id, { status: 'published', visibility: 'public' })));
        return {
          type: 7,
          data: { content: `✅ 已發佈 ${ids.length} 篇文章。`, embeds: [], components: [] },
        };
      }

      if (action === 'bulk_archive') {
        await Promise.all(ids.map((id) => archiveEntry(db, id)));
        return {
          type: 7,
          data: { content: `🗃️ 已典藏 ${ids.length} 篇文章。`, embeds: [], components: [] },
        };
      }

      if (action === 'bulk_del') {
        await Promise.all(ids.map((id) => deleteEntry(db, id)));
        return {
          type: 7,
          data: { content: `🗑️ 已永久刪除 ${ids.length} 篇文章。`, embeds: [], components: [] },
        };
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      return { type: 4, data: { content: '❌ 批次操作失敗，請稍後再試', flags: 64 } };
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
    case 'edit':
      return editModal(entryId, entry);

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
