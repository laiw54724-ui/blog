-- User profile table (single row, id = 1)
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'life',
  bio TEXT DEFAULT '',
  avatar_key TEXT DEFAULT NULL,
  banner_key TEXT DEFAULT NULL,
  links_json TEXT DEFAULT '[]',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ensure the default row exists
INSERT OR IGNORE INTO user_profile (id, name, bio) VALUES (1, 'life', '');
