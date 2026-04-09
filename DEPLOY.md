# 部署流程

## 環境準備

```bash
# Node 版本需要 >= 22.12
eval "$(fnm env --shell zsh)"
fnm use 22.12.0

# 在 monorepo 根目錄安裝依賴
npm install
```

---

## 部署 API（Cloudflare Worker）

```bash
cd apps/api
npx wrangler deploy
```

- URL：`https://personal-blog-api.personal-blog.workers.dev`
- 設定檔：`apps/api/wrangler.toml`

### API 環境變數（Secrets，只需設定一次）

```bash
# Discord Bot Token
echo "your_token" | npx wrangler secret put DISCORD_TOKEN

# Discord Public Key
echo "your_key" | npx wrangler secret put DISCORD_PUBLIC_KEY
```

---

## 部署 Web（Cloudflare Worker with SSR）

```bash
cd apps/web
npm run deploy
```

- URL：`https://personal-blog-web.personal-blog.workers.dev`
- 部署指令會明確使用 `apps/web/dist/server/wrangler.json`
- 不建議直接在 `apps/web` 目錄裸跑 `npx wrangler deploy`
- Astro Cloudflare adapter 目前 build 會自動帶出 `SESSION` 與 `IMAGES` bindings
- 如果部署後整站白頁，先到 Cloudflare Dashboard / `wrangler tail` 檢查 `SESSION` 相關 runtime error

---

## 同時部署兩者

```bash
eval "$(fnm env --shell zsh)"
fnm use 22.12.0

# API
cd /Users/wen/Documents/dev/blog/apps/api
npx wrangler deploy

# Web
cd /Users/wen/Documents/dev/blog/apps/web
npm run deploy
```

---

## 資料庫 Migration（D1）

```bash
cd apps/api

# 套用 migration 到遠端
npx wrangler d1 execute personal-blog --remote --file=../../db/migrate-v2.sql
```

---

## Discord 指令註冊（新增/修改指令後才需要）

```bash
cd apps/api
npx tsx src/scripts/register-commands.ts
```

---

## 測試

```bash
# 在 monorepo 根目錄
npx vitest run
```
