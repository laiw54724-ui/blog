import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import { createMockDb, createMockEnv, sampleEntries } from './helpers';

/**
 * Integration tests for the API layer
 * Tests actual HTTP request/response through the Hono app
 */

// Helper to make requests with mocked env bindings
function makeRequest(path: string, env: any, options: RequestInit = {}) {
  return app.request(path, options, env);
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

    const updateSql = db._queries.find((query: any) => query.sql.startsWith('UPDATE entries SET'));
    expect(updateSql).toBeDefined();
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
    const updateSql = db._queries.find((query: any) => query.sql.startsWith('UPDATE entries SET'));
    expect(updateSql).toBeDefined();
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
