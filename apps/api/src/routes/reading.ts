/**
 * Reading entries API routes
 * GET  /api/reading            — list (public)
 * GET  /api/reading/:slug      — detail (public)
 * POST /api/reading            — create (API_SECRET required)
 * PATCH /api/reading/:slug     — update (API_SECRET required)
 * DELETE /api/reading/:slug    — delete (API_SECRET required)
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import {
  listReadingEntries,
  countReadingEntries,
  getReadingEntryBySlug,
  createReadingEntry,
  updateReadingEntry,
  deleteReadingEntry,
  findReadingEntriesByTitle,
} from '@personal-blog/shared/reading-db';
import type {
  ReadingEntryInput,
  ReadingGenre,
  ReadingMedium,
  ReadStatus,
  WorkStatus,
} from '@personal-blog/shared/reading-db';

interface Env {
  DB: D1Database;
  API_SECRET?: string;
}

const router = new Hono<{ Bindings: Env }>();

const VALID_GENRES = new Set<ReadingGenre>(['bl', 'bg', 'gl', 'gen']);
const VALID_MEDIA = new Set<ReadingMedium>(['novel', 'comic', 'manhwa', 'manga', 'webtoon', 'drama']);
const VALID_READ_STATUSES = new Set<ReadStatus>(['completed', 'ongoing', 'dropped']);
const VALID_WORK_STATUSES = new Set<WorkStatus>(['finished', 'serializing', 'unknown']);
const VALID_SORTS = new Set(['read_at', 'score', 'created_at', 'title']);

router.use('*', async (c, next) => {
  if (!c.env?.DB) return c.json({ error: 'Database not configured' }, 500);
  await next();
});

function requireSecret(c: Context<{ Bindings: Env }>) {
  const secret = c.req.header('x-api-secret');
  if (!c.env.API_SECRET || secret !== c.env.API_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return null;
}

function normalizeCreateBody(body: Record<string, unknown>): ReadingEntryInput | null {
  if (typeof body.title !== 'string' || !body.title.trim()) return null;
  if (typeof body.genre !== 'string' || !VALID_GENRES.has(body.genre as ReadingGenre)) return null;
  if (
    typeof body.read_status !== 'string' ||
    !VALID_READ_STATUSES.has(body.read_status as ReadStatus)
  ) {
    return null;
  }

  const medium =
    typeof body.medium === 'string' && VALID_MEDIA.has(body.medium as ReadingMedium)
      ? (body.medium as ReadingMedium)
      : 'novel';
  const workStatus =
    typeof body.work_status === 'string' && VALID_WORK_STATUSES.has(body.work_status as WorkStatus)
      ? (body.work_status as WorkStatus)
      : 'unknown';
  const score =
    typeof body.score === 'number' && Number.isFinite(body.score) ? body.score : undefined;
  const tags = Array.isArray(body.tags) ? body.tags.filter((value): value is string => typeof value === 'string') : undefined;
  const links = Array.isArray(body.links)
    ? body.links.filter(
        (value): value is { label: string; url: string } =>
          typeof value === 'object' &&
          value !== null &&
          typeof (value as { label?: unknown }).label === 'string' &&
          typeof (value as { url?: unknown }).url === 'string'
      )
    : undefined;

  return {
    title: body.title.trim(),
    author: typeof body.author === 'string' ? body.author.trim() || undefined : undefined,
    alt_title: typeof body.alt_title === 'string' ? body.alt_title.trim() || undefined : undefined,
    genre: body.genre as ReadingGenre,
    medium,
    read_status: body.read_status as ReadStatus,
    work_status: workStatus,
    score,
    read_at: typeof body.read_at === 'string' ? body.read_at.trim() || undefined : undefined,
    short_review:
      typeof body.short_review === 'string' ? body.short_review.trim() || undefined : undefined,
    detail_review:
      typeof body.detail_review === 'string' ? body.detail_review.trim() || undefined : undefined,
    blurb: typeof body.blurb === 'string' ? body.blurb.trim() || undefined : undefined,
    tags,
    links,
    source: typeof body.source === 'string' ? body.source : undefined,
  };
}

function normalizeUpdateBody(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string') patch.title = body.title.trim() || null;
  if (typeof body.author === 'string') patch.author = body.author.trim() || null;
  if (typeof body.genre === 'string' && VALID_GENRES.has(body.genre as ReadingGenre)) patch.genre = body.genre;
  if (typeof body.medium === 'string' && VALID_MEDIA.has(body.medium as ReadingMedium)) patch.medium = body.medium;
  if (typeof body.read_status === 'string' && VALID_READ_STATUSES.has(body.read_status as ReadStatus)) patch.read_status = body.read_status;
  if (typeof body.work_status === 'string' && VALID_WORK_STATUSES.has(body.work_status as WorkStatus)) patch.work_status = body.work_status;
  if (typeof body.score === 'number' && Number.isFinite(body.score)) patch.score = body.score;
  if (body.score === null) patch.score = null;
  if (typeof body.read_at === 'string') patch.read_at = body.read_at.trim() || null;
  if (typeof body.short_review === 'string') patch.short_review = body.short_review.trim() || null;
  if (typeof body.detail_review === 'string') patch.detail_review = body.detail_review.trim() || null;
  if (typeof body.blurb === 'string') patch.blurb = body.blurb.trim() || null;
  if (Array.isArray(body.tags)) patch.tags = body.tags.filter((value): value is string => typeof value === 'string');
  if (Array.isArray(body.links)) {
    patch.links = body.links.filter(
      (value): value is { label: string; url: string } =>
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { label?: unknown }).label === 'string' &&
        typeof (value as { url?: unknown }).url === 'string'
    );
  }
  return patch;
}

// ── GET /api/reading ─────────────────────────────────────────────────────────
router.get('/', async (c) => {
  const q = c.req.query('q')?.trim() || undefined;
  const genre = c.req.query('genre') as ReadingGenre | undefined;
  const medium = c.req.query('medium') as ReadingMedium | undefined;
  const read_status = c.req.query('read_status') as ReadStatus | undefined;
  const sortRaw = c.req.query('sort');
  const sort =
    sortRaw && VALID_SORTS.has(sortRaw) ? (sortRaw as 'read_at' | 'score' | 'created_at' | 'title') : 'read_at';
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = Math.max(parseInt(c.req.query('offset') || '0'), 0);

  const [entries, total] = await Promise.all([
    listReadingEntries(c.env.DB, {
      q, genre, medium, read_status, sort, limit, offset,
    }),
    countReadingEntries(c.env.DB, {
      q, genre, medium, read_status,
    }),
  ]);

  return c.json({ data: entries, count: entries.length, total, limit, offset });
});

// ── GET /api/reading/search?q=... ─────────────────────────────────────────────
router.get('/search', async (c) => {
  const q = c.req.query('q')?.trim();
  if (!q) return c.json({ data: [], count: 0 });
  const entries = await findReadingEntriesByTitle(c.env.DB, q, 10);
  return c.json({ data: entries, count: entries.length });
});

// ── GET /api/reading/:slug ────────────────────────────────────────────────────
router.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const entry = await getReadingEntryBySlug(c.env.DB, slug);
  if (!entry) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: entry });
});

// ── POST /api/reading ─────────────────────────────────────────────────────────
router.post('/', async (c) => {
  const authError = requireSecret(c);
  if (authError) return authError;

  const body = (await c.req.json()) as Record<string, unknown>;
  const normalized = normalizeCreateBody(body);
  if (!normalized) {
    return c.json({ error: 'title, genre, read_status are required' }, 400);
  }

  try {
    const result = await createReadingEntry(c.env.DB, normalized);
    return c.json({ data: result }, 201);
  } catch (err) {
    console.error('Create reading entry error:', err);
    return c.json({ error: 'Failed to create entry' }, 500);
  }
});

// ── PATCH /api/reading/:slug ──────────────────────────────────────────────────
router.patch('/:slug', async (c) => {
  const authError = requireSecret(c);
  if (authError) return authError;

  const slug = c.req.param('slug');
  const entry = await getReadingEntryBySlug(c.env.DB, slug);
  if (!entry) return c.json({ error: 'Not found' }, 404);

  const body = (await c.req.json()) as Record<string, unknown>;
  const patch = normalizeUpdateBody(body);
  if (Object.keys(patch).length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400);
  }
  try {
    await updateReadingEntry(c.env.DB, entry.id, patch);
    return c.json({ data: { id: entry.id, slug } });
  } catch (err) {
    console.error('Update reading entry error:', err);
    return c.json({ error: 'Failed to update entry' }, 500);
  }
});

// ── DELETE /api/reading/:slug ─────────────────────────────────────────────────
router.delete('/:slug', async (c) => {
  const authError = requireSecret(c);
  if (authError) return authError;

  const slug = c.req.param('slug');
  const entry = await getReadingEntryBySlug(c.env.DB, slug);
  if (!entry) return c.json({ error: 'Not found' }, 404);

  await deleteReadingEntry(c.env.DB, entry.id);
  return c.json({ data: { deleted: slug } });
});

export default router;
