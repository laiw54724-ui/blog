# Two-Week Execution Plan

**Goal:** 在兩週內把專案從「功能持續擴充中」收斂到「可穩定迭代、可再次發版」的狀態，優先處理品質基線、`reading` 功能收尾，以及日常管理入口的最小可用版本。

**Current Assessment:**
- 專案整體成熟度約 `7.8/10`
- 規劃成熟度約 `8.4/10`
- 核心架構已成形：`apps/web` + `apps/api` + `packages/shared`
- 現況主要風險不是方向錯，而是功能擴張快於驗證與文件同步

**Known Constraints:**
- 本機目前 Node 版本與專案需求不一致，`apps/web` 的 typecheck 尚未能完整驗證
- `packages/shared` 目前有 1 筆 tag 順序測試失敗
- working tree 仍有一批未提交的 `reading` / Discord / tag 相關變更

---

## 執行原則

- 先恢復品質基線，再繼續新增功能
- 一次收斂一條主線，避免 `reading`、`/admin`、tag spec 三條線同時膨脹
- 每個 milestone 都必須有可驗證條件，不以「大概完成」結案
- 文件更新要跟功能收尾綁在同一批，不留落差

---

## 優先順序總覽

| Priority | 主題 | 目標 | 成果 |
|----------|------|------|------|
| P0 | 品質基線 | 回到可驗證狀態 | lint / test / typecheck 可重跑，紅燈原因明確消除 |
| P1 | `reading` 收尾 | 把新功能從「可展示」提升到「可維護」 | API、頁面、Discord 流程、文件一致 |
| P2 | `/admin` MVP | 建立日常管理最小入口 | 可篩選、可辨識內容狀態、可支援日常操作 |
| P3 | 規格同步 | 減少未來心智落差 | README / TODO / docs/routes 與實作一致 |

---

## Week 1

### Milestone 1: 恢復品質基線

**目標：**
先把「現在到底是壞掉，還是只是未收尾」這件事釐清，恢復到所有後續工作都能建立在可信驗證上的狀態。

**Tasks:**
- [ ] 將開發環境切換到 Node `22.12.0+`
- [ ] 重新執行 `npm run typecheck`
- [ ] 修正 `STRUCTURED_TAG_GROUP_ORDER` 對應測試，確認 tag v2 擴充是規格更新，不是 accidental break
- [ ] 重新執行 `npm test`
- [ ] 確認 `npm run lint`、`npm test`、`npm run typecheck` 都有最新結果可追蹤

**Definition of Done:**
- `lint` 全綠
- `test` 全綠
- `typecheck` 可在正確 Node 版本下完成
- 若仍有失敗，需明確記錄成已知 issue，而不是停在模糊狀態

**風險：**
- Node 版本問題若不先解，後面所有 web 相關驗證都不可信
- tag 測試若只改預期、不核對實際規格，容易把規格漂移包裝成修復

**輸出成果：**
- 一次綠燈驗證結果
- 一個明確的 tag v2 測試同步 commit

---

### Milestone 2: 收斂 `reading` 功能骨架

**目標：**
把目前已經跨 DB / API / Web / Discord 的 `reading` 功能從「已串通」提升到「已定型」。

**Tasks:**
- [ ] 補 `reading` route 的基本測試：list / detail / search / create / patch / delete
- [ ] 檢查 `search`、`limit`、`offset`、`sort`、授權 header 的邊界行為
- [ ] 補 `reading` shared DB helper 的最小單元測試
- [ ] 檢查 `reading` 頁面與詳頁的 JSON parsing 是否應抽成共用 helper
- [ ] 確認 Discord `/讀了`、`/補心得`、`/改狀態`、`/書單` 流程與 API 欄位一致

**Definition of Done:**
- `reading` API 至少有基本覆蓋
- 前台 `/reading` 與 `/reading/[slug]` 能對應目前資料模型穩定渲染
- Discord 指令欄位命名與 DB / API 欄位一致
- 沒有明顯重複邏輯還留在三個層次各自維護

**風險：**
- `reading` 現在的進度很接近可用，最容易發生「差一點就先放著」，結果之後維護成本最高
- Web 頁面目前有 client-side 邏輯與 labels 重複，若不趁現在抽整齊，後面加篩選會越來越重

