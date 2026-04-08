/**
 * @deprecated Use src/lib/data.ts instead
 * This file is kept for backward compatibility only
 * All functionality has been merged into data.ts with caching support
 */

import type { Entry } from '@personal-blog/shared'

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787'

export async function getEntries(options?: {
  type?: string
  category?: string
  limit?: number
  offset?: number
}): Promise<Entry[]> {
  const params = new URLSearchParams()
  if (options?.type) params.append('type', options.type)
  if (options?.category) params.append('category', options.category)
  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.offset) params.append('offset', options.offset.toString())
  params.append('visibility', 'public')

  const response = await fetch(`${API_BASE}/api/entries?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch entries')
  }
  const data = await response.json()
  return data.data || []
}

export async function getEntryBySlug(slug: string): Promise<Entry | null> {
  try {
    const response = await fetch(`${API_BASE}/api/entries/slug/${slug}`)
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    return data.data || null
  } catch {
    return null
  }
}

export async function getEntriesByCategory(
  category: string,
  limit?: number
): Promise<Entry[]> {
  return getEntries({ category, limit })
}

export async function getPosts(limit?: number): Promise<Entry[]> {
  return getEntries({ type: 'post', limit })
}

export async function getArticles(limit?: number): Promise<Entry[]> {
  return getEntries({ type: 'article', limit })
}
