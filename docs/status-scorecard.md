# 專案現況與評分

更新日期：2026-04-14

這份文件記錄目前專案的實測狀態、評分、效能觀察，以及把各項評分拉到 10 分的具體路線。

## 本次實測摘要

在 Node `22.12.0` 環境下，已確認：

- `npm test` 通過
  - `7` 個 test files
  - `167` 個 tests passed
- `npm run typecheck` 通過
- `npm run build --workspace=apps/web` 通過

本次同步修正：

- `TagSummary` 型別不一致，讓前端 `astro check` 回綠
- `reading` 頁面 SSR 由原本重複呼叫多次 `/api/reading`，改為列表查詢加單一 `/api/reading/stats` 彙總查詢
- 移除文章與閱讀頁對 Google Fonts 的外部依賴，改用本地 serif fallback
- 補齊 Lighthouse、本地 API service binding 驗證與內容詳頁基線
- markdown / KaTeX 改為按內容動態載入，降低單一巨大 server chunk

## 目前評分

- 產品完成度：`8.5/10`
- 工程健康度：`7.5/10`
- 發布穩定度：`6.5/10`
- 網站效能：`9/10`
- 文件完整度：`9/10`
- 整體評估：`8.5/10`

## 為什麼是這個分數

### 產品完成度 `8.5/10`

優點：

- 雙河道定位清楚，內容流和閱讀流已經成形
- `stream`、`articles`、`reading`、`tags`、`search`、詳頁都已落地
- Discord 建立內容、閱讀補心得、資產上傳已可串起來

還差：

- `/admin` 尚未落地
- 內容升格流程還不完整，而且目前產品必要性偏次要
- locked content 規則尚未覆蓋搜尋、系列頁、標籤頁全部入口

### 工程健康度 `7.5/10`

優點：

- monorepo 結構清楚
- shared layer、API、web 邊界明確
- 測試與 typecheck 已可跑通
- Node 版本有 guard

還差：

- 工作樹目前仍有大量未提交修改
- 缺少更完整的整合測試與回歸測試
- 一些前端互動腳本仍偏手工，後續維護成本較高
- CI gate 目前沒有正式落地成可依賴的保護線

### 發布穩定度 `6.5/10`

優點：

- API 與 web 都可 build
- Cloudflare Worker / Astro adapter 已接上
- 文件已有部署說明

還差：

- 本地 shell 預設 Node 版本仍可能與專案要求不一致
- 缺少正式 staging 驗證流程
- 缺少部署後 smoke tests 與 rollback 準則

### 網站效能 `9/10`

優點：

- Astro 架構讓 client bundle 很小
- `apps/web/dist/client` 約 `1.2M`
- 一般頁面 CSS 體積不大，互動 JS 也很少
- `reading` 頁的 SSR 重複查詢已收斂
- 核心公開頁與內容詳頁 Lighthouse 基線已建立
- markdown / KaTeX 已改成按需載入

還差：

- KaTeX 字型資產較重
- 本地 production-like baseline 仍受空 D1 影響
- 圖片與快取策略還能再更一致

### 文件完整度 `9/10`

優點：

- README、architecture、routes、deployment 都在
- 產品與技術方向有被寫下來

還差：

- release / operations 文件已補齊，但還需要持續維護
- 還缺更細的 staging / migration / rollback 操作細節

## 清單對照

下面這張表直接對照目前要拉到 `10/10` 的項目。

狀態說明：

- `已完成`：已有實作或文件，現在可直接用
- `部分完成`：已有基礎，但還沒達到你列的完成標準
- `未開始`：目前 repo 幾乎還沒有對應落地

### 產品完成度

| 項目 | 狀態 | 說明 |
| --- | --- | --- |
| 完成 `/admin`，至少支援草稿管理、狀態切換、內容編修 | 未開始 | repo 中目前沒有 `/admin` 路由或管理介面 |
| 完成 post 升格 article 的完整流程 | 部分完成 | 有內容模型與前後端更新基礎，但沒有明確升格流程；而且目前產品必要性偏次要 |
| 把 locked content 規則擴充到搜尋、系列頁、標籤頁 | 部分完成 | article / reading 詳頁已有鎖；tag API 與部分 tag summary 已有過濾，但搜尋、系列頁、標籤頁未完整收口 |
| 補齊 reading product 細節：空狀態、錯誤狀態、server-side filter、一致的 URL 狀態 | 部分完成 | `reading.astro` 已有 SSR filter 與 URL state，但空狀態 / 錯誤狀態 / 整體一致性還沒完整驗收 |

