export type EntryType = 'post' | 'article'

export type Category = 'journal' | 'reading' | 'travel' | 'place'

export type EntryStatus = 'inbox' | 'draft' | 'published' | 'private' | 'archived'

export type Visibility = 'private' | 'unlisted' | 'public'

export type RelationType = 'derived_from' | 'related' | 'same_trip' | 'same_book' | 'same_place'

export interface Entry {
  id: string
  slug: string | null
  entry_type: EntryType
  category: Category
  status: EntryStatus
  visibility: Visibility

  title: string | null
  content_markdown: string
  excerpt: string | null

  source: string
  source_message_id: string | null
  source_channel_id: string | null
  source_guild_id: string | null

  parent_entry_id: string | null
  cover_asset_id: string | null

  created_at: string
  updated_at: string
  published_at: string | null

  // place / travel
  place_name: string | null
  city: string | null
  country: string | null
  address_text: string | null
  latitude: number | null
  longitude: number | null
  visited_at: string | null
  rating: number | null
  revisit: number
  price_level: number | null

  // reading
  book_title: string | null
  book_author: string | null
  book_isbn: string | null

  // journal
  mood: string | null
  weather: string | null

  // AI
  ai_enabled: number
  ai_summary: string | null
  ai_title_suggestion: string | null
  ai_metadata_json: string | null
}

export interface Tag {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Asset {
  id: string
  entry_id: string | null
  kind: 'image' | 'cover' | 'attachment'
  storage_key: string
  mime_type: string | null
  width: number | null
  height: number | null
  alt_text: string | null
  sort_order: number
  created_at: string
}

export interface EntryRelation {
  id: string
  from_entry_id: string
  to_entry_id: string
  relation_type: RelationType
  created_at: string
}

export interface EntryWithTags extends Entry {
  tags: Tag[]
}
