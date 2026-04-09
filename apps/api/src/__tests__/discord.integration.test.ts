import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from '../index'
import { createMockDb, createMockEnv, createMockExecutionCtx } from './helpers'

/**
 * Integration tests for Discord interaction endpoint
 * Tests the full POST /api/discord/interactions flow
 *
 * Note: Discord signature verification is mocked because we can't
 * generate valid Ed25519 signatures in tests without the private key.
 */

// Mock the verify module to bypass signature checking in tests
vi.mock('../discord/verify', () => ({
  verifyDiscordSignature: vi.fn().mockResolvedValue(true),
}))

function makeDiscordRequest(
  env: any,
  payload: any,
  headers: Record<string, string> = {}
) {
  return app.request(
    '/api/discord/interactions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature-ed25519': 'test_signature',
        'x-signature-timestamp': '1234567890',
        ...headers,
      },
      body: JSON.stringify(payload),
    },
    env,
  createMockExecutionCtx() as any
  )
}

describe('POST /api/discord/interactions', () => {
  describe('signature verification', () => {
    it('rejects requests without signature headers', async () => {
      const db = createMockDb()
      const env = createMockEnv(db)

      const res = await app.request(
        '/api/discord/interactions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 1 }),
        },
        env,
  createMockExecutionCtx() as any
      )

      expect(res.status).toBe(401)
      const body = await res.json() as any
      expect(body.error).toContain('signature')
    })
  })

  describe('PING (type 1)', () => {
    it('responds with type 1 (PONG)', async () => {
      const db = createMockDb()
      const env = createMockEnv(db)

      const res = await makeDiscordRequest(env, { type: 1 })

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.type).toBe(1)
    })
  })

  describe('APPLICATION_COMMAND (type 2)', () => {
  it('handles /post command with sync response', async () => {
      const db = createMockDb()
      const env = createMockEnv(db)

      const payload = {
        type: 2,
        data: {
          name: 'post',
          options: [
            { name: 'content', value: '今天天氣真好', type: 3 },
          ],
        },
        member: {
          user: { id: '123', username: 'testuser' },
        },
        channel_id: 'ch_001',
        guild_id: 'guild_001',
      }

      const res = await makeDiscordRequest(env, payload)

      expect(res.status).toBe(200)
      const body = await res.json() as any
  // Type 4 = CHANNEL_MESSAGE_WITH_SOURCE
  expect(body.type).toBe(4)
    })

    it('handles /article command', async () => {
      const db = createMockDb()
      const env = createMockEnv(db)

      const payload = {
        type: 2,
        data: {
          name: '文章',
          options: [
            { name: 'content', value: '深度分析文章內容', type: 3 },
          ],
        },
        member: {
          user: { id: '123', username: 'testuser' },
        },
      }

      const res = await makeDiscordRequest(env, payload)

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.type).toBe(4)
    })

    it('handles /travel command', async () => {
      const db = createMockDb()
      const env = createMockEnv(db)

      const payload = {
        type: 2,
        data: {
          name: '書摘',
          options: [
            { name: 'content', value: '讀完了原子習慣，很有啟發', type: 3 },
          ],
        },
        member: {
          user: { id: '123', username: 'testuser' },
        },
      }

      const res = await makeDiscordRequest(env, payload)
      const body = await res.json() as any
      expect(body.type).toBe(4)
    })

    it('handles /reading command', async () => {
      const db = createMockDb()
      const env = createMockEnv(db)

      const payload = {
        type: 2,
        data: {
          name: 'reading',
          options: [
            { name: 'content', value: '讀完了原子習慣，很有啟發', type: 3 },
          ],
        },
        user: { id: '123', username: 'testuser' }, // DM format (no member)
      }

      const res = await makeDiscordRequest(env, payload)
      const body = await res.json() as any
      expect(body.type).toBe(4)
    })

    it('rejects empty content', async () => {
      const db = createMockDb()
      const env = createMockEnv(db)

      const payload = {
        type: 2,
        data: {
          name: 'post',
          options: [
            { name: 'content', value: '', type: 3 },
          ],
        },
        member: {
          user: { id: '123', username: 'testuser' },
        },
      }

      const res = await makeDiscordRequest(env, payload)
      const body = await res.json() as any
      expect(body.type).toBe(4) // Immediate response
      expect(body.data.content).toContain('❌')
    })

    it('rejects missing content option', async () => {
      const db = createMockDb()
      const env = createMockEnv(db)

      const payload = {
        type: 2,
        data: {
          name: 'post',
          options: [],
        },
        member: {
          user: { id: '123', username: 'testuser' },
        },
      }

      const res = await makeDiscordRequest(env, payload)
      const body = await res.json() as any
      expect(body.data.content).toContain('❌')
    })

    it('returns error for unknown command', async () => {
      const db = createMockDb()
      const env = createMockEnv(db)

      const payload = {
        type: 2,
        data: {
          name: 'unknown_command',
          options: [
            { name: 'content', value: 'test', type: 3 },
          ],
        },
        member: {
          user: { id: '123', username: 'testuser' },
        },
      }

      const res = await makeDiscordRequest(env, payload)

      expect(res.status).toBe(400)
      const body = await res.json() as any
      expect(body.data.content).toContain('未知指令')
    })

    it('rejects when missing user data', async () => {
      const db = createMockDb()
      const env = createMockEnv(db)

      const payload = {
        type: 2,
        data: {
          name: 'post',
          options: [
            { name: 'content', value: 'test', type: 3 },
          ],
        },
        // No member or user
      }

      const res = await makeDiscordRequest(env, payload)
      expect(res.status).toBe(400)
    })

    it('returns 500 when DB is missing', async () => {
      const env = { DISCORD_PUBLIC_KEY: 'test' } // no DB

      const payload = {
        type: 2,
        data: {
          name: 'post',
          options: [{ name: 'content', value: 'test', type: 3 }],
        },
        member: { user: { id: '123', username: 'testuser' } },
      }

      const res = await makeDiscordRequest(env, payload)
      expect(res.status).toBe(500)
    })
  })

  describe('unhandled interaction types', () => {
    it('returns 400 for unknown interaction type', async () => {
      const db = createMockDb()
      const env = createMockEnv(db)

      const res = await makeDiscordRequest(env, { type: 99 })

      expect(res.status).toBe(400)
      const body = await res.json() as any
      expect(body.error).toContain('Unhandled')
    })
  })
})
