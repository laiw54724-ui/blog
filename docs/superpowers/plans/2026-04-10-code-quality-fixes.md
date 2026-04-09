# Code Quality Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修復評分中發現的五個問題：search route 路由順序 bug、env 型別安全、DB middleware 重複、clap 節流、cover assets N+1。

**Architecture:** 依照風險由低到高、影響由大到小依序處理。每個 task 獨立且不相依，可以單獨 commit 和驗證。

**Tech Stack:** TypeScript, Hono, Cloudflare Workers, Vitest, D1 (SQLite)

---

## 修復順序總覽

| Task | 問題 | 影響 | 風險 |
|------|------|------|------|
| 1 | `GET /search` 路由被 `GET /:id` 遮蔽 | Critical bug，搜尋完全無效 | 低 |
| 2 | `interactions.ts` 大量 `as any` env | 型別安全，可能藏 typo | 低 |
| 3 | 每個 route 重複 db null check | 可讀性，維護負擔 | 低 |
| 4 | `/clap` 沒有 rate limiting | 安全性，可被刷量 | 低 |
| 5 | `getResolvedCoverAssetsMap` N+1 請求 | 效能，每張封面圖一次 HTTP | 中 |

---

## Task 1: 修復 /search 路由順序 bug

**Files:**
- Modify: `apps/api/src/routes/entries.ts`
- Test: `apps/api/src/__tests__/api.integration.test.ts`

**背景：** Hono 按照 `router.get()` 的**註冊順序**比對路由。`GET /:id` 在第 118 行，`GET /search` 在第 333 行。請求 `/search` 時 Hono 先遇到 `/:id`，id = `"search"`，查 DB 找不到就回 404。搜尋永遠不會執行。

- [ ] **Step 1: 寫失敗測試**

在 `apps/api/src/__tests__/api.integration.test.ts` 末尾加入：

```typescript
describe('GET /api/entries/search', () => {
  it('returns search results matching query', async () => {
    const db = createMockDb({ allResults: [sampleEntries[0]] });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries/search?q=hello', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual([sampleEntries[0]]);
    expect(body.count).toBe(1);
  });

  it('returns empty array when query is blank', async () => {
    const db = createMockDb({ allResults: [] });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries/search', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('returns 400 when query exceeds 100 chars', async () => {
    const db = createMockDb({ allResults: [] });
    const env = createMockEnv(db);
    const longQ = 'a'.repeat(101);
    const res = await makeRequest(`/api/entries/search?q=${longQ}`, env);

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain('too long');
  });
});
```

- [ ] **Step 2: 確認測試失敗**

```bash
cd /Users/wen/Documents/dev/blog
npm test -- --reporter=verbose 2>&1 | grep -A3 "search"
```

預期：`GET /api/entries/search` 測試全部 FAIL，因為 `/search` 被 `/:id` 攔截回 404。

- [ ] **Step 3: 移動 search handler 到 /:id 之前**

在 `apps/api/src/routes/entries.ts`，將第 332–362 行的整個 search handler（`// GET /api/entries/search?q=keyword` 到 `});`）**剪下**，貼到第 96 行（`// GET /api/entries/slug/:slug` 之前）。

移動後的路由順序應為：

```
router.get('/')              // line ~31
router.get('/metrics')       // line ~62
router.get('/search')        // ← 移到這裡 (新位置)
router.get('/slug/:slug')
router.get('/:id')
router.get('/:id/assets')
router.get('/:id/metrics')
router.put('/:id')
router.delete('/:id')
router.delete('/:id/hard')
router.post('/:id/clap')
router.post('/:id/view')
```

search handler 的程式碼本身不變，僅移動位置。

