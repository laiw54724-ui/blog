/**
 * Unified data access layer for the frontend
 * Provides centralized fetching, error handling, and caching
 */

import type { Entry, ResolvedCoverAsset, EntryMetrics, Asset, CommentThread } from '@personal-blog/shared';

// API_BASE uses PUBLIC_API_URL environment variable (set at build time)
const API_BASE =
  import.meta.env.PUBLIC_API_URL ||
  'https://personal-blog-api.personal-blog.workers.dev';

/**
 * Service binding for Worker-to-Worker communication.
 * Set by middleware when running on Cloudflare Workers.
 * Falls back to regular fetch when not available (local dev).
 */
let _apiService: { fetch: typeof fetch } | null = null;

export function setApiService(service: { fetch: typeof fetch } | null): void {
  _apiService = service;
}

/** Fetch from the API, using service binding when available */
async function apiFetch(path: string): Promise<Response> {
  if (_apiService) {
    try {
      // Use service binding first (avoids Worker-to-Worker DNS routing issues)
      const response = await _apiService.fetch(new Request(`https://api-internal${path}`));

      // Some deployed service-binding combinations can incorrectly return 404 for valid API routes.
      // Fall back to the public API URL so the site still renders instead of going blank.
      if (response.status !== 404) {
        return response;
      }

      console.warn(`Service binding returned 404 for ${path}, falling back to PUBLIC_API_URL`);
    } catch (error) {
      console.warn(`Service binding failed for ${path}, falling back to PUBLIC_API_URL`, error);
    }
  }
  // Fall back to regular fetch (local dev / non-Cloudflare)
  return fetch(`${API_BASE}${path}`);
}

/**
 * Simple in-memory cache for Astro build time
 * TTL-based expiration to prevent stale data
 * Different endpoints have different cache durations
 */
const cache = new Map<string, { data: unknown; timestamp: number }>();

// TTL based on endpoint type (in milliseconds)
const CACHE_TTLS: Record<string, number> = {
  'posts:all': 30 * 1000, // /stream: 30 seconds
  'articles:all': 300 * 1000, // /articles: 5 minutes
  'entries:category': 300 * 1000, // category pages: 5 minutes
  'entry:detail': 600 * 1000, // detail pages: 10 minutes
};

