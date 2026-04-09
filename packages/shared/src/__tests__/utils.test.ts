import { describe, it, expect } from 'vitest';
import {
  slugify,
  generateId,
  extractHashtags,
  generateExcerpt,
  formatDate,
  defaultVisibility,
} from '../utils';

describe('slugify', () => {
  it('converts basic text to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('handles multiple spaces and underscores', () => {
    expect(slugify('hello   world__test')).toBe('hello-world-test');
  });

  it('removes special characters', () => {
    expect(slugify('hello! @world #test')).toBe('hello-world-test');
  });

  it('preserves CJK characters', () => {
    expect(slugify('今天天氣很好')).toBe('今天天氣很好');
  });

  it('handles mixed CJK and Latin', () => {
    expect(slugify('我的 Blog Post')).toBe('我的-blog-post');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('--hello--')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('collapses multiple dashes', () => {
    expect(slugify('a - - b')).toBe('a-b');
  });
});

describe('generateId', () => {
  it('generates ID with correct prefix', () => {
    const id = generateId('entry');
    expect(id).toMatch(/^entry_.+/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('test')));
    expect(ids.size).toBe(100);
  });

  it('works with different prefixes', () => {
    expect(generateId('tag')).toMatch(/^tag_/);
    expect(generateId('asset')).toMatch(/^asset_/);
  });
});

describe('extractHashtags', () => {
  it('extracts single hashtag', () => {
    expect(extractHashtags('Hello #world')).toEqual(['world']);
  });

  it('extracts multiple hashtags', () => {
    expect(extractHashtags('#hello #world #test')).toEqual(['hello', 'world', 'test']);
  });

  it('returns empty array for no hashtags', () => {
    expect(extractHashtags('Hello world')).toEqual([]);
  });

  it('handles CJK hashtags', () => {
    expect(extractHashtags('#旅行 #咖啡')).toEqual(['旅行', '咖啡']);
  });

  it('lowercases hashtags', () => {
    expect(extractHashtags('#Hello #WORLD')).toEqual(['hello', 'world']);
  });

  it('handles hashtags with underscores', () => {
    expect(extractHashtags('#my_tag')).toEqual(['my_tag']);
  });
});

describe('generateExcerpt', () => {
  it('returns full text when shorter than maxLength', () => {
    expect(generateExcerpt('Short text')).toBe('Short text');
  });

  it('truncates long text at word boundary', () => {
    const long = 'word '.repeat(50);
    const excerpt = generateExcerpt(long, 20);
    expect(excerpt.length).toBeLessThanOrEqual(25); // 20 + '...'
    expect(excerpt).toMatch(/\.\.\.$/);
  });

  it('strips markdown headings', () => {
    expect(generateExcerpt('# Heading\nContent here')).toBe('Heading\nContent here');
  });

  it('strips markdown formatting', () => {
    expect(generateExcerpt('**bold** and *italic*')).toBe('bold and italic');
  });

  it('uses custom maxLength', () => {
    const text = 'a '.repeat(100);
    const excerpt = generateExcerpt(text, 10);
    expect(excerpt).toMatch(/\.\.\.$/);
  });
});

describe('formatDate', () => {
  it('formats ISO date string to zh-TW format', () => {
    const result = formatDate('2026-04-07T12:00:00.000Z');
    // Should contain year, month, day in Chinese format
    expect(result).toContain('2026');
    expect(result).toContain('4');
    expect(result).toContain('7');
  });
});

describe('defaultVisibility', () => {
  it('returns private for journal', () => {
    expect(defaultVisibility('journal')).toBe('private');
  });

  it('returns public for reading', () => {
    expect(defaultVisibility('reading')).toBe('public');
  });

  it('returns public for travel', () => {
    expect(defaultVisibility('travel')).toBe('public');
  });

  it('returns public for place', () => {
    expect(defaultVisibility('place')).toBe('public');
  });
});
