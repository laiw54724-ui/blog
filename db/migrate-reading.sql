-- Migration: add reading_entries table
-- Run against Cloudflare D1:
--   wrangler d1 execute personal-blog-db --file=db/migrate-reading.sql --remote

CREATE TABLE IF NOT EXISTS reading_entries (
  id            TEXT PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  author        TEXT,
  alt_title     TEXT,
  genre         TEXT NOT NULL CHECK(genre IN ('bl', 'bg', 'gl', 'gen')),
  medium        TEXT NOT NULL DEFAULT 'novel'
                  CHECK(medium IN ('novel', 'comic', 'manhwa', 'manga', 'webtoon', 'drama')),
  read_status   TEXT NOT NULL
                  CHECK(read_status IN ('completed', 'ongoing', 'dropped')),
  work_status   TEXT NOT NULL DEFAULT 'unknown'
                  CHECK(work_status IN ('finished', 'serializing', 'unknown')),
  score         REAL CHECK(score IS NULL OR (score >= 0 AND score <= 10)),
  read_at       TEXT,          -- YYYY-MM-DD
  short_review  TEXT,
  detail_review TEXT,          -- Markdown; sets has_detail = 1 when present
  blurb         TEXT,          -- 文案/簡介 (from publisher)
  tags          TEXT NOT NULL DEFAULT '[]',   -- JSON string[]
  links         TEXT NOT NULL DEFAULT '[]',   -- JSON {label,url}[]
  has_detail    INTEGER NOT NULL DEFAULT 0,   -- 0 = stub, 1 = full review
  source        TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'discord'
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reading_genre      ON reading_entries(genre);
CREATE INDEX IF NOT EXISTS idx_reading_read_status ON reading_entries(read_status);
CREATE INDEX IF NOT EXISTS idx_reading_score      ON reading_entries(score DESC);
CREATE INDEX IF NOT EXISTS idx_reading_read_at    ON reading_entries(read_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_created_at ON reading_entries(created_at DESC);
