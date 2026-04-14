# Lighthouse 基線

更新日期：2026-04-14

這份文件專門記錄 Lighthouse 的量測方法、紀錄格式與驗收門檻。它和 `performance-baseline.md` 的差別是：

- `performance-baseline.md` 偏 build 體積與結構性觀察
- `lighthouse-baseline.md` 偏使用者體感與頁面實測分數

## 目前狀態

已完成本地 Lighthouse 執行環境安裝：

- `lighthouse`
- `playwright`
- Playwright 管理的 Chromium

可直接使用：

```bash
eval "$(fnm env --shell zsh)"
fnm use 22.12.0
npm run lighthouse:local
```

目前 `npm run lighthouse:local` 會自動：

- 啟動本地 API worker：`http://127.0.0.1:8788`
- 啟動 web preview worker：`http://127.0.0.1:8787`
- 讓 web 端的 `API_SERVICE` 在本地量測時盡量進入 `[connected]`

報告輸出位置：

- `tmp/lighthouse/*.report.html`
- `tmp/lighthouse/*.report.json`

## 第一版實測結果

這一節保留的是「第一輪基線」歷史紀錄，方便回看分數怎麼一路修上來；目前最新狀態請優先看後面的複測段落。

量測日期：2026-04-14

量測頁面：

- `/`
- `/stream`
- `/articles`
- `/reading`

### 分數摘要

| Page | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| `/` | 100 | 89 | 96 | 100 | 0.2s | 0.3s | 0ms | 0 | 0.4s |
| `/stream` | 100 | 89 | 96 | 100 | 0.2s | 0.3s | 0ms | 0 | 0.2s |
| `/articles` | 100 | 94 | 96 | 100 | 0.3s | 0.3s | 0ms | 0 | 0.3s |
| `/reading` | 100 | 95 | 96 | 100 | 0.3s | 0.3s | 0ms | 0 | 0.3s |

### 已知限制

本次量測是在本地 `wrangler dev` preview 上完成，而且 `API_SERVICE` 在本地是 `[not connected]`。因此首頁、`stream`、`articles` 量測時出現過：

- `Failed to fetch posts: Service Unavailable`
- `Failed to fetch articles: Service Unavailable`

這代表這次分數更接近「頁面框架與靜態渲染本身」的基線，不是完整連上真實內容資料後的最終分數。正式基線仍建議再補一輪 staging 或 production-like API 可用狀態下的量測。

## 2026-04-14 本地 service binding 驗證

這輪已把 Lighthouse 腳本更新成會自動帶起：

- `apps/api` on `8788`
- `apps/web` on `8787`

驗證結果：

- `API_SERVICE` 在 web preview 中可成功進入 `[connected]`
- 但本地 API worker 目前使用的是空的本地 D1
- 因此請求會在 API 端觸發 `no such table` 錯誤
- web 端仍會因 `500` fallback 到 `PUBLIC_API_URL`

這代表目前最接近 production 的差距已經很明確：

- 不是 web/service binding 沒接上
- 而是本地 D1 尚未建立 schema 與 seed data

在這個前提下，核心頁複測結果為：

| Page | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| `/` | 100 | 94 | 100 | 100 | 0.2s | 0.3s | 0ms | 0 | 1.0s |
| `/stream` | 100 | 100 | 100 | 100 | 0.2s | 0.3s | 0ms | 0 | 0.5s |
| `/articles` | 100 | 94 | 100 | 100 | 0.3s | 0.3s | 0ms | 0 | 0.6s |
| `/reading` | 100 | 100 | 100 | 100 | 0.3s | 0.3s | 0ms | 0 | 0.5s |

因此下一個真正能把本地 baseline 變成 production-like 的工作，不是再修前端，而是補：

- D1 schema migration
- 最小 seed data
- 或讓 `wrangler dev` 可明確連到 remote/staging D1

### 第一個已知可修問題

首頁與 `stream` 的 Accessibility 掉到 `89`，目前已定位為：

- `color-contrast`

所以下一輪最值得先修的不是效能，而是首頁與 `stream` 的前景/背景對比。

## 2026-04-14 對比修正後複測

已針對以下問題調整顏色：

- navbar 次要連結
- footer 文字
- `stream` 頁副標
- `stream` 頁空狀態文字

複測結果：

| Page | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| `/` | 99 | 100 | 96 | 100 | 0.2s | 0.3s | 0ms | 0 | 1.3s |
| `/stream` | 100 | 100 | 96 | 100 | 0.2s | 0.2s | 0ms | 0 | 0.2s |

這代表首頁與 `stream` 的對比問題已修復，Accessibility 已達到目前這輪目標。

## 2026-04-14 favicon 補齊後複測

已新增：

- `/favicon.ico` 路由
- 全站 `<link rel="icon" href="/favicon.ico" sizes="any" />`

