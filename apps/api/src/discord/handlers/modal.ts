/**
 * Handles MODAL_SUBMIT interactions (type 5).
 * Called when user submits a create or edit modal.
 */

import { getCommandPreset } from '../presets';
import { createEntryFromCommand } from '../createEntry';
import { getEntryById, updateEntry } from '@personal-blog/shared/db';

interface ModalComponent {
  type: number;
  components?: Array<{ custom_id: string; value: string }>;
}

type EntryStatus = 'published' | 'draft' | 'private' | 'archived' | 'inbox';
type EntryVisibility = 'private' | 'unlisted' | 'public';

function extractModalValues(components: ModalComponent[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const row of components) {
    for (const input of row.components || []) {
      values[input.custom_id] = input.value || '';
    }
  }
  return values;
}

function resolvePublishMode(
  rawValue: string | undefined,
  fallbackStatus: EntryStatus,
  fallbackVisibility: EntryVisibility
): { status: EntryStatus; visibility: EntryVisibility } {
  const value = rawValue?.trim().toLowerCase();
  switch (value) {
    case 'draft':
      return { status: 'draft', visibility: 'private' };
    case 'public':
      return { status: 'published', visibility: 'public' };
    case 'unlisted':
      return { status: 'published', visibility: 'unlisted' };
    case 'private':
      return { status: 'private', visibility: 'private' };
    case 'inbox':
      return { status: 'inbox', visibility: 'private' };
    default:
      return { status: fallbackStatus, visibility: fallbackVisibility };
  }
}

/** Handle modal submit for entry creation */
export async function handleCreateModal(
  db: any,
  commandKey: string,
  components: ModalComponent[]
) {
  const preset = getCommandPreset(commandKey);
  if (!preset) {
    return { type: 4, data: { content: '❌ 未知的內容類型', flags: 64 } };
  }

  const values = extractModalValues(components);
  const content = values['content']?.trim();
  const title = values['title']?.trim() || undefined;
  const excerpt = values['excerpt']?.trim() || undefined;
  const tags = values['tags']?.trim() || undefined;

  if (!content) {
    return { type: 4, data: { content: '❌ 內容不能為空', flags: 64 } };
  }

  try {
    const publishMode = resolvePublishMode(values['publish_mode'], preset.status, preset.visibility);
    const result = await createEntryFromCommand(db, {
      preset,
      content,
      title,
      excerpt,
      extraTags: tags,
      status: publishMode.status,
      visibility: publishMode.visibility,
    });
    return {
      type: 4,
      data: {
        content: result.message,
        flags: 64, // ephemeral — only visible to the author
      },
    };
  } catch (error) {
    console.error('Modal create error:', error);
    return { type: 4, data: { content: '❌ 建立失敗，請稍後重試', flags: 64 } };
  }
}

const VALID_STATUSES = new Set(['published', 'draft', 'private', 'archived', 'inbox']);

/** Handle modal submit for entry edit */
export async function handleEditModal(
  db: any,
  entryId: string,
  components: ModalComponent[]
) {
  const values = extractModalValues(components);
  const title = values['title']?.trim() || undefined;
  const content = values['content']?.trim();
  const statusRaw = values['status']?.trim().toLowerCase();

  if (!content) {
    return { type: 4, data: { content: '❌ 內容不能為空', flags: 64 } };
  }

  const status = statusRaw && VALID_STATUSES.has(statusRaw) ? statusRaw : undefined;

  try {
    const entry = await getEntryById(db, entryId);
    if (!entry) {
      return { type: 4, data: { content: '❌ 找不到此文章', flags: 64 } };
    }

    const fields: Record<string, string> = { content_markdown: content };
    if (title) fields.title = title;
    if (status) {
      fields.status = status;
      // When publishing, also make it public
      if (status === 'published') fields.visibility = 'public';
    }

    await updateEntry(db, entryId, fields);

    const displayName = title || (entry as any).title || entryId;
    const statusNote = status ? ` 狀態：${status}` : '';
    return {
      type: 4,
      data: {
        content: `✅ 已更新「${displayName}」${statusNote}`,
        flags: 64,
      },
    };
  } catch (error) {
    console.error('Modal edit error:', error);
    return { type: 4, data: { content: '❌ 更新失敗，請稍後重試', flags: 64 } };
  }
}
