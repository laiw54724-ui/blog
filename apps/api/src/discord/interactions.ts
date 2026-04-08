import type { Context } from 'hono'
import { verifyDiscordSignature } from './verify'
import { getCommandPreset, CHINESE_TO_ENGLISH_COMMAND_MAP } from './presets'
import { createEntryFromCommand } from './createEntry'
import { getEntryBySlug, updateEntry, archiveEntry, createAsset, generateId } from '@personal-blog/shared'
import { processAttachments } from './attachments'
import type { PendingAsset } from './attachments'

function normalizeSlug(input: string): string {
  const raw = input.trim()
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const url = new URL(raw)
      const parts = url.pathname.split('/').filter(Boolean)
      return decodeURIComponent(parts[parts.length - 1] || '').trim()
    }
  } catch {}
  return decodeURIComponent(raw).trim()
}

/**
 * Persist pending assets to D1 after the entry row exists.
 * Returns the cover asset ID if one was created.
 */
async function persistPendingAssets(
  db: any,
  entryId: string,
  assets: PendingAsset[]
): Promise<string | null> {
  let coverAssetId: string | null = null

  for (const asset of assets) {
    await createAsset(db, {
      id: asset.id,
      entry_id: entryId,
      kind: asset.kind,
      storage_key: asset.storage_key,
      mime_type: asset.mime_type,
      width: asset.width,
      height: asset.height,
      alt_text: asset.alt_text,
      sort_order: asset.sort_order,
    })

    if (asset.kind === 'cover' && !coverAssetId) {
      coverAssetId = asset.id
    }
  }

  return coverAssetId
}

/**
 * Update entry's cover_asset_id column
 */
async function setEntryCoverAsset(db: any, entryId: string, coverAssetId: string) {
  await db
    .prepare('UPDATE entries SET cover_asset_id = ? WHERE id = ?')
    .bind(coverAssetId, entryId)
    .run()
}

interface DiscordAttachmentResolved {
  id: string
  filename: string
  size: number
  url: string
  content_type?: string
  width?: number
  height?: number
}

interface DiscordInteractionData {
  name: string
  options?: Array<{
    name: string
    value: string
    type: number
  }>
  resolved?: {
    attachments?: Record<string, DiscordAttachmentResolved>
  }
}

interface DiscordUser {
  id: string
  username: string
}

interface DiscordInteractionPayload {
  type: number
  data?: DiscordInteractionData
  member?: {
    user: DiscordUser
  }
  user?: DiscordUser
  channel_id?: string
  guild_id?: string
}

