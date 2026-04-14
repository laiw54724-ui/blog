# 效能基線

更新日期：2026-04-14

這份文件記錄目前網站的可重複效能基線。目標不是一次追到完美分數，而是讓每次調整都有固定對照，能快速判斷是進步、持平，還是退步。

## 本次基線環境

- Workspace: `/Users/wen/Documents/dev/blog`
- Node: `22.12.0`
- 驗證指令：
  - `npm run typecheck`
  - `npm run build --workspace=apps/web`

## 本次 build 基線

### 產物總量

- `apps/web/dist`: `3.6M`
- `apps/web/dist/client`: `1.2M`
- `apps/web/dist/server`: `2.4M`

### Client 端觀察

目前前端 client payload 整體偏健康，沒有看到大型互動框架 bundle。最大的 client 資產主要來自 KaTeX 字型與樣式。

主要較大 client 資產：

- `KaTeX_AMS-Regular.DRggAlZN.ttf`: `63,632` bytes
- `KaTeX_Main-Regular.ypZvNtVU.ttf`: `53,580` bytes
- `KaTeX_Main-Bold.waoOVXN0.ttf`: `51,336` bytes
- `katex.min.HM2DiD67.css`: `29,265` bytes

判讀：

- 一般頁面負擔不高
- 數學相關頁面成本主要集中在字型與 KaTeX 樣式
- 若後續要繼續壓首屏，優先檢查 KaTeX 是否能更精準按頁載入

### Server 端觀察

主要較大 server chunks：

- `markdown_CKFrHefZ.mjs`: `1,579,009` bytes
- `worker-entry_BwNc04A4.mjs`: `340,517` bytes
- `sequence_D3VUtoVX.mjs`: `168,772` bytes
- `data_CL2J1a1f.mjs`: `134,432` bytes

判讀：

- 最大瓶頸仍是 markdown / rehype / katex 相關 server bundle
- 這類成本不一定直接反映在 client 體感，但會影響 Worker 冷啟與 SSR 成本
- 若要把效能從 8 分拉到 9.5 以上，這一塊要列為重點

## 本次結構性改善

這輪已完成的效能相關改善：

- `reading` 頁 SSR 查詢由多次列表 API 呼叫，改為列表查詢加單一 stats 彙總查詢
- `PostFeedCard` 圖片補上 `width` / `height` 與 `decoding="async"`
- `ReaderControls` 腳本抽離成獨立檔案，降低元件內 inline script 雜訊
- 移除 Google Fonts 外部請求，改為本地 serif fallback
- `markdown` 渲染改為按內容動態載入 KaTeX / highlight，不再在模組載入時打包成單一巨大 server chunk

## Markdown Chunk 重構觀察

### 重構前

- `markdown_CKFrHefZ.mjs`: `1,579,009` bytes

### 重構後

- `markdown_I_KXT_LW.mjs`: `11,418` bytes
- 其餘 remark / rehype / katex / highlight 依賴改為拆散到多個動態 chunks

### 判讀

- 這次優化的重點不是明顯壓縮整個 `dist/server` 總量
- 真正改善的是把 markdown 渲染從「單顆超大 chunk 常駐」改成「按內容需要載入」
- 對 Worker SSR 路徑來說，這比只看總檔案大小更有價值

## 目前效能風險清單

### 高優先

- 本地 Lighthouse 流程已可讓 API service binding 進入 `[connected]`
- 但本地 API 使用的 D1 仍是空資料庫，請求會因 `no such table` fallback 到 `PUBLIC_API_URL`
- 尚未建立 staging 或 production-like API 可用狀態下的 Lighthouse 基線

### 中優先

- 內容詳頁仍有部分 inline script
- KaTeX 字型資產偏大
- 圖片尺寸資訊還沒有在所有圖片元件完全一致化

### 低優先

- 個別小型 CSS chunk 體積可再整理，但不是目前主瓶頸

## 建議目標

### 短期目標

- 保持 `apps/web/dist/client` 不明顯超過目前 `1.2M`
- 避免新增單一超大 client JS bundle
- 將圖片元件的尺寸策略統一
- 保持首頁、列表頁與內容詳頁 Lighthouse 基線不退步

### 中期目標

- 評估 markdown / KaTeX server 端拆分策略
- 將遠端字體改為更穩定的本地或更低阻塞方案
- 為高流量頁加上更清楚的 cache headers 與再驗證

## 建議的實測流程

每次做效能相關改動後，至少跑：

1. `npm run typecheck`
2. `npm run build --workspace=apps/web`
3. 更新這份文件中的產物大小
4. 補一輪 Lighthouse 實測

建議優先測的頁面：

- `/`
- `/stream`
- `/articles`
- `/reading`
- 一個文章詳頁
- 一個貼文詳頁

## 下一步

- 補本地 D1 migration / seed，讓 Lighthouse 不再依賴 fallback
- 補 staging 或 production-like API 可用狀態下的 Lighthouse 複測
- 盤點內容詳頁 inline script 是否值得再拆成按需載入
- 補字體策略與 KaTeX 載入成本的決策紀錄