- [ ] **Step 4: 確認測試通過**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A3 "search"
```

預期：3 個 search 測試全 PASS。

- [ ] **Step 5: 跑全部測試確認無 regression**

```bash
npm test
```

預期：全部 PASS。

- [ ] **Step 6: Commit**

```bash
cd /Users/wen/Documents/dev/blog
git add apps/api/src/routes/entries.ts apps/api/src/__tests__/api.integration.test.ts
git commit -m "fix: move /search route before /:id to prevent shadowing"
```

---

## Task 2: 修復 interactions.ts 的 env 型別安全

**Files:**
- Modify: `apps/api/src/discord/interactions.ts`

**背景：** `interactions.ts` 用 `(c.env as any).DISCORD_PUBLIC_KEY` 等方式存取 env，繞過型別檢查，容易藏 typo。需要定義一個 `DiscordEnv` interface 並套用到 Hono context。

- [ ] **Step 1: 在 interactions.ts 頂部新增 DiscordEnv interface**

找到 `interactions.ts` 第 1 行，在 import 之後、`interface UserProfilePreviewRow` 之前，插入：

```typescript
interface DiscordEnv {
  DB: import('@cloudflare/workers-types').D1Database;
  ASSETS_BUCKET?: {
    get(key: string): Promise<{ body: BodyInit | null; httpMetadata?: { contentType?: string } } | null>;
    put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
  };
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID?: string;
  DISCORD_TOKEN?: string;
  EXECUTION_CTX?: ExecutionContext;
}
```

- [ ] **Step 2: 更新函式簽名**

將：
```typescript
export async function handleDiscordInteraction(c: Context) {
```

改為：
```typescript
export async function handleDiscordInteraction(c: Context<{ Bindings: DiscordEnv }>) {
```

- [ ] **Step 3: 替換所有 `(c.env as any)` 為 `c.env`**

全文替換下列模式（共 ~8 處）：

| 舊寫法 | 新寫法 |
|--------|--------|
| `(c.env as any).DISCORD_PUBLIC_KEY` | `c.env.DISCORD_PUBLIC_KEY` |
| `(c.env as any)?.DB` | `c.env.DB` |
| `(c.env as any)?.DISCORD_APPLICATION_ID` | `c.env.DISCORD_APPLICATION_ID` |
| `(c.env as any)?.DISCORD_TOKEN` | `c.env.DISCORD_TOKEN` |
| `(c.env as any)?.ASSETS_BUCKET` | `c.env.ASSETS_BUCKET` |
| `(c.executionCtx as any).waitUntil` | `(c.executionCtx as ExecutionContext).waitUntil` |

- [ ] **Step 4: 型別檢查**

```bash
cd /Users/wen/Documents/dev/blog
npm run typecheck
```

預期：0 errors。如有錯誤根據訊息調整 interface 定義。

- [ ] **Step 5: 跑測試**

```bash
npm test
```

預期：全部 PASS（此步驟為 runtime 無改變，僅型別層修正）。

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/discord/interactions.ts
git commit -m "refactor: add DiscordEnv type to interactions.ts, remove as any"
```

---

## Task 3: 抽取 DB null check 為 router middleware

**Files:**
- Modify: `apps/api/src/routes/entries.ts`
- Modify: `apps/api/src/routes/comments.ts`

**背景：** entries.ts 有 11 個 route handler，每個開頭都是：

```typescript
const db = c.env?.DB;
if (!db) return c.json({ error: 'Database not configured' }, 500);
```

在 router 加一個 middleware 即可，讓所有 handler 直接用 `c.env.DB`。

- [ ] **Step 1: 確認現有測試覆蓋 DB 未配置的情境**

```bash
npm test -- --reporter=verbose 2>&1 | grep "Database not configured"
```

預期：看到 `returns 500 when DB is not configured` 等測試，確認保護不會移除。

- [ ] **Step 2: 在 entries.ts 的 router 定義後插入 middleware**

找到 `const router = new Hono<{ Bindings: Env }>();`（第 28 行），在其後插入：

```typescript
// Ensure DB is available for all routes
router.use('*', async (c, next) => {
  if (!c.env?.DB) {
    return c.json({ error: 'Database not configured' }, 500);
  }
  return next();
});
```

- [ ] **Step 3: 移除 entries.ts 各 handler 中重複的 db null check**

對 entries.ts 中每個 handler，將：
```typescript
const db = c.env?.DB;
if (!db) {
  return c.json({ error: 'Database not configured' }, 500);
}
```
或
```typescript
const db = c.env?.DB;
if (!db) return c.json({ error: 'Database not configured' }, 500);
```

改為：
```typescript
const db = c.env.DB;
```

共需修改 entries.ts 中的 GET `/`、GET `/metrics`、GET `/search`、GET `/slug/:slug`、GET `/:id`、GET `/:id/assets`、GET `/:id/metrics`、PUT `/:id`、DELETE `/:id`、DELETE `/:id/hard`、POST `/:id/clap`、POST `/:id/view`。

- [ ] **Step 4: 在 comments.ts 同樣操作**

在 `const router = new Hono<{ Bindings: Env }>();` 後加入相同 middleware：

```typescript
router.use('*', async (c, next) => {
  if (!c.env?.DB) {
    return c.json({ error: 'Database not configured' }, 500);
  }
  return next();
});
```

移除 `GET /` 和 `POST /` 中的 `const db = c.env?.DB; if (!db) return ...`，改為 `const db = c.env.DB;`。

- [ ] **Step 5: 跑全部測試**

```bash
npm test
```

預期：全部 PASS，包含 `returns 500 when DB is not configured`。

- [ ] **Step 6: 型別檢查**

```bash
npm run typecheck
```

預期：0 errors。

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/entries.ts apps/api/src/routes/comments.ts
git commit -m "refactor: replace per-handler DB null checks with router middleware"
```

---

## Task 4: 為 /clap 端點加上 rate limiting

**Files:**
- Modify: `apps/api/src/routes/entries.ts`
- Test: `apps/api/src/__tests__/api.integration.test.ts`

**背景：** `POST /api/entries/:id/clap` 沒有任何節流，任何人可以無限請求刷量。使用現有的 `comment_rate_limits` 表和 `checkAndUpdateRateLimit` 函式，以 `${ip}:clap:${entryId}` 為 key，限制同 IP 對同篇文章 10 秒內只計一次 clap。

- [ ] **Step 1: 寫失敗測試**

在 `apps/api/src/__tests__/api.integration.test.ts` 找到或新增 clap 測試區塊：

```typescript
describe('POST /api/entries/:id/clap', () => {
  it('increments clap count', async () => {
    const db = createMockDb({ firstResult: { clap_count: 2 } });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries/entry_001/clap', env, {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.clap_count).toBe(2);
  });

  it('returns 429 when same IP claps the same entry within 10 seconds', async () => {
    // First call: rate limit query returns null (not found) → allowed
    // Second call: rate limit query returns recent timestamp → blocked
    const db = createMockDb({
      firstResults: [
        null,                          // first clap: rate limit check → not found → allowed
        { last_comment_at: new Date(Date.now() - 2000).toISOString() }, // second clap: 2s ago → blocked
      ],
    });
    const env = createMockEnv(db);

    // First clap should succeed
    const res1 = await makeRequest('/api/entries/entry_001/clap', env, {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '1.2.3.5' },
    });
    expect(res1.status).toBe(200);

    // Second clap from same IP within window should be 429
    const res2 = await makeRequest('/api/entries/entry_001/clap', env, {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '1.2.3.5' },
    });
    expect(res2.status).toBe(429);
  });
});
```

- [ ] **Step 2: 確認測試失敗**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A3 "clap"
```

