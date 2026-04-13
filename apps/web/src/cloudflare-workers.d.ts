declare module 'cloudflare:workers' {
  export const env: {
    API_SERVICE?: { fetch: typeof fetch } | null
    LOCKED_TAG_SLUGS?: string
    CONTENT_LOCK_PASSWORD?: string
  }
}