function getCacheTTL(key: string): number {
  // Extract category from key (e.g., "entries:category:travel" -> "entries:category")
  const prefix = Object.keys(CACHE_TTLS).find((p) => key.startsWith(p));
  return prefix ? CACHE_TTLS[prefix] : 300 * 1000; // default 5 minutes
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  const ttl = getCacheTTL(key);
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache(): void {
  cache.clear();
}

/**
 * Get all posts (貼文) - visible publicly
 */
export async function getPosts(): Promise<Entry[]> {
  const cacheKey = 'posts:all';
  const cached = getCached<Entry[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiFetch('/api/entries?type=post&visibility=public');
    if (!response.ok) {
      console.error('Failed to fetch posts:', response.statusText);
      return [];
    }
    const { data } = await response.json();
    setCache(cacheKey, data || []);
    return data || [];
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

/**
 * Get all articles (文章) - visible publicly
 */
export async function getArticles(): Promise<Entry[]> {
  const cacheKey = 'articles:all';
  const cached = getCached<Entry[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiFetch('/api/entries?type=article&visibility=public');
    if (!response.ok) {
      console.error('Failed to fetch articles:', response.statusText);
      return [];
    }
    const { data } = await response.json();
    setCache(cacheKey, data || []);
    return data || [];
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

/**
 * Get entry by slug with type inference
 */
export async function getEntryBySlug(slug: string): Promise<Entry | null> {
  const cacheKey = `entry:detail:${slug}`;
  const cached = getCached<Entry>(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiFetch(`/api/entries/slug/${slug}`);
    if (!response.ok) {
      console.error(`Entry not found: ${slug}`);
      return null;
    }
    const { data } = await response.json();
    if (data) {
      setCache(cacheKey, data);
    }
    return data || null;
  } catch (error) {
    console.error(`Error fetching entry ${slug}:`, error);
    return null;
  }
}

/**
 * Get entries by category
 */
export async function getEntriesByCategory(category: string): Promise<Entry[]> {
  const cacheKey = `entries:category:${category}`;
  const cached = getCached<Entry[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiFetch(
      `/api/entries?category=${encodeURIComponent(category)}&visibility=public`
    );
    if (!response.ok) {
      console.error(`Failed to fetch entries for category ${category}:`, response.statusText);
      return [];
    }
    const { data } = await response.json();
    setCache(cacheKey, data || []);
    return data || [];
  } catch (error) {
    console.error(`Error fetching entries for category ${category}:`, error);
    return [];
  }
}

/**
 * Get entries by type
 */
export async function getEntriesByType(type: 'post' | 'article'): Promise<Entry[]> {
  const cacheKey = `entries:type:${type}`;
  const cached = getCached<Entry[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiFetch(`/api/entries?type=${type}&visibility=public`);
    if (!response.ok) {
      console.error(`Failed to fetch entries of type ${type}:`, response.statusText);
      return [];
    }
    const { data } = await response.json();
    setCache(cacheKey, data || []);
    return data || [];
  } catch (error) {
    console.error(`Error fetching entries of type ${type}:`, error);
    return [];
  }
}

/**
 * Get static paths for dynamic routes
 * Used in getStaticPaths() to generate all possible route combinations
 */
export async function getAllPostPaths() {
  const posts = await getPosts();
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { slug: post.slug },
  }));
}

export async function getAllArticlePaths() {
  const articles = await getArticles();
  return articles.map((article) => ({
    params: { slug: article.slug },
    props: { slug: article.slug },
  }));
}

/**
 * Get all unique categories
 */
export async function getAllCategories(): Promise<string[]> {
  const cacheKey = 'categories:all';
  const cached = getCached<string[]>(cacheKey);
  if (cached) return cached;

  try {
    const posts = await getPosts();
    const articles = await getArticles();
    const allEntries = [...posts, ...articles];
    const categorySet = new Set(allEntries.map((e) => e.category).filter(Boolean));
    const categories = Array.from(categorySet);
    setCache(cacheKey, categories);
    return categories;
  } catch (error) {
    console.error('Error getting all categories:', error);
    return [];
  }
}

/**
 * Get entries for a specific category with fallback to generic type
 */
export async function getCategoryEntries(category: string): Promise<Entry[]> {
  try {
    const entries = await getEntriesByCategory(category);
    return entries.length > 0 ? entries : []; // Fallback to empty if no entries found
  } catch (error) {
    console.error(`Error getting entries for category ${category}:`, error);
    return [];
  }
}

/**
 * Get assets for an entry by entry ID
 */
export async function getAssetsByEntryId(entryId: string): Promise<Asset[]> {
  try {
    const response = await apiFetch(`/api/entries/${entryId}/assets`);
    if (!response.ok) return [];
    const { data } = await response.json();
    return data || [];
  } catch (error) {
    console.error(`Error fetching assets for entry ${entryId}:`, error);
    return [];
  }
}

/**
 * Get resolved cover assets for multiple entries, keyed by entry ID
 */
export async function getResolvedCoverAssetsMap(
  entryIds: string[]
): Promise<Record<string, ResolvedCoverAsset>> {
  if (entryIds.length === 0) return {};

  try {
    const response = await apiFetch(`/api/entries/assets?ids=${entryIds.join(',')}`);
    if (!response.ok) return {};

    const { data } = await response.json();
    const assetsMap = (data ?? {}) as Record<string, Asset[]>;
    const coverMap: Record<string, ResolvedCoverAsset> = {};

    for (const [entryId, assets] of Object.entries(assetsMap)) {
      const cover = assets.find((asset) => asset.kind === 'cover');
      if (cover) {
        coverMap[entryId] = { ...cover, resolved_for_entry_id: entryId };
      }
    }

    return coverMap;
  } catch {
    return {};
  }
}

/**
 * Get entry metrics for multiple entries, keyed by entry ID.
 * Uses batch endpoint to avoid N+1 requests.
 */
export async function getEntryMetricsMap(
  entryIds: string[]
): Promise<Record<string, EntryMetrics>> {
  if (entryIds.length === 0) return {};

  try {
    const response = await apiFetch(`/api/entries/metrics?ids=${entryIds.join(',')}`);
    if (!response.ok) return {};
    const { data } = await response.json();
    return (data as Record<string, EntryMetrics>) ?? {};
  } catch {
    return {};
  }
}

/**
 * Get metrics for a single entry
 */
export async function getEntryMetrics(entryId: string): Promise<{ view_count: number; clap_count: number; comment_count: number }> {
  try {
    const response = await apiFetch(`/api/entries/${entryId}/metrics`);
    if (!response.ok) return { view_count: 0, clap_count: 0, comment_count: 0 };
    const { data } = await response.json();
    return data ?? { view_count: 0, clap_count: 0, comment_count: 0 };
  } catch {
    return { view_count: 0, clap_count: 0, comment_count: 0 };
  }
}

/**
 * Get comments for a single entry
 */
export async function getEntryComments(entryId: string): Promise<CommentThread[]> {
  try {
    const response = await apiFetch(`/api/entries/${entryId}/comments`);
    if (!response.ok) return [];
    const { data } = await response.json();
    return data ?? [];
  } catch {
    return [];
  }
}

export interface UserProfile {
  name: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
  links: Array<{ label: string; url: string }>;
}

/**
 * Get the site owner's profile
 */
export async function getProfile(): Promise<UserProfile> {
  const cacheKey = 'profile';
  const cached = getCached<UserProfile>(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiFetch('/api/profile');
    if (!response.ok) throw new Error('Profile fetch failed');
    const data = await response.json();
    const profile = data as UserProfile;
    setCache(cacheKey, profile);
    return profile;
  } catch {
    return { name: 'life', bio: '', avatar_url: null, banner_url: null, links: [] };
  }
}

export { clearCache };