預期：429 測試 FAIL（目前 clap 無節流，第二次也回 200）。

- [ ] **Step 3: 在 entries.ts 引入 checkAndUpdateRateLimit**

找到 entries.ts 第 1–14 行的 imports，在 `from '@personal-blog/shared/db'` 的 import 裡加入 `checkAndUpdateRateLimit`：

```typescript
import {
  getEntries,
  getEntryById,
  getEntryBySlug,
  updateEntry,
  archiveEntry,
  deleteEntry,
  getAssetsByEntryId,
  checkAndUpdateRateLimit,
} from '@personal-blog/shared/db';
```

- [ ] **Step 4: 在 clap handler 加上 rate limit 檢查**

找到 `// POST /api/entries/:id/clap` handler，在 `const id = c.req.param('id');` 之後、DB 操作之前插入：

```typescript
const ip =
  c.req.header('CF-Connecting-IP') ||
  c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
  'unknown';

const rateLimitKey = `${ip}:clap:${id}`;
const allowed = await checkAndUpdateRateLimit(db, rateLimitKey, 10);
if (!allowed) {
  return c.json({ error: 'Too many claps, please wait a moment' }, 429);
}
```

- [ ] **Step 5: 確認測試通過**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A3 "clap"
```

預期：所有 clap 測試 PASS。

- [ ] **Step 6: 跑全部測試**

```bash
npm test
```

預期：全部 PASS。

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/entries.ts apps/api/src/__tests__/api.integration.test.ts
git commit -m "feat: add rate limiting to /clap endpoint (10s per IP per entry)"
```

