import { describe, it, expect } from 'vitest';
import { createEntryFromCommand } from '../discord/createEntry';
import { COMMAND_PRESETS } from '../discord/presets';
import { createMockDb } from './helpers';

const postPreset = COMMAND_PRESETS['post'];
const articlePreset = COMMAND_PRESETS['article'];
const travelPreset = COMMAND_PRESETS['travel'];

describe('createEntryFromCommand', () => {
  it('creates a post entry with correct fields', async () => {
    const db = createMockDb({ firstResult: null }); // slug unique check returns null
    const result = await createEntryFromCommand(db, {
      preset: postPreset,
      content: '今天去了一家很棒的咖啡廳！',
    });

    expect(result.success).toBe(true);
    expect(result.entry_id).toBeDefined();
    expect(result.message).toContain('✅');

    const insertSql = db._queries.find((q: any) => q.sql.startsWith('INSERT INTO entries'));
    expect(insertSql).toBeDefined();
  });

  it('uses custom title when provided', async () => {
    const db = createMockDb({ firstResult: null });
    const result = await createEntryFromCommand(db, {
      preset: postPreset,
      content: '今天去了一家很棒的咖啡廳！',
      title: '我的咖啡廳',
    });

    expect(result.success).toBe(true);
    // slug should be derived from custom title
    const slugCheckSql = db._queries.find((q: any) => q.sql.includes('WHERE slug = ?'));
    expect(slugCheckSql).toBeDefined();
  });

  it('extracts title from first meaningful line when no title provided', async () => {
    const db = createMockDb({ firstResult: null });
    const result = await createEntryFromCommand(db, {
      preset: articlePreset,
      content: '# 讀完了這本書\n\n這本書讓我思考很多事情。',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('讀完了這本書');
  });

  it('generates slug from title', async () => {
    const db = createMockDb({ firstResult: null });
    await createEntryFromCommand(db, {
      preset: postPreset,
      content: 'Hello World 測試',
    });

    const slugCheckSql = db._queries.find((q: any) => q.sql.includes('WHERE slug = ?'));
    expect(slugCheckSql).toBeDefined();
  });

  it('appends suffix when slug already exists', async () => {
    // First call returns existing entry (slug taken), second returns null (slug-2 free)
    const db = createMockDb({
      firstResults: [{ id: 'existing' }, null],
    });

    const result = await createEntryFromCommand(db, {
      preset: postPreset,
      content: 'Duplicate title',
      title: 'Duplicate title',
    });

    expect(result.success).toBe(true);
    // Should have tried slug at least twice (slug taken, then slug-2 free)
    const slugChecks = db._queries.filter((q: any) => q.sql.includes('WHERE slug = ?'));
    expect(slugChecks.length).toBeGreaterThanOrEqual(2);
  });

  it('extracts hashtags and creates tags', async () => {
    const db = createMockDb({ firstResult: null });
    await createEntryFromCommand(db, {
      preset: postPreset,
      content: '今天的旅行真是美好 #travel #japan',
    });

    const tagInsertSql = db._queries.find((q: any) => q.sql.includes('INSERT INTO tags'));
    const entryTagSql = db._queries.find((q: any) => q.sql.includes('INSERT INTO entry_tags'));
    expect(tagInsertSql ?? entryTagSql).toBeDefined();
  });

  it('skips tag creation when no hashtags in content', async () => {
    const db = createMockDb({ firstResult: null });
    await createEntryFromCommand(db, {
      preset: postPreset,
      content: '沒有標籤的一則貼文',
    });

    const tagInsertSql = db._queries.find((q: any) => q.sql.includes('INSERT INTO tags'));
    expect(tagInsertSql).toBeUndefined();
  });

  it('uses selectedCategory override instead of preset category', async () => {
    const db = createMockDb({ firstResult: null });
    await createEntryFromCommand(db, {
      preset: postPreset, // default: journal
      content: '在旅途中',
      selectedCategory: 'travel',
    });

    const insertSql = db._queries.find((q: any) => q.sql.startsWith('INSERT INTO entries'));
    expect(insertSql).toBeDefined();
    const params = db._statement.bind.mock.calls.find((call: any[]) => call.includes('travel'));
    expect(params).toBeDefined();
  });

  it('applies travel preset fields correctly', async () => {
    const db = createMockDb({ firstResult: null });
    const result = await createEntryFromCommand(db, {
      preset: travelPreset,
      content: '抵達京都！',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain(travelPreset.description);
  });

  it('returns failure on DB error', async () => {
    const db = {
      prepare: () => {
        throw new Error('DB connection failed');
      },
      _queries: [],
      _statement: { bind: { mock: { calls: [] } } },
    };

    const result = await createEntryFromCommand(db as any, {
      preset: postPreset,
      content: '測試失敗情境',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('❌');
    expect(result.error).toBe('DB connection failed');
  });

  it('uses provided entryId when given', async () => {
    const db = createMockDb({ firstResult: null });
    const customId = 'entry_custom_123';
    const result = await createEntryFromCommand(db, {
      preset: postPreset,
      content: '指定 ID 的貼文',
      entryId: customId,
    });

    expect(result.success).toBe(true);
    expect(result.entry_id).toBe(customId);
  });
});
