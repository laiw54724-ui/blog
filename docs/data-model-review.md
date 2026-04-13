# 資料模型現況與優化建議

這份文件專注描述目前專案的資料是怎麼分的、為什麼這樣分、以及接下來比較合理的優化方向。

它不是 schema 完整逐欄對照表，而是偏系統設計視角的整理。

---

## 總覽

目前專案其實有兩套主資料模型：

1. `entries`
2. `reading_entries`

兩者不是重複，而是各自承擔不同心智：

- `entries`
  - 面向「公開出版內容」
  - 服務貼文、文章、留言、拍手、封面、tag archive、搜尋、詳頁
- `reading_entries`
  - 面向「閱讀清單與作品紀錄」
  - 服務閱讀狀態、評分、閱讀日期、短評、詳細心得、書單管理

這個拆法本身是合理的，問題不在「拆開」，而在於兩套系統之間目前還缺少正式橋接層。

---

## 目前資料怎麼分

## `entries`

定義位置：
- [schema.sql](/Users/wen/Documents/dev/blog/db/schema.sql)
- [db.ts](/Users/wen/Documents/dev/blog/packages/shared/src/db.ts)

### 這張表在做什麼

`entries` 是網站的主內容表，承接公開內容生命週期。

核心欄位：

- `entry_type`
  - `post | article`
- `category`
  - `journal | reading | travel | place`
- `status`
  - `inbox | draft | published | private | archived`
- `visibility`
  - `private | unlisted | public`
- `title`
- `content_markdown`
- `excerpt`
- `slug`

這套資料模型的重點不是「這是什麼作品」，而是「這是一篇要不要公開、怎麼呈現、能不能互動的內容」。

### 它已經有的周邊能力

- `tags` + `entry_tags`
- `assets`
- `entry_metrics`
- `comments`
- `entry_relations`
- `user_profile`

所以 `entries` 已經是一個完整的出版內容系統骨架。

---

## `reading_entries`

定義位置：
- [migrate-reading.sql](/Users/wen/Documents/dev/blog/db/migrate-reading.sql)
- [reading-db.ts](/Users/wen/Documents/dev/blog/packages/shared/src/reading-db.ts)

### 這張表在做什麼

`reading_entries` 比較像閱讀紀錄或作品資料庫。

核心欄位：

- `title`
- `author`
- `genre`
- `medium`
- `read_status`
  - `completed | ongoing | dropped`
- `score`
- `read_at`
- `short_review`
- `detail_review`
- `blurb`
- `tags`（JSON）
- `links`（JSON）
- `has_detail`

這套資料模型的重點不是一篇公開文章，而是：

- 我看了什麼
- 什麼狀態
- 我怎麼評價
- 有沒有完整心得

### 它比較像什麼

- Goodreads / AniList / 個人書單
- 作品資料庫
- 閱讀日誌

而不是一般 CMS 裡的 post/article。

---

## 為什麼這樣分是合理的

這種拆法合理，因為「一筆閱讀紀錄」和「一篇公開文章」不是同一件事。

例如：

- 你可以記一本書讀完了，但不一定想寫文章
- 你可以先打短評，之後再補長心得
- 你可能想維護閱讀狀態，但不想讓它立刻成為公開內容

如果把這些全部硬塞進 `entries`，會出現兩個問題：

1. `entries` 會被很多閱讀專用欄位污染
2. 閱讀清單和公開出版流程會互相干擾

所以目前「雙表」方向是對的。

---

## 目前最主要的設計斷點

## 1. tag 系統斷成兩套

`entries` 的 tag 是正規化關聯：

- `tags`
- `entry_tags`

`reading_entries` 的 tag 則是：

- `tags TEXT`，裡面存 JSON string array

這會導致：

- reading 的 tag 很難參與公開 tag archive
- reviews 頁要混 reading 時，過濾會變得分散
- 之後如果做 locked tags，很難在 DB 層乾淨判斷
- 前端與 Discord 很容易各自做一套 normalize/filter

這是目前最值得優先優化的地方。

---

## 2. 公開互動模型只完整存在於 `entries`

`entries` 有：

- comments
- metrics
- assets
- relations

`reading_entries` 沒有這些正式關聯。

所以當 reading 心得開始想被放進：

- `/series/reviews`
- 評論書摘列表
- tag / 系列頁

就會開始遇到混合資料的問題：

