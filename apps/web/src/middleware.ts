import type { MiddlewareHandler } from 'astro'
import { setApiService } from './lib/data'

type ApiService = {
  fetch: typeof fetch
}

type RuntimeLocals = {
  runtime?: {
    env?: {
      API?: ApiService
    }
  }
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const locals = context.locals as RuntimeLocals
  setApiService(locals.runtime?.env?.API ?? null)
  return next()
}