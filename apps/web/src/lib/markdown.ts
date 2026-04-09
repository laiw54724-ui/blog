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

import { marked } from 'marked';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
});

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

    // Use marked to render
    const html = await marked.parse(content);
    return html || '';
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

  // Remove markdown formatting for excerpt
  paragraph = paragraph
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*?(.+?)\*\*?/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/`{1,3}(.+?)`{1,3}/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[-*_~]/g, '')
    .trim();

  if (maxLength && paragraph.length > maxLength) {
    paragraph = paragraph.substring(0, maxLength).trim() + '...';
  }

  return paragraph;
}
