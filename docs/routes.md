# 路由與模組切分

## 1. Public Web Routes

### `/`
首頁
- 最新動態 6 則
- 最新文章 6 篇
- 4 大分類入口

### `/stream`
動態河道
- 依 `entry_type = post`
- 依 `published_at DESC`
- 支援 category filter

### `/articles`
文章河道
- 依 `entry_type = article`
- 支援 category tabs

### `/journal`
日記索引

### `/reading`
讀書索引

### `/travel`
旅行索引

### `/places`
餐廳 / 咖啡 / 地點索引
- 支援城市篩選
- 支援評分篩選

### `/map`
地圖模式
- 顯示有座標的 travel / place entries

### `/tags/[slug]`
tag 主題頁

### `/entry/[slug]`
單篇內容頁
- 可渲染貼文或文章
- 根據 category 套不同版型

### `/search`
搜尋頁
- 初期可用 D1 LIKE + tag 匹配
- 後期可升級全文搜尋

### `/rss.xml`
公開內容 RSS

### `/sitemap.xml`
站點地圖

---

## 2. API Routes

### `POST /api/discord/interactions`
接收 Discord interactions。

### `GET /api/health`
健康檢查。

### `POST /api/entries`
內部建立 entry。

### `PATCH /api/entries/:id`
更新分類、標題、公開狀態。

### `POST /api/entries/:id/promote`
把貼文升格成文章。

### `POST /api/entries/:id/re-run-ai`
重跑 AI。

### `POST /api/assets/upload`
簽名上傳圖片到 R2。

---

## 3. 模組切分

## `apps/api`

### `src/index.ts`
Worker 入口。

### `src/discord/`
- verify signature
- command handlers
- message command handlers
- component/button handlers

### `src/services/`
- entry service
- publish service
- ai service
- tag service
- relation service

### `src/db/`
- D1 query layer
- migrations

### `src/lib/`
- slugify
- markdown utils
- visibility rules

---

## `apps/web`

### `src/pages/`
- index.astro
- stream.astro
- articles.astro
- journal.astro
- reading.astro
- travel.astro
- places.astro
- map.astro
- tags/[slug].astro
- entry/[slug].astro

### `src/components/`
- PostCard.astro
- ArticleCard.astro
- EntryLayout.astro
- PlaceMeta.astro
- ReadingMeta.astro
- TravelMeta.astro
- MobileTabBar.astro

### `src/layouts/`
- BaseLayout.astro
- ArticleLayout.astro
- StreamLayout.astro

### `src/lib/`
- api client
- date formatting
- grouping helpers

---

## 4. 第一批最值得先做的頁面

1. `/`
2. `/stream`
3. `/articles`
4. `/entry/[slug]`
5. `POST /api/discord/interactions`
6. `POST /api/entries/:id/promote`

這 6 個做好，就能跑完整 MVP。

