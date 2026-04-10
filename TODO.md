# TODO

## 目前狀態（2026-04）

品質指標全綠：
- `npm run lint` — 0 errors
- `npm test` — 167 tests passed
- `npm run typecheck` — 0 errors

---

## 🔴 第 2 週優先

### `/admin` 管理入口

- [ ] 決定 auth 策略（Cloudflare Access / HTTP Basic / Discord 驗證）
- [ ] 貼文 / 文章列表（狀態篩選、slug、visibility、建立時間）
- [ ] 基本批次操作回饋

### Discord 建立流程補欄位

目前 `/貼文` 和 `/文章` modal 缺少：
- [ ] `visibility`（public / unlisted / private）
- [ ] `tags`（逗號分隔）
- [ ] 是否立即公開（checkbox）

---

## 🟡 中優先

### 貼文升格文章

- [ ] Discord 指令 `/升格 slug:xxx`
- [ ] 或 web 端操作按鈕
- [ ] 升格後 type 改為 article、slug 重新計算

### 內容管理

- [ ] 圖片 lightbox（目前 gallery 有「預覽」按鈕但無實作）
- [ ] 文章 og:image 動態生成（目前用靜態 default）
- [ ] RSS 描述去除更多 Markdown 語法殘留

---

## 🟢 延後

- `/map` — 地點 / 旅行地圖瀏覽
- AI 流程與 provider 抽象
- public feed JSON
- 完整 CMS 介面

---

## 發版 Checklist

- [ ] `npm run lint` 全綠
- [ ] `npm test` 全綠
- [ ] `npm run typecheck` 全綠
- [ ] 主要頁面可瀏覽（/ / about / stream / articles / post / article）
- [ ] Discord 建立流程可跑
- [ ] RSS 與 sitemap 可存取
- [ ] 文件與功能一致（README / docs/routes.md）
