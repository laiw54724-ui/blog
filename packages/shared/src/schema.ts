import { z } from 'zod'

export const EntryTypeSchema = z.enum(['post', 'article'])
export const CategorySchema = z.enum(['journal', 'reading', 'travel', 'place'])
export const EntryStatusSchema = z.enum(['inbox', 'draft', 'published', 'private', 'archived'])
export const VisibilitySchema = z.enum(['private', 'unlisted', 'public'])

export const CreateEntrySchema = z.object({
  entry_type: EntryTypeSchema,
  category: CategorySchema,
  content_markdown: z.string().min(1),
  title: z.string().optional(),
  visibility: VisibilitySchema.optional(),
  tags: z.array(z.string()).optional(),
  // place / travel
  place_name: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  visited_at: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  revisit: z.number().int().optional(),
  // reading
  book_title: z.string().optional(),
  book_author: z.string().optional(),
  // journal
  mood: z.string().optional(),
  // discord source
  source_message_id: z.string().optional(),
  source_channel_id: z.string().optional(),
  source_guild_id: z.string().optional(),
})

export const UpdateEntrySchema = z.object({
  title: z.string().optional(),
  content_markdown: z.string().min(1).optional(),
  category: CategorySchema.optional(),
  status: EntryStatusSchema.optional(),
  visibility: VisibilitySchema.optional(),
  tags: z.array(z.string()).optional(),
  excerpt: z.string().optional(),
})

export const PromoteEntrySchema = z.object({
  title: z.string().optional(),
  merge_entry_ids: z.array(z.string()).optional(),
})

export type CreateEntryInput = z.infer<typeof CreateEntrySchema>
export type UpdateEntryInput = z.infer<typeof UpdateEntrySchema>
export type PromoteEntryInput = z.infer<typeof PromoteEntrySchema>
