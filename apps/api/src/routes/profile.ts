/**
 * User profile routes
 * GET  /api/profile        — public, return profile data
 * PUT  /api/profile        — auth required, update name/bio/links
 * POST /api/profile/avatar — auth required, upload avatar image to R2
 * POST /api/profile/banner — auth required, upload banner image to R2
 */

import { Hono } from 'hono';
import type { Context } from 'hono';

interface ProfileEnv {
  API_SECRET?: string;
  DB?: {
    prepare(sql: string): {
      bind(...args: unknown[]): {
        run(): Promise<unknown>;
        first(): Promise<unknown>;
      };
      run(): Promise<unknown>;
      first(): Promise<unknown>;
    };
  };
  ASSETS_BUCKET?: {
    put(
      key: string,
      value: ArrayBuffer,
      options: { httpMetadata: { contentType: string } }
    ): Promise<unknown>;
  };
}

const profileRouter = new Hono<{ Bindings: ProfileEnv }>();

const API_BASE = 'https://personal-blog-api.personal-blog.workers.dev';

interface ProfileRow {
  name?: string | null;
  bio?: string | null;
  avatar_key?: string | null;
  banner_key?: string | null;
  links_json?: string | null;
  updated_at?: string | null;
}

interface ProfileUpdateBody {
  name?: string;
  bio?: string;
  links?: unknown[];
}

function requireAuth(c: Context<{ Bindings: ProfileEnv }>): boolean {
  const auth = c.req.header('Authorization');
  const secret = c.env?.API_SECRET;
  return Boolean(secret && auth === `Bearer ${secret}`);
}

// GET /api/profile — public
profileRouter.get('/', async (c: Context<{ Bindings: ProfileEnv }>) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: 'DB not configured' }, 500);

  // Ensure default row exists
  await db
    .prepare(`INSERT OR IGNORE INTO user_profile (id, name, bio) VALUES (1, 'life', '')`)
    .run();

  const profile = (await db
    .prepare('SELECT * FROM user_profile WHERE id = 1')
    .first()) as ProfileRow | null;

  if (!profile) {
    return c.json({ name: 'life', bio: '', avatar_url: null, banner_url: null, links: [] });
  }

  let links: unknown[] = [];
  try {
    links = JSON.parse(profile.links_json || '[]');
  } catch {
    // Keep default empty links when stored JSON is invalid.
  }

  return c.json({
    name: profile.name || 'life',
    bio: profile.bio || '',
    avatar_url: profile.avatar_key ? `${API_BASE}/api/assets/${profile.avatar_key}` : null,
    banner_url: profile.banner_key ? `${API_BASE}/api/assets/${profile.banner_key}` : null,
    links,
    updated_at: profile.updated_at,
  });
});

// PUT /api/profile — update name/bio/links
profileRouter.put('/', async (c: Context<{ Bindings: ProfileEnv }>) => {
  if (!requireAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const db = c.env?.DB;
  if (!db) return c.json({ error: 'DB not configured' }, 500);

  const body = (await c.req.json()) as ProfileUpdateBody;

  await db
    .prepare(
      `INSERT INTO user_profile (id, name, bio, links_json, updated_at)
       VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         bio = excluded.bio,
         links_json = excluded.links_json,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(body.name?.trim() || 'life', body.bio?.trim() || '', JSON.stringify(body.links || []))
    .run();

  return c.json({ ok: true });
});

// POST /api/profile/avatar — upload avatar image
profileRouter.post('/avatar', async (c: Context<{ Bindings: ProfileEnv }>) => {
  if (!requireAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const bucket = c.env?.ASSETS_BUCKET;
  const db = c.env?.DB;
  if (!bucket || !db) return c.json({ error: 'Storage not configured' }, 500);

  const contentType = c.req.header('Content-Type') || 'image/jpeg';
  const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
  const storageKey = `profile/avatar${ext}`;
  const bytes = await c.req.arrayBuffer();

  await bucket.put(storageKey, bytes, { httpMetadata: { contentType } });

  await db
    .prepare(
      `INSERT INTO user_profile (id, avatar_key, updated_at)
       VALUES (1, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         avatar_key = excluded.avatar_key,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(storageKey)
    .run();

  return c.json({ ok: true, storage_key: storageKey });
});

// POST /api/profile/banner — upload banner image
profileRouter.post('/banner', async (c: Context<{ Bindings: ProfileEnv }>) => {
  if (!requireAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const bucket = c.env?.ASSETS_BUCKET;
  const db = c.env?.DB;
  if (!bucket || !db) return c.json({ error: 'Storage not configured' }, 500);

  const contentType = c.req.header('Content-Type') || 'image/jpeg';
  const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
  const storageKey = `profile/banner${ext}`;
  const bytes = await c.req.arrayBuffer();

  await bucket.put(storageKey, bytes, { httpMetadata: { contentType } });

  await db
    .prepare(
      `INSERT INTO user_profile (id, banner_key, updated_at)
       VALUES (1, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         banner_key = excluded.banner_key,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(storageKey)
    .run();

  return c.json({ ok: true, storage_key: storageKey });
});

export default profileRouter;
