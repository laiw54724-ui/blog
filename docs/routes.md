# 路由與模組切分

這份文件記錄目前 repo 內**已實作**與**明確規劃中**的路由與模組。

## 已實作 Web Routes

### `/`

- 首頁 hero（標題 + bio + CTA）
- 貼文 / 文章數量統計卡
- 最新貼文（4 筆）
- 最新文章（4 筆）

### `/about`

- 個人頁（banner / avatar / bio / 外部連結）
- 最近 feed（貼文 + 文章合流，依日期分組）

### `/stream`

- 貼文河道
- 使用 `PostFeedCard`（社群風格：avatar + date + 圖片）
- 前 10 筆顯示，「載入更多」每次展開 10 筆

### `/articles`

- 文章列表頁
- 上方系列入口（series grid）
- 文章索引列表（全部文章）
- 右欄：熱門標籤（structured / free 分流）

### `/search`

- 支援 `?q=` 全文搜尋（title / content_markdown / excerpt）
- 支援 `?type=post|article` 過濾
- 無關鍵字時顯示熱門標籤（structured / free 分組）
- 空結果有明確 fallback 提示

### `/c/[category]`

支援分類：`journal` / `reading` / `travel` / `place`

### `/tags`

- 結構標籤 / 自由標籤分流瀏覽
- 無標籤時顯示 empty state

### `/tags/[slug]`

- 依 tag 聚合，**貼文 + 文章都顯示**（不限 type）
- 標示結構標籤或自由標籤及其所屬群組
- 側欄顯示相關標籤
- 無內容時顯示 empty state

### `/series/[slug]`

已實作四個系列入口：`journal` / `works` / `reviews` / `play`

- 頁內 tag 快速過濾
- 三段 fallback：tag slugs → fallback category → 全部文章
- 非法 slug redirect 到 `/articles`（不 500）

### `/post/[slug]`

- 貼文詳頁
- Markdown 渲染（GFM + 數學式 + code highlight）
- 圖片 gallery（最多 4 張，FB 網格風格）
- 閱讀進度條
- 留言板
- Clap / view / comment 指標

### `/article/[slug]`

- 文章詳頁
- Markdown + KaTeX + code highlighting
- Noto Serif TC 字型（閱讀排版）
- 閱讀進度條
- Reader controls（字型大小）
- 上一篇 / 下一篇導覽
- 封面圖 + 附圖 gallery

### `/rss.xml`

- RSS 2.0 feed
- 貼文 + 文章合併，最新 50 筆
- 瀏覽器 autodiscovery（BaseLayout 加 `<link rel="alternate">`）

### `/sitemap.xml`

- 靜態路由 + 動態 article / post URL
- 含 `lastmod` / `changefreq` / `priority`

## 規劃中 Web Routes

### `/map`

- 地點 / 旅行內容的地圖瀏覽

### `/admin/*`

- 單作者輕後台（草稿管理、狀態篩選）
- **需先決定 auth 策略再實作**（Cloudflare Access / HTTP Basic / Discord 驗證）

## 已實作 API Routes

### 健康檢查

- `GET /api/health`

### Discord

- `POST /api/discord/interactions`

### Entries

- `GET /api/entries`（支援 type / category / status / visibility / limit / offset）
- `GET /api/entries/metrics`（批次，`?ids=`）
- `GET /api/entries/assets`（批次，`?ids=`）
- `GET /api/entries/search`（`?q=` / `limit`）
- `GET /api/entries/slug/:slug`
- `GET /api/entries/:id`
- `GET /api/entries/:id/assets`
- `GET /api/entries/:id/metrics`
- `PUT /api/entries/:id`
- `DELETE /api/entries/:id`（軟刪除）
- `DELETE /api/entries/:id/hard`
- `POST /api/entries/:id/clap`
- `POST /api/entries/:id/view`

### Comments

- `GET /api/entries/:id/comments`
- `POST /api/entries/:id/comments`

### Profile

- `GET /api/profile`
- `PUT /api/profile`
- `POST /api/profile/avatar`
- `POST /api/profile/banner`

### Tags

- `GET /api/tags`（`?type=` / `limit`）
- `GET /api/tags/:slug/entries`（`?type=` / `category` / `limit`）

### Assets

- `GET /api/assets/*`

## 規劃中 API Routes

- `POST /api/entries`（直接從 web 建立，非 Discord）
- `POST /api/assets/upload`
- admin 專用 metadata / image ordering API

## apps/api 模組

### 入口

- [index.ts](../apps/api/src/index.ts)

### 路由

- [entries.ts](../apps/api/src/routes/entries.ts)
- [comments.ts](../apps/api/src/routes/comments.ts)
- [profile.ts](../apps/api/src/routes/profile.ts)
- [tags.ts](../apps/api/src/routes/tags.ts)

### Discord

- [interactions.ts](../apps/api/src/discord/interactions.ts)
- [presets.ts](../apps/api/src/discord/presets.ts)
- [createEntry.ts](../apps/api/src/discord/createEntry.ts)
- [handlers/create.ts](../apps/api/src/discord/handlers/create.ts)
- [handlers/modal.ts](../apps/api/src/discord/handlers/modal.ts)
- [handlers/list.ts](../apps/api/src/discord/handlers/list.ts)
- [handlers/component.ts](../apps/api/src/discord/handlers/component.ts)

## apps/web 模組

### pages

- [index.astro](../apps/web/src/pages/index.astro)
- [about.astro](../apps/web/src/pages/about.astro)
- [stream.astro](../apps/web/src/pages/stream.astro)
- [articles.astro](../apps/web/src/pages/articles.astro)
- [search.astro](../apps/web/src/pages/search.astro)
- [tags.astro](../apps/web/src/pages/tags.astro)
- [c/[category].astro](../apps/web/src/pages/c/[category].astro)
- [tags/[slug].astro](../apps/web/src/pages/tags/[slug].astro)
- [series/[slug].astro](../apps/web/src/pages/series/[slug].astro)
- [post/[slug].astro](../apps/web/src/pages/post/[slug].astro)
- [article/[slug].astro](../apps/web/src/pages/article/[slug].astro)
- [rss.xml.ts](../apps/web/src/pages/rss.xml.ts)
- [sitemap.xml.ts](../apps/web/src/pages/sitemap.xml.ts)

### components

- [EntryCard.astro](../apps/web/src/components/EntryCard.astro) — 通用卡片（compact / list 變體）
- [PostFeedCard.astro](../apps/web/src/components/PostFeedCard.astro) — 社群風格貼文卡
- [ReadingProgress.astro](../apps/web/src/components/ReadingProgress.astro) — 閱讀進度條
- [ReaderControls.astro](../apps/web/src/components/ReaderControls.astro) — 字型大小控制
- [CommentBoard.astro](../apps/web/src/components/CommentBoard.astro) — 留言板
- [EntryEngagement.astro](../apps/web/src/components/EntryEngagement.astro) — Clap / view 互動

## 下一批優先項目

1. `/admin` — 單作者輕後台（需先決定 auth）
2. Discord 建立流程補欄位（visibility / tags / 是否公開）
3. 貼文升格文章完整流程
4. `/map`
