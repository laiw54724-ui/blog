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