### 工程健康度

| 項目 | 狀態 | 說明 |
| --- | --- | --- |
| 將目前未提交的大改分支整理成可審查的小批次 PR | 未開始 | 工作樹仍大且混雜 |
| 為 reading、locked access、Discord flows 補整合測試 | 部分完成 | 既有測試可跑，但這三塊的整合覆蓋仍不足 |
| 對關鍵資料轉換加型別收斂與 schema 驗證 | 部分完成 | 已有 shared schema 與部分型別收斂，但不是系統性覆蓋 |
| 補 CI gate：test、typecheck、build 都必須綠燈 | 已完成 | `.github/workflows/ci.yml` 已會在 push / PR 跑 `typecheck`、`lint`、`test`、`build` |

### 發布穩定度

| 項目 | 狀態 | 說明 |
| --- | --- | --- |
| 固定 Node 版本載入方式，解掉本地 fnm current 與 node -v 不一致問題 | 部分完成 | 已新增 `./tools/with-node.sh` 作為穩定入口，但 shell 自動載入還沒完全統一 |
| 建立 staging 環境 | 未開始 | 文件有部署資訊，但沒有明確 staging 環境定義 |
| 補 deploy 後 smoke tests | 部分完成 | 已有可重跑 smoke script，但還沒接到 CI / branch protection / staging |
| 明確定義 migration、rollback、secrets 驗證流程 | 部分完成 | deployment 文件已有零散內容，但還不是完整 runbook |

### 網站效能

| 項目 | 狀態 | 說明 |
| --- | --- | --- |
| 建立 Lighthouse 預算與每頁基線 | 部分完成 | baseline 已建立，但 budget 尚未正式化為門檻或 CI |
| 改善 markdown / KaTeX 載入策略，只在必要頁面載入必要資產 | 已完成 | 已改成按內容動態載入，KaTeX 樣式也按頁面帶入 |
| 優化圖片尺寸資訊與 lazy loading 策略，持續壓 CLS | 部分完成 | 部分元件已補 `width` / `height` 與 lazy，還沒全面盤點 |
| 盡量改成本地字體或更穩定的字體策略，減少外部阻塞 | 部分完成 | Google Fonts 已移除，但還沒形成完整字體策略文件 |
| 為熱門列表頁加上更明確的 cache headers 與資料快取策略 | 部分完成 | 部分頁面已有 cache headers，但熱門列表頁的快取策略還沒完整定義 |

### 文件完整度

| 項目 | 狀態 | 說明 |
| --- | --- | --- |
| 補 `release-checklist.md` | 已完成 | 已建立並納入 docs 索引 |
| 補 `performance-baseline.md` | 已完成 | 已建立並持續更新 |
| 補 `operations.md` | 已完成 | 已建立並納入 docs 索引 |
| 每次大改後同步更新這份 scorecard | 部分完成 | 已開始做，但還需要持續紀律化 |

## 效能觀察

### 已知優勢

- 前端走 Astro SSR，避免了典型 SPA 首屏過重問題
- 只有閱讀控制、留言、進度條等必要互動有 client script
- 內容頁以 HTML 為主，對 SEO 與首次渲染友善

### 目前瓶頸

- 文章詳頁與貼文詳頁仍有較多 inline script
- 本地 production-like baseline 已可透過本地 D1 初始化建立，但其他頁面仍值得持續複測
- Lighthouse 基線已建立，但 budget / CI 還沒正式化

## 把分數拉到 10 的路線

### 產品完成度拉到 `10/10`

- 完成 `/admin`，至少支援草稿管理、狀態切換、內容編修
- 完成 post 升格 article 的完整流程
- 把 locked content 規則擴充到搜尋、系列頁、標籤頁
- 補齊 reading product 細節：空狀態、錯誤狀態、server-side filter、一致的 URL 狀態

