# Stream Feed 重新設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 PostFeedCard 從卡片邊框樣式改為 Feed 流風格：圖片自然比例、移除灰底留白、拿掉「閱讀全文」與「預覽」按鈕。

**Architecture:** 所有改動集中在 `PostFeedCard.astro` 一個檔案（HTML 結構 + CSS）。`stream.astro` 只需微調 `posts-list` 的 `gap`。不需要修改後端或資料層。

**Tech Stack:** Astro component、純 CSS（無 framework）

---

## 檔案地圖

| 檔案 | 改動 |
|------|------|
| `apps/web/src/components/PostFeedCard.astro` | 主要改動：HTML 結構、CSS、移除 JS lightbox |
| `apps/web/src/pages/stream.astro` | 微調：`posts-list` gap 從 `0.75rem` 改 `0` |

---

### Task 1：移除 Lightbox 與「預覽」按鈕

**Files:**
- Modify: `apps/web/src/components/PostFeedCard.astro`

- [ ] **Step 1：刪除 `feed-image-preview` 按鈕**

在 `PostFeedCard.astro` 找到這段並刪除（約第 58–64 行）：

```astro
      <button
        class="feed-image-preview"
        type="button"
        data-preview-src={coverUrl}
        data-preview-alt={coverAlt || title}
        aria-label="預覽圖片"
      >
        預覽
      </button>
```

- [ ] **Step 2：刪除 lightbox HTML**

刪除 `</article>` 後的整段 lightbox（約第 93–99 行）：

```astro
{hasCover && (
  <div class="feed-lightbox" data-feed-lightbox hidden>
    <button class="feed-lightbox-close" type="button" data-feed-lightbox-close aria-label="關閉圖片預覽">✕</button>
    <div class="feed-lightbox-backdrop" data-feed-lightbox-close></div>
    <img class="feed-lightbox-image" src={coverUrl} alt={coverAlt || title} />
  </div>
)}
```

- [ ] **Step 3：刪除 lightbox `<script>` 區塊**

刪除整個 `<script is:inline>` 區塊（`initFeedPreview` 函式，約第 101–127 行）：

```astro
<script is:inline>
  function initFeedPreview(root = document) {
    ...
  }
  initFeedPreview();
  document.addEventListener('astro:after-swap', () => initFeedPreview());
</script>
```

- [ ] **Step 4：刪除 lightbox 與 preview button 的 CSS**

在 `<style>` 區塊刪除這些 class 的 CSS：
- `.feed-image-preview { ... }`（整段）
- `.feed-lightbox { ... }`
- `.feed-lightbox[hidden] { ... }`
- `.feed-lightbox-backdrop { ... }`
- `.feed-lightbox-image { ... }`
- `.feed-lightbox-close { ... }`
- `.feed-image-preview` 在 mobile media query 裡的部分

- [ ] **Step 5：確認 `.feed-image-wrap` 保留，`position: relative` 可移除**

`.feed-image-wrap` 原本是 `position: relative` 為了 absolute 定位「預覽」按鈕。Preview 移除後這個 `position` 不再需要，刪掉即可。

- [ ] **Step 6：Commit**

```bash
git add apps/web/src/components/PostFeedCard.astro
git commit -m "feat(stream): remove lightbox and preview button from feed card"
```

---

### Task 2：圖片改為自然比例 + flush 邊緣

**Files:**
- Modify: `apps/web/src/components/PostFeedCard.astro`

- [ ] **Step 1：移除圖片包裝的灰色背景與邊框**

找到 `.feed-image-wrap` CSS，將：

```css
.feed-image-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-top: 1px solid var(--border, #dddaf0);
  background: #f7f7fb;
}
```

改為：

```css
.feed-image-wrap {
  width: 100%;
  overflow: hidden;
  margin: 0 -1.1rem;
  width: calc(100% + 2.2rem);
}
```

> 說明：負 margin + width 補償讓圖片突破 `.feed-body` 的 `padding: 0 1.1rem`，貼齊容器邊緣。

- [ ] **Step 2：移除圖片高度限制，改為自然比例**

找到 `.feed-cover` CSS，將：

```css
.feed-cover {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  display: block;
  transition: opacity 0.2s, transform 0.3s;
  background: #f7f7fb;
}

.feed-image-link:hover .feed-cover {
  opacity: 0.93;
  transform: scale(1.01);
}
```

改為：

```css
.feed-cover {
  width: 100%;
  height: auto;
  display: block;
}

.feed-image-link:hover .feed-cover {
  opacity: 0.9;
}
```

- [ ] **Step 3：確認 mobile media query 也沒有 `max-height` 殘留**

搜尋 `@media (max-width: 640px)` 區塊，刪除：

```css
.feed-cover {
  max-height: 220px;
}
```

- [ ] **Step 4：Commit**

```bash
git add apps/web/src/components/PostFeedCard.astro
git commit -m "feat(stream): image natural ratio, flush to edges, remove grey bg"
```

---

### Task 3：移除「閱讀全文 →」、調整 footer

**Files:**
- Modify: `apps/web/src/components/PostFeedCard.astro`

- [ ] **Step 1：刪除 footer 的 read-more 連結**

找到 footer HTML：

```astro
<footer class="feed-footer">
  {stats !== undefined ? (
    <div class="feed-stats">...</div>
  ) : <span />}
  <a href={href} class="feed-read-more">閱讀全文 →</a>
</footer>
```

