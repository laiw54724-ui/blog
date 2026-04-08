/**
 * Discord attachment handler
 * Downloads attachments from Discord CDN, determines type,
 * and either extracts text content or uploads to R2.
 *
 * Returns pendingAssets (not written to DB) so the caller can
 * persist them after the entry row exists.
 */

import { generateId } from '@personal-blog/shared'

interface DiscordAttachment {
  id: string
  filename: string
  size: number
  url: string
  content_type?: string
  width?: number
  height?: number
}

export interface PendingAsset {
  id: string
  storage_key: string
  kind: 'image' | 'cover' | 'attachment'
  mime_type: string
  width?: number
  height?: number
  alt_text?: string
  sort_order: number
}

export interface AttachmentResult {
  textContent?: string
  pendingAssets: PendingAsset[]
}

export interface ProcessAttachmentOptions {
  altText?: string
  coverMode?: 'auto' | 'yes' | 'no'
}

const TEXT_EXTENSIONS = new Set(['.md', '.txt', '.markdown'])
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(dot).toLowerCase() : ''
}

function isTextFile(attachment: DiscordAttachment): boolean {
  return TEXT_EXTENSIONS.has(getExtension(attachment.filename))
}

function isImageFile(attachment: DiscordAttachment): boolean {
  if (attachment.content_type && IMAGE_MIME_TYPES.has(attachment.content_type)) {
    return true
  }
  const ext = getExtension(attachment.filename)
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)
}

function getMimeType(attachment: DiscordAttachment): string {
  if (attachment.content_type) return attachment.content_type
  const ext = getExtension(attachment.filename)
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
  }
  return map[ext] || 'application/octet-stream'
}

function deriveAltText(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, '')
  return withoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[0-9a-f]{24,}/gi, '')
    .trim() || '圖片'
}

function resolveAssetKind(
  imageIndex: number,
  coverMode: 'auto' | 'yes' | 'no'
): 'cover' | 'image' {
  if (coverMode === 'no') return 'image'
  // 'auto' and 'yes' both treat first image as cover
  return imageIndex === 0 ? 'cover' : 'image'
}

/**
 * Process Discord attachments:
 * - .md/.txt → read content, return as textContent
 * - images → upload to R2, return as pendingAssets (NOT written to DB)
 */
export async function processAttachments(
  attachments: DiscordAttachment[],
  entryId: string,
  bucket: any, // R2Bucket
  options?: ProcessAttachmentOptions
): Promise<AttachmentResult> {
  const result: AttachmentResult = { pendingAssets: [] }
  let imageIndex = 0
  const coverMode = options?.coverMode || 'auto'

  for (const attachment of attachments) {
    const response = await fetch(attachment.url)
    if (!response.ok) {
      throw new Error(`ATTACHMENT_DOWNLOAD_FAILED:${attachment.filename}`)
    }

    if (isTextFile(attachment)) {
      try {
        result.textContent = await response.text()
      } catch {
        throw new Error(`ATTACHMENT_TEXT_READ_FAILED:${attachment.filename}`)
      }
      continue
    }

    if (!isImageFile(attachment)) {
      continue
    }

    const ext = getExtension(attachment.filename) || '.jpg'
    const storageKey = `entries/${entryId}/${generateId('img')}${ext}`
    const mimeType = getMimeType(attachment)
    const altText = options?.altText?.trim() || deriveAltText(attachment.filename)

    try {
      const bytes = await response.arrayBuffer()
      await bucket.put(storageKey, bytes, {
        httpMetadata: { contentType: mimeType },
      })
    } catch {
      throw new Error(`ATTACHMENT_UPLOAD_FAILED:${attachment.filename}`)
    }

    result.pendingAssets.push({
      id: generateId('asset'),
      storage_key: storageKey,
      kind: resolveAssetKind(imageIndex, coverMode),
      mime_type: mimeType,
      width: attachment.width,
      height: attachment.height,
      alt_text: altText,
      sort_order: imageIndex,
    })

    imageIndex += 1
  }

  return result
}
