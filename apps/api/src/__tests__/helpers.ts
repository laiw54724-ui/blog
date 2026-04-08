import { vi } from 'vitest'

/**
 * Create a mock D1 database that tracks all queries
 */
export function createMockDb(data: {
  allResults?: any[]
  firstResult?: any
} = {}) {
  const queries: Array<{ sql: string; params: any[] }> = []

  const mockStatement = {
    bind: vi.fn(function (this: any, ...args: any[]) {
      // Store the bound params on the last query
      if (queries.length > 0) {
        queries[queries.length - 1].params = args
      }
      return this
    }),
    run: vi.fn().mockResolvedValue({ success: true }),
    first: vi.fn().mockResolvedValue(data.firstResult ?? null),
    all: vi.fn().mockResolvedValue({
      results: data.allResults ?? [],
    }),
  }

  const db = {
    prepare: vi.fn((sql: string) => {
      queries.push({ sql, params: [] })
      return mockStatement
    }),
    _statement: mockStatement,
    _queries: queries,
  }

  return db
}

/**
 * Create a mock env object with DB and Discord keys
 */
export function createMockEnv(db: any) {
  return {
    DB: db,
    DISCORD_PUBLIC_KEY: 'test_public_key_for_testing',
    DISCORD_TOKEN: 'test_token',
    DISCORD_CLIENT_ID: 'test_client_id',
  }
}

/**
 * Create a mock ExecutionContext for Cloudflare Workers
 * Needed because Hono's test helper doesn't provide one
 */
export function createMockExecutionCtx() {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  }
}

/**
 * Sample entry data for testing
 */
export const sampleEntries = [
  {
    id: 'entry_001',
    slug: 'first-post',
    entry_type: 'post',
    category: 'journal',
    title: 'First Post',
    content_markdown: 'Hello world!',
    excerpt: 'Hello world!',
    status: 'published',
    visibility: 'public',
    source: 'discord',
    created_at: '2026-04-07T12:00:00.000Z',
    updated_at: '2026-04-07T12:00:00.000Z',
  },
  {
    id: 'entry_002',
    slug: 'my-article',
    entry_type: 'article',
    category: 'reading',
    title: 'My Article',
    content_markdown: '# Deep Thoughts\n\nLong form content here.',
    excerpt: 'Deep Thoughts',
    status: 'published',
    visibility: 'public',
    source: 'discord',
    created_at: '2026-04-07T13:00:00.000Z',
    updated_at: '2026-04-07T13:00:00.000Z',
  },
  {
    id: 'entry_003',
    slug: 'draft-article',
    entry_type: 'article',
    category: 'journal',
    title: 'Draft Article',
    content_markdown: 'Work in progress',
    excerpt: 'Work in progress',
    status: 'draft',
    visibility: 'private',
    source: 'discord',
    created_at: '2026-04-07T14:00:00.000Z',
    updated_at: '2026-04-07T14:00:00.000Z',
  },
]
