import { describe, it, expect } from 'vitest'
import {
  CreateEntrySchema,
  UpdateEntrySchema,
  PromoteEntrySchema,
  EntryTypeSchema,
  CategorySchema,
  EntryStatusSchema,
  VisibilitySchema,
} from '../schema'

describe('EntryTypeSchema', () => {
  it('accepts valid entry types', () => {
    expect(EntryTypeSchema.parse('post')).toBe('post')
    expect(EntryTypeSchema.parse('article')).toBe('article')
  })

  it('rejects invalid entry types', () => {
    expect(() => EntryTypeSchema.parse('blog')).toThrow()
    expect(() => EntryTypeSchema.parse('')).toThrow()
  })
})

describe('CategorySchema', () => {
  it('accepts valid categories', () => {
    expect(CategorySchema.parse('journal')).toBe('journal')
    expect(CategorySchema.parse('reading')).toBe('reading')
    expect(CategorySchema.parse('travel')).toBe('travel')
    expect(CategorySchema.parse('place')).toBe('place')
  })

  it('rejects invalid categories', () => {
    expect(() => CategorySchema.parse('food')).toThrow()
  })
})

describe('EntryStatusSchema', () => {
  it('accepts all valid statuses', () => {
    for (const s of ['inbox', 'draft', 'published', 'private', 'archived']) {
      expect(EntryStatusSchema.parse(s)).toBe(s)
    }
  })

  it('rejects invalid status', () => {
    expect(() => EntryStatusSchema.parse('deleted')).toThrow()
  })
})

describe('VisibilitySchema', () => {
  it('accepts all valid visibilities', () => {
    for (const v of ['private', 'unlisted', 'public']) {
      expect(VisibilitySchema.parse(v)).toBe(v)
    }
  })

  it('rejects invalid visibility', () => {
    expect(() => VisibilitySchema.parse('hidden')).toThrow()
  })
})

describe('CreateEntrySchema', () => {
  const validEntry = {
    entry_type: 'post' as const,
    category: 'journal' as const,
    content_markdown: 'Hello world',
  }

  it('accepts minimal valid entry', () => {
    const result = CreateEntrySchema.parse(validEntry)
    expect(result.entry_type).toBe('post')
    expect(result.category).toBe('journal')
    expect(result.content_markdown).toBe('Hello world')
  })

  it('accepts entry with all optional fields', () => {
    const full = {
      ...validEntry,
      title: 'My Post',
      visibility: 'public' as const,
      tags: ['tag1', 'tag2'],
      place_name: 'Café',
      city: 'Taipei',
      country: 'Taiwan',
      visited_at: '2026-04-07',
      rating: 4,
      revisit: true,
      book_title: 'Some Book',
      book_author: 'Author',
      mood: 'happy',
      source_message_id: '123',
      source_channel_id: '456',
      source_guild_id: '789',
    }
    const result = CreateEntrySchema.parse(full)
    expect(result.title).toBe('My Post')
    expect(result.rating).toBe(4)
  })

  it('rejects empty content', () => {
    expect(() =>
      CreateEntrySchema.parse({ ...validEntry, content_markdown: '' })
    ).toThrow()
  })

  it('rejects invalid entry_type', () => {
    expect(() =>
      CreateEntrySchema.parse({ ...validEntry, entry_type: 'blog' })
    ).toThrow()
  })

  it('rejects rating out of range', () => {
    expect(() =>
      CreateEntrySchema.parse({ ...validEntry, rating: 0 })
    ).toThrow()
    expect(() =>
      CreateEntrySchema.parse({ ...validEntry, rating: 6 })
    ).toThrow()
  })

  it('accepts rating in valid range', () => {
    for (const r of [1, 2, 3, 4, 5]) {
      const result = CreateEntrySchema.parse({ ...validEntry, rating: r })
      expect(result.rating).toBe(r)
    }
  })
})

describe('UpdateEntrySchema', () => {
  it('accepts partial update', () => {
    const result = UpdateEntrySchema.parse({ title: 'New Title' })
    expect(result.title).toBe('New Title')
  })

  it('accepts empty object', () => {
    const result = UpdateEntrySchema.parse({})
    expect(result).toEqual({})
  })

  it('rejects invalid status', () => {
    expect(() => UpdateEntrySchema.parse({ status: 'deleted' })).toThrow()
  })
})

describe('PromoteEntrySchema', () => {
  it('accepts empty object', () => {
    const result = PromoteEntrySchema.parse({})
    expect(result).toEqual({})
  })

  it('accepts title and merge IDs', () => {
    const result = PromoteEntrySchema.parse({
      title: 'Promoted Article',
      merge_entry_ids: ['id1', 'id2'],
    })
    expect(result.title).toBe('Promoted Article')
    expect(result.merge_entry_ids).toEqual(['id1', 'id2'])
  })
})
