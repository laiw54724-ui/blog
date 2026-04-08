import { describe, it, expect, vi } from 'vitest'
import { createEntryFromCommand } from '../discord/createEntry'
import type { CommandPreset } from '../discord/presets'

function createMockDb() {
  const mockRun = vi.fn().mockResolvedValue({ success: true })
  const mockFirst = vi.fn().mockResolvedValue(null) // tag not found by default
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    run: mockRun,
    first: mockFirst,
  }
  return {
    prepare: vi.fn().mockReturnValue(mockStatement),
    _statement: mockStatement,
    _mockRun: mockRun,
    _mockFirst: mockFirst,
  }
}

const postPreset: CommandPreset = {
  entry_type: 'post',
  category: 'journal',
  status: 'published',
  visibility: 'public',
  description: '貼文',
}

const articlePreset: CommandPreset = {
  entry_type: 'article',
  category: 'journal',
  status: 'draft',
  visibility: 'private',
  description: '文章',
}

describe('createEntryFromCommand', () => {
  it('creates a post entry successfully', async () => {
    const db = createMockDb()
    const result = await createEntryFromCommand(db, {
      preset: postPreset,
      content: '今天天氣很好',
    })

    expect(result.success).toBe(true)
    expect(result.entry_id).toMatch(/^entry_/)
    expect(result.message).toContain('✅')
  })

  it('creates an article entry successfully', async () => {
    const db = createMockDb()
    const result = await createEntryFromCommand(db, {
      preset: articlePreset,
      content: '深度分析某個主題\n\n這是一篇長文',
    })

    expect(result.success).toBe(true)
    expect(result.entry_id).toMatch(/^entry_/)
  })

  it('uses first line as title', async () => {
    const db = createMockDb()
    await createEntryFromCommand(db, {
      preset: postPreset,
      content: 'First Line Title\nRest of the content',
    })

    // First prepare call is the INSERT INTO entries
    const insertSql = db.prepare.mock.calls[0][0]
    expect(insertSql).toContain('INSERT INTO entries')

    // Check bind args: id, slug, entry_type, category, title, ...
    const bindArgs = db._statement.bind.mock.calls[0]
    expect(bindArgs[4]).toBe('First Line Title') // title is at index 4
  })

  it('uses custom title when provided', async () => {
    const db = createMockDb()
    await createEntryFromCommand(db, {
      preset: postPreset,
      content: 'Some content',
      title: 'Custom Title',
    })

    const bindArgs = db._statement.bind.mock.calls[0]
    expect(bindArgs[4]).toBe('Custom Title')
  })

  it('uses correct column name (id, not entry_id)', async () => {
    const db = createMockDb()
    await createEntryFromCommand(db, {
      preset: postPreset,
      content: 'Test content here',
    })

    const insertSql = db.prepare.mock.calls[0][0]
    // Should NOT contain entry_id as column (only id)
    expect(insertSql).not.toMatch(/entry_id,/)
    expect(insertSql).toContain('id,')
  })

  it('sets published_at for published entries', async () => {
    const db = createMockDb()
    await createEntryFromCommand(db, {
      preset: postPreset, // status: 'published'
      content: 'Test content here',
    })

    const insertSql = db.prepare.mock.calls[0][0]
    expect(insertSql).toContain('published_at')
  })

  it('extracts hashtags and creates tags properly', async () => {
    const db = createMockDb()
    await createEntryFromCommand(db, {
      preset: postPreset,
      content: '今天去了 #咖啡廳 喝了 #拿鐵',
    })

    // Should have: 1 entry insert + 2 tag lookups + 2 tag creates + 2 tag links = 7
    // (since mockFirst returns null, tags are created)
    expect(db.prepare.mock.calls.length).toBeGreaterThanOrEqual(5)

    // Check that tag SELECT queries happen
    const selectTagCalls = db.prepare.mock.calls.filter(
      (call: any[]) => call[0].includes('SELECT id FROM tags')
    )
    expect(selectTagCalls.length).toBe(2)
  })

  it('reuses existing tags instead of creating duplicates', async () => {
    const db = createMockDb()
    // First tag lookup returns existing tag
    db._mockFirst
      .mockResolvedValueOnce({ id: 'tag_existing' })
      .mockResolvedValueOnce(null) // second tag not found

    await createEntryFromCommand(db, {
      preset: postPreset,
      content: '今天 #已有標籤 和 #新標籤',
    })

    // Should only INSERT one new tag (not two)
    const insertTagCalls = db.prepare.mock.calls.filter(
      (call: any[]) => call[0].includes('INSERT INTO tags')
    )
    expect(insertTagCalls.length).toBe(1)
  })

  it('handles DB error gracefully', async () => {
    const db = createMockDb()
    db._mockRun.mockRejectedValue(new Error('DB connection failed'))

    const result = await createEntryFromCommand(db, {
      preset: postPreset,
      content: 'Test content here',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('DB connection failed')
    expect(result.message).toContain('❌')
  })

  it('uses preset entry_type and category', async () => {
    const db = createMockDb()
    const travelPreset: CommandPreset = {
      entry_type: 'post',
      category: 'travel',
      status: 'published',
      visibility: 'public',
      description: '旅記',
    }

    await createEntryFromCommand(db, {
      preset: travelPreset,
      content: '京都的秋天真美',
    })

    const bindArgs = db._statement.bind.mock.calls[0]
    // entry_type at index 2, category at index 3
    expect(bindArgs[2]).toBe('post')
    expect(bindArgs[3]).toBe('travel')
  })
})
