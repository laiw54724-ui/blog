import { env } from 'cloudflare:workers';
import { normalizeTagInput } from '@personal-blog/shared';

export const CONTENT_LOCK_COOKIE = 'content_lock';

export function getLockedTagSlugs(): string[] {
  const raw = env.LOCKED_TAG_SLUGS || '';
  if (!raw.trim()) return [];

  return Array.from(
    new Set(
      raw
        .split(/[,\s]+/u)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => normalizeTagInput(tag).slug)
    )
  );
}

export function getContentLockPassword(): string {
  return env.CONTENT_LOCK_PASSWORD || '';
}

export function isLockedTag(tag: string): boolean {
  const normalized = normalizeTagInput(tag).slug;
  return getLockedTagSlugs().includes(normalized);
}

export function filterUnlockedTagSummaries<T extends { slug: string }>(tags: T[]): T[] {
  const locked = new Set(getLockedTagSlugs());
  return tags.filter((tag) => !locked.has(normalizeTagInput(tag.slug).slug));
}

export function hasLockedTags(tags: string[]): boolean {
  const locked = new Set(getLockedTagSlugs());
  return tags.some((tag) => locked.has(normalizeTagInput(tag).slug));
}

export function hasUnlockedCookie(cookieValue: string | undefined): boolean {
  const password = getContentLockPassword();
  if (!password) return false;
  return cookieValue === password;
}
