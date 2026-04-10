import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import { getPublicEntriesByTagSlug, getPublicTags } from '@personal-blog/shared/db';

interface Env {
  DB: D1Database;
}

const router = new Hono<{ Bindings: Env }>();

router.use('*', async (c, next) => {
  if (!c.env?.DB) {
    return c.json({ error: 'Database not configured' }, 500);
  }
  await next();
});

router.get('/', async (c) => {
  const db = c.env.DB;
  const type = c.req.query('type') || undefined;
  const category = c.req.query('category') || undefined;
  const limit = Math.min(parseInt(c.req.query('limit') || '30', 10), 100);

  try {
    const tags = await getPublicTags(db, { entryType: type, category, limit });
    return c.json({ data: tags, count: tags.length });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return c.json({ error: 'Failed to fetch tags' }, 500);
  }
});

router.get('/:slug/entries', async (c) => {
  const db = c.env.DB;
  const slug = c.req.param('slug');
  const type = c.req.query('type') || undefined;
  const category = c.req.query('category') || undefined;
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);

  try {
    const entries = await getPublicEntriesByTagSlug(db, slug, {
      entryType: type,
      category,
      limit,
    });
    return c.json({ data: entries, count: entries.length });
  } catch (error) {
    console.error(`Error fetching entries for tag ${slug}:`, error);
    return c.json({ error: 'Failed to fetch entries for tag' }, 500);
  }
});

export default router;
