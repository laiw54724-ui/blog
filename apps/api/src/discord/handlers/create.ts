/**
 * Handles create slash commands by opening a Discord Modal.
 * Replaces the old approach of putting content in command options,
 * which had issues with line breaks and poor UX.
 */

import type { CommandPreset } from '../presets';

/** Discord Modal response (type 9) */
export function openCreateModal(preset: CommandPreset, commandKey: string) {
  const titles: Record<string, string> = {
    post: '新增動態',
    article: '新增文章',
    travel: '新增旅記',
    reading: '新增書摘',
  };

  const placeholders: Record<string, string> = {
    post: '今天發生了什麼，隨手記下來…',
    article: '想整理成文的觀察、評論或深度筆記…',
    travel: '旅途中的見聞、感受、值得記住的片段…',
    reading: '書摘、心得、讓你印象最深的段落…',
  };

  return {
    type: 9, // MODAL
    data: {
      custom_id: `create:${commandKey}`,
      title: titles[commandKey] || '新增內容',
      components: [
        {
          type: 1, // ACTION_ROW
          components: [
            {
              type: 4, // TEXT_INPUT
              custom_id: 'title',
              label: '標題（選填）',
              style: 1, // SHORT
              required: false,
              max_length: 200,
              placeholder: '留空會自動從內容擷取',
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
              placeholder: placeholders[commandKey] || '寫點什麼吧…',
            },
          ],
        },
      ],
    },
  };
}