- 哪些欄位可顯示
- 有沒有互動數
- 是否算公開內容
- 搜尋要不要收進來

這不是 schema 錯，而是代表需要一層「公開閱讀內容」橋接查詢。

---

## 3. 前台已經開始混用兩套內容，但 query 層還沒正式抽象

目前前台已經出現這種需求：

- reading 心得屬於評論書摘的一部分
- 但 reading 詳頁仍然走 `/reading/[slug]`
- reviews 系列頁又希望一起看得到

這表示產品心智正在往：

- 資料上分開
- 呈現上聚合

移動。

這種方向沒有問題，但要靠正式 query/presenter 層支撐，不能讓每個頁面自己拼。

---

## 我會怎麼優化

## 優先 1：先統一 tag 規格，不急著統一內容表

最應該先做的不是合併 `entries` / `reading_entries`，而是統一 tag。

### 建議方向

第一階段：

- 保留 `reading_entries.tags` 寫入方式
- 但新增一層共用 helper，所有 reading tag 都先 normalize 後再存
- 前端 / Discord / API 都只走同一套 normalize 邏輯

第二階段：

- 新增 `reading_entry_tags` 關聯表
- 將 `reading_entries.tags` 逐步視為 cache 或過渡欄位

這樣做的好處：

- 不會一下重構太大
- 但可以先讓 reading tag 能被穩定查詢
- 之後 locked tags、公開 tag 列表、reviews 篩選都好接

---

## 優先 2：建立「公開閱讀內容」橋接層

不要把所有 reading 都直接塞進 `entries`，而是加一層 query model。

例如概念上可以有：

- `getPublicReviewContent()`
- `getReviewSeriesContent()`
- `getPublicTaggableContent()`

這層負責把：

- `entries` 裡的 article
- `reading_entries` 裡有 `has_detail = 1` 的心得

整合成一個前台可用的 view model。

### 這樣的好處

- schema 不用先硬合併
- reviews 頁、文章頁、搜尋頁可以共用查詢結果
- 鎖定規則與 tag 過濾可以集中處理

---

## 優先 3：把存取控制放在 tag / visibility policy，而不是再開新表

你之後想做的「整組上鎖」很適合依附在 tag policy 上。

我建議不要新增另一套「locked_entries」之類的表，第一版先做成：

- 定義一組 locked tag slugs
- 只要內容命中這些 tag，就套用保護規則
- 在公開 tag cloud / 熱門標籤 / tag archive 中排除
- 在詳頁進行密碼檢查

這樣：

- 規則來源單一
- 和 tag 流程自然相容
- 不會把權限系統做成第三套模型

---

## 我不建議現在做的事

## 1. 不建議現在合併 `entries` 與 `reading_entries`

理由：

- 兩套生命週期真的不同
- 會讓 schema 一次變很大
- 目前主要痛點是交界，不是本體

## 2. 不建議先做完整權限系統

目前需求比較像：

- 簡單密碼保護
- tag-based gating

不是帳號系統、ACL、多人角色權限。

先做足夠簡單的方案比較適合。

## 3. 不建議讓每個頁面自己判斷 reading 是否算 article

這會讓邏輯散到：

- `/articles`
- `/series/reviews`
- `/tags`
- `/search`

之後很難一致。

---

## 建議的演進順序

### Phase 1

- `/動態` 改成真正無標題發文
- reading Discord 流程補 tag
- `/書單` 補管理按鈕

這一階段的目標是把創作與維護流程補齊。

### Phase 2

- 整理 reading tag normalize 規則
- 修正公開 tag 列表只顯示真正有公開內容的 tag
- reviews 頁正式吃進 reading 心得

這一階段的目標是把公開呈現規則變一致。

### Phase 3

- 定義 locked tag policy
- 被鎖 tag 的內容套上簡單密碼
- 從公開 tag cloud / archive 排除被鎖 tag

這一階段才處理存取限制。

### Phase 4

- 如有需要，再把 reading tag 過渡到正規化關聯表
- 抽共用 review query layer

這一階段才是資料模型深化。

---

## 總結

目前的資料設計不是亂，而是：

- `entries` 負責公開出版內容
- `reading_entries` 負責閱讀資料庫

這個大方向是好的。

真正需要優化的不是「重做 schema」，而是：

- 統一 tag
- 補上查詢橋接
- 讓公開規則集中

只要把這三件事補起來，現在這個雙模型架構其實可以撐很久，而且比硬合併安全得多。