export async function handleDiscordInteraction(c: Context) {
  const signature = c.req.header('x-signature-ed25519')
  const timestamp = c.req.header('x-signature-timestamp')

  if (!signature || !timestamp) {
    return c.json({ error: 'Missing signature headers' }, 401)
  }

  const body = await c.req.text()
  const isValid = await verifyDiscordSignature(
    signature,
    timestamp,
    body,
    c.env.DISCORD_PUBLIC_KEY
  )

  if (!isValid) {
    return c.json({ error: 'Invalid signature' }, 401)
  }

  const payload: DiscordInteractionPayload = JSON.parse(body)
  const db = c.env?.DB

  if (!db) {
    return c.json({ error: 'Database not configured' }, 500)
  }

  // Handle PING
  if (payload.type === 1) {
    return c.json({ type: 1 })
  }

  // Handle APPLICATION_COMMAND
  if (payload.type === 2) {
    const data = payload.data
    const user = payload.member?.user || payload.user

    if (!data || !user) {
      return c.json({ error: 'Invalid interaction data' }, 400)
    }

    const commandName = data.name
    // Convert Chinese command name to English key
    const commandKey = CHINESE_TO_ENGLISH_COMMAND_MAP[commandName] || commandName

    // --- Handle edit command ---
    if (commandKey === 'edit') {
      const slugOption = data.options?.find((opt: any) => opt.name === 'slug')
      const slug = slugOption?.value ? normalizeSlug(slugOption.value) : ''
      if (!slug) {
        return c.json({ type: 4, data: { content: '❌ 請提供文章的 slug' } })
      }

      try {
        const entry = await getEntryBySlug(db, slug)
        if (!entry) {
          return c.json({ type: 4, data: { content: `❌ 找不到 slug: ${slug}` } })
        }

        const fields: Record<string, string> = {}
        const titleOpt = data.options?.find((opt: any) => opt.name === 'title')
        const contentOpt = data.options?.find((opt: any) => opt.name === 'content')
        const statusOpt = data.options?.find((opt: any) => opt.name === 'status')
        const visibilityOpt = data.options?.find((opt: any) => opt.name === 'visibility')

        if (titleOpt?.value) fields.title = titleOpt.value
        if (contentOpt?.value) fields.content_markdown = contentOpt.value
        if (statusOpt?.value) fields.status = statusOpt.value
        if (visibilityOpt?.value) fields.visibility = visibilityOpt.value

        if (Object.keys(fields).length === 0) {
          return c.json({ type: 4, data: { content: '❌ 請提供至少一個要修改的欄位' } })
        }

        await updateEntry(db, (entry as any).id, fields)
        const changedFields = Object.keys(fields).join(', ')
        return c.json({
          type: 4,
          data: { content: `✅ 已更新「${(entry as any).title}」\n修改欄位: ${changedFields}` },
        })
      } catch (error) {
        console.error('Error editing entry:', error)
        return c.json({ type: 4, data: { content: '❌ 編輯失敗，請稍後重試' } })
      }
    }

    // --- Handle delete command ---
    if (commandKey === 'delete') {
      const slugOption = data.options?.find((opt: any) => opt.name === 'slug')
      const slug = slugOption?.value ? normalizeSlug(slugOption.value) : ''
      if (!slug) {
        return c.json({ type: 4, data: { content: '❌ 請提供文章的 slug' } })
      }

      try {
        const entry = await getEntryBySlug(db, slug)
        if (!entry) {
          return c.json({ type: 4, data: { content: `❌ 找不到 slug: ${slug}` } })
        }

        await archiveEntry(db, (entry as any).id)
        return c.json({
          type: 4,
          data: { content: `🗑️ 已封存「${(entry as any).title}」\n（狀態改為 archived，不會顯示在網站上）` },
        })
      } catch (error) {
        console.error('Error deleting entry:', error)
        return c.json({ type: 4, data: { content: '❌ 刪除失敗，請稍後重試' } })
      }
    }

    // --- Handle create commands (post, article, travel, reading) ---
    const preset = getCommandPreset(commandKey)

    if (!preset) {
      return c.json(
        {
          type: 4,
          data: { content: `❌ 未知指令: ${commandName}` },
        },
        400
      )
    }

    // Extract options
    const titleOption = data.options?.find((opt: any) => opt.name === 'title')
    const contentOption = data.options?.find((opt: any) => opt.name === 'content')
    const categoryOption =
      data.options?.find((opt: any) => opt.name === 'category') ||
      data.options?.find((opt: any) => opt.name === '分類')
    const altOption = data.options?.find((opt: any) => opt.name === 'alt')
    const coverOption = data.options?.find((opt: any) => opt.name === 'cover')

    const customTitle = titleOption?.value?.trim()
    let content = contentOption?.value || ''
    const selectedCategory = categoryOption?.value
    const altText = altOption?.value?.trim()
    const coverMode = (coverOption?.value || 'auto') as 'auto' | 'yes' | 'no'

    // Collect resolved attachments from Discord
    const resolvedAttachments = data.resolved?.attachments
      ? Object.values(data.resolved.attachments)
      : []

    // Pre-generate entry ID so R2 paths use the correct ID
    const preEntryId = generateId('entry')

    // If there's a file attachment, process it
    let attachmentResult: Awaited<ReturnType<typeof processAttachments>> | null = null
    if (resolvedAttachments.length > 0) {
      try {
        const bucket = (c.env as any)?.ASSETS_BUCKET
        if (!bucket) {
          return c.json({
            type: 4,
            data: { content: '❌ 檔案儲存未設定（R2 bucket 未綁定）' },
          })
        }

        attachmentResult = await processAttachments(
          resolvedAttachments,
          preEntryId,
          bucket,
          { altText, coverMode }
        )

        // If a .md/.txt file was uploaded, use its content
        if (attachmentResult.textContent) {
          content = attachmentResult.textContent
        }
      } catch (error) {
        console.error('Error processing attachments:', error)
        const errMsg = error instanceof Error ? error.message : ''
        return c.json({
          type: 4,
          data: { content: `❌ 檔案處理失敗：${errMsg || '請稍後重試'}` },
        })
      }
    }

    if (!content || content.trim().length === 0) {
      return c.json({
        type: 4,
        data: { content: '❌ 請提供內容（輸入文字或上傳 .md/.txt 檔案）' },
      })
    }

    try {
      const result = await createEntryFromCommand(db, {
        preset,
        content: content.trim(),
        title: customTitle,
        selectedCategory,
        entryId: preEntryId,
      })

      // Build response message
      let message = result.message

      // Persist assets after entry row exists
      if (result.success && result.entry_id && attachmentResult?.pendingAssets?.length) {
        try {
          const coverAssetId = await persistPendingAssets(
            db,
            result.entry_id,
            attachmentResult.pendingAssets
          )

          if (coverAssetId) {
            await setEntryCoverAsset(db, result.entry_id, coverAssetId)
          }

          message += `\n🖼️ 已掛載 ${attachmentResult.pendingAssets.length} 張圖片`
          if (altText) {
            message += `\n🔤 圖片替代文字已設定`
          }
        } catch (error) {
          console.error('Error persisting assets:', error)
          message += '\n⚠️ 內文已建立，但圖片掛載到資料庫時失敗'
        }
      }

      if (attachmentResult?.textContent) {
        message += `\n📄 內容已從上傳的檔案匯入`
      }

      return c.json({
        type: 4,
        data: { content: message },
      })
    } catch (error) {
      console.error('Error handling command:', error)
      return c.json({
        type: 4,
        data: { content: '❌ 建立失敗，請稍後重試' },
      })
    }
  }

  return c.json({ error: 'Unhandled interaction type' }, 400)
}
