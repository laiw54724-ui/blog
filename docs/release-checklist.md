# Release Checklist

更新日期：2026-04-14

這份文件是發版前後的最小固定檢查表。目標不是寫得很長，而是讓每次 release 都有一致的安全線。

## 發版前

- 確認 `bash ./tools/with-node.sh node -v` 為 `22.12.0`
- `bash ./tools/with-node.sh npm test` 綠燈
- `bash ./tools/with-node.sh npm run typecheck` 綠燈
- `bash ./tools/with-node.sh npm run build --workspace=apps/web` 綠燈
- 重要頁面 Lighthouse 基線未明顯退步
- 本次變更涉及的文件已同步更新
- 若有 DB 變更，migration 已準備好且已驗證可執行
- 若有 secrets 變更，變更清單與驗證方式已寫入 release note

## 發版時

- 確認部署目標環境：`staging` 或 `production`
- 先部署 API，再部署 web
- 記錄本次 deploy 時間、commit、操作人
- 若有 migration，先執行 migration 再切流量

## 發版後 Smoke Test

- 先跑：

```bash
bash ./tools/with-node.sh npm run smoke:deploy -- https://personal-blog-web.personal-blog.workers.dev https://personal-blog-api.personal-blog.workers.dev
```

- 首頁 `/` 可開啟
- `/stream` 可開啟且有內容
- `/articles` 可開啟且列表正常
- `/reading` 可開啟且 filter 正常
- 任一 `article/[slug]` 可開啟
- 任一 `post/[slug]` 可開啟
- 搜尋頁 `/search` 可正常查詢
- favicon 回應正常
- 若本次有 Discord / API 相關變更，至少做一條核心流程驗證

## 出問題時

- 先判斷是 web、API、DB migration、還是 secrets 問題
- 若是資料結構問題，先停止後續 deploy，避免擴大影響
- 若是程式碼回歸，可直接回退到上一個穩定版本
- 若是 secrets / binding 錯誤，先修設定再重試，不要硬回滾資料

## 每次發版後要補

- 更新 `docs/status-scorecard.md`
- 若效能有變化，更新 `docs/performance-baseline.md` / `docs/lighthouse-baseline.md`
- 若部署流程或環境假設變了，更新 `docs/operations.md`
