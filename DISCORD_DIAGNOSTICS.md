# 🔍 Discord 整合診斷清單

**問題**: Discord 命令發送後，內容未出現在網站上

---

## 🚨 診斷步驟

### Step 1: 驗證 Interactions Endpoint 配置 ⚠️

**在 Discord Developer Portal 檢查**:

1. 打開: https://discord.com/developers/applications/1491052368626843668
2. 左側選單 → **General Information**
3. 找到 **INTERACTIONS ENDPOINT URL** 欄位
4. **檢查**:
   - [ ] URL 是否正確? `https://personal-blog-api.personal-blog.workers.dev/api/discord/interactions`
   - [ ] URL 旁邊有綠色勾勾嗎? (表示 Discord 已驗證)
   - [ ] 如果是紅色 X，表示驗證失敗

**如果驗證失敗**:
```
可能的原因:
1. API 伺服器沒有回應 PING
2. API 使用了錯誤的 Public Key
3. API 沒有正確返回 PING 回應
```

---

### Step 2: 檢查 API 日誌 ⚠️

**執行**:
```powershell
wrangler tail personal-blog-api --lines 50
```

**查看**:
- 是否有 POST 請求到 `/api/discord/interactions`?
- 請求返回了什麼狀態碼?
- 有沒有錯誤訊息?

---

### Step 3: 測試 PING 回應

**Discord 驗證 endpoint 時，會發送一個 PING 要求**

檢查 API 代碼是否正確處理:

```typescript
// interactions.ts 中應該有
if (payload.type === 1) {  // PING
  return c.json({ type: 1 })
}
```

✅ **這部分應該正常工作**

---

### Step 4: 測試完整的命令流程

**在 Discord 發送**:
```
/貼文 content: "🧪 診斷測試"
```

**同時執行**:
```powershell
wrangler tail personal-blog-api --lines 50
```

**觀察日誌中是否看到**:
1. POST 請求接收
2. 簽名驗證
3. 命令處理
4. 資料庫操作

---

## 🛠️ 常見問題排查

### 問題: Discord 顯示「應用程式未及時回應」

**原因**: API 沒有在 3 秒內回應

**檢查**:
- [ ] API 是否在線? `curl https://personal-blog-api.personal-blog.workers.dev/api/health`
- [ ] Interactions Endpoint URL 是否在 Discord 中驗證成功?
- [ ] API 代碼中有沒有長時間的操作阻止了回應?

**解決**: 確保立即回應 Discord (type 5), 背景處理資料庫

```typescript
// 應該立即回應
return c.json({ type: 5 }) // DEFERRED

// 背景執行資料庫操作
c.executionCtx?.waitUntil(async () => {
  // 資料庫操作
})
```

### 問題: 資料庫是空的 (total = 0)

**可能原因**:
1. ❌ Discord 沒有發送請求
2. ❌ 簽名驗證失敗
3. ❌ 資料庫操作失敗

**排查**:
- 檢查 API 日誌 (step 2)
- 驗證 Interactions Endpoint (step 1)
- 測試本地 API

### 問題: 網站上沒有看到新內容

**即使資料保存了也可能出現**:

**排查**:
```powershell
# 1. 檢查 API 端點是否返回資料
curl https://personal-blog-api.personal-blog.workers.dev/api/entries

# 2. 手動在資料庫插入測試資料
wrangler d1 execute personal-blog --remote --command \
  "INSERT INTO entries (id, title, slug, content_markdown, entry_type, category, status, visibility, created_at, updated_at) 
   VALUES ('test_123', 'Test Title', 'test-title', 'Test content', 'post', 'journal', 'published', 'public', datetime('now'), datetime('now'));"

# 3. 打開網站檢查
# https://584480c4.personal-blog-5th.pages.dev/stream
```

---

## 📋 完整檢查清單

執行以下命令並記錄結果:

```powershell
# 1. API 健康檢查
Write-Host "1️⃣  API 健康:"
curl https://personal-blog-api.personal-blog.workers.dev/api/health

# 2. 資料庫狀態
Write-Host "2️⃣  資料庫:"
wrangler d1 execute personal-blog --remote --command "SELECT COUNT(*) FROM entries;"

# 3. API 日誌 (最新 10 行)
Write-Host "3️⃣  最近日誌:"
wrangler tail personal-blog-api --lines 10
```

---

## 🎯 下一步

根據以上診斷結果，告訴我:

1. **Interactions Endpoint 在 Discord 中驗證是否成功?**
2. **API 日誌中看到有沒有 POST 請求?**
3. **如果有請求，返回什麼狀態碼?**

這樣我就能幫你精準定位問題！

---

**保存此檔案以供參考**
