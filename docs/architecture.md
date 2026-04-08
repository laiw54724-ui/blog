# 個人雙河道網站 MVP 架構

## 1. 產品定位

這是一個以 **Discord 為收件匣**、以 **自架網站為閱讀器** 的個人出版系統。

核心是雙河道：

- **動態河道 Stream**：像 FB / IG / X 的貼文流，承接日常短記、書摘、旅途中即時感想、餐廳咖啡短評。
- **文章河道 Articles**：像部落格，承接整理過的評論、旅記、讀書心得、長篇日記。

### 核心原則

1. **先收，再整理**：先把內容收進系統，不逼當下完整整理。
2. **同內容雙生命週期**：貼文可以升格成文章。
3. **預設安全**：日記與未整理內容預設私人或草稿。
4. **手機優先**：Discord 負責輸入，網站負責閱讀。
5. **AI 可開關**：AI 是整理加速器，不是唯一依賴。

---

## 2. 推薦技術棧

### 前端站點
- **Astro**
- 部署到 **Cloudflare Pages**

理由：
- 閱讀型網站速度快
- 靜態頁面成本低
- 易於做兩種不同的閱讀版型

### API / Bot 後端
- **Cloudflare Workers**
- 建議搭配 **Hono** 做 API routing

理由：
- 輕量、便宜
- 適合處理 Discord interaction webhook
- 易於串 D1 / R2 / AI provider

### 資料儲存
- **Cloudflare D1**：文章、貼文、分類、tag、關聯
- **Cloudflare R2**：圖片與附件

### AI 層
- Provider 抽象化，先做 `AI_ENABLED` feature flag
- 初期只做：
  - 分類
  - tag 建議
  - 標題建議
  - 摘要
  - 升格文章建議

---

## 3. 系統總覽

```mermaid
flowchart TD
    A[iPhone 記事本 / Discord 手機端] --> B[Discord Slash Commands / Message Commands]
    B --> C[Cloudflare Worker API]
    C --> D{AI 開關}
    D -->|ON| E[AI 分類 / tags / 摘要 / 升格建議]
    D -->|OFF| F[規則式分類 / hashtag parser]
    E --> G[(D1)]
    F --> G
    C --> H[(R2 圖片)]
    G --> I[Astro 網站]
    H --> I
    I --> J[/stream 動態河道]
    I --> K[/articles 文章河道]
    I --> L[/map 地點索引]
    G --> M[RSS / JSON feed / sitemap]
```

---

## 4. 內容生命週期

### A. 快速貼文
1. 你用 `/貼文` 或把內容貼到 Discord inbox。
2. Worker 收到 interaction 或 message command。
3. 若 AI 開啟，執行分類、tag、摘要。
4. 存成 `entry_type = post`。
5. 狀態預設 `published` 或 `draft`，依類型決定。
6. 出現在 `/stream`。

### B. 文章草稿
1. 你用 `/文章` 或對某則長訊息使用 `存成文章`。
2. 存成 `entry_type = article`。
3. 預設 `draft`。
4. 之後可在 Discord 直接按 `公開`。
5. 公開後出現在 `/articles`。

### C. 升格成文章
1. 你對貼文按下 `升格成文章`。
2. 系統建立新的 article draft。
3. 原貼文與文章建立 relation。
4. 可選擇合併多篇相關貼文。

---

## 5. 內容模型

### 兩大維度

#### entry_type
- `post`
- `article`

#### category
- `journal`
- `reading`
- `travel`
- `place`

### 狀態
- `inbox`
- `draft`
- `published`
- `private`
- `archived`

### 可見性
- `private`
- `unlisted`
- `public`

---

## 6. 網站資訊架構

### 主要導覽
- `/` 首頁
- `/stream` 動態河道
- `/articles` 文章河道
- `/journal` 日記
- `/reading` 讀書
- `/travel` 旅行
- `/places` 餐廳 / 咖啡 / 地點
- `/map` 地圖模式
- `/tags/[tag]` 主題頁
- `/search` 搜尋

### 首頁設計

#### Hero 區
- 一句簡短自我介紹
- 兩個 CTA：
  - 看最新動態
  - 看整理文章

#### 雙欄主體
- 左：最新動態
- 右：最新文章

#### 內容入口
- 日記
- 讀書
- 旅行
- 餐廳咖啡

---

## 7. Discord UX 設計

### Slash Commands
- `/貼文`
- `/文章`
- `/旅記`
- `/書摘`
- `/探店`
- `/公開`
- `/重跑ai`

### Message Commands
- `存成貼文`
- `存成文章`
- `升格成文章`

### 存檔回覆卡
每次寫入後，bot 回一張 preview card：
- 類型
- 分類
- 標題建議
- tag 建議
- 狀態
- 可見性

按鈕只放：
- 公開
- 保持草稿
- 改分類
- 改標題
- 升格成文章

---

## 8. AI 功能邊界

### AI 開啟時
- 判斷 `entry_type`
- 判斷 `category`
- 產生 3-5 個 tags
- 產生摘要
- 建議標題
- 從內容抓結構化欄位
- 對公開內容做隱私提醒

### AI 關閉時
- 以規則處理：
  - 取第一段為摘要
  - 抽 `#hashtag`
  - 用 command 類型決定 category

---

## 9. 專案目錄建議

```txt
repo/
  apps/
    web/                # Astro public site
    api/                # Cloudflare Worker / Hono
  packages/
    shared/             # types / zod schema / utils
  db/
    schema.sql
    seeds.sql
  docs/
    architecture.md
    discord-spec.md
    routes.md
```

---

## 10. MVP 開發順序

### Phase 1: 核心骨架
- [ ] 建 Cloudflare Worker
- [ ] 設 Discord interaction endpoint
- [ ] 建 D1 schema
- [ ] 建 Astro 網站首頁
- [ ] 做 `/stream` 與 `/articles`

### Phase 2: 內容寫入
- [ ] `/貼文`
- [ ] `/文章`
- [ ] `存成文章` message command
- [ ] 預覽卡與公開按鈕

### Phase 3: AI 與升格
- [ ] AI feature flag
- [ ] 自動分類 / tags / 摘要
- [ ] `升格成文章`
- [ ] 關聯多篇貼文

### Phase 4: UX 補強
- [ ] `/places`
- [ ] `/map`
- [ ] tag 頁
- [ ] 搜尋
- [ ] RSS / sitemap

---

## 11. 首版成功標準

### 你每天真的會用它的條件
- 從記事本貼到 Discord 不痛苦
- 長文不會因字數而卡住
- 貼文與文章都能漂亮閱讀
- 餐廳 / 咖啡 / 旅遊能用地點串起來
- AI 開關不影響基本使用

### MVP 完成定義
- 可以從 Discord 發一則貼文到 `/stream`
- 可以把一段長文存成文章草稿
- 可以把貼文升格成文章
- 網站手機版閱讀舒服

