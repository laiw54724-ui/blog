import type { D1Database } from '@cloudflare/workers-types';
import type { TagSummary } from './types';

export interface DbContext {
  db: D1Database;
}

/**
 * Get all entries with optional filtering
 */
export async function getEntries(
  db: D1Database,
  options?: {
    entryType?: string;
    category?: string;
    status?: string;
    visibility?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = 'SELECT * FROM entries WHERE 1=1';
  const params: unknown[] = [];

  if (options?.entryType) {
    query += ' AND entry_type = ?';
    params.push(options.entryType);
  }
  if (options?.category) {
    query += ' AND category = ?';
    params.push(options.category);
  }
  if (options?.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }
  if (options?.visibility) {
    query += ' AND visibility = ?';
    params.push(options.visibility);
  }

  query += ' ORDER BY created_at DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const result = await db
    .prepare(query)
    .bind(...params)
    .all();
  return result.results || [];
}

/**
 * Get recent entries for management UI with optional filters.
 */
export async function getRecentEntries(
  db: D1Database,
  options?: {
    limit?: number;
    entryType?: string;
    status?: string;
  }
) {
  const params: unknown[] = [];
  let query = `SELECT id, slug, title, entry_type, category, status, visibility, created_at
       FROM entries
       WHERE 1 = 1`;

  if (options?.entryType) {
    query += ' AND entry_type = ?';
    params.push(options.entryType);
  }

  if (options?.status) {
    query += ' AND status = ?';
    params.push(options.status);
  } else {
    query += ` AND status != 'archived'`;
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(options?.limit ?? 5);

  const result = await db
    .prepare(query)
    .bind(...params)
    .all();
  return result.results || [];
}

/**
 * Get entry by ID
 */
export async function getEntryById(db: D1Database, id: string) {
  return await db.prepare('SELECT * FROM entries WHERE id = ?').bind(id).first();
}

export async function getEntryBySlug(db: D1Database, slug: string, visibility?: string) {
  if (visibility) {
    return await db
      .prepare('SELECT * FROM entries WHERE slug = ? AND visibility = ? LIMIT 1')
      .bind(slug, visibility)
      .first();
  }
  return await db.prepare('SELECT * FROM entries WHERE slug = ? LIMIT 1').bind(slug).first();
}

export async function getPublicEntryById(db: D1Database, id: string) {
  return await db
    .prepare(
      `SELECT * FROM entries
       WHERE id = ?
         AND status = 'published'
         AND visibility = 'public'
       LIMIT 1`
    )
    .bind(id)
    .first();
}

export async function getPublicEntryBySlug(db: D1Database, slug: string) {
  return await db
    .prepare(
      `SELECT * FROM entries
       WHERE slug = ?
         AND status = 'published'
         AND visibility = 'public'
       LIMIT 1`
    )
    .bind(slug)
    .first();
}

/**
 * Create new entry with validation
 */
export async function createEntry(
  db: D1Database,
  entry: {
    id: string;
    slug: string;
    entry_type: string;
    category: string;
    title: string;
    content_markdown: string;
    excerpt?: string;
    status: string;
    visibility: string;
    source?: string;
    source_message_id?: string;
    source_channel_id?: string;
    source_guild_id?: string;
  }
) {
  // Validate entry_type, category, status, visibility
  const validEntryTypes = ['post', 'article'];
  const validCategories = ['journal', 'reading', 'travel', 'place'];
  const validStatuses = ['inbox', 'draft', 'published', 'private', 'archived'];
  const validVisibilities = ['private', 'unlisted', 'public'];

  if (!validEntryTypes.includes(entry.entry_type)) {
    throw new Error(`Invalid entry_type: ${entry.entry_type}`);
  }
  if (!validCategories.includes(entry.category)) {
    throw new Error(`Invalid category: ${entry.category}`);
  }
  if (!validStatuses.includes(entry.status)) {
    throw new Error(`Invalid status: ${entry.status}`);
  }
  if (!validVisibilities.includes(entry.visibility)) {
    throw new Error(`Invalid visibility: ${entry.visibility}`);
  }

  const now = new Date().toISOString();
  const publishedAt = entry.status === 'published' ? now : null;

  return await db
    .prepare(
      `INSERT INTO entries (
        id, slug, entry_type, category, title, content_markdown, excerpt,
        status, visibility, source, source_message_id, source_channel_id, source_guild_id,
        created_at, updated_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      entry.id,
      entry.slug,
      entry.entry_type,
      entry.category,
      entry.title,
      entry.content_markdown,
      entry.excerpt || '',
      entry.status,
      entry.visibility,
      entry.source || 'discord',
      entry.source_message_id || null,
      entry.source_channel_id || null,
      entry.source_guild_id || null,
      now,
      now,
      publishedAt
    )
    .run();
}

/**
 * Update an existing entry
 */
const UPDATABLE_COLUMNS = new Set([
  'title',
  'content_markdown',
  'excerpt',
  'category',
  'status',
  'visibility',
]);

export async function updateEntry(
  db: D1Database,
  id: string,
  fields: {
    title?: string;
    content_markdown?: string;
    excerpt?: string;
    category?: string;
    status?: string;
    visibility?: string;
  }
) {
  const setClauses: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && UPDATABLE_COLUMNS.has(key)) {
      setClauses.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (setClauses.length === 0) {
    throw new Error('No fields to update');
  }

  // Always update updated_at
  setClauses.push('updated_at = ?');
  params.push(new Date().toISOString());

  // If publishing, set published_at if not already set
  if (fields.status === 'published') {
    setClauses.push('published_at = COALESCE(published_at, ?)');
    params.push(new Date().toISOString());
  }

  params.push(id);

  const query = `UPDATE entries SET ${setClauses.join(', ')} WHERE id = ?`;
  return await db
    .prepare(query)
    .bind(...params)
    .run();
}

/**
 * Soft-delete (archive) an entry
 */
export async function archiveEntry(db: D1Database, id: string) {
  return await updateEntry(db, id, { status: 'archived', visibility: 'private' });
}

/**
 * Hard delete entry and related data
 */
export async function deleteEntry(db: D1Database, id: string) {
  await db.prepare('DELETE FROM entry_tags WHERE entry_id = ?').bind(id).run();
  await db.prepare('DELETE FROM assets WHERE entry_id = ?').bind(id).run();
  return await db.prepare('DELETE FROM entries WHERE id = ?').bind(id).run();
}

/**
 * Add tags to entry
 */
export async function addTagsToEntry(db: D1Database, entryId: string, tagIds: string[]) {
  for (const tagId of tagIds) {
    await db
      .prepare('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)')
      .bind(entryId, tagId)
      .run();
  }
}

/**
 * Get public tags with entry counts.
 */
export async function getPublicTags(
  db: D1Database,
  options?: {
    entryType?: string;
    category?: string;
    limit?: number;
  }
) {
  const params: unknown[] = ['published', 'public'];
  let query = `
    SELECT
      tags.id,
      tags.name,
      tags.slug,
      tags.created_at,
      COUNT(DISTINCT entries.id) AS entry_count
    FROM tags
    INNER JOIN entry_tags ON entry_tags.tag_id = tags.id
    INNER JOIN entries ON entries.id = entry_tags.entry_id
    WHERE entries.status = ?
      AND entries.visibility = ?
  `;

  if (options?.entryType) {
    query += ' AND entries.entry_type = ?';
    params.push(options.entryType);
  }

  if (options?.category) {
    query += ' AND entries.category = ?';
    params.push(options.category);
  }

  query += `
    GROUP BY tags.id, tags.name, tags.slug, tags.created_at
    ORDER BY entry_count DESC, tags.name ASC
  `;

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const result = await db.prepare(query).bind(...params).all();
  return (result.results || []) as unknown as TagSummary[];
}

/**
 * Get public entries by tag slug with newest-first ordering.
 */
export async function getPublicEntriesByTagSlug(
  db: D1Database,
  slug: string,
  options?: {
    entryType?: string;
    category?: string;
    limit?: number;
  }
) {
  const params: unknown[] = [slug, 'published', 'public'];
  let query = `
    SELECT entries.*
    FROM entries
    INNER JOIN entry_tags ON entry_tags.entry_id = entries.id
    INNER JOIN tags ON tags.id = entry_tags.tag_id
    WHERE tags.slug = ?
      AND entries.status = ?
      AND entries.visibility = ?
  `;

  if (options?.entryType) {
    query += ' AND entries.entry_type = ?';
    params.push(options.entryType);
  }

  if (options?.category) {
    query += ' AND entries.category = ?';
    params.push(options.category);
  }

  query += ' ORDER BY COALESCE(entries.published_at, entries.created_at) DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const result = await db.prepare(query).bind(...params).all();
  return result.results || [];
}

/**
 * Create an asset record linked to an entry
 */
export async function createAsset(
  db: D1Database,
  asset: {
    id: string;
    entry_id: string;
    kind: 'image' | 'cover' | 'attachment';
    storage_key: string;
    mime_type: string;
    width?: number;
    height?: number;
    alt_text?: string;
    sort_order?: number;
  }
) {
  return await db
    .prepare(
      `INSERT INTO assets (id, entry_id, kind, storage_key, mime_type, width, height, alt_text, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      asset.id,
      asset.entry_id,
      asset.kind,
      asset.storage_key,
      asset.mime_type,
      asset.width || null,
      asset.height || null,
      asset.alt_text || null,
      asset.sort_order || 0
    )
    .run();
}

/**
 * Get assets for an entry
 */
export async function getAssetsByEntryId(db: D1Database, entryId: string) {
  const result = await db
    .prepare('SELECT * FROM assets WHERE entry_id = ? ORDER BY sort_order ASC')
    .bind(entryId)
    .all();
  return result.results || [];
}

/**
 * Get visible comments for an entry
 */
export async function getCommentsByEntryId(db: D1Database, entryId: string) {
  const result = await db
    .prepare(
      "SELECT * FROM comments WHERE entry_id = ? AND status = 'visible' ORDER BY created_at ASC"
    )
    .bind(entryId)
    .all();
  return result.results || [];
}

/**
 * Create a comment
 */
export async function createComment(
  db: D1Database,
  comment: {
    id: string;
    entry_id: string;
    author_name: string;
    body_markdown: string;
    parent_id?: string | null;
  }
) {
  const now = new Date().toISOString();
  return await db
    .prepare(
      `INSERT INTO comments (id, entry_id, parent_id, author_name, body_markdown, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'visible', ?, ?)`
    )
    .bind(
      comment.id,
      comment.entry_id,
      comment.parent_id || null,
      comment.author_name,
      comment.body_markdown,
      now,
      now
    )
    .run();
}

/**
 * Check rate limit: returns true if allowed, false if throttled.
 * Updates the timestamp when allowed.
 * cooldownSeconds: minimum seconds between comments per identifier.
 */
export async function checkAndUpdateRateLimit(
  db: D1Database,
  identifier: string,
  cooldownSeconds = 60
): Promise<boolean> {
  const row = await db
    .prepare('SELECT last_comment_at FROM comment_rate_limits WHERE identifier = ?')
    .bind(identifier)
    .first<{ last_comment_at: string }>();

  const now = new Date();

  if (row) {
    const last = new Date(row.last_comment_at);
    const elapsed = (now.getTime() - last.getTime()) / 1000;
    if (elapsed < cooldownSeconds) {
      return false;
    }
    await db
      .prepare('UPDATE comment_rate_limits SET last_comment_at = ? WHERE identifier = ?')
      .bind(now.toISOString(), identifier)
      .run();
  } else {
    await db
      .prepare('INSERT INTO comment_rate_limits (identifier, last_comment_at) VALUES (?, ?)')
      .bind(identifier, now.toISOString())
      .run();
  }

  return true;
}
