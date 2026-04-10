/**
 * Unified entry creation from Discord command
 * Handles the common logic for all command types
 */

import type { CommandPreset } from './presets';
import type { D1Database } from '@cloudflare/workers-types';
import {
  generateId,
  slugify,
  extractHashtags,
  generateExcerpt,
} from '@personal-blog/shared/utils';
import { normalizeTagInput } from '@personal-blog/shared';
import { createEntry, addTagsToEntry } from '@personal-blog/shared/db';

export interface CreateEntryInput {
  preset: CommandPreset;
  content: string;
  title?: string;
  excerpt?: string;
  extraTags?: string;
  status?: 'published' | 'draft' | 'private' | 'archived' | 'inbox';
  visibility?: 'private' | 'unlisted' | 'public';
  selectedCategory?: string;
  entryId?: string;
}

export interface CreateEntryOutput {
  success: boolean;
  entry_id?: string;
  error?: string;
  message: string;
}

interface PreparedStatementLike {
  bind(...args: unknown[]): PreparedStatementLike;
  first(): Promise<{ id?: string } | null>;
  run(): Promise<unknown>;
}

interface DbLike {
  prepare(sql: string): PreparedStatementLike;
}

type DatabaseLike = D1Database | DbLike;

function parseManualTags(input?: string): string[] {
  if (!input) return [];
  return input
    .split(/[,\n]+|\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Extract title from content (first line or auto-generate)
 */
function extractTitle(content: string, fallback?: string): string {
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^#{1,6}\s+/, ''));

  const candidate =
    lines.find((line) => line.replace(/[^\p{L}\p{N}\u4e00-\u9fff]/gu, '').length >= 4) || lines[0];

  if (candidate) return candidate;
  if (fallback) return fallback;

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

async function ensureUniqueSlug(db: DatabaseLike, baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let i = 2;
  while (true) {
    const existing = await db
      .prepare('SELECT id FROM entries WHERE slug = ? LIMIT 1')
      .bind(slug)
      .first();
    if (!existing) return slug;
    slug = `${baseSlug}-${i}`;
    i++;
  }
}

/**
 * Find or create a tag by name, return its ID
 */
async function findOrCreateTag(db: DatabaseLike, tagName: string): Promise<string> {
  const normalized = normalizeTagInput(tagName);
  const tagSlug = normalized.slug;
  const existing = await db.prepare('SELECT id FROM tags WHERE slug = ?').bind(tagSlug).first();

  if (existing && typeof existing.id === 'string') {
    return existing.id;
  }

  const tagId = generateId('tag');
  await db
    .prepare('INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)')
    .bind(tagId, normalized.label, tagSlug)
    .run();

  return tagId;
}

/**
 * Create entry from Discord command
 * Unified logic for all command types
 */
export async function createEntryFromCommand(
  db: DatabaseLike,
  input: CreateEntryInput
): Promise<CreateEntryOutput> {
  try {
    const { preset, content, title: customTitle, selectedCategory } = input;

    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    const fallbackTitle = new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());

    const title = customTitle?.trim() || extractTitle(normalizedContent, fallbackTitle);
    const entryId = input.entryId || generateId('entry');
    const baseSlug = slugify(title);
    const slug = await ensureUniqueSlug(db, baseSlug);
    const manualTags = parseManualTags(input.extraTags);
    const tags = Array.from(
      new Set([...(preset.default_tags || []), ...manualTags, ...extractHashtags(normalizedContent)])
    );
    const excerpt = input.excerpt?.trim() || generateExcerpt(normalizedContent);

    const finalCategory = selectedCategory || preset.category;
    const status = input.status || preset.status;
    const visibility = input.visibility || preset.visibility;

    await createEntry(db as D1Database, {
      id: entryId,
      slug,
      entry_type: preset.entry_type,
      category: finalCategory,
      title,
      content_markdown: normalizedContent,
      excerpt,
      status,
      visibility,
      source: 'discord',
    });

    if (tags.length > 0) {
      const tagIds: string[] = [];
      for (const tagName of tags) {
        const tagId = await findOrCreateTag(db, tagName);
        if (!tagIds.includes(tagId)) {
          tagIds.push(tagId);
        }
      }
      await addTagsToEntry(db as D1Database, entryId, tagIds);
    }

    return {
      success: true,
      entry_id: entryId,
      message: `✅ 已建立 ${preset.description}\n狀態：${status}｜可見性：${visibility}\n\n${title}`,
    };
  } catch (error) {
    console.error('Error creating entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: '❌ 建立失敗，請稍後重試',
    };
  }
}