### 工程健康度拉到 `10/10`

- 將目前未提交的大改分支整理成可審查的小批次 PR
- 為 `reading`、locked access、Discord flows 補整合測試
- 對關鍵資料轉換加型別收斂與 schema 驗證
- 補 CI gate：`test`、`typecheck`、`build` 都必須綠燈

### 發布穩定度拉到 `10/10`

- 固定 Node 版本載入方式，解掉本地 `fnm current` 與 `node -v` 不一致問題
- 建立 staging 環境
- 補 deploy 後 smoke tests
- 明確定義 migration、rollback、secrets 驗證流程

### 網站效能拉到 `10/10`

- 建立 Lighthouse 預算與每頁基線
- 改善 markdown / KaTeX 載入策略，只在必要頁面載入必要資產
- 優化圖片尺寸資訊與 lazy loading 策略，持續壓 CLS
- 盡量改成本地字體或更穩定的字體策略，減少外部阻塞
- 為熱門列表頁加上更明確的 cache headers 與資料快取策略

### 文件完整度拉到 `10/10`

- 補 `release-checklist.md`
- 補 `performance-baseline.md`
- 補 `operations.md`
- 每次大改後同步更新這份 scorecard

## 未完成項目的實作優先順序表

下面這張表不是單純照功能大小排，而是綜合看：

- 是否能直接降低風險
- 是否能解鎖後面多個項目
- 是否能明顯提升目前評分
- 是否會影響 release / 上線穩定度

### P0：先做，會直接降低風險

| 優先序 | 項目 | 原因 | 完成標準 |
| --- | --- | --- | --- |
| P0-1 | 固定 Node 版本載入方式，解掉 `fnm current` 與 `node -v` 不一致 | 這會影響所有開發、測試、部署與 CI 重現性 | 進新 shell 後可直接得到正確 Node，或有單一步驟保證一致 |
| P0-2 | 補 CI gate：`test` / `typecheck` / `build` 全綠 | 沒有這條，後面所有優化都容易回歸 | repo 有正式 workflow，PR 會被檢查 |
| P0-3 | 補本地 D1 migration / seed | 這會直接卡住 production-like Lighthouse、smoke test、staging 驗證 | 已有可重跑入口，且已驗證 `/`、`/articles`、`/reading` 不再因空 D1 fallback |
| P0-4 | 補 deploy 後 smoke tests | 目前發版穩定度最缺的是 deploy 後自動或半自動驗證 | 有固定 smoke test 清單、可重跑腳本，並至少驗過 production 一次 |

### P1：第二批，會明顯提升工程健康與產品完成度

| 優先序 | 項目 | 原因 | 完成標準 |
| --- | --- | --- | --- |
| P1-1 | 將目前未提交的大改分支整理成可審查的小批次 PR | 不先切小，後面任何改動都會越堆越難收 | 至少拆成 3 到 5 個可審查批次 |
| P1-2 | 為 `reading`、locked access、Discord flows 補整合測試 | 這三塊正好對應現在最常變動、也最容易回歸的流程 | 有可自動跑的整合測試，覆蓋核心 happy path |
| P1-3 | 補齊 reading product 細節 | 這條線已經有基礎，補完後會直接提升產品完成度 | 空狀態、錯誤狀態、URL state、filter 一致性都收斂 |
| P1-4 | 把 locked content 規則擴充到搜尋、系列頁、標籤頁 | 這是內容保護規則從「點狀」走向「系統性」的關鍵 | 所有公開入口對 locked content 行為一致 |

### P2：第三批，開始補長線能力

| 優先序 | 項目 | 原因 | 完成標準 |
| --- | --- | --- | --- |
| P2-1 | 明確定義 migration、rollback、secrets 驗證流程 | 這會把「可 deploy」推進到「可穩定維運」 | `operations` / `deployment` 有明確 runbook |
| P2-2 | 建立 staging 環境 | 沒有 staging，就很難把 smoke test 與 release 流程做完整 | 有固定 staging URL、bindings、驗證方式 |
| P2-3 | 建立 Lighthouse 預算與每頁基線 | baseline 已有，但還沒變成真正的保護線 | 有 budget 數值與驗收規則 |
| P2-4 | 對關鍵資料轉換加型別收斂與 schema 驗證 | 這會降低隱性 bug，但效益建立在前兩批穩定後更大 | API / data transform 關鍵路徑有 schema 驗證 |

