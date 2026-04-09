-- Migration v2: add entry_metrics, comments, comment_rate_limits

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

-- 留言節流表
CREATE TABLE IF NOT EXISTS comment_rate_limits (
  identifier TEXT PRIMARY KEY,
  last_comment_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comment_rate_limits_last_comment_at
  ON comment_rate_limits(last_comment_at);
