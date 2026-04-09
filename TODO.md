# TODO - 立即行動項目

## 🔴 緊急 (立即做)

### 1. 安裝依賴並測試構建

```bash
npm install
npm run typecheck
```

### 2. 配置 Discord Bot

- [ ] 前往 https://discord.com/developers/applications
- [ ] 創建新應用
- [ ] 啟用 "Interactions Endpoint URL"
- [ ] 複製 `DISCORD_CLIENT_ID` 和 `DISCORD_PUBLIC_KEY`
- [ ] 創建 Bot 並複製 `DISCORD_TOKEN`
- [ ] 邀請 Bot 到測試 Server
  - 需要權限: applications.commands, chat.write, embed.links
- [ ] 設置 Interactions Endpoint URL：`http://localhost:8787/api/discord/interactions`

### 3. 設置 .env.local

```bash
cp .env.example .env.local
```

填入：

- `DISCORD_TOKEN`
- `DISCORD_PUBLIC_KEY`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID` (可選，測試用)

### 4. 初始化 Cloudflare

- [ ] 安裝 Wrangler: `npm install -g @latest wrangler`
- [ ] 登入: `wrangler login`
- [ ] 創建 D1 Database:
  ```bash
  cd apps/api
  wrangler d1 create personal-blog
  ```
- [ ] 初始化 Schema:
  ```bash
  wrangler d1 execute personal-blog --file ../../db/schema.sql
  ```
- [ ] 複製返回的 `database_id` 到 `wrangler.toml`

### 5. 註冊 Discord 指令

```bash
npm run register-commands -w apps/api
```

---

## 🟡 高優先級 (本周做)

### 6. 本地開發測試

```bash
# 終端 1
npm run dev:api

# 終端 2
npm run dev:web
```

測試流程：

1. [ ] 在 Discord 中輸入 `/貼文 content: 測試貼文`
2. [ ] 確認收到回應 embed
3. [ ] 訪問 http://localhost:3000/stream 查看貼文
4. [ ] 測試 /文章 指令

### 7. 修復類型錯誤

當前已知的問題：

- [ ] 添加 `@types/node` 到 API package.json
- [ ] 添加 `discord-interactions` 依賴
- [ ] 修複 Astro tsconfig

### 8. 創建詳情頁面

- [ ] 創建 `/src/pages/post/[slug].astro`
- [ ] 創建 `/src/pages/article/[slug].astro`
- [ ] 集成 Markdown 渲染 (使用 remark)

### 9. 添加評論系統 (可選)

- [ ] Discord 評論同步
- [ ] 或集成 Disqus/Giscus

---

## 🟢 中優先級 (2-3 周)

### 10. Discord 高級交互

- [ ] 實現 Modal (編輯表單)
- [ ] Button 回應 (發佈、刪除、存檔)
- [ ] 更多指令 (/旅記、/書摘)

### 11. API 增強

- [x] 編輯端點: `PUT /api/entries/:id`
- [x] 刪除端點: `DELETE /api/entries/:id` (軟刪除/封存)
- [ ] 發佈端點: `POST /api/entries/:id/publish`
- [ ] 搜索端點: `GET /api/search`

### 12. 內容管理面板 (小型)

- [ ] 簡單的草稿管理界面
- [ ] 批量操作
- [ ] 標籤管理

---

## 📋 檢查清單 - 部署前

### 安全性

- [ ] 環境變數絕不提交到 Git
- [ ] CORS 配置正確
- [ ] 認證驗證就位
- [ ] Rate limiting 設置

### 性能

- [ ] API 響應時間 < 500ms
- [ ] 頁面加載時間 < 2s
- [ ] 圖片優化
- [ ] 快取策略設置

### 測試

- [ ] 所有 Discord 指令測試
- [ ] 所有 API 端點測試
- [ ] 所有頁面加載測試
- [ ] 移動設備測試

### 文檔

- [ ] README 更新完整
- [ ] API 文檔 (可用 OpenAPI)
- [ ] 部署指南
- [ ] 故障排除指南

---

## 🚀 一次性命令

```bash
# 完整初始化 (假設已有 Discord + Cloudflare 賬戶)
npm install
cp .env.example .env.local
# 編輯 .env.local...

# 然後
npm run register-commands -w apps/api

# 開發
npm run dev:api &
npm run dev:web
```

---

## 📞 需要幫助？

查看：

- `SETUP.md` - 詳細設置步驟
- `README.md` - 產品定位與技術選擇
- `docs/` - 架構、路由、Discord 規格
- Discord API Docs: https://discord.com/developers/docs
- Cloudflare Docs: https://developers.cloudflare.com
