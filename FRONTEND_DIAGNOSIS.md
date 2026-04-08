# 🔍 前端顯示問題診斷報告 - 2026年4月8日

## ✅ 已確認正常的部分

### 1. API 層（✅ 完全正常）
```
GET https://personal-blog-api.personal-blog.workers.dev/api/entries?type=post&visibility=public
返回: 2 筆 post 資料 ✅

GET https://personal-blog-api.personal-blog.workers.dev/api/entries?type=article&visibility=public
返回: 0 筆 article 資料 ✅
```

### 2. 前端配置（✅ 完全正確）
- ✅ `PUBLIC_API_URL` = `https://personal-blog-api.personal-blog.workers.dev` (不含 `/api`)
- ✅ `apps/web/src/lib/data.ts` 中 fetch 路徑正確: `${API_BASE}/api/entries?type=post&visibility=public`
- ✅ 快取時間優化: posts 30 秒，articles 5 分鐘
- ✅ 錯誤處理有 console.error

### 3. 首頁邏輯（✅ 正確調用）
- ✅ `index.astro` 正確調用 `getPosts()` 和 `getArticles()`
- ✅ 邏輯完整無誤

---

## 🔴 發現的問題

### 問題 #1: 數據編碼問題
```
實際返回:
"title":"\"æ¸¬è©¦å¾ Discord ç¼å¸çå§å®¹\""

應該是:
"title":"測試從 Discord 發布的內容"
```

**根因**: 標題被雙重 JSON 編碼 (有多餘的 `\"` 包圍)

**影響**: 即使顯示，標題也會顯示成 `"測試..."` 帶引號

### 問題 #2: Pages 部署可能失敗
```
404 Not Found: https://personal-blog-5th.pages.dev/
404 Not Found: https://25d6748d.personal-blog-5th.pages.dev/
```

**根因**: Astro SSR 在 Pages 上可能配置有問題

---

## 🔧 立即修復方案

### 第一優先：修復雙重編碼

在 `apps/api/src/discord/interactions.ts` 中檢查 `content` 提取：

```typescript
// 現在:
const contentOption = data.options?.find((opt: any) => opt.name === 'content')
const content = contentOption?.value || ''

// 檢查是否 content 被 JSON 編碼了
// 如果是，應該:
let content = contentOption?.value || ''
if (typeof content === 'string' && content.startsWith('"') && content.endsWith('"')) {
  content = JSON.parse(content)
}
```

### 第二優先：測試 Pages 部署

```bash
# 在 apps/web 目錄執行:
npm run build
wrangler pages deploy dist --project=personal-blog
```

然後訪問主域名測試

---

## 📋 下一步診斷步驟

1. **修復編碼問題後**，重新發送一條 Discord 命令測試
2. **確認 API 返回的標題不帶引號**
3. **確認 Pages 頁面能訪問**
4. **檢查瀏覽器控制台是否有錯誤**

---

## 🎯 結論

**當前狀態**:
- ✅ Discord → API → DB 流程正常
- ✅ API 接口正常
- ✅ 前端配置正確
- ❌ Pages 部署有 404 問題 或 數據顯示問題

**最可能的修復順序**:
1. 修復數據雙重編碼問題
2. 重新部署 API
3. 修復或重新部署 Pages
4. 驗證頁面實際顯示

