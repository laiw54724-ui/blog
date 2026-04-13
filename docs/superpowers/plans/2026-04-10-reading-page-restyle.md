# 閱讀頁淺色系重新設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `reading.astro` 的 CSS 從深色硬編碼改成與 `articles.astro` 一致的淺色系 CSS variable 風格。

**Architecture:** 只改 `apps/web/src/pages/reading.astro` 的 `<style>` 區塊。HTML 結構、JS 邏輯完全不動。刪除 dark mode override，改由 BaseLayout 統一控制。

**Tech Stack:** Astro、純 CSS variable

---

### Task 1：Header + Stats + 工具列

**Files:**
- Modify: `apps/web/src/pages/reading.astro`

- [ ] **Step 1：找到 `<style>` 區塊，改 `.reading-header` border**

找：
```css
.reading-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--reading-line, #e8ddd4);
}
```
改為：
```css
.reading-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}
```

- [ ] **Step 2：改 `.reading-kicker`**

找：
```css
.reading-kicker {
  margin: 0 0 0.45rem;
  font-size: 0.78rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--reading-accent, #a85f43);
}
```
改為：
```css
.reading-kicker {
  margin: 0 0 0.45rem;
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-muted);
  text-decoration: underline;
  text-underline-offset: 0.18em;
}
```

- [ ] **Step 3：改 `h1` 樣式**

找：
```css
.reading-header h1 {
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.04em;
  margin: 0 0 0.5rem;
}
```
改為：
```css
.reading-header h1 {
  font-family: var(--serif);
  font-size: clamp(2.9rem, 6vw, 3.35rem);
  font-weight: 700;
  line-height: 0.98;
  letter-spacing: -0.035em;
  margin: 0 0 0.65rem;
  color: #121218;
}
```

- [ ] **Step 4：改 `.reading-desc`**

找：
```css
.reading-desc {
  max-width: 44rem;
  color: #726d89;
  font-size: 1rem;
  line-height: 1.75;
  margin: 0;
}
```
改為：
```css
.reading-desc {
  max-width: 44rem;
  color: #6f6a86;
  font-size: 1rem;
  line-height: 1.75;
  margin: 0;
}
```

- [ ] **Step 5：改 `.stat-item`**

找：
```css
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.65rem 1.1rem;
  border: 1px solid var(--reading-line, #e8ddd4);
  border-radius: 14px;
  background: var(--reading-card, #fffaf6);
  min-width: 72px;
}
```
改為：
```css
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.65rem 1.1rem;
  border: 1px solid var(--border);
  border-radius: 22px;
  background: transparent;
  min-width: 72px;
}
```

- [ ] **Step 6：改 `.stat-num` 和 `.stat-label`**

找：
```css
.stat-num {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--reading-accent, #a85f43);
  line-height: 1.1;
}

.stat-label {
  font-size: 0.75rem;
  color: #8a7e7a;
  margin-top: 0.15rem;
}
```
改為：
```css
.stat-num {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--accent);
  line-height: 1.1;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}
```

- [ ] **Step 7：改工具列 (搜尋框 + select)**

找：
```css
.toolbar-search input {
  width: 100%;
  padding: 0.52rem 0.85rem;
  border: 1px solid #ddd8f1;
  border-radius: 999px;
  font-size: 0.9rem;
  color: #2b2d43;
  background: rgba(255,255,255,0.9);
  outline: none;
}

.toolbar-search input:focus {
  border-color: #c0baeb;
  box-shadow: 0 0 0 3px rgba(160,150,220,0.15);
}
```
改為：
```css
.toolbar-search input {
  width: 100%;
  padding: 0.52rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.9rem;
  color: var(--text);
  background: var(--surface);
  outline: none;
}

.toolbar-search input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-bg);
}
```

找：
```css
.toolbar-filters select {
  padding: 0.48rem 0.7rem;
  border: 1px solid #ddd8f1;
  border-radius: 8px;
  font-size: 0.87rem;
  color: #4a4663;
  background: #fff;
  cursor: pointer;
  outline: none;
}

.toolbar-filters select:focus { border-color: #c0baeb; }
```
改為：
```css
.toolbar-filters select {
  padding: 0.48rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.87rem;
  color: var(--text);
  background: var(--surface);
  cursor: pointer;
  outline: none;
}

.toolbar-filters select:focus { border-color: var(--accent); }
```

- [ ] **Step 8：改 `.reading-count`**

找：
```css
.reading-count {
  font-size: 0.82rem;
  color: #9892ae;
  margin-bottom: 0.5rem;
}
```
改為：
```css
.reading-count {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}
```

- [ ] **Step 9：Commit**

```bash
cd /Users/wen/Documents/dev/blog && git add apps/web/src/pages/reading.astro && git commit -m "feat(reading): restyle header, stats, toolbar to match articles page"
```

---

