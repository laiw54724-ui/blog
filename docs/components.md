# 前端元件現況

這份文件只記錄目前前端真的在用的主要元件。

## Layout

### [BaseLayout.astro](/Users/wen/Documents/dev/blog/apps/web/src/layouts/BaseLayout.astro)

負責：

- 全站基本 meta
- top nav
- sidebar
- 固定側邊 menu rail
- 全站色票 / 基本 CSS variables

目前導覽包含：

- 首頁
- 關於
- 動態
- 文章
- 搜尋
- category links

## 內容卡片

### [EntryCard.astro](/Users/wen/Documents/dev/blog/apps/web/src/components/EntryCard.astro)

用途：

- 首頁文章 / 動態摘要
- category 頁
- search 頁
- tag 頁

特性：

- 支援 `compact` / `list`
- 可顯示封面、分類、日期、metrics

### [PostFeedCard.astro](/Users/wen/Documents/dev/blog/apps/web/src/components/PostFeedCard.astro)

用途：

- stream
- about 頁最近動態

特性：

- 顯示頭像
- 顯示分類與 metrics
- 比 `EntryCard` 更偏社群時間流

## 閱讀與互動

### [ReaderControls.astro](/Users/wen/Documents/dev/blog/apps/web/src/components/ReaderControls.astro)

用途：

- 詳頁字級調整

目前：

- 用固定浮動控制
- 作用於 `.post-text`
- 之後可考慮一起支援文章詳頁的 `.markdown-content`

### [CommentBoard.astro](/Users/wen/Documents/dev/blog/apps/web/src/components/CommentBoard.astro)

用途：

- 貼文詳頁留言區

特性：

- 留言列表
- 留言表單
- 已做過密度收緊

### [EntryEngagement.astro](/Users/wen/Documents/dev/blog/apps/web/src/components/EntryEngagement.astro)

用途：

- clap / comment / view 顯示與互動

## 頁面責任切分

### [index.astro](/Users/wen/Documents/dev/blog/apps/web/src/pages/index.astro)

- 首頁雙欄
- 最新動態 + 最新文章

### [about.astro](/Users/wen/Documents/dev/blog/apps/web/src/pages/about.astro)

- profile
- 最近動態

### [stream.astro](/Users/wen/Documents/dev/blog/apps/web/src/pages/stream.astro)

- 動態河道
- 使用 `PostFeedCard`

### [articles.astro](/Users/wen/Documents/dev/blog/apps/web/src/pages/articles.astro)

- 文章索引
- 側欄 profile / category / 熱門標籤

### [search.astro](/Users/wen/Documents/dev/blog/apps/web/src/pages/search.astro)

- 搜尋頁
- 類型切換
- 熱門標籤與分類捷徑

### [c/[category].astro](/Users/wen/Documents/dev/blog/apps/web/src/pages/c/[category].astro)

- category archive

### [tags/[slug].astro](/Users/wen/Documents/dev/blog/apps/web/src/pages/tags/[slug].astro)

- tag archive
- 目前以 article 聚合為主

### [post/[slug].astro](/Users/wen/Documents/dev/blog/apps/web/src/pages/post/[slug].astro)

- 動態詳頁
- Markdown 內容
- 留言
- code copy

### [article/[slug].astro](/Users/wen/Documents/dev/blog/apps/web/src/pages/article/[slug].astro)

- 文章詳頁
- Markdown / KaTeX / callouts / figures
- 上一篇 / 下一篇
- code copy

## Markdown 相關

### [markdown.ts](/Users/wen/Documents/dev/blog/apps/web/src/lib/markdown.ts)

目前支援：

- GFM
- raw HTML
- 數學公式
- callouts
- heading anchors
- figure / figcaption
- code highlight

這是文章與貼文詳頁最核心的轉譯層。

## 資料層

### [data.ts](/Users/wen/Documents/dev/blog/apps/web/src/lib/data.ts)

負責：

- API fetch
- service binding fallback
- 簡單快取
- entries / metrics / assets / tags / search / profile / comments 取數

### [presenters.ts](/Users/wen/Documents/dev/blog/apps/web/src/lib/presenters.ts)

負責：

- 把 raw entry 轉成 `EntryCardViewModel`
- category/type label
- excerpt/title fallback
- cover / metrics 組裝
