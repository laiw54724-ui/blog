# Discord 指令與互動規格

這份文件只記錄**目前已存在**的 Discord 入口、互動流程與資料落點。

## 設計定位

- Discord 是內容輸入入口，不是完整 CMS。
- 目前以**單作者**使用情境為主。
- 快速輸入在 Discord 完成，整理與閱讀在網站完成。
- Slash command 以 modal 為主，避免 command option 對長文輸入不友善。

## 目前已註冊的 Slash Commands

### `/貼文`

- 目的：快速新增一則公開動態
- 內部 key：`post`
- 預設資料：
  - `entry_type = post`
  - `category = journal`
  - `status = published`
  - `visibility = public`

### `/文章`

- 目的：新增一篇文章草稿
- 內部 key：`article`
- 預設資料：
  - `entry_type = article`
  - `category = journal`
  - `status = draft`
  - `visibility = private`

### `/旅記`

- 目的：快速新增旅遊動態
- 內部 key：`travel`
- 預設資料：
  - `entry_type = post`
  - `category = travel`
  - `status = published`
  - `visibility = public`

### `/書摘`

- 目的：新增讀書文章
- 內部 key：`reading`
- 預設資料：
  - `entry_type = article`
  - `category = reading`
  - `status = published`
  - `visibility = public`

### `/我的文章`

- 目的：列出最近文章，並透過按鈕進行後續操作
- 內部 key：`list`
- 互動方式：
  - 先回 Discord deferred ephemeral response
  - 再用 follow-up message 顯示最近內容與操作按鈕

### `/附圖`

- 目的：對既有 entry 補上圖片
- 內部 key：`attach`
- 參數：
  - `slug`：目標文章 slug
  - `image`：Discord attachment
  - `alt`：可選圖片說明
- 行為：
  - 下載 Discord CDN 附件
  - 上傳到 R2
  - 建立 `assets` 記錄
  - 第一張圖可自動成為 `cover`

### `/個人資料`

- 目的：更新個人名稱、簡介與 links JSON
- 互動方式：開 modal
- 寫入表：`user_profile`

### `/設定頭貼`

- 目的：上傳個人頭貼
- 參數：
  - `image`
- 行為：
  - 上傳到 R2 `profile/avatar.*`
  - 更新 `user_profile.avatar_key`

### `/設定橫條`

- 目的：上傳個人頁橫條
- 參數：
  - `image`
- 行為：
  - 上傳到 R2 `profile/banner.*`
  - 更新 `user_profile.banner_key`

## Modal 規格

### 建立內容 Modal

由以下指令共用：

- `/貼文`
- `/文章`
- `/旅記`
- `/書摘`

欄位：

- `title`
  - 選填
  - 留空會從內容推導
- `content`
  - 必填
  - 多行文字

### 個人資料 Modal

欄位：

- `name`
- `bio`
- `links`

`links` 目前預期為 JSON 字串，例如：

```json
[{"label":"GitHub","url":"https://github.com/yourname"}]
```

## Component / Button 流程

`/我的文章` 的 follow-up 會觸發 component handler。

目前 handler 位於：

- [handlers/list.ts](/Users/wen/Documents/dev/blog/apps/api/src/discord/handlers/list.ts)
- [handlers/component.ts](/Users/wen/Documents/dev/blog/apps/api/src/discord/handlers/component.ts)
- [handlers/modal.ts](/Users/wen/Documents/dev/blog/apps/api/src/discord/handlers/modal.ts)

目前支援的互動包含：

- 開啟編輯 modal
- 典藏 / 刪除確認
- 批次選取最近內容

這一段屬於現有功能，但未來仍會繼續拆小與整理型別。

## 內容建立流程

### 1. Slash command 進來

- 驗證 Discord 簽名
- 解析指令名稱
- 依 `CHINESE_TO_ENGLISH_COMMAND_MAP` 轉內部 key

### 2. 建立內容

透過：

- [createEntry.ts](/Users/wen/Documents/dev/blog/apps/api/src/discord/createEntry.ts)

目前行為：

- 自動正規化內容換行
- 自動抽標題
- 自動產生唯一 slug
- 自動從內容抽 `#hashtag`
- 建立 `entries`
- 若有 hashtag，建立 `tags` 與 `entry_tags`

## 附件處理流程

透過：

- [attachments.ts](/Users/wen/Documents/dev/blog/apps/api/src/discord/attachments.ts)

目前支援：

- Markdown / text 附件讀成文字
- 圖片附件上傳到 R2
- 建 `cover` / `image` 類型資產

目前限制：

- 多圖仍偏「補圖」流程，不是完整圖文後台
- 圖片排序與顯示模式還沒有獨立 admin UI

## 寫入的主要資料表

- `entries`
- `tags`
- `entry_tags`
- `assets`
- `user_profile`
- `entry_metrics`

## 目前沒有的功能

以下概念還在規劃中，尚未在 Discord 端落地：

- `/公開`
- `/重跑ai`
- `distribution_scope`
- `post_style`
- `display_mode`
- 多人站點 / 多作者權限
- Discord 直接進完整編輯後台

## 更新 Discord 指令

本機註冊腳本：

- [register-commands.ts](/Users/wen/Documents/dev/blog/apps/api/src/scripts/register-commands.ts)

常用指令：

```bash
cd /Users/wen/Documents/dev/blog
npm run register-commands --workspace=apps/api
```

需要的環境變數：

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID` 或 `DISCORD_APPLICATION_ID`
- `DISCORD_GUILD_ID` 可選

## 下一步建議

如果要往你規劃的「Discord 快入口 + web 輕後台」前進，Discord 規格下一步最值得做的是：

1. 發文成功後回傳 web 編輯連結
2. `/附圖` 支援更好的多圖流程
3. 將 `tags` 從自由 hashtag 逐步過渡到結構化前綴
4. 將 `post_style` / `distribution_scope` 正式納入建立與編輯流程