### P3：最後補產品擴張項

| 優先序 | 項目 | 原因 | 完成標準 |
| --- | --- | --- | --- |
| P3-1 | 完成 `/admin` | 價值高，但範圍大、依賴 auth / API / 流程整理 | 至少可做草稿管理、狀態切換、內容編修 |
| P3-2 | 完成 post 升格 article 的完整流程 | 這條有價值，但目前不像前面幾項那麼卡主線 | Discord 或 web 端至少有一條完整升格路徑 |
| P3-3 | 圖片、字體、熱門列表頁 cache 策略再細修 | 屬於把 `9/10` 推向 `10/10` 的精修項 | CLS、字體阻塞、熱門頁 cache 有明確策略 |

## 建議的實作順序

如果照「現在最划算」的角度，我建議實際推進順序是：

1. Node 版本固定
2. CI gate
3. deploy smoke tests
4. 工作樹切小 / PR 批次化
5. `reading`、locked access、Discord flows 整合測試
6. reading product 細節補完
7. locked content 規則擴充到搜尋 / 系列 / 標籤
8. staging + migration / rollback / secrets runbook
9. `/admin`

## 建議的 PR 切分方案

目前工作樹已經不是單一主題，所以如果直接做一個大 PR，之後會很難 review。比較合理的切法如下：

### PR-1：內容頁與 reading 效能 / 型別修正

建議包含：

- `apps/api/src/routes/reading.ts`
- `apps/web/src/lib/data.ts`
- `apps/web/src/lib/markdown.ts`
- `apps/web/src/pages/reading.astro`
- `packages/shared/src/reading-db.ts`

主題：

- reading stats API
- reading SSR 查詢收斂
- markdown / KaTeX 按需載入
- 相關型別與資料路徑修正

### PR-2：內容詳頁可及性 / UI 穩定性修正

建議包含：

- `apps/web/src/components/CommentBoard.astro`
- `apps/web/src/components/PostFeedCard.astro`
- `apps/web/src/components/ReaderControls.astro`
- `apps/web/src/scripts/reader-controls.ts`
- `apps/web/src/layouts/BaseLayout.astro`
- `apps/web/src/pages/article/[slug].astro`
- `apps/web/src/pages/post/[slug].astro`
- `apps/web/src/pages/stream.astro`
- `apps/web/src/pages/favicon.ico.ts`

主題：

- Lighthouse accessibility / best practices 修正
- ReaderControls 拆腳本
- 圖片尺寸 / CLS 修正
- favicon 與顏色對比調整

### PR-3：本地工具鏈 / release 驗證

建議包含：

- `.github/workflows/ci.yml`
- `package.json`
- `package-lock.json`
- `tools/check-node.mjs`
- `tools/with-node.sh`
- `tools/init-local-d1.sh`
- `tools/run-lighthouse.mjs`
- `tools/smoke-deploy.mjs`
- `db/seeds.sql`

主題：

- Node 穩定入口
- CI gate
- 本地 D1 初始化
- Lighthouse / smoke test 工具

### PR-4：文件同步

建議包含：

- `README.md`
- `SETUP.md`
- `DEPLOY.md`
- `TODO.md`
- `docs/README.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/routes.md`
- `docs/status-scorecard.md`
- `docs/performance-baseline.md`
- `docs/lighthouse-baseline.md`
- `docs/release-checklist.md`
- `docs/operations.md`

主題：

- 文件與實作對齊
- scorecard / baseline / operations 補齊

### PR-5：暫不提交的本地產物

建議先不要進 PR：

- `tmp/`

這類檔案可以保留本地報告，但不需要進正式程式碼審查。

## 建議的下一輪優先序

1. 先解 Node 版本一致性與 CI gate。
2. 補 deploy smoke tests，讓發布穩定度開始可量化。
3. 把目前工作樹切小，整理成可審查批次。
4. 再回頭做 `reading` 與 locked content 的產品與測試收斂。
