/**
 * DB helpers for reading_entries table
 */

import type { D1Database } from '@cloudflare/workers-types';
import { generateId, slugify } from './utils';

export type ReadingGenre = 'bl' | 'bg' | 'gl' | 'gen';
export type ReadingMedium = 'novel' | 'comic' | 'manhwa' | 'manga' | 'webtoon' | 'drama';
export type ReadStatus = 'completed' | 'ongoing' | 'dropped';
export type WorkStatus = 'finished' | 'serializing' | 'unknown';

export interface ReadingEntry {
  id: string;
  slug: string;
  title: string;
  author?: string | null;
  alt_title?: string | null;
  genre: ReadingGenre;
  medium: ReadingMedium;
  read_status: ReadStatus;
  work_status: WorkStatus;
  score?: number | null;
  read_at?: string | null;
  short_review?: string | null;
  detail_review?: string | null;
  blurb?: string | null;
  tags: string;       // JSON string[]
  links: string;      // JSON {label,url}[]
  has_detail: number; // 0 | 1
  source: string;
  created_at: string;
  updated_at: string;
}

export interface ReadingEntryInput {
  title: string;
  author?: string;
  alt_title?: string;
  genre: ReadingGenre;
  medium?: ReadingMedium;
  read_status: ReadStatus;
  work_status?: WorkStatus;
  score?: number;
  read_at?: string;
  short_review?: string;
  detail_review?: string;
  blurb?: string;
  tags?: string[];
  links?: Array<{ label: string; url: string }>;
  source?: string;
}

export interface ReadingEntryStats {
  total: number;
  completed: number;
  ongoing: number;
}

/** Generate a unique slug for a reading entry */
async function ensureUniqueReadingSlug(db: D1Database, baseSlug: string): Promise<string> {
  let slug = baseSlug || 'entry';
  let i = 2;
  while (true) {
    const existing = await db
      .prepare('SELECT id FROM reading_entries WHERE slug = ? LIMIT 1')
      .bind(slug)
      .first();
    if (!existing) return slug;
    slug = `${baseSlug}-${i}`;
    i++;
  }
}

/** Create a new reading entry */
export async function createReadingEntry(db: D1Database, input: ReadingEntryInput) {
  const id = generateId('rdg');
  const baseSlug = slugify(input.title) || id;
  const slug = await ensureUniqueReadingSlug(db, baseSlug);
  const now = new Date().toISOString();
  const hasDetail = input.detail_review ? 1 : 0;

  await db
    .prepare(
      `INSERT INTO reading_entries
        (id, slug, title, author, alt_title, genre, medium,
         read_status, work_status, score, read_at,
         short_review, detail_review, blurb,
         tags, links, has_detail, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      slug,
      input.title,
      input.author ?? null,
      input.alt_title ?? null,
      input.genre,
      input.medium ?? 'novel',
      input.read_status,
      input.work_status ?? 'unknown',
      input.score ?? null,
      input.read_at ?? null,
      input.short_review ?? null,
      input.detail_review ?? null,
      input.blurb ?? null,
      JSON.stringify(input.tags ?? []),
      JSON.stringify(input.links ?? []),
      hasDetail,
      input.source ?? 'manual',
      now,
      now
    )
    .run();

  return { id, slug };
}

/** Update a reading entry (partial) */
export async function updateReadingEntry(
  db: D1Database,
  id: string,
  fields: Partial<{
    title: string;
    author: string | null;
    genre: ReadingGenre;
    medium: ReadingMedium;
    read_status: ReadStatus;
    work_status: WorkStatus;
    score: number | null;
    read_at: string | null;
    short_review: string | null;
    detail_review: string | null;
    blurb: string | null;
    tags: string[];
    links: Array<{ label: string; url: string }>;
  }>
) {
  const ALLOWED = new Set([
    'title', 'author', 'genre', 'medium',
    'read_status', 'work_status', 'score', 'read_at',
    'short_review', 'detail_review', 'blurb',
  ]);

  const setClauses: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (key === 'tags') {
      setClauses.push('tags = ?');
      params.push(JSON.stringify(value as string[]));
    } else if (key === 'links') {
      setClauses.push('links = ?');
      params.push(JSON.stringify(value));
    } else if (ALLOWED.has(key)) {
      setClauses.push(`${key} = ?`);
      params.push(value ?? null);
    }
  }

  // Auto-update has_detail if detail_review changes
  if ('detail_review' in fields) {
    setClauses.push('has_detail = ?');
    params.push(fields.detail_review ? 1 : 0);
  }

  if (setClauses.length === 0) return;

  setClauses.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await db
    .prepare(`UPDATE reading_entries SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run();
}

/** Delete a reading entry */
export async function deleteReadingEntry(db: D1Database, id: string) {
  await db.prepare('DELETE FROM reading_entries WHERE id = ?').bind(id).run();
}

/** Get a single reading entry by slug */
export async function getReadingEntryBySlug(db: D1Database, slug: string) {
  return db.prepare('SELECT * FROM reading_entries WHERE slug = ? LIMIT 1').bind(slug).first<ReadingEntry>();
}

/** Get a single reading entry by ID */
export async function getReadingEntryById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM reading_entries WHERE id = ? LIMIT 1').bind(id).first<ReadingEntry>();
}

