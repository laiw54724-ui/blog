# 設置指南

## 環境變數設置

1. 複製 `.env.example` 為 `.env.local`
2. 填入以下變數：

### Discord 配置

- `DISCORD_TOKEN`: Bot token (從 Discord Developer Portal 獲取)
- `DISCORD_PUBLIC_KEY`: Public key
- `DISCORD_CLIENT_ID`: Application ID
- `DISCORD_GUILD_ID`: 測試 Guild ID (可選，用於開發)

### Cloudflare 配置

- `CLOUDFLARE_API_TOKEN`: CF API token
- `CLOUDFLARE_ACCOUNT_ID`: CF Account ID

## 初始化步驟

### 1. 安裝依賴

```bash
npm install
```

### 2. 設置 D1 數據庫

```bash
cd apps/api
wrangler d1 create personal-blog
wrangler d1 execute personal-blog --file ../../db/schema.sql
```

更新 `wrangler.toml` 中的 `database_id`。

### 3. 註冊 Discord 指令

```bash
npm run register-commands -w apps/api
```

### 4. 開發模式

終端 1 - 啟動 API:

```bash
npm run dev:api
```

終端 2 - 啟動網站:

```bash
npm run dev:web
```

## Discord Webhook 設置

1. 在 Discord Developer Portal 中配置 Interactions Endpoint URL
2. 指向你的 Worker URL: `https://your-api-domain.com/api/discord/interactions`

## API 端點

- `POST /api/discord/interactions` - Discord interactions
- `GET /api/entries` - 取得貼文列表
- `GET /api/entries/:id` - 取得單篇貼文
- `GET /api/health` - 健康檢查

## Discord 指令

### /貼文

發佈動態到 Stream（立即發佈）

- `content` - 貼文內容
- `category` - 分類（可選，預設：journal）

### /文章

創建文章草稿

- `content` - 文章內容
- `category` - 分類（可選，預設：journal）

### /旅記

快速記錄旅行見聞

- `content` - 旅行內容

### /書摘

記錄讀書筆記或書摘

- `content` - 書摘內容

## 開發流程

1. **使用 Discord 發佈內容**

   ```
   /貼文 content: 今天天氣真好，去咖啡廳坐了一會
   ```

2. **內容自動保存到 D1**
   - 生成唯一 ID
   - 創建 URL-safe slug
   - 提取摘要
   - 自動發布或保存為草稿

3. **在網站上查看**
   - 動態顯示在 `/stream`
   - 文章顯示在 `/articles`
   - 按分類瀏覽

## 文件結構

```
.
├── apps/
│   ├── api/          # Cloudflare Worker (Hono)
│   └── web/          # Astro 網站
├── packages/
│   └── shared/       # 共享 types, schemas, utils
├── db/
│   ├── schema.sql
│   └── seeds.sql
└── docs/
```

## 部署

### API 部署（Cloudflare Workers）

```bash
npm run build:api
wrangler deploy -c apps/api/wrangler.toml
```

### Web 部署（靜態站點）

```bash
npm run build:web
# Deploy apps/web/dist to your hosting
```

## 故障排除

### 連線問題

- 確保 API URL 正確設置在 `.env`
- 檢查 CORS 設置

### 數據庫錯誤

- 確保 D1 database_id 已設置
- 檢查 schema 是否正確初始化

### Discord 指令不顯示

- 重新運行 `npm run register-commands`
- 檢查 DISCORD_CLIENT_ID 是否正確
