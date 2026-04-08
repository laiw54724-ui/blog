import { defineMiddleware } from 'astro:middleware'
import { setApiService } from './lib/data'

export const onRequest = defineMiddleware(async (_context, next) => {
  try {
    // Dynamic import to avoid build-time errors
    const { env } = await import('cloudflare:workers')
    const cfEnv = env as any
    if (cfEnv?.API_SERVICE) {
      setApiService(cfEnv.API_SERVICE)
    }
  } catch {
    // Not running on Cloudflare (local dev) — use public DNS fallback
  }
  return next()
})
