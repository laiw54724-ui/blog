import { Hono } from 'hono';
import type { Context } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import { UpdateEntrySchema } from '@personal-blog/shared/schema';
import {
  getEntries,
  getEntryById,
  getEntryBySlug,
  updateEntry,
  archiveEntry,
  deleteEntry,
  getAssetsByEntryId,
} from '@personal-blog/shared/db';

interface Env {
  DB: D1Database;
  API_SECRET?: string;
}

const router = new Hono<{ Bindings: Env }>();

// Add CORS headers to all responses
router.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Max-Age', '86400');

  if (c.req.method === 'OPTIONS') {
    return c.text('OK', 200);
  }

  await next();
});

// GET /api/entries - List entries
router.get('/', async (c) => {
  const db = c.env?.DB;
  if (!db) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const entryType = c.req.query('type');
  const category = c.req.query('category');
  const status = c.req.query('status');
  const visibility = c.req.query('visibility') || 'public';
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    const entries = await getEntries(db, {
      entryType: entryType || undefined,
      category: category || undefined,
      status: status || 'published',
      visibility,
      limit,
      offset,
    });

    return c.json({ data: entries, count: entries.length });
  } catch (error) {
    console.error('Error fetching entries:', error);
    return c.json({ error: 'Failed to fetch entries' }, 500);
  }
});

// GET /api/entries/slug/:slug - Get entry by slug
router.get('/slug/:slug', async (c) => {
  const db = c.env?.DB;
  if (!db) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const slug = c.req.param('slug');
  const visibility = c.req.query('visibility') || 'public';

  try {
    const entry = await getEntryBySlug(db, slug, visibility);
    if (!entry) {
      return c.json({ error: 'Entry not found' }, 404);
    }
    return c.json({ data: entry });
  } catch (error) {
    console.error('Error fetching entry by slug:', error);
    return c.json({ error: 'Failed to fetch entry' }, 500);
  }
});

// GET /api/entries/:id - Get single entry
router.get('/:id', async (c) => {
  const db = c.env?.DB;
  if (!db) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const id = c.req.param('id');

  try {
    const entry = await getEntryById(db, id);
    if (!entry) {
      return c.json({ error: 'Entry not found' }, 404);
    }
    return c.json({ data: entry });
  } catch (error) {
    console.error('Error fetching entry:', error);
    return c.json({ error: 'Failed to fetch entry' }, 500);
  }
});

// GET /api/entries/:id/assets - Get assets for an entry
router.get('/:id/assets', async (c) => {
  const db = c.env?.DB;
  if (!db) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const id = c.req.param('id');

  try {
    const assets = await getAssetsByEntryId(db, id);
    return c.json({ data: assets });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return c.json({ error: 'Failed to fetch assets' }, 500);
  }
});

// Auth middleware for write operations
function requireAuth(c: Context): boolean {
  const secret = (c.env as any)?.API_SECRET;
  if (!secret) return false;
  const auth = c.req.header('Authorization');
  return auth === `Bearer ${secret}`;
}

// PUT /api/entries/:id - Update entry
router.put('/:id', async (c) => {
  if (!requireAuth(c)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const db = c.env?.DB;
  if (!db) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const id = c.req.param('id');

  try {
    const existing = await getEntryById(db, id);
    if (!existing) {
      return c.json({ error: 'Entry not found' }, 404);
    }

    const body = await c.req.json();
    const parsed = UpdateEntrySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }

    const { tags, ...fields } = parsed.data;
    await updateEntry(db, id, fields);

    const updated = await getEntryById(db, id);
    return c.json({ data: updated });
  } catch (error) {
    console.error('Error updating entry:', error);
    return c.json({ error: 'Failed to update entry' }, 500);
  }
});

// DELETE /api/entries/:id - Archive entry (soft delete)
router.delete('/:id', async (c) => {
  if (!requireAuth(c)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const db = c.env?.DB;
  if (!db) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const id = c.req.param('id');

  try {
    const existing = await getEntryById(db, id);
    if (!existing) {
      return c.json({ error: 'Entry not found' }, 404);
    }

    await archiveEntry(db, id);
    return c.json({ message: 'Entry archived (典藏)', id });
  } catch (error) {
    console.error('Error archiving entry:', error);
    return c.json({ error: 'Failed to archive entry' }, 500);
  }
});

router.delete('/:id/hard', async (c) => {
  if (!requireAuth(c)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const db = c.env?.DB;
  if (!db) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const id = c.req.param('id');

  try {
    const existing = await getEntryById(db, id);
    if (!existing) {
      return c.json({ error: 'Entry not found' }, 404);
    }

    await deleteEntry(db, id);
    return c.json({ message: 'Entry deleted permanently', id });
  } catch (error) {
    console.error('Error hard deleting entry:', error);
    return c.json({ error: 'Failed to delete entry' }, 500);
  }
});

export default router;
