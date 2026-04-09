# Discord 指令與互動規格

## 1. 設計原則

- Discord 是主要輸入介面
- 不做重型 CMS 後台
- 優先支援「貼上就存」
- 長文與短文分流
- 所有公開行為都能回到 Discord 內完成

---

## 2. 主要使用情境

### 情境 A：快速短貼文

你剛喝完一家咖啡廳，想記一句話。

操作：

1. `/貼文`
2. 貼上內容
3. 選分類（可選）
4. 存檔

結果：

- 建立一筆 `post`
- 若公開，出現在 `/stream`

### 情境 B：長文文章

你從 iPhone 記事本貼上一整段旅記。

操作：

1. 貼到 Discord inbox 頻道
2. 對該訊息使用 `存成文章`

結果：

- 建立一筆 `article`
- 預設 draft
- 之後可按 `公開`

### 情境 C：貼文升格

你先寫了 3 則京都旅行貼文，之後想整成一篇。

操作：

1. 在任一貼文預覽卡點 `升格成文章`
2. 選是否合併相關貼文

結果：

- 建立 article draft
- 建 relation 到原貼文

---

## 3. Slash Commands

## `/貼文`

### 用途

快速建立短貼文。

### 欄位

- `content` 必填，多行文字
- `category` 選填：journal / reading / travel / place
- `visibility` 選填：private / unlisted / public
- `tags` 選填，逗號分隔

### 預設規則

- 若 category = journal，visibility 預設 private
- 其餘預設 public 或 unlisted

---

## `/文章`

### 用途

建立長文草稿。

### 欄位

- `title` 選填
- `content` 必填
- `category` 必填
- `visibility` 選填，預設 private 或 draft

### 系統行為

- 建立 `entry_type = article`
- 狀態預設 `draft`

---

## `/旅記`

### 用途

快速建立旅行相關內容。

### 欄位

- `content`
- `city`
- `country`
- `visited_at`
- `visibility`

### 系統行為

- category 自動為 `travel`
- AI 可抽景點與交通 tags

---

## `/書摘`

### 用途

快速建立讀書內容。

### 欄位

- `book_title`
- `book_author`
- `quote_or_note`
- `reflection`
- `visibility`

### 系統行為

- category 自動為 `reading`
- 若內容較短，先建成 post
- 若反思較長，可直接建成 article

---

## `/探店`

### 用途

記錄餐廳 / 咖啡廳。

### 欄位

- `place_name`
- `city`
- `rating`
- `content`
- `visited_at`
- `revisit`
- `visibility`

### 系統行為

- category 自動為 `place`
- 可抽出：咖啡、甜點、安靜、適合工作、排隊等 tags

---

## `/公開`

### 用途

把 draft / private 內容轉成 public。

### 欄位

- `entry_id` 或由互動卡觸發

---

## `/重跑ai`

### 用途

重新跑分類、tag、摘要。

### 欄位

- `entry_id`

---

## 4. Message Commands

## `存成貼文`

對一則訊息執行。

### 適合

- 短日記
- 即時感想
- 小評論

### 行為

- 讀取目標訊息內容
- 存為 post
- 保留 source_message_id

## `存成文章`

對一則訊息執行。

### 適合

- 長文
- 記事本貼上內容
- txt / md 附件

### 行為

- 讀取訊息文字或附件
- 存為 article draft

## `升格成文章`

對既有貼文或來源訊息執行。

### 行為

- 根據內容建立新 article draft
- 保留 relation：derived_from

---

## 5. 回覆卡片規格

### 成功存檔後

Bot 應回一張 preview card：

- 類型：貼文 / 文章
- 分類：日記 / 讀書 / 旅行 / 地點
- 標題：原標題或 AI 建議
- tags：3~5 個
- 狀態：draft / published / private
- 入口：查看網站連結（若已公開）

### 卡片按鈕

- `公開`
- `保持草稿`
- `改分類`
- `改標題`
- `升格成文章`

---

## 6. 長文處理策略

### 原則

不要把 modal 當唯一入口。

### 短中篇

- 用 slash command modal

### 長文

- 直接貼到 inbox 頻道
- 或上傳 `.txt` / `.md`
- 再使用 message command 存檔

這樣可以避開單次表單輸入的壓力，也更接近真實寫作流程。

---

## 7. 權限與頻道建議

### 建議頻道

- `#inbox`：貼上原始內容
- `#bot-log`：只看 bot 存檔與錯誤
- `#preview`：可選，用於回傳預覽

### 權限

- bot 可讀取 `#inbox`
- bot 可回覆 interaction
- 若未來只有你自己用，可先設私人伺服器
