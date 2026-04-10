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
import { visit } from 'unist-util-visit';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import type { Root, Element, Text, Parent, RootContent, ElementContent } from 'hast';

// Configure the unified processor
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeHeadingAnchors)
  .use(rehypeCallouts)
  .use(rehypeFigureImages)
  .use(rehypeKatex)
  .use(rehypeHighlight, { detect: true, ignoreMissing: true })
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
    let content = markdown;
    if (content.startsWith('"') && content.endsWith('"')) {
      content = content.slice(1, -1);
    }

    content = normalizeMarkdownInput(content);

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

function normalizeMarkdownInput(markdown: string): string {
  let content = markdown
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ');

  // Decode literal escaped newlines if the whole payload was stringified once upstream.
  if (!content.includes('\n') && content.includes('\\n')) {
    content = content.replace(/\\n/g, '\n');
  }

  content = promoteStandaloneMath(content);

  return content.trim();
}

function promoteStandaloneMath(markdown: string): string {
  return markdown
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\s*>?\s*)\$(.+)\$\s*$/);
      if (!match) return line;

      const [, prefix, expression] = match;
      const trimmed = expression.trim();

      if (!trimmed || trimmed.includes('$')) return line;

      return `${prefix}$$${trimmed}$$`;
    })
    .join('\n');
}

function rehypeHeadingAnchors() {
  return (tree: Root) => {
    const usedIds = new Set<string>();

    visit(tree, 'element', (node: Element) => {
      if (!node.tagName || !/^h[1-6]$/.test(node.tagName)) return;
      if (!node.children?.length) return;

      const slugBase = slugifyHeading(extractNodeText(node));
      if (!slugBase) return;

      const slug = uniqueSlug(slugBase, usedIds);
      node.properties = { ...(node.properties ?? {}), id: slug };
      node.children.push({
        type: 'element',
        tagName: 'a',
        properties: {
          href: `#${slug}`,
          className: ['heading-anchor'],
          ariaHidden: 'true',
          tabIndex: -1,
        },
        children: [{ type: 'text', value: '#' }],
      });
    });
  };
}

function isElement(node: ElementContent | RootContent | undefined): node is Element {
  return Boolean(node && node.type === 'element');
}

function rehypeCallouts() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'blockquote' || !node.children?.length) return;

      const firstChild = node.children[0];
      if (!isElement(firstChild) || firstChild.tagName !== 'p' || !firstChild.children?.length) return;

      const firstTextNode = firstChild.children.find(
        (child): child is Text => child.type === 'text' && typeof child.value === 'string'
      );
      const rawText = firstTextNode?.value ?? '';
      const match = rawText.match(/^\[!(NOTE|TIP|INFO|WARN|WARNING|CAUTION)\]\s*/i);
      if (!match) return;

      const kind = match[1].toLowerCase() === 'warning' ? 'warn' : match[1].toLowerCase();
      const label = kind === 'warn' ? 'Warning' : kind.charAt(0).toUpperCase() + kind.slice(1);

      firstTextNode!.value = rawText.replace(match[0], '');
      if (!firstTextNode!.value?.trim()) {
        firstChild.children = firstChild.children.filter(
          (child: ElementContent) => child !== firstTextNode
        );
      }

      node.properties = {
        ...(node.properties ?? {}),
        className: ['callout', `callout-${kind}`],
      };

      node.children.unshift({
        type: 'element',
        tagName: 'div',
        properties: { className: ['callout-title'] },
        children: [{ type: 'text', value: label }],
      } as Element);
    });
  };
}

function rehypeFigureImages() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || node.tagName !== 'p' || !node.children?.length || typeof index !== 'number') return;
      if (node.children.length !== 1) return;
      const parentChildren = parent.children as RootContent[] | undefined;
      if (!parentChildren) return;

      const image = node.children[0];
      if (!isElement(image) || image.tagName !== 'img') return;

      const alt = typeof image.properties?.alt === 'string' ? image.properties.alt.trim() : '';
      if (!alt) return;

      parent.children = [
        ...parentChildren.slice(0, index),
        {
          type: 'element',
          tagName: 'figure',
          properties: { className: ['md-figure'] },
          children: [
            image,
            {
              type: 'element',
              tagName: 'figcaption',
              properties: { className: ['md-figcaption'] },
              children: [{ type: 'text', value: alt }],
            },
          ],
        },
        ...parentChildren.slice(index + 1),
      ] as RootContent[];
    });
  };
}

function extractNodeText(node: RootContent | Root): string {
  if (node.type === 'text') return node.value ?? '';
  if (!('children' in node) || !node.children?.length) return '';
  return node.children.map((child) => extractNodeText(child)).join(' ');
}

function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function uniqueSlug(base: string, used: Set<string>): string {
  let slug = base;
  let index = 2;
  while (used.has(slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }
  used.add(slug);
  return slug;
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
 * After stripping title, find the first paragraph that contains prose content
 * (skips paragraphs that are only lists, quotes, or headings)
 */
export function getFirstMeaningfulParagraph(content: string, maxLength?: number): string {
  if (!content) return '';

  // Split into paragraphs (double newlines)
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return '';

  // Find the first paragraph that contains meaningful prose content
  for (const para of paragraphs) {
    const lines = para.split(/\r?\n/).map((line) => line.trim());

    // Check if this paragraph is only structural (lists, quotes, headings)
    const isStructuralOnly = lines.every(line => {
      if (!line) return true; // empty lines are ok
      if (/^#{1,6}\s+/.test(line)) return true; // headings
      if (/^\s*[-*+]\s+/.test(line)) return true; // list items
      if (/^\s*\d+\.\s+/.test(line)) return true; // numbered lists
      if (/^\s*>\s?/.test(line)) return true; // quotes
      return false; // regular text
    });

    // Skip structural-only paragraphs
    if (isStructuralOnly) continue;

    let paragraph = '';

    for (const line of lines) {
      if (!line) break;
      if (/^#{1,6}\s+/.test(line)) {
        continue;
      }

      const normalized = line
        .replace(/^\s*[-*+]\s+/, '')
        .replace(/^\s*\d+\.\s+/, '')
        .replace(/^\s*>\s?/, '')
        .replace(/\*\*?(.+?)\*\*?/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .replace(/`{1,3}(.+?)`{1,3}/g, '$1')
        .replace(/[-*_~]{2,}/g, '')
        .trim();

      if (!normalized) continue;

      paragraph += (paragraph ? ' ' : '') + normalized;
      if (maxLength && paragraph.length >= maxLength) break;
    }

    paragraph = paragraph.trim();

    // If this paragraph has meaningful content, return it
    if (paragraph) {
      if (maxLength && paragraph.length > maxLength) {
        paragraph = paragraph.substring(0, maxLength).trim() + '...';
      }
      return paragraph;
    }
  }

  // If no meaningful paragraph found, return empty string
  return '';
}
