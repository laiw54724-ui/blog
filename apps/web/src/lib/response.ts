/**
 * Response cache header management for SSR pages
 * Cloudflare respects s-maxage for edge caching
 */

export type CacheType = 'stream' | 'articles' | 'detail' | 'private';

/**
 * Apply cache headers based on page type
 *
 * - stream: 30s edge cache + 2min stale-while-revalidate (最新感最重要)
 * - articles: 5min edge cache + 30min stale (列表頁較穩定)
 * - detail: 10min edge cache + 1hour stale (詳細頁長期穩定)
 * - private: no-store (私密內容不快取)
 */
export function applyPageCacheHeaders(
  response: { headers: Headers } | Response,
  type: CacheType
): { headers: Headers } | Response {
  switch (type) {
    case 'stream':
      // 動態流 - 短快取，保持新鮮度
      response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
      break;

    case 'articles':
      // 文章列表 - 中快取
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
      break;

    case 'detail':
      // 詳細頁 - 長快取（讀多寫少）
      response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
      break;

    case 'private':
      // 私密頁面 - 不快取
      response.headers.set('Cache-Control', 'private, no-store');
      break;
  }

  return response;
}

/**
 * Get cache strategy description for debugging
 */
export function getCacheStrategyDescription(type: CacheType): string {
  const strategies: Record<CacheType, string> = {
    stream: '短快取 (30s CDN + 2min 過期後仍可用)',
    articles: '中快取 (5min CDN + 30min 過期後仍可用)',
    detail: '長快取 (10min CDN + 1hour 過期後仍可用)',
    private: '無快取 (每次都新鮮)',
  };
  return strategies[type];
}
