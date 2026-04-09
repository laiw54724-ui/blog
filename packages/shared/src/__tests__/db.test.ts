import { describe, it, expect, vi } from 'vitest';
import { createEntry, getEntries, getEntryById, getEntryBySlug, updateEntry, archiveEntry, addTagsToEntry } from '../db';

// Mock D1Database
function createMockDb() {
  const mockRun = vi.fn().mockResolvedValue({ success: true });
  const mockFirst = vi.fn().mockResolvedValue(null);
  const mockAll = vi.fn().mockResolvedValue({ results: [] });

  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    run: mockRun,
    first: mockFirst,
    all: mockAll,
  };

  const db = {
    prepare: vi.fn().mockReturnValue(mockStatement),
    _statement: mockStatement,
    _mockRun: mockRun,
    _mockFirst: mockFirst,
    _mockAll: mockAll,
  };

  return db;
}

describe('createEntry', () => {
  const validEntry = {
    id: 'entry_test123',
    slug: 'test-post',
    entry_type: 'post',
    category: 'journal',
    title: 'Test Post',
    content_markdown: 'Hello world',
    status: 'published',
    visibility: 'public',
  };

  it('inserts entry with correct parameters', async () => {
    const db = createMockDb();
    await createEntry(db as any, validEntry);

    expect(db.prepare).toHaveBeenCalledOnce();
    const sql = db.prepare.mock.calls[0][0];
    expect(sql).toContain('INSERT INTO entries');
    expect(sql).toContain('published_at');
  });

  it('sets published_at when status is published', async () => {
    const db = createMockDb();
    await createEntry(db as any, validEntry);

    const bindArgs = db._statement.bind.mock.calls[0];
    // published_at is the last argument (index 15)
    expect(bindArgs[15]).not.toBeNull();
    expect(bindArgs[15]).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it('sets published_at to null when status is draft', async () => {
    const db = createMockDb();
    await createEntry(db as any, { ...validEntry, status: 'draft' });

    const bindArgs = db._statement.bind.mock.calls[0];
    expect(bindArgs[15]).toBeNull();
  });

  it('rejects invalid entry_type', async () => {
    const db = createMockDb();
    await expect(createEntry(db as any, { ...validEntry, entry_type: 'blog' })).rejects.toThrow(
      'Invalid entry_type: blog'
    );
  });

  it('rejects invalid category', async () => {
    const db = createMockDb();
    await expect(createEntry(db as any, { ...validEntry, category: 'food' })).rejects.toThrow(
      'Invalid category: food'
    );
  });

  it('rejects invalid status', async () => {
    const db = createMockDb();
    await expect(createEntry(db as any, { ...validEntry, status: 'deleted' })).rejects.toThrow(
      'Invalid status: deleted'
    );
  });

  it('rejects invalid visibility', async () => {
    const db = createMockDb();
    await expect(createEntry(db as any, { ...validEntry, visibility: 'hidden' })).rejects.toThrow(
      'Invalid visibility: hidden'
    );
  });

  it('defaults source to discord', async () => {
    const db = createMockDb();
    await createEntry(db as any, validEntry);

    const bindArgs = db._statement.bind.mock.calls[0];
    // source is at index 9
    expect(bindArgs[9]).toBe('discord');
  });

  it('defaults excerpt to empty string', async () => {
    const db = createMockDb();
    await createEntry(db as any, validEntry);

    const bindArgs = db._statement.bind.mock.calls[0];
    // excerpt is at index 6
    expect(bindArgs[6]).toBe('');
  });
});

describe('getEntries', () => {
  it('builds query with no filters', async () => {
    const db = createMockDb();
    await getEntries(db as any);

    const sql = db.prepare.mock.calls[0][0];
    expect(sql).toContain('SELECT * FROM entries WHERE 1=1');
    expect(sql).toContain('ORDER BY created_at DESC');
  });

  it('adds entryType filter', async () => {
    const db = createMockDb();
    await getEntries(db as any, { entryType: 'post' });

    const sql = db.prepare.mock.calls[0][0];
    expect(sql).toContain('AND entry_type = ?');
  });

  it('adds category filter', async () => {
    const db = createMockDb();
    await getEntries(db as any, { category: 'travel' });

    const sql = db.prepare.mock.calls[0][0];
    expect(sql).toContain('AND category = ?');
  });

  it('adds limit and offset', async () => {
    const db = createMockDb();
    await getEntries(db as any, { limit: 10, offset: 20 });

    const sql = db.prepare.mock.calls[0][0];
    expect(sql).toContain('LIMIT ?');
    expect(sql).toContain('OFFSET ?');
  });

  it('returns empty array when results is undefined', async () => {
    const db = createMockDb();
    db._mockAll.mockResolvedValue({});
    const result = await getEntries(db as any);
    expect(result).toEqual([]);
  });
});

describe('getEntryById', () => {
  it('queries by ID', async () => {
    const db = createMockDb();
    await getEntryById(db as any, 'entry_123');

    expect(db.prepare).toHaveBeenCalledWith('SELECT * FROM entries WHERE id = ?');
    expect(db._statement.bind).toHaveBeenCalledWith('entry_123');
  });
});

describe('getEntryBySlug', () => {
  it('queries by slug', async () => {
    const db = createMockDb();
    await getEntryBySlug(db as any, 'my-post');

    expect(db.prepare).toHaveBeenCalledWith('SELECT * FROM entries WHERE slug = ? LIMIT 1');
    expect(db._statement.bind).toHaveBeenCalledWith('my-post');
  });
});

describe('updateEntry', () => {
  it('builds an update query with provided fields', async () => {
    const db = createMockDb();
    await updateEntry(db as any, 'entry_1', { title: 'Updated Title', visibility: 'public' });

    const sql = db.prepare.mock.calls[0][0];
    expect(sql).toContain('UPDATE entries SET');
    expect(sql).toContain('title = ?');
    expect(sql).toContain('visibility = ?');
    expect(sql).toContain('updated_at = ?');
    expect(db._statement.bind).toHaveBeenCalled();
  });

  it('sets published_at when status becomes published', async () => {
    const db = createMockDb();
    await updateEntry(db as any, 'entry_1', { status: 'published' });

    const bindArgs = db._statement.bind.mock.calls[0];
    expect(bindArgs).toContain('published');
    expect(bindArgs).toHaveLength(4);
  });

  it('throws when no valid fields are provided', async () => {
    const db = createMockDb();
    await expect(updateEntry(db as any, 'entry_1', {} as any)).rejects.toThrow('No fields to update');
  });
});

describe('archiveEntry', () => {
  it('archives an entry by updating status and visibility', async () => {
    const db = createMockDb();
    await archiveEntry(db as any, 'entry_1');

    const sql = db.prepare.mock.calls[0][0];
    expect(sql).toContain('UPDATE entries SET');
    expect(sql).toContain('status = ?');
    expect(sql).toContain('visibility = ?');
    const bindArgs = db._statement.bind.mock.calls[0];
    expect(bindArgs[0]).toBe('archived');
    expect(bindArgs[1]).toBe('private');
  });
});

describe('addTagsToEntry', () => {
  it('inserts each tag', async () => {
    const db = createMockDb();
    await addTagsToEntry(db as any, 'entry_1', ['tag_a', 'tag_b', 'tag_c']);

    expect(db.prepare).toHaveBeenCalledTimes(3);
    expect(db._statement.bind).toHaveBeenCalledWith('entry_1', 'tag_a');
    expect(db._statement.bind).toHaveBeenCalledWith('entry_1', 'tag_b');
    expect(db._statement.bind).toHaveBeenCalledWith('entry_1', 'tag_c');
  });

  it('handles empty tag list', async () => {
    const db = createMockDb();
    await addTagsToEntry(db as any, 'entry_1', []);
    expect(db.prepare).not.toHaveBeenCalled();
  });
});
