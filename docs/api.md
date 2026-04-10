# API 現況

這份文件描述目前前端與 Discord flow 已經在使用的 API。

## 基本原則

- API 目前以 Cloudflare Worker 提供。
- 前端優先走 service binding。
- 若 service binding 對特定路由誤回 `404`，前端資料層會 fallback 到 `PUBLIC_API_URL`。
- 寫入端點以 `API_SECRET` 保護；公開讀取端點則供前端 SSR 使用。

## 健康檢查

### `GET /api/health`

回傳：

```json
{
  "status": "ok",
  "timestamp": "2026-04-10T00:00:00.000Z"
}
```

## Entries

### `GET /api/entries`

用途：

- 取得列表
- 支援首頁、stream、articles、category 頁

查詢參數：

- `type=post|article`
- `category=journal|reading|travel|place`
- `status=...`
- `visibility=public|unlisted|private`
- `limit`
- `offset`

### `GET /api/entries/search`

用途：

- 全站搜尋入口

查詢參數：

- `q`
- `limit`

目前搜尋欄位：

- `title`
- `content_markdown`
- `excerpt`

### `GET /api/entries/metrics`

用途：

- 批次取多篇內容的 metrics
- 解列表頁 N+1

查詢參數：

- `ids=id1,id2,...`

### `GET /api/entries/assets`

用途：

- 批次取多篇內容的 assets
- 目前前端主要拿來解 cover asset 的 N+1

查詢參數：

- `ids=id1,id2,...`

### `GET /api/entries/slug/:slug`

用途：

- 依 slug 取詳頁內容

### `GET /api/entries/:id`

用途：

- 依 id 取單篇內容

### `GET /api/entries/:id/assets`

用途：

- 取單篇內容的所有資產

### `GET /api/entries/:id/metrics`

用途：

- 取單篇內容的 metrics

### `PUT /api/entries/:id`

用途：

- 更新 entry

目前可更新欄位由 shared schema 限制。

### `DELETE /api/entries/:id`

- 典藏 entry

### `DELETE /api/entries/:id/hard`

- 永久刪除 entry 與關聯資料

### `POST /api/entries/:id/clap`

- 匿名拍手
- 已有基本 rate limit
- 目前以 IP + entry 10 秒節流

### `POST /api/entries/:id/view`

- 記錄 view_count

## Comments

### `GET /api/entries/:id/comments`

- 取公開留言

### `POST /api/entries/:id/comments`

- 建立留言
- 目前有：
  - honeypot
  - 送出太快檢查
  - IP rate limit

## Profile

### `GET /api/profile`

- 取個人名稱、bio、links、avatar、banner

### `PUT /api/profile`

- 更新 profile 文字資料

### `POST /api/profile/avatar`

- 更新頭貼

### `POST /api/profile/banner`

- 更新橫條

## Tags

### `GET /api/tags`

用途：

- 取得公開 tag 與 entry_count
- 目前文章列表頁、搜尋頁、tag 導覽使用

查詢參數：

- `type`
- `category`
- `limit`

### `GET /api/tags/:slug/entries`

用途：

- 取得指定 tag 的公開內容

查詢參數：

- `type`
- `category`
- `limit`

目前前端主要把這條路由用在文章 tag 頁。

## Assets

### `GET /api/assets/*`

- 從 R2 取回實際圖片 / 附件
- 會帶長快取 header

## Discord

### `POST /api/discord/interactions`

- Discord webhook 入口
- 做簽名驗證
- 轉交 slash commands / component / modal submit

## 尚未正式落地的 API

以下已進入規劃，但目前 repo 還沒有正式供前端使用的版本：

- `POST /api/entries`
- 多圖排序 / metadata 編輯 API
- `/public/feed.json`
- `/public/posts.json`
- `/public/articles.json`
- admin 專用 entry 編輯 API
