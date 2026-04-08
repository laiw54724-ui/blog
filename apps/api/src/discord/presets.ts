/**
 * Discord Command Presets
 * Defines configuration for each Discord command type
 * Makes it easy to add new commands without duplicating logic
 */

export interface CommandPreset {
  entry_type: 'post' | 'article'
  category: string
  status: 'published' | 'draft'
  visibility: 'private' | 'unlisted' | 'public'
  description: string
}

/**
 * Map Chinese command names to English keys
 * Discord slash commands are registered with Chinese names,
 * but internally we use English keys for consistency
 */
export const CHINESE_TO_ENGLISH_COMMAND_MAP: Record<string, string> = {
  貼文: 'post',
  文章: 'article',
  旅記: 'travel',
  書摘: 'reading',
  編輯: 'edit',
  刪除: 'delete',
}

export const COMMAND_PRESETS: Record<string, CommandPreset> = {
  post: {
    entry_type: 'post',
    category: 'journal',
    status: 'published',
    visibility: 'public',
    description: '貼文：快速分享想法或事件',
  },
  article: {
    entry_type: 'article',
    category: 'journal',
    status: 'published',
    visibility: 'public',
    description: '文章：深入的觀察或評論',
  },
  travel: {
    entry_type: 'post',
    category: 'travel',
    status: 'published',
    visibility: 'public',
    description: '旅記：旅行中的見聞',
  },
  reading: {
    entry_type: 'article',
    category: 'reading',
    status: 'published',
    visibility: 'public',
    description: '書摘：讀書心得和摘錄',
  },
  // Future presets ready to add:
  // coffee: { ... }
  // restaurant: { ... }
  // diary: { ... }
  // inbox: { ... }
}

/**
 * Get preset by command name
 */
export function getCommandPreset(commandName: string): CommandPreset | null {
  return COMMAND_PRESETS[commandName] || null
}

/**
 * List all available commands with descriptions
 */
export function listCommands(): Array<{ name: string; description: string }> {
  return Object.entries(COMMAND_PRESETS).map(([name, preset]) => ({
    name,
    description: preset.description,
  }))
}