/** Find reading entries by partial title match */
export async function findReadingEntriesByTitle(
  db: D1Database,
  query: string,
  limit = 5
): Promise<ReadingEntry[]> {
  const result = await db
    .prepare("SELECT * FROM reading_entries WHERE title LIKE ? ORDER BY created_at DESC LIMIT ?")
    .bind(`%${query}%`, limit)
    .all<ReadingEntry>();
  return result.results ?? [];
}

/** List reading entries with optional filters */
export async function listReadingEntries(
  db: D1Database,
  options?: {
    q?: string;
    genre?: ReadingGenre;
    medium?: ReadingMedium;
    read_status?: ReadStatus;
    sort?: 'read_at' | 'score' | 'created_at' | 'title';
    limit?: number;
    offset?: number;
  }
): Promise<ReadingEntry[]> {
  const params: unknown[] = [];
  let query = 'SELECT * FROM reading_entries WHERE 1=1';

  if (options?.q) {
    query += ' AND (title LIKE ? OR author LIKE ? OR short_review LIKE ? OR detail_review LIKE ?)';
    const like = `%${options.q}%`;
    params.push(like, like, like, like);
  }
  if (options?.genre) {
    query += ' AND genre = ?';
    params.push(options.genre);
  }
  if (options?.medium) {
    query += ' AND medium = ?';
    params.push(options.medium);
  }
  if (options?.read_status) {
    query += ' AND read_status = ?';
    params.push(options.read_status);
  }

  const sort = options?.sort ?? 'read_at';
  if (sort === 'title') {
    query += ' ORDER BY title ASC';
  } else if (sort === 'score') {
    query += ' ORDER BY CASE WHEN score IS NULL THEN 1 ELSE 0 END, score DESC, created_at DESC';
  } else if (sort === 'created_at') {
    query += ' ORDER BY created_at DESC';
  } else {
    // read_at: null goes to bottom
    query += ' ORDER BY CASE WHEN read_at IS NULL THEN 1 ELSE 0 END, read_at DESC, created_at DESC';
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(options?.limit ?? 200, options?.offset ?? 0);

  const result = await db.prepare(query).bind(...params).all<ReadingEntry>();
  return result.results ?? [];
}

export async function countReadingEntries(
  db: D1Database,
  options?: {
    q?: string;
    genre?: ReadingGenre;
    medium?: ReadingMedium;
    read_status?: ReadStatus;
  }
): Promise<number> {
  const params: unknown[] = [];
  let query = 'SELECT COUNT(*) as count FROM reading_entries WHERE 1=1';

  if (options?.q) {
    query += ' AND (title LIKE ? OR author LIKE ? OR short_review LIKE ? OR detail_review LIKE ?)';
    const like = `%${options.q}%`;
    params.push(like, like, like, like);
  }
  if (options?.genre) {
    query += ' AND genre = ?';
    params.push(options.genre);
  }
  if (options?.medium) {
    query += ' AND medium = ?';
    params.push(options.medium);
  }
  if (options?.read_status) {
    query += ' AND read_status = ?';
    params.push(options.read_status);
  }

  const row = await db.prepare(query).bind(...params).first<{ count: number | string }>();
  return Number(row?.count ?? 0);
}

export async function getReadingEntryStats(db: D1Database): Promise<ReadingEntryStats> {
  const row = await db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN read_status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN read_status = 'ongoing' THEN 1 ELSE 0 END) as ongoing
      FROM reading_entries`
    )
    .first<{
      total: number | string | null;
      completed: number | string | null;
      ongoing: number | string | null;
    }>();

  return {
    total: Number(row?.total ?? 0),
    completed: Number(row?.completed ?? 0),
    ongoing: Number(row?.ongoing ?? 0),
  };
}