---

## Task 5: 修復 cover assets N+1 請求

**Files:**
- Modify: `apps/api/src/routes/entries.ts` — 新增 batch assets endpoint
- Modify: `apps/web/src/lib/data.ts` — 改用 batch endpoint

**背景：** `getResolvedCoverAssetsMap(entryIds)` 對每個 entryId 分別打 `/api/entries/:id/assets`，首頁載入 20 篇文章就是 20 次 HTTP 請求。先新增 batch endpoint `GET /api/entries/assets?ids=id1,id2`，再讓 `data.ts` 改用它。

### Part A: 新增 batch assets API endpoint

- [ ] **Step 1: 寫失敗測試**

在 `apps/api/src/__tests__/api.integration.test.ts` 加入：

```typescript
describe('GET /api/entries/assets', () => {
  it('returns assets map keyed by entry_id', async () => {
    const assetRows = [
      { id: 'asset_1', entry_id: 'entry_001', kind: 'cover', storage_key: 'img/a.jpg', mime_type: 'image/jpeg', sort_order: 0 },
      { id: 'asset_2', entry_id: 'entry_002', kind: 'image', storage_key: 'img/b.jpg', mime_type: 'image/jpeg', sort_order: 0 },
    ];
    const db = createMockDb({ allResults: assetRows });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries/assets?ids=entry_001,entry_002', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data['entry_001']).toBeDefined();
    expect(body.data['entry_001'][0].id).toBe('asset_1');
    expect(body.data['entry_002']).toBeDefined();
  });

  it('returns empty object when no ids provided', async () => {
    const db = createMockDb({ allResults: [] });
    const env = createMockEnv(db);
    const res = await makeRequest('/api/entries/assets', env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual({});
  });

  it('limits to 50 ids max', async () => {
    const db = createMockDb({ allResults: [] });
    const env = createMockEnv(db);
    const ids = Array.from({ length: 60 }, (_, i) => `entry_${i}`).join(',');
    const res = await makeRequest(`/api/entries/assets?ids=${ids}`, env);

    expect(res.status).toBe(200);
    // Confirm only 50 placeholders in SQL
    const sql = db._queries[0]?.sql || '';
    const placeholderCount = (sql.match(/\?/g) || []).length;
    expect(placeholderCount).toBeLessThanOrEqual(50);
  });
});
```

- [ ] **Step 2: 確認測試失敗**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A3 "batch assets\|GET /api/entries/assets"
```

預期：3 個測試 FAIL（route 不存在）。

- [ ] **Step 3: 在 entries.ts 新增 batch assets route**

在 `router.get('/metrics', ...)` handler **之後**、`router.get('/search', ...)` **之前**插入（確保在 `/:id` 之前）：

```typescript
// GET /api/entries/assets?ids=id1,id2,... - Batch fetch assets (fixes N+1)
router.get('/assets', async (c) => {
  const db = c.env.DB;

  const raw = c.req.query('ids') || '';
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 50);
  if (ids.length === 0) return c.json({ data: {} });

  try {
    const placeholders = ids.map(() => '?').join(',');
    const result = await db
      .prepare(`SELECT * FROM assets WHERE entry_id IN (${placeholders}) ORDER BY sort_order ASC`)
      .bind(...ids)
      .all();

    const map: Record<string, typeof result.results> = {};
    for (const row of (result.results || [])) {
      const r = row as { entry_id: string };
      if (!map[r.entry_id]) map[r.entry_id] = [];
      map[r.entry_id].push(row);
    }

    return c.json({ data: map });
  } catch (error) {
    console.error('Error fetching batch assets:', error);
    return c.json({ error: 'Failed to fetch assets' }, 500);
  }
});
```

- [ ] **Step 4: 確認 batch assets 測試通過**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A3 "GET /api/entries/assets"
```

