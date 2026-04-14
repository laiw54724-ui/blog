# TODO

## 目前狀態（2026-04）

品質指標全綠：
- `npm run lint` — 0 errors
- `npm test` — 167 tests passed
- `apps/api` typecheck — pass

環境基線已補：
- `.nvmrc` / `.node-version` = `22.12.0`
- `npm run check:node`
- 但 shell 的 `fnm current` 與 `node -v` 不一致問題仍待處理

---

## 🔴 第 2 週優先

### 基礎穩定性

- [ ] 固定 Node 版本載入方式，解掉 `fnm current` 與 `node -v` 不一致
- [x] 正式 CI gate：`test` / `typecheck` / `build`
- [x] 補本地 D1 migration / 最小 seed
- [ ] 補 deploy 後 smoke tests

### 工作樹整理

- [ ] 把目前未提交的大改切成可審查的小批次 PR

### reading 功能定稿與產品化

- [ ] 資料模型與欄位定稿
- [ ] 詳頁與列表關係整理
- [ ] 空狀態與錯誤狀態整理
- [x] server-side filter / URL state 已落地
- [ ] pagination / 狀態一致性再收斂

### 前端效能與資料策略

- [ ] `/stream` 改成更輕的資料載入方式，避免先 render 全部再隱藏
- [ ] `/article/[slug]` 的上下篇查詢改成 API 支援，不再抓全部文章
- [ ] 釐清 Astro SSR / prerender 策略，處理目前 `getStaticPaths()` 誤導

### `/admin` 管理入口

- [ ] 決定 auth 策略（Cloudflare Access / HTTP Basic / Discord 驗證）
- [ ] 貼文 / 文章列表（狀態篩選、slug、visibility、建立時間）
- [ ] 基本批次操作回饋

---

## 🟡 中優先

### locked content / tag policy

- [ ] locked tag 規則擴充到搜尋 / 系列頁 / 其他詳頁
- [ ] 決定是否讓 `post` 詳頁也共用密碼保護
- [ ] 被鎖 tag 的公開呈現規則再收斂

### 測試與驗證

- [ ] `reading` 整合測試
- [ ] locked access 整合測試
- [ ] Discord flows 整合測試
- [ ] Lighthouse budget / 驗收門檻正式化

### 發布穩定度

- [ ] staging 環境定義
- [ ] migration / rollback / secrets 驗證 runbook 補齊

### 貼文升格文章

- [ ] Discord 指令 `/升格 slug:xxx`
- [ ] 或 web 端操作按鈕
- [ ] 升格後 type 改為 article、slug 重新計算

### 資產與前端體驗

- [ ] 圖片 lightbox（目前 gallery 有「預覽」按鈕但無實作）
- [ ] 文章 og:image 動態生成（目前用靜態 default）
- [ ] RSS 描述去除更多 Markdown 語法殘留
- [ ] 字型與 KaTeX 重資產策略優化
- [x] markdown / KaTeX 已改為按需載入

---

## 🟢 延後

- `/map` — 地點 / 旅行地圖瀏覽
- AI 流程與 provider 抽象
- public feed JSON
- 完整 CMS 介面

---

## 發版 Checklist

- [x] `docs/release-checklist.md` 已建立
- [ ] `npm run lint` 全綠
- [ ] `npm test` 全綠
- [ ] `npm run check:node` 通過
- [ ] typecheck 在正確 Node 22 環境可重現
- [ ] 主要頁面可瀏覽（/ / about / stream / articles / reading / post / article）
- [ ] Discord 建立與管理流程可跑
- [ ] RSS 與 sitemap 可存取
- [ ] 文件與功能一致（README / docs/routes.md）
