# Stream Feed 重新設計

**日期：** 2026-04-10
**範圍：** `apps/web/src/components/PostFeedCard.astro`

---

## 問題

目前 `PostFeedCard` 的圖片使用 `object-fit: contain` + `max-height: 320px` + 灰色背景，導致：
- 直立圖片（插圖、截圖）兩側留白
- 橫幅圖片被限高截死
- 整體視覺彆扭

## 設計決策

改為 **Feed 流風格**（參考 Threads）：貼文之間用細分隔線隔開，圖片自然比例全寬顯示。

## 改動清單

### 1. 移除卡片邊框

- `.feed-card`：移除 `border`、`border-radius`、`box-shadow`、`hover` 效果
- 改在 `stream.astro` 的容器上加白底 + 圓角（視覺上仍有容器感）
- `.feed-card` 改以 `border-bottom: 1px solid var(--border)` 做貼文分隔

### 2. 圖片改為自然比例

- `.feed-image-wrap`：移除 `background`、`border-top`、移除高度限制
- 加 `margin: 0 -1.1rem`（flush 到 padding 邊界）讓圖片全寬
- `.feed-cover`：移除 `max-height`，改為 `width: 100%; height: auto; object-fit: unset`
- 移除 hover 的 `transform: scale`（圖片不再有縮放動畫）

### 3. 移除「閱讀全文 →」

- 刪除 `.feed-read-more` 連結及其 CSS
- `.feed-footer`：若 stats 也無資料則整個 footer 可隱藏（保留 stats 顯示）

### 4. 移除「預覽」按鈕與 Lightbox

- 刪除 `.feed-image-preview` 按鈕
- 刪除 `.feed-lightbox` 相關 HTML、CSS、JS
- 圖片點擊直接連到貼文頁（原有的 `feed-image-link` 保留）

## 不改的部分

- Header（avatar、name、date）
- Body（title、excerpt）
- Stats（留言、拍手、閱讀）
- stream.astro 的 load more 邏輯
- 深色模式（dark mode）variables 保留，只是套用到新結構
