import { describe, it, expect } from 'vitest';
import app from '../index';
import { createMockDb, createMockEnv, sampleEntries } from './helpers';

interface MockQuery {
  sql: string;
}

/**
 * Integration tests for the API layer
 * Tests actual HTTP request/response through the Hono app
 */

// Helper to make requests with mocked env bindings
function makeRequest(path: string, env: any, options: RequestInit = {}) {
  return app.request(path, options, env);
}

function findUpdateQuery(queries: MockQuery[]) {
  const query = queries.find((item) => item.sql.startsWith('UPDATE entries SET'));
  expect(query).toBeDefined();
  return query!;
}

describe('GET /api/health', () => {
  it('returns 200 with ok status', async () => {
    const db = createMockDb();
    const env = createMockEnv(db);
    const res = await makeRequest('/api/health', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});

describe('GET /api/entries', () => {
  it('returns entries list', async () => {
    const db = createMockDb({ allResults: sampleEntries });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual(sampleEntries);
    expect(body.count).toBe(3);
  });

  it('returns empty list when no entries', async () => {
    const db = createMockDb({ allResults: [] });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('passes type filter to query', async () => {
    const db = createMockDb({ allResults: [] });
    const env = createMockEnv(db);
    await makeRequest('/api/entries?type=post', env);

    const sql = db._queries[0].sql;
    expect(sql).toContain('entry_type = ?');
    expect(db._statement.bind).toHaveBeenCalled();
  });

  it('passes category filter to query', async () => {
    const db = createMockDb({ allResults: [] });
    const env = createMockEnv(db);
    await makeRequest('/api/entries?category=travel', env);

    const sql = db._queries[0].sql;
    expect(sql).toContain('category = ?');
  });

  it('passes visibility filter (defaults to public)', async () => {
    const db = createMockDb({ allResults: [] });
    const env = createMockEnv(db);
    await makeRequest('/api/entries', env);

    const sql = db._queries[0].sql;
    expect(sql).toContain('visibility = ?');
  });

  it('passes limit and offset parameters', async () => {
    const db = createMockDb({ allResults: [] });
    const env = createMockEnv(db);
    await makeRequest('/api/entries?limit=10&offset=20', env);

    const sql = db._queries[0].sql;
    expect(sql).toContain('LIMIT ?');
    expect(sql).toContain('OFFSET ?');
  });

  it('returns 500 when DB is not configured', async () => {
    const env = { DISCORD_PUBLIC_KEY: 'test' }; // no DB
    const res = await makeRequest('/api/entries', env);

    expect(res.status).toBe(500);
    const body = (await res.json()) as any;
    expect(body.error).toContain('Database');
  });
});

describe('GET /api/entries/slug/:slug', () => {
  it('returns entry by slug', async () => {
    const entry = sampleEntries[0];
    const db = createMockDb({ firstResult: entry });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries/slug/first-post', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual(entry);
  });

  it('returns 404 when slug not found', async () => {
    const db = createMockDb({ firstResult: null });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries/slug/nonexistent', env);

    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error).toContain('not found');
  });
});

describe('GET /api/entries/search', () => {
  it('returns search results matching query', async () => {
    const db = createMockDb({ allResults: [sampleEntries[0]] });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries/search?q=hello', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual([sampleEntries[0]]);
    expect(body.count).toBe(1);
  });

  it('returns empty array when query is blank', async () => {
    const db = createMockDb({ allResults: [] });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries/search', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('returns 400 when query exceeds 100 chars', async () => {
    const db = createMockDb({ allResults: [] });
    const env = createMockEnv(db);
    const longQ = 'a'.repeat(101);
    const res = await makeRequest(`/api/entries/search?q=${longQ}`, env);

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain('too long');
  });
});

describe('GET /api/entries/assets', () => {
  it('returns assets map keyed by entry_id', async () => {
    const assetRows = [
      { id: 'asset_1', entry_id: 'entry_001', kind: 'cover', storage_key: 'img/a.jpg', mime_type: 'image/jpeg', sort_order: 0 },
      { id: 'asset_2', entry_id: 'entry_002', kind: 'image', storage_key: 'img/b.jpg', mime_type: 'image/jpeg', sort_order: 0 },
    ];
    const db = createMockDb({ allResults: assetRows });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries/assets?ids=entry_001,entry_002', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.entry_001).toBeDefined();
    expect(body.data.entry_001[0].id).toBe('asset_1');
    expect(body.data.entry_002).toBeDefined();
  });

  it('returns empty object when no ids provided', async () => {
    const db = createMockDb({ allResults: [] });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries/assets', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual({});
  });

  it('limits to 50 ids max', async () => {
    const db = createMockDb({ allResults: [] });
    const env = createMockEnv(db);
    const ids = Array.from({ length: 60 }, (_, i) => `entry_${i}`).join(',');
    const res = await makeRequest(`/api/entries/assets?ids=${ids}`, env);

    expect(res.status).toBe(200);
    const sql = db._queries[0]?.sql || '';
    const placeholderCount = (sql.match(/\?/g) || []).length;
    expect(placeholderCount).toBeLessThanOrEqual(50);
  });
});

describe('GET /api/tags', () => {
  it('returns public tags with entry counts', async () => {
    const rows = [
      { id: 'tag_1', name: 'BL', slug: 'bl', created_at: '2026-04-01', entry_count: 3 },
      { id: 'tag_2', name: '校園', slug: 'campus', created_at: '2026-04-01', entry_count: 2 },
    ];
    const db = createMockDb({ allResults: rows });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/tags?type=article&limit=10', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual(rows);
    expect(body.count).toBe(2);
  });

  it('passes filters to tag query', async () => {
    const db = createMockDb({ allResults: [] });
    const env = createMockEnv(db);
    await makeRequest('/api/tags?type=article&category=reading&limit=12', env);

    const sql = db._queries[0]?.sql || '';
    expect(sql).toContain('entries.entry_type = ?');
    expect(sql).toContain('entries.category = ?');
    expect(sql).toContain('LIMIT ?');
  });
});

describe('GET /api/tags/:slug/entries', () => {
  it('returns public entries for a tag slug', async () => {
    const db = createMockDb({ allResults: [sampleEntries[1]] });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/tags/bl/entries?type=article', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual([sampleEntries[1]]);
    expect(body.count).toBe(1);
  });
});

describe('GET /api/entries/:id', () => {
  it('returns entry by ID', async () => {
    const entry = sampleEntries[0];
    const db = createMockDb({ firstResult: entry });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries/entry_001', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual(entry);
  });

  it('returns 404 when ID not found', async () => {
    const db = createMockDb({ firstResult: null });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries/entry_nonexistent', env);

    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error).toContain('not found');
  });
});

describe('404 fallback', () => {
  it('returns 404 for unknown routes', async () => {
    const db = createMockDb();
    const env = createMockEnv(db);
    const res = await makeRequest('/unknown/path', env);

    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error).toBe('Not found');
  });
});

describe('PUT /api/entries/:id', () => {
  it('updates an existing entry', async () => {
    const updatedEntry = {
      ...sampleEntries[0],
      title: 'Updated Title',
      content_markdown: 'Updated content',
    };

    const db = createMockDb({
      firstResults: [sampleEntries[0], updatedEntry],
      allResults: sampleEntries,
    });
    const env = createMockEnv(db);

    const updateData = {
      title: 'Updated Title',
      content_markdown: 'Updated content',
      status: 'published',
    };

    const res = await makeRequest('/api/entries/entry_1', env, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test_secret_for_testing',
      },
      body: JSON.stringify(updateData),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.title).toBe('Updated Title');
    expect(body.data.content_markdown).toBe('Updated content');

    const updateSql = findUpdateQuery(db._queries);
    expect(updateSql.sql).toContain('title = ?');
    expect(updateSql.sql).toContain('content_markdown = ?');
  });

  it('returns 404 for non-existent entry', async () => {
    const db = createMockDb({ firstResult: null });
    const env = createMockEnv(db);

    const res = await makeRequest('/api/entries/nonexistent', env, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_secret_for_testing',
      },
      body: JSON.stringify({ title: 'New Title' }),
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error).toBe('Entry not found');
  });

  it('validates input data', async () => {
    const db = createMockDb({
      firstResult: sampleEntries[0],
    });
    const env = createMockEnv(db);

    const res = await makeRequest('/api/entries/entry_1', env, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_secret_for_testing',
      },
      body: JSON.stringify({ status: 'invalid_status' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toBe('Invalid input');
  });

  it('returns 401 without authentication', async () => {
    const db = createMockDb({
      firstResult: sampleEntries[0],
    });
    const env = createMockEnv(db);

    const res = await makeRequest('/api/entries/entry_1', env, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Title' }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error).toBe('Unauthorized');
  });

  it('updates an existing entry with valid data', async () => {
    const db = createMockDb({
      firstResult: sampleEntries[0],
    });
    const env = createMockEnv(db);

    const res = await makeRequest('/api/entries/entry_1', env, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test_secret_for_testing',
      },
      body: JSON.stringify({ title: 'Updated Title', visibility: 'public' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual(sampleEntries[0]);
    const updateSql = findUpdateQuery(db._queries);
    expect(updateSql.sql).toContain('title = ?');
    expect(updateSql.sql).toContain('visibility = ?');
  });
});

describe('DELETE /api/entries/:id', () => {
  it('archives an existing entry', async () => {
    const db = createMockDb({
      firstResult: sampleEntries[0],
    });
    const env = createMockEnv(db);

    const res = await makeRequest('/api/entries/entry_1', env, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer test_secret_for_testing',
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.message).toBe('Entry archived (典藏)');
    expect(body.id).toBe('entry_1');
  });

  it('hard deletes an existing entry permanently', async () => {
    const db = createMockDb({
      firstResult: sampleEntries[0],
    });
    const env = createMockEnv(db);

    const res = await makeRequest('/api/entries/entry_1/hard', env, {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer test_secret_for_testing',
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.message).toBe('Entry deleted permanently');
    expect(body.id).toBe('entry_1');

    const deleteSql = db._queries.find((query: any) => query.sql.startsWith('DELETE FROM entries'));
    expect(deleteSql).toBeDefined();
  });

  it('returns 404 for non-existent entry', async () => {
    const db = createMockDb({ firstResult: null });
    const env = createMockEnv(db);

    const res = await makeRequest('/api/entries/nonexistent', env, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer test_secret_for_testing',
      },
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error).toBe('Entry not found');
  });

  it('returns 401 without authentication', async () => {
    const db = createMockDb({
      firstResult: sampleEntries[0],
    });
    const env = createMockEnv(db);

    const res = await makeRequest('/api/entries/entry_1', env, {
      method: 'DELETE',
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error).toBe('Unauthorized');
  });
});

describe('POST /api/entries/:id/clap', () => {
  it('increments clap count', async () => {
    const db = createMockDb({ firstResults: [null, { clap_count: 2 }] });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries/entry_001/clap', env, {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.clap_count).toBe(2);
  });

  it('returns 429 when same IP claps the same entry within 10 seconds', async () => {
    const db = createMockDb({
      firstResults: [
        null,
        { clap_count: 1 },
        { last_comment_at: new Date(Date.now() - 2000).toISOString() },
      ],
    });
    const env = createMockEnv(db);

    const res1 = await makeRequest('/api/entries/entry_001/clap', env, {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '1.2.3.5' },
    });
    expect(res1.status).toBe(200);

    const res2 = await makeRequest('/api/entries/entry_001/clap', env, {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '1.2.3.5' },
    });
    expect(res2.status).toBe(429);
  });
});

describe('CORS headers', () => {
  it('returns CORS headers for allowed origin', async () => {
    const db = createMockDb();
    const env = createMockEnv(db);
    const res = await makeRequest('/api/health', env, {
      headers: { Origin: 'http://localhost:4321' },
    });

    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('returns CORS headers for *.pages.dev', async () => {
    const db = createMockDb();
    const env = createMockEnv(db);
    const res = await makeRequest('/api/health', env, {
      headers: { Origin: 'https://abc123.personal-blog.pages.dev' },
    });

    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('does not allow arbitrary origins', async () => {
    const db = createMockDb();
    const env = createMockEnv(db);
    const res = await makeRequest('/api/health', env, {
      headers: { Origin: 'https://evil.com' },
    });

    const allowOrigin = res.headers.get('access-control-allow-origin');
    expect(allowOrigin).not.toBe('https://evil.com');
  });
});
