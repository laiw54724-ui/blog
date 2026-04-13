import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import { normalizeTagInput } from '@personal-blog/shared';
import { getPublicEntriesByTagSlug, getPublicTags } from '@personal-blog/shared/db';

interface Env {
  DB: D1Database;
  LOCKED_TAG_SLUGS?: string;
}

const router = new Hono<{ Bindings: Env }>();

function getLockedTagSlugs(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return Array.from(
    new Set(
      raw
        .split(/[,\s]+/u)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => normalizeTagInput(tag).slug)
    )
  );
}

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
    const locked = new Set(getLockedTagSlugs(c.env.LOCKED_TAG_SLUGS));
    const visibleTags = tags.filter((tag) => !locked.has(normalizeTagInput(tag.slug).slug));
    return c.json({ data: visibleTags, count: visibleTags.length });
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
  const locked = new Set(getLockedTagSlugs(c.env.LOCKED_TAG_SLUGS));
  if (locked.has(normalizeTagInput(slug).slug)) {
    return c.json({ data: [], count: 0 });
  }

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
