# 閱讀頁重新設計（淺色系）

**日期：** 2026-04-10
**範圍：** `apps/web/src/pages/reading.astro`

---

## 目標

把閱讀頁的表格從深色系改成與文章列表頁（`articles.astro`）一致的淺色系視覺語言。
**保留結構**：統計卡、搜尋工具列、篩選器、表格欄位均不動。
**只改樣式**：顏色、字體、邊框、間距。

---

## 參考標準

以 `articles.astro` 的 CSS 為準：
- 用 `var(--border)`, `var(--text-muted)`, `var(--accent)`, `var(--serif)` 等 CSS variable
- 卡片：透明背景 + `border: 1px solid var(--border)` + `border-radius: 22px`
- 標題：`var(--serif)` 字體，`clamp(2.9rem, 6vw, 3.35rem)`，`#121218`

---

## 改動清單

### 1. Header 區

| 項目 | 現在 | 目標 |
|------|------|------|
| `.reading-kicker` 顏色 | `#a85f43` | `var(--text-muted)` + underline |
| `h1` 字體 | system-ui | `var(--serif)` |
| `h1` 大小 | `clamp(2rem, 5vw, 3.2rem)` | `clamp(2.9rem, 6vw, 3.35rem)` |
| `h1` 顏色 | 預設 | `#121218` |
| `.reading-desc` 顏色 | `#726d89` | `#6f6a86` |
| Header `border-bottom` 顏色 | `#e8ddd4` | `var(--border)` |

### 2. Stats 卡片

| 項目 | 現在 | 目標 |
|------|------|------|
| `.stat-item` 背景 | `#fffaf6` (light) / `#211f35` (dark) | `transparent` |
| `.stat-item` border | `1px solid #e8ddd4` | `1px solid var(--border)` |
| `.stat-item` border-radius | `14px` | `22px` |
| `.stat-num` 顏色 | `#a85f43` | `var(--accent)` |
| `.stat-label` 顏色 | `#8a7e7a` | `var(--text-muted)` |

### 3. 工具列（搜尋 + 篩選）

| 項目 | 現在 | 目標 |
|------|------|------|
| 搜尋框 border | `#ddd8f1` | `var(--border)` |
| 搜尋框 focus border | `#c0baeb` | `var(--accent)` |
| 搜尋框 focus shadow | `rgba(160,150,220,0.15)` | `var(--accent-bg)` |
| 篩選 select border | `#ddd8f1` | `var(--border)` |
| 篩選 select 文字色 | `#4a4663` | `var(--text)` |

### 4. 表格

| 項目 | 現在 | 目標 |
|------|------|------|
| `.reading-table-wrap` 背景 | `rgba(255,255,255,0.85)` | `transparent` |
| `.reading-table-wrap` border | `1px solid #e8e4f4` | `1px solid var(--border)` |
| `.reading-table-wrap` border-radius | `14px` | `14px`（不變） |
| `thead` 背景 | `#f5f3fb` | `var(--accent-bg)` |
| `thead` border-bottom | `1px solid #e8e4f4` | `1px solid var(--border)` |
| `th` 顏色 | `#7a758c` | `var(--text-muted)` |
| `td` border-bottom | `1px solid #f0edf9` | `1px solid var(--border)` |
| `td` 顏色 | `#2b2d43` | `var(--text)` |
| Hover row bg | `#faf9fe` | `var(--accent-bg)` |
| `.col-author` 顏色 | `#6e6a84` | `var(--text-muted)` |
| `.col-date` 顏色 | `#9892ae` | `var(--text-muted)` |
| `.col-review` 顏色 | `#5e5a72` | `var(--text-muted)` |

### 5. 移除 Dark Mode override

現在的 `@media (prefers-color-scheme: dark)` 區塊有大量硬編碼深色值。
全部刪除——改用 CSS variable 後，dark mode 由 `BaseLayout.astro` 統一控制，
和文章頁一樣的行為。

### 6. `.reading-count` 顏色

`#9892ae` → `var(--text-muted)`

---

## 不動的部分

- HTML 結構（表格欄位、工具列、stats 數量）
- Badge 顏色（`badge-genre-*`, `badge-status-*`）— 保留，顏色本身辨識度高
- Score 顏色（`.score-high`, `.score-mid`）— 保留
- JS（篩選/排序邏輯）
- CSS variable `--reading-accent`（保留給 detail 頁用）
