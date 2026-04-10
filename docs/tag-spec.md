# Tag Spec V2

這份文件定義目前專案正式採用的 tag 規格，讓 Discord、API、shared layer、web 前端都走同一套規則。

## 1. 兩層模型

- `結構 tag`
  - 用固定群組管理，適合做導覽、聚合、推薦與 UI 分組。
  - 目前官方群組只有：
    - `genre`
    - `tone`
    - `setting`
    - `relationship`
    - `topic`

- `自由 tag`
  - 不在官方結構表內的 tag，一律保留為自由 tag。
  - 自由 tag 不會被硬塞進結構群組，但仍可搜尋、顯示、統計。

## 2. 正規化規則

- 已知別名會轉成官方 structured slug
  - `proof` -> `topic:proof`
  - `travel` -> `setting:travel`
  - `BL` -> `genre:bl`

- 已明確輸入的官方 structured tag 會保留群組
  - `tone:healing` -> `tone:healing`
  - `relationship:year-gap` -> `relationship:year-gap`

- 只有官方群組前綴才算 structured
  - `genre:*`
  - `tone:*`
  - `setting:*`
  - `relationship:*`
  - `topic:*`

- 不在官方群組中的 `group:value` 不自動升格為 structured
  - `mood:soft` 目前視為自由 tag

- 沒命中的輸入保留成自由 tag
  - `閱讀筆記` -> `閱讀筆記`
  - `GKR-Proof` -> `gkr-proof`

## 3. 實作位置

- 正式 spec 與 helper： [packages/shared/src/tags.ts](/Users/wen/Documents/dev/blog/packages/shared/src/tags.ts)
- 輸入正規化： `normalizeTagInput()`
- 分類 structured / free： `classifyTags()`
- 分組顯示： `groupStructuredTags()`

## 4. 使用原則

- Discord 建立內容時：
  - 先吃 preset 預設 tag
  - 再合併手動輸入 tag
  - 最後統一走 shared 正規化

- 前端顯示時：
  - 優先用 structured group 做區塊導覽
  - 自由 tag 放在 `Other`

- 內容模型上：
  - structured tag 是官方導航語彙
  - 自由 tag 是作者自由補充語彙

## 5. 擴充方式

- 要新增官方 structured tag，直接修改 [packages/shared/src/tags.ts](/Users/wen/Documents/dev/blog/packages/shared/src/tags.ts) 的 `STRUCTURED_TAGS`
- 要新增官方群組，必須同步更新：
  - `TagGroupKey`
  - `STRUCTURED_TAG_GROUP_ORDER`
  - 前端 group label
  - 文件
