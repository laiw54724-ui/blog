import type { Context } from 'hono'
import { verifyDiscordSignature } from './verify'
import { COMMAND_PRESETS, getCommandPreset, CHINESE_TO_ENGLISH_COMMAND_MAP } from './presets'
import { createEntryFromCommand } from './createEntry'
import { getEntryBySlug, updateEntry, archiveEntry } from '@personal-blog/shared'

interface DiscordInteractionData {
  name: string
  options?: Array<{
    name: string
    value: string
    type: number
  }>
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
      const slug = slugOption?.value?.trim()
      if (!slug) {
        return c.json({ type: 4, data: { content: '❌ 請提供文章的 slug' } })
      }

      try {
        // Find entry by slug (no visibility filter — allow editing any own entry)
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
      const slug = slugOption?.value?.trim()
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

    // Extract content from command options
    const contentOption = data.options?.find((opt: any) => opt.name === 'content')
    const categoryOption = data.options?.find((opt: any) => opt.name === 'category')
    const content = contentOption?.value || ''
    const selectedCategory = categoryOption?.value

    if (!content || content.trim().length === 0) {
      return c.json({
        type: 4,
        data: { content: '❌ 請提供內容' },
      })
    }

    try {
      const result = await createEntryFromCommand(db, {
        preset,
        content: content.trim(),
        selectedCategory,
      })

      return c.json({
        type: 4,
        data: { content: result.message },
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
