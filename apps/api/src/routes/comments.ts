import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import { generateId } from '@personal-blog/shared';
import {
  getEntryById,
  getCommentsByEntryId,
  createComment,
  checkAndUpdateRateLimit,
} from '@personal-blog/shared/db';

interface Env {
  DB: D1Database;
}

const router = new Hono<{ Bindings: Env }>();

// GET /api/entries/:id/comments
router.get('/', async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: 'Database not configured' }, 500);

  const entryId = c.req.param('id');

  try {
    const entry = await getEntryById(db, entryId);
    if (!entry) return c.json({ error: 'Entry not found' }, 404);

    const comments = await getCommentsByEntryId(db, entryId);
    return c.json({ data: comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return c.json({ error: 'Failed to fetch comments' }, 500);
  }
});

// POST /api/entries/:id/comments
router.post('/', async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: 'Database not configured' }, 500);

  const entryId = c.req.param('id');

  try {
    const entry = await getEntryById(db, entryId);
    if (!entry) return c.json({ error: 'Entry not found' }, 404);

    const body = await c.req.json<{
      author_name?: string;
      body_markdown?: string;
      website?: string;
      form_started_at?: number;
    }>();

    // Honeypot: reject if website field is filled
    if (body.website) {
      return c.json({ data: { id: 'bot', author_name: '匿名', body_markdown: '', created_at: new Date().toISOString() } });
    }

    // Timing check: reject if form submitted in under 3 seconds (bot)
    if (body.form_started_at && Date.now() - body.form_started_at < 3000) {
      return c.json({ error: '送出太快了，請稍候再試' }, 429);
    }

    const bodyMarkdown = (body.body_markdown || '').trim();
    if (!bodyMarkdown) return c.json({ error: '留言不能為空' }, 400);
    if (bodyMarkdown.length > 2000) return c.json({ error: '留言不能超過 2000 字' }, 400);

    const authorName = (body.author_name || '匿名').trim().slice(0, 40) || '匿名';

    // Rate limiting by IP
    const ip =
      c.req.header('CF-Connecting-IP') ||
      c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
      'unknown';

    const allowed = await checkAndUpdateRateLimit(db, ip, 60);
    if (!allowed) {
      return c.json({ error: '留言太頻繁，請 60 秒後再試' }, 429);
    }

    const id = generateId('comment');
    await createComment(db, { id, entry_id: entryId, author_name: authorName, body_markdown: bodyMarkdown });

    // Update comment_count in entry_metrics (upsert)
    await db
      .prepare(
        `INSERT INTO entry_metrics (entry_id, comment_count)
         VALUES (?, 1)
         ON CONFLICT(entry_id) DO UPDATE SET comment_count = comment_count + 1`
      )
      .bind(entryId)
      .run();

    return c.json({
      data: {
        id,
        entry_id: entryId,
        author_name: authorName,
        body_markdown: bodyMarkdown,
        created_at: new Date().toISOString(),
      },
    }, 201);
  } catch (error) {
    console.error('Error creating comment:', error);
    return c.json({ error: 'Failed to create comment' }, 500);
  }
});

export default router;
