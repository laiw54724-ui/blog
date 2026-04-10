import '../.astro/types.d.ts'

export {}

declare global {
  interface ImportMetaEnv {
    readonly PUBLIC_API_URL?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}
