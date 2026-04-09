import type { MiddlewareHandler } from 'astro';
import { env } from 'cloudflare:workers';
import { setApiService } from './lib/data';

export const onRequest: MiddlewareHandler = async (_context, next) => {
  const apiService = (env as any)?.API_SERVICE ?? null;
  setApiService(apiService);
  return next();
};
