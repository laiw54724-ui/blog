# 個人雙河道網站架構

## 產品定位

這是一個以 **Discord 為內容入口**、以 **自架網站為閱讀介面** 的個人出版系統。

核心是雙河道：

- **動態河道 / Stream**
  - 承接短內容、日常、片段、快速記錄
- **文章河道 / Articles**
  - 承接整理過的長文、評論、心得與可回頭翻找的內容

## 當前架構

```mermaid
flowchart TD
  A["Discord Slash Commands"] --> B["Cloudflare Worker API"]
  A2["Discord Attachments"] --> B
  B --> C["D1 (entries / reading_entries / tags / comments / metrics / profile)"]
  B --> D["R2 (images / profile assets)"]
  C --> E["Astro Web"]
  D --> E
  E --> F["/stream"]
  E --> G["/articles"]
  E --> G2["/reading"]
  E --> H["/search"]
  E --> I["/c/[category]"]
  E --> J["/tags/[slug]"]
```

## Repo 分層

- `apps/api`
  - Cloudflare Worker API
  - Discord interactions
- `apps/web`
  - Astro 閱讀站
- `packages/shared`
  - types / schema / db utilities / common utils
- `db`
  - schema / seeds / indices

## 目前資料模型

### 內容主體 `entries`

目前已存在的核心欄位：

- `entry_type`
  - `post | article`
- `category`
  - `journal | reading | travel | place`
- `status`
  - `inbox | draft | published | private | archived`
- `visibility`
  - `private | unlisted | public`
- `title`
- `content_markdown`
- `excerpt`
- `cover_asset_id`

### 閱讀主體 `reading_entries`

目前閱讀清單與心得另用一張表承接，欄位重點是：

- `title`
- `author`
- `genre`
- `medium`
- `read_status`
- `score`
- `read_at`
- `short_review`
- `detail_review`
- `tags`（目前為 JSON 字串）
- `has_detail`

### 補充資料

- `tags`
- `entry_tags`
- `assets`
- `entry_metrics`
- `comments`
- `user_profile`

## 目前真的已落地的內容流程

### 1. Discord 建立內容

- `/動態`
- `/文章`
- `/讀了`
- `/補心得`
- `/書單`

建立後會：

- `post / article / travel` 流程寫入 `entries`
- `reading` 流程寫入 `reading_entries`
- 支援從 tags 判定 locked content
- 閱讀管理可直接在 Discord 中編輯 / 刪除 / 切換上鎖模式

### 2. Discord 補圖片

- `/補圖`

建立後會：

- 上傳到 R2
- 寫入 `assets`
- 第一張圖可自動成為 `cover`

### 3. 網站閱讀

前端提供：

- stream
- articles
- reading
- category archive
- tag archive
- search
- post / article / reading detail

### 4. 內容保護

- 目前以 locked tag 為核心規則
- `LOCKED_TAG_SLUGS` 定義哪些 tag 需要上鎖
- `CONTENT_LOCK_PASSWORD` 提供簡單密碼閘門
- `reading` 與 `article` 詳頁已可先顯示密碼表單，再解鎖完整內容

## 現在的技術判斷

### 這套目前適合什麼

- 單作者站
- Discord 快速發文
- 網站端閱讀與整理
- 中小型內容量

### 這套目前還不算什麼

- 完整 CMS
- 多作者平台
- 完整 public river network

## 已經開始埋的方向

目前的實作已經朝下列方向靠攏：

- tags 可聚合成主題頁
- search 已可用
- entries / assets / metrics 已有批次 API，便於列表頁擴充
- profile 已有獨立資料來源
- `reviews` 系列已可帶入有完整心得的 reading entries
- environment baseline 已用 `.nvmrc` / `check:node` / CI 對齊

## 下一階段規劃

以下是下一階段比較合理的演進，而不是已完成的功能：

### 內容模型升級

- `distribution_scope`
  - `local_only`
  - `public_profile`
  - `public_river`
- `post_style`
  - `text`
  - `text_with_media`
  - `gallery`
  - `quote_share`
- `assets.display_mode`
  - `cover`
  - `inline`
  - `gallery`
- `assets.caption`

### 身份與站點模型

- `site_id`
- `author_id`
- `sites`
- `authors`

### 管理後台

- `/admin`
- entry 編輯
- tags / category / visibility 編輯
- 圖片排序與顯示模式

### public feed / 公共河道骨架

- `/public/feed.json`
- `/public/posts.json`
- `/public/articles.json`

這一層目前還沒有實作。
