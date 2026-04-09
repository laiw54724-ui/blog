/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'cloudflare:workers' {
  export const env: {
    API_SERVICE?: { fetch: typeof fetch } | null
  }
}
