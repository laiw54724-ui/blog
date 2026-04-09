# 路由與模組切分

這份文件區分「已實作」與「規劃中」，避免規劃稿和現況混在一起。

## 已實作 Web Routes

### `/`

首頁

- 最新動態
- 最新文章
- 分類入口

### `/about`

關於頁

### `/stream`

動態河道

- 以貼文為主
- 文章會以系統通知形式穿插

### `/articles`

文章列表

### `/c/[category]`

分類列表頁

- 支援 `journal`
- 支援 `reading`
- 支援 `travel`
- 支援 `place`

### `/post/[slug]`

貼文詳頁

- 內文渲染
- 圖片 gallery
- 留言
- clap / view metrics

### `/article/[slug]`

文章詳頁

- markdown 渲染
- cover image / 內文圖片
- reader controls

## 規劃中 Web Routes

### `/search`

搜尋頁

### `/tags/[slug]`

tag 主題頁

### `/map`

地圖模式

### `/rss.xml`

RSS feed

### `/sitemap.xml`

站點地圖

## 已實作 API Routes

### 健康檢查

- `GET /api/health`

### Discord

- `POST /api/discord/interactions`

### Entries

- `GET /api/entries`
- `GET /api/entries/metrics`
- `GET /api/entries/slug/:slug`
- `GET /api/entries/:id`
- `GET /api/entries/:id/assets`
- `GET /api/entries/:id/metrics`
- `GET /api/entries/:id/comments`
- `PUT /api/entries/:id`
- `DELETE /api/entries/:id`
- `DELETE /api/entries/:id/hard`
- `POST /api/entries/:id/clap`
- `POST /api/entries/:id/view`
- `POST /api/entries/:id/comments`
- `GET /api/entries/search`

### Profile

- `GET /api/profile`
- `PUT /api/profile`
- `POST /api/profile/avatar`
- `POST /api/profile/banner`

## 規劃中 API Routes

- `POST /api/entries`
- `POST /api/entries/:id/promote`
- `POST /api/entries/:id/re-run-ai`
- `POST /api/assets/upload`

## apps/api 模組現況

### `src/index.ts`

Worker 入口與 route 掛載

### `src/routes/`

- `entries.ts`
- `comments.ts`
- `profile.ts`

### `src/discord/`

- `verify.ts`
- `interactions.ts`
- `presets.ts`
- `createEntry.ts`
- `attachments.ts`
- `handlers/create.ts`
- `handlers/modal.ts`
- `handlers/list.ts`
- `handlers/component.ts`

## apps/web 模組現況

### `src/pages/`

- `index.astro`
- `about.astro`
- `stream.astro`
- `articles.astro`
- `c/[category].astro`
- `post/[slug].astro`
- `article/[slug].astro`

### `src/components/`

- `EntryCard.astro`
- `PostFeedCard.astro`
- `SystemNoticeCard.astro`
- `ReaderControls.astro`
- `CommentBoard.astro`
- `EntryEngagement.astro`

### `src/layouts/`

- `BaseLayout.astro`

### `src/lib/`

- `data.ts`
- `presenters.ts`
- `feed.ts`
- `markdown.ts`
- `response.ts`

## 下一批值得做的頁面

1. `/search`
2. `/tags/[slug]`
3. `/map`
4. RSS / sitemap
5. promote article flow
