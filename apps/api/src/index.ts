import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import { handleDiscordInteraction } from './discord/interactions'
import entriesRouter from './routes/entries'

const app = new Hono()

// CORS 設定 - Discord 不會發送 Origin header，但其他客戶端需要 CORS
// Discord interactions 使用簽名驗證，不依賴 CORS
app.use('*', cors({
  origin: '*', // 允許所有來源（Discord interactions 已通過簽名驗證保護）
  credentials: false,
}))

// Discord interactions
app.post('/api/discord/interactions', handleDiscordInteraction)

// API routes
app.route('/api/entries', entriesRouter)

// Health check
app.get('/api/health', (c: Context) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404
app.all('*', (c: Context) => {
  return c.json({ error: 'Not found' }, 404)
})

export default app
