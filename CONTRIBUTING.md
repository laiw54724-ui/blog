# 贡献指南

感谢你对本项目的关注！本指南将帮助你快速上手并理解项目的开发规范。

## 目录

- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [开发工作流](#开发工作流)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [测试要求](#测试要求)
- [Pull Request 流程](#pull-request-流程)
- [常见问题](#常见问题)

---

## 快速开始

### 环境要求

- **Node.js**: >= 18.0.0（推荐 20.x LTS）
- **npm**: >= 9.0.0
- **Git**: 最新版本

### 第一次设置

1. **克隆仓库**:
```bash
git clone https://github.com/laiw54724-ui/blog.git
cd blog
```

2. **安装依赖**:
```bash
npm install
```

3. **配置环境变量**:
```bash
# 复制示例环境文件
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 编辑各文件配置你的本地环境
```

4. **启动开发服务器**:
```bash
# 同时启动 API 和 Web
npm run dev

# 或分别启动
npm run dev:api  # http://localhost:8787
npm run dev:web  # http://localhost:3000
```

5. **验证设置**:
```bash
# 运行所有测试
npm test

# 检查代码质量
npm run lint
```

---

## 项目结构

```
blog/
├── apps/
│   ├── api/                  # Cloudflare Workers 后端
│   │   ├── src/
│   │   │   ├── index.ts      # Worker 入口
│   │   │   ├── routes/       # 路由处理
│   │   │   ├── discord/      # Discord 集成
│   │   │   └── __tests__/    # 集成测试
│   │   ├── wrangler.toml     # Cloudflare 配置
│   │   └── package.json
│   │
│   └── web/                  # Astro 前端
│       ├── src/
│       │   ├── pages/        # 路由页面
│       │   ├── components/   # Astro 组件
│       │   ├── layouts/      # 布局组件
│       │   ├── lib/          # 工具函数
│       │   └── scripts/      # 客户端脚本
│       ├── astro.config.mjs  # Astro 配置
│       └── package.json
│
├── packages/
│   └── shared/               # 共享包（类型、数据库）
│       ├── src/
│       │   ├── types.ts      # 数据模型
│       │   ├── db.ts         # 数据库访问层
│       │   └── __tests__/    # 单元测试
│       └── package.json
│
├── docs/                     # 文档
│   ├── architecture.md       # 架构设计
│   ├── api.md               # API 参考
│   ├── components.md        # 组件文档
│   ├── discord-spec.md      # Discord 集成规范
│   └── routes.md            # 路由列表
│
├── db/                      # 数据库
│   ├── schema.sql          # 表结构
│   ├── indices.sql         # 索引定义
│   └── seeds.sql           # 初始数据
│
└── package.json             # 根 package.json
```

### 工作区说明

项目使用 npm workspaces 管理多个包：

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

这意味着：
- `packages/shared` 中的依赖变化自动应用到 `apps/api` 和 `apps/web`
- 各工作区可以独立运行脚本
- 根目录可以运行跨所有工作区的脚本

---

## 开发工作流

### 1. 创建新分支

```bash
# 从最新的 main 分支创建
git checkout main
git pull origin main

# 使用描述性名称创建分支
git checkout -b feat/user-authentication
git checkout -b fix/comment-validation
git checkout -b docs/update-api
```

**分支命名规范**:
- `feat/` - 新功能
- `fix/` - 错误修复
- `docs/` - 文档更新
- `refactor/` - 代码重构
- `test/` - 测试相关
- `chore/` - 构建、依赖等维护任务

### 2. 开发和测试

```bash
# 启动开发服务器
npm run dev

# 在另一个终端窗口运行测试
npm run test:watch

# 检查代码质量
npm run lint
npm run format:check
```

### 3. 本地测试

```bash
# 运行所有测试
npm test

# 运行特定工作区测试
npm test --workspace=apps/api

# 运行特定文件测试
npm test -- apps/api/src/__tests__/api.integration.test.ts
```

### 4. 代码格式化和 Linting

```bash
# 自动修复格式和大部分 lint 错误
npm run lint:fix
npm run format

# 仅检查不修改
npm run lint
npm run format:check
```

### 5. 提交更改

```bash
# 查看所有更改
git status

# 添加要提交的文件
git add path/to/file

# 或添加所有更改
git add .

# 提交（遵循提交规范）
git commit -m "feat: add user authentication"
```

### 6. 推送到远程

```bash
# 推送到你的分支
git push origin feat/user-authentication
```

---

## 代码规范

### TypeScript

**类型安全第一**:

```typescript
// ✅ 好的做法 - 明确的类型
interface Entry {
  id: string
  title: string
  status: 'draft' | 'published' | 'archived'
  created_at: Date
}

function getEntry(id: string): Promise<Entry> {
  // ...
}

// ❌ 避免 - 隐含的 any 类型
function getEntry(id) {
  // ...
}
```

**使用共享类型**:

```typescript
// ✅ 导入共享类型
import type { Entry, Comment, EntryMetrics } from '@personal-blog/shared'

// ❌ 避免 - 重复定义类型
interface Entry {
  id: string
  title: string
}
```

**严格模式**:

所有工作区的 `tsconfig.json` 都启用了严格类型检查：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### 代码风格

**Prettier 自动格式化**:

配置文件: `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 80,
  "tabWidth": 2
}
```

**ESLint 代码质量**:

配置文件: `.eslintrc.config.mts`

包含规则：
- TypeScript 类型规则
- Astro 特定规则
- 最佳实践检查

**自动修复**:

```bash
# 自动修复格式和 lint 错误
npm run lint:fix
npm run format

# 在提交前运行（推荐）
npm run lint && npm run format
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件 | camelCase 或 PascalCase | `entryCard.ts`, `EntryCard.astro` |
| 目录 | kebab-case | `components/`, `__tests__/` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| 变量/函数 | camelCase | `getEntry()`, `entryId` |
| 类/接口 | PascalCase | `Entry`, `EntryCardProps` |
| 布尔值 | is/has/should 前缀 | `isPublished`, `hasComments` |

### Astro 组件

```astro
---
// 1. Props 接口定义
interface Props {
  title: string
  entries?: Entry[]
}

// 2. Props 提取
const { title, entries = [] } = Astro.props as Props

// 3. 组件逻辑
const count = entries.length
---

<!-- 4. 标记 -->
<div class="component">
  <h1>{title}</h1>
  {count > 0 && (
    <ul>
      {entries.map(entry => (
        <li key={entry.id}>{entry.title}</li>
      ))}
    </ul>
  )}
</div>

<!-- 5. 样式（作用域）-->
<style>
  .component {
    padding: 1rem;
  }
</style>
```

### 数据库函数

```typescript
// ✅ 参数化查询防止 SQL 注入
async function getEntry(db: D1Database, id: string) {
  const query = `
    SELECT * FROM entries 
    WHERE id = ? AND visibility = 'public'
  `
  const result = await db.prepare(query).bind(id).first()
  return result as Entry | null
}

// ❌ 避免 - 字符串拼接
async function getEntry(db: D1Database, id: string) {
  const result = await db
    .prepare(`SELECT * FROM entries WHERE id = '${id}'`)
    .first()
}
```

---

## 提交规范

### Commit 消息格式

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型（Type）

| 类型 | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | `feat(api): add user authentication` |
| fix | 错误修复 | `fix(web): fix comment form validation` |
| docs | 文档更新 | `docs: update API documentation` |
| style | 代码风格 | `style: add prettier formatting` |
| refactor | 代码重构 | `refactor(api): extract database logic` |
| test | 测试 | `test(api): add entry endpoint tests` |
| chore | 维护 | `chore: update dependencies` |
| perf | 性能优化 | `perf(web): optimize image loading` |

### 范围（Scope）

指出影响的模块：

```
feat(api): ...          # API 服务
feat(web): ...          # 前端应用
feat(shared): ...       # 共享包
feat(db): ...           # 数据库相关
```

### 主题（Subject）

- 使用命令式语气："add" 而不是 "adds"
- 不要首字母大写
- 不要以句号结尾
- 限制在 50 个字符以内

### 提交示例

```bash
# 简单提交
git commit -m "feat(api): add soft delete endpoint for entries"

# 详细提交
git commit -m "feat(web): implement reader controls component

- Add font size adjustment buttons
- Store user preferences in localStorage
- Support increase/decrease/reset operations

Closes #123"
```

---

## 测试要求

### 测试覆盖范围

- **单元测试** - 数据库函数、工具函数
- **集成测试** - API 端点、路由
- **类型检查** - TypeScript 严格模式

### 测试框架

使用 Vitest（Vite 原生测试框架）：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Entry API', () => {
  let db: D1Database

  beforeEach(() => {
    db = createMockDatabase()
  })

  it('should fetch entry by ID', async () => {
    const entry = await getEntryById(db, 'test-id')
    expect(entry).toBeDefined()
    expect(entry?.title).toBe('Test Entry')
  })

  it('should handle not found error', async () => {
    const entry = await getEntryById(db, 'non-existent')
    expect(entry).toBeNull()
  })
})
```

### 运行测试

```bash
# 运行所有测试（一次）
npm test

# 监视模式（开发时）
npm run test:watch

# 运行特定测试文件
npm test -- db.test.ts

# 运行特定测试套件
npm test -- --grep "Entry API"

# 生成覆盖率报告
npm test -- --coverage
```

### 添加新测试

新功能必须包含测试：

```typescript
// apps/api/src/__tests__/newFeature.test.ts
import { describe, it, expect } from 'vitest'
import { newFeature } from '../newFeature'

describe('New Feature', () => {
  it('should do something', () => {
    const result = newFeature()
    expect(result).toBe(expected)
  })

  it('should handle error case', () => {
    expect(() => newFeature(invalid)).toThrow()
  })
})
```

### 测试最佳实践

- ✅ **描述清晰** - 使用明确的测试名称
- ✅ **一个断言** - 每个测试验证一个行为
- ✅ **隔离测试** - 不依赖其他测试
- ✅ **Mock 外部依赖** - 隔离要测试的代码
- ✅ **测试边界情况** - null、空值、错误情况
- ✅ **避免测试实现** - 测试行为而不是细节

---

## Pull Request 流程

### 创建 PR

1. **确保代码质量**:
```bash
npm run lint -- --fix
npm run format
npm test
```

2. **推送分支**:
```bash
git push origin feat/your-feature
```

3. **创建 Pull Request**:
- 在 GitHub 上创建 PR
- 使用模板（如果可用）
- 填写清晰的描述

### PR 描述模板

```markdown
## 变更描述
简述本 PR 的用途和改动。

## 相关 Issue
关闭 #123

## 类型
- [ ] 新功能
- [ ] 错误修复
- [ ] 文档更新
- [ ] 代码重构

## 变更清单
- [ ] 代码遵循项目风格
- [ ] 添加了相关测试
- [ ] 测试全部通过
- [ ] 文档已更新
- [ ] 没有新增错误警告

## 截图/演示（如适用）
添加截图或演示链接。
```

### PR 检查清单

提交 PR 前确保：

- ✅ 分支从最新的 `main` pull
- ✅ 所有测试通过 (`npm test`)
- ✅ 代码通过 linting (`npm run lint`)
- ✅ 代码已格式化 (`npm run format`)
- ✅ 无 TypeScript 错误 (`npm run typecheck`)
- ✅ 提交消息遵循规范
- ✅ 相关文档已更新
- ✅ 没有打印语句或 console.log
- ✅ 没有硬编码的秘密或令牌

### 代码审查

- 至少一个维护者审查后可合并
- 审查者可能要求更改
- 保持对话礼貌和建设性
- 及时响应反馈

### 合并

- 使用"Squash and merge"合并（保持历史清洁）
- 确保 CI 通过
- 删除功能分支

---

## 常见问题

### Q: 我该如何获取 Discord Bot Token？

A: 
1. 在 Discord Developer Portal 创建应用
2. 在 Bot 部分创建 bot
3. 复制 Token
4. 添加到环境变量 `DISCORD_BOT_TOKEN`

### Q: 如何本地测试 Discord 命令？

A: 
参考 `test-discord-local.mjs`：
```bash
node test-discord-local.mjs
```

### Q: 数据库在哪里？如何连接？

A:
- **开发**: 使用 Wrangler 管理的本地 D1 数据库
- **生产**: Cloudflare D1（绑定在 wrangler.toml）
- 运行迁移：参考 `db/schema.sql`

### Q: 如何添加新的数据库表？

A:
1. 编辑 `db/schema.sql` 添加表定义
2. 编辑 `packages/shared/src/schema.ts` 添加类型
3. 运行迁移或重新初始化数据库
4. 更新 `packages/shared/src/db.ts` 添加查询函数

### Q: 项目支持哪些数据库？

A:
仅支持 SQLite（通过 Cloudflare D1）。所有 SQL 必须与 SQLite 兼容。

### Q: 我可以在生产环境中测试我的更改吗？

A:
不建议。使用：
- 本地开发环境（`npm run dev`）
- 测试环境部署
- 小范围金丝雀发布

### Q: 如何报告安全问题？

A:
通过电子邮件私下向维护者报告，而不是在公开 Issue 中。

### Q: 有 API 文档吗？

A:
是的！参考 `docs/api.md` 获取完整的 API 参考和使用示例。

---

## 获取帮助

- 📖 **文档** - 查看 `docs/` 目录
- 🐛 **报告错误** - 在 GitHub Issues 中创建
- 💬 **讨论** - 在 GitHub Discussions 中提问
- 📧 **联系** - 参考 README.md 中的联系方式

---

## 代码行为守则

- 尊重所有贡献者
- 欢迎新手
- 接受建设性的批评
- 专注于最有利于社区的讨论
- 对不同意见保持开放态度

感谢你的贡献！🙏
