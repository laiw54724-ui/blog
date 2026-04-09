/**
 * Render a minimal safe markdown subset for comments
 * Supports:
 * - **bold**
 * - *italic*
 * - `code`
 * - line breaks
 *
 * Deliberately does NOT support raw HTML, images, links, or block-level markdown.
 */
export function renderCommentMarkdownSafe(input: string): string {
  const source = (input || '').replace(/\r\n?/g, '\n');
  if (!source) return '';

  let html = escapeHtml(source);

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * Markdown rendering layer for the web frontend
 * Centralized markdown to HTML conversion
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

// Configure the unified processor
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeKatex)
  .use(rehypeHighlight)
  .use(rehypeStringify);

/**
 * Render markdown content to HTML
 * Handles both Chinese and English content
 */
export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  try {
    // Remove quotes if the markdown was double-encoded
    let content = markdown;
    if (content.startsWith('"') && content.endsWith('"')) {
      content = content.slice(1, -1);
    }

    // Use unified processor to render
    const file = await processor.process(content);
    return String(file);
  } catch (error) {
    console.error('Error rendering markdown:', error);
    // Fallback to escaped HTML
    return escapeHtml(markdown);
  }
}

/**
 * Escape HTML special characters
 * Fallback when markdown rendering fails
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Extract plain text from markdown
 * Useful for excerpts and previews
 */
export function extractPlainText(markdown: string, maxLength?: number): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Remove markdown syntax and get plain text
  let text = markdown
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*?(.+?)\*\*?/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/`{1,3}(.+?)`{1,3}/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[-*_~]/g, '')
    .replace(/\n{2,}/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  // Limit length if specified
  if (maxLength && text.length > maxLength) {
    text = text.substring(0, maxLength).trim() + '...';
  }

  return text;
}

/**
 * Extract the first H1 heading text from markdown content
 */
export function extractH1Title(markdown: string): string | null {
  if (!markdown) return null;
  const lines = markdown.split('\n');
  for (const line of lines.slice(0, 10)) {
    const m = line.match(/^#\s+(.+)$/);
    if (m) return m[1].trim();
    if (line.trim()) break; // stop at first non-empty non-H1 line
  }
  return null;
}

/**
 * Remove the first H1 line (and any immediately following blank lines) from markdown.
 * Used so the rendered HTML doesn't duplicate the <h1> shown in the page header.
 */
export function stripFirstH1(markdown: string): string {
  if (!markdown) return '';
  const lines = markdown.split('\n');
  // Skip leading blank lines
  let start = 0;
  while (start < lines.length && !lines[start].trim()) start++;
  // If the first content line is an H1, strip it + following blank lines
  if (start < lines.length && /^#\s/.test(lines[start])) {
    let end = start + 1;
    while (end < lines.length && !lines[end].trim()) end++;
    return lines.slice(end).join('\n');
  }
  return markdown;
}

/**
 * Strip leading markdown title from content
 * Removes the first # title line if it matches the provided title
 */
export function stripLeadingMarkdownTitle(content: string, title?: string): string {
  if (!content) return '';

  const lines = content.split('\n');
  if (lines.length === 0) return content;

  const firstLine = lines[0].trim();
  if (firstLine.startsWith('# ')) {
    const extractedTitle = firstLine.substring(2).trim();
    if (!title || extractedTitle === title) {
      // Remove the title line and any following empty lines
      let startIndex = 1;
      while (startIndex < lines.length && lines[startIndex].trim() === '') {
        startIndex++;
      }
      return lines.slice(startIndex).join('\n');
    }
  }

  return content;
}

/**
 * Get the first meaningful paragraph from markdown content
 * After stripping title, find the first non-empty paragraph
 */
export function getFirstMeaningfulParagraph(content: string, maxLength?: number): string {
  if (!content) return '';

  // Split into paragraphs (double newlines)
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return '';

  let paragraph = paragraphs[0];

  // Preserve list and quote markers in plain text excerpt
  paragraph = paragraph
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*?(.+?)\*\*?/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/`{1,3}(.+?)`{1,3}/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '1. ')
    .replace(/^\s*>\s?/gm, '「')
    .replace(/[-*_~]{2,}/g, '')
    .trim();

  if (maxLength && paragraph.length > maxLength) {
    paragraph = paragraph.substring(0, maxLength).trim() + '...';
  }

  return paragraph;
}
