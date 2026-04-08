PRAGMA foreign_keys = ON;

-- 主內容表：post / article 兩種河道共用
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,

  entry_type TEXT NOT NULL CHECK (entry_type IN ('post', 'article')),
  category TEXT NOT NULL CHECK (category IN ('journal', 'reading', 'travel', 'place')),
  status TEXT NOT NULL CHECK (status IN ('inbox', 'draft', 'published', 'private', 'archived')) DEFAULT 'draft',
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'unlisted', 'public')) DEFAULT 'private',

  title TEXT,
  content_markdown TEXT NOT NULL,
  excerpt TEXT,

  source TEXT NOT NULL DEFAULT 'discord',
  source_message_id TEXT,
  source_channel_id TEXT,
  source_guild_id TEXT,

  parent_entry_id TEXT,
  cover_asset_id TEXT,

  -- 通用時間
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT,

  -- 餐廳 / 旅遊 / 地點資訊
  place_name TEXT,
  city TEXT,
  country TEXT,
  address_text TEXT,
  latitude REAL,
  longitude REAL,
  visited_at TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  revisit INTEGER NOT NULL DEFAULT 0,
  price_level INTEGER CHECK (price_level >= 1 AND price_level <= 4),

  -- 讀書資訊
  book_title TEXT,
  book_author TEXT,
  book_isbn TEXT,

  -- 日記資訊
  mood TEXT,
  weather TEXT,

  -- AI
  ai_enabled INTEGER NOT NULL DEFAULT 1,
  ai_summary TEXT,
  ai_title_suggestion TEXT,
  ai_metadata_json TEXT,

  FOREIGN KEY (parent_entry_id) REFERENCES entries(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_type_status_published
  ON entries(entry_type, status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_category_status_published
  ON entries(category, status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_city_category
  ON entries(city, category);

CREATE INDEX IF NOT EXISTS idx_entries_source_message
  ON entries(source_message_id);

-- 標籤
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (entry_id, tag_id),
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entry_tags_tag_id ON entry_tags(tag_id);

-- 資產：圖片、封面、附件
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  entry_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'cover', 'attachment')),
  storage_key TEXT NOT NULL,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assets_entry_id ON assets(entry_id);

-- 內容關聯：用於「升格成文章」與旅程群組
CREATE TABLE IF NOT EXISTS entry_relations (
  id TEXT PRIMARY KEY,
  from_entry_id TEXT NOT NULL,
  to_entry_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('derived_from', 'related', 'same_trip', 'same_book', 'same_place')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_entry_id) REFERENCES entries(id) ON DELETE CASCADE,
  FOREIGN KEY (to_entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_relations_from ON entry_relations(from_entry_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_relations_to ON entry_relations(to_entry_id, relation_type);

-- Discord 收件與互動事件，用來做除錯與去重
CREATE TABLE IF NOT EXISTS ingest_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'discord',
  provider_event_id TEXT,
  event_type TEXT NOT NULL,
  raw_payload_json TEXT NOT NULL,
  handled_at TEXT,
  created_entry_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_entry_id) REFERENCES entries(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ingest_provider_event ON ingest_events(provider, provider_event_id);

-- 互動統計：觀看 / 拍手 / 留言數
CREATE TABLE IF NOT EXISTS entry_metrics (
  entry_id TEXT PRIMARY KEY,
  view_count INTEGER NOT NULL DEFAULT 0,
  clap_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TEXT,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entry_metrics_last_viewed
  ON entry_metrics(last_viewed_at);

-- 留言板
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  parent_id TEXT,
  author_name TEXT NOT NULL DEFAULT '匿名',
  body_markdown TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible'
    CHECK (status IN ('visible', 'hidden', 'deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_entry_created
  ON comments(entry_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_status
  ON comments(status);

-- 留言最小防 spam：節流表
CREATE TABLE IF NOT EXISTS comment_rate_limits (
  identifier TEXT PRIMARY KEY,
  last_comment_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comment_rate_limits_last_comment_at
  ON comment_rate_limits(last_comment_at);

-- 輕量系統設定
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('site_title', 'My Personal Garden'),
  ('ai_enabled_default', '1'),
  ('default_post_visibility', 'public'),
  ('default_article_visibility', 'public'),
  ('default_journal_visibility', 'private');
