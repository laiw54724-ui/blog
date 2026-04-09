# 部署指南

本文档详细说明如何将博客系统部署到生产环境。系统使用 Cloudflare 作为完整的云平台，包括 Workers、Pages、D1 和 R2。

## 目录

- [快速开始](#快速开始)
- [前提条件](#前提条件)
- [环境配置](#环境配置)
- [部署流程](#部署流程)
  - [API 部署](#api-部署)
  - [Web 部署](#web-部署)
  - [数据库迁移](#数据库迁移)
- [域名与 DNS](#域名与-dns)
- [环境变量](#环境变量)
- [监控与日志](#监控与日志)
- [回滚方案](#回滚方案)
- [故障排查](#故障排查)
- [性能优化](#性能优化)

---

## 快速开始

### 首次部署流程（5 分钟概览）

```bash
# 1. 准备环境
npm install
npm run typecheck
npm test

# 2. 部署 API（Cloudflare Workers）
cd apps/api
wrangler deploy --env production

# 3. 部署 Web（Cloudflare Pages）
cd ../web
wrangler deploy --env production

# 4. 验证部署
curl https://api.example.com/health
curl https://example.com
```

### 一行命令部署

```bash
# 后续部署（从项目根目录）
npm run build && npm run deploy
```

---

## 前提条件

### 1. Cloudflare 账户设置

**账户要求**:
- ✅ Cloudflare 免费或付费账户
- ✅ 已验证的域名
- ✅ 启用 Workers、Pages、D1、R2 等服务

**账户确认**:
```bash
# 检查账户信息
wrangler whoami

# 应输出你的 Cloudflare 邮箱和账户信息
```

### 2. 本地工具要求

```bash
# Node.js >= 18.0.0
node --version

# npm >= 9.0.0
npm --version

# Wrangler CLI（Cloudflare）
npm install -g wrangler
wrangler --version

# Git
git --version
```

### 3. 获取 API Token

```bash
# 登录 Cloudflare
wrangler login

# 或使用 API Token
# 1. 访问 https://dash.cloudflare.com/profile/api-tokens
# 2. 创建"编辑 workers"权限的 Token
# 3. 设置环境变量
export CLOUDFLARE_API_TOKEN="your-token-here"
```

### 4. 验证权限

```bash
# 检查是否有权限
wrangler whoami

# 检查账户 ID
wrangler secret list

# 列出现有的 Workers
wrangler list
```

---

## 环境配置

### 1. Cloudflare 资源初始化

#### 创建 D1 数据库

```bash
# 列出现有 D1 数据库
wrangler d1 list

# 创建新数据库（如果不存在）
wrangler d1 create personal-blog

# 输出会显示 database_id，复制到 wrangler.toml
```

#### 创建 R2 Bucket

```bash
# 列出现有 bucket
wrangler r2 bucket list

# 创建新 bucket（如果不存在）
wrangler r2 bucket create personal-blog-assets

# 配置公开访问（可选）
# 在 Cloudflare Dashboard → R2 → 存储桶设置
```

### 2. 更新 wrangler.toml

**API (`apps/api/wrangler.toml`)**:

```toml
name = "personal-blog-api"
type = "service"
main = "src/index.ts"
compatibility_date = "2024-04-05"

# 生产环境配置
[env.production]
name = "personal-blog-api"
routes = [
  { pattern = "api.example.com/*", zone_id = "YOUR_ZONE_ID" }
]

# D1 数据库
[[env.production.d1_databases]]
binding = "DB"
database_name = "personal-blog"
database_id = "YOUR_DATABASE_ID"  # 从 wrangler d1 create 获取

# R2 存储桶
[[env.production.r2_buckets]]
binding = "ASSETS_BUCKET"
bucket_name = "personal-blog-assets"
```

**Web (`apps/web/wrangler.toml`)**:

```toml
name = "personal-blog-web"
compatibility_date = "2026-03-29"

[env.production]
[env.production.vars]
PUBLIC_API_URL = "https://api.example.com"

# 生产 Pages 配置
[env.production.build]
command = "npm run build"
output_directory = "dist"
root_dir = "."

# 绑定到 API Worker（避免跨 Worker 请求问题）
[[services]]
binding = "API_SERVICE"
service = "personal-blog-api"
environment = "production"
```

### 3. 获取必要的 IDs

```bash
# 获取账户 ID
wrangler whoami

# 获取 Zone ID（域名）
wrangler domain list

# 获取 Database ID（已创建的数据库）
wrangler d1 list

# 记录这些信息，添加到 wrangler.toml
```

---

## 部署流程

### API 部署（Cloudflare Workers）

#### 1. 本地验证

```bash
cd apps/api

# 类型检查
npm run typecheck

# 本地测试
npm run build

# 运行本地开发服务
npm run dev
# 访问 http://localhost:8787
```

#### 2. 环境变量配置

```bash
# 创建 .env.local（不提交到 git）
cat > .env.local << EOF
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_PUBLIC_KEY=your_public_key_here
DISCORD_APPLICATION_ID=your_app_id_here
EOF

# 验证 .env.local 在 .gitignore
grep ".env.local" ../.gitignore
```

#### 3. 设置 Cloudflare Secrets

```bash
# 设置 Discord Bot Token
wrangler secret put DISCORD_BOT_TOKEN --env production

# 设置 Discord Public Key
wrangler secret put DISCORD_PUBLIC_KEY --env production

# 设置 Discord Application ID
wrangler secret put DISCORD_APPLICATION_ID --env production

# 验证已设置的 secret
wrangler secret list --env production
```

#### 4. 部署 API

```bash
# 部署到生产环境
wrangler deploy --env production

# 输出样本：
# ✓ Uploaded 47 files to Cloudflare Workers
# ✓ Deployment ID: abc123def456
# Route: https://personal-blog-api.personal-blog.workers.dev/*

# 记录部署 URL
API_URL="https://personal-blog-api.personal-blog.workers.dev"
```

#### 5. 验证 API 部署

```bash
# 测试 API 健康检查
curl https://personal-blog-api.personal-blog.workers.dev/health

# 应返回 200 OK
# 测试获取条目列表
curl https://personal-blog-api.personal-blog.workers.dev/api/entries?limit=1

# 应返回 JSON 数据
```

### Web 部署（Cloudflare Pages）

#### 1. 本地构建验证

```bash
cd apps/web

# 类型检查
npm run typecheck

# 构建
npm run build

# 预览构建结果
npm run preview
```

#### 2. 配置环境变量

```bash
# 创建 .env.production.local
cat > .env.production.local << EOF
PUBLIC_API_URL=https://api.example.com
VITE_API_BASE=https://api.example.com
EOF
```

#### 3. 连接 GitHub（Pages 自动部署）

**通过 Cloudflare Dashboard**:

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择账户 → Pages
3. 点击"连接到 Git"
4. 选择 GitHub 仓库 `laiw54724-ui/blog`
5. 配置构建设置：
   - **Framework**: Astro
   - **Build command**: `npm run build --workspace=apps/web`
   - **Build output directory**: `apps/web/dist`
   - **Root directory**: `.`

#### 4. 手动部署（可选）

```bash
# 使用 Wrangler 直接部署
wrangler pages publish dist --project-name=personal-blog-web

# 输出样本：
# ✓ Uploaded 234 files to Cloudflare Pages
# ✓ Deployment ID: xyz789
# ✓ URL: https://personal-blog-web.pages.dev
```

#### 5. 验证 Web 部署

```bash
# 访问网站
https://example.com

# 检查控制台
# 1. 打开浏览器开发者工具 (F12)
# 2. 检查 Network 标签
# 3. 验证 API 请求成功
# 4. 检查 Console 无错误
```

### 数据库迁移

#### 1. 初始化数据库

```bash
# 编辑 db/schema.sql 定义表结构

# 应用 schema
wrangler d1 execute personal-blog --file=db/schema.sql --env production

# 验证表已创建
wrangler d1 execute personal-blog --command="SELECT name FROM sqlite_master WHERE type='table';" --env production
```

#### 2. 创建索引

```bash
# 应用索引（可选但推荐）
wrangler d1 execute personal-blog --file=db/indices.sql --env production
```

#### 3. 导入初始数据

```bash
# 可选：导入初始数据（如种子数据）
wrangler d1 execute personal-blog --file=db/seeds.sql --env production

# 验证数据已导入
wrangler d1 execute personal-blog --command="SELECT COUNT(*) as entries_count FROM entries;" --env production
```

#### 4. 验证数据库连接

```bash
# 测试 API 能否访问数据库
curl https://api.example.com/api/entries

# 应返回条目列表（即使为空也应返回 200 OK）
```

---

## 域名与 DNS

### 1. 添加域名到 Cloudflare

```bash
# 将 DNS 服务器变更指向 Cloudflare（在域名注册商）
# Cloudflare 提供的 NS 记录：
# ns1.cloudflare.com
# ns2.cloudflare.com
```

### 2. 配置 DNS 记录

**主 DNS 记录**:

| 记录类型 | 名称 | 内容 | TTL |
|---------|------|------|-----|
| A | example.com | Cloudflare Pages IP | Auto |
| CNAME | www | example.com | Auto |
| CNAME | api | personal-blog-api.personal-blog.workers.dev | Auto |

**具体命令**:

```bash
# 配置示例（通过 Cloudflare Dashboard 或 API）

# 1. 将 example.com 指向 Pages
# Dashboard → DNS 添加
# Type: CNAME
# Name: example.com
# Target: personal-blog-web.pages.dev

# 2. 将 api.example.com 指向 Workers
# Type: CNAME
# Name: api
# Target: personal-blog-api.personal-blog.workers.dev

# 3. 验证 DNS
nslookup example.com
nslookup api.example.com
```

### 3. SSL/TLS 配置（自动）

Cloudflare 会自动为所有域名（包括子域）配置 SSL 证书。

```bash
# 验证 HTTPS 工作
curl -I https://example.com
curl -I https://api.example.com

# 应返回 HTTP/2 200 和有效的 SSL 证书
```

### 4. 页面规则（可选）

```bash
# 在 Cloudflare Dashboard 配置：

# 规则 1: 缓存首页
# URL: example.com
# Cache Level: Cache Everything
# Browser Cache TTL: 30 minutes

# 规则 2: API 不缓存
# URL: api.example.com/api/*
# Cache Level: Bypass
```

---

## 环境变量

### 1. 生产环境变量清单

**API 所需变量**:

```bash
# Cloudflare 自动提供
DB                  # D1 数据库绑定
ASSETS_BUCKET       # R2 存储桶绑定

# 必须手动设置
DISCORD_BOT_TOKEN           # Discord Bot Token
DISCORD_PUBLIC_KEY          # Discord Public Key
DISCORD_APPLICATION_ID      # Discord Application ID

# 可选
LOG_LEVEL="info"            # 日志级别
API_RATE_LIMIT="100"        # 速率限制（requests/minute）
```

**Web 所需变量**:

```bash
# Cloudflare 自动提供
PUBLIC_API_URL="https://api.example.com"

# 可选
PUBLIC_ANALYTICS_ID=""      # Analytics script ID
PUBLIC_SITE_TITLE="My Blog" # 网站标题
PUBLIC_SITE_DESCRIPTION="" # 网站描述
```

### 2. 设置环境变量

```bash
# 设置 API secret（不会在日志中显示）
wrangler secret put DISCORD_BOT_TOKEN --env production

# 设置 API 变量（可见）
wrangler secret put DISCORD_APPLICATION_ID --env production

# 列出所有变量
wrangler secret list --env production
```

### 3. 更新环境变量

```bash
# 删除旧变量
wrangler secret delete OLD_SECRET --env production

# 设置新变量
wrangler secret put NEW_SECRET --env production

# 更新后需要重新部署
wrangler deploy --env production
```

---

## 监控与日志

### 1. 实时日志检查

```bash
# 查看 API Worker 日志
wrangler tail --env production --format json

# 查看最后 100 条日志
wrangler tail --env production | head -100

# 监听特定错误
wrangler tail --env production | grep ERROR
```

### 2. 在 Cloudflare Dashboard 中监控

**Workers**:
1. 访问 Cloudflare Dashboard
2. Workers 和 Pages → 你的 worker
3. 监控 → 查看请求数、延迟、错误率

**Pages**:
1. Cloudflare Dashboard → Pages
2. 你的项目 → 分析
3. 查看访问量、缓存命中率

**D1 数据库**:
1. Databases → D1
2. 查看查询性能、存储使用

### 3. 外部监控

```bash
# 设置定期健康检查
curl -X GET https://api.example.com/health \
  --header "User-Agent: Healthcheck" \
  --write-out "HTTP Status: %{http_code}\n"

# 设置告警（可选）
# 推荐使用 Uptime Kuma、StatusPage 等服务
```

### 4. 性能指标

```bash
# 检查 API 响应时间
time curl https://api.example.com/api/entries?limit=1

# Web 性能检查
curl -I https://example.com

# 应返回：
# HTTP/2 200
# Cache-Control: max-age=3600
# CF-Cache-Status: HIT
```

---

## 回滚方案

### 1. API 回滚

```bash
# 查看部署历史
wrangler deployments list

# 获取前一版本的 ID
PREVIOUS_BUILD_ID="abc123"

# 回滚到前一版本
wrangler rollback --message "Rollback due to bug" --env production

# 或手动部署之前的代码
git checkout HEAD~1  # 返回上一个提交
wrangler deploy --env production
```

### 2. Web 回滚

**Pages 自动回滚**:
- 在 Deployment 历史中找到稳定版本
- 点击"Rollback"按钮

```bash
# 或手动部署
git checkout HEAD~1
npm run build --workspace=apps/web
wrangler pages publish apps/web/dist --project-name=personal-blog-web
```

### 3. 数据库回滚

```bash
# D1 不直接支持回滚，需要手动恢复

# 1. 导出当前数据（备份）
wrangler d1 export personal-blog --output=backup-$(date +%Y%m%d_%H%M%S).sql --env production

# 2. 如果有错误，恢复备份
wrangler d1 execute personal-blog --file=backup-20260409_120000.sql --env production
```

### 4. 快速恢复检查表

- ✅ 验证回滚后 API 可访问
- ✅ 验证 Web 页面加载
- ✅ 检查数据库连接正常
- ✅ 测试关键功能（评论、创建条目等）
- ✅ 监控错误率恢复

---

## 故障排查

### API 部署问题

#### 问题 1: "Error: Missing required fields in wrangler.toml"

**原因**: wrangler.toml 配置不完整

**解决**:
```bash
# 检查必需字段
grep "database_id\|bucket_name" apps/api/wrangler.toml

# 添加缺失的 ID
# 重新获取 ID：
wrangler d1 list
wrangler r2 bucket list
```

#### 问题 2: "Error: Unauthorized"

**原因**: 权限不足或 Token 过期

**解决**:
```bash
# 重新登录
wrangler logout
wrangler login

# 或使用 API Token
export CLOUDFLARE_API_TOKEN="new-token"
```

#### 问题 3: "Database connection failed"

**原因**: D1 绑定配置错误或数据库不存在

**解决**:
```bash
# 验证数据库存在
wrangler d1 list

# 如果不存在，创建数据库
wrangler d1 create personal-blog

# 更新 wrangler.toml 中的 database_id
# 重新部署
wrangler deploy --env production
```

### Web 部署问题

#### 问题 1: "Build failed: Command exited with code 1"

**原因**: 构建过程中 TypeScript 或 Astro 编译失败

**解决**:
```bash
# 本地调试构建
cd apps/web
npm run build

# 查看详细错误信息
npm run typecheck

# 修复错误并重新部署
```

#### 问题 2: "API requests returning 404"

**原因**: API 端点 URL 配置错误

**解决**:
```bash
# 检查 .env 中的 API URL
cat apps/web/.env.production

# 验证 API 实际部署地址
curl https://api.example.com/api/entries

# 更新环境变量
wrangler pages publish apps/web/dist --env production
```

#### 问题 3: "Pages 无法连接到 GitHub"

**原因**: Git 权限或连接问题

**解决**:

1. 重新连接 GitHub
2. 在 Cloudflare Dashboard 重新授权
3. 手动部署（绕过 Git）

```bash
npm run build --workspace=apps/web
wrangler pages publish apps/web/dist
```

### 数据库问题

#### 问题 1: "Query timed out"

**原因**: 查询性能差或数据量大

**解决**:
```bash
# 添加索引
wrangler d1 execute personal-blog --file=db/indices.sql --env production

# 优化查询（limit 和 offset）
# 添加分页
```

#### 问题 2: "Disk quota exceeded"

**原因**: D1 数据库已满

**解决**:

1. 升级 Cloudflare 计划
2. 清理旧数据
3. 参考 Cloudflare 定价

```bash
# 检查数据库大小
wrangler d1 execute personal-blog --command="SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();" --env production
```

### 通用调试步骤

```bash
# 1. 检查部署状态
wrangler deployments list --env production

# 2. 查看实时日志
wrangler tail --env production --format pretty

# 3. 验证环境变量
wrangler secret list --env production

# 4. 测试基础连接
curl -v https://api.example.com/health
curl -v https://example.com

# 5. 检查 DNS
nslookup api.example.com
nslookup example.com

# 6. 验证数据库
wrangler d1 execute personal-blog --command="SELECT COUNT(*) FROM entries;" --env production
```

---

## 性能优化

### 1. API 优化

#### 缓存策略

```typescript
// 在 API 路由中设置缓存头
response.headers.set('Cache-Control', 'public, max-age=3600')

// 对于公开列表（不缓存动态内容）
if (isPublic) {
  response.headers.set('Cache-Control', 'public, max-age=300')
}

// 对于用户特定内容
if (requiresAuth) {
  response.headers.set('Cache-Control', 'private, no-cache')
}
```

#### 数据库查询优化

```typescript
// 使用索引
const result = await db.query(
  `SELECT * FROM entries WHERE status = ? AND visibility = ?`,
  ['published', 'public']
)

// 分页替代全表扫描
const page = new URL(request.url).searchParams.get('page') || 1
const limit = 20
const offset = (page - 1) * limit
```

#### 响应压缩

Cloudflare 自动为所有响应启用 gzip/brotli 压缩。

### 2. Web 优化

#### 图片优化

```astro
---
// 使用 Astro 的 Image 组件
import { Image } from 'astro:assets'
---

<Image
  src={cover}
  alt={title}
  width={800}
  height={600}
  format="webp"
/>
```

#### CSS 和 JS minification

Astro 自动 minify。在 `astro.config.mjs` 中验证：

```javascript
export default defineConfig({
  vite: {
    build: {
      minify: 'terser',
    },
  },
})
```

#### 页面静态生成

```bash
# Astro 自动在构建时生成静态页面

# Pre-render 动态路由
export const prerender = true  // 在 page.astro 中
```

### 3. CDN 优化（Cloudflare）

#### 启用 Brotli 压缩

1. Cloudflare Dashboard → Speed
2. 启用 Brotli

#### 启用 HTTP/2 Push

1. Cloudflare Dashboard → Network
2. HTTP/2 Prioritization: 启用

#### 启用 Early Hints

1. Cloudflare Dashboard → Speed
2. Early Hints: 启用（可选）

### 4. 监控优化效果

```bash
# 使用 Lighthouse 测试
npm install -g lighthouse
lighthouse https://example.com

# 或在浏览器中
# Chrome DevTools → Lighthouse

# 检查 Web Vitals
curl "https://example.com" -I | grep cf-

# Core Web Vitals 检查（Google PageSpeed Insights）
https://pagespeed.web.dev/?url=https://example.com
```

### 5. 性能预算

| 指标 | 目标 | 当前 |
|------|------|------|
| Lighthouse Score | > 90 | - |
| First Contentful Paint | < 1.5s | - |
| Largest Contentful Paint | < 2.5s | - |
| Cumulative Layout Shift | < 0.1 | - |
| Time to Interactive | < 3.5s | - |
| API Response Time | < 200ms | - |
| Database Query Time | < 100ms | - |

---

## 部署清单

### 首次部署

- [ ] 验证 Cloudflare 账户和权限
- [ ] 创建 D1 数据库
- [ ] 创建 R2 Bucket
- [ ] 更新 wrangler.toml（database_id, bucket_name）
- [ ] 设置 Discord secrets
- [ ] 本地构建测试 (`npm run build`)
- [ ] 本地类型检查 (`npm run typecheck`)
- [ ] 本地测试 (`npm test`)
- [ ] 部署 API (`wrangler deploy --env production`)
- [ ] 验证 API 部署
- [ ] 部署 Web (`wrangler pages publish`)
- [ ] 验证 Web 部署
- [ ] 配置 DNS 记录
- [ ] 验证 HTTPS/SSL
- [ ] 运行烟雾测试

### 常规部署

- [ ] 拉取最新代码 (`git pull`)
- [ ] 运行测试 (`npm test`)
- [ ] 本地构建 (`npm run build`)
- [ ] 部署 API 或 Web
- [ ] 验证部署成功
- [ ] 检查日志无错误
- [ ] 测试关键功能
- [ ] 监控一小时

### 回滚准备

- [ ] 记录当前部署 ID
- [ ] 备份数据库
- [ ] 准备回滚命令
- [ ] 测试回滚流程

---

## 相关资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Astro 部署指南](https://docs.astro.build/zh/guides/deploy/)
- [项目架构文档](./architecture.md)

---

## 获取帮助

遇到问题？

1. 📖 **检查文档** - 查看上方的故障排查部分
2. 🔍 **检查日志** - `wrangler tail --env production`
3. 📧 **联系支持** - 参考 README.md
4. 💬 **社区讨论** - Cloudflare 社区论坛
