# Operations

更新日期：2026-04-14

這份文件整理目前專案的本地開發、驗證、部署前操作與已知 runbook。

## 本地開發基線

- 工作目錄：`/Users/wen/Documents/dev/blog`
- Node：`22.12.0`
- 套件管理：`npm`

建議先執行：

```bash
bash ./tools/with-node.sh node -v
bash ./tools/with-node.sh npm install
```

`bash ./tools/with-node.sh` 是目前建議的標準入口。它會直接依 `.nvmrc` 使用 `fnm exec`，不依賴目前 shell 是否已經載入 `fnm env`。

## 本地驗證

### 核心檢查

```bash
bash ./tools/with-node.sh npm test
bash ./tools/with-node.sh npm run typecheck
bash ./tools/with-node.sh npm run build --workspace=apps/web
```

### Lighthouse

```bash
bash ./tools/with-node.sh npm run lighthouse:local
```

目前這個腳本會自動：

- 啟動 `apps/api` 本地 worker 在 `8788`
- 啟動 `apps/web` preview worker 在 `8787`

已知限制：

- 本地 API 雖然可透過 service binding 連上，但 D1 目前仍是空資料庫
- 因此 web 端請求仍可能 fallback 到 `PUBLIC_API_URL`
- 如果要把本地量測變成真正 production-like，還需要補本地 D1 migration / seed

## 本地 API / DB 注意事項

目前已確認的缺口：

- 本地 API worker 可啟動
- web 的 `API_SERVICE` 可進入 `[connected]`
- 但本地 D1 尚未有完整 schema / seed data

因此目前最合理的下一步是：

1. 重跑 `bash ./tools/with-node.sh npm run db:local:init`
2. 確認本地 API 不再因空 D1 fallback
3. 再重跑 Lighthouse 與 smoke test

## 本地 D1 初始化

```bash
bash ./tools/with-node.sh npm run db:local:init
```

這個入口會依序套用 schema、migrations、indices 與最小 seed data，讓：

- `/`
- `/stream`
- `/articles`
- `/reading`
- `/about`

在本地 service binding 模式下至少有基本資料可驗證。

## Deploy Smoke Test

```bash
bash ./tools/with-node.sh npm run smoke:deploy -- <web-base> <api-base>
```

範例：

```bash
bash ./tools/with-node.sh npm run smoke:deploy -- https://personal-blog-web.personal-blog.workers.dev https://personal-blog-api.personal-blog.workers.dev
```

這個腳本目前會檢查：

- `/`
- `/stream`
- `/articles`
- `/reading`
- `/search?q=demo`
- `/favicon.ico`
- 一篇 public `post/[slug]`
- 一篇 public `article/[slug]`
- `/api/health`

## Staging / Production Runbook

目前狀態：

- 有 deployment 文件
- 有可用 build / deploy 指令
- 但還沒有完整 staging 定義

因此這一段目前屬於待補強項目：

- staging URL / bindings / secrets 清單
- migration 執行順序
- rollback 條件與操作
- deploy 後 smoke test 自動化與 branch protection 串接

## 目前最需要補的運維能力

- 讓非 `fnm` 使用者也有穩定入口，或補更完整的 shell 自動載入方案
- 本地 D1 migration / seed
- staging 環境
- rollback / secrets 驗證流程
