/**
 * @deprecated Use interactions.ts + presets.ts + createEntry.ts instead
 * This file contains the old Discord command handling logic
 * All functionality has been consolidated into the new modular pipeline
 * 
 * Old handlers:
 * - handlePostCommand() -> now in interactions.ts + presets.ts
 * - handleArticleCommand() -> now in interactions.ts + presets.ts
 * - handleTravelCommand() -> now in interactions.ts + presets.ts
 * - handleReadingCommand() -> now in interactions.ts + presets.ts
 * 
 * New pipeline:
 * interactions.ts -> presets.ts -> createEntry.ts
 */

import type { Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { generateId, slugify, generateExcerpt, createEntry } from '@personal-blog/shared'

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

interface DiscordInteractionPayloadMeta {
  channel_id?: string
  guild_id?: string
}

function getOption(data: DiscordInteractionData, name: string) {
  return data.options?.find((opt) => opt.name === name)?.value
}

export async function handlePostCommand(
  c: Context,
  db: D1Database,
  data: DiscordInteractionData,
  user: DiscordUser,
  meta?: DiscordInteractionPayloadMeta
) {
  try {
    const content = getOption(data, 'content')
    const category = getOption(data, 'category') || 'journal'

    if (!content) {
      return c.json({
        type: 4,
        data: {
          content: '❌ 請提供內容',
          flags: 64,
        },
      })
    }

    const title = content.split('\n')[0].substring(0, 100) || '未命名貼文'
    const excerpt = generateExcerpt(content, 150)
    const entryId = generateId('entry')
    const slug = slugify(title)

    await createEntry(db, {
      id: entryId,
      slug,
      entry_type: 'post',
      category,
      title,
      content_markdown: content,
      excerpt,
      status: 'published',
      visibility: 'public',
      source: 'discord',
      source_channel_id: meta?.channel_id,
      source_guild_id: meta?.guild_id,
    })

    return c.json({
      type: 4,
      data: {
        embeds: [
          {
            title: '✅ 貼文已保存',
            description: title,
            fields: [
              { name: '類型', value: 'Post', inline: true },
              { name: '分類', value: category, inline: true },
              { name: '狀態', value: 'Published', inline: true },
              { name: '摘要', value: excerpt, inline: false },
            ],
            color: 0x00ff00,
          },
        ],
      },
    })
  } catch (error) {
    console.error('Error handling post command:', error)
    return c.json({
      type: 4,
      data: {
        content: '❌ 保存失敗，請稍後重試',
        flags: 64,
      },
    })
  }
}

export async function handleArticleCommand(
  c: Context,
  db: D1Database,
  data: DiscordInteractionData,
  user: DiscordUser,
  meta?: DiscordInteractionPayloadMeta
) {
  try {
    const content = getOption(data, 'content')
    const category = getOption(data, 'category') || 'journal'

    if (!content) {
      return c.json({
        type: 4,
        data: {
          content: '❌ 請提供內容',
          flags: 64,
        },
      })
    }

    const title = content.split('\n')[0].substring(0, 100) || '未命名文章'
    const excerpt = generateExcerpt(content, 150)
    const entryId = generateId('entry')
    const slug = slugify(title)

    await createEntry(db, {
      id: entryId,
      slug,
      entry_type: 'article',
      category,
      title,
      content_markdown: content,
      excerpt,
      status: 'draft',
      visibility: 'private',
      source: 'discord',
      source_channel_id: meta?.channel_id,
      source_guild_id: meta?.guild_id,
    })

    return c.json({
      type: 4,
      data: {
        embeds: [
          {
            title: '✅ 文章草稿已保存',
            description: title,
            fields: [
              { name: '類型', value: 'Article', inline: true },
              { name: '分類', value: category, inline: true },
              { name: '狀態', value: 'Draft', inline: true },
              { name: '摘要', value: excerpt, inline: false },
            ],
            color: 0x0099ff,
          },
        ],
      },
    })
  } catch (error) {
    console.error('Error handling article command:', error)
    return c.json({
      type: 4,
      data: {
        content: '❌ 保存失敗，請稍後重試',
        flags: 64,
      },
    })
  }
}