### Task 2：表格樣式 + 刪除 Dark Mode override

**Files:**
- Modify: `apps/web/src/pages/reading.astro`

- [ ] **Step 1：改 `.reading-table-wrap`**

找：
```css
.reading-table-wrap {
  overflow-x: auto;
  border: 1px solid #e8e4f4;
  border-radius: 14px;
  background: rgba(255,255,255,0.85);
}
```
改為：
```css
.reading-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: transparent;
}
```

- [ ] **Step 2：改 `thead` 樣式**

找：
```css
.reading-table thead {
  background: #f5f3fb;
  border-bottom: 1px solid #e8e4f4;
}
```
改為：
```css
.reading-table thead {
  background: var(--accent-bg);
  border-bottom: 1px solid var(--border);
}
```

- [ ] **Step 3：改 `th` 顏色**

找：
```css
.reading-table th {
  padding: 0.6rem 0.9rem;
  text-align: left;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #7a758c;
  white-space: nowrap;
}
```
改為：
```css
.reading-table th {
  padding: 0.6rem 0.9rem;
  text-align: left;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}
```

- [ ] **Step 4：改 `td` 樣式**

找：
```css
.reading-table td {
  padding: 0.68rem 0.9rem;
  vertical-align: middle;
  border-bottom: 1px solid #f0edf9;
  color: #2b2d43;
}
```
改為：
```css
.reading-table td {
  padding: 0.68rem 0.9rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}
```

- [ ] **Step 5：改 hover row**

找：
```css
.reading-table tbody tr:hover td { background: #faf9fe; }
```
改為：
```css
.reading-table tbody tr:hover td { background: var(--accent-bg); }
```

- [ ] **Step 6：改 col 顏色**

找：
```css
.col-author { min-width: 72px; color: #6e6a84; }
```
改為：
```css
.col-author { min-width: 72px; color: var(--text-muted); }
```

找：
```css
.col-date   { white-space: nowrap; font-variant-numeric: tabular-nums; color: #9892ae; font-size: 0.83rem; }
.col-review { color: #5e5a72; font-size: 0.85rem; }
```
改為：
```css
.col-date   { white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--text-muted); font-size: 0.83rem; }
.col-review { color: var(--text-muted); font-size: 0.85rem; }
```

找：
```css
.entry-title-text { font-weight: 600; color: #4a4860; }
```
改為：
```css
.entry-title-text { font-weight: 600; color: var(--text); }
```

- [ ] **Step 7：刪除整個 dark mode override 區塊**

找到並完整刪除這個區塊（大約 15 行）：
```css
@media (prefers-color-scheme: dark) {
  .reading-header { border-color: #3a3650; }
  .stat-item { background: #211f35; border-color: #3a3650; }
  .stat-label { color: #7a7494; }
  .toolbar-search input,
  .toolbar-filters select { background: #1e1c30; border-color: #3a3650; color: #d0ceea; }
  .reading-table-wrap { background: #1a1829; border-color: #2e2b48; }
  .reading-table thead { background: #1e1c30; }
  .reading-table th { color: #6a6480; }
  .reading-table td { border-color: #252238; color: #d0ceea; }
  .reading-table tbody tr:hover td { background: #1e1c30; }
  .col-author { color: #8a8498; }
  .entry-title-link { color: #d0ceea; }
  .entry-title-text { color: #a8a4c4; }
}
```

- [ ] **Step 8：同時檢查 `.reading-empty` 顏色**

找：
```css
.reading-empty {
  text-align: center;
  color: #9892ae;
  ...
}
```
若顏色是硬編碼，改為：
```css
.reading-empty {
  text-align: center;
  color: var(--text-muted);
  ...
}
```

- [ ] **Step 9：執行 lint + typecheck**

```bash
cd /Users/wen/Documents/dev/blog && npm run lint 2>&1 | tail -5 && npm run typecheck 2>&1 | tail -5
```
預期：0 errors, 0 warnings。

- [ ] **Step 10：Commit**

```bash
cd /Users/wen/Documents/dev/blog && git add apps/web/src/pages/reading.astro && git commit -m "feat(reading): table light style, remove dark mode override, use CSS variables"
```

---

## 完成標準

- [ ] `.reading-kicker` 用 `var(--text-muted)` + underline
- [ ] `h1` 用 `var(--serif)` + 大小與文章頁一致
- [ ] stats 卡片：transparent bg + `var(--border)` border + `border-radius: 22px`
- [ ] 工具列 input/select：`var(--border)` border + `var(--surface)` bg
- [ ] 表格 `thead`：`var(--accent-bg)` bg + `var(--border)` border
- [ ] 所有 `td` / `th` 顏色改用 CSS variable
- [ ] `@media (prefers-color-scheme: dark)` override 完全刪除
- [ ] `npm run lint` 0 errors
- [ ] `npm run typecheck` 0 errors
