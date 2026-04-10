# 部署指南

這份文件記錄**目前真的可用**的部署方式，不再沿用舊的 Pages / production env 假設。

## 目前部署模型

- API：Cloudflare Workers
- Web：Astro + Cloudflare adapter，最終也是用 Wrangler 部署 Worker
- 儲存：
  - D1
  - R2
  - KV（SESSION）
  - Images（IMAGES）

## 先決條件

### Node

建議版本：

- `22.12.0+`

repo 內目前已有：

- [.nvmrc](/Users/wen/Documents/dev/blog/.nvmrc)
- [.node-version](/Users/wen/Documents/dev/blog/.node-version)

### 本機驗證

```bash
cd /Users/wen/Documents/dev/blog
eval "$(fnm env --shell zsh)"
fnm use 22.12.0
npm test
npm run typecheck
```

## API 部署

目錄：

- [apps/api](/Users/wen/Documents/dev/blog/apps/api)

指令：

```bash
cd /Users/wen/Documents/dev/blog/apps/api
npx wrangler deploy
```

### API 目前需要的重要 bindings / secrets

- `DB`
- `ASSETS_BUCKET`
- `DISCORD_PUBLIC_KEY`
- `DISCORD_TOKEN`
- `DISCORD_APPLICATION_ID`
- `API_SECRET`

## Web 部署

目錄：

- [apps/web](/Users/wen/Documents/dev/blog/apps/web)

建議流程：

```bash
cd /Users/wen/Documents/dev/blog/apps/web
eval "$(fnm env --shell zsh)"
fnm use 22.12.0
npm run deploy
```

目前 `npm run deploy` 會：

1. `astro build`
2. 使用 `dist/server/wrangler.json` 進行 deploy

也就是不要直接在錯的目錄隨便跑 `wrangler deploy`。

## Web 目前需要的重要 bindings

從實際 build / deploy 來看，web worker 目前會吃到：

- `SESSION`
- `API_SERVICE`
- `IMAGES`
- `ASSETS`
- `PUBLIC_API_URL`

如果這幾個少掉，網站可能會出現：

- 白頁
- 資料列表消失
- 圖片 / sessions 問題

## 目前已知的部署踩雷點

### 1. API build 遇到 `Could not resolve "module"`

這是之前 shared utils 用到 Node built-in `module` 時踩過的問題。  
目前 repo 已修正，不應再是 blocker。

### 2. Web 白頁但 deploy 成功

先看：

```bash
cd /Users/wen/Documents/dev/blog/apps/web
npx wrangler tail personal-blog-web
```

以前實際踩過的原因包括：

- `middleware.ts` 還在用 Astro v5 舊 runtime env 取法
- web deploy 沒有吃到正確 wrangler config

目前 repo 已改成較穩定的版本。

### 3. Web 有畫面但資料全空

先看 tail 是否出現：

- `Failed to fetch posts`
- `Failed to fetch articles`
- `Service binding returned 404`

目前前端資料層有 fallback：

- 先走 `API_SERVICE`
- 如果 service binding 錯誤回 `404`
- 再退回 `PUBLIC_API_URL`

所以現在比較不會整站空掉。

### 4. 本機 `astro build` / `astro check` 出現 `listen EPERM`

這通常不是程式碼錯，是執行環境限制。  
在本機終端直接跑通常沒問題；在受限沙箱環境則可能需要更高權限。

## 驗證項目

deploy 後至少檢查：

### Web

- `/`
- `/stream`
- `/articles`
- `/search`
- `/about`
- 任一篇 `/post/[slug]`
- 任一篇 `/article/[slug]`

### API

- `/api/health`
- `/api/entries?type=post`
- `/api/entries?type=article`
- `/api/profile`
- `/api/tags`

## 目前建議的正式部署前檢查

```bash
cd /Users/wen/Documents/dev/blog
eval "$(fnm env --shell zsh)"
fnm use 22.12.0
npm test
npm run typecheck
npm run build --workspace=apps/web
```

## 下一步應該補但尚未補完的部署文件

- D1 migration checklist
- Discord command 更新 checklist
- admin / public feed 上線 checklist
- public river 索引服務部署方式
