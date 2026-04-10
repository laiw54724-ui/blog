declare module 'cloudflare:workers' {
  export const env: {
    API_SERVICE?: { fetch: typeof fetch } | null
  }
}
