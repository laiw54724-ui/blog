/**
 * Convert a string to a URL-safe slug.
 * Handles CJK characters by keeping them as-is.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate a random ID with a prefix, e.g. "entry_abc123"
 */
export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}${rand}`;
}

/**
 * Extract #hashtags from content text.
 */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#([\p{L}\p{N}_]+)/gu) ?? [];
  return matches.map((t) => t.slice(1).toLowerCase());
}

/**
 * Generate excerpt from content
 */
export function generateExcerpt(content: string, maxLength: number = 150): string {
  const text = content
    .replace(/^#+\s+/gm, '') // Remove markdown headings
    .replace(/[*_`]/g, '') // Remove markdown formatting
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

/**
 * Format date for display (Traditional Chinese)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Return default visibility based on category.
 * Supports: 'private' (不公開), 'unlisted' (只有連結可看), 'public' (完全公開)
 */
export function defaultVisibility(category: string): 'private' | 'unlisted' | 'public' {
  return category === 'journal' ? 'private' : 'public';
}

/**
 * @deprecated Use apps/web/src/lib/markdown.ts instead
 * Markdown rendering should only be done in the web layer
 * This function is kept for backward compatibility only
 *
 * In web components, import and use:
 * import { renderMarkdownToHtml } from '../lib/markdown'
 * const html = await renderMarkdownToHtml(content)
 */
export function markdownToHtml(markdown: string): string {
  // Lazy import to avoid issues in environments where marked isn't available
  let marked: any;
  try {
    marked = require('marked');
  } catch {
    // Fallback: basic markdown conversion for environments without marked
    return markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  const { Marked } = marked;
  const instance = new Marked({
    breaks: true,
    gfm: true,
  });

  return instance.parse(markdown) as string;
}