**輸出成果：**
- `reading` 功能驗證清單
- 至少一批與 `reading` 相關的測試與文件同步

---

## Week 2

### Milestone 3: `/admin` 管理入口 MVP

**目標：**
做出真正能每天使用的最小管理入口，而不是只是技術展示頁。

**Tasks:**
- [ ] 決定 `/admin` 的 auth 策略，先以最小可落地方案為主
- [ ] 建立列表頁：顯示 `title / slug / entry_type / status / visibility / created_at`
- [ ] 支援基礎篩選：貼文 / 文章、status、visibility
- [ ] 補清楚的操作回饋：成功、失敗、空狀態
- [ ] 確保 `/admin` 與既有 `/管理` Discord 流程不互相打架，而是互補

**Definition of Done:**
- 能快速看出最近內容狀態
- 能分辨哪些內容該公開、哪些仍是草稿或 inbox
- 能支援至少一個高頻管理場景，例如快速檢查新內容是否缺 slug / visibility / status

**風險：**
- 若先做太完整 auth 或 CMS 互動，容易一週都耗在框架決策
- 若只做列表、不做篩選與回饋，會變成存在但不好用的頁面

**輸出成果：**
- `/admin` MVP 可操作頁
- 一份 auth 決策紀錄與後續擴充方向

---

### Milestone 4: 規格與文件同步

**目標：**
把 repo 現有的產品敘述、完成項與實際能力重新對齊，避免未來每次接手都要重新考古。

**Tasks:**
- [ ] 更新 `README.md`，把 `reading` 納入已完成能力或標示為 beta
- [ ] 更新 `TODO.md`，把已完成與未完成項目重新切乾淨
- [ ] 更新 `docs/routes.md` / `docs/api.md`，補上 `reading` 路由與限制
- [ ] 記錄 tag v2 的正式 group 範圍，不再只保留舊版五組心智模型
- [ ] 為 `/admin` MVP 和 `reading` 補一段簡短操作說明

**Definition of Done:**
- README、TODO、routes 文件與目前實作一致
- 新增功能不再只有程式碼知道，文件也知道
- 後續要交接或回顧時，不需要先靠 `git diff` 才理解專案現況

**風險：**
- 若把文件同步留到最後，通常會再次被新功能插隊
- tag 規格若文件不更新，之後會持續出現測試與心智模型不一致

**輸出成果：**
- 一批文件更新 commit
- 可作為下階段規劃基礎的真實專案現況

---

## 建議排程

### Day 1-2
- 修正環境版本
- 恢復 `typecheck` / `test`
- 收斂 tag v2 測試

### Day 3-5
- 補 `reading` API / shared 測試
- 檢查 Discord `reading` 指令流程
- 收掉前台重複邏輯

### Day 6-7
- 整理 `reading` 文件與 README 狀態
- 做一次功能回歸驗證

### Day 8-10
- 實作 `/admin` MVP 列表與篩選
- 決定並落地 auth 最小方案

### Day 11-12
- 補 `/admin` 回饋與細節
- 做管理流程驗證

### Day 13-14
- 文件總同步
- 整體 release-style 驗證
- 整理下一階段 backlog

---

## 里程碑檢查點

### Checkpoint A: 品質基線恢復
- `lint` / `test` / `typecheck` 有可信結果
- tag v2 規格與測試一致

### Checkpoint B: `reading` 可維護化
- `reading` 不是只有頁面能看，而是有驗證、有文件、有邊界定義

### Checkpoint C: `/admin` 可日用
- 能支援最基本的內容管理場景

### Checkpoint D: 文件同步完成
- 專案現況、規格與 roadmap 再次對齊

---

## 這兩週先不要做的事

- 不先做完整 CMS
- 不先做 AI provider abstraction
- 不先做 `/map`
- 不先做大規模 metadata 重構
- 不同時推進貼文升格、完整 admin、tag 探索頁三條大線

這些方向都合理，但不適合和當前的 `reading` 收尾與品質基線修復並行。

---

## 結束時應該達成的狀態

- 專案重新回到可驗證、可發布的節奏
- `reading` 功能成為正式能力，而不是未收尾支線
- `/admin` 擁有最小但可日用的管理價值
- 文件能反映真實專案狀態
- 下一階段才適合接「貼文升格文章」與更完整後台
