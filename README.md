# 個人雙河道網站

這是一個以 Discord 為收件匣、以自架網站為閱讀器的個人出版系統。內容分成兩條河道：

- `Stream`：承接日常短記、書摘、旅途中即時感想
- `Articles`：承接整理過的長文、評論、旅記、讀書心得

目前專案已經是可開發、可驗證的 monorepo，而不只是概念稿。

## 目前狀態

### 已完成

- Astro 網站與 Cloudflare Web runtime 整合
- Cloudflare Worker API 與 Discord interaction webhook
- D1 為主的 `entries` / `reading_entries` / comments / profile / assets 資料模型
- 公開頁面：
  - `/` — 首頁 hero + 最新貼文 / 文章
  - `/about` — 個人頁（banner / avatar / bio / feed）
  - `/stream` — 貼文河道（load more，每次 10 筆）
  - `/articles` — 文章列表 + 系列入口 + 熱門標籤
  - `/reading` — 閱讀清單列表（排序 / 篩選 / client-side filter）
  - `/reading/[slug]` — 閱讀詳頁（短評 / 文案 / 詳細心得）
  - `/search` — 全文搜尋，支援 `q` / `type` 過濾
  - `/tags` — 結構標籤 / 自由標籤探索
  - `/tags/[slug]` — 依標籤聚合，貼文 + 文章都顯示
  - `/series/[slug]` — 四個系列入口（journal / works / reviews / play），`reviews` 可帶入有完整心得的閱讀條目
  - `/c/[category]` — 分類頁
  - `/post/[slug]` — 貼文詳頁（Markdown / 圖片 gallery / 留言）
  - `/article/[slug]` — 文章詳頁（Markdown + KaTeX / 上下篇導覽 / 可套用內容上鎖）
  - `/rss.xml` — RSS 2.0 feed（貼文 + 文章合併，最新 50 筆）
  - `/sitemap.xml` — XML sitemap
- API 路由：
  - `POST /api/discord/interactions`
  - `GET /api/health`
  - `GET /api/entries`、`GET /api/entries/search`
  - `GET /api/entries/slug/:slug`
  - `GET /api/entries/:id`、`PUT`、`DELETE`、`DELETE /hard`
  - `GET /api/entries/:id/tags`
  - `GET /api/entries/:id/assets`、`/metrics`、`/comments`
  - `GET /api/entries/metrics`（批次）、`/assets`（批次）
  - `POST /api/entries/:id/clap`、`/view`、`/comments`
  - `GET /api/reading`、`GET /api/reading/:slug`
  - `POST /api/reading`、`PATCH /api/reading/:id`
  - `GET /api/profile`、`PUT`、`POST /avatar`、`POST /banner`
  - `GET /api/tags`、`GET /api/tags/:slug/entries`
  - `GET /api/assets/*`
- UI / UX：
  - Dark mode（跟隨系統）
  - Noto Serif TC 字型（文章閱讀頁）
  - Desktop navbar active state
  - Mobile 浮動 MENU 按鈕 + 回頂部
  - 閱讀進度條（post / article 詳頁）
  - locked tag policy：可用 tag 隱藏閱讀 / 文章內容，輸入密碼後解鎖
  - og:image / canonical / RSS autodiscovery link
- shared package：types / schema / db helpers / utils
- Discord 建立 / 管理：
  - `/動態`：feed-style modal，不再要求標題欄
  - `/讀了`：支援 `score`、`read_at`、`tags`、`lock_mode`
  - `/補心得`：可預填編輯 `score` / `read_at` / `short_review` / `blurb` / `detail_review`
  - `/書單`：可選單管理閱讀條目，支援 `編輯 / 心得 / 刪除 / 上鎖模式`
- 工程驗證：
  - `npm run lint` — 0 errors
  - `npm test` — 167 tests passed
  - `npm run check:node` — 版本一致性檢查
  - `apps/api` typecheck 可通過
  - `apps/web` typecheck 需要在可正常啟動 Cloudflare / Vite plugin 的 Node 22 環境下執行

### 尚未完成或仍在規劃

- `/admin` — 單作者輕後台（草稿管理、狀態篩選）
- `/map` — 地點 / 旅行地圖瀏覽
- reading 頁 product 化（URL 化篩選 / 空狀態 / 錯誤狀態 / server-side filter）
- locked tag policy 擴充到更多入口（搜尋 / 系列頁 / 其他詳頁）
- 貼文升格文章的完整流程
- AI 流程與 provider 抽象

## 技術棧

- Frontend: Astro
- API / Bot: Cloudflare Workers + Hono
- Database: Cloudflare D1
- Assets: Cloudflare R2
- Shared layer: TypeScript + workspace package
- Testing: Vitest
- Lint / formatting: ESLint + Prettier

## 專案結構

```txt
apps/
  api/        Cloudflare Worker API + Discord webhook
  web/        Astro site
packages/
  shared/     shared types / schema / db helpers / utils
db/
  schema.sql
  migrate-*.sql
  seeds.sql
docs/
  architecture.md
  routes.md
```

## 開發需求

- Node `22.12.0+`
- npm `9+`

專案內已提供：

- [.nvmrc](/Users/wen/Documents/dev/blog/.nvmrc)
- [.node-version](/Users/wen/Documents/dev/blog/.node-version)

如果你使用 `fnm`：

```bash
eval "$(fnm env --shell zsh)"
fnm use 22.12.0
```

如果 `fnm current` 已經是 `v22.12.0`，但 `node -v` 還是 `v20.x`，表示目前 shell 沒有載入 `fnm env`。
請把下面這行加到 `~/.zshrc`，然後重開終端機：

```bash
eval "$(fnm env --shell zsh)"
```

專案也提供一個快速檢查：

```bash
npm run check:node
```

## 常用指令

```bash
npm install
npm run dev:api
npm run dev:web
npm run lint
npm test
npm run typecheck
```

## 開發原則

- 先收，再整理
- 同內容雙生命週期
- 預設安全
- 手機優先
- AI 可開關，但不是前提

## 相關文件

- [SETUP.md](/Users/wen/Documents/dev/blog/SETUP.md)
- [docs/README.md](/Users/wen/Documents/dev/blog/docs/README.md)
- [docs/routes.md](/Users/wen/Documents/dev/blog/docs/routes.md)
- [docs/architecture.md](/Users/wen/Documents/dev/blog/docs/architecture.md)
