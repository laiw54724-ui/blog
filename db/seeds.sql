-- Seed data for development

INSERT OR IGNORE INTO tags (id, name, slug) VALUES
  ('tag_coffee', '咖啡', 'coffee'),
  ('tag_travel', '旅行', 'travel'),
  ('tag_reading', '閱讀', 'reading'),
  ('tag_tokyo', '東京', 'tokyo'),
  ('tag_kyoto', '京都', 'kyoto');

INSERT OR IGNORE INTO entries (id, slug, entry_type, category, status, visibility, title, content_markdown, excerpt) VALUES
  ('entry_demo_post_1', 'demo-post-1', 'post', 'place', 'published', 'public', NULL,
   '今天喝了一家很棒的咖啡廳，環境安靜，適合工作。#咖啡 #台北',
   '今天喝了一家很棒的咖啡廳，環境安靜，適合工作。'),

  ('entry_demo_article_1', 'demo-article-1', 'article', 'travel', 'published', 'public',
   '京都三天兩夜：寺廟與咖啡的奇妙旅程',
   '# 京都三天兩夜

第一天抵達京都，先去了金閣寺。人很多，但還是很美。

第二天去了嵐山，竹林裡意外安靜，推薦早上去。

第三天流連在錦市場，吃了各種小吃。',
   '京都三天兩夜的旅行記錄，從金閣寺到嵐山竹林。');

INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES
  ('entry_demo_post_1', 'tag_coffee'),
  ('entry_demo_article_1', 'tag_travel'),
  ('entry_demo_article_1', 'tag_kyoto');

INSERT OR IGNORE INTO entry_metrics (entry_id, view_count, clap_count, comment_count) VALUES
  ('entry_demo_post_1', 12, 2, 0),
  ('entry_demo_article_1', 48, 7, 1);

INSERT OR IGNORE INTO reading_entries (
  id,
  slug,
  title,
  author,
  genre,
  medium,
  read_status,
  work_status,
  score,
  read_at,
  short_review,
  detail_review,
  blurb,
  tags,
  links,
  has_detail,
  source,
  created_at,
  updated_at
) VALUES
  (
    'reading_demo_1',
    'demo-reading-1',
    '昨日的美食',
    '吉永史',
    'gen',
    'manga',
    'completed',
    'finished',
    8.8,
    '2026-04-01',
    '節奏很穩，人物關係寫得細，讀完會想慢慢回味。',
    '這部作品最厲害的地方不是情節反轉，而是它總能用很日常的餐桌場景，把人物真正想說卻說不出口的事慢慢帶出來。',
    '一部以飲食與人際關係推進情感的作品。',
    '["reading","food","slice-of-life"]',
    '[{"label":"出版社","url":"https://example.com/demo-reading-1"}]',
    1,
    'manual',
    '2026-04-01T10:00:00.000Z',
    '2026-04-01T10:00:00.000Z'
  ),
  (
    'reading_demo_2',
    'demo-reading-2',
    '海邊的卡夫卡',
    '村上春樹',
    'gen',
    'novel',
    'ongoing',
    'finished',
    7.9,
    '2026-04-06',
    '還在讀，但氛圍感很強，段落之間有一種奇怪的牽引力。',
    '',
    '一部帶有寓言感與夢境感的長篇小說。',
    '["reading","novel"]',
    '[]',
    0,
    'manual',
    '2026-04-06T10:00:00.000Z',
    '2026-04-06T10:00:00.000Z'
  );