預期：3 個測試 PASS。

### Part B: 更新前端 getResolvedCoverAssetsMap

- [ ] **Step 5: 更新 data.ts 中的 getResolvedCoverAssetsMap**

找到 `apps/web/src/lib/data.ts` 中的 `getResolvedCoverAssetsMap` 函式（第 266–294 行），替換整個函式：

```typescript
/**
 * Get resolved cover assets for multiple entries, keyed by entry ID.
 * Uses batch endpoint to avoid N+1 requests.
 */
export async function getResolvedCoverAssetsMap(
  entryIds: string[]
): Promise<Record<string, ResolvedCoverAsset>> {
  if (entryIds.length === 0) return {};

  try {
    const response = await apiFetch(`/api/entries/assets?ids=${entryIds.join(',')}`);
    if (!response.ok) return {};
    const { data } = await response.json();
    const assetsMap = data as Record<string, Asset[]>;

    const coverMap: Record<string, ResolvedCoverAsset> = {};
    for (const [entryId, assets] of Object.entries(assetsMap)) {
      const cover = assets.find((a) => a.kind === 'cover');
      if (cover) {
        coverMap[entryId] = { ...cover, resolved_for_entry_id: entryId } as ResolvedCoverAsset;
      }
    }
    return coverMap;
  } catch {
    return {};
  }
}
```

- [ ] **Step 6: 型別檢查**

```bash
npm run typecheck
```

預期：0 errors。

- [ ] **Step 7: 跑全部測試**

```bash
npm test
```

預期：全部 PASS。

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/routes/entries.ts apps/api/src/__tests__/api.integration.test.ts apps/web/src/lib/data.ts
git commit -m "perf: add batch assets endpoint, fix N+1 in getResolvedCoverAssetsMap"
```

---

## Task 6: 清理根目錄診斷文件

**Files:**
- Delete: `.eslintignore`, `DISCORD_DIAGNOSTICS.md`, `FINAL_DEPLOYMENT_REPORT.md`, `FIXES_APPLIED.md`, `FIX_DISCORD_VERIFICATION.md`, `FRONTEND_DIAGNOSIS.md`, `README_交付.md`, `SSR_DEBUG.md`（已在 git status 標記為 `D`）

**背景：** git status 顯示這些文件已被標記刪除（`D`）但尚未 commit。只需 stage 這些刪除並 commit。

- [ ] **Step 1: 確認哪些文件被標記刪除**

```bash
cd /Users/wen/Documents/dev/blog
git status --short | grep '^ D'
```

預期：列出 `.eslintignore`、`DISCORD_DIAGNOSTICS.md` 等文件。

- [ ] **Step 2: Stage 刪除並 commit**

```bash
git add -u
git status
```

確認 staging area 只包含已刪除文件的 stage（不要意外包含未完成的修改）。若有疑慮，用 `git restore --staged <file>` 退出不想提交的部分。

```bash
git commit -m "chore: remove diagnostic and delivery docs from root"
```

---

## 執行完成驗證

所有 task 完成後跑一次完整驗證：

```bash
cd /Users/wen/Documents/dev/blog
npm run typecheck && npm test && npm run lint
```

預期：
- `typecheck`: 0 errors
- `test`: 全部 PASS，包含新增的 search / clap / batch assets 測試
- `lint`: 0 warnings/errors
