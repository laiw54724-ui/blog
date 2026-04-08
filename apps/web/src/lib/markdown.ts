/**
 * Markdown rendering layer for the web frontend
 * Centralized markdown to HTML conversion
 */

import { marked } from 'marked'

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
})

/**
 * Render markdown content to HTML
 * Handles both Chinese and English content
 */
export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  if (!markdown || typeof markdown !== 'string') {
    return ''
  }

  try {
    // Remove quotes if the markdown was double-encoded
    let content = markdown
    if (content.startsWith('"') && content.endsWith('"')) {
      content = content.slice(1, -1)
    }

    // Use marked to render
    const html = await marked.parse(content)
    return html || ''
  } catch (error) {
    console.error('Error rendering markdown:', error)
    // Fallback to escaped HTML
    return escapeHtml(markdown)
  }
}

/**
 * Escape HTML special characters
 * Fallback when markdown rendering fails
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Extract plain text from markdown
 * Useful for excerpts and previews
 */
export function extractPlainText(markdown: string, maxLength?: number): string {
  if (!markdown || typeof markdown !== 'string') {
    return ''
  }

  // Remove markdown syntax and get plain text
  let text = markdown
    .replace(/^#+\s+/gm, '') // Remove headers
    .replace(/\*\*?(.+?)\*\*?/g, '$1') // Remove bold/italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
    .replace(/`+(.+?)`+/g, '$1') // Remove code blocks
    .replace(/[-*_~]/g, '') // Remove other markdown chars

  // Limit length if specified
  if (maxLength && text.length > maxLength) {
    text = text.substring(0, maxLength).trim() + '...'
  }

  return text
}
