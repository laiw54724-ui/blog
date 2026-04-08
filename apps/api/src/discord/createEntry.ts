/**
 * Unified entry creation from Discord command
 * Handles the common logic for all command types
 */

import type { CommandPreset } from './presets'
import {
  generateId,
  slugify,
  extractHashtags,
  generateExcerpt,
  createEntry,
  addTagsToEntry,
} from '@personal-blog/shared'

export interface CreateEntryInput {
  preset: CommandPreset
  content: string
  title?: string
  selectedCategory?: string // User-selected category from Discord command option
}

export interface CreateEntryOutput {
  success: boolean
  entry_id?: string
  error?: string
  message: string
}

/**
 * Extract title from content (first line or auto-generate)
 */
function extractTitle(content: string, fallback: string = 'Untitled'): string {
  const lines = content.split('\n').filter((l) => l.trim())
  const firstLine = lines[0]?.trim()
  return firstLine && firstLine.length > 3 ? firstLine : fallback
}

/**
 * Find or create a tag by name, return its ID
 */
async function findOrCreateTag(db: any, tagName: string): Promise<string> {
  const tagSlug = slugify(tagName)
  const existing = await db
    .prepare('SELECT id FROM tags WHERE slug = ?')
    .bind(tagSlug)
    .first()

  if (existing) {
    return existing.id
  }

  const tagId = generateId('tag')
  await db
    .prepare('INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)')
    .bind(tagId, tagName, tagSlug)
    .run()

  return tagId
}

/**
 * Create entry from Discord command
 * Unified logic for all command types
 */
export async function createEntryFromCommand(
  db: any, // D1 Database binding
  input: CreateEntryInput
): Promise<CreateEntryOutput> {
  try {
    const { preset, content, title: customTitle, selectedCategory } = input

    const title = customTitle || extractTitle(content)
    const entryId = generateId('entry')
    const slug = slugify(title)
    const tags = extractHashtags(content)
    const excerpt = generateExcerpt(content)

    // Use selectedCategory if provided, otherwise use preset category
    const finalCategory = selectedCategory || preset.category

    // Use shared createEntry (validates fields + sets published_at)
    await createEntry(db, {
      id: entryId,
      slug,
      entry_type: preset.entry_type,
      category: finalCategory,
      title,
      content_markdown: content,
      excerpt,
      status: preset.status,
      visibility: preset.visibility,
      source: 'discord',
    })

    // Create tags and link to entry
    if (tags.length > 0) {
      const tagIds: string[] = []
      for (const tagName of tags) {
        const tagId = await findOrCreateTag(db, tagName)
        tagIds.push(tagId)
      }
      await addTagsToEntry(db, entryId, tagIds)
    }

    return {
      success: true,
      entry_id: entryId,
      message: `✅ 已建立 ${preset.description}\n\n${title}`,
    }
  } catch (error) {
    console.error('Error creating entry:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: '❌ 建立失敗，請稍後重試',
    }
  }
}
