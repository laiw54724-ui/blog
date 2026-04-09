import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { handleDiscordInteraction } from './discord/interactions';
import entriesRouter from './routes/entries';
import commentsRouter from './routes/comments';
import profileRouter from './routes/profile';

interface StoredObject {
  body: BodyInit | null;
  httpMetadata?: {
    contentType?: string;
  };
}

interface AppEnv {
  ASSETS_BUCKET?: {
    get(key: string): Promise<StoredObject | null>;
  };
}

const app = new Hono<{ Bindings: AppEnv }>();

// CORS 設定 - Discord 不會發送 Origin header，但其他客戶端需要 CORS
// Discord interactions 使用簽名驗證，不依賴 CORS
app.use(
  '*',
  cors({
    origin: '*', // 允許所有來源（Discord interactions 已通過簽名驗證保護）
    credentials: false,
  })
);

// Discord interactions
app.post('/api/discord/interactions', handleDiscordInteraction);

// API routes
app.route('/api/entries', entriesRouter);
app.route('/api/entries/:id/comments', commentsRouter);
app.route('/api/profile', profileRouter);

// Serve assets from R2
app.get('/api/assets/*', async (c: Context<{ Bindings: AppEnv }>) => {
  const bucket = c.env?.ASSETS_BUCKET;
  if (!bucket) {
    return c.json({ error: 'Storage not configured' }, 500);
  }

  // Extract the storage key from the URL path (everything after /api/assets/)
  const key = c.req.path.replace('/api/assets/', '');
  if (!key) {
    return c.json({ error: 'Missing asset key' }, 400);
  }

  const object = await bucket.get(key);
  if (!object) {
    return c.json({ error: 'Asset not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
});

// Health check
app.get('/api/health', (c: Context) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.all('*', (c: Context) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;
