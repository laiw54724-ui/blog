# 設置指南

## 需求

- Node `22.12.0+`
- npm `9+`

專案根目錄已提供：

- [.nvmrc](/Users/wen/Documents/dev/blog/.nvmrc)
- [.node-version](/Users/wen/Documents/dev/blog/.node-version)

如果你用 `fnm`：

```bash
eval "$(fnm env --shell zsh)"
fnm use 22.12.0
```

## 安裝依賴

```bash
npm install
```

## 環境變數

先複製：

```bash
cp .env.example .env.local
```

再依需求填入。

### Discord

- `DISCORD_TOKEN`
- `DISCORD_PUBLIC_KEY`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID`：本機開發可選

### Cloudflare

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Web / API

- `PUBLIC_API_URL`
- `API_SECRET`

實際 deploy 所需的 bindings 仍以各自的 `wrangler.toml` 為準。

## 初始化步驟

### 1. 建立 D1 database

```bash
cd apps/api
wrangler d1 create personal-blog
wrangler d1 execute personal-blog --file ../../db/schema.sql
```

如果有額外 migration，再依序執行：

```bash
wrangler d1 execute personal-blog --file ../../db/migrate-v2.sql
wrangler d1 execute personal-blog --file ../../db/migrate-profile.sql
wrangler d1 execute personal-blog --file ../../db/indices.sql
```

之後更新 [apps/api/wrangler.toml](/Users/wen/Documents/dev/blog/apps/api/wrangler.toml) 中的 `database_id` 與相關 bindings。

### 2. 註冊 Discord 指令

```bash
npm run register-commands --workspace=apps/api
```

## 本機開發

### 啟動 API

```bash
npm run dev:api
```

### 啟動網站

```bash
npm run dev:web
```

### 或分開兩個終端一起跑

API:

```bash
npm run dev:api
```

Web:

```bash
npm run dev:web
```

## 驗證指令

這三個現在都應該能通過：

```bash
npm run lint
npm test
npm run typecheck
```

## API 與 Discord

### Discord Interactions Endpoint

在 Discord Developer Portal 設定：

```txt
https://your-api-domain.com/api/discord/interactions
```

### 目前主要 Discord 能力

- 建立貼文 / 文章 / 旅記 / 書摘
- 開啟 modal 輸入內容
- 列出近期文章
- 編輯 / 典藏 / 刪除
- 上傳附圖
- 更新個人資料 / 頭貼 / banner

## 目前主要頁面

- `/`
- `/about`
- `/stream`
- `/articles`
- `/c/[category]`
- `/post/[slug]`
- `/article/[slug]`

## 故障排除

### `astro check` 要求 Node 版本過高

請確認當前版本：

```bash
node -v
```

應為 `22.12.0+`。

### Discord 指令沒更新

重新註冊：

```bash
npm run register-commands --workspace=apps/api
```

### D1 相關錯誤

- 確認 schema / migration 已執行
- 確認 `wrangler.toml` 內的 D1 binding 與 `database_id` 正確

### 本機頁面抓不到 API

- 確認 `PUBLIC_API_URL` 設定正確
- 或確認 Cloudflare service binding / middleware 環境正確
