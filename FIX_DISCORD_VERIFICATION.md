# 🔧 修復 Discord Interactions Endpoint 驗證

**問題**: Discord Developer Portal 中 Interactions Endpoint URL 沒有綠色勾勾

**狀態**: ❌ Discord 無法驗證 endpoint，所以沒有發送任何命令

---

## ✅ 解決步驟

### Step 1: 清空 Interactions Endpoint URL (臨時)

1. 打開: https://discord.com/developers/applications/1491052368626843668
2. **General Information**
3. 找到 **互動端點 URL** 欄位
4. **清空**該欄位 (刪除 URL)
5. **保存**

---

### Step 2: 驗證 API 是否在線

執行:
```powershell
curl https://personal-blog-api.personal-blog.workers.dev/api/health
```

應該返回:
```json
{"status":"ok","timestamp":"..."}
```

✅ 如果看到這個，API 是活的

---

### Step 3: 重新設置 Interactions Endpoint URL

1. 打開: https://discord.com/developers/applications/1491052368626843668
2. **General Information**
3. 在 **互動端點 URL** 欄位中填入:
   ```
   https://personal-blog-api.personal-blog.workers.dev/api/discord/interactions
   ```
4. **按保存按鈕**
5. **等待驗證** - Discord 會發送 PING 請求

---

### Step 4: 驗證成功的跡象

✅ **成功**:
- [ ] URL 欄位旁邊出現**綠色勾勾** ✓
- [ ] 儲存後頁面沒有錯誤訊息

❌ **失敗**:
- [ ] URL 欄位旁邊出現**紅色 X** ✗
- [ ] 看到錯誤訊息

---

## 🚨 如果驗證失敗

### 可能原因 1: API 沒有回應

**檢查**:
```powershell
# 測試 API
curl https://personal-blog-api.personal-blog.workers.dev/api/health

# 檢查 Workers 日誌
wrangler tail personal-blog-api
```

### 可能原因 2: 簽名驗證有問題

**檢查** `apps/api/src/index.ts`:

確保簽名驗證在 PING 之前進行：

```typescript
// ✅ 正確的順序:
1. 驗證簽名
2. 解析 payload
3. 檢查 type === 1 (PING)
4. 返回 { type: 1 }
```

### 可能原因 3: API 超時

Discord 有 3 秒超時限制。確保 PING 回應不涉及資料庫查詢。

---

## 🎯 驗證成功後

一旦看到綠色勾勾，就可以：

1. 在 Discord 執行 `/貼文 content: "測試"`
2. 檢查網站是否顯示內容
3. 驗證一切正常

---

## 📝 完整檢查清單

- [ ] API 健康檢查返回 200
- [ ] Interactions Endpoint URL 已填入
- [ ] Discord 驗證成功（綠色勾勾）
- [ ] 第一個 Discord 命令已發送
- [ ] 內容出現在網站上

---

**下一步**: 按照上述步驟操作，然後告訴我 Discord 中 Interactions Endpoint 旁邊是否出現綠色勾勾
