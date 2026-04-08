-- Database indices for query optimization
-- These indices optimize the most frequently used queries in the SSR application

-- 1. Fast lookup by slug (used for detail pages: /post/[slug], /article/[slug])
CREATE INDEX IF NOT EXISTS idx_entries_slug ON entries(slug);

-- 2. Fast filtering by type and visibility with date sorting
-- (used for /stream, /articles, /post, /article pages)
CREATE INDEX IF NOT EXISTS idx_entries_type_visibility_created 
  ON entries(entry_type, visibility, created_at DESC);

-- 3. Fast filtering by category with date sorting
-- (used for /[category] page and category filtering)
CREATE INDEX IF NOT EXISTS idx_entries_category_created 
  ON entries(category, created_at DESC);

-- 4. Status and visibility filtering (for admin views, optional)
CREATE INDEX IF NOT EXISTS idx_entries_status_visibility 
  ON entries(status, visibility);

-- 5. Archive queries (content that's been archived)
CREATE INDEX IF NOT EXISTS idx_entries_status_created
  ON entries(status, created_at DESC);
