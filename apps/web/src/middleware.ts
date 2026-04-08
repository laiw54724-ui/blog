// This middleware is intentionally minimal.
// Note: Cloudflare Pages doesn't support `cloudflare:workers` import.
export const onRequest = async (_context: any, next: any) => {
  return next()
}
