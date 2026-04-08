import { describe, it, expect, beforeEach } from 'vitest'
import app from '../index'
import { createMockDb, createMockEnv, sampleEntries } from './helpers'

/**
 * Integration tests for the API layer
 * Tests actual HTTP request/response through the Hono app
 */

// Helper to make requests with mocked env bindings
function makeRequest(
  path: string,
  env: any,
  options: RequestInit = {}
) {
  return app.request(
    path,
    options,
    env
  )
}

describe('GET /api/health', () => {
  it('returns 200 with ok status', async () => {
    const db = createMockDb()
    const env = createMockEnv(db)
    const res = await makeRequest('/api/health', env)

    expect(res.status).toBe(200)
  const body = (await res.json()) as any
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
  })
})

describe('GET /api/entries', () => {
  it('returns entries list', async () => {
    const db = createMockDb({ allResults: sampleEntries })
    const env = createMockEnv(db)
    const res = await makeRequest('/api/entries', env)

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.data).toEqual(sampleEntries)
    expect(body.count).toBe(3)
  })

  it('returns empty list when no entries', async () => {
    const db = createMockDb({ allResults: [] })
    const env = createMockEnv(db)
    const res = await makeRequest('/api/entries', env)

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.data).toEqual([])
    expect(body.count).toBe(0)
  })

  it('passes type filter to query', async () => {
    const db = createMockDb({ allResults: [] })
    const env = createMockEnv(db)
    await makeRequest('/api/entries?type=post', env)

    const sql = db._queries[0].sql
    expect(sql).toContain('entry_type = ?')
    expect(db._statement.bind).toHaveBeenCalled()
  })

  it('passes category filter to query', async () => {
    const db = createMockDb({ allResults: [] })
    const env = createMockEnv(db)
    await makeRequest('/api/entries?category=travel', env)

    const sql = db._queries[0].sql
    expect(sql).toContain('category = ?')
  })

  it('passes visibility filter (defaults to public)', async () => {
    const db = createMockDb({ allResults: [] })
    const env = createMockEnv(db)
    await makeRequest('/api/entries', env)

    const sql = db._queries[0].sql
    expect(sql).toContain('visibility = ?')
  })

  it('passes limit and offset parameters', async () => {
    const db = createMockDb({ allResults: [] })
    const env = createMockEnv(db)
    await makeRequest('/api/entries?limit=10&offset=20', env)

    const sql = db._queries[0].sql
    expect(sql).toContain('LIMIT ?')
    expect(sql).toContain('OFFSET ?')
  })

  it('returns 500 when DB is not configured', async () => {
    const env = { DISCORD_PUBLIC_KEY: 'test' } // no DB
    const res = await makeRequest('/api/entries', env)

    expect(res.status).toBe(500)
    const body = await res.json() as any
    expect(body.error).toContain('Database')
  })
})

describe('GET /api/entries/slug/:slug', () => {
  it('returns entry by slug', async () => {
    const entry = sampleEntries[0]
    const db = createMockDb({ firstResult: entry })
    const env = createMockEnv(db)
    const res = await makeRequest('/api/entries/slug/first-post', env)

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.data).toEqual(entry)
  })

  it('returns 404 when slug not found', async () => {
    const db = createMockDb({ firstResult: null })
    const env = createMockEnv(db)
    const res = await makeRequest('/api/entries/slug/nonexistent', env)

    expect(res.status).toBe(404)
    const body = await res.json() as any
    expect(body.error).toContain('not found')
  })
})

describe('GET /api/entries/:id', () => {
  it('returns entry by ID', async () => {
    const entry = sampleEntries[0]
    const db = createMockDb({ firstResult: entry })
    const env = createMockEnv(db)
    const res = await makeRequest('/api/entries/entry_001', env)

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.data).toEqual(entry)
  })

  it('returns 404 when ID not found', async () => {
    const db = createMockDb({ firstResult: null })
    const env = createMockEnv(db)
    const res = await makeRequest('/api/entries/entry_nonexistent', env)

    expect(res.status).toBe(404)
    const body = await res.json() as any
    expect(body.error).toContain('not found')
  })
})

describe('404 fallback', () => {
  it('returns 404 for unknown routes', async () => {
    const db = createMockDb()
    const env = createMockEnv(db)
    const res = await makeRequest('/unknown/path', env)

    expect(res.status).toBe(404)
    const body = await res.json() as any
    expect(body.error).toBe('Not found')
  })
})

describe('CORS headers', () => {
  it('returns CORS headers for allowed origin', async () => {
    const db = createMockDb()
    const env = createMockEnv(db)
    const res = await makeRequest('/api/health', env, {
      headers: { Origin: 'http://localhost:4321' },
    })

    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:4321')
  })

  it('returns CORS headers for *.pages.dev', async () => {
    const db = createMockDb()
    const env = createMockEnv(db)
    const res = await makeRequest('/api/health', env, {
      headers: { Origin: 'https://abc123.personal-blog.pages.dev' },
    })

    expect(res.headers.get('access-control-allow-origin')).toBe(
      'https://abc123.personal-blog.pages.dev'
    )
  })

  it('does not allow arbitrary origins', async () => {
    const db = createMockDb()
    const env = createMockEnv(db)
    const res = await makeRequest('/api/health', env, {
      headers: { Origin: 'https://evil.com' },
    })

    const allowOrigin = res.headers.get('access-control-allow-origin')
    expect(allowOrigin).not.toBe('https://evil.com')
  })
})