改為（移除 `<a>` 那行，並移除 stats 為空時的 `<span />`）：

```astro
{stats !== undefined && (
  <footer class="feed-footer">
    <div class="feed-stats">
      <span class="fstat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        {stats.comment_count}
      </span>
      <span class="fstat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        {stats.clap_count}
      </span>
      <span class="fstat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        {stats.view_count}
      </span>
    </div>
  </footer>
)}
```

- [ ] **Step 2：刪除 `.feed-read-more` CSS**

刪除：

```css
.feed-read-more {
  font-size: 0.82rem;
  color: var(--accent, #5b74c8);
  text-decoration: none;
  font-weight: 500;
  white-space: nowrap;
}

.feed-read-more:hover {
  text-decoration: underline;
}
```

- [ ] **Step 3：調整 `.feed-footer` CSS**

原本 footer 用 `justify-content: space-between`（因為有左 stats 右 read-more）。改為靠左：

```css
.feed-footer {
  display: flex;
  align-items: center;
  padding: 0.55rem 1.1rem 0.7rem;
  border-top: 1px solid var(--border, #dddaf0);
}
```

- [ ] **Step 4：Commit**

```bash
git add apps/web/src/components/PostFeedCard.astro
git commit -m "feat(stream): remove read-more link, stats-only footer"
```

---

### Task 4：移除卡片邊框，改為分隔線

**Files:**
- Modify: `apps/web/src/components/PostFeedCard.astro`
- Modify: `apps/web/src/pages/stream.astro`

- [ ] **Step 1：`PostFeedCard.astro` — 改 `.feed-card` CSS**

將：

```css
.feed-card {
  background: var(--surface, #fff);
  border: 1px solid var(--border, #dddaf0);
  border-radius: 14px;
  overflow: hidden;
  transition: box-shadow 0.15s, border-color 0.15s;
}

.feed-card:hover {
  box-shadow: 0 4px 20px rgba(91, 116, 200, 0.1);
  border-color: #c8ccf0;
}
```

改為：

```css
.feed-card {
  background: var(--surface, #fff);
  border-bottom: 1px solid var(--border, #dddaf0);
  padding-bottom: 0.25rem;
}
```

- [ ] **Step 2：`PostFeedCard.astro` — 移除 `.feed-image-wrap` 的 `border-top`**

（Task 2 已處理，確認沒有殘留 `border-top` 在 `.feed-image-wrap`）

- [ ] **Step 3：`stream.astro` — 調整 `.posts-list` gap 和容器**

找到 `stream.astro` 的 `.posts-list` CSS：

```css
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
```

改為：

```css
.posts-list {
  display: flex;
  flex-direction: column;
  background: var(--surface, #fff);
  border-radius: 14px;
  border: 1px solid var(--border, #dddaf0);
  overflow: hidden;
}
```

> 說明：外容器提供圓角與邊框，內部貼文用分隔線隔開。最後一則貼文的 `border-bottom` 會被容器的 `overflow: hidden` 切掉，視覺上乾淨。

- [ ] **Step 4：移除 `post-item` 的 `display: contents`（影響容器圓角）**

在 `stream.astro` 找到：

```css
.post-item {
  display: contents;
}
```

改為：

```css
.post-item {
  display: block;
}
```

> `display: contents` 會讓 `.post-item` 消失於渲染樹，導致容器的 `overflow: hidden` 無法正確裁切圖片 flush。改回 `block` 即可。

- [ ] **Step 5：Commit**

```bash
git add apps/web/src/components/PostFeedCard.astro apps/web/src/pages/stream.astro
git commit -m "feat(stream): feed-style divider, remove card border"
```

---

### Task 5：收尾 — dark mode 確認與 Props 清理

**Files:**
- Modify: `apps/web/src/components/PostFeedCard.astro`

- [ ] **Step 1：確認 Props 介面移除未使用的 `categoryLabel`**

目前 Props 介面有 `categoryLabel?: string`，但 stream.astro 傳的是 `undefined`，HTML 裡的 `{categoryLabel && ...}` 也只在 `feed-category` badge 用到。這個 prop 仍可保留（其他頁面可能使用），不需刪除。跳過此步。

- [ ] **Step 2：視覺確認 dark mode**

目前 `.feed-card` 的 dark mode 是透過 CSS variable（`var(--surface)`、`var(--border)`）控制，改動後這些 variable 仍然有效，不需要額外修改。確認 `BaseLayout.astro` 的 dark mode variable 定義包含 `--surface` 和 `--border` 即可。

執行：
```bash
grep -n 'prefers-color-scheme' apps/web/src/layouts/BaseLayout.astro | head -5
```

預期輸出：有找到 dark mode 定義。

- [ ] **Step 3：執行 lint 與 typecheck**

```bash
npm run lint && npm run typecheck
```

預期：0 errors。

- [ ] **Step 4：最終 commit（若有零碎修正）**

```bash
git add -p
git commit -m "chore(stream): post-refactor cleanup"
```

---

## 完成標準

- [ ] 貼文清單沒有個別卡片邊框，改用外容器 + 分隔線
- [ ] 圖片以自然比例顯示，無灰色留白
- [ ] 圖片 flush 到左右邊緣
- [ ] 沒有「閱讀全文 →」連結
- [ ] 沒有「預覽」按鈕，沒有 lightbox
- [ ] `npm run lint` 0 errors
- [ ] `npm run typecheck` 0 errors