這次修正主要是為了解掉 Lighthouse `Best Practices` 中的 `errors-in-console`。
先前掉分原因是：

- `/favicon.ico` 回傳 `404`

複測結果：

| Page | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| `/` | 100 | 100 | 100 | 100 | 0.2s | 0.2s | 0ms | 0 | 0.2s |
| `/stream` | 100 | 100 | 100 | 100 | 0.2s | 0.2s | 0ms | 0 | 0.2s |

## 2026-04-14 核心公開頁補測

針對剩下兩個核心公開頁補測：

- `/articles`
- `/reading`

複測結果：

| Page | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| `/articles` | 100 | 100 | 100 | 100 | 0.3s | 0.3s | 0ms | 0 | 0.3s |
| `/reading` | 100 | 100 | 100 | 100 | 0.3s | 0.3s | 0ms | 0 | 0.3s |

目前核心公開頁基線：

- `/`
- `/stream`
- `/articles`
- `/reading`

皆已達到 Lighthouse 四大分類 `100 / 100 / 100 / 100`。

## 2026-04-14 內容詳頁補測

針對內容詳頁再補測：

- `/article/%E5%BE%9E%E5%8F%A4%E5%85%B8%E8%AD%89%E6%98%8E%E5%88%B0%E4%BA%92%E5%8B%95%E5%BC%8F%E8%AD%89%E6%98%8E-2`
- `/post/lecture-3-continuation-of-the-gkr-protocol-and-corollaries`

這輪同步修正了幾個 detail page audit 來源：

- `ReaderControls` 移除不必要的 `client:load`
- 文章與貼文詳頁的次要文字色與 code highlight 顏色提高對比
- 留言表單補上可關聯 label
- markdown task list checkbox 改為從輔助科技樹中排除
- 互動按鈕可見文字與 accessible name 對齊

複測結果：

| Page | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| `/article/...證明-2` | 100 | 100 | 100 | 100 | 0.3s | 0.4s | 0ms | 0.001 | 1.0s |
| `/post/lecture-3-continuation-of-the-gkr-protocol-and-corollaries` | 100 | 100 | 100 | 100 | 0.3s | 0.3s | 0ms | 0.008 | 0.7s |

目前首頁、列表頁、內容詳頁三層基線都已達到 `100 / 100 / 100 / 100`。

## 建議量測頁面

第一批至少測這 6 頁：

- `/`
- `/stream`
- `/articles`
- `/reading`
- 一篇文章詳頁
- 一篇貼文詳頁

如果後續 `reading/[slug]` 成為重要入口，也建議列入固定量測。

## 建議量測環境

- Node: `22.12.0`
- 使用 production build
- 使用本地 preview 或 staging URL
- 每頁至少跑 3 次，記中位數

## 建議紀錄欄位

每頁至少記：

- Performance
- Accessibility
- Best Practices
- SEO
- FCP
- LCP
- TBT
- CLS
- Speed Index

## 建議目標

### 首批可接受目標

- Performance: `>= 85`
- Accessibility: `>= 95`
- Best Practices: `>= 95`
- SEO: `>= 95`
- CLS: `< 0.1`

### 進階目標

- 首頁與列表頁 Performance: `>= 90`
- 內容詳頁 Performance: `>= 88`
- CLS: `< 0.05`
- LCP: `< 2.5s`

## 建議跑法

### 1. 先切到正確 Node

```bash
eval "$(fnm env --shell zsh)"
fnm use 22.12.0
```

### 2. 啟動網站

```bash
npm run build --workspace=apps/web
npm run preview:worker --workspace=apps/web
```

### 3. 跑 Lighthouse

如果本機已安裝 `lighthouse` 與 Chrome，可用：

```bash
lighthouse http://127.0.0.1:8787/ --output html --output json --output-path ./tmp/lighthouse-home
```

列表頁與內容頁同理。

專案內也已提供一鍵腳本：

```bash
npm run lighthouse:local
```

## 建議紀錄模板

量到分數後，把結果補成下面格式：

```md
## 2026-04-14

### Home `/`
- Performance:
- Accessibility:
- Best Practices:
- SEO:
- FCP:
- LCP:
- TBT:
- CLS:

### Stream `/stream`
- Performance:
- Accessibility:
- Best Practices:
- SEO:
- FCP:
- LCP:
- TBT:
- CLS:
```

## 驗收方式

如果某次調整出現以下情況，視為需要回頭檢查：

- 任一核心頁 Performance 掉超過 `5` 分
- CLS 從 `< 0.1` 退步到 `>= 0.1`
- LCP 明顯惡化超過 `20%`
- 首頁或列表頁多出大型第三方資源

## 下一步

- 安裝 Lighthouse 與可用的 Chrome/Chromium
- 補第一版正式實測分數
- 之後每次重大 UI 或資料流調整後更新一次
