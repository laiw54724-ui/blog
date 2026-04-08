/**
 * Discord attachment handler
 * Downloads attachments from Discord CDN, determines type,
 * and either extracts text content or uploads to R2.
 */

import { generateId, createAsset } from '@personal-blog/shared'

interface DiscordAttachment {
  id: string
  filename: string
  size: number
  url: string
  content_type?: string
  width?: number
  height?: number
}

interface AttachmentResult {
  /** If the attachment was a .md/.txt file, this contains the text content */
  textContent?: string
  /** Created asset records for image attachments */
  assets: Array<{
    id: string
    storage_key: string
    kind: 'image' | 'cover' | 'attachment'
    mime_type: string
    width?: number
    height?: number
  }>
}

const TEXT_EXTENSIONS = new Set(['.md', '.txt', '.markdown'])
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
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
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.md': 'text/markdown', '.txt': 'text/plain',
  }
  return map[ext] || 'application/octet-stream'
}

/**
 * Process Discord attachments:
 * - .md/.txt → read content, return as textContent
 * - images → upload to R2, create asset records
 */
export async function processAttachments(
  attachments: DiscordAttachment[],
  entryId: string,
  bucket: R2Bucket,
  db: any
): Promise<AttachmentResult> {
  const result: AttachmentResult = { assets: [] }
  let imageIndex = 0

  for (const attachment of attachments) {
    // Download from Discord CDN
    const response = await fetch(attachment.url)
    if (!response.ok) {
      console.error(`Failed to download attachment: ${attachment.filename}`)
      continue
    }

    if (isTextFile(attachment)) {
      // Text file → extract content
      result.textContent = await response.text()
    } else if (isImageFile(attachment)) {
      // Image → upload to R2
      const ext = getExtension(attachment.filename) || '.jpg'
      const storageKey = `entries/${entryId}/${generateId('img')}${ext}`
      const mimeType = getMimeType(attachment)

      await bucket.put(storageKey, response.body, {
        httpMetadata: { contentType: mimeType },
      })

      const assetId = generateId('asset')
      const kind = imageIndex === 0 ? 'cover' : 'image'

      await createAsset(db, {
        id: assetId,
        entry_id: entryId,
        kind,
        storage_key: storageKey,
        mime_type: mimeType,
        width: attachment.width,
        height: attachment.height,
        sort_order: imageIndex,
      })

      result.assets.push({
        id: assetId,
        storage_key: storageKey,
        kind,
        mime_type: mimeType,
        width: attachment.width,
        height: attachment.height,
      })

      imageIndex++
    }
  }

  return result
}
